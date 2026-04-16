-- Address Validation Integration - Database Schema Migration
-- This script adds validation status and metadata columns to tbl_bm2 table
-- Requirements: 2.1, 2.2

-- Check if validation metadata columns exist before adding them
-- This prevents duplicate column errors if migration is run multiple times

-- Add validation status and metadata columns
ALTER TABLE `tbl_bm2` 
ADD COLUMN IF NOT EXISTS `v_match_level` VARCHAR(50) DEFAULT NULL COMMENT 'Match level from Ideal Postcodes API',
ADD COLUMN IF NOT EXISTS `v_confidence_score` DECIMAL(3,2) DEFAULT NULL COMMENT 'Validation confidence score 0.00-1.00',
ADD COLUMN IF NOT EXISTS `v_api_response` TEXT DEFAULT NULL COMMENT 'Full API response for debugging',
ADD COLUMN IF NOT EXISTS `v_validated_at` TIMESTAMP DEFAULT NULL COMMENT 'When validation was performed';

-- Add indexes for efficient querying of validation status
-- Index on v_status for filtering validated/unvalidated records
CREATE INDEX IF NOT EXISTS `idx_tbl_bm2_v_status` ON `tbl_bm2` (`v_status`);

-- Index on v_validated_at for temporal queries
CREATE INDEX IF NOT EXISTS `idx_tbl_bm2_v_validated_at` ON `tbl_bm2` (`v_validated_at`);

-- Composite index for validation status and confidence score queries
CREATE INDEX IF NOT EXISTS `idx_tbl_bm2_validation_quality` ON `tbl_bm2` (`v_status`, `v_confidence_score`);

-- Update v_status column comment to include status codes
ALTER TABLE `tbl_bm2` MODIFY COLUMN `v_status` INT(11) DEFAULT NULL COMMENT 'Validation status: 0=not validated, 1=validated, 2=failed, 3=manual_review_required';

-- Verification query to check if all columns were added successfully
-- This can be used to verify the migration completed successfully
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT, 
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'tbl_bm2' 
    AND COLUMN_NAME LIKE 'v_%'
ORDER BY COLUMN_NAME;