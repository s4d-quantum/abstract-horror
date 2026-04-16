# Quant Inventory System - Database Design Documentation

## Overview

This document describes the design of the new database schema for the Quant inventory management system. The schema is designed to:

1. **Replace clunky lookup tables** with cleaner, more direct approaches
2. **Fix naming inconsistencies** (item_imei vs item_code now standardised to `imei`)
3. **Support the full workflow** from goods-in through QC, repair, and goods-out
4. **Handle Backmarket integration** with dedicated fields and temp tables
5. **Provide performant logging** with partitioned tables
6. **Enable parts management** with compatibility tracking
7. **Support dashboard metrics** with pre-computed views

---

## Key Design Decisions

### 1. Eliminated Unnecessary Lookup Tables

**Old approach:** Used integer IDs mapped to lookup tables for grades, storage, and categories.

```sql
-- OLD: Required joins to get simple values
item_grade = 1  --> JOIN tbl_grades --> "A"
item_gb = 6     --> JOIN tbl_gb     --> "128"
item_brand = CAT3 --> JOIN tbl_categories --> "Samsung"
```

**New approach:** Store actual values directly where appropriate.

```sql
-- NEW: Direct values, no joins needed
grade = 'A'
storage_gb = 128
manufacturer_id = 3  -- Only manufacturers use FK (they have additional data)
```

### 2. Consistent Naming Convention

| Old Names | New Standard Name |
|-----------|-------------------|
| item_imei, item_code | `imei` |
| tray_id | `location_id` |
| category_id, item_brand | `manufacturer_id` |
| item_gb | `storage_gb` |

### 3. Device Status Tracking

Replaced simple 0/1 status with a comprehensive ENUM:

```sql
ENUM('IN_STOCK', 'OUT_OF_STOCK', 'AWAITING_QC', 'IN_QC', 
     'AWAITING_REPAIR', 'IN_REPAIR', 'IN_LEVEL3', 
     'SHIPPED', 'RETURNED', 'SCRAPPED')
```

This eliminates the need for multiple boolean flags and provides clearer status at a glance.

### 4. Two-Stage Purchase Order Process

The schema supports the described workflow:

1. **Stage 1 - PO Creation (Sales Staff)**
   - `purchase_orders` - Header with supplier, reference
   - `purchase_order_lines` - Expected items (generic: manufacturer, model, storage, color, qty)

2. **Stage 2 - Receiving (Warehouse Staff)**
   - `devices` - Individual devices created when scanned
   - `purchase_order_receipts` - Links devices to PO with verification flags

### 5. Sales Order Flexibility

Supports both B2B and Backmarket orders:

- `sales_orders` - Header with order_type field
- `sales_order_lines` - Grouped by properties (allows warehouse flexibility)
- `sales_order_items` - Actual picked devices
- `backmarket_shipments` - BM-specific shipping data

### 6. Partitioned Logging

The `activity_log` table uses quarterly partitioning for performance:

```sql
PARTITION BY RANGE (TO_DAYS(log_date)) (
    PARTITION p_2024_q1 VALUES LESS THAN (TO_DAYS('2024-04-01')),
    PARTITION p_2024_q2 VALUES LESS THAN (TO_DAYS('2024-07-01')),
    ...
)
```

Benefits:
- Fast queries on recent data (only relevant partitions scanned)
- Easy archival (swap old partitions to archive tables)
- Prevents table bloat

---

## Table Summary

### Core Reference Tables
| Table | Purpose |
|-------|---------|
| `manufacturers` | Device manufacturers (Apple, Samsung, etc.) |
| `models` | Device models with numbers and friendly names |
| `tac_lookup` | TAC code → manufacturer/model with possible configs |
| `locations` | Stock locations (trays, racks, repair bays) |
| `storage_options` | Valid storage values (reference only) |
| `grade_definitions` | Grade descriptions (reference only) |

### Business Entities
| Table | Purpose |
|-------|---------|
| `customers` | Customer accounts (includes BM consumer) |
| `suppliers` | Supplier accounts |
| `users` | System users with roles and PINs |

### Inventory Core
| Table | Purpose |
|-------|---------|
| `devices` | Main device inventory (one row per device) |
| `device_history` | Audit trail of all device changes |

### Purchase Orders (Goods In)
| Table | Purpose |
|-------|---------|
| `purchase_orders` | PO headers |
| `purchase_order_lines` | Expected items (stage 1) |
| `purchase_order_receipts` | Received devices (stage 2) |

### Sales Orders (Goods Out)
| Table | Purpose |
|-------|---------|
| `sales_orders` | SO headers (B2B + BM) |
| `sales_order_lines` | Requested device specs |
| `sales_order_items` | Picked devices |
| `backmarket_shipments` | BM shipping temp data |

### Returns
| Table | Purpose |
|-------|---------|
| `returns` | Return headers |
| `return_items` | Individual returned items |

### Quality Control
| Table | Purpose |
|-------|---------|
| `qc_jobs` | QC job headers (grouped by PO) |
| `qc_results` | Per-device QC results |

### Repair
| Table | Purpose |
|-------|---------|
| `repair_jobs` | Repair job headers (grouped by PO) |
| `repair_records` | Per-device repair records |
| `repair_parts_used` | Parts used in repairs |
| `level3_repairs` | Board-level repairs (separate workflow) |

### Parts Management
| Table | Purpose |
|-------|---------|
| `part_categories` | Part type categories |
| `parts` | Parts master with stock levels |
| `part_compatibility` | Part ↔ Model compatibility |

### Admin & Logging
| Table | Purpose |
|-------|---------|
| `admin_operations` | Protected operation audit log |
| `color_check_cache` | IMEI24 lookup cache |
| `activity_log` | Main activity log (partitioned) |
| `shipment_tracking` | Multi-courier tracking |
| `blackbelt_logs` | Imported Blackbelt QC logs |

---

## Database Views

Pre-computed views for common queries:

| View | Purpose |
|------|---------|
| `v_stock_summary` | Grouped stock counts for inventory display |
| `v_awaiting_qc` | Devices awaiting QC |
| `v_awaiting_repair` | Devices awaiting repair |
| `v_unprocessed_sales_orders` | Open sales orders |
| `v_recent_purchase_orders` | Latest POs |
| `v_dashboard_metrics` | Dashboard widget data |

---

## Stored Procedures

| Procedure | Purpose |
|-----------|---------|
| `sp_get_next_number` | Generate sequential numbers (PO-00001, SO-00001, etc.) |
| `sp_bulk_location_move` | Bulk move devices with audit logging |
| `sp_complete_goods_out` | Finalize goods-out with status updates |

---

## Migration Guide

### Mapping Old Tables to New

| Old Table | New Table(s) |
|-----------|--------------|
| `tbl_imei` | `devices` |
| `tbl_categories` | `manufacturers` |
| `tbl_gb` | Removed (direct values) |
| `tbl_grades` | Removed (direct values) |
| `tbl_trays` | `locations` |
| `tbl_customers` | `customers` |
| `tbl_suppliers` | `suppliers` |
| `tbl_tac` | `tac_lookup` (enhanced) |
| `tbl_purchases` | `purchase_orders` + `purchase_order_receipts` |
| `tbl_imei_sales_orders` | `sales_order_lines` |
| `tbl_orders` | `sales_order_items` |
| `tbl_log` | `activity_log` |
| `level3_repair` | `level3_repairs` |

### Data Transformation Examples

**Manufacturer Migration:**
```sql
INSERT INTO manufacturers (code, name)
SELECT DISTINCT category_id, title 
FROM old_db.tbl_categories;
```

**Device Migration:**
```sql
INSERT INTO devices (imei, tac_code, manufacturer_id, model_id, 
                     storage_gb, color, grade, status, ...)
SELECT 
    i.item_imei,
    i.item_tac,
    m.id,  -- from manufacturers table
    mo.id, -- from models table
    CAST(g.gb_value AS UNSIGNED),  -- direct value
    i.item_color,
    gr.title,  -- 'A', 'B', etc.
    CASE WHEN i.status = 1 THEN 'IN_STOCK' ELSE 'OUT_OF_STOCK' END,
    ...
FROM old_db.tbl_imei i
JOIN old_db.tbl_categories c ON i.item_tac = ... -- via tac lookup
JOIN new_db.manufacturers m ON c.category_id = m.code
JOIN old_db.tbl_gb g ON i.item_gb = g.id
JOIN old_db.tbl_grades gr ON i.item_grade = gr.grade_id
...
```

### Migration Steps

1. **Create new database and tables** from the schema file
2. **Migrate reference data** (manufacturers, locations, customers, suppliers)
3. **Build TAC lookup table** with enhanced configuration data
4. **Migrate devices** with data transformation
5. **Migrate purchase orders** and link to devices
6. **Migrate sales orders** and link to devices
7. **Migrate logs** to partitioned table
8. **Verify data integrity** with counts and spot checks
9. **Update application code** to use new schema

---

## Performance Considerations

### Indexes

The schema includes indexes for:
- Primary keys (auto)
- Foreign keys (for JOIN performance)
- Common search fields (imei, status, dates)
- Composite indexes for frequent query patterns

### Partitioning

- `activity_log` is partitioned by quarter
- Add new partitions proactively:
  ```sql
  ALTER TABLE activity_log 
  ADD PARTITION (PARTITION p_2026_q1 VALUES LESS THAN (TO_DAYS('2026-04-01')));
  ```

### Archiving

- Swap old partitions to archive tables:
  ```sql
  CREATE TABLE activity_log_2024_q1 LIKE activity_log;
  ALTER TABLE activity_log EXCHANGE PARTITION p_2024_q1 
  WITH TABLE activity_log_2024_q1;
  ```

---

## Future Considerations

1. **ELK Integration** - The `activity_log` table can be synced to Elasticsearch for advanced querying

2. **Parts Stock Transactions** - May need a `part_transactions` table for full stock movement tracking

3. **Multi-warehouse** - If expanding to multiple locations, add `warehouse_id` to relevant tables

4. **API Rate Limiting** - Consider tracking API call counts for external services (IMEI24, Backmarket, etc.)

5. **Full-text Search** - Consider adding full-text indexes if searching notes/comments becomes important

---

## Entity Relationship Summary

```
manufacturers (1) ──< (N) models
     │
     └──< (N) devices ──< (N) device_history
              │
              ├── (N) >── (1) locations
              ├── (N) >── (1) suppliers  
              ├── (N) >── (1) purchase_orders
              │                    │
              │                    └──< purchase_order_lines
              │                    └──< purchase_order_receipts
              │
              ├── (N) >── (N) sales_order_items ──> sales_orders
              │                                          │
              │                                          └── customers
              │
              ├── (N) >── (N) qc_results ──> qc_jobs
              │
              └── (N) >── (N) repair_records ──> repair_jobs
                                   │
                                   └──< repair_parts_used ──> parts
```
