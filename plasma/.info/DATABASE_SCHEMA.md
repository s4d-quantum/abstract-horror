# Plasma Inventory Management System — Database Schema

**Database:** `quantum2_db`
**Engine:** MySQL 8.0+ / MariaDB 10.6+ (InnoDB)
**Last Updated:** 2026-04-02

This document is the authoritative reference for the current database schema. It reflects the actual state of the database as used by the application code, incorporating all migrations applied since the original schema file was created.

---

## Table of Contents

1. [Core Reference Tables](#1-core-reference-tables)
2. [Business Entity Tables](#2-business-entity-tables)
3. [Inventory Core Tables](#3-inventory-core-tables)
4. [Purchase Orders (Goods In)](#4-purchase-orders-goods-in)
5. [Sales Orders (Goods Out)](#5-sales-orders-goods-out)
6. [Returns](#6-returns)
7. [Quality Control](#7-quality-control)
8. [Repair Management](#8-repair-management)
9. [Parts Management](#9-parts-management)
10. [Admin Operations & Caching](#10-admin-operations--caching)
11. [System Logging](#11-system-logging)
12. [Courier & Shipment Tracking](#12-courier--shipment-tracking)
13. [Blackbelt Integration](#13-blackbelt-integration)
14. [Database Views](#14-database-views)
15. [Stored Procedures](#15-stored-procedures)
16. [ENUM Reference Values](#16-enum-reference-values)
17. [Seed Data](#17-seed-data)
18. [Migration History](#18-migration-history)

---

## 1. Core Reference Tables

### 1.1 `manufacturers`

Device manufacturers. Replaces legacy `tbl_categories`.

```sql
CREATE TABLE manufacturers (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(20) NOT NULL UNIQUE,        -- e.g. 'APPLE', 'SAMSUNG'
    name            VARCHAR(100) NOT NULL,               -- e.g. 'Apple', 'Samsung'
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_name (name)
) COMMENT 'Device manufacturers';
```

**Relationships:**
- `1:N` → `models`
- `1:N` → `devices`
- `1:N` → `tac_lookup`
- `1:N` → `purchase_order_lines`
- `1:N` → `sales_order_lines`
- `1:N` → `part_bases`

### 1.2 `models`

Device models linked to a manufacturer. Stores both the hardware model number (e.g. A2894) and a friendly name (e.g. iPhone 15 Pro).

```sql
CREATE TABLE models (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    manufacturer_id INT UNSIGNED NOT NULL,
    model_number    VARCHAR(50) NOT NULL,                -- e.g. 'A2894', 'SM-S911B'
    model_name      VARCHAR(100),                        -- e.g. 'iPhone 15 Pro', 'Galaxy S23'
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id),
    UNIQUE KEY uk_manufacturer_model (manufacturer_id, model_number),
    INDEX idx_model_number (model_number),
    INDEX idx_model_name (model_name)
) COMMENT 'Device models';
```

**Relationships:**
- `N:1` → `manufacturers`
- `1:N` → `devices`
- `1:N` → `tac_lookup`
- `1:N` → `part_compatibility`

### 1.3 `tac_lookup`

Maps 8-digit TAC codes (first 8 digits of IMEI) to manufacturer, model, and possible configurations (storage/color combos as JSON arrays).

```sql
CREATE TABLE tac_lookup (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tac_code        CHAR(8) NOT NULL UNIQUE,
    manufacturer_id INT UNSIGNED NOT NULL,
    model_id        INT UNSIGNED NOT NULL,
    possible_storage JSON,                              -- e.g. [128, 256, 512]
    possible_colors  JSON,                              -- e.g. ["Black", "Silver", "Gold"]
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id),
    FOREIGN KEY (model_id) REFERENCES models(id),
    INDEX idx_tac (tac_code)
) COMMENT 'TAC code lookup — maps IMEI prefix to device info';
```

**Used by:** Goods-in workflow — extract TAC from scanned IMEI, look up device details.

### 1.4 `locations`

Physical stock locations: trays, racks, repair bays, QC areas, shipping zones.

```sql
CREATE TABLE locations (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(50) NOT NULL UNIQUE,         -- e.g. 'TR001', 'LEVEL3_1'
    name            VARCHAR(100),
    location_type   ENUM('TRAY', 'RACK', 'REPAIR', 'QC', 'LEVEL3', 'SHIPPING', 'RETURNS', 'OTHER')
                    DEFAULT 'TRAY',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_type (location_type)
) COMMENT 'Stock locations';
```

### 1.5 `grade_definitions`

Reference table for device cosmetic grades. The actual grade value (A–F) is stored directly in `devices.grade`.

```sql
CREATE TABLE grade_definitions (
    grade           CHAR(1) PRIMARY KEY,
    description     VARCHAR(100),
    sort_order      TINYINT UNSIGNED
) COMMENT 'Grade definitions for reference/display';
```

### 1.6 `storage_options`

Reference table for valid storage capacities (in GB).

```sql
CREATE TABLE storage_options (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    gb_value        SMALLINT UNSIGNED NOT NULL UNIQUE,
    display_label   VARCHAR(10)                          -- '8GB', '1TB', etc.
) COMMENT 'Valid storage configurations for reference/validation';
```

---

## 2. Business Entity Tables

### 2.1 `customers`

Customer accounts including B2B customers and Backmarket consumers.

```sql
CREATE TABLE customers (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_code   VARCHAR(20) NOT NULL UNIQUE,         -- e.g. 'CST-0001'
    name            VARCHAR(150) NOT NULL,
    address_line1   VARCHAR(200),
    address_line2   VARCHAR(200),
    city            VARCHAR(100),
    postcode        VARCHAR(20),
    country         VARCHAR(100) DEFAULT 'United Kingdom',
    phone           VARCHAR(50),
    email           VARCHAR(150),
    vat_number      VARCHAR(50),
    is_backmarket   BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (customer_code),
    INDEX idx_name (name),
    INDEX idx_backmarket (is_backmarket)
) COMMENT 'Customer accounts';
```

**Code format:** `CST-0001`, `CST-0002`, etc. Auto-generated by controller on create.

### 2.2 `suppliers`

Supplier accounts.

```sql
CREATE TABLE suppliers (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    supplier_code   VARCHAR(20) NOT NULL UNIQUE,         -- e.g. 'SUP-0001'
    name            VARCHAR(150) NOT NULL,
    address_line1   VARCHAR(200),
    address_line2   VARCHAR(200),
    city            VARCHAR(100),
    postcode        VARCHAR(20),
    country         VARCHAR(100) DEFAULT 'United Kingdom',
    phone           VARCHAR(50),
    email           VARCHAR(150),
    vat_number      VARCHAR(50),-generated by controller on create.

    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (supplier_code),
    INDEX idx_name (name)
) COMMENT 'Supplier accounts';
```

**Code format:** `SUP-0001`, `SUP-0002`, etc. Auto
### 2.3 `users`

System users / staff accounts.

```sql
CREATE TABLE users (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(50) NOT NULL UNIQUE,
    display_name    VARCHAR(100) NOT NULL,
    email           VARCHAR(150),
    password_hash   VARCHAR(255) NOT NULL,
    role            ENUM('ADMIN', 'SALES', 'WAREHOUSE', 'QC', 'REPAIR', 'VIEWER')
                    DEFAULT 'VIEWER',
    pin_hash        VARCHAR(255),                        -- For admin ops (PIN verification)
    is_active       BOOLEAN DEFAULT TRUE,
    last_login      TIMESTAMP NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role)
) COMMENT 'System users';
```

**Roles:** `ADMIN` (full access), `SALES` (orders), `WAREHOUSE` (goods in/out), `QC` (quality control), `REPAIR` (repair jobs), `VIEWER` (read-only).

---

## 3. Inventory Core Tables

### 3.1 `devices`

The central inventory table. One row per device instance. This is the most critical table in the system.

```sql
CREATE TABLE devices (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    imei                VARCHAR(20) NOT NULL,
    tac_code            CHAR(8) NOT NULL,                 -- First 8 digits of IMEI

    -- Device Properties
    manufacturer_id     INT UNSIGNED NOT NULL,
    model_id            INT UNSIGNED NOT NULL,
    storage_gb          SMALLINT UNSIGNED,
    color               VARCHAR(50),
    oem_color           VARCHAR(50),                      -- OEM color from color check
    grade               CHAR(1),                          -- A, B, C, D, E, F

    -- Stock Status
    status              ENUM('IN_STOCK', 'OUT_OF_STOCK', 'AWAITING_QC', 'IN_QC',
                             'AWAITING_REPAIR', 'IN_REPAIR', 'IN_LEVEL3',
                             'SHIPPED', 'RETURNED', 'SCRAPPED') DEFAULT 'AWAITING_QC',
    location_id         INT UNSIGNED,

    -- Origin Tracking
    purchase_order_id   INT UNSIGNED,
    supplier_id         INT UNSIGNED,

    -- Sales Order Reservation (added via application, not in original schema)
    reserved_for_so_id  INT UNSIGNED NULL,

    -- QC/Repair Status Flags
    qc_required         BOOLEAN DEFAULT TRUE,
    qc_completed        BOOLEAN DEFAULT FALSE,
    qc_completed_at     TIMESTAMP NULL,
    repair_required     BOOLEAN DEFAULT FALSE,
    repair_completed    BOOLEAN DEFAULT FALSE,
    repair_completed_at TIMESTAMP NULL,

    -- Timestamps
    received_at         TIMESTAMP NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign Keys
    FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id),
    FOREIGN KEY (model_id) REFERENCES models(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),

    -- Indexes
    UNIQUE KEY uk_imei_instock (imei, status),
    INDEX idx_imei (imei),
    INDEX idx_tac (tac_code),
    INDEX idx_status (status),
    INDEX idx_manufacturer (manufacturer_id),
    INDEX idx_model (model_id),
    INDEX idx_location (location_id),
    INDEX idx_supplier (supplier_id),
    INDEX idx_grade (grade),
    INDEX idx_purchase_order (purchase_order_id),
    INDEX idx_created (created_at),
    INDEX idx_instock_manufacturer (status, manufacturer_id),
    INDEX idx_instock_model (status, model_id),
    INDEX idx_awaiting_qc (status, qc_required, qc_completed),
    INDEX idx_awaiting_repair (status, repair_required, repair_completed)
) COMMENT 'Main device inventory — one row per device instance';
```

**Key notes:**
- `reserved_for_so_id` is set when a sales order is confirmed; cleared on cancel/ship.
- `uk_imei_instock` allows the same IMEI to exist in multiple statuses (e.g. returned then re-sold) but prevents duplicates within the same status.
- `tac_code` is always derived from `imei.substring(0, 8)` at insert time.

**Relationships:**
- `N:1` → `manufacturers`, `models`, `locations`, `suppliers`, `purchase_orders`
- `1:N` → `device_history`
- `1:N` → `qc_results`
- `1:N` → `repair_records`
- `1:N` → `sales_order_items`
- `1:N` → `return_items`
- `1:N` → `level3_repairs`

### 3.2 `device_history`

Immutable audit trail for all device status, location, and property changes.

```sql
CREATE TABLE device_history (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    device_id       INT UNSIGNED NOT NULL,
    imei            VARCHAR(20) NOT NULL,                -- Denormalized for query efficiency

    event_type      ENUM('RECEIVED', 'STATUS_CHANGE', 'LOCATION_CHANGE', 'QC_COMPLETE',
                         'REPAIR_COMPLETE', 'SHIPPED', 'RETURNED', 'GRADE_CHANGE',
                         'PROPERTY_UPDATE', 'OTHER') NOT NULL,

    field_changed   VARCHAR(50),
    old_value       VARCHAR(200),
    new_value       VARCHAR(200),

    reference_type  VARCHAR(50),                         -- 'PURCHASE_ORDER', 'SALES_ORDER', etc.
    reference_id    INT UNSIGNED,
    notes           TEXT,

    user_id         INT UNSIGNED,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (user_id) REFERENCES users(id),

    INDEX idx_device (device_id),
    INDEX idx_imei (imei),
    INDEX idx_event_type (event_type),
    INDEX idx_created (created_at),
    INDEX idx_reference (reference_type, reference_id)
) COMMENT 'Audit trail for all device changes';
```

---

## 4. Purchase Orders (Goods In)

Two-stage process: PO creation (what we expect) then receiving (what arrives).

### 4.1 `purchase_orders`

```sql
CREATE TABLE purchase_orders (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    po_number           VARCHAR(20) NOT NULL UNIQUE,     -- e.g. 'PO-00001'
    supplier_id         INT UNSIGNED NOT NULL,
    supplier_ref        VARCHAR(100),                    -- Supplier's reference number

    status              ENUM('DRAFT', 'CONFIRMED', 'PARTIALLY_RECEIVED',
                             'FULLY_RECEIVED', 'CANCELLED') DEFAULT 'DRAFT',

    expected_quantity   INT UNSIGNED DEFAULT 0,
    received_quantity   INT UNSIGNED DEFAULT 0,

    -- Stock Processing Flags (added via migration_add_po_flags.sql)
    requires_qc         BOOLEAN DEFAULT TRUE,
    requires_repair     BOOLEAN DEFAULT FALSE,

    notes               TEXT,

    created_by          INT UNSIGNED NOT NULL,
    confirmed_at        TIMESTAMP NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),

    INDEX idx_po_number (po_number),
    INDEX idx_supplier (supplier_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) COMMENT 'Purchase order headers';
```

**Status flow:** `DRAFT` → `CONFIRMED` → `PARTIALLY_RECEIVED` / `FULLY_RECEIVED` / `CANCELLED`

**Processing flags logic:**
- `requires_qc = TRUE` → devices enter `AWAITING_QC` status on receipt
- `requires_qc = FALSE, requires_repair = TRUE` → devices enter `AWAITING_REPAIR` status
- `requires_qc = FALSE, requires_repair = FALSE` → devices enter `IN_STOCK` directly
- When both flags are TRUE, QC runs first; repair job is created after QC completes.

**Number format:** `PO-00001` (5-digit zero-padded, sequential).

### 4.2 `purchase_order_lines`

Expected items on a PO. Set during PO creation (stage 1).

```sql
CREATE TABLE purchase_order_lines (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id   INT UNSIGNED NOT NULL,

    manufacturer_id     INT UNSIGNED NOT NULL,
    model_id            INT UNSIGNED NOT NULL,
    storage_gb          SMALLINT UNSIGNED,
    color               VARCHAR(50),

    expected_quantity   INT UNSIGNED NOT NULL DEFAULT 1,
    received_quantity   INT UNSIGNED DEFAULT 0,

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id),
    FOREIGN KEY (model_id) REFERENCES models(id),

    INDEX idx_po (purchase_order_id),
    INDEX idx_model (model_id)
) COMMENT 'Purchase order line items — expected devices';
```

### 4.3 `purchase_order_receipts`

Actual devices received against a PO (stage 2). Links to individual device records.

```sql
CREATE TABLE purchase_order_receipts (
    id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id       INT UNSIGNED NOT NULL,
    purchase_order_line_id  INT UNSIGNED,                 -- Optional link to expected line
    device_id               INT UNSIGNED NOT NULL,

    tac_verified            BOOLEAN DEFAULT FALSE,
    manually_verified       BOOLEAN DEFAULT FALSE,

    received_by             INT UNSIGNED NOT NULL,
    received_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (purchase_order_line_id) REFERENCES purchase_order_lines(id),
    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (received_by) REFERENCES users(id),

    UNIQUE KEY uk_device (device_id),
    INDEX idx_po (purchase_order_id),
    INDEX idx_received (received_at)
) COMMENT 'Actual devices received against purchase orders';
```

**Note:** This table exists in the schema but is not used in the current `createWithDevices` flow. The `devices.purchase_order_id` field serves as the primary link. This table may be used for verification workflows in the future.

---

## 5. Sales Orders (Goods Out)

Handles both B2B orders and Backmarket B2C orders.

### 5.1 `sales_orders`

```sql
CREATE TABLE sales_orders (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    so_number           VARCHAR(20) NOT NULL UNIQUE,     -- e.g. 'SO-00001'
    customer_id         INT UNSIGNED NOT NULL,

    order_type          ENUM('B2B', 'BACKMARKET') DEFAULT 'B2B',
    backmarket_order_id VARCHAR(50),
    customer_ref        VARCHAR(100),                    -- Customer's reference/name
    po_ref              VARCHAR(100),                    -- Customer's PO reference

    status              ENUM('DRAFT', 'CONFIRMED', 'PROCESSING', 'PARTIALLY_SHIPPED',
                             'SHIPPED', 'DELIVERED', 'CANCELLED') DEFAULT 'DRAFT',

    courier             VARCHAR(50),
    tracking_number     VARCHAR(100),
    total_boxes         SMALLINT UNSIGNED DEFAULT 0,
    total_pallets       SMALLINT UNSIGNED DEFAULT 0,

    notes               TEXT,

    created_by          INT UNSIGNED NOT NULL,
    confirmed_at        TIMESTAMP NULL,
    shipped_at          TIMESTAMP NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),

    INDEX idx_so_number (so_number),
    INDEX idx_customer (customer_id),
    INDEX idx_status (status),
    INDEX idx_order_type (order_type),
    INDEX idx_backmarket (backmarket_order_id),
    INDEX idx_created (created_at)
) COMMENT 'Sales order headers — B2B and Backmarket';
```

**Status flow:** `DRAFT` → `CONFIRMED` → `PROCESSING` → `PARTIALLY_SHIPPED` / `SHIPPED` → `DELIVERED` / `CANCELLED`

**Number format:** `SO-00001` (5-digit zero-padded, sequential).

### 5.2 `sales_order_lines`

Requested device specifications. Groups devices by properties for flexible picking.

```sql
CREATE TABLE sales_order_lines (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sales_order_id      INT UNSIGNED NOT NULL,

    manufacturer_id     INT UNSIGNED NOT NULL,
    model_id            INT UNSIGNED NOT NULL,
    storage_gb          SMALLINT UNSIGNED,                -- Nullable: any storage
    color               VARCHAR(50),                      -- Nullable: any color
    grade               CHAR(1),                          -- Nullable: any grade
    supplier_id         INT UNSIGNED,                     -- Optional supplier filter
    location_id         INT UNSIGNED,                     -- Optional location filter

    requested_quantity  INT UNSIGNED NOT NULL DEFAULT 1,
    picked_quantity     INT UNSIGNED DEFAULT 0,

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id),
    FOREIGN KEY (model_id) REFERENCES models(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),

    INDEX idx_so (sales_order_id),
    INDEX idx_model (model_id)
) COMMENT 'Sales order line items — requested device specs';
```

### 5.3 `sales_order_items`

Actual devices picked for a sales order. One row per device.

```sql
CREATE TABLE sales_order_items (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sales_order_id      INT UNSIGNED NOT NULL,
    sales_order_line_id INT UNSIGNED,                    -- Link to line item
    device_id           INT UNSIGNED NOT NULL,

    scanned_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified            BOOLEAN DEFAULT FALSE,

    shipped             BOOLEAN DEFAULT FALSE,
    shipped_at          TIMESTAMP NULL,

    picked_by           INT UNSIGNED NOT NULL,

    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
    FOREIGN KEY (sales_order_line_id) REFERENCES sales_order_lines(id),
    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (picked_by) REFERENCES users(id),

    UNIQUE KEY uk_device (device_id, sales_order_id),
    INDEX idx_so (sales_order_id),
    INDEX idx_device (device_id),
    INDEX idx_shipped (shipped)
) COMMENT 'Actual devices picked for sales orders';
```

**Note:** Devices remain `IN_STOCK` until the order is shipped. Reservation is tracked via `devices.reserved_for_so_id`.

### 5.4 `backmarket_shipments`

Backmarket-specific shipment processing and DPD booking data. Added via `migration_backmarket_shipments.sql`.

```sql
CREATE TABLE backmarket_shipments (
    id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sales_order_id          INT UNSIGNED NULL,            -- Nullable: BM orders can exist independently
    backmarket_order_id     VARCHAR(50) NOT NULL,

    customer_name           VARCHAR(200),
    address_raw             TEXT,                          -- Raw from BM API
    address_cleaned         TEXT,                          -- After Ideal Postcodes cleanup

    dpd_consignment         VARCHAR(50),
    dpd_shipment_id         VARCHAR(50),                  -- MyShipments UUID for label retrieval
    tracking_number         VARCHAR(100),
    label_zpl               MEDIUMTEXT,                   -- ZPL label data
    dispatch_note_url       VARCHAR(500),

    shipment_booked         BOOLEAN DEFAULT FALSE,
    backmarket_updated      BOOLEAN DEFAULT FALSE,

    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),

    INDEX idx_so (sales_order_id),
    INDEX idx_bm_order (backmarket_order_id),
    INDEX idx_dpd_shipment (dpd_shipment_id)
) COMMENT 'BackMarket shipment processing and DPD booking data';
```

---

## 6. Returns

### 6.1 `returns`

```sql
CREATE TABLE returns (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    return_number       VARCHAR(20) NOT NULL UNIQUE,     -- e.g. 'RET-00001'

    return_type         ENUM('CUSTOMER_RETURN', 'SUPPLIER_RETURN') NOT NULL,

    sales_order_id      INT UNSIGNED,                    -- For customer returns
    purchase_order_id   INT UNSIGNED,                    -- For supplier returns

    customer_id         INT UNSIGNED,
    supplier_id         INT UNSIGNED,

    reason              VARCHAR(200),
    notes               TEXT,

    status              ENUM('PENDING', 'RECEIVED', 'INSPECTED', 'PROCESSED', 'CLOSED')
                        DEFAULT 'PENDING',

    created_by          INT UNSIGNED NOT NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),

    INDEX idx_return_number (return_number),
    INDEX idx_type (return_type),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) COMMENT 'Return headers';
```

### 6.2 `return_items`

```sql
CREATE TABLE return_items (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    return_id           INT UNSIGNED NOT NULL,
    device_id           INT UNSIGNED NOT NULL,

    condition_on_return VARCHAR(100),
    inspection_notes    TEXT,

    disposition         ENUM('RESTOCK', 'REPAIR', 'SCRAP', 'PENDING') DEFAULT 'PENDING',

    processed_at        TIMESTAMP NULL,
    processed_by        INT UNSIGNED,

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (processed_by) REFERENCES users(id),

    INDEX idx_return (return_id),
    INDEX idx_device (device_id)
) COMMENT 'Individual items in a return';
```

---

## 7. Quality Control

### 7.1 `qc_jobs`

QC jobs are auto-created when devices are received against a PO with `requires_qc = TRUE`.

```sql
CREATE TABLE qc_jobs (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    job_number          VARCHAR(20) NOT NULL UNIQUE,     -- e.g. 'QC-00001'
    purchase_order_id   INT UNSIGNED NOT NULL,

    status              ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',

    total_devices       INT UNSIGNED DEFAULT 0,
    completed_devices   INT UNSIGNED DEFAULT 0,
    passed_devices      INT UNSIGNED DEFAULT 0,
    failed_devices      INT UNSIGNED DEFAULT 0,

    assigned_to         INT UNSIGNED,
    created_by          INT UNSIGNED,
    started_at          TIMESTAMP NULL,
    completed_at        TIMESTAMP NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_job_number (job_number),
    INDEX idx_po (purchase_order_id),
    INDEX idx_status (status)
) COMMENT 'QC job headers grouped by purchase order';
```

**Number format:** `QC-00001` (5-digit zero-padded, sequential). Uses `GET_LOCK` for atomic generation.

### 7.2 `qc_results`

One row per device in a QC job. Results start as NULL and are filled in during testing.

```sql
CREATE TABLE qc_results (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    qc_job_id           INT UNSIGNED NOT NULL,
    device_id           INT UNSIGNED NOT NULL,

    functional_result   ENUM('PASS', 'FAIL', 'UNABLE', 'NA'),
    cosmetic_result     ENUM('PASS', 'FAIL', 'NA'),
    overall_pass        BOOLEAN,

    grade_assigned      CHAR(1),
    color_verified      VARCHAR(50),
    comments            TEXT,

    -- Blackbelt Integration
    blackbelt_ref       VARCHAR(100),
    blackbelt_passed    BOOLEAN,
    non_uk              BOOLEAN NOT NULL DEFAULT FALSE,

    tested_by           INT UNSIGNED,
    tested_at           TIMESTAMP NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (qc_job_id) REFERENCES qc_jobs(id),
    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (tested_by) REFERENCES users(id),

    UNIQUE KEY uk_device_job (qc_job_id, device_id),
    INDEX idx_job (qc_job_id),
    INDEX idx_device (device_id),
    INDEX idx_pass (overall_pass),
    INDEX idx_functional_result (functional_result),
    INDEX idx_non_uk (non_uk)
) COMMENT 'QC test results per device';
```

**Overall pass logic:** `overall_pass = TRUE` when `functional_result = 'PASS'`, `FALSE` when `functional_result = 'FAIL'`, `NULL` otherwise.

---

## 8. Repair Management

### 8.1 `repair_jobs`

Repair jobs can be auto-created from goods-in (when `requires_repair = TRUE`) or manually created.

```sql
CREATE TABLE repair_jobs (
    id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    job_number              VARCHAR(20) NOT NULL UNIQUE,  -- e.g. 'REP-00001'
    purchase_order_id       INT UNSIGNED NOT NULL,

    status                  ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
    priority                ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') DEFAULT 'NORMAL',

    total_devices           INT UNSIGNED DEFAULT 0,
    completed_devices       INT UNSIGNED DEFAULT 0,

    notes                   TEXT,
    target_sales_order_id   INT UNSIGNED NULL,            -- Link to target SO if known

    created_by              INT UNSIGNED NULL,
    assigned_to             INT UNSIGNED NULL,
    started_at              TIMESTAMP NULL,
    completed_at            TIMESTAMP NULL,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (target_sales_order_id) REFERENCES sales_orders(id),

    INDEX idx_job_number (job_number),
    INDEX idx_po (purchase_order_id),
    INDEX idx_status (status)
) COMMENT 'Repair job headers grouped by purchase order';
```

**Number format:** `REP-00001` (5-digit zero-padded, sequential). Uses `GET_LOCK` for atomic generation.

**Priority ordering:** `URGENT` → `HIGH` → `NORMAL` → `LOW`

### 8.2 `repair_records`

One row per device in a repair job.

```sql
CREATE TABLE repair_records (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repair_job_id       INT UNSIGNED NOT NULL,
    device_id           INT UNSIGNED NOT NULL,

    status              ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ESCALATED_L3', 'BER')
                        DEFAULT 'PENDING',

    fault_description   TEXT,
    engineer_comments   TEXT,
    outcome             VARCHAR(100) NULL,                -- e.g. 'Repaired', 'BER', 'No Fault Found'
    resolution_notes    TEXT NULL,

    repaired_by         INT UNSIGNED,
    started_at          TIMESTAMP NULL,
    completed_at        TIMESTAMP NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (repair_job_id) REFERENCES repair_jobs(id),
    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (repaired_by) REFERENCES users(id),

    UNIQUE KEY uk_device_job (repair_job_id, device_id),
    INDEX idx_job (repair_job_id),
    INDEX idx_device (device_id),
    INDEX idx_status (status)
) COMMENT 'Repair records per device';
```

**Status values:** `PENDING` → `IN_PROGRESS` → `COMPLETED` / `ESCALATED_L3` / `BER` (Beyond Economical Repair)

### 8.3 `repair_comments`

Comments / notes on individual repair records. Supports multiple comments per record.

```sql
CREATE TABLE repair_comments (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repair_record_id    INT UNSIGNED NOT NULL,
    comment_text        TEXT NOT NULL,
    created_by          INT UNSIGNED NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (repair_record_id) REFERENCES repair_records(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),

    INDEX idx_record (repair_record_id)
) COMMENT 'Comments on repair records';
```

### 8.4 `repair_parts_used`

Parts allocated to a repair record.

```sql
CREATE TABLE repair_parts_used (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repair_record_id    INT UNSIGNED NOT NULL,
    part_id             INT UNSIGNED NOT NULL,
    part_lot_id         INT UNSIGNED NULL,                -- Which lot the part came from
    quantity            SMALLINT UNSIGNED DEFAULT 1,
    status              ENUM('ALLOCATED', 'USED', 'RETURNED', 'FAULTY') DEFAULT 'ALLOCATED',
    notes               VARCHAR(200) NULL,

    added_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    added_by            INT UNSIGNED NULL,
    removed_at          TIMESTAMP NULL,

    FOREIGN KEY (repair_record_id) REFERENCES repair_records(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES parts(id),
    FOREIGN KEY (part_lot_id) REFERENCES part_lots(id),
    FOREIGN KEY (added_by) REFERENCES users(id),

    INDEX idx_repair (repair_record_id),
    INDEX idx_part (part_id)
) COMMENT 'Parts used in device repairs';
```

### 8.5 `level3_repairs`

Board-level repairs — separate workflow from standard repairs. Devices are booked into a physical repair bay.

```sql
CREATE TABLE level3_repairs (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    device_id           INT UNSIGNED NOT NULL,

    location_code       VARCHAR(50) NOT NULL,             -- e.g. 'LEVEL3_1', 'LEVEL3_2'

    fault_description   TEXT NOT NULL,
    engineer_comments   TEXT,

    status              ENUM('BOOKED_IN', 'IN_PROGRESS', 'AWAITING_PARTS', 'ON_HOLD',
                             'COMPLETED', 'BER', 'UNREPAIRABLE') DEFAULT 'BOOKED_IN',

    booked_in_by        INT UNSIGNED NOT NULL,
    assigned_to         INT UNSIGNED,

    booked_in_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at        TIMESTAMP NULL,

    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (booked_in_by) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),

    INDEX idx_device (device_id),
    INDEX idx_location (location_code),
    INDEX idx_status (status)
) COMMENT 'Level 3 board-level repairs';
```

**Status flow:** `BOOKED_IN` → `IN_PROGRESS` → `AWAITING_PARTS` / `ON_HOLD` → `COMPLETED` / `BER` / `UNREPAIRABLE`

---

## 9. Parts Management

The parts module uses a three-tier hierarchy: `part_categories` → `part_bases` → `parts` (variants) with `part_lots` for lot-level tracking.

### 9.1 `part_categories`

```sql
CREATE TABLE part_categories (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) COMMENT 'Part type categories';
```

### 9.2 `part_bases`

Intermediate table representing a "type" of part. A base can have multiple variants (e.g. different colors, quality tiers). Added after original schema to support the parts hierarchy.

```sql
CREATE TABLE part_bases (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    base_code           VARCHAR(50) NOT NULL UNIQUE,      -- e.g. 'SCR-IP15-BLK'
    name                VARCHAR(200) NOT NULL,
    category_id         INT UNSIGNED NOT NULL,
    manufacturer_id     INT UNSIGNED NULL,                -- Optional: manufacturer-specific part
    subtype             VARCHAR(100) NULL,                 -- e.g. 'OEM', 'Aftermarket', 'Refurbished'
    changes_device_color BOOLEAN DEFAULT FALSE,           -- Does this part change the device's color?
    notes               TEXT NULL,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id) REFERENCES part_categories(id),
    FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id),

    INDEX idx_code (base_code),
    INDEX idx_category (category_id)
) COMMENT 'Part base types — group variants by type';
```

### 9.3 `parts`

Part variants. Each variant has its own SKU, color, quality tier, and stock levels. Replaces the simpler `parts` table from the original schema.

```sql
CREATE TABLE parts (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    part_base_id        INT UNSIGNED NULL,                -- Link to part_bases
    sku                 VARCHAR(50) NOT NULL UNIQUE,
    name                VARCHAR(200) NOT NULL,
    category_id         INT UNSIGNED NOT NULL,

    color               VARCHAR(50),
    quality_tier        ENUM('OEM', 'AFTERMARKET', 'REFURBISHED', 'PULLED', 'OTHER') DEFAULT 'OTHER',
    supplier_part_ref   VARCHAR(100) NULL,                -- Supplier's part reference

    -- Stock Levels (all enforced non-negative via CHECK constraints)
    current_stock       INT DEFAULT 0,
    available_stock     INT DEFAULT 0,
    reserved_stock      INT DEFAULT 0,
    consumed_stock      INT DEFAULT 0,
    faulty_stock        INT DEFAULT 0,
    issued_stock        INT DEFAULT 0,

    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (part_base_id) REFERENCES part_bases(id),
    FOREIGN KEY (category_id) REFERENCES part_categories(id),

    -- CHECK constraints (MySQL 8.0.16+)
    CONSTRAINT chk_part_current_stock   CHECK (current_stock >= 0),
    CONSTRAINT chk_part_available_stock CHECK (available_stock >= 0),
    CONSTRAINT chk_part_reserved_stock  CHECK (reserved_stock >= 0),
    CONSTRAINT chk_part_consumed_stock  CHECK (consumed_stock >= 0),
    CONSTRAINT chk_part_faulty_stock    CHECK (faulty_stock >= 0),
    CONSTRAINT chk_part_issued_stock    CHECK (issued_stock >= 0),

    INDEX idx_sku (sku),
    INDEX idx_name (name),
    INDEX idx_category (category_id),
    INDEX idx_base (part_base_id)
) COMMENT 'Parts inventory — variants with stock levels';
```

**Stock level relationship:** `current_stock = available_stock + reserved_stock + consumed_stock + faulty_stock + issued_stock`

### 9.4 `part_lots`

Lot-level tracking for parts inventory. Each lot records when stock was received, from which supplier, and tracks quantities through the lifecycle.

```sql
CREATE TABLE part_lots (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    part_id             INT UNSIGNED NOT NULL,
    supplier_id         INT UNSIGNED NULL,
    supplier_ref        VARCHAR(100) NULL,
    lot_ref             VARCHAR(100) NULL,                -- PO or batch reference

    received_quantity   INT UNSIGNED NOT NULL DEFAULT 0,
    available_quantity  INT UNSIGNED NOT NULL DEFAULT 0,
    reserved_quantity   INT UNSIGNED NOT NULL DEFAULT 0,
    consumed_quantity   INT UNSIGNED NOT NULL DEFAULT 0,
    faulty_quantity     INT UNSIGNED NOT NULL DEFAULT 0,
    issued_quantity     INT UNSIGNED NOT NULL DEFAULT 0,

    received_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes               TEXT NULL,
    created_by          INT UNSIGNED NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (part_id) REFERENCES parts(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),

    -- CHECK constraints (MySQL 8.0.16+)
    CONSTRAINT chk_lot_available_qty  CHECK (available_quantity >= 0),
    CONSTRAINT chk_lot_reserved_qty   CHECK (reserved_quantity >= 0),
    CONSTRAINT chk_lot_consumed_qty   CHECK (consumed_quantity >= 0),
    CONSTRAINT chk_lot_faulty_qty     CHECK (faulty_quantity >= 0),
    CONSTRAINT chk_lot_issued_qty     CHECK (issued_quantity >= 0),

    INDEX idx_part (part_id),
    INDEX idx_supplier (supplier_id),
    INDEX idx_lot_ref (lot_ref)
) COMMENT 'Part lot tracking — stock received in batches';
```

**Stock level relationship:** `received_quantity = available_quantity + reserved_quantity + consumed_quantity + faulty_quantity + issued_quantity`

### 9.5 `part_compatibility`

Defines which part bases are compatible with which device models.

```sql
CREATE TABLE part_compatibility (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    part_base_id        INT UNSIGNED NOT NULL,
    model_id            INT UNSIGNED NOT NULL,
    notes               VARCHAR(200),

    FOREIGN KEY (part_base_id) REFERENCES part_bases(id) ON DELETE CASCADE,
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE,

    UNIQUE KEY uk_part_model (part_base_id, model_id),
    INDEX idx_model (model_id)
) COMMENT 'Part ↔ Device model compatibility';
```

**Note:** Migrated from `part_id` to `part_base_id` via `migration_parts_cleanup.sql`. Also dropped `storage_gb` column in the same migration.

### 9.6 `part_transactions`

Audit trail for all part stock movements.

```sql
CREATE TABLE part_transactions (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    part_id             INT UNSIGNED NOT NULL,
    part_lot_id         INT UNSIGNED NULL,

    movement_type       ENUM('RECEIVED', 'ALLOCATED', 'CONSUMED', 'RETURNED',
                             'FAULTY', 'ISSUED', 'ADJUSTMENT') NOT NULL,
    quantity            INT NOT NULL,

    available_delta     INT DEFAULT 0,
    reserved_delta      INT DEFAULT 0,
    consumed_delta      INT DEFAULT 0,
    faulty_delta        INT DEFAULT 0,
    issued_delta        INT DEFAULT 0,

    reference_type      VARCHAR(50),                     -- 'REPAIR', 'GOODS_IN', 'FAULT_REPORT', etc.
    reference_id        INT UNSIGNED,

    notes               TEXT NULL,
    user_id             INT UNSIGNED NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (part_id) REFERENCES parts(id),
    FOREIGN KEY (part_lot_id) REFERENCES part_lots(id),
    FOREIGN KEY (user_id) REFERENCES users(id),

    INDEX idx_part (part_id),
    INDEX idx_lot (part_lot_id),
    INDEX idx_movement (movement_type),
    INDEX idx_created (created_at)
) COMMENT 'Part stock movement audit trail';
```

### 9.7 `part_fault_reports`

Tracks faulty parts for supplier returns or warranty claims.

```sql
CREATE TABLE part_fault_reports (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    part_id             INT UNSIGNED NOT NULL,
    part_lot_id         INT UNSIGNED NULL,
    supplier_id         INT UNSIGNED NULL,
    repair_record_id    INT UNSIGNED NULL,

    quantity            INT UNSIGNED NOT NULL DEFAULT 1,
    reason              VARCHAR(200) NOT NULL,
    status              ENUM('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED') DEFAULT 'OPEN',
    notes               TEXT NULL,

    created_by          INT UNSIGNED NULL,
    updated_by          INT UNSIGNED NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (part_id) REFERENCES parts(id),
    FOREIGN KEY (part_lot_id) REFERENCES part_lots(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id),

    INDEX idx_part (part_id),
    INDEX idx_status (status),
    INDEX idx_supplier (supplier_id)
) COMMENT 'Faulty part tracking for supplier returns';
```

---

## 10. Admin Operations & Caching

### 10.1 `admin_operations`

Log of protected admin operations (bulk moves, data corrections, etc.).

```sql
CREATE TABLE admin_operations (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    operation_type      ENUM('BULK_LOCATION_MOVE', 'COLOR_CHECK', 'MANUAL_STATUS_CHANGE',
                             'DATA_CORRECTION', 'OTHER') NOT NULL,

    description         TEXT NOT NULL,
    reason              TEXT,

    affected_count      INT UNSIGNED DEFAULT 0,
    affected_imeis      JSON,

    performed_by        INT UNSIGNED NOT NULL,
    performed_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (performed_by) REFERENCES users(id),

    INDEX idx_type (operation_type),
    INDEX idx_user (performed_by),
    INDEX idx_performed (performed_at)
) COMMENT 'Log of protected admin operations';
```

### 10.2 `color_check_cache`

Cache for IMEI24 external API lookups. Avoids repeated API calls for the same IMEI.

```sql
CREATE TABLE color_check_cache (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    imei                VARCHAR(20) NOT NULL,

    manufacturer        VARCHAR(100),
    model               VARCHAR(100),
    color               VARCHAR(50),
    storage_gb          SMALLINT UNSIGNED,

    raw_response        JSON,

    source              ENUM('IMEI24', 'LOCAL', 'MANUAL') DEFAULT 'IMEI24',
    lookup_cost         DECIMAL(5, 2) DEFAULT 0,

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_imei (imei),
    INDEX idx_imei (imei)
) COMMENT 'Cache for IMEI24 color/spec lookups';
```

---

## 11. System Logging

### 11.1 `activity_log`

Partitioned by quarter for performance. Each partition covers one quarter.

```sql
CREATE TABLE activity_log (
    id                  BIGINT UNSIGNED AUTO_INCREMENT,
    log_date            DATE NOT NULL,
    log_time            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    action              VARCHAR(100) NOT NULL,            -- e.g. 'DEVICE_RECEIVED', 'ORDER_CREATED'
    entity_type         VARCHAR(50),                      -- e.g. 'DEVICE', 'SALES_ORDER'
    entity_id           INT UNSIGNED,

    imei                VARCHAR(20),

    details             JSON,

    user_id             INT UNSIGNED,
    ip_address          VARCHAR(45),
    session_id          VARCHAR(100),

    PRIMARY KEY (id, log_date),
    INDEX idx_date (log_date),
    INDEX idx_action (action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_imei (imei),
    INDEX idx_user (user_id),
    INDEX idx_time (log_time)
) PARTITION BY RANGE (TO_DAYS(log_date)) (
    PARTITION p_2024_q1 VALUES LESS THAN (TO_DAYS('2024-04-01')),
    PARTITION p_2024_q2 VALUES LESS THAN (TO_DAYS('2024-07-01')),
    PARTITION p_2024_q3 VALUES LESS THAN (TO_DAYS('2024-10-01')),
    PARTITION p_2024_q4 VALUES LESS THAN (TO_DAYS('2025-01-01')),
    PARTITION p_2025_q1 VALUES LESS THAN (TO_DAYS('2025-04-01')),
    PARTITION p_2025_q2 VALUES LESS THAN (TO_DAYS('2025-07-01')),
    PARTITION p_2025_q3 VALUES LESS THAN (TO_DAYS('2025-10-01')),
    PARTITION p_2025_q4 VALUES LESS THAN (TO_DAYS('2026-01-01')),
    PARTITION p_2026_q1 VALUES LESS THAN (TO_DAYS('2026-04-01')),
    PARTITION p_future  VALUES LESS THAN MAXVALUE
);
```

**Partition maintenance:** Add new partitions quarterly before they're needed:
```sql
ALTER TABLE activity_log ADD PARTITION (PARTITION p_2026_q2 VALUES LESS THAN (TO_DAYS('2026-07-01')));
```

**Archiving:** Swap old partitions to archive tables:
```sql
ALTER TABLE activity_log EXCHANGE PARTITION p_2024_q1 WITH TABLE activity_log_archive;
```

---

## 12. Courier & Shipment Tracking

### 12.1 `shipment_tracking`

Multi-courier tracking support.

```sql
CREATE TABLE shipment_tracking (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sales_order_id      INT UNSIGNED NOT NULL,

    courier             ENUM('DPD', 'UPS', 'DHL', 'FEDEX', 'OTHER') NOT NULL,
    tracking_number     VARCHAR(100) NOT NULL,

    current_status      VARCHAR(100),
    status_description  TEXT,

    tracking_events     JSON,

    estimated_delivery  DATE,
    actual_delivery     TIMESTAMP NULL,
    is_delivered        BOOLEAN DEFAULT FALSE,

    last_checked        TIMESTAMP NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),

    INDEX idx_so (sales_order_id),
    INDEX idx_tracking (tracking_number),
    INDEX idx_courier (courier),
    INDEX idx_delivered (is_delivered)
) COMMENT 'Shipment tracking across multiple couriers';
```

---

## 13. Blackbelt Integration

### 13.1 `blackbelt_logs`

Ingested QC test logs from the Blackbelt application.

```sql
CREATE TABLE blackbelt_logs (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    imei                VARCHAR(20) NOT NULL,
    serial_number       VARCHAR(50),

    test_date           TIMESTAMP NOT NULL,
    test_type           VARCHAR(100),
    overall_result      ENUM('PASS', 'FAIL', 'INCOMPLETE'),

    test_details        JSON,

    manufacturer        VARCHAR(100),
    model               VARCHAR(100),
    os_version          VARCHAR(50),
    storage_gb          SMALLINT UNSIGNED,

    raw_log             MEDIUMTEXT,

    processed           BOOLEAN DEFAULT FALSE,
    linked_device_id    INT UNSIGNED,

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_imei (imei),
    INDEX idx_test_date (test_date),
    INDEX idx_result (overall_result),
    INDEX idx_processed (processed)
) COMMENT 'Ingested logs from Blackbelt QC application';
```

---

## 14. Database Views

### 14.1 `v_stock_summary`

Grouped stock counts for inventory display.

```sql
CREATE OR REPLACE VIEW v_stock_summary AS
SELECT
    m.name AS manufacturer,
    mo.model_name,
    d.storage_gb,
    d.color,
    d.grade,
    COUNT(*) AS quantity,
    l.code AS location
FROM devices d
JOIN manufacturers m ON d.manufacturer_id = m.id
JOIN models mo ON d.model_id = mo.id
LEFT JOIN locations l ON d.location_id = l.id
WHERE d.status = 'IN_STOCK'
GROUP BY m.id, mo.id, d.storage_gb, d.color, d.grade, l.id;
```

### 14.2 `v_awaiting_qc`

Devices currently awaiting or in QC.

```sql
CREATE OR REPLACE VIEW v_awaiting_qc AS
SELECT
    d.id, d.imei,
    m.name AS manufacturer,
    mo.model_name,
    po.po_number,
    s.name AS supplier,
    l.code AS location,
    d.created_at
FROM devices d
JOIN manufacturers m ON d.manufacturer_id = m.id
JOIN models mo ON d.model_id = mo.id
LEFT JOIN purchase_orders po ON d.purchase_order_id = po.id
LEFT JOIN suppliers s ON d.supplier_id = s.id
LEFT JOIN locations l ON d.location_id = l.id
WHERE d.status IN ('AWAITING_QC', 'IN_QC')
  AND d.qc_completed = FALSE;
```

### 14.3 `v_awaiting_repair`

Devices currently awaiting or in repair.

```sql
CREATE OR REPLACE VIEW v_awaiting_repair AS
SELECT
    d.id, d.imei,
    m.name AS manufacturer,
    mo.model_name,
    po.po_number,
    s.name AS supplier,
    l.code AS location,
    d.created_at
FROM devices d
JOIN manufacturers m ON d.manufacturer_id = m.id
JOIN models mo ON d.model_id = mo.id
LEFT JOIN purchase_orders po ON d.purchase_order_id = po.id
LEFT JOIN suppliers s ON d.supplier_id = s.id
LEFT JOIN locations l ON d.location_id = l.id
WHERE d.status IN ('AWAITING_REPAIR', 'IN_REPAIR')
  AND d.repair_completed = FALSE;
```

### 14.4 `v_unprocessed_sales_orders`

Open sales orders that still need processing.

```sql
CREATE OR REPLACE VIEW v_unprocessed_sales_orders AS
SELECT
    so.id, so.so_number, so.order_type, so.backmarket_order_id,
    c.name AS customer_name,
    so.customer_ref,
    u.display_name AS created_by,
    so.created_at,
    COUNT(sol.id) AS line_count
FROM sales_orders so
JOIN customers c ON so.customer_id = c.id
JOIN users u ON so.created_by = u.id
LEFT JOIN sales_order_lines sol ON so.id = sol.sales_order_id
WHERE so.status IN ('DRAFT', 'CONFIRMED', 'PROCESSING')
GROUP BY so.id;
```

### 14.5 `v_recent_purchase_orders`

```sql
CREATE OR REPLACE VIEW v_recent_purchase_orders AS
SELECT
    po.id, po.po_number,
    s.name AS supplier_name,
    po.supplier_ref, po.status,
    po.expected_quantity, po.received_quantity,
    u.display_name AS created_by,
    po.created_at
FROM purchase_orders po
JOIN suppliers s ON po.supplier_id = s.id
JOIN users u ON po.created_by = u.id
ORDER BY po.created_at DESC;
```

### 14.6 `v_dashboard_metrics`

Aggregated metrics for the dashboard widget.

```sql
CREATE OR REPLACE VIEW v_dashboard_metrics AS
SELECT
    (SELECT COUNT(*) FROM devices WHERE status = 'IN_STOCK') AS total_in_stock,
    (SELECT COUNT(*) FROM sales_orders WHERE status IN ('DRAFT', 'CONFIRMED', 'PROCESSING')) AS unprocessed_orders,
    (SELECT COUNT(*) FROM devices WHERE status IN ('AWAITING_QC', 'IN_QC')) AS awaiting_qc,
    (SELECT COUNT(*) FROM devices WHERE status IN ('AWAITING_REPAIR', 'IN_REPAIR')) AS awaiting_repair,
    (SELECT COUNT(*) FROM devices WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS booked_in_7days,
    (SELECT COUNT(*) FROM sales_order_items soi
     JOIN sales_orders so ON soi.sales_order_id = so.id
     WHERE soi.shipped = TRUE AND soi.shipped_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS booked_out_7days,
    (SELECT COUNT(*) FROM returns WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS returns_7days;
```

### 14.7 `v_device_availability`

Referenced by `salesOrderModel.checkAvailability()`. This view must be created in the database.

```sql
-- Note: This view is referenced in the code but the exact definition should be
-- created based on the stock availability query pattern used in salesOrderModel.
-- The view groups IN_STOCK devices by their properties and location,
-- calculating available (unreserved) vs total counts.
```

---

## 15. Stored Procedures

### 15.1 `sp_get_next_number`

Generates the next sequential number for various entity types.

### 15.2 `sp_bulk_location_move`

Bulk moves devices to a new location with full audit logging.

### 15.3 `sp_complete_goods_out`

Finalizes goods-out: marks items as shipped, updates device statuses, logs activity.

**Note:** The application primarily uses application-level sequential number generation with `GET_LOCK` for atomicity rather than these stored procedures.

---

## 16. ENUM Reference Values

### Device Status
```
IN_STOCK, OUT_OF_STOCK, AWAITING_QC, IN_QC, AWAITING_REPAIR, IN_REPAIR,
IN_LEVEL3, SHIPPED, RETURNED, SCRAPPED
```

### Purchase Order Status
```
DRAFT, CONFIRMED, PARTIALLY_RECEIVED, FULLY_RECEIVED, CANCELLED
```

### Sales Order Status
```
DRAFT, CONFIRMED, PROCESSING, PARTIALLY_SHIPPED, SHIPPED, DELIVERED, CANCELLED
```

### Sales Order Type
```
B2B, BACKMARKET
```

### User Roles
```
ADMIN, SALES, WAREHOUSE, QC, REPAIR, VIEWER
```

### QC Functional Result
```
PASS, FAIL, UNABLE, NA
```

### QC Cosmetic Result
```
PASS, FAIL, NA
```

### Repair Record Status
```
PENDING, IN_PROGRESS, COMPLETED, ESCALATED_L3, BER
```

### Level 3 Repair Status
```
BOOKED_IN, IN_PROGRESS, AWAITING_PARTS, ON_HOLD, COMPLETED, BER, UNREPAIRABLE
```

### Device History Event Type
```
RECEIVED, STATUS_CHANGE, LOCATION_CHANGE, QC_COMPLETE, REPAIR_COMPLETE,
SHIPPED, RETURNED, GRADE_CHANGE, PROPERTY_UPDATE, OTHER
```

### Part Quality Tier
```
OEM, AFTERMARKET, REFURBISHED, PULLED, OTHER
```

### Part Transaction Movement Type
```
RECEIVED, ALLOCATED, CONSUMED, RETURNED, FAULTY, ISSUED, ADJUSTMENT
```

### Part Fault Report Status
```
OPEN, INVESTIGATING, RESOLVED, CLOSED
```

### Repair Parts Used Status
```
ALLOCATED, USED, RETURNED, FAULTY
```

### Return Type
```
CUSTOMER_RETURN, SUPPLIER_RETURN
```

### Return Status
```
PENDING, RECEIVED, INSPECTED, PROCESSED, CLOSED
```

### Return Item Disposition
```
RESTOCK, REPAIR, SCRAP, PENDING
```

### Location Type
```
TRAY, RACK, REPAIR, QC, LEVEL3, SHIPPING, RETURNS, OTHER
```

### Admin Operation Type
```
BULK_LOCATION_MOVE, COLOR_CHECK, MANUAL_STATUS_CHANGE, DATA_CORRECTION, OTHER
```

### Courier
```
DPD, UPS, DHL, FEDEX, OTHER
```

### Blackbelt Result
```
PASS, FAIL, INCOMPLETE
```

---

## 17. Seed Data

### Default Users
| username | display_name | role | password | pin |
|----------|-------------|------|----------|-----|
| admin | System Administrator | ADMIN | admin123 | 1234 |

### Manufacturers (15)
`Apple`, `Samsung`, `Google`, `Huawei`, `Xiaomi`, `OnePlus`, `Motorola`, `Sony`, `LG`, `Nokia`, `Oppo`, `Vivo`, `Realme`, `Honor`, `Other`

### Locations (9)
| code | name | type |
|------|------|------|
| GOODS_IN | Goods In Area | OTHER |
| QC_AREA | QC Testing Area | QC |
| REPAIR_AREA | Repair Workshop | REPAIR |
| LEVEL3_1 | Level 3 Repair Bay 1 | LEVEL3 |
| LEVEL3_2 | Level 3 Repair Bay 2 | LEVEL3 |
| LEVEL3_COMPLETE | Level 3 Complete | LEVEL3 |
| LEVEL3_FAILS | Level 3 Failures | LEVEL3 |
| SHIPPING | Shipping Area | SHIPPING |
| RETURNS | Returns Processing | RETURNS |

### Grade Definitions (6)
| grade | description | sort_order |
|-------|-------------|------------|
| A | Excellent — Like new condition | 1 |
| B | Good — Minor cosmetic wear | 2 |
| C | Fair — Visible wear but fully functional | 3 |
| D | Poor — Significant wear | 4 |
| E | Very Poor — Heavy damage | 5 |
| F | Faulty/For parts | 6 |

### Storage Options (8)
`8GB`, `16GB`, `32GB`, `64GB`, `128GB`, `256GB`, `512GB`, `1TB`

### Customers
| customer_code | name | is_backmarket |
|---------------|------|---------------|
| CST-BM | Backmarket Consumer | TRUE |

### Part Categories (11)
`Back Glass`, `Battery`, `Button`, `Camera`, `Charging Port`, `Frame`, `Logic Board`, `Other`, `Screen`, `Service Pack`, `Speaker`

---

## 18. Migration History

| Migration | Date | Description |
|-----------|------|-------------|
| `migration_add_po_flags.sql` | 2025-12-04 | Added `requires_qc` and `requires_repair` to `purchase_orders` |
| `migration_backmarket_shipments.sql` | — | Made `backmarket_shipments.sales_order_id` nullable, added `dpd_shipment_id` |
| `migration_repair_integrity.sql` | 2026-03-13 | Added unique index on `repair_jobs.job_number`, CHECK constraints on `part_lots` and `parts` stock columns |
| `migration_parts_cleanup.sql` | 2026-03-23 | Dropped `storage_gb` from `part_compatibility`, `min_stock_level` from `parts`, `unit_cost` from `part_lots` |

---

## Entity Relationship Diagram (Text)

```
manufacturers ──1:N──> models
    │                       │
    │                       └──1:N──> part_compatibility <──N:1── part_bases
    │                                      │                   │
    └──1:N──> devices ◄────────────────────┘                   │
                │                                    1:N │      │
                ├──1:N──> device_history                  parts ◄─┘
                ├──N:1──> locations                    │
                ├──N:1──> suppliers                    ├──1:N──> part_lots
                ├──N:1──> purchase_orders              │
                │       ├──1:N──> purchase_order_lines │
                │       └──1:N──> purchase_order_receipts
                │
                ├──1:N──> qc_results ──N:1──> qc_jobs
                │
                ├──1:N──> repair_records ──N:1──> repair_jobs
                │       ├──1:N──> repair_comments
                │       └──1:N──> repair_parts_used ──> parts, part_lots
                │
                ├──1:N──> sales_order_items ──N:1──> sales_orders ──N:1──> customers
                │                                        └──1:N──> sales_order_lines
                │
                ├──1:N──> return_items ──N:1──> returns
                │
                ├──1:N──> level3_repairs
                │
                └── reserved_for_so_id ──> sales_orders (reservation)

tac_lookup ──N:1──> manufacturers, models

admin_operations ──N:1──> users
color_check_cache (standalone, keyed by IMEI)
activity_log (partitioned, denormalized)
shipment_tracking ──N:1──> sales_orders
backmarket_shipments ──N:1──> sales_orders (nullable)
blackbelt_logs (standalone, ingested data)
part_transactions ──N:1──> parts, part_lots, users
part_fault_reports ──N:1──> parts, part_lots, suppliers
```
