-- Migration to update backmarket_shipments table
-- Fixes sales_order_id to be nullable and adds dpd_shipment_id

USE quantum2_db;

-- Make sales_order_id nullable (since BM orders can be processed independently)
ALTER TABLE backmarket_shipments 
MODIFY COLUMN sales_order_id INT UNSIGNED NULL;

-- Add dpd_shipment_id for storing MyShipments UUID
ALTER TABLE backmarket_shipments 
ADD COLUMN dpd_shipment_id VARCHAR(50) NULL AFTER dpd_consignment,
ADD INDEX idx_dpd_shipment (dpd_shipment_id);

-- Update comment
ALTER TABLE backmarket_shipments 
COMMENT = 'BackMarket shipment processing and DPD booking data';
