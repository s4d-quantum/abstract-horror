# Plasma ↔ Quantum Parallel-Run Relay Guide (Agent-Focused)

## Purpose

This document explains how data changed between the legacy Plasma database and the new Quantum database, why those changes were made, and how an agentic relay layer should translate data while both systems run in parallel for a short validation period.

This is **not** just a schema diff. It is an operational mapping guide for an automated bridge that must:

1. read or receive events from Quantum,
2. infer the correct equivalent action in Plasma,
3. write compatible legacy records into Plasma without breaking legacy assumptions,
4. preserve traceability during the parallel-run window,
5. surface mismatches and exceptions instead of silently guessing.

---

## Databases

- **Legacy / Plasma DB:** `s4d_england_db`
- **New / Quantum DB:** `q2_base_db`

---

## Core Design Shift

### Plasma

Plasma is a legacy MariaDB system built around:

- weak or absent foreign keys,
- implicit relationships,
- duplicate business concepts spread across multiple tables,
- status flags and magic values,
- business process state represented by whichever row happened to be written,
- low validation,
- historical drift and malformed data.

Typical characteristics:

- device identity stored by IMEI string in many tables,
- purchase/order relationships inferred by shared IDs and IMEI strings,
- numeric flags such as `status = 1/0`, `qc_required = 1/0`, etc,
- repeated rows sometimes used as a pseudo-history.

### Quantum

Quantum is a normalized MySQL 8 design built around:

- explicit foreign keys,
- one central `devices` table,
- enum-based status/state,
- dedicated header/detail tables,
- per-device current state rather than accidental historical accumulation,
- cleaner reference tables and more intentional workflow structure.

Typical characteristics:

- stable internal IDs,
- header/detail separation (`purchase_orders`, `sales_orders`, `qc_jobs`, etc.),
- one device row as the primary anchor,
- stricter validation and fewer “free-form” shortcuts.

---

## Guiding Rule for the Relay Layer

**Do not try to translate by table name alone. Translate by business meaning.**

In many cases:

- one Plasma table maps to multiple Quantum tables,
- one Quantum action maps to multiple Plasma writes,
- some Quantum concepts do not exist cleanly in Plasma,
- some Plasma “history” is actually duplicate state rows and should not be recreated blindly.

The relay agent must therefore work from:

1. the **event type** in Quantum,
2. the **business entity** involved,
3. the **target legacy representation** Plasma expects,
4. a set of **deterministic mapping rules** and **exception paths**.

---

## Critical Global Findings from Recent Migration Work

These findings are highly relevant to the relay layer.

### 1. Legacy and new purchase order IDs are not safely interchangeable

A major QC migration finding was that legacy `purchase_id` values and new `purchase_orders.id` values are **not in a simple 1:1 arithmetic relationship**.

Implication:

- Never assume `legacy purchase_id == new purchase_order_id`.
- Never use offsets or arithmetic conversion.
- The relay layer must maintain or derive a mapping explicitly.

### 2. Device identity is the most reliable bridge

Across the migration work, the **IMEI/device row** proved to be the best bridge between systems.

Implication:

- When reconciling QC, sales picks, reservations, repairs, and returns, prefer mapping through the device/IMEI rather than through legacy header IDs alone.

### 3. QC legacy data contains retests and repeated rows

Legacy QC data was not one-row-per-device-final-state.

Findings:

- 158,380 QC legacy rows mapped to valid Quantum devices.
- 154,206 distinct `(qc_job_id, device_id)` pairs existed.
- 4,174 rows collapsed because Plasma had repeated QC entries for the same device/job.
- Many of these were genuine retests or revised outcomes, not harmless exact duplicates.

Implication:

- Plasma may represent repeated QC attempts as repeated rows.
- Quantum `qc_results` represents **one current QC result per device per QC job**.
- A relay from Quantum back to Plasma must not assume Plasma stores only one QC row per device.

### 4. User IDs were intentionally preserved

The new `users.id` values were aligned to preserve the old operational user IDs where possible.

Implication:

- For many cross-system writes, user ID can be forwarded directly.
- Still validate existence before writing.

### 5. Some legacy UI flows depend on fallback logic, not just normalized tables

A recent migration finding for sales showed that the new UI path expected structured `sales_order_items`, but some legacy/completed-order history was effectively represented through the device record and related order state rather than a dedicated item row.

Implication:

- During parallel run, the relay cannot assume every consumer reads the same canonical source.
- Some Plasma screens may infer state from IMEI records, order rows, or status flags rather than a clean detail table.

---

## Major Entity Changes

## 1. Devices / Inventory

### Plasma representation

Primary legacy device tables include:

- `tbl_imei` — core inventory/device table,
- `tbl_purchases` — legacy goods-in event representation,
- `tbl_orders` / `tbl_imei_sales_orders` — goods-out / sales linkage,
- `tbl_qc_imei_products` — QC rows,
- `tbl_repair_imei_products` — repair linkage,
- various return tables.

In Plasma, one physical device is effectively represented through multiple disconnected rows across workflow tables.

### Quantum representation

Primary table:

- `devices`

Key supporting tables:

- `purchase_orders`
- `sales_orders`
- `sales_order_items`
- `qc_jobs`
- `qc_results`
- `repair_jobs`
- `repair_records`
- `returns`
- `return_items`
- `device_history`

### Why it changed

The old design made it too easy for the same device to drift across multiple partial representations. Quantum centralizes device state so the workflow tables reference a real device row rather than copying identity fields everywhere.

### Relay consequence

When Quantum writes a device-related action into Plasma, the relay must update the **legacy workflow table Plasma expects**, not just a single generic legacy device table.

Examples:

- a Quantum goods-in action may need a Plasma `tbl_purchases` row **and** a `tbl_imei` row,
- a Quantum shipment may need legacy sales rows plus inventory status updates,
- a Quantum return may need both return rows and device status changes.

---

## 2. Manufacturers and Models

### Plasma representation

- `tbl_categories` stored manufacturer-like values.
- model naming and TAC/device naming often drifted.
- manufacturer and model strings were inconsistent.

Examples seen during migration work:

- `Samsung`, `Samsung Korea`, `Samsung Electronics`
- friendly model names mixed with hardware model numbers
- variant suffixes such as `B`, `DS`, etc.

### Quantum representation

- `manufacturers`
- `models`
- `tac_lookup`

### Why it changed

The old design made reporting, validation, and matching fragile. Quantum normalizes manufacturer/model identity and uses TAC lookup intentionally.

### Relay consequence

The relay should:

- prefer **existing mapping tables** or canonical IDs,
- avoid string-based manufacturer/model guesses where possible,
- when writing into Plasma, emit the legacy value Plasma expects,
- when reading from Plasma, canonicalize before comparing to Quantum.

If string matching is necessary, it must use synonym/normalization rules rather than raw equality.

---

## 3. Grades

### Plasma representation

`tbl_imei.item_grade` used numeric values.

Known mapping from migration work:

- `1 = A`
- `2 = B`
- `3 = C`
- `4 = D`
- `5 = E`
- `6 = F`
- `0` or missing = ungraded / blank

### Quantum representation

- `devices.grade` stores direct letter values
- `grade_definitions` stores display/reference info

### Why it changed

Letter grades are the real business meaning. Numeric indirection in Plasma was legacy baggage.

### Relay consequence

Relay rules:

- **Quantum → Plasma:** convert `A-F` back to numeric grade IDs when writing to legacy fields.
- **Plasma → Quantum:** convert numeric values to letters.
- preserve blank/ungraded safely.

---

## 4. Device Status

### Plasma representation

Example from migration work:

- `tbl_imei.status = 1` meant in stock
- `tbl_imei.status = 0` meant out of stock

Other workflow state was spread across separate flags/tables.

### Quantum representation

`devices.status` is a richer enum, including values such as:

- `IN_STOCK`
- `OUT_OF_STOCK`
- `AWAITING_QC`
- `IN_QC`
- `AWAITING_REPAIR`
- `IN_REPAIR`
- `IN_LEVEL3`
- `SHIPPED`
- `RETURNED`
- `SCRAPPED`

### Why it changed

Plasma could not express workflow stage cleanly in one place. Quantum makes stage explicit.

### Relay consequence

A direct enum-to-flag translation is lossy.

Relay policy should be:

- determine the legacy table/flag combination that best represents the Quantum state,
- avoid inventing unsupported Plasma states,
- prefer writes that keep Plasma operational for the temporary parallel-run window.

Example:

- Quantum `AWAITING_QC` might still require `tbl_imei.status = 1` plus an appropriate `tbl_purchases.qc_required/qc_completed` combination in Plasma.

---

## 5. Purchase Orders / Goods In

### Plasma representation

Key legacy tables:

- `tbl_purchases`
- `tbl_imei`

Legacy purchase rows often mixed:

- the purchase header identity,
- workflow flags,
- operator info,
- tray/location,
- unit state.

### Quantum representation

- `purchase_orders`
- `purchase_order_lines`
- `devices`

### Why it changed

Quantum separates the header (`purchase_orders`) from the actual devices received (`devices`), making inventory cleaner and more auditable.

### Relay consequence

A new Quantum PO/device intake may require multiple Plasma writes:

1. create the relevant `tbl_purchases` row(s),
2. create/update `tbl_imei`,
3. set QC/repair flags expected by Plasma,
4. preserve supplier, tray, user, and date fields in the old format.

### Important warning

Do not assume Quantum PO IDs map directly to Plasma `purchase_id` values. Maintain an explicit mapping during the parallel run.

---

## 6. Sales Orders / Goods Out

### Plasma representation

Relevant legacy tables include:

- `tbl_orders`
- `tbl_imei_sales_orders`

Historically, some sales/order screens depended on legacy-specific paths or device-level state, not only a clean “items table” abstraction.

### Quantum representation

- `sales_orders`
- `sales_order_lines`
- `sales_order_items`
- `devices.reserved_for_so_id`

### Why it changed

Quantum separates:

- requested lines,
- actual picked devices,
- reservation state,
- shipment progression.

### Relay consequence

When relaying from Quantum into Plasma, the bridge must decide whether the event is:

- order creation,
- line creation,
- device reservation,
- device pick,
- shipment completion,
- cancellation.

Each of those may hit different legacy tables.

### Important practical note

For the parallel-run window, the relay should prioritize keeping Plasma’s operational screens correct over trying to mirror every normalized sub-step perfectly.

That means:

- if a Plasma screen expects `tbl_imei_sales_orders` rows to exist, create them,
- if Plasma inventory logic depends on device state flags, update them too,
- if Quantum has richer intermediate state that Plasma cannot express, collapse it to the nearest legacy-safe representation.

---

## 7. QC

### Plasma representation

- `tbl_qc_imei_products`

Columns of note:

- `purchase_id`
- `item_code` (IMEI)
- `item_comments`
- `item_cosmetic_passed`
- `item_functional_passed`
- `item_flashed`
- `user_id`
- `item_eu`

### Quantum representation

- `qc_jobs`
- `qc_results`

### Why it changed

Quantum formalizes QC into:

- a header/job grouped by purchase order,
- one result row per device per job,
- a clear current-state QC record.

### Key migration findings

- legacy `purchase_id` could **not** be trusted as a direct FK to new `purchase_orders.id`,
- QC had to be resolved primarily through `item_code -> devices.imei -> devices.purchase_order_id`,
- 177 legacy QC rows had no matching device and were quarantined,
- 4,174 legacy QC rows were duplicate/retest rows that collapsed under Quantum’s one-row-per-device-per-job rule.

### Important semantic differences

#### `overall_pass`
For migration and relay purposes, the agreed rule was:

- `1` if:
  - cosmetic pass + functional pass
  - cosmetic pass + functional NA
  - functional pass + cosmetic NA
- otherwise `0`

#### `item_eu`
Legacy meaning discovered:

- `'-1'` = standard UK/international unit => `non_uk = 0`
- `'US'` = non-UK/US unit => `non_uk = 1`

#### `item_flashed`
No strong native home in Quantum QC structure; it was folded into comments during migration where needed.

### Relay consequence

#### Quantum → Plasma
If Quantum QC runs during parallel operation, the relay must decide whether Plasma should receive:

- one current-state QC row,
- or repeated rows when the same device is retested.

Recommended policy for the temporary run:

- write a Plasma `tbl_qc_imei_products` row for each meaningful QC action emitted by Quantum,
- preserve comments and tester,
- preserve the explicit result values,
- preserve the QC event order externally if Plasma cannot represent it cleanly.

#### Plasma → Quantum
If backfilling or re-reading Plasma, repeated legacy QC rows should not all become independent `qc_results`; they must collapse to one current-state row per device/job, with a separate audit trail if full legacy history is required.

---

## 8. Repair

### Plasma representation

Legacy repair-related tables include:

- `tbl_repair_imei_products`
- `tbl_repair_imei_parts`
- `level3_repair`

Repair state in Plasma is fragmented and often inferred.

### Quantum representation

- `repair_jobs`
- `repair_records`
- `repair_comments`
- `repair_parts_used`
- `level3_repairs`

### Why it changed

Quantum separates:

- job-level grouping,
- per-device repair records,
- comments,
- parts usage,
- level-3 workflow.

### Relay consequence

Repair relay must preserve the distinction between:

- device queued for repair,
- active repair work,
- completed repair,
- escalated level-3,
- BER / unrecoverable.

Plasma may not represent those states as cleanly, so the relay should map to the closest safe legacy representation and log anything that cannot be expressed exactly.

---

## 9. Returns

### Plasma representation

Separate legacy return tables include:

- `tbl_purchase_return`
- `tbl_order_return`
- serial/accessory variants

### Quantum representation

- `returns`
- `return_items`

### Why it changed

Quantum uses a proper return header/detail model instead of scattered type-specific legacy tables.

### Relay consequence

The relay must split Quantum returns into the correct Plasma return table family based on whether the return is:

- supplier-side / purchase-side,
- customer-side / sales-side,
- serial/accessory/device-specific.

---

## 10. Users

### Plasma representation

- `tbl_accounts`
- operational rows elsewhere use `user_id`

### Quantum representation

- `users`

### Why it changed

Cleaner auth/user model, while preserving operational IDs where practical.

### Relay consequence

Relay should:

- pass through user IDs where validated,
- fall back to a service user / system user when needed,
- log unmapped users explicitly.

---

## What the Relay Layer Must Do

## A. Maintain explicit cross-system key maps

At minimum, maintain temporary mapping tables for the parallel-run period:

- Quantum PO ID ↔ Plasma purchase ID
- Quantum SO ID ↔ Plasma order ID
- Quantum return ID ↔ Plasma return ID
- Quantum device ID ↔ Plasma IMEI (and possibly Plasma row ID if needed)
- Quantum QC job ID ↔ Plasma purchase/QC grouping context

Do **not** rely on inferred integer equivalence.

---

## B. Translate by workflow event, not by table write

Recommended internal event types:

- `DEVICE_RECEIVED`
- `PO_CREATED`
- `SO_CREATED`
- `SO_DEVICE_RESERVED`
- `SO_DEVICE_PICKED`
- `SO_SHIPPED`
- `QC_RECORDED`
- `REPAIR_STARTED`
- `REPAIR_COMPLETED`
- `RETURN_CREATED`
- `RETURN_ITEM_RECEIVED`
- `DEVICE_STATUS_CHANGED`

The relay should accept a Quantum event, enrich it with the related records, then emit the required legacy writes.

---

## C. Prefer deterministic mapping over “best guess” writes

If the relay cannot prove the correct Plasma target, it should:

1. stop,
2. write to an exception queue,
3. include all candidate IDs and business keys,
4. request manual resolution.

Silent wrong writes are worse than delayed writes during a short parallel-run validation period.

---

## D. Preserve an external audit trail

For every relayed action, record:

- source system
- source table/entity
- source ID
- target system
- target table/entity
- target ID
- payload snapshot
- mapping decision
- timestamp
- result status
- operator/system user

This is essential for debugging differences between Plasma and Quantum during the overlap period.

---

## Recommended Relay Mapping Rules

## 1. Device creation / goods in

### Quantum source

- `purchase_orders`
- `devices`

### Plasma targets

Likely:

- `tbl_purchases`
- `tbl_imei`

### Minimum relay payload

- legacy purchase ID mapping
- IMEI
- TAC
- color
- OEM color
- storage
- grade conversion if present
- supplier
- tray/location
- user
- flags for QC/repair requirement

---

## 2. Device QC

### Quantum source

- `qc_jobs`
- `qc_results`

### Plasma target

- `tbl_qc_imei_products`

### Mapping

- `item_code` = IMEI from device
- `item_comments` = comments
- `item_cosmetic_passed` = map from enum/boolean
- `item_functional_passed` = map from enum/boolean
- `item_flashed` = only if available or inferable
- `user_id` = tester
- `item_eu` = `'US'` if `non_uk = 1`, otherwise `'-1'`

### Caution

Plasma may legitimately contain repeated QC rows for the same IMEI. If Quantum emits retests during parallel run, the relay may need to append another Plasma QC row rather than trying to “update” the old one.

---

## 3. Sales order creation / reservation / shipment

### Quantum source

- `sales_orders`
- `sales_order_lines`
- `sales_order_items`
- `devices`

### Plasma targets

Likely:

- `tbl_orders`
- `tbl_imei_sales_orders`
- related device/status fields

### Caution

Plasma may expect both:

- order-level rows,
- and device-level sales-order rows.

Do not assume one write is enough.

---

## 4. Returns

### Quantum source

- `returns`
- `return_items`

### Plasma targets

Depending on type:

- `tbl_purchase_return`
- `tbl_order_return`
- serial/accessory return tables where relevant

---

## Data That Does Not Round-Trip Cleanly

The relay should treat the following as potentially lossy translations.

### 1. Rich Quantum status values
Plasma often cannot represent all workflow stages explicitly.

### 2. Clean header/detail separation
Quantum may hold one conceptual action across multiple linked tables, while Plasma expects flattened row writes.

### 3. QC current-state vs repeated history
Quantum `qc_results` is one row per device/job; Plasma may contain repeated rows for retests.

### 4. Canonical model/manufacturer structure
Quantum stores normalized IDs; Plasma may require legacy strings.

### 5. Validation
Quantum rejects some malformed data that Plasma historically accepted.

---

## Exceptions the Agent Must Detect

The relay should explicitly detect and raise exceptions for:

- IMEI not found in the expected counterpart system
- unmapped purchase order / sales order / return mapping
- multiple legacy candidates for one Quantum event
- user ID missing in target system
- invalid grade translation
- model/manufacturer mismatch after normalization
- Quantum state that has no safe Plasma equivalent
- attempt to write malformed data back into Quantum-safe fields

---

## Suggested Temporary Support Tables for Parallel Run

Create dedicated relay tables in a support schema or integration schema.

### `relay_po_map`
- `quantum_po_id`
- `plasma_purchase_id`
- `created_at`
- `created_by`
- `notes`

### `relay_so_map`
- `quantum_so_id`
- `plasma_order_id`
- `created_at`
- `created_by`
- `notes`

### `relay_return_map`
- `quantum_return_id`
- `plasma_return_id`
- `return_type`
- `created_at`

### `relay_device_map`
- `quantum_device_id`
- `imei`
- `legacy_tbl_imei_id` if useful
- `created_at`

### `relay_event_log`
- source system
- source entity/id
- target system
- target entity/id
- event type
- request payload
- result payload
- status
- error text
- created_at

### `relay_exception_queue`
- event type
- source entity/id
- severity
- reason
- payload
- manual resolution notes
- resolved flag

---

## Operational Recommendations for the Parallel Window

1. **Quantum should be treated as the authoritative system for new workflow decisions.**
2. Plasma should be updated by relay writes for continuity and verification.
3. Every relayed write should be auditable.
4. Reconciliation reports should run repeatedly during the overlap.
5. Any mismatch should be triaged before final cutover.

---

## Recommended Reconciliation Checks

The relay system should repeatedly compare:

- device count by stock state
- device count by supplier / purchase order
- open sales orders and picked quantities
- QC counts by batch
- failed QC counts
- repair queue counts
- returns counts
- sample-by-sample IMEI spot checks

Where counts differ, produce:

- source IDs
- target IDs
- IMEIs
- timestamps
- user IDs
- mapped status values

---

## Final Practical Summary for the Agent

### Safe assumptions

- user IDs are often preserved,
- IMEI is the strongest cross-system business key,
- Quantum is more normalized and stricter,
- Plasma often needs multiple writes per conceptual action.

### Unsafe assumptions

- purchase/order IDs match numerically across systems,
- one Quantum table always maps to one Plasma table,
- Plasma QC has only one row per device,
- string values for make/model/manufacturer are consistent,
- a successful write to one Plasma table is enough for the UI/business logic to behave correctly.

### Preferred relay strategy

1. Receive Quantum event.
2. Enrich with related Quantum records.
3. Resolve counterpart IDs through explicit mapping tables and business keys.
4. Write all required Plasma rows for that legacy workflow.
5. Record the mapping + result in relay audit tables.
6. If uncertain, send to exception queue rather than guessing.

---

## Decision Log from Migration Work to Preserve

These decisions should be treated as established unless superseded:

1. **DB names**
   - old = `s4d_england_db`
   - new = `q2_base_db`

2. **QC job derivation**
   - derive Quantum QC grouping from matched `devices.purchase_order_id`, not legacy `purchase_id`

3. **QC quarantine rules**
   - quarantine unmatched IMEIs
   - quarantine records that cannot resolve to a valid device/PO context

4. **QC duplicate handling**
   - legacy QC may contain repeated rows for the same device/job
   - latest legacy row is the safest proxy for final state when collapsing to Quantum current-state records
   - preserve full legacy QC history separately if needed

5. **Grade mapping**
   - `1..6` ↔ `A..F`

6. **Status translation**
   - do not reduce Quantum status to Plasma’s `0/1` flags without considering workflow tables

7. **Parallel-run philosophy**
   - correctness and auditability matter more than pretending the systems are structurally equivalent

---

## Suggested Next Step for Implementation

Build the relay as a rules engine with:

- explicit event handlers,
- mapping tables,
- deterministic translators,
- audit logging,
- exception queue,
- reconciliation reports.

Do **not** build it as a naïve table-sync process.

