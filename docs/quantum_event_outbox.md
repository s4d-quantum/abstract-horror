# Quantum Event Outbox

## Why This Exists

Quantum and Plasma do not share a clean one-to-one schema or a clean one-to-one set of business meanings. The previous attempt to sync directly between both databases was unreliable because raw table changes do not always express the real business decision that happened.

The outbox exists to capture business events from Quantum after successful legacy operations, so a future Node bridge can replay those decisions into Plasma.

The guiding rule is:

`Do not sync raw database changes. Sync business decisions.`

Examples:

- Avoid: `tbl_imei.status changed from 1 to 0`
- Prefer: `sales_order.device_reserved`
- Prefer: `sales_order.device_dispatched`
- Prefer: `goods_in.device_booked`
- Prefer: `stock.device_moved`

Quantum should keep doing its normal legacy writes first. After that succeeds, it should write a structured outbox row that a future bridge can process safely and retry.

## Table Structure

Migration file:

- `quantum/database/migrations/quantum_event_outbox.sql`

Table:

```sql
CREATE TABLE IF NOT EXISTS `quantum_event_outbox` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_type` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(100) NOT NULL,
  `entity_id` VARCHAR(100) DEFAULT NULL,
  `payload_json` LONGTEXT NOT NULL,
  `source_user` VARCHAR(100) DEFAULT NULL,
  `source_file` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at` DATETIME DEFAULT NULL,
  `processing_status` ENUM('pending','processed','failed','ignored') NOT NULL DEFAULT 'pending',
  `processing_error` TEXT DEFAULT NULL,
  `idempotency_key` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_quantum_event_outbox_idempotency_key` (`idempotency_key`),
  KEY `idx_quantum_event_outbox_pending` (`processing_status`, `id`),
  KEY `idx_quantum_event_outbox_event_type` (`event_type`),
  KEY `idx_quantum_event_outbox_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

Notes:

- `payload_json` stores the replayable business payload.
- `processing_status` is managed by the future bridge.
- `idempotency_key` protects against duplicate application and duplicate writes.
- `source_user` and `source_file` give traceability back to the legacy action.

## Helper Usage

Helper file:

- `quantum/shared/quantum_event_outbox.php`

Function:

```php
recordQuantumEvent(
    $db,
    $eventType,
    $entityType,
    $entityId,
    array $payload,
    $sourceFile = null,
    $sourceUser = null,
    array $idempotencyParts = array()
)
```

Behavior:

- Uses the existing Quantum `mysqli` connection.
- Uses prepared statements plus `INSERT IGNORE`.
- JSON-encodes payloads with `JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE`.
- Builds a SHA-256 idempotency key from:
  - `eventType`
  - `entityType`
  - `entityId`
  - encoded payload JSON
  - any optional extra idempotency parts
- Returns:
  - inserted outbox row ID for a new insert
  - `0` if the row was ignored as a duplicate
  - `false` if logging failed
- Logs failures to `error_log()` but does not throw, `die()`, or block the legacy business flow.

Example:

```php
$payload = array(
    'legacy_order_id' => 1234,
    'imei' => '356789012345678',
    'source' => 'quantum',
    'operation' => 'example_operation',
);

recordQuantumEvent(
    $conn,
    'example.event',
    'device',
    '356789012345678',
    $payload,
    __FILE__,
    isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null,
    array(1234, '356789012345678')
);
```

## Event Naming Convention

Use dotted lower-case business names:

- `stock.device_moved`
- `device.updated`
- `goods_in.device_booked`
- `purchase.updated`
- `sales_order.device_reserved`
- `sales_order.updated`
- `sales_order.dispatch_updated`
- `sales_order.units_confirmed_updated`
- `sales_order.delivery_status_updated`
- `sales_order.device_allocated`
- `sales_order.device_dispatched`
- `qc.updated`
- `qc.device_passed`
- `qc.device_failed`
- `repair.updated`
- `repair.device_completed`
- `purchase.return_created`
- `sales.return_created`
- `sales.return_deleted`

Names should describe a business decision the future bridge can replay into Plasma.

## Idempotency Approach

The outbox row itself has a unique `idempotency_key`.

Default key material:

- event type
- entity type
- entity ID
- encoded payload JSON

Optional extra parts can be added when a specific flow has a better natural key. For example, stock movement events can include both `admin_op_id` and `imei`, so replays of the same admin operation dedupe safely while later unrelated moves still produce a new event.

The future bridge should also keep its own applied-events table so duplicate processing cannot reapply the same Quantum event to Plasma.

Suggested later Plasma-side table:

```sql
CREATE TABLE applied_quantum_events (
    quantum_event_id BIGINT UNSIGNED PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Retry And Failure Behavior

Quantum-side behavior:

- Event logging is best-effort for now.
- Transaction-backed flows can write the outbox row after commit.
- Non-transactional legacy flows should write the outbox row only after the final successful legacy write for that business event.
- If outbox logging fails, Quantum writes to `error_log()` and continues normal operation.

Bridge-side behavior:

- Poll oldest pending events by ascending `id`.
- Process each event inside a Plasma DB transaction.
- Check `applied_quantum_events` before applying the event.
- Map legacy values to Plasma values.
- Mark the Quantum event as `processed` only after the Plasma transaction commits.
- Mark the Quantum event as `failed` and store `processing_error` when processing fails.
- Retry failed rows safely.
- Do not assume strict business ordering across unrelated entities, even if processing by ascending `id` for predictability.

## First Instrumented Quantum Flow

Current first flow:

- `quantum/products/admin_ops/location_management.php`

Event emitted:

- `stock.device_moved`

Why this flow was chosen:

- it already has stronger validation than the older tray editor
- it uses prepared statements for its main writes
- it records admin operation metadata
- it handles multiple IMEIs in one controlled flow
- it already wraps the core move operation in a DB transaction

Current payload shape:

```json
{
  "admin_op_id": 123,
  "legacy_imei_id": null,
  "imei": "356789012345678",
  "old_tray_id": "TR-OLD",
  "new_tray_id": "TR-NEW",
  "operation_date": "2026-04-16",
  "reason": "Cycle count correction",
  "source": "quantum",
  "operation": "manual_stock_move"
}
```

The first implementation emits one event per moved IMEI after the legacy stock move transaction commits.

## Currently Instrumented Flows

- `quantum/products/admin_ops/location_management.php`
  - emits `stock.device_moved`
- `quantum/sales/imei_orders/includes/submit_order.php`
  - emits `sales_order.device_reserved`
- `quantum/sales/imei_orders/includes/submit_edit_order.php`
  - emits `sales_order.updated`
- `quantum/orders/imei/new_order.php`
  - emits `sales_order.device_dispatched`
- `quantum/orders/imei/edit_order.php`
  - emits `sales_order.dispatch_updated`
- `quantum/orders/imei/includes/update_units_confirmed.php`
  - emits `sales_order.units_confirmed_updated`
- `quantum/orders/imei/includes/update_delivery_status.php`
  - emits `sales_order.delivery_status_updated`
- `quantum/orders/imei/update_delivery_statuses.php`
  - emits `sales_order.delivery_status_updated` for automated delivered-status updates
- `quantum/orders/imei/new_order_return.php`
  - emits `sales.return_created`
- `quantum/orders/imei/order_return_history.php`
  - emits `sales.return_deleted`
- `quantum/purchases/imei_purchases/includes/submit_new_purchase.php`
  - emits `goods_in.device_booked`
- `quantum/purchases/imei_purchases/includes/submit_edit_purchase.php`
  - emits `purchase.updated`
- `quantum/products/imei/includes/update_tray.php`
  - emits `stock.device_moved`
- `quantum/qc/qc-imei/save_qc.php`
  - emits `qc.updated` for per-device QC saves
  - emits `qc.device_passed` and `qc.device_failed` when QC is marked complete
- `quantum/repair/repair-imei/save_repair.php`
  - emits `repair.updated` for per-device repair saves
  - emits `repair.device_completed` when repair is marked complete
- `quantum/repair/repair-imei/parts/includes/submit_edit_repair_parts.php`
  - emits `repair.updated` with the current parts allocation snapshot for the device

## Recommended Next Flows

1. `quantum/orders/imei/includes/clear-return-tag-from-order.php`
   - inspect whether return-tag removal is a meaningful business event for Plasma or just an internal shipping/admin flag

2. `quantum/products/serial/includes/update_tray.php`
   - mirror the IMEI compatibility stock-move event on the serial side only if the serial item lifecycle is still materially used

3. `quantum/purchases/serial_purchases/includes/submit_new_purchase.php`
   - add serial-side goods-in only if serial volume justifies keeping Plasma in sync for that inventory path

## Why Not Direct Database Sync

Direct DB sync failed because:

- table schemas do not line up cleanly
- legacy column changes often do not reveal business intent
- retries and partial failures are hard to reason about at raw-row level
- duplicates and ordering become dangerous without a business event boundary

The outbox model gives:

- traceability
- replayability
- idempotency
- clear business meaning
- a stable handoff point for the future Node bridge
