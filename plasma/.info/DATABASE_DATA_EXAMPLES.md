# Plasma Inventory Management System — Data Examples & Explanations

**Database:** `quantum2_db`
**Last Updated:** 2026-04-02

This document provides concrete data examples for every table in the system, walking through real-world business scenarios. Use this alongside `DATABASE_SCHEMA.md` for migration planning.

---

## Table of Contents

1. [Core Reference Data](#1-core-reference-data)
2. [Business Entities](#2-business-entities)
3. [Scenario 1: Goods In (Purchase Order → Receive Devices)](#3-scenario-1-goods-in)
4. [Scenario 2: QC Workflow](#4-scenario-2-qc-workflow)
5. [Scenario 3: Repair Workflow](#5-scenario-3-repair-workflow)
6. [Scenario 4: Sales Order — B2B](#6-scenario-4-sales-order--b2b)
7. [Scenario 5: Sales Order — Backmarket](#7-scenario-5-sales-order--backmarket)
8. [Scenario 6: Level 3 Repair](#8-scenario-6-level-3-repair)
9. [Scenario 7: Returns](#9-scenario-7-returns)
10. [Scenario 8: Parts Management](#10-scenario-8-parts-management)
11. [Scenario 9: Admin Operations](#11-scenario-9-admin-operations)
12. [Device Lifecycle — Full Status Flow](#12-device-lifecycle--full-status-flow)
13. [Stock Level Accounting (Parts)](#13-stock-level-accounting-parts)
14. [Common Query Patterns](#14-common-query-patterns)
15. [Migration Mapping Reference](#15-migration-mapping-reference)

---

## 1. Core Reference Data

### manufacturers

```
| id | code    | name      |
|----|---------|-----------|
| 1  | APPLE   | Apple     |
| 2  | SAMSUNG | Samsung   |
| 3  | GOOGLE  | Google    |
| 4  | HUAWEI  | Huawei    |
| 5  | XIAOMI  | Xiaomi    |
```

### models

```
| id | manufacturer_id | model_number | model_name       |
|----|-----------------|--------------|------------------|
| 1  | 1               | A2894        | iPhone 15 Pro    |
| 2  | 1               | A2896        | iPhone 15 Pro Max|
| 3  | 1               | A3102        | iPhone 16        |
| 4  | 2               | SM-S911B     | Galaxy S23       |
| 5  | 2               | SM-S921B     | Galaxy S24       |
| 6  | 3               | GQML3        | Pixel 8 Pro      |
```

### tac_lookup

```
| id | tac_code | manufacturer_id | model_id | possible_storage   | possible_colors                         |
|----|----------|-----------------|----------|--------------------|-----------------------------------------|
| 1  | 35328811 | 1               | 1        | [128,256,512,1024] | ["Black Titanium","White Titanium",     |
|    |          |                 |          |                    |  "Blue Titanium","Natural Titanium"]    |
| 2  | 35456789 | 2               | 4        | [128,256]          | ["Cream","Black","Green","Lavender"]    |
| 3  | 35678123 | 1               | 3        | [128,256,512]      | ["Black","White","Pink","Teal"]         |
```

**How TAC lookup works:** When a device is scanned, the IMEI's first 8 characters are extracted and queried against `tac_lookup`. If a match is found, the manufacturer, model, and valid storage/color options are auto-populated in the receiving form. If no match exists, the operator must manually select manufacturer/model.

### locations

```
| id | code            | name                      | location_type | is_active |
|----|-----------------|---------------------------|---------------|-----------|
| 1  | GOODS_IN        | Goods In Area             | OTHER         | TRUE      |
| 2  | QC_AREA         | QC Testing Area           | QC            | TRUE      |
| 3  | REPAIR_AREA     | Repair Workshop           | REPAIR        | TRUE      |
| 4  | LEVEL3_1        | Level 3 Repair Bay 1      | LEVEL3        | TRUE      |
| 5  | LEVEL3_2        | Level 3 Repair Bay 2      | LEVEL3        | TRUE      |
| 6  | LEVEL3_COMPLETE | Level 3 Complete          | LEVEL3        | TRUE      |
| 7  | LEVEL3_FAILS    | Level 3 Failures          | LEVEL3        | TRUE      |
| 8  | SHIPPING        | Shipping Area             | SHIPPING      | TRUE      |
| 9  | RETURNS         | Returns Processing        | RETURNS       | TRUE      |
| 10 | TRAY-001        | Tray 1 - Apple Stock      | TRAY          | TRUE      |
| 11 | TRAY-002        | Tray 2 - Samsung Stock    | TRAY          | TRUE      |
| 12 | RACK-A1         | Rack A Shelf 1            | RACK          | TRUE      |
```

**Location types explained:**
- `TRAY` / `RACK` — general stock storage
- `QC` — devices undergoing quality control
- `REPAIR` — standard repair workshop
- `LEVEL3` — board-level repair bays (usually single-occupancy)
- `SHIPPING` — staging area for outbound shipments
- `RETURNS` — returns processing area
- `OTHER` — miscellaneous (goods-in, etc.)

### grade_definitions

```
| grade | description                              | sort_order |
|-------|------------------------------------------|------------|
| A     | Excellent - Like new condition           | 1          |
| B     | Good - Minor cosmetic wear               | 2          |
| C     | Fair - Visible wear but fully functional | 3          |
| D     | Poor - Significant wear                  | 4          |
| E     | Very Poor - Heavy damage                 | 5          |
| F     | Faulty/For parts                         | 6          |
```

### storage_options

```
| id | gb_value | display_label |
|----|----------|---------------|
| 1  | 8        | 8GB           |
| 2  | 16       | 16GB          |
| 3  | 32       | 32GB          |
| 4  | 64       | 64GB          |
| 5  | 128      | 128GB         |
| 6  | 256      | 256GB         |
| 7  | 512      | 512GB         |
| 8  | 1024     | 1TB           |
```

---

## 2. Business Entities

### users

```
| id | username | display_name        | role    | is_active |
|----|----------|---------------------|---------|-----------|
| 1  | admin    | System Administrator| ADMIN   | TRUE      |
| 2  | jsmith   | John Smith          | SALES   | TRUE      |
| 3  | kjones   | Karen Jones         | WAREHOUSE| TRUE     |
| 4  | mbrown   | Mike Brown          | QC      | TRUE      |
| 5  | dlee     | David Lee           | REPAIR  | TRUE      |
```

### customers

```
| id | customer_code | name                | is_backmarket | is_active |
|----|---------------|---------------------|---------------|-----------|
| 1  | CST-BM        | Backmarket Consumer | TRUE          | TRUE      |
| 2  | CST-0002      | TechRecycle Ltd     | FALSE         | TRUE      |
| 3  | CST-0003      | MobileRefurb Co     | FALSE         | TRUE      |
| 4  | CST-0004      | Phone World Direct  | FALSE         | TRUE      |
```

### suppliers

```
| id | supplier_code | name                  | is_active |
|----|---------------|-----------------------|-----------|
| 1  | SUP-0001      | Bulk Mobile Wholesale | TRUE      |
| 2  | SUP-0002      | TradePhone Europe     | TRUE      |
| 3  | SUP-0003      | DeviceSource UK       | TRUE      |
```

---

## 3. Scenario 1: Goods In

**Scenario:** TechRecycle Ltd (customer_id=2, but acting as supplier here) delivers 5 iPhone 15 Pros and 3 Galaxy S23s. Staff creates a PO, confirms it, then receives the devices.

### Step 1: Create Purchase Order

**purchase_orders** — one row created:

```
| id | po_number  | supplier_id | supplier_ref   | status | expected_quantity | received_quantity | requires_qc | requires_repair | created_by |
|----|------------|-------------|----------------|--------|-------------------|-------------------|-------------|-----------------|------------|
| 1  | PO-00001   | 1           | TC-INV-20260301| DRAFT  | 0                 | 0                 | TRUE        | FALSE           | 1          |
```

### Step 2: Add Lines

**purchase_order_lines** — two rows:

```
| id | purchase_order_id | manufacturer_id | model_id | storage_gb | color           | expected_quantity | received_quantity |
|----|-------------------|-----------------|----------|------------|-----------------|-------------------|-------------------|
| 1  | 1                 | 1               | 1        | 256        | Black Titanium  | 5                 | 0                 |
| 2  | 1                 | 2               | 4        | 128        | Cream           | 3                 | 0                 |
```

PO updated: `expected_quantity = 8`, `status = CONFIRMED`

### Step 3: Receive Devices

Staff scans each IMEI. For each scan, the TAC is extracted (first 8 chars) and looked up in `tac_lookup` to verify manufacturer/model. The system creates device records.

**devices** — 8 rows created:

```
| id | imei            | tac_code  | mfr_id | model_id | storage_gb | color          | grade | status      | loc_id | po_id | supplier_id | qc_required | repair_required | received_at        |
|----|-----------------|-----------|--------|----------|------------|----------------|-------|-------------|--------|-------|-------------|-------------|-----------------|--------------------|
| 1  | 353288110000001 | 35328811  | 1      | 1        | 256        | Black Titanium | NULL  | AWAITING_QC | 2      | 1     | 1           | TRUE        | FALSE           | 2026-03-01 10:30:00|
| 2  | 353288110000002 | 35328811  | 1      | 1        | 256        | Black Titanium | NULL  | AWAITING_QC | 2      | 1     | 1           | TRUE        | FALSE           | 2026-03-01 10:31:00|
| 3  | 353288110000003 | 35328811  | 1      | 1        | 256        | White Titanium | NULL  | AWAITING_QC | 2      | 1     | 1           | TRUE        | FALSE           | 2026-03-01 10:32:00|
| 4  | 353288110000004 | 35328811  | 1      | 1        | 512        | Blue Titanium  | NULL  | AWAITING_QC | 2      | 1     | 1           | TRUE        | FALSE           | 2026-03-01 10:33:00|
| 5  | 353288110000005 | 35328811  | 1      | 1        | 256        | Natural Titanium| NULL | AWAITING_QC | 2      | 1     | 1           | TRUE        | FALSE           | 2026-03-01 10:34:00|
| 6  | 354567890000001 | 35456789  | 2      | 4        | 128        | Cream          | NULL  | AWAITING_QC | 2      | 1     | 1           | TRUE        | FALSE           | 2026-03-01 10:35:00|
| 7  | 354567890000002 | 35456789  | 2      | 4        | 128        | Black          | NULL  | AWAITING_QC | 2      | 1     | 1     | TRUE        | FALSE           | 2026-03-01 10:36:00|
| 8  | 354567890000003 | 35456789  | 2      | 4        | 128        | Lavender       | NULL  | AWAITING_QC | 2      | 1     | 1           | TRUE        | FALSE           | 2026-03-01 10:37:00|
```

**Key observations:**
- `grade` is NULL at receipt — assigned during QC
- `status` is `AWAITING_QC` because `requires_qc = TRUE` on the PO
- `location_id` is set to the QC area (or whatever location was specified)
- `tac_code` is extracted from the IMEI
- `received_at` is set to the actual scan time

**device_history** — 8 rows (one per device):

```
| device_id | imei            | event_type | reference_type  | reference_id | notes             | user_id |
|-----------|-----------------|------------|-----------------|--------------|-------------------|---------|
| 1         | 353288110000001 | RECEIVED   | PURCHASE_ORDER  | 1            | Received via PO-00001 | 3    |
| 2         | 353288110000002 | RECEIVED   | PURCHASE_ORDER  | 1            | Received via PO-00001 | 3    |
| ...       | ...             | ...        | ...             | ...          | ...               | ...     |
```

**purchase_orders** — updated:

```
| id | status            | received_quantity |
|----|-------------------|-------------------|
| 1  | FULLY_RECEIVED    | 8                 |
```

**purchase_order_lines** — updated `received_quantity`:

```
| id | expected_quantity | received_quantity |
|----|-------------------|-------------------|
| 1  | 5                 | 5                 |
| 2  | 3                 | 3                 |
```

**qc_jobs** — auto-created (since `requires_qc = TRUE`):

```
| id | job_number  | purchase_order_id | status  | total_devices | created_by |
|----|-------------|-------------------|---------|---------------|------------|
| 1  | QC-00001    | 1                 | PENDING | 8             | 3          |
```

**qc_results** — 8 pending rows (one per device):

```
| id | qc_job_id | device_id | functional_result | cosmetic_result | overall_pass | grade_assigned |
|----|-----------|-----------|-------------------|-----------------|--------------|----------------|
| 1  | 1         | 1         | NULL              | NULL            | NULL         | NULL           |
| 2  | 1         | 2         | NULL              | NULL            | NULL         | NULL           |
| ...| ...       | ...       | ...               | ...             | ...          | ...            |
```

### Alternative: Book-as-Arrive (No PO Pre-Creation)

The `createWithDevices` method creates the PO and devices in a single transaction. The PO is immediately set to `FULLY_RECEIVED` with `expected_quantity = received_quantity`.

---

## 4. Scenario 2: QC Workflow

**Continuing from Scenario 1:** QC technician processes the 8 devices from QC-00001.

### QC Technician Opens Job

qc_jobs updated:

```
| id | status      | started_at          |
|----|-------------|---------------------|
| 1  | IN_PROGRESS | 2026-03-01 14:00:00 |
```

### Test Results Entered

Each device is tested. Results are written to `qc_results`:

```
| id | qc_job_id | device_id | functional_result | cosmetic_result | overall_pass | grade_assigned | color_verified    | non_uk | tested_by | tested_at           |
|----|-----------|-----------|-------------------|-----------------|--------------|----------------|-------------------|--------|-----------|---------------------|
| 1  | 1         | 1         | PASS              | PASS            | TRUE         | A              | Black Titanium    | FALSE  | 4         | 2026-03-01 14:15:00 |
| 2  | 1         | 2         | PASS              | PASS            | TRUE         | B              | Black Titanium    | FALSE  | 4         | 2026-03-01 14:20:00 |
| 3  | 1         | 3         | PASS              | PASS            | TRUE         | A              | White Titanium    | FALSE  | 4         | 2026-03-01 14:25:00 |
| 4  | 1         | 4         | FAIL              | PASS            | FALSE        | NULL           | Blue Titanium     | FALSE  | 4         | 2026-03-01 14:30:00 |
| 5  | 1         | 5         | PASS              | PASS            | TRUE         | B              | Natural Titanium  | FALSE  | 4         | 2026-03-01 14:35:00 |
| 6  | 1         | 6         | PASS              | PASS            | TRUE         | A              | Cream             | FALSE  | 4         | 2026-03-01 14:40:00 |
| 7  | 1         | 7         | PASS              | FAIL            | NULL         | C              | Black             | TRUE   | 4         | 2026-03-01 14:45:00 |
| 8  | 1         | 8         | PASS              | PASS            | TRUE         | A              | Lavender          | FALSE  | 4         | 2026-03-01 14:50:00 |
```

**Key observations:**
- Device 4: `functional_result = FAIL` → `overall_pass = FALSE`. Will need repair.
- Device 7: `cosmetic_result = FAIL` → grade C assigned, `non_uk = TRUE` (non-UK device flagged).
- `overall_pass` is `TRUE` only when `functional_result = PASS`. `NULL` when cosmetic fails but functional passes.

### QC Job Completion

When all results are submitted, the system:

1. **Updates qc_jobs metrics:**

```
| id | status      | total_devices | completed_devices | passed_devices | failed_devices | completed_at        |
|----|-------------|---------------|-------------------|----------------|----------------|---------------------|
| 1  | COMPLETED   | 8             | 8                 | 6              | 1              | 2026-03-01 15:00:00 |
```

Note: `passed_devices` counts `overall_pass = TRUE` (6), `failed_devices` counts `overall_pass = FALSE` (1). Device 7 has `overall_pass = NULL` (cosmetic fail, functional pass) so it's counted in `completed_devices` but not in passed/failed.

2. **Updates devices** — passes move to `IN_STOCK`, fails move to `AWAITING_REPAIR`:

```
| id | status          | grade | qc_completed | qc_completed_at     | repair_required | repair_completed |
|----|-----------------|-------|--------------|---------------------|-----------------|------------------|
| 1  | IN_STOCK        | A     | TRUE         | 2026-03-01 15:00:00 | FALSE           | FALSE            |
| 2  | IN_STOCK        | B     | TRUE         | 2026-03-01 15:00:00 | FALSE           | FALSE            |
| 3  | IN_STOCK        | A     | TRUE         | 2026-03-01 15:00:00 | FALSE           | FALSE            |
| 4  | AWAITING_REPAIR | NULL  | TRUE         | 2026-03-01 15:00:00 | TRUE            | FALSE            |
| 5  | IN_STOCK        | B     | TRUE         | 2026-03-01 15:00:00 | FALSE           | FALSE            |
| 6  | IN_STOCK        | A     | TRUE         | 2026-03-01 15:00:00 | FALSE           | FALSE            |
| 7  | IN_STOCK        | C     | TRUE         | 2026-03-01 15:00:00 | FALSE           | FALSE            |
| 8  | IN_STOCK        | A     | TRUE         | 2026-03-01 15:00:00 | FALSE           | FALSE            |
```

3. **If PO also had `requires_repair = TRUE`:** A repair job is auto-created for the failed device(s).

**device_history** entries for each status change:

```
| device_id | event_type    | field_changed | old_value    | new_value        | notes           |
|-----------|---------------|---------------|--------------|------------------|-----------------|
| 1         | STATUS_CHANGE | status        | AWAITING_QC  | IN_STOCK         | QC passed       |
| 4         | STATUS_CHANGE | status        | AWAITING_QC  | AWAITING_REPAIR  | QC failed - functional fail |
| 7         | GRADE_CHANGE  | grade         | NULL         | C                | Grade assigned during QC |
```

---

## 5. Scenario 3: Repair Workflow

**Continuing:** Device 4 (failed QC) needs repair. A repair job is created.

### Auto-Created Repair Job

**repair_jobs:**

```
| id | job_number  | purchase_order_id | status  | priority | total_devices | completed_devices | notes                                              | created_by |
|----|-------------|-------------------|---------|----------|---------------|-------------------|----------------------------------------------------|------------|
| 1  | REP-00001   | 1                 | PENDING | NORMAL   | 1             | 0                 | Auto-created from goods in. Fault: QC functional fail | 3        |
```

**repair_records:**

```
| id | repair_job_id | device_id | status  | fault_description                                              |
|----|---------------|-----------|---------|----------------------------------------------------------------|
| 1  | 1             | 4         | PENDING | Booked into repair from goods in. Add engineer diagnosis on device page. |
```

### Engineer Diagnoses and Repairs

**repair_records** updated:

```
| id | status      | fault_description         | engineer_comments              | outcome   | resolution_notes           | repaired_by | started_at          | completed_at        |
|----|-------------|---------------------------|--------------------------------|-----------|----------------------------|-------------|---------------------|---------------------|
| 1  | COMPLETED   | Screen unresponsive       | Replaced display assembly.     | Repaired  | New OEM screen installed.  | 5           | 2026-03-02 09:00:00 | 2026-03-02 11:30:00 |
|    |             |                           | Tested all functions OK.       |           | Device fully functional.   |             |                     |                     |
```

**repair_comments** — engineer adds notes during repair:

```
| id | repair_record_id | comment_text                                    | created_by | created_at          |
|----|------------------|-------------------------------------------------|------------|---------------------|
| 1  | 1                | Screen has dead zone in top right corner.       | 5          | 2026-03-02 09:15:00 |
| 2  | 1                | Replacement screen fitted, testing now.         | 5          | 2026-03-02 10:45:00 |
| 3  | 1                | All tests pass. Ready for stock.                | 5          | 2026-03-02 11:25:00 |
```

**repair_parts_used** — parts consumed:

```
| id | repair_record_id | part_id | part_lot_id | quantity | status | added_by |
|----|------------------|---------|-------------|----------|--------|----------|
| 1  | 1                | 15      | 3           | 1        | USED   | 5        |
```

**Device 4 final state:**

```
| id | status   | grade | repair_required | repair_completed | repair_completed_at |
|----|----------|-------|-----------------|------------------|---------------------|
| 4  | IN_STOCK | B     | TRUE            | TRUE             | 2026-03-02 11:30:00 |
```

**repair_jobs** metrics updated:

```
| id | status      | total_devices | completed_devices | started_at          | completed_at        |
|----|-------------|---------------|-------------------|---------------------|---------------------|
| 1  | COMPLETED   | 1             | 1                 | 2026-03-02 09:00:00 | 2026-03-02 11:30:00 |
```

### Escalation to Level 3

If the engineer determines the device needs board-level repair:

**repair_records:**

```
| id | status        | engineer_comments                    | outcome |
|----|---------------|--------------------------------------|---------|
| 1  | ESCALATED_L3  | Main board fault. Escalating to L3. | NULL    |
```

**level3_repairs** — new row:

```
| id | device_id | location_code | fault_description        | engineer_comments        | status     | booked_in_by |
|----|-----------|---------------|--------------------------|--------------------------|------------|--------------|
| 1  | 4         | LEVEL3_1      | Main board fault         | Escalated from repair    | BOOKED_IN  | 5            |
```

---

## 6. Scenario 4: Sales Order — B2B

**Scenario:** MobileRefurb Co orders 2 iPhones and 1 Samsung. Order is created, confirmed (reserving devices), devices are picked, then shipped.

### Create Sales Order

**sales_orders:**

```
| id | so_number  | customer_id | order_type | customer_ref     | status | created_by |
|----|------------|-------------|------------|------------------|--------|------------|
| 1  | SO-00001   | 3           | B2B        | MR-PO-20260305   | DRAFT  | 2          |
```

**sales_order_lines:**

```
| id | sales_order_id | manufacturer_id | model_id | storage_gb | color          | grade | supplier_id | requested_quantity | picked_quantity |
|----|----------------|-----------------|----------|------------|----------------|-------|-------------|--------------------|-----------------|
| 1  | 1              | 1               | 1        | 256        | Black Titanium | A     | 1           | 2                  | 0               |
| 2  | 1              | 2               | 4        | 128        | NULL           | A     | 1           | 1                  | 0               |
```

Line 2 has `color = NULL` — customer accepts any color as long as it's 128GB Grade A.

### Confirm Order (Reserve Devices)

When confirmed, the system:
1. Sets `sales_orders.status = 'CONFIRMED'`
2. Finds matching `IN_STOCK` devices that aren't already reserved
3. Sets `devices.reserved_for_so_id = 1` on matching devices

**devices** — reservation applied:

```
| id | status   | storage_gb | color          | grade | reserved_for_so_id |
|----|----------|------------|----------------|-------|--------------------|
| 1  | IN_STOCK | 256        | Black Titanium | A     | 1                  |  ← matches line 1
| 6  | IN_STOCK | 128        | Cream          | A     | 1                  |  ← matches line 2
| 2  | IN_STOCK | 256        | Black Titanium | B     | NULL               |  ← wrong grade, not reserved
```

Note: Only 1 device reserved for line 1 because only 1 Grade A Black Titanium 256GB exists. The 2nd requested device will need to be picked manually or the order stays partially reserved.

### Pick Devices

Warehouse staff scans devices. Each scan creates a `sales_order_items` row.

**sales_order_items:**

```
| id | sales_order_id | sales_order_line_id | device_id | scanned_at          | verified | shipped | picked_by |
|----|----------------|---------------------|-----------|---------------------|----------|---------|-----------|
| 1  | 1              | 1                   | 1         | 2026-03-06 09:00:00 | TRUE     | FALSE   | 3         |
| 2  | 1              | 2                   | 6         | 2026-03-06 09:05:00 | TRUE     | FALSE   | 3         |
```

**sales_order_lines** — `picked_quantity` incremented:

```
| id | requested_quantity | picked_quantity |
|----|--------------------|-----------------|
| 1  | 2                  | 1               |
| 2  | 1                  | 1               |
```

**sales_orders** — status moved to PROCESSING:

```
| id | status     |
|----|------------|
| 1  | PROCESSING |
```

Devices remain `IN_STOCK` until shipped.

### Ship Order

**sales_orders** updated:

```
| id | status | courier | tracking_number | shipped_at          |
|----|--------|---------|-----------------|---------------------|
| 1  | SHIPPED| DPD     | 15501234567890  | 2026-03-06 14:00:00 |
```

**sales_order_items** — all marked shipped:

```
| id | shipped | shipped_at          |
|----|---------|---------------------|
| 1  | TRUE    | 2026-03-06 14:00:00 |
| 2  | TRUE    | 2026-03-06 14:00:00 |
```

**devices** — status changed to SHIPPED:

```
| id | status   | reserved_for_so_id |
|----|----------|--------------------|
| 1  | SHIPPED  | NULL               |
| 6  | SHIPPED  | NULL               |
```

**device_history:**

```
| device_id | event_type    | old_value | new_value | reference_type | reference_id |
|-----------|---------------|-----------|-----------|----------------|--------------|
| 1         | STATUS_CHANGE | IN_STOCK  | SHIPPED   | SALES_ORDER    | 1            |
| 6         | STATUS_CHANGE | IN_STOCK  | SHIPPED   | SALES_ORDER    | 1            |
```

---

## 7. Scenario 5: Sales Order — Backmarket

**Scenario:** A Backmarket consumer orders an iPhone 16. DPD shipping label is generated via MyShipments.

### Create BM Sales Order

**sales_orders:**

```
| id | so_number  | customer_id | order_type  | backmarket_order_id | customer_ref           | status |
|----|------------|-------------|-------------|---------------------|------------------------|--------|
| 2  | SO-00002   | 1           | BACKMARKET  | BM-UK-20260307-1234 | John Doe - Backmarket   | DRAFT  |
```

`customer_id = 1` is the default "Backmarket Consumer" record.

**sales_order_lines:**

```
| id | sales_order_id | manufacturer_id | model_id | storage_gb | color | grade | requested_quantity |
|----|----------------|-----------------|----------|------------|-------|-------|--------------------|
| 3  | 2              | 1               | 3        | 128        | Black | A     | 1                  |
```

### BM Shipment Processing

When the order is confirmed and a device is picked, the Backmarket integration:

1. Fetches shipping details from BM API
2. Cleanses address via Ideal Postcodes
3. Books DPD shipment via MyShipments
4. Stores ZPL label data

**backmarket_shipments:**

```
| id | sales_order_id | backmarket_order_id | customer_name | address_raw                                        | address_cleaned                                      | dpd_consignment | dpd_shipment_id                      | tracking_number   | label_zpl   | shipment_booked | backmarket_updated |
|----|----------------|---------------------|---------------|----------------------------------------------------|------------------------------------------------------|-----------------|-------------------------------------|-------------------|-------------|-----------------|---------------------|
| 1  | 2              | BM-UK-20260307-1234 | John Doe      | {"line1":"123 High St","city":"London",...}         | 123 High St\nLondon\nSW1A 1AA                      | DPD1234567      | 550e8400-e29b-41d4-a716-446655440000| 15509876543210    | ^XA...^XZ  | TRUE            | TRUE                |
```

**Key fields:**
- `dpd_shipment_id` — UUID from MyShipments API, used to retrieve labels later
- `label_zpl` — ZPL printer data for the shipping label (MEDIUMTEXT)
- `shipment_booked` — DPD booking confirmed
- `backmarket_updated` — BM API notified of tracking number

---

## 8. Scenario 6: Level 3 Repair

**Scenario:** A device with a faulty logic board is escalated to Level 3.

### Book In

**level3_repairs:**

```
| id | device_id | location_code | fault_description              | status     | booked_in_by | booked_in_at        |
|----|-----------|---------------|--------------------------------|------------|--------------|---------------------|
| 2  | 12        | LEVEL3_1      | No power, suspected board fault| BOOKED_IN  | 5            | 2026-03-10 09:00:00 |
```

**devices** — location updated to Level 3 bay:

```
| id | status     | location_id |
|----|------------|-------------|
| 12 | IN_LEVEL3  | 4           |  ← LEVEL3_1
```

### Repair Progress

**level3_repairs** updated through statuses:

```
-- Start work
| id | status       | engineer_comments          |
|----|--------------|----------------------------|
| 2  | IN_PROGRESS  | Diagnosing power circuit     |

-- Need parts
| id | status          | engineer_comments                |
|----|-----------------|----------------------------------|
| 2  | AWAITING_PARTS  | PMIC chip needs replacement.     |
|    |                 | Ordered from supplier.           |

-- Complete
| id | status    | engineer_comments                     | completed_at        |
|----|-----------|---------------------------------------|---------------------|
| 2  | COMPLETED | PMIC replaced. Device powers on OK.   | 2026-03-12 16:00:00 |
```

### Level 3 Outcomes

**COMPLETED:** Device moves back to `IN_STOCK` for sale.

**BER (Beyond Economical Repair):** Device moves to `SCRAPPED` status or stays in `IN_LEVEL3` for parts harvesting.

**UNREPAIRABLE:** Similar to BER — documented as permanently non-functional.

---

## 9. Scenario 7: Returns

### Customer Return

**Scenario:** Backmarket customer returns an iPhone because of cosmetic damage.

**returns:**

```
| id | return_number | return_type       | sales_order_id | customer_id | reason                      | status   | created_by |
|----|---------------|-------------------|----------------|-------------|-----------------------------|----------|------------|
| 1  | RET-00001     | CUSTOMER_RETURN   | 2              | 1           | Cosmetic damage not as described | RECEIVED | 2       |
```

**return_items:**

```
| id | return_id | device_id | condition_on_return        | inspection_notes                | disposition | processed_by |
|----|-----------|-----------|----------------------------|---------------------------------|-------------|--------------|
| 1  | 1         | 3         | Scratched screen, dented frame | Not as described on Backmarket | REPAIR      | 4            |
```

**devices** — status changed:

```
| id | status   |
|----|----------|
| 3  | RETURNED |
```

The disposition `REPAIR` means this device will be put into a repair job to fix the damage before re-listing.

### Supplier Return

**returns:**

```
| id | return_number | return_type       | purchase_order_id | supplier_id | reason                  | status  |
|----|---------------|-------------------|-------------------|-------------|-------------------------|---------|
| 2  | RET-00002     | SUPPLIER_RETURN   | 1                 | 1           | 2 devices with screen burn | PENDING |
```

---

## 10. Scenario 8: Parts Management

### Part Hierarchy

```
part_categories (Screen)
  └── part_bases (iPhone 15 Pro Screen Assembly)
        ├── parts (SKU: SCR-IP15-BLK-OEM) — Black, OEM quality
        │     └── part_lots (LOT-2026-001 — received 2026-03-01, 10 units)
        │     └── part_lots (LOT-2026-002 — received 2026-03-15, 5 units)
        ├── parts (SKU: SCR-IP15-WHT-OEM) — White, OEM quality
        └── parts (SKU: SCR-IP15-BLK-AM)  — Black, Aftermarket
```

### part_categories

```
| id | name           | description                           |
|----|----------------|---------------------------------------|
| 1  | Screen         | Display assemblies and components     |
| 2  | Battery        | Device batteries                      |
| 3  | Back Glass     | Rear glass panels                     |
| 9  | Service Pack   | Complete screen and frame assemblies  |
```

### part_bases

```
| id | base_code      | name                             | category_id | manufacturer_id | subtype    | changes_device_color |
|----|----------------|----------------------------------|-------------|-----------------|------------|----------------------|
| 1  | SCR-IP15-BLK   | iPhone 15 Pro Screen Black       | 1           | 1               | OEM        | TRUE                 |
| 2  | BAT-IP15       | iPhone 15 Pro Battery            | 2           | 1               | OEM        | FALSE                |
| 3  | BG-S24         | Galaxy S24 Back Glass            | 3           | 2               | AFTERMARKET| TRUE                 |
```

### parts (variants)

```
| id | part_base_id | sku              | name                      | color | quality_tier | current_stock | available_stock | reserved_stock | consumed_stock |
|----|--------------|------------------|---------------------------|-------|--------------|---------------|-----------------|----------------|----------------|
| 1  | 1            | SCR-IP15-BLK-OEM | iPhone 15 Pro Screen Blk  | Black | OEM          | 8             | 6               | 1              | 1              |
| 2  | 1            | SCR-IP15-BLK-AM  | iPhone 15 Pro Screen Blk  | Black | AFTERMARKET  | 3             | 3               | 0              | 0              |
| 3  | 2            | BAT-IP15-OEM     | iPhone 15 Pro Battery OEM | NULL  | OEM          | 12            | 10              | 0              | 2              |
```

### part_lots

```
| id | part_id | supplier_id | lot_ref      | received_quantity | available_quantity | reserved_quantity | consumed_quantity | faulty_quantity | received_at         |
|----|---------|-------------|--------------|-------------------|--------------------|-------------------|-------------------|-----------------|---------------------|
| 1  | 1       | 2           | LOT-2026-001 | 10                | 7                  | 1                 | 1                 | 1               | 2026-03-01 00:00:00 |
| 2  | 1       | 2           | LOT-2026-002 | 5                 | 5                  | 0                 | 0                 | 0               | 2026-03-15 00:00:00 |
| 3  | 3       | 1           | LOT-2026-003 | 15                | 12                 | 0                 | 2                 | 1               | 2026-03-05 00:00:00 |
```

Lot 1: received 10, used 1 in repair, 1 faulty (returned to supplier), 1 reserved for upcoming repair, 7 available.

### part_compatibility

```
| id | part_base_id | model_id | notes |
|----|--------------|----------|-------|
| 1  | 1            | 1        | NULL  |  -- iPhone 15 Pro Screen fits model_id 1 (iPhone 15 Pro)
| 2  | 2            | 1        | NULL  |  -- iPhone 15 Pro Battery fits model_id 1
| 3  | 3            | 5        | NULL  |  -- Galaxy S24 Back Glass fits model_id 5 (Galaxy S24)
```

### part_transactions

```
| id | part_id | part_lot_id | movement_type | quantity | available_delta | consumed_delta | faulty_delta | reference_type | reference_id | notes                    | user_id |
|----|---------|-------------|---------------|----------|-----------------|----------------|--------------|----------------|--------------|--------------------------|---------|
| 1  | 1       | 1           | RECEIVED      | 10       | +10             | 0              | 0            | GOODS_IN       | NULL         | Initial stock receipt    | 3       |
| 2  | 1       | 1           | ALLOCATED     | 1        | -1              | 0              | 0            | REPAIR         | 1            | Reserved for repair      | 5       |
| 3  | 1       | 1           | CONSUMED      | 1        | 0               | +1             | 0            | REPAIR         | 1            | Used in repair           | 5       |
| 4  | 1       | 1           | FAULTY        | 1        | -1              | 0              | +1           | FAULT_REPORT   | 1            | Screen defect found      | 5       |
```

### part_fault_reports

```
| id | part_id | part_lot_id | supplier_id | quantity | reason                  | status     | created_by |
|----|---------|-------------|-------------|----------|-------------------------|------------|------------|
| 1  | 1       | 1           | 2           | 1        | Dead pixels on arrival  | OPEN       | 5          |
```

---

## 11. Scenario 9: Admin Operations

### Bulk Location Move

Admin moves 15 Samsung devices from TRAY-001 to TRAY-002.

**admin_operations:**

```
| id | operation_type       | description                          | reason                      | affected_count | affected_imeis                                     | performed_by |
|----|----------------------|--------------------------------------|-----------------------------|----------------|----------------------------------------------------|--------------|
| 1  | BULK_LOCATION_MOVE   | Moved 15 devices to location ID 11  | Reorganising Samsung stock  | 15             | ["354567890000001","354567890000002",...]          | 1            |
```

**device_history** — 15 rows, one per moved device:

```
| device_id | event_type       | field_changed | old_value | new_value | notes                      |
|-----------|------------------|---------------|-----------|-----------|----------------------------|
| 6         | LOCATION_CHANGE  | location_id   | 10        | 11        | Reorganising Samsung stock |
| 7         | LOCATION_CHANGE  | location_id   | 10        | 11        | Reorganising Samsung stock |
```

### Color Check

Admin runs an IMEI24 color check on a device.

**color_check_cache:**

```
| id | imei            | manufacturer | model          | color    | storage_gb | source | lookup_cost |
|----|-----------------|--------------|----------------|----------|------------|--------|-------------|
| 1  | 353288110000003 | Apple        | iPhone 15 Pro  | White    | 256        | IMEI24 | 0.03        |
```

**devices** — `oem_color` updated:

```
| id | color          | oem_color |
|----|----------------|-----------|
| 3  | White Titanium | White     |
```

---

## 12. Device Lifecycle — Full Status Flow

```
                    ┌─────────────┐
                    │  Goods In   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
      requires_qc=T   requires_qc=F  requires_qc=F
      requires_repair=T/F  requires_repair=T  requires_repair=F
              │            │            │
              ▼            ▼            ▼
        AWAITING_QC   AWAITING_REPAIR  IN_STOCK
              │            │            │
         ┌────┴────┐       │            │
         │         │       │            │
     QC Pass   QC Fail     │            │
         │         │       │            │
         ▼         ▼       │            │
     IN_STOCK  AWAITING_REPAIR          │
     (graded)      │       │            │
         │     ┌───┴───┐   │            │
         │     │       │   │            │
         │  Repair  Escalate│           │
         │  Done    to L3   │           │
         │     │       │   │            │
         │     ▼       ▼   │            │
         │  IN_STOCK  IN_LEVEL3         │
         │  (graded)    │               │
         │     │     ┌──┴──┐            │
         │     │     │     │            │
         │     │  L3 Done  L3 BER       │
         │     │     │     │            │
         │     │     ▼     ▼            │
         │     │  IN_STOCK SCRAPPED     │
         │     │     │                  │
         │     └─────┘                  │
         │                              │
         ▼                              │
    ┌─────────┐                         │
    │ SO Created│◄──────────────────────┘
    └────┬────┘
         │
    Reserve devices (reserved_for_so_id set)
         │
    Pick devices (sales_order_items created)
         │
    Ship (status → SHIPPED, devices → SHIPPED)
         │
    ┌────┴────┐
    │         │
  Happy   Returned
  Path       │
    │    status → RETURNED
    │    disposition → RESTOCK / REPAIR / SCRAP
    │         │
    │    ┌────┴────┐
    │    │         │
    │  Back to   SCRAPPED
    │  repair
    ▼
  (Done)
```

---

## 13. Stock Level Accounting (Parts)

The parts system uses a strict accounting model where all stock is always accounted for.

### Formula

**At the part_lots level (per lot):**
```
received_quantity = available_quantity + reserved_quantity + consumed_quantity + faulty_quantity + issued_quantity
```

**At the parts level (aggregated across all lots):**
```
current_stock = available_stock + reserved_stock + consumed_stock + faulty_stock + issued_stock
```

### Example

A lot of 10 iPhone 15 Pro screens is received:

```
received_quantity = 10
available_quantity = 10
reserved_quantity = 0
consumed_quantity = 0
faulty_quantity = 0
issued_quantity = 0
```

1. **Allocate 1 for repair:**
   - `available_quantity: 10 → 9`
   - `reserved_quantity: 0 → 1`
   - Part transaction: `ALLOCATED, quantity=1, available_delta=-1, reserved_delta=+1`

2. **Use in repair (consumed):**
   - `reserved_quantity: 1 → 0`
   - `consumed_quantity: 0 → 1`
   - Part transaction: `CONSUMED, quantity=1, reserved_delta=-1, consumed_delta=+1`

3. **1 unit found faulty:**
   - `available_quantity: 9 → 8`
   - `faulty_quantity: 0 → 1`
   - Part transaction: `FAULTY, quantity=1, available_delta=-1, faulty_delta=+1`

4. **Final state:**
   ```
   received: 10 = available(8) + reserved(0) + consumed(1) + faulty(1) + issued(0) ✓
   ```

---

## 14. Common Query Patterns

### Find all available stock for a specific model

```sql
SELECT d.id, d.imei, d.storage_gb, d.color, d.grade, l.code as location
FROM devices d
LEFT JOIN locations l ON d.location_id = l.id
WHERE d.status = 'IN_STOCK'
  AND d.reserved_for_so_id IS NULL
  AND d.model_id = ?
ORDER BY d.grade, d.created_at;
```

### Get device full details (used in device detail page)

```sql
SELECT d.*, m.name as manufacturer, mo.model_name, mo.model_number,
       l.code as location_code, s.name as supplier_name, po.po_number
FROM devices d
JOIN manufacturers m ON d.manufacturer_id = m.id
JOIN models mo ON d.model_id = mo.id
LEFT JOIN locations l ON d.location_id = l.id
LEFT JOIN suppliers s ON d.supplier_id = s.id
LEFT JOIN purchase_orders po ON d.purchase_order_id = po.id
WHERE d.id = ?;
```

### Parts availability for a repair record

```sql
SELECT p.id as part_id, p.sku, p.name, p.color, p.quality_tier,
       pb.base_code, pb.name as base_name,
       pl.lot_ref, pl.available_quantity, s.name as supplier_name
FROM repair_records rr
JOIN devices d ON rr.device_id = d.id
JOIN part_compatibility pc ON pc.model_id = d.model_id
JOIN part_bases pb ON pc.part_base_id = pb.id AND pb.is_active = TRUE
JOIN parts p ON p.part_base_id = pb.id AND p.is_active = TRUE
JOIN part_lots pl ON pl.part_id = p.id AND pl.available_quantity > 0
LEFT JOIN suppliers s ON pl.supplier_id = s.id
WHERE rr.id = ?
ORDER BY pb.name, p.sku, pl.received_at;
```

### Dashboard metrics (uses v_dashboard_metrics view)

```sql
SELECT * FROM v_dashboard_metrics;
-- Returns:
-- total_in_stock: 247
-- unprocessed_orders: 5
-- awaiting_qc: 12
-- awaiting_repair: 3
-- booked_in_7days: 89
-- booked_out_7days: 64
-- returns_7days: 2
```

---

## 15. Migration Mapping Reference

### Old → New Table Mapping

| Old Table / Concept | New Table(s) | Notes |
|---------------------|--------------|-------|
| `tbl_imei` | `devices` | Unified device table |
| `tbl_categories` | `manufacturers` | Cleaner naming |
| `tbl_gb` | Removed | `storage_gb` stored as INT directly |
| `tbl_grades` | Removed | `grade` stored as CHAR(1) directly |
| `tbl_trays` | `locations` | Expanded with location types |
| `tbl_tac` | `tac_lookup` | Enhanced with JSON arrays |
| `tbl_customers` | `customers` | Added `is_backmarket` flag |
| `tbl_suppliers` | `suppliers` | Same structure, cleaner naming |
| `tbl_purchases` | `purchase_orders` + `purchase_order_lines` | Split header/lines |
| `tbl_imei_sales_orders` | `sales_order_lines` | Standardised naming |
| `tbl_orders` | `sales_order_items` | Actual picked devices |
| `tbl_log` | `activity_log` | Partitioned for performance |
| `level3_repair` | `level3_repairs` | Added status tracking |

### Old → New Value Mapping

| Old Field | Old Value | New Field | New Value |
|-----------|-----------|-----------|-----------|
| `item_grade = 1` | Integer FK | `grade = 'A'` | Direct CHAR |
| `item_gb = 6` | Integer FK to tbl_gb | `storage_gb = 128` | Direct INT |
| `item_brand = 'CAT3'` | Category code | `manufacturer_id = 2` | FK to manufacturers |
| `item_imei` | Various names | `imei` | Standardised |
| `tray_id = 5` | FK to tbl_trays | `location_id = 10` | FK to locations |
| `status = 1` | Boolean | `status = 'IN_STOCK'` | ENUM |

### Data Transformation Example

```sql
-- Migrate devices from old schema
INSERT INTO devices (imei, tac_code, manufacturer_id, model_id, storage_gb,
                     color, grade, status, location_id, supplier_id, created_at)
SELECT
    old.item_imei,
    SUBSTRING(old.item_imei, 1, 8),          -- extract TAC
    m.id,                                      -- mapped manufacturer
    mo.id,                                     -- mapped model
    g.gb_value,                                -- direct storage value
    old.item_color,
    CASE old.item_grade
        WHEN 1 THEN 'A' WHEN 2 THEN 'B' WHEN 3 THEN 'C'
        WHEN 4 THEN 'D' WHEN 5 THEN 'E' WHEN 6 THEN 'F'
    END,
    CASE WHEN old.status = 1 THEN 'IN_STOCK' ELSE 'OUT_OF_STOCK' END,
    l.id,                                      -- mapped location
    s.id,                                      -- mapped supplier
    old.created_at
FROM old_db.tbl_imei old
JOIN manufacturers m ON m.code = old.item_brand
LEFT JOIN models mo ON mo.model_number = old.item_model
LEFT JOIN old_db.tbl_gb g ON g.id = old.item_gb
LEFT JOIN locations l ON l.code = old.tray_code
LEFT JOIN suppliers s ON s.supplier_code = old.supplier_ref;
```

### Column Discrepancies Between Schema File and Actual DB

The original `.info/inventory_db_schema.sql` does not include these tables/columns that exist in the actual database:

**Missing tables (exist in DB, created by application/migrations):**
- `part_bases`
- `part_lots`
- `part_transactions`
- `part_fault_reports`
- `repair_comments`
- `v_device_availability` (view)

**Missing columns on `devices`:**
- `reserved_for_so_id`

**Missing columns on `repair_jobs`:**
- `priority`
- `target_sales_order_id`
- `created_by`
- `notes`
- `updated_at`

**Missing columns on `repair_records`:**
- `outcome`
- `resolution_notes`
- `updated_at`

**Missing columns on `repair_parts_used`:**
- `part_lot_id`
- `status`
- `notes`
- `removed_at`

**Missing columns on `parts` (replaced simpler version):**
- `part_base_id`
- `quality_tier`
- `supplier_part_ref`
- `available_stock`, `reserved_stock`, `consumed_stock`, `faulty_stock`, `issued_stock`
- Removed: `min_stock_level`, `cost_price`

**Changed FKs on `part_compatibility`:**
- `part_id` → `part_base_id`
- Dropped: `storage_gb`

These discrepancies are documented in `DATABASE_SCHEMA.md` which represents the true current state.
