-- Migration: Add QC/Repair flags to purchase_orders
-- Date: 2025-12-04
-- Description: Add requires_qc and requires_repair flags to purchase_orders table
--              to support simplified book-as-arrive goods-in workflow

USE quantum2_db;

-- Add new columns to purchase_orders
ALTER TABLE purchase_orders
ADD COLUMN requires_qc BOOLEAN DEFAULT TRUE
    COMMENT 'Does stock on this PO require QC?'
    AFTER received_quantity,
ADD COLUMN requires_repair BOOLEAN DEFAULT FALSE
    COMMENT 'Does stock on this PO require repair?'
    AFTER requires_qc;

-- Update existing POs to have default values
UPDATE purchase_orders SET requires_qc = TRUE WHERE requires_qc IS NULL;
UPDATE purchase_orders SET requires_repair = FALSE WHERE requires_repair IS NULL;

-- Verify changes
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'quantum2_db'
  AND TABLE_NAME = 'purchase_orders'
  AND COLUMN_NAME IN ('requires_qc', 'requires_repair');
