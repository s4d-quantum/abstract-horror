-- Migration: Repair & Parts Data Integrity
-- Date: 2026-03-13
-- Purpose:
--   1. Unique constraint on repair_jobs.job_number to guarantee no duplicates
--      even if the application-level GET_LOCK fallback fires.
--   2. CHECK constraints on part_lots and parts to enforce non-negative
--      quantities at the database layer (MySQL 8.0.16+ required; confirmed 8.0.45).

-- ============================================================
-- 1. repair_jobs — unique job number
-- ============================================================

ALTER TABLE repair_jobs
  ADD UNIQUE INDEX uq_repair_job_number (job_number);

-- ============================================================
-- 2. part_lots — non-negative quantity columns
-- ============================================================

ALTER TABLE part_lots
  ADD CONSTRAINT chk_lot_available_qty  CHECK (available_quantity >= 0),
  ADD CONSTRAINT chk_lot_reserved_qty   CHECK (reserved_quantity  >= 0),
  ADD CONSTRAINT chk_lot_consumed_qty   CHECK (consumed_quantity  >= 0),
  ADD CONSTRAINT chk_lot_faulty_qty     CHECK (faulty_quantity    >= 0),
  ADD CONSTRAINT chk_lot_issued_qty     CHECK (issued_quantity    >= 0);

-- ============================================================
-- 3. parts — non-negative stock columns
-- ============================================================

ALTER TABLE parts
  ADD CONSTRAINT chk_part_current_stock    CHECK (current_stock   >= 0),
  ADD CONSTRAINT chk_part_available_stock  CHECK (available_stock >= 0),
  ADD CONSTRAINT chk_part_reserved_stock   CHECK (reserved_stock  >= 0),
  ADD CONSTRAINT chk_part_consumed_stock   CHECK (consumed_stock  >= 0),
  ADD CONSTRAINT chk_part_faulty_stock     CHECK (faulty_stock    >= 0),
  ADD CONSTRAINT chk_part_issued_stock     CHECK (issued_stock    >= 0);
