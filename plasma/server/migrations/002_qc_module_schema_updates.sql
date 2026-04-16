-- Migration: QC module schema updates
-- Date: 2026-04-01
--
-- Safe to run: qc_jobs and qc_results tables are empty (module was never implemented).
-- This migration:
--   1. Replaces boolean functional_pass/cosmetic_pass with multi-value ENUM columns
--   2. Adds non_uk BOOLEAN flag to qc_results
--   3. Adds created_by to qc_jobs (parallel to repair_jobs.created_by)
--
-- To apply: mysql quantum2_db < server/migrations/002_qc_module_schema_updates.sql

-- ─── qc_results ───────────────────────────────────────────────────────────────

ALTER TABLE qc_results
  DROP COLUMN functional_pass,
  DROP COLUMN cosmetic_pass,
  ADD COLUMN functional_result ENUM('PASS', 'FAIL', 'UNABLE', 'NA') NULL
      COMMENT 'Functional test outcome: PASS/FAIL/UNABLE (could not test)/NA (not applicable)'
      AFTER device_id,
  ADD COLUMN cosmetic_result ENUM('PASS', 'FAIL', 'NA') NULL
      COMMENT 'Cosmetic test outcome: PASS/FAIL/NA'
      AFTER functional_result,
  ADD COLUMN non_uk BOOLEAN NOT NULL DEFAULT FALSE
      COMMENT 'Device is not UK-compatible (network bands / region lock)'
      AFTER blackbelt_passed;

ALTER TABLE qc_results
  ADD INDEX idx_functional_result (functional_result),
  ADD INDEX idx_non_uk (non_uk);

-- ─── qc_jobs ──────────────────────────────────────────────────────────────────

ALTER TABLE qc_jobs
  ADD COLUMN created_by INT UNSIGNED NULL
      COMMENT 'User who created the job'
      AFTER assigned_to,
  ADD CONSTRAINT fk_qc_jobs_created_by
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
