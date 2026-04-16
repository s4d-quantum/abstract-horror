-- Migration: Parts module cleanup
-- Date: 2026-03-23
-- Description: Remove deprecated columns from parts module tables

-- 1. part_compatibility: drop storage_gb and recreate unique key
-- The live DB may have a unique key that includes storage_gb.
-- Drop it if it exists, then recreate without storage_gb.
ALTER TABLE part_compatibility
  DROP INDEX IF EXISTS uk_part_model_storage;

ALTER TABLE part_compatibility
  DROP COLUMN IF EXISTS storage_gb;

-- Recreate unique key without storage_gb (only if it doesn't already exist)
-- The key name may vary; adjust if your DB uses a different name.
SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'part_compatibility'
    AND index_name = 'uk_part_model'
);
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE part_compatibility ADD UNIQUE KEY uk_part_model (part_base_id, model_id)',
  'SELECT ''uk_part_model already exists'' AS msg');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. parts: drop min_stock_level
ALTER TABLE parts
  DROP COLUMN IF EXISTS min_stock_level;

-- 3. part_lots: drop unit_cost
ALTER TABLE part_lots
  DROP COLUMN IF EXISTS unit_cost;
