-- =============================================================================
-- QUANT INVENTORY MANAGEMENT SYSTEM - DATABASE SCHEMA v2.0
-- =============================================================================
-- A clean, normalized database design for mobile device inventory management
-- Addresses legacy issues: clunky lookups, inconsistent naming, bloated logs
-- =============================================================================

-- Use InnoDB for foreign key support and transactions
SET default_storage_engine = InnoDB;

-- -----------------------------------------------------------------------------
-- SECTION 1: CORE REFERENCE TABLES
-- These replace the old lookup tables (tbl_categories, tbl_gb, tbl_grades, etc.)
-- Using direct values where appropriate and proper relational design
-- -----------------------------------------------------------------------------

-- Manufacturers (replaces tbl_categories with cleaner design)
CREATE TABLE manufacturers (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(20) NOT NULL UNIQUE,           -- e.g., 'APPLE', 'SAMSUNG'
    name            VARCHAR(100) NOT NULL,                  -- e.g., 'Apple', 'Samsung'
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_name (name)
) COMMENT 'Device manufacturers - replaces tbl_categories';

-- Models (device models, linked to manufacturer)
CREATE TABLE models (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    manufacturer_id INT UNSIGNED NOT NULL,
    model_number    VARCHAR(50) NOT NULL,                   -- e.g., 'A2894', 'SM-S911B'
    model_name      VARCHAR(100),                            -- e.g., 'iPhone 15 Pro', 'Galaxy S23'
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id),
    UNIQUE KEY uk_manufacturer_model (manufacturer_id, model_number),
    INDEX idx_model_number (model_number),
    INDEX idx_model_name (model_name)
) COMMENT 'Device models with both model number and friendly name';

-- TAC Lookup (enhanced TAC database - first 8 digits of IMEI)
CREATE TABLE tac_lookup (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tac_code        CHAR(8) NOT NULL UNIQUE,                -- First 8 digits of IMEI
    manufacturer_id INT UNSIGNED NOT NULL,
    model_id        INT UNSIGNED NOT NULL,
    -- Enhanced TAC data: possible configurations
    possible_storage JSON,                                   -- e.g., [128, 256, 512]
    possible_colors  JSON,                                   -- e.g., ["Black", "Silver", "Gold"]
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id),
    FOREIGN KEY (model_id) REFERENCES models(id),
    INDEX idx_tac (tac_code)
) COMMENT 'TAC code lookup - maps IMEI prefix to device info with possible configurations';

-- Stock Locations (replaces tbl_trays - simplified)
CREATE TABLE locations (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(50) NOT NULL UNIQUE,            -- e.g., 'TR001', 'RACK_A1', 'REPAIR_1'
    name            VARCHAR(100),                            -- Optional friendly name
    location_type   ENUM('TRAY', 'RACK', 'REPAIR', 'QC', 'LEVEL3', 'SHIPPING', 'RETURNS', 'OTHER') 
                    DEFAULT 'TRAY',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_type (location_type)
) COMMENT 'Stock locations - trays, racks, repair bays, etc.';

-- Grades (using ENUM in devices table, but keeping reference for display)
-- Note: Grade values stored directly as CHAR(1) in device records
CREATE TABLE grade_definitions (
    grade           CHAR(1) PRIMARY KEY,                     -- A, B, C, D, E, F
    description     VARCHAR(100),
    sort_order      TINYINT UNSIGNED
) COMMENT 'Grade definitions for reference/display purposes';

INSERT INTO grade_definitions (grade, description, sort_order) VALUES
('A', 'Excellent - Like new condition', 1),
('B', 'Good - Minor cosmetic wear', 2),
('C', 'Fair - Visible wear but fully functional', 3),
('D', 'Poor - Significant wear', 4),
('E', 'Very Poor - Heavy damage', 5),
('F', 'Faulty/For parts', 6);

-- Standard Storage Values (reference only - actual values stored directly)
CREATE TABLE storage_options (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    gb_value        SMALLINT UNSIGNED NOT NULL UNIQUE,      -- 8, 16, 32, 64, 128, 256, 512, 1024
    display_label   VARCHAR(10)                              -- '8GB', '1TB', etc.
) COMMENT 'Valid storage configurations for reference/validation';

INSERT INTO storage_options (gb_value, display_label) VALUES
(8, '8GB'), (16, '16GB'), (32, '32GB'), (64, '64GB'),
(128, '128GB'), (256, '256GB'), (512, '512GB'), (1024, '1TB');


-- -----------------------------------------------------------------------------
-- SECTION 2: BUSINESS ENTITY TABLES
-- Customers, Suppliers, Users
-- -----------------------------------------------------------------------------

-- Customers (cleaned up from tbl_customers)
CREATE TABLE customers (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_code   VARCHAR(20) NOT NULL UNIQUE,            -- e.g., 'CST-001'
    name            VARCHAR(150) NOT NULL,
    address_line1   VARCHAR(200),
    address_line2   VARCHAR(200),
    city            VARCHAR(100),
    postcode        VARCHAR(20),
    country         VARCHAR(100) DEFAULT 'United Kingdom',
    phone           VARCHAR(50),
    email           VARCHAR(150),
    vat_number      VARCHAR(50),
    is_backmarket   BOOLEAN DEFAULT FALSE,                  -- Flag for BM consumer account
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (customer_code),
    INDEX idx_name (name),
    INDEX idx_backmarket (is_backmarket)
) COMMENT 'Customer accounts including B2B and Backmarket consumer';

-- Suppliers (cleaned up from tbl_suppliers)
CREATE TABLE suppliers (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    supplier_code   VARCHAR(20) NOT NULL UNIQUE,            -- e.g., 'SUP-001'
    name            VARCHAR(150) NOT NULL,
    address_line1   VARCHAR(200),
    address_line2   VARCHAR(200),
    city            VARCHAR(100),
    postcode        VARCHAR(20),
    country         VARCHAR(100) DEFAULT 'United Kingdom',
    phone           VARCHAR(50),
    email           VARCHAR(150),
    vat_number      VARCHAR(50),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (supplier_code),
    INDEX idx_name (name)
) COMMENT 'Supplier accounts';

-- Users (system users/staff)
CREATE TABLE users (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(50) NOT NULL UNIQUE,
    display_name    VARCHAR(100) NOT NULL,
    email           VARCHAR(150),
    password_hash   VARCHAR(255) NOT NULL,
    role            ENUM('ADMIN', 'SALES', 'WAREHOUSE', 'QC', 'REPAIR', 'VIEWER') 
                    DEFAULT 'VIEWER',
    pin_hash        VARCHAR(255),                            -- For admin ops
    is_active       BOOLEAN DEFAULT TRUE,
    last_login      TIMESTAMP NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role)
) COMMENT 'System users';


-- -----------------------------------------------------------------------------
-- SECTION 3: INVENTORY CORE TABLES
-- Main device inventory and status tracking
-- -----------------------------------------------------------------------------

-- Device Status Enum Values:
-- IN_STOCK, OUT_OF_STOCK, AWAITING_QC, IN_QC, AWAITING_REPAIR, IN_REPAIR, 
-- IN_LEVEL3, SHIPPED, RETURNED, SCRAPPED

-- Main Device Inventory (replaces tbl_imei - the core inventory table)
CREATE TABLE devices (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    imei            VARCHAR(20) NOT NULL,                    -- Device IMEI (unique identifier)
    tac_code        CHAR(8) NOT NULL,                        -- First 8 digits of IMEI
    
    -- Device Properties
    manufacturer_id INT UNSIGNED NOT NULL,
    model_id        INT UNSIGNED NOT NULL,
    storage_gb      SMALLINT UNSIGNED,                       -- Direct value: 64, 128, 256, etc.
    color           VARCHAR(50),                              -- Display color name
    oem_color       VARCHAR(50),                              -- Original manufacturer color code
    grade           CHAR(1),                                  -- A, B, C, D, E, F
    
    -- Stock Status
    status          ENUM('IN_STOCK', 'OUT_OF_STOCK', 'AWAITING_QC', 'IN_QC', 
                         'AWAITING_REPAIR', 'IN_REPAIR', 'IN_LEVEL3', 
                         'SHIPPED', 'RETURNED', 'SCRAPPED') DEFAULT 'AWAITING_QC',
    location_id     INT UNSIGNED,                            -- Current physical location
    
    -- Origin Tracking
    purchase_order_id INT UNSIGNED,                          -- Which PO brought this in
    supplier_id     INT UNSIGNED,                            -- Original supplier
    
    -- QC/Repair Status
    qc_required     BOOLEAN DEFAULT TRUE,
    qc_completed    BOOLEAN DEFAULT FALSE,
    qc_completed_at TIMESTAMP NULL,
    repair_required BOOLEAN DEFAULT FALSE,
    repair_completed BOOLEAN DEFAULT FALSE,
    repair_completed_at TIMESTAMP NULL,
    
    -- Timestamps
    received_at     TIMESTAMP NULL,                          -- When physically received
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id),
    FOREIGN KEY (model_id) REFERENCES models(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    
    -- Indexes
    UNIQUE KEY uk_imei_instock (imei, status),              -- Prevent duplicate in-stock IMEIs
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
    
    -- Composite indexes for common queries
    INDEX idx_instock_manufacturer (status, manufacturer_id),
    INDEX idx_instock_model (status, model_id),
    INDEX idx_awaiting_qc (status, qc_required, qc_completed),
    INDEX idx_awaiting_repair (status, repair_required, repair_completed)
) COMMENT 'Main device inventory - one row per device instance';

-- Device History (tracks all status/location changes for a device)
CREATE TABLE device_history (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    device_id       INT UNSIGNED NOT NULL,
    imei            VARCHAR(20) NOT NULL,                    -- Denormalized for query efficiency
    
    event_type      ENUM('RECEIVED', 'STATUS_CHANGE', 'LOCATION_CHANGE', 'QC_COMPLETE',
                         'REPAIR_COMPLETE', 'SHIPPED', 'RETURNED', 'GRADE_CHANGE',
                         'PROPERTY_UPDATE', 'OTHER') NOT NULL,
    
    -- What changed
    field_changed   VARCHAR(50),
    old_value       VARCHAR(200),
    new_value       VARCHAR(200),
    
    -- Context
    reference_type  VARCHAR(50),                             -- 'PURCHASE_ORDER', 'SALES_ORDER', etc.
    reference_id    INT UNSIGNED,
    notes           TEXT,
    
    -- Who/When
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


-- -----------------------------------------------------------------------------
-- SECTION 4: PURCHASE ORDERS (GOODS IN)
-- Two-stage process: PO creation then receiving
-- -----------------------------------------------------------------------------

-- Purchase Order Header
CREATE TABLE purchase_orders (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    po_number       VARCHAR(20) NOT NULL UNIQUE,             -- e.g., 'PO-0001'
    supplier_id     INT UNSIGNED NOT NULL,
    supplier_ref    VARCHAR(100),                            -- Supplier's reference number
    
    status          ENUM('DRAFT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 
                         'FULLY_RECEIVED', 'CANCELLED') DEFAULT 'DRAFT',
    
    expected_quantity INT UNSIGNED DEFAULT 0,
    received_quantity INT UNSIGNED DEFAULT 0,

    -- Stock Processing Flags (for book-as-arrive workflow)
    requires_qc     BOOLEAN DEFAULT TRUE,                        -- Does stock require QC?
    requires_repair BOOLEAN DEFAULT FALSE,                       -- Does stock require repair?

    notes           TEXT,

    -- Who/When
    created_by      INT UNSIGNED NOT NULL,
    confirmed_at    TIMESTAMP NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    INDEX idx_po_number (po_number),
    INDEX idx_supplier (supplier_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) COMMENT 'Purchase order headers';

-- Purchase Order Lines (expected items - stage 1)
CREATE TABLE purchase_order_lines (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id INT UNSIGNED NOT NULL,
    
    manufacturer_id INT UNSIGNED NOT NULL,
    model_id        INT UNSIGNED NOT NULL,
    storage_gb      SMALLINT UNSIGNED,
    color           VARCHAR(50),
    
    expected_quantity INT UNSIGNED NOT NULL DEFAULT 1,
    received_quantity INT UNSIGNED DEFAULT 0,
    
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id),
    FOREIGN KEY (model_id) REFERENCES models(id),
    
    INDEX idx_po (purchase_order_id),
    INDEX idx_model (model_id)
) COMMENT 'Purchase order line items - expected devices';

-- Purchase Order Receipts (actual received items - stage 2)
-- Links to devices table once scanned in
CREATE TABLE purchase_order_receipts (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id INT UNSIGNED NOT NULL,
    purchase_order_line_id INT UNSIGNED,                     -- Optional link to expected line
    device_id       INT UNSIGNED NOT NULL,                   -- Link to actual device
    
    -- Verification flags
    tac_verified    BOOLEAN DEFAULT FALSE,
    manually_verified BOOLEAN DEFAULT FALSE,
    
    received_by     INT UNSIGNED NOT NULL,
    received_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (purchase_order_line_id) REFERENCES purchase_order_lines(id),
    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (received_by) REFERENCES users(id),
    
    UNIQUE KEY uk_device (device_id),                        -- Each device received once
    INDEX idx_po (purchase_order_id),
    INDEX idx_received (received_at)
) COMMENT 'Actual devices received against purchase orders';


-- -----------------------------------------------------------------------------
-- SECTION 5: SALES ORDERS (GOODS OUT)
-- Handles both B2B and Backmarket orders
-- -----------------------------------------------------------------------------

-- Sales Order Header
CREATE TABLE sales_orders (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    so_number       VARCHAR(20) NOT NULL UNIQUE,             -- e.g., 'SO-0001'
    customer_id     INT UNSIGNED NOT NULL,
    
    -- Order Type & External References
    order_type      ENUM('B2B', 'BACKMARKET') DEFAULT 'B2B',
    backmarket_order_id VARCHAR(50),                         -- BM order ID if applicable
    customer_ref    VARCHAR(100),                            -- Customer's reference/name
    po_ref          VARCHAR(100),                            -- Customer's PO reference
    
    status          ENUM('DRAFT', 'CONFIRMED', 'PROCESSING', 'PARTIALLY_SHIPPED',
                         'SHIPPED', 'DELIVERED', 'CANCELLED') DEFAULT 'DRAFT',
    
    -- Shipping Info
    courier         VARCHAR(50),
    tracking_number VARCHAR(100),
    total_boxes     SMALLINT UNSIGNED DEFAULT 0,
    total_pallets   SMALLINT UNSIGNED DEFAULT 0,
    
    notes           TEXT,
    
    -- Who/When
    created_by      INT UNSIGNED NOT NULL,
    confirmed_at    TIMESTAMP NULL,
    shipped_at      TIMESTAMP NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    INDEX idx_so_number (so_number),
    INDEX idx_customer (customer_id),
    INDEX idx_status (status),
    INDEX idx_order_type (order_type),
    INDEX idx_backmarket (backmarket_order_id),
    INDEX idx_created (created_at)
) COMMENT 'Sales order headers - B2B and Backmarket';

-- Sales Order Lines (requested items)
-- Groups devices by properties for selection
CREATE TABLE sales_order_lines (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sales_order_id  INT UNSIGNED NOT NULL,
    
    manufacturer_id INT UNSIGNED NOT NULL,
    model_id        INT UNSIGNED NOT NULL,
    storage_gb      SMALLINT UNSIGNED,
    color           VARCHAR(50),
    grade           CHAR(1),
    supplier_id     INT UNSIGNED,                            -- Requested supplier (optional)
    location_id     INT UNSIGNED,                            -- Requested location (optional)
    
    requested_quantity INT UNSIGNED NOT NULL DEFAULT 1,
    picked_quantity INT UNSIGNED DEFAULT 0,
    
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id),
    FOREIGN KEY (model_id) REFERENCES models(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    
    INDEX idx_so (sales_order_id),
    INDEX idx_model (model_id)
) COMMENT 'Sales order line items - requested device specs';

-- Sales Order Items (actual picked devices)
CREATE TABLE sales_order_items (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sales_order_id  INT UNSIGNED NOT NULL,
    sales_order_line_id INT UNSIGNED,                        -- Link to line item
    device_id       INT UNSIGNED NOT NULL,
    
    -- Verification
    scanned_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified        BOOLEAN DEFAULT FALSE,
    
    -- Shipping Status
    shipped         BOOLEAN DEFAULT FALSE,
    shipped_at      TIMESTAMP NULL,
    
    picked_by       INT UNSIGNED NOT NULL,
    
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
    FOREIGN KEY (sales_order_line_id) REFERENCES sales_order_lines(id),
    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (picked_by) REFERENCES users(id),
    
    UNIQUE KEY uk_device (device_id, sales_order_id),
    INDEX idx_so (sales_order_id),
    INDEX idx_device (device_id),
    INDEX idx_shipped (shipped)
) COMMENT 'Actual devices picked for sales orders';

-- Backmarket Shipping Temp Data
CREATE TABLE backmarket_shipments (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sales_order_id  INT UNSIGNED NULL,                       -- Nullable: BM orders can exist independently
    backmarket_order_id VARCHAR(50) NOT NULL,
    
    -- Customer Data from BM API
    customer_name   VARCHAR(200),
    address_raw     TEXT,                                    -- Raw from BM
    address_cleaned TEXT,                                    -- After Ideal Postcodes cleanup
    
    -- Shipping Data
    dpd_consignment VARCHAR(50),
    dpd_shipment_id VARCHAR(50),                             -- MyShipments UUID for label retrieval
    tracking_number VARCHAR(100),
    label_zpl       MEDIUMTEXT,                              -- ZPL label data
    dispatch_note_url VARCHAR(500),
    
    -- Status
    shipment_booked BOOLEAN DEFAULT FALSE,
    backmarket_updated BOOLEAN DEFAULT FALSE,
    
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
    
    INDEX idx_so (sales_order_id),
    INDEX idx_bm_order (backmarket_order_id),
    INDEX idx_dpd_shipment (dpd_shipment_id)
) COMMENT 'BackMarket shipment processing and DPD booking data';


-- -----------------------------------------------------------------------------
-- SECTION 6: RETURNS
-- Handling of returned devices
-- -----------------------------------------------------------------------------

CREATE TABLE returns (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    return_number   VARCHAR(20) NOT NULL UNIQUE,             -- e.g., 'RET-0001'
    
    return_type     ENUM('CUSTOMER_RETURN', 'SUPPLIER_RETURN') NOT NULL,
    
    -- Reference to original order
    sales_order_id  INT UNSIGNED,                            -- For customer returns
    purchase_order_id INT UNSIGNED,                          -- For supplier returns
    
    customer_id     INT UNSIGNED,
    supplier_id     INT UNSIGNED,
    
    reason          VARCHAR(200),
    notes           TEXT,
    
    status          ENUM('PENDING', 'RECEIVED', 'INSPECTED', 'PROCESSED', 'CLOSED') 
                    DEFAULT 'PENDING',
    
    created_by      INT UNSIGNED NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
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

CREATE TABLE return_items (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    return_id       INT UNSIGNED NOT NULL,
    device_id       INT UNSIGNED NOT NULL,
    
    condition_on_return VARCHAR(100),
    inspection_notes TEXT,
    
    disposition     ENUM('RESTOCK', 'REPAIR', 'SCRAP', 'PENDING') DEFAULT 'PENDING',
    
    processed_at    TIMESTAMP NULL,
    processed_by    INT UNSIGNED,
    
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (processed_by) REFERENCES users(id),
    
    INDEX idx_return (return_id),
    INDEX idx_device (device_id)
) COMMENT 'Individual items in a return';


-- -----------------------------------------------------------------------------
-- SECTION 7: QUALITY CONTROL
-- QC job tracking and results
-- -----------------------------------------------------------------------------

-- QC Jobs (grouped by purchase order)
CREATE TABLE qc_jobs (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    job_number      VARCHAR(20) NOT NULL UNIQUE,             -- e.g., 'QC-0001'
    purchase_order_id INT UNSIGNED NOT NULL,
    
    status          ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
    
    total_devices   INT UNSIGNED DEFAULT 0,
    completed_devices INT UNSIGNED DEFAULT 0,
    passed_devices  INT UNSIGNED DEFAULT 0,
    failed_devices  INT UNSIGNED DEFAULT 0,

    assigned_to     INT UNSIGNED,
    created_by      INT UNSIGNED,
    started_at      TIMESTAMP NULL,
    completed_at    TIMESTAMP NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_job_number (job_number),
    INDEX idx_po (purchase_order_id),
    INDEX idx_status (status)
) COMMENT 'QC job headers grouped by purchase order';

-- QC Results (per device)
CREATE TABLE qc_results (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    qc_job_id       INT UNSIGNED NOT NULL,
    device_id       INT UNSIGNED NOT NULL,

    -- Test Results
    functional_result ENUM('PASS', 'FAIL', 'UNABLE', 'NA'),
    cosmetic_result ENUM('PASS', 'FAIL', 'NA'),
    overall_pass    BOOLEAN,

    -- Grade Assignment
    grade_assigned  CHAR(1),
    
    -- Color verification/correction
    color_verified  VARCHAR(50),
    
    -- Comments
    comments        TEXT,
    
    -- Blackbelt Integration
    blackbelt_ref   VARCHAR(100),                            -- Reference to Blackbelt log entry
    blackbelt_passed BOOLEAN,
    non_uk          BOOLEAN NOT NULL DEFAULT FALSE,

    tested_by       INT UNSIGNED,
    tested_at       TIMESTAMP NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
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


-- -----------------------------------------------------------------------------
-- SECTION 8: REPAIR MANAGEMENT
-- Standard repairs and Level 3 board repairs
-- -----------------------------------------------------------------------------

-- Repair Jobs (grouped by purchase order, similar to QC)
CREATE TABLE repair_jobs (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    job_number      VARCHAR(20) NOT NULL UNIQUE,             -- e.g., 'REP-0001'
    purchase_order_id INT UNSIGNED NOT NULL,
    
    status          ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
    
    total_devices   INT UNSIGNED DEFAULT 0,
    completed_devices INT UNSIGNED DEFAULT 0,
    
    assigned_to     INT UNSIGNED,
    started_at      TIMESTAMP NULL,
    completed_at    TIMESTAMP NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    
    INDEX idx_job_number (job_number),
    INDEX idx_po (purchase_order_id),
    INDEX idx_status (status)
) COMMENT 'Repair job headers grouped by purchase order';

-- Repair Records (per device)
CREATE TABLE repair_records (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repair_job_id   INT UNSIGNED NOT NULL,
    device_id       INT UNSIGNED NOT NULL,
    
    status          ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ESCALATED_L3', 'BER') 
                    DEFAULT 'PENDING',
    
    fault_description TEXT,
    engineer_comments TEXT,
    
    repaired_by     INT UNSIGNED,
    started_at      TIMESTAMP NULL,
    completed_at    TIMESTAMP NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (repair_job_id) REFERENCES repair_jobs(id),
    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (repaired_by) REFERENCES users(id),
    
    UNIQUE KEY uk_device_job (repair_job_id, device_id),
    INDEX idx_job (repair_job_id),
    INDEX idx_device (device_id),
    INDEX idx_status (status)
) COMMENT 'Repair records per device';

-- Parts used in repairs
CREATE TABLE repair_parts_used (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repair_record_id INT UNSIGNED NOT NULL,
    part_id         INT UNSIGNED NOT NULL,
    quantity        SMALLINT UNSIGNED DEFAULT 1,
    
    added_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    added_by        INT UNSIGNED,
    
    FOREIGN KEY (repair_record_id) REFERENCES repair_records(id) ON DELETE CASCADE,
    -- part_id references parts.id (defined below)
    FOREIGN KEY (added_by) REFERENCES users(id),
    
    INDEX idx_repair (repair_record_id),
    INDEX idx_part (part_id)
) COMMENT 'Parts used in device repairs';

-- Level 3 Repairs (board-level repairs - separate workflow)
CREATE TABLE level3_repairs (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    device_id       INT UNSIGNED NOT NULL,
    
    location_code   VARCHAR(50) NOT NULL,                    -- e.g., 'LEVEL3_1', 'LEVEL3_2'
    
    fault_description TEXT NOT NULL,
    engineer_comments TEXT,
    
    status          ENUM('BOOKED_IN', 'IN_PROGRESS', 'AWAITING_PARTS', 'ON_HOLD',
                         'COMPLETED', 'BER', 'UNREPAIRABLE') DEFAULT 'BOOKED_IN',
    
    booked_in_by    INT UNSIGNED NOT NULL,
    assigned_to     INT UNSIGNED,
    
    booked_in_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at    TIMESTAMP NULL,
    
    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (booked_in_by) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    
    INDEX idx_device (device_id),
    INDEX idx_location (location_code),
    INDEX idx_status (status)
) COMMENT 'Level 3 board-level repairs';


-- -----------------------------------------------------------------------------
-- SECTION 9: PARTS MANAGEMENT
-- Foundation for parts inventory and compatibility
-- -----------------------------------------------------------------------------

-- Part Categories
CREATE TABLE part_categories (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,            -- e.g., 'Screen', 'Battery', 'Back Glass'
    description     TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) COMMENT 'Part type categories';

-- Parts Master
CREATE TABLE parts (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sku             VARCHAR(50) NOT NULL UNIQUE,             -- Internal part code
    name            VARCHAR(200) NOT NULL,
    category_id     INT UNSIGNED NOT NULL,
    
    color           VARCHAR(50),                              -- If color-specific part
    
    current_stock   INT DEFAULT 0,
    min_stock_level INT DEFAULT 0,
    
    cost_price      DECIMAL(10, 2),
    
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES part_categories(id),
    
    INDEX idx_sku (sku),
    INDEX idx_name (name),
    INDEX idx_category (category_id)
) COMMENT 'Parts inventory master';

-- Part Compatibility (which parts work with which models)
CREATE TABLE part_compatibility (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    part_id         INT UNSIGNED NOT NULL,
    model_id        INT UNSIGNED NOT NULL,
    
    notes           VARCHAR(200),
    
    FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE,
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE,
    
    UNIQUE KEY uk_part_model (part_id, model_id),
    INDEX idx_model (model_id)
) COMMENT 'Defines which parts are compatible with which device models';

-- Add FK for repair_parts_used now that parts table exists
ALTER TABLE repair_parts_used 
ADD CONSTRAINT fk_repair_parts_part FOREIGN KEY (part_id) REFERENCES parts(id);


-- -----------------------------------------------------------------------------
-- SECTION 10: ADMIN OPERATIONS
-- Protected operations and audit logging
-- -----------------------------------------------------------------------------

-- Admin Operation Log
CREATE TABLE admin_operations (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    operation_type  ENUM('BULK_LOCATION_MOVE', 'COLOR_CHECK', 'MANUAL_STATUS_CHANGE',
                         'DATA_CORRECTION', 'OTHER') NOT NULL,
    
    description     TEXT NOT NULL,
    reason          TEXT,                                     -- Required reason for operation
    
    -- Affected items
    affected_count  INT UNSIGNED DEFAULT 0,
    affected_imeis  JSON,                                     -- List of affected IMEIs
    
    performed_by    INT UNSIGNED NOT NULL,
    performed_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (performed_by) REFERENCES users(id),
    
    INDEX idx_type (operation_type),
    INDEX idx_user (performed_by),
    INDEX idx_performed (performed_at)
) COMMENT 'Log of protected admin operations';

-- Color Check Cache (IMEI24 lookup results)
CREATE TABLE color_check_cache (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    imei            VARCHAR(20) NOT NULL,
    
    -- Cached results
    manufacturer    VARCHAR(100),
    model           VARCHAR(100),
    color           VARCHAR(50),
    storage_gb      SMALLINT UNSIGNED,
    
    -- Additional fields from IMEI24
    raw_response    JSON,
    
    source          ENUM('IMEI24', 'LOCAL', 'MANUAL') DEFAULT 'IMEI24',
    lookup_cost     DECIMAL(5, 2) DEFAULT 0,
    
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_imei (imei),
    INDEX idx_imei (imei)
) COMMENT 'Cache for IMEI24 color/spec lookups';


-- -----------------------------------------------------------------------------
-- SECTION 11: SYSTEM LOGGING
-- Designed for performance with partitioning support
-- -----------------------------------------------------------------------------

-- Main Activity Log (partitioned by date for performance)
CREATE TABLE activity_log (
    id              BIGINT UNSIGNED AUTO_INCREMENT,
    log_date        DATE NOT NULL,
    log_time        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- What happened
    action          VARCHAR(100) NOT NULL,                   -- e.g., 'DEVICE_RECEIVED', 'ORDER_CREATED'
    entity_type     VARCHAR(50),                              -- e.g., 'DEVICE', 'SALES_ORDER'
    entity_id       INT UNSIGNED,
    
    -- Device reference (denormalized for efficient querying)
    imei            VARCHAR(20),
    
    -- Details
    details         JSON,                                     -- Flexible detail storage
    
    -- Who
    user_id         INT UNSIGNED,
    
    -- IP/Session tracking
    ip_address      VARCHAR(45),
    session_id      VARCHAR(100),
    
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
    PARTITION p_future VALUES LESS THAN MAXVALUE
);


-- -----------------------------------------------------------------------------
-- SECTION 12: COURIER TRACKING
-- Multi-courier tracking support
-- -----------------------------------------------------------------------------

CREATE TABLE shipment_tracking (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sales_order_id  INT UNSIGNED NOT NULL,
    
    courier         ENUM('DPD', 'UPS', 'DHL', 'FEDEX', 'OTHER') NOT NULL,
    tracking_number VARCHAR(100) NOT NULL,
    
    -- Latest status
    current_status  VARCHAR(100),
    status_description TEXT,
    
    -- Tracking events (stored as JSON array)
    tracking_events JSON,
    
    -- Delivery info
    estimated_delivery DATE,
    actual_delivery TIMESTAMP NULL,
    is_delivered    BOOLEAN DEFAULT FALSE,
    
    last_checked    TIMESTAMP NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
    
    INDEX idx_so (sales_order_id),
    INDEX idx_tracking (tracking_number),
    INDEX idx_courier (courier),
    INDEX idx_delivered (is_delivered)
) COMMENT 'Shipment tracking across multiple couriers';


-- -----------------------------------------------------------------------------
-- SECTION 13: BLACKBELT INTEGRATION
-- For ingesting QC logs from Blackbelt application
-- -----------------------------------------------------------------------------

CREATE TABLE blackbelt_logs (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Device identification
    imei            VARCHAR(20) NOT NULL,
    serial_number   VARCHAR(50),
    
    -- Test results
    test_date       TIMESTAMP NOT NULL,
    test_type       VARCHAR(100),
    overall_result  ENUM('PASS', 'FAIL', 'INCOMPLETE'),
    
    -- Detailed results (flexible JSON storage)
    test_details    JSON,
    
    -- Device info from Blackbelt
    manufacturer    VARCHAR(100),
    model           VARCHAR(100),
    os_version      VARCHAR(50),
    storage_gb      SMALLINT UNSIGNED,
    
    -- Raw data
    raw_log         MEDIUMTEXT,
    
    -- Processing
    processed       BOOLEAN DEFAULT FALSE,
    linked_device_id INT UNSIGNED,
    
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_imei (imei),
    INDEX idx_test_date (test_date),
    INDEX idx_result (overall_result),
    INDEX idx_processed (processed)
) COMMENT 'Ingested logs from Blackbelt QC application';


-- -----------------------------------------------------------------------------
-- SECTION 14: DASHBOARD VIEWS
-- Pre-computed views for dashboard performance
-- -----------------------------------------------------------------------------

-- Current stock summary view
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

-- Devices awaiting QC
CREATE OR REPLACE VIEW v_awaiting_qc AS
SELECT 
    d.id,
    d.imei,
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

-- Devices awaiting repair
CREATE OR REPLACE VIEW v_awaiting_repair AS
SELECT 
    d.id,
    d.imei,
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

-- Unprocessed sales orders
CREATE OR REPLACE VIEW v_unprocessed_sales_orders AS
SELECT 
    so.id,
    so.so_number,
    so.order_type,
    so.backmarket_order_id,
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

-- Recent purchase orders
CREATE OR REPLACE VIEW v_recent_purchase_orders AS
SELECT 
    po.id,
    po.po_number,
    s.name AS supplier_name,
    po.supplier_ref,
    po.status,
    po.expected_quantity,
    po.received_quantity,
    u.display_name AS created_by,
    po.created_at
FROM purchase_orders po
JOIN suppliers s ON po.supplier_id = s.id
JOIN users u ON po.created_by = u.id
ORDER BY po.created_at DESC;

-- Dashboard metrics view
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


-- -----------------------------------------------------------------------------
-- SECTION 15: STORED PROCEDURES FOR COMMON OPERATIONS
-- -----------------------------------------------------------------------------

DELIMITER //

-- Generate next sequential number for various entities
CREATE PROCEDURE sp_get_next_number(
    IN p_prefix VARCHAR(10),
    OUT p_number VARCHAR(20)
)
BEGIN
    DECLARE v_max_num INT DEFAULT 0;
    DECLARE v_table_name VARCHAR(50);
    DECLARE v_column_name VARCHAR(50);
    
    -- Determine table and column based on prefix
    CASE p_prefix
        WHEN 'PO' THEN 
            SET v_table_name = 'purchase_orders';
            SET v_column_name = 'po_number';
        WHEN 'SO' THEN 
            SET v_table_name = 'sales_orders';
            SET v_column_name = 'so_number';
        WHEN 'QC' THEN 
            SET v_table_name = 'qc_jobs';
            SET v_column_name = 'job_number';
        WHEN 'REP' THEN 
            SET v_table_name = 'repair_jobs';
            SET v_column_name = 'job_number';
        WHEN 'RET' THEN 
            SET v_table_name = 'returns';
            SET v_column_name = 'return_number';
        ELSE
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid prefix';
    END CASE;
    
    -- Get max number (extract numeric part after prefix)
    SET @sql = CONCAT(
        'SELECT COALESCE(MAX(CAST(SUBSTRING(', v_column_name, ', LENGTH(''', p_prefix, '-'') + 1) AS UNSIGNED)), 0) INTO @max_num FROM ', v_table_name
    );
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    
    SET v_max_num = @max_num + 1;
    SET p_number = CONCAT(p_prefix, '-', LPAD(v_max_num, 5, '0'));
END //

-- Bulk move devices to new location
CREATE PROCEDURE sp_bulk_location_move(
    IN p_imei_list JSON,
    IN p_new_location_id INT UNSIGNED,
    IN p_user_id INT UNSIGNED,
    IN p_reason TEXT
)
BEGIN
    DECLARE v_imei VARCHAR(20);
    DECLARE v_idx INT DEFAULT 0;
    DECLARE v_count INT;
    DECLARE v_affected INT DEFAULT 0;
    
    -- Get count of IMEIs
    SET v_count = JSON_LENGTH(p_imei_list);
    
    -- Start transaction
    START TRANSACTION;
    
    -- Process each IMEI
    WHILE v_idx < v_count DO
        SET v_imei = JSON_UNQUOTE(JSON_EXTRACT(p_imei_list, CONCAT('$[', v_idx, ']')));
        
        -- Update location
        UPDATE devices 
        SET location_id = p_new_location_id,
            updated_at = CURRENT_TIMESTAMP
        WHERE imei = v_imei 
          AND status = 'IN_STOCK';
        
        IF ROW_COUNT() > 0 THEN
            SET v_affected = v_affected + 1;
            
            -- Log the change
            INSERT INTO device_history (device_id, imei, event_type, field_changed, 
                                        new_value, notes, user_id)
            SELECT id, imei, 'LOCATION_CHANGE', 'location_id', 
                   p_new_location_id, p_reason, p_user_id
            FROM devices WHERE imei = v_imei;
        END IF;
        
        SET v_idx = v_idx + 1;
    END WHILE;
    
    -- Log admin operation
    INSERT INTO admin_operations (operation_type, description, reason, 
                                   affected_count, affected_imeis, performed_by)
    VALUES ('BULK_LOCATION_MOVE', 
            CONCAT('Moved ', v_affected, ' devices to location ID ', p_new_location_id),
            p_reason, v_affected, p_imei_list, p_user_id);
    
    COMMIT;
    
    SELECT v_affected AS devices_moved;
END //

-- Complete goods out for a sales order
CREATE PROCEDURE sp_complete_goods_out(
    IN p_sales_order_id INT UNSIGNED,
    IN p_user_id INT UNSIGNED
)
BEGIN
    DECLARE v_item_count INT;
    
    START TRANSACTION;
    
    -- Update all picked devices to shipped
    UPDATE sales_order_items
    SET shipped = TRUE,
        shipped_at = CURRENT_TIMESTAMP
    WHERE sales_order_id = p_sales_order_id
      AND shipped = FALSE;
    
    SET v_item_count = ROW_COUNT();
    
    -- Update device statuses
    UPDATE devices d
    JOIN sales_order_items soi ON d.id = soi.device_id
    SET d.status = 'SHIPPED',
        d.updated_at = CURRENT_TIMESTAMP
    WHERE soi.sales_order_id = p_sales_order_id
      AND soi.shipped = TRUE;
    
    -- Update sales order status
    UPDATE sales_orders
    SET status = 'SHIPPED',
        shipped_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_sales_order_id;
    
    -- Log activity
    INSERT INTO activity_log (log_date, action, entity_type, entity_id, 
                              details, user_id)
    VALUES (CURDATE(), 'GOODS_OUT_COMPLETE', 'SALES_ORDER', p_sales_order_id,
            JSON_OBJECT('items_shipped', v_item_count), p_user_id);
    
    COMMIT;
    
    SELECT v_item_count AS items_shipped;
END //

DELIMITER ;


-- -----------------------------------------------------------------------------
-- SECTION 16: INITIAL DATA / SEED DATA
-- -----------------------------------------------------------------------------

-- Insert common manufacturers
INSERT INTO manufacturers (code, name) VALUES
('APPLE', 'Apple'),
('SAMSUNG', 'Samsung'),
('GOOGLE', 'Google'),
('HUAWEI', 'Huawei'),
('XIAOMI', 'Xiaomi'),
('ONEPLUS', 'OnePlus'),
('MOTOROLA', 'Motorola'),
('SONY', 'Sony'),
('LG', 'LG'),
('NOKIA', 'Nokia'),
('OPPO', 'Oppo'),
('VIVO', 'Vivo'),
('REALME', 'Realme'),
('HONOR', 'Honor'),
('OTHER', 'Other');

-- Insert common locations
INSERT INTO locations (code, name, location_type) VALUES
('GOODS_IN', 'Goods In Area', 'OTHER'),
('QC_AREA', 'QC Testing Area', 'QC'),
('REPAIR_AREA', 'Repair Workshop', 'REPAIR'),
('LEVEL3_1', 'Level 3 Repair Bay 1', 'LEVEL3'),
('LEVEL3_2', 'Level 3 Repair Bay 2', 'LEVEL3'),
('LEVEL3_COMPLETE', 'Level 3 Complete', 'LEVEL3'),
('LEVEL3_FAILS', 'Level 3 Failures', 'LEVEL3'),
('SHIPPING', 'Shipping Area', 'SHIPPING'),
('RETURNS', 'Returns Processing', 'RETURNS');

-- Insert default Backmarket customer
INSERT INTO customers (customer_code, name, is_backmarket) VALUES
('CST-BM', 'Backmarket Consumer', TRUE);

-- Insert part categories
INSERT INTO part_categories (name, description) VALUES
('Screen', 'Display assemblies and components'),
('Battery', 'Device batteries'),
('Back Glass', 'Rear glass panels'),
('Charging Port', 'Charging/data ports'),
('Camera', 'Camera modules'),
('Speaker', 'Speakers and earpieces'),
('Button', 'Buttons and switches'),
('Frame', 'Frames and housings'),
('Service Pack', 'Complete screen and frame assemblies / service packs'),
('Logic Board', 'Main boards and components'),
('Other', 'Miscellaneous parts');


-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
-- 
-- NOTES FOR IMPLEMENTATION:
-- 
-- 1. PARTITIONING: The activity_log table uses range partitioning by quarter.
--    Add new partitions before they're needed:
--    ALTER TABLE activity_log ADD PARTITION (PARTITION p_2026_q1 VALUES LESS THAN (TO_DAYS('2026-04-01')));
--
-- 2. ARCHIVING: Old partitions can be archived by:
--    ALTER TABLE activity_log EXCHANGE PARTITION p_2024_q1 WITH TABLE activity_log_archive;
--
-- 3. INDEXES: Additional indexes may be needed based on actual query patterns.
--    Monitor slow query log and add indexes as needed.
--
-- 4. UNIQUE IMEI CONSTRAINT: The current design allows the same IMEI to exist
--    multiple times (for devices passing through multiple times) but prevents
--    duplicates with the same status. Adjust uk_imei_instock if needed.
--
-- 5. FOREIGN KEYS: Some FKs to users table may need ON DELETE SET NULL if
--    users can be deleted while preserving history.
--
-- 6. JSON COLUMNS: Used for flexible data storage (tracking events, test details).
--    Consider normalizing if querying becomes complex.
--
-- 7. MIGRATION: When migrating from old DB:
--    - Map old category_id (CAT1, CAT2) to new manufacturer_id
--    - Map old grade integers to grade characters
--    - Map old tray_id to new location_id
--    - Consolidate item_imei/item_code to imei
--
-- =============================================================================
