# Quantum Poller Orchestrator Spec

## Goal

Build a small worker that reads `quantum_event_outbox`, rebuilds normalized snapshots from Quantum source tables, and calls Plasma's private automation endpoints idempotently.

This worker should not forward raw outbox payloads as-is except for stock moves. Quantum outbox rows are triggers; the worker's job is to reconstruct current entity state and send a stable snapshot to Plasma.

## Confirmed Inputs

### Quantum outbox

- Table: `quantum_event_outbox`
- Ordering key: `id`
- Current v1 event scope:
  - `goods_in.device_booked`
  - `sales_order.device_reserved`
  - `sales_order.updated`
  - `stock.device_moved`
  - `qc.updated`
  - `qc.device_passed`
  - `qc.device_failed`

### Plasma automation endpoints

- `POST /api/automation/purchases/:legacyPurchaseId/sync`
- `POST /api/automation/sales-orders/:legacyOrderId/sync`
- `POST /api/automation/qc/purchases/:legacyPurchaseId/sync`
- `POST /api/automation/devices/:imei/move`

All requests must include:

- `x-plasma-robot-key: <PLASMA_AUTOMATION_KEY>`
- envelope fields:
  - `quantum_event_id`
  - `idempotency_key`
  - `source_event_type`
  - `source_created_at`
  - `source_user`
  - `snapshot_generated_at`

## Confirmed Mapping Rules

- Quantum locations and Plasma `locations.code` are expected to match directly.
- `legacy_brand_map` now contains the imported `tbl_categories` data and can resolve `CATxx -> manufacturer_name`.
- Plasma model resolution supports:
  - exact `legacy_sales_model_map` lookup on `(item_brand, item_details)`
  - fallback via `legacy_brand_map` to manufacturer
  - then direct matching against Plasma `models.model_number` and `models.model_name`
- QC mapping is confirmed:
  - `item_functional_passed: 1 -> PASS, 0 -> FAIL`
  - `item_cosmetic_passed: 1 -> PASS, 0 -> FAIL`
  - `item_eu: EU-UK / blank / -1 -> non_uk=false`, anything else -> `true`

## Poller-Owned State

The poller should keep its own durable state and not treat `quantum_event_outbox.processed_at` as the only source of truth.

Recommended storage:

- `poller_state`
  - `consumer_name` PK
  - `last_outbox_id`
  - `updated_at`
- `poller_attempts`
  - `outbox_id`
  - `attempt_count`
  - `last_error`
  - `last_attempt_at`
  - `next_retry_at`
  - `status` enum(`pending`,`retry`,`dead_letter`,`done`)
- `poller_entity_backoff`
  - optional optimization for noisy repeated QC/order events

Recommendation:

- keep this state in a poller-owned database or SQLite file
- optionally mark Quantum rows as observed for operations visibility, but do not make successful processing depend on updating Quantum

## Polling Strategy

1. Read a batch from `quantum_event_outbox` by ascending `id`.
2. Filter to the v1 event types only.
3. Coalesce noisy events before calling Plasma:
   - purchases: by `legacy_purchase_id`
   - QC: by `legacy_purchase_id`
   - sales orders: by `legacy_order_id`
   - moves: by `imei`, keeping only the newest move in the batch for that IMEI
4. Rebuild the latest normalized snapshot from Quantum tables.
5. Call the matching Plasma automation route.
6. On success, advance `last_outbox_id`.
7. On retryable failures, keep the cursor before the failed row and schedule retry.
8. On permanent data/mapping failures, move the row to dead-letter and continue only if you explicitly support gap-skipping. If not, stop and alert.

## Retry / Error Policy

Retryable:

- network timeout
- 5xx from Plasma
- temporary DB connectivity failure
- lock wait timeout

Permanent:

- Plasma `422` mapping/data errors
- missing required Quantum source rows
- unsupported event shape for v1

Dead-letter payload should store:

- outbox row id
- event type
- entity key
- normalized snapshot attempted
- Plasma response
- failure classification

## Event Handling

### 1. `goods_in.device_booked`

Trigger key:

- `payload_json.purchase_id`

Target:

- `POST /api/automation/purchases/:legacyPurchaseId/sync`

Snapshot source tables:

- `tbl_purchases`
- `tbl_suppliers`
- `tbl_imei`
- `tbl_tac`

Normalization rules:

- one purchase header per `purchase_id`
- all devices currently in `tbl_imei.purchase_id = :purchase_id`
- `item_brand` and `item_details` must come from `tbl_tac`
- use `tbl_imei.created_at` when present for `received_at`, otherwise omit it

### 2. `sales_order.device_reserved`

Trigger key:

- `payload_json.legacy_order_id`

Target:

- `POST /api/automation/sales-orders/:legacyOrderId/sync`

Primary source tables:

- `tbl_imei_sales_orders`
- `tbl_customers`
- `tbl_suppliers`
- `tbl_imei`
- `tbl_tac`

Important Quantum behavior:

- historically, sales orders were requirement-based before pick
- `tbl_imei_sales_orders` could contain a placeholder IMEI chosen from a matching pool
- that placeholder was not the official picked device
- the true picked IMEI was only finalized later in goods out via `tbl_orders.item_imei`
- only more recent fixes write the final picked IMEI back into `tbl_imei_sales_orders`

V1 consequence:

- pre-pick sales-order sync must be treated as a header-plus-lines snapshot, not an authoritative exact-device reservation
- if exact IMEIs are present, they are optional enrichment unless the event is known to represent a post-pick authoritative state
- the poller must not assume that a nonblank historical `item_code` is always the real reserved device

Recommended normalized shape for sales-order sync:

- always send:
  - order header
  - customer snapshot
  - grouped line requirements
- only send device-level IMEIs if the source state is known to be authoritative

Current Plasma caveat:

- the existing automation sales-order endpoint expects exact devices and reconciles `reserved_for_so_id`
- that behavior matches a device-bound reservation model, not the original Quantum pre-pick model
- before implementing sales-order polling, Plasma should be revised so legacy sales-order sync can create/update order headers and grouped lines without requiring exact IMEIs

### 3. `sales_order.updated`

Trigger key:

- `payload_json.legacy_order_id`

Target:

- same sales-order sync route as above

Important v1 boundary:

- live Quantum data already shows `sales_order.updated` rows where:
  - `tbl_imei_sales_orders` rows exist
  - `item_code` is blank
  - `tbl_imei.in_sales_order` returns zero devices
- that is now understood to be expected for pre-pick orders, not necessarily bad data
- therefore `sales_order.updated` should be interpreted as a line/header refresh unless a separate authoritative pick source is available

This means:

- `sales_order.updated` is valid for order maintenance
- it is not valid as proof of final device reservation unless authoritative IMEIs are present and trusted
- the poller should not dead-letter these rows merely because no exact device set can be reconstructed

Recommended v1 handling:

- sync sales-order header and grouped lines
- do not enforce device-level reservations for legacy pre-pick orders
- defer true picked-device reconciliation to a later pick/goods-out integration step

### 4. `qc.updated`, `qc.device_passed`, `qc.device_failed`

Trigger key:

- `payload_json.legacy_purchase_id`

Target:

- `POST /api/automation/qc/purchases/:legacyPurchaseId/sync`

Snapshot source tables:

- `tbl_qc_imei_products`
- `tbl_imei`
- `tbl_tac`

Rules:

- rebuild the whole purchase QC state, not one row at a time
- include every QC-tracked IMEI on the purchase
- pass through grade/color/comments/functional/cosmetic/non-UK values
- let Plasma decide whether the QC job is complete

### 5. `stock.device_moved`

Trigger key:

- `payload_json.imei`

Target:

- `POST /api/automation/devices/:imei/move`

Rules:

- this one can use the outbox payload directly
- map:
  - `new_tray_id -> new_location`
  - `old_tray_id -> old_location`
  - `reason`
  - `operation_date`
  - `admin_op_id`

## Exact Snapshot Queries

See [quantum-poller-snapshot-queries.sql](/home/gascat/Documents/abstraction3/plasma/resources/quantum-poller-snapshot-queries.sql) for copy-paste SQL.

The important query decisions are:

- purchase snapshots join `tbl_imei -> tbl_tac`
- QC snapshots join `tbl_qc_imei_products -> tbl_imei -> tbl_tac`
- sales-order snapshots use:
  - `tbl_imei_sales_orders` for header + line attributes
  - `tbl_imei.in_sales_order` for exact reserved IMEIs when available
  - fallback to nonblank `tbl_imei_sales_orders.item_code`

## Normalized Payload Shapes

### Purchase sync payload

```json
{
  "quantum_event_id": "6",
  "idempotency_key": "abc",
  "source_event_type": "goods_in.device_booked",
  "source_created_at": "2026-04-16T00:00:00.000Z",
  "source_user": "12",
  "snapshot_generated_at": "2026-04-17T15:00:00.000Z",
  "purchase": {
    "purchase_date": "2026-04-16T00:00:00.000Z",
    "po_ref": "4324",
    "requires_qc": false,
    "requires_repair": false,
    "supplier": {
      "supplier_code": "SUP-167",
      "name": "Foxway 0U",
      "address_line1": "Killustiku poik 1, Tartu",
      "address_line2": null,
      "city": null,
      "postcode": null,
      "country": "ESTONIA",
      "phone": "+372 5373 5370",
      "email": "accounts.estonia@foxway.com",
      "vat_number": "VAT - EE10813057 - EORI - EE12703942"
    },
    "devices": [
      {
        "imei": "355680653981035",
        "tray_id": "TR001",
        "item_brand": "CAT3",
        "item_details": "S921B/DS",
        "item_gb": "256",
        "item_color": "Titanium Grey",
        "item_grade": "1",
        "received_at": null
      }
    ]
  }
}
```

### Sales-order sync payload

```json
{
  "quantum_event_id": "1",
  "idempotency_key": "abc",
  "source_event_type": "sales_order.device_reserved",
  "source_created_at": "2026-04-16T00:00:00.000Z",
  "source_user": "12",
  "snapshot_generated_at": "2026-04-17T15:00:00.000Z",
  "sales_order": {
    "order_date": "2026-04-16T00:00:00.000Z",
    "customer_ref": "4341",
    "po_ref": "34324324",
    "customer": {
      "customer_code": "CST-36",
      "name": "Buy IT Ltd",
      "address_line1": "Unit A Trident Business Park",
      "address_line2": "Leeds Road",
      "city": "Huddersfield",
      "postcode": "HD2 1UA",
      "country": "United Kingdom",
      "phone": null,
      "email": "Adam@s4dltd.com",
      "vat_number": null,
      "is_backmarket": false
    },
    "lines": [
      {
        "supplier_code": "SUP-167",
        "item_brand": "CAT3",
        "item_details": "A546B/DS",
        "item_gb": "256",
        "item_grade": "1",
        "item_color": "Black",
        "tray_id": "TR010",
        "requested_quantity": 1
      }
    ],
    "devices": []
  }
}
```

Notes:

- `lines` should represent the official legacy order requirement set
- `devices` should be optional and only populated when the worker knows the IMEIs are authoritative
- if Plasma keeps the current exact-device contract, this payload shape will require a backend adjustment before poller implementation

### QC sync payload

```json
{
  "quantum_event_id": "126",
  "idempotency_key": "abc",
  "source_event_type": "qc.device_passed",
  "source_created_at": "2026-04-16T16:09:08.000Z",
  "source_user": "12",
  "snapshot_generated_at": "2026-04-17T15:00:00.000Z",
  "purchase": {
    "devices": [
      {
        "imei": "351885210668157",
        "item_grade": "1",
        "item_color": "Titanium Grey",
        "item_comments": "-",
        "item_functional_passed": 1,
        "item_cosmetic_passed": 1,
        "item_eu": "EU-UK"
      }
    ]
  }
}
```

### Stock move payload

```json
{
  "quantum_event_id": "4",
  "idempotency_key": "abc",
  "source_event_type": "stock.device_moved",
  "source_created_at": "2026-04-16T00:00:00.000Z",
  "source_user": null,
  "snapshot_generated_at": "2026-04-17T15:00:00.000Z",
  "new_location": "REPAIR_39",
  "old_location": "Backmarket_Buyback",
  "reason": "dijdms",
  "operation_date": "2026-04-16",
  "admin_op_id": "1162"
}
```

## Remaining Preflight Audit

Before the poller goes live, run the model audit queries in [quantum-poller-snapshot-queries.sql](/home/gascat/Documents/abstraction3/plasma/resources/quantum-poller-snapshot-queries.sql):

- distinct `CATxx + item_details` pairs from purchase devices
- distinct `CATxx + item_details` pairs from sales-order rows
- compare those against:
  - `legacy_sales_model_map`
  - `legacy_brand_map`
  - Plasma `models`

Expected outcome:

- most modern handset rows should resolve via `legacy_brand_map + models.model_number`
- only true exceptions should need manual `legacy_sales_model_map` seed rows

## Recommendation For Next Step

Implement the poller after this spec, but keep v1 conservative:

- support purchase sync
- support QC sync
- support stock move sync
- revise Plasma sales-order automation to support header-plus-lines sync without exact device reservations
- after that, support sales-order sync as requirement snapshots
- defer picked-device reconciliation to a later goods-out or pick-confirmation phase

That gives a safe first cut without treating historical placeholder IMEIs as truth.
