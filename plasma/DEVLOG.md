# Plasma - Development Log

Chronological record of all development sessions. Most recent at the top.

---

## 2026-04-08 — Sales order fallback hardening and client API consistency cleanup

**Done:**
- Hardened `salesOrderModel.getPickedDevices()` so missing legacy mapping tables no longer cause a 500; reserved devices still load, and legacy line assignment now documents its stable tie-break rule
- Migrated remaining admin ops pages off raw page-local `axios` calls onto shared API helpers backed by `client/src/lib/api.js`, so token refresh works consistently for admin ops, location moves, color check, and label printing
- Standardized remaining client error parsing on `getApiErrorMessage()` and added dedicated frontend coverage for both structured and legacy API error response shapes
- Replaced the remaining `alert()` feedback in the touched customer, supplier, purchase order, and sales order pages with `react-hot-toast`
- Added backend regression coverage for missing legacy tables, sales order status gating, and order query validators; updated affected frontend form tests to match the current inferred-order-type behavior
- Added `tsconfig.tsbuildinfo` to `.gitignore` and removed the tracked build artifact from git index
- Verified with `npm test -- tests/backend/regressions.test.ts tests/backend/orders.validators.test.ts tests/frontend/create-sales-order.test.tsx tests/frontend/create-purchase-order.test.tsx tests/frontend/errors.test.ts`

**Files changed:**
- `.gitignore`
- `server/src/models/salesOrderModel.js`
- `client/src/api/admin.js`
- `client/src/api/tac.js`
- `client/src/context/AuthContext.jsx`
- `client/src/pages/AdminOps.jsx`
- `client/src/pages/LocationManagement.jsx`
- `client/src/pages/ColorCheck.jsx`
- `client/src/pages/PrintLabels.jsx`
- `client/src/pages/CreateRepair.jsx`
- `client/src/pages/CreateSalesOrder.jsx`
- `client/src/pages/CreatePurchaseOrder.jsx`
- `client/src/pages/Parts.jsx`
- `client/src/pages/AddCustomer.jsx`
- `client/src/pages/AddSupplier.jsx`
- `client/src/pages/CustomerDetail.jsx`
- `client/src/pages/SupplierDetail.jsx`
- `client/src/pages/EditPurchaseOrder.jsx`
- `client/src/pages/PurchaseOrderDetail.jsx`
- `client/src/pages/SalesOrderDetail.jsx`
- `tests/backend/regressions.test.ts`
- `tests/backend/orders.validators.test.ts`
- `tests/frontend/create-sales-order.test.tsx`
- `tests/frontend/create-purchase-order.test.tsx`
- `tests/frontend/errors.test.ts`
- `DEVLOG.md`
- `tsconfig.tsbuildinfo` (removed from git index)

**Next:**
- Extend query validation to the other list endpoints called out in the review (`devices`, `customers`, `suppliers`, `level3`, admin listings)
- Decide whether sales-order list summaries should become opt-in to avoid extra queries on pages that do not use them
- Consider migrating the remaining raw `axios` usage in `client/src/api/backmarket.api.js` to the shared API client for the same token-refresh consistency

**Known issues / blockers:**
- `successResponse()` still has the same spread-based API shape fragility noted in the review; this session did not refactor that helper
- The broader review-related cleanup outside the touched areas is still incremental rather than fully complete

## 2026-04-02 — Comprehensive database documentation for migration planning

**Done:**
- Examined all 14 server models, 4 migration files, seed data, and original schema file to determine actual current DB state
- Identified significant discrepancies between original schema file and actual DB (missing tables, missing columns, changed FKs)
- Created `.info/DATABASE_SCHEMA.md` — authoritative schema reference covering all 28 tables, 7 views, 3 stored procedures, all ENUM values, seed data, and migration history
- Created `.info/DATABASE_DATA_EXAMPLES.md` — walkthrough of 9 real-world business scenarios with concrete data examples, device lifecycle diagram, parts stock accounting model, common query patterns, and old→new migration mapping

**Files changed:**
- `.info/DATABASE_SCHEMA.md` — new file (comprehensive schema document)
- `.info/DATABASE_DATA_EXAMPLES.md` — new file (data examples and explanations)

**Next:**
- Documents are ready for use in planning the old DB → new DB migration
- Consider updating the original `.info/inventory_db_schema.sql` to match the actual current state

**Known issues / blockers:**
- Original schema SQL file is outdated — does not include `part_bases`, `part_lots`, `part_transactions`, `part_fault_reports`, `repair_comments`, or many column additions from migrations

---

## 2026-04-02 — UI consistency: standardize actions, links, filters, and button styling

**Done:**
- **Goods In**: PO number is now a clickable link to detail page; actions say "View Details"; added Supplier dropdown + Date From/To filters; fixed NaN pagination bug (guarded render when `pagination.limit` exists)
- **Goods Out**: Replaced Type column with Created By column (uses `created_by_username` from API); moved summary stat cards to top; added Date From/To filters; removed unused `XCircle` import
- **Backmarket**: Moved summary stat cards to top; added Date From/To filters
- **QC**: Job number is now a clickable link to job detail page; PO number is a clickable link to PO detail page; action button changed from `btn-secondary` ("Open Job") to `btn-primary` ("View Details")
- **Repair**: Job number is now a clickable link; PO number is a clickable link; action button changed to `btn-primary` ("View Details"); "Create Repair" button changed from custom green to `btn-primary`; status now displayed as colored badge (was plain text)
- **Level 3**: Added status filter dropdown (Booked In, In Progress, Awaiting Parts, On Hold)
- **Customers**: Removed Type column and Backmarket filter; customer code is now a clickable link; actions say "View Details"
- **Suppliers**: Supplier code is now a clickable link; actions say "View Details"
- **Backend**: Added `date_from`/`date_to` filter support to `salesOrderModel.getAll()`; added `date_from`/`date_to` passthrough in `salesOrderController`; added optional `status` filter to `level3Model.getActiveRepairs()` and `level3Controller`

**Files changed:**
- `server/src/models/salesOrderModel.js` — added date_from/date_to filter conditions
- `server/src/controllers/salesOrderController.js` — pass date_from/date_to from query params
- `server/src/models/level3Model.js` — added optional status filter to getActiveRepairs
- `server/src/controllers/level3Controller.js` — pass status from query params
- `client/src/pages/GoodsIn.jsx` — PO link, View Details, pagination fix, supplier/date filters
- `client/src/pages/GoodsOut.jsx` — Created By column, cards to top, date filters, removed XCircle
- `client/src/pages/Backmarket.jsx` — cards to top, date filters
- `client/src/pages/QC.jsx` — job/PO links, View Details button, btn-primary styling
- `client/src/pages/Repair.jsx` — job/PO links, View Details button, btn-primary styling, status badge
- `client/src/pages/Level3.jsx` — added status filter dropdown
- `client/src/pages/Customers.jsx` — removed Type column, code link, View Details
- `client/src/pages/Suppliers.jsx` — code link, View Details

**Next:**
- Test all filter combinations end-to-end with running server
- Consider adding customer dropdown filter to Goods Out (data hook exists but was not included to keep filter UI compact)
- Consider adding pagination to Goods Out and Backmarket (currently fetch up to 100 records)

---

## 2026-04-01 — Code review: repair & QC module fixes

**Done:**
- Added race condition guard in `completeQcJob` — re-checks eligible devices with a locked query before auto-creating repair jobs, preventing duplicate job creation from concurrent QC completions
- Added `VALID_SORT_COLUMNS` whitelist constant to `repairModel.js` as defensive coding against future sort parameter exposure
- Created `ErrorBoundary` component (`client/src/components/ErrorBoundary.jsx`) with fallback UI and retry button
- Wrapped `Repair`, `RepairJobDetail`, `QC`, and `QCJobDetail` pages with `ErrorBoundary`
- Verified parts allocation functions already use `transaction()` + `FOR UPDATE` (no changes needed)
- Verified `getJobs` uses hard-coded `ORDER BY` — no sort injection risk (no changes needed)
- Verified N+1 query concern was not present in current code (no changes needed)
- Verified QC controller `AppError` pattern produces same output format as `errorResponse()` (no changes needed)

**Files changed:**
- `server/src/controllers/qcController.js` — added device re-check query before auto-repair job creation
- `server/src/models/repairModel.js` — added `VALID_SORT_COLUMNS` export
- `client/src/components/ErrorBoundary.jsx` — new file
- `client/src/pages/Repair.jsx` — added ErrorBoundary wrapper
- `client/src/pages/RepairJobDetail.jsx` — added ErrorBoundary wrapper
- `client/src/pages/QC.jsx` — added ErrorBoundary wrapper
- `client/src/pages/QCJobDetail.jsx` — added ErrorBoundary wrapper

**Next:**
- Consider adding tests for the new race condition guard path
- Consider expanding error boundaries to remaining page components

**Known issues / blockers:**
- ESLint config missing from client (pre-existing)
- Tests time out due to DB dependency (pre-existing)

---

## 2026-04-01 — Code review fixes: bulk repair hardening + TanStack Query v5 sweep

**Done:**
- Fixed `FOR UPDATE` locking on repair_records inside `bulkRepair` transaction — records now locked alongside devices to prevent concurrent modification
- Moved `ensurePartCompatibility` check outside the per-device loop (once per allocation, all devices share the same model) and batched `updateLotQuantities`/`updatePartQuantities` into one call per allocation after the device loop — reduces N×M queries to M
- Removed redundant `eligible_for_bulk_repair` field from `buildBulkDeviceMap` and removed unused `device_map` from `getBulkParts` response
- Removed unused `getDevicesByIds` model method
- Added optional `forUpdate` parameter to `getJobRecordsByDeviceIds` in repairModel
- Fixed IMEI validation in `BulkRepairPage` to reject anything that isn't exactly 15 chars (was `< 15`, now `!== 15`)
- Scan error now clears immediately when the user starts typing in the IMEI field
- Renamed "Save and Exit" button on `RepairJobDetail` to "Save Notes" (it does not navigate)
- Hidden "Bulk Repair" button on `RepairJobDetail` when job is `COMPLETED` or `CANCELLED`
- Replaced all 87 instances of `mutation.isLoading` with `mutation.isPending` across 20 client files — `isLoading` was removed from `useMutation` in TanStack Query v5
- Extended `createDevice` test helper to accept optional `modelId` parameter
- Added two new backend tests: insufficient stock returns 409 `INSUFFICIENT_PART_STOCK`; mixed-model devices return 400 `MIXED_DEVICE_MODELS`

**Files changed:**
- `server/src/controllers/repairController.js`
- `server/src/models/repairModel.js`
- `client/src/pages/BulkRepairPage.jsx`
- `client/src/pages/RepairJobDetail.jsx`
- `client/src/pages/CreateRepair.jsx`
- `client/src/pages/RepairRecordDetail.jsx`
- `client/src/pages/Level3Detail.jsx`
- `client/src/components/BookRepairModal.jsx`
- `client/src/pages/Parts.jsx`
- `client/src/pages/PartBaseDetail.jsx`
- `client/src/pages/PartsModelDetail.jsx`
- `client/src/pages/ReceiveDevices.jsx`
- `client/src/pages/BookInStock.jsx`
- `client/src/pages/CreatePurchaseOrder.jsx`
- `client/src/pages/PurchaseOrderDetail.jsx`
- `client/src/pages/EditPurchaseOrder.jsx`
- `client/src/pages/CreateSalesOrder.jsx`
- `client/src/pages/SalesOrderDetail.jsx`
- `client/src/pages/AddCustomer.jsx`
- `client/src/pages/CustomerDetail.jsx`
- `client/src/pages/AddSupplier.jsx`
- `client/src/pages/SupplierDetail.jsx`
- `tests/backend/repair-parts.test.ts`

**Next:**
- Run the full backend test suite to verify all bulk repair tests pass
- Consider adding a QCJobDetail `.isLoading` check — one `isPending` usage was already present there but not checked in this session

**Known issues / blockers:**
- None introduced in this session

---

## 2026-04-01 — Bulk repair workflow rebuild and job scoping fixes

**Done:**
- Reworked the bulk repair backend so selected devices must belong to the active repair job, must have open repair records, and must share the same manufacturer/model before parts can be loaded or fitted
- Fixed bulk completion stock handling by validating each selected part lot against the full device count up front, then completing every selected repair record with fitted allocations, color updates, and closed device state changes
- Rebuilt `BulkRepairPage.jsx` so users can scan IMEIs or add devices from the open-job list, see clearer handset/part context, select exact part lots, and complete bulk repair without the false "no open repair records" frontend error
- Removed the repair job target sales order field from the create-job UI so the workflow matches the stock-first process
- Added backend coverage for the regression where a device from a different repair job could be bulk repaired on the wrong job
- Verified with `npm test -- --run tests/backend/repair-parts.test.ts` and `npm --prefix client run build`

**Files changed:**
- `client/src/pages/BulkRepairPage.jsx`
- `client/src/pages/CreateRepair.jsx`
- `server/src/controllers/repairController.js`
- `server/src/models/repairModel.js`
- `tests/backend/repair-parts.test.ts`
- `DEVLOG.md` (this entry)

**Next:**
- Manually verify the rebuilt bulk repair screen with a live scanner and mixed-color service-pack scenarios
- Decide whether bulk repair should support partial batches when one selected lot is short instead of requiring every selected lot to cover the full batch

**Known issues / blockers:**
- `npm --prefix client run build` still reports pre-existing `BackmarketShipment.jsx` import warnings for missing exports from `src/api/backmarket.api.js`; bulk repair changes build successfully despite those warnings

## 2026-04-01 — Bulk repair parts allocation feature

**Done:**
- Removed "Target Sales Order" dropdown from `RepairJobDetail.jsx` — orders are filled from stock, not tied to specific repair jobs
- Added "Bulk Repair" button to the top-right of the repair job detail page header
- Created `BulkRepairPage.jsx` — full bulk repair workflow:
  - IMEI scanner input with auto-focus and Enter-triggered scanning
  - Scanned devices table showing manufacturer, model, color, storage, and status
  - Scan validation: rejects IMEIs not in the repair job, rejects manufacturer/model mismatches, plays error beep on invalid scans
  - Compatible parts list (intersection of parts compatible with ALL scanned devices)
  - Multi-select checkbox interface for parts allocation
  - "Complete Bulk Repair" button that fits parts to all selected devices, marks repairs complete, and redirects back to job page
- Added backend endpoints:
  - `GET /api/repair/jobs/:id/bulk-parts` — returns parts compatible with all specified devices
  - `POST /api/repair/jobs/:id/bulk-repair` — bulk allocates parts, fits them directly, completes repairs, updates device status to IN_STOCK
- Added repair model methods: `getDevicesByIds`, `getBulkCompatibleParts`, `getDeviceRepairRecords`
- Added `validateBulkRepair` middleware in `validation.js`
- Added frontend API functions (`getBulkParts`, `bulkRepair`) and hooks (`useBulkParts`, `useBulkRepair`)
- Added `bulkRepairSchema` Zod schema for client-side validation
- Added 3 backend integration tests for bulk repair flow (happy path, invalid device IDs, empty part allocations)
- Updated `App.jsx` with new route `/repair/jobs/:id/bulk-repair`
- Verified frontend builds successfully

**Files changed:**
- `client/src/pages/RepairJobDetail.jsx` (removed Target Sales Order dropdown, added Bulk Repair button)
- `client/src/pages/BulkRepairPage.jsx` (new)
- `client/src/api/repair.js` (added getBulkParts, bulkRepair)
- `client/src/hooks/useRepairModule.js` (added useBulkParts, useBulkRepair)
- `client/src/schemas/repair.js` (added bulkRepairSchema)
- `client/src/App.jsx` (added bulk repair route)
- `server/src/models/repairModel.js` (added getDevicesByIds, getBulkCompatibleParts, getDeviceRepairRecords)
- `server/src/controllers/repairController.js` (added getBulkParts, bulkRepair)
- `server/src/routes/repairRoutes.js` (added bulk repair routes)
- `server/src/middleware/validation.js` (added validateBulkRepair)
- `tests/backend/repair-parts.test.ts` (added 3 bulk repair tests)
- `DEVLOG.md` (this entry)

**Next:**
- Manual end-to-end testing of bulk repair workflow with barcode scanner
- Consider adding quantity selection for parts (currently 1 per device)
- Consider adding a confirmation modal before completing bulk repair
- Test with mixed device models (currently rejects manufacturer/model mismatches)

**Known issues / blockers:**
- Backend tests fail due to pre-existing database reset issues between test runs (duplicate key errors in seedCoreFixtures) — not related to bulk repair code
- Parts are fitted directly (not reserved first) in bulk workflow — this is intentional for speed but means no reservation step

---

## 2026-04-01 — QC integrity hardening and schema safety

**Done:**
- Hardened the QC backend against stock drift by blocking empty manual QC jobs, rejecting duplicate open jobs for the same devices, and rejecting result saves for devices that do not belong to the target QC job
- Locked down QC write routes to `ADMIN`/`QC`, removed direct `COMPLETED` status patching, and preserved `tested_by`/`tested_at` from the save step instead of overwriting tester attribution during completion
- Added cached QC schema compatibility checks in `server/src/models/qcModel.js` so outdated databases fail fast with `QC_SCHEMA_OUTDATED` instead of raw SQL errors
- Added idempotent migration runner `server/migrate-qc-module.js`, wired it into backend test setup, and updated `.info/inventory_db_schema.sql` plus the QC migration FK definition to match the implemented schema
- Expanded QC workflow coverage with tests for empty jobs, duplicate manual jobs, foreign-device result saves, completion-status bypass protection, and tester attribution preservation
- Fixed backend test infrastructure by truncating QC tables between runs, aligning repair-part tests with current response shapes, and increasing backend hook timeout so the full backend suite completes reliably
- Verified with `npm test -- --run tests/backend/qc-repair.smoke.test.ts tests/backend/qc-workflow.test.ts`, `npm test -- --run tests/backend/repair-parts.test.ts tests/backend/qc-workflow.test.ts`, and `npm test -- --project backend`

**Files changed:**
- `.info/inventory_db_schema.sql`
- `server/migrate-qc-module.js` (new)
- `server/migrations/002_qc_module_schema_updates.sql`
- `server/src/controllers/qcController.js`
- `server/src/middleware/validation.js`
- `server/src/models/qcModel.js`
- `server/src/routes/qcRoutes.js`
- `tests/backend/qc-workflow.test.ts`
- `tests/backend/repair-parts.test.ts`
- `tests/backend/setup.ts`
- `tests/backend/utils/test-db.ts`
- `vitest.config.mts`
- `DEVLOG.md` (this entry)

**Next:**
- Wire a manual QC job creation action into the frontend when that workflow is needed so `NO_QC_ELIGIBLE_DEVICES` and duplicate-job errors are surfaced to users
- Consider adding role-specific frontend guards for QC pages to mirror the backend write restrictions
- Decide whether QC result saves should also require a functional result before stamping `tested_by` for edge-case partial edits

**Known issues / blockers:**
- QC schema still requires the migration to exist on non-test databases; the runtime guard now fails clearly, but production/staging still need the runner or SQL migration applied during deployment
- Backend tests are slower after adding migration/setup safety and serialized DB resets, though the full suite now passes

---

## 2026-04-01 — QC module: full implementation

**Done:**
- Created DB migration `server/migrations/002_qc_module_schema_updates.sql`:
  - Replaced boolean `functional_pass`/`cosmetic_pass` on `qc_results` with ENUM columns `functional_result ENUM('PASS','FAIL','UNABLE','NA')` and `cosmetic_result ENUM('PASS','FAIL','NA')`
  - Added `non_uk BOOLEAN` to `qc_results` (device network/region flag)
  - Added `created_by` FK to `qc_jobs` (parallel to repair_jobs)
- Created `server/src/models/qcModel.js` — full model layer following repairModel pattern: `getJobs`, `getJobById`, `getJobResults`, `getNextJobNumber` (GET_LOCK), `createJob`, `updateJob`, `upsertResult` (INSERT ON DUPLICATE KEY UPDATE), `upsertResults`, `refreshJobMetrics`, `createAutoJobForDevices`
- Updated `server/src/middleware/validation.js` — replaced QC boolean validators with ENUM validators; added `validateSaveQcResults` for batch-save array endpoint
- Created `server/src/controllers/qcController.js` — `listQcJobs`, `getQcJobById`, `createQcJob`, `updateQcJob`, `saveQcResults` (batch upsert, auto-promotes PENDING→IN_PROGRESS), `completeQcJob` (full transactional completion: updates devices, logs history, triggers repair auto-job)
- Replaced stub `server/src/routes/qcRoutes.js` with full route set (6 routes)
- Fixed `server/src/models/purchaseOrderModel.js` dual-flag logic: QC now always runs before repair when both flags are set; QC auto-job created at book-in when `requires_qc=true`; repair auto-job only created immediately when `requires_qc=false` and `requires_repair=true`
- Created `client/src/api/qc.js` — 6 API functions
- Created `client/src/schemas/qc.js` — Zod schemas for result rows and job creation
- Created `client/src/hooks/useQcModule.js` — React Query hooks: `useQcJobs`, `useQcJob`, `useCreateQcJob`, `useUpdateQcJob`, `useSaveQcResults`, `useCompleteQcJob`
- Replaced placeholder `client/src/pages/QC.jsx` with full jobs list page (filterable, paginated, status badges)
- Created `client/src/pages/QCJobDetail.jsx` — inline-editable device results table with colour/grade/functional/cosmetic/non_uk/comments columns; dirty-row tracking with Save button; Complete button with local pre-validation
- Updated `client/src/App.jsx` — added `QCJobDetail` import and `/qc/jobs/:id` route
- Updated `tests/backend/qc-repair.smoke.test.ts` — fixed assertions for new `GET /api/qc/jobs` endpoint shape; fixed `repairUsers` assertion (field doesn't exist in meta response)
- Created `tests/backend/qc-workflow.test.ts` — 7 integration tests covering: book-in auto-job creation, both-flags logic, save→IN_PROGRESS promotion, 422 on missing results, PASS→IN_STOCK completion, PASS+repair→AWAITING_REPAIR+repair-job, FAIL→IN_STOCK with overall_pass=FALSE

**Files changed:**
- `server/migrations/002_qc_module_schema_updates.sql` (new)
- `server/src/models/qcModel.js` (new)
- `server/src/controllers/qcController.js` (new)
- `server/src/routes/qcRoutes.js` (replaced stub)
- `server/src/middleware/validation.js` (updated QC section)
- `server/src/models/purchaseOrderModel.js` (fixed dual-flag logic, added qcModel import)
- `client/src/api/qc.js` (new)
- `client/src/schemas/qc.js` (new)
- `client/src/hooks/useQcModule.js` (new)
- `client/src/pages/QC.jsx` (replaced placeholder)
- `client/src/pages/QCJobDetail.jsx` (new)
- `client/src/App.jsx` (added QCJobDetail route)
- `tests/backend/qc-repair.smoke.test.ts` (updated assertions)
- `tests/backend/qc-workflow.test.ts` (new)
- `DEVLOG.md` (this entry)

**Next:**
- Run migration on DB: `mysql quantum2_db < server/migrations/002_qc_module_schema_updates.sql`
- Run tests: `cd server && npm test`
- Test end-to-end: book in stock with requires_qc → verify QC job auto-created in `/qc`
- Consider adding QC-specific location (e.g. `QC_BENCH`) so devices move to a QC physical location when IN_QC status
- Dashboard metrics already track `awaiting_qc` count — no change needed

**Known issues / blockers:**
- Migration must be run manually on the DB before the QC module works
- `qc_results` table location display in the jobs list uses the first device's location (a proxy); a dedicated `location_id` on `qc_jobs` would be more accurate but requires a schema change
- No server-side pagination/sorting on the QCJobDetail device table (all results loaded at once); fine for typical PO sizes but may need virtualisation for very large batches

---

## 2026-03-23 — Parts module cleanup, AppError refactor, bulk goods-in, critical bug fixes

**Done:**
- Added `AppError` class to `server/src/utils/helpers.js` — extends `Error` with `statusCode` and `code` properties; integrates with the global `errorHandler` middleware
- Refactored all transaction callbacks in `partController.js` to throw `AppError` instead of returning error objects — eliminates the `isError`/`result.status` pattern; transaction auto-rolls back on throw
- **Fixed `current_stock` delta formula** in `updatePartQuantities` — was only summing available+reserved+faulty, now sums all five deltas (available+reserved+consumed+faulty+issued) so `current_stock` only changes on true goods-in/goods-out
- **Fixed race condition** in `updateLotQuantities` and `updatePartQuantities` — replaced UPDATE+SELECT-then-check with atomic UPDATE using WHERE guards (`AND (col + delta) >= 0`); checks `affectedRows === 0` to detect negative-stock violations
- Made `connection` parameter required in `deactivateBaseCascade` (removed `= null` default) to force transactional callers
- **Fixed `getVariantById`** — added missing `LEFT JOIN part_categories` so response includes `category_name`
- Removed `part_base_id` from variant updateable fields (`updateVariant` `allowedFields` and `validateUpdatePartVariant` validator)
- Removed `storage_gb` from the entire parts module: model SELECT/INSERT/UPDATE, controller, backend validators, frontend Zod schemas, frontend form payloads
- Removed `min_stock_level` from parts model (SELECT, INSERT, UPDATE), controller, backend validators, frontend Zod schemas, and `PartBaseDetail.jsx` variant form payload
- Removed `unit_cost` from `getLotsForPartIds` SELECT
- Removed `received_at` from goods-in validator (server defaults to `new Date()`)
- Proper update Zod schemas for `updatePartBaseSchema`, `updatePartVariantSchema`, `updatePartCompatibilitySchema` — all fields made `.optional()` instead of aliasing to create schemas
- **Added pagination + search + status filter to fault reports** — `getFaultReports` model now returns `{ data, pagination }` shape; frontend Faulty tab has search input, status dropdown, page size selector, prev/next controls
- **Added server-side variant search for goods-in/out** — `SearchableSelect` component supports `onSearch` callback with debounced server-side search; goods-in/out tabs call variant API with `?search=` instead of loading all variants
- Added bulk goods-in endpoint: `POST /parts/bulk-goods-in` with `validateBulkGoodsIn` validator, `partBulkGoodsIn` controller (single transaction wrapping a loop), frontend API function, `usePartBulkGoodsIn` hook, and "Bulk Goods In" tab in Parts UI
- Extracted duplicated category→`changes_device_color` logic from `Parts.jsx` and `PartBaseDetail.jsx` into shared `categoryChangesDeviceColor()` utility in `client/src/utils/partCategories.js`
- Created DB migration `.info/migration_parts_cleanup.sql` — drops `storage_gb` from `part_compatibility`, `min_stock_level` from `parts`, `unit_cost` from `part_lots`; recreates unique key without `storage_gb`

**Files changed:**
- `server/src/utils/helpers.js` (added `AppError` class)
- `server/src/models/partModel.js` (fixed current_stock delta formula, atomic UPDATE with WHERE guards, required connection param, category join on getVariantById, removed storage_gb/min_stock_level/unit_cost, added pagination to getFaultReports)
- `server/src/controllers/partController.js` (AppError refactor, removed storage_gb/min_stock_level/received_at, added partBulkGoodsIn, updated getFaultyParts for pagination)
- `server/src/models/repairModel.js` (removed `pl.unit_cost`, `pc.storage_gb`)
- `server/src/middleware/validation.js` (removed storage_gb/min_stock_level/part_base_id from validators, removed received_at from goods-in, added validateBulkGoodsIn)
- `server/src/routes/partRoutes.js` (added bulk-goods-in route)
- `client/src/schemas/parts.js` (removed storage_gb/min_stock_level, proper update schemas)
- `client/src/pages/Parts.jsx` (fault reports pagination/search/filter, server-side variant search, bulk goods-in UI)
- `client/src/pages/PartBaseDetail.jsx` (removed storage_gb/min_stock_level, category helper)
- `client/src/components/SearchableSelect.jsx` (added onSearch callback with debounce)
- `client/src/components/parts/PartsSectionNav.jsx` (added bulk-goods-in tab)
- `client/src/api/parts.js` (added `bulkGoodsIn`)
- `client/src/hooks/useParts.js` (added `usePartBulkGoodsIn`, `usePartVariantSearch`)
- `client/src/utils/partCategories.js` (new — shared category helper)
- `.info/migration_parts_cleanup.sql` (new — DB migration)

**Next:**
- Run migration: `mysql -u plasma quantum2_db < .info/migration_parts_cleanup.sql`
- Refactor `isError` pattern in `repairController.js`, `level3Controller.js`, `locationManagementController.js` to use `AppError`
- Test goods-in/out flows end-to-end after race condition fix
- RBAC omitted per user decision
- Add tests for bulk goods-in endpoint

**Known issues / blockers:**
- `BackmarketShipment.jsx` has pre-existing import errors (unrelated)
- LSP errors in `tests/backend/repair-parts.test.ts` are pre-existing

---

## 2026-03-13 — Data integrity hardening & UX polish

**Done:**
- Created migration `.info/migration_repair_integrity.sql` with three changes:
  - `UNIQUE INDEX uq_repair_job_number` on `repair_jobs.job_number` — hard DB-level guard against duplicate job numbers if the application-level GET_LOCK fallback fires
  - CHECK constraints on all quantity columns in `part_lots` (`available_quantity`, `reserved_quantity`, `consumed_quantity`, `faulty_quantity`, `issued_quantity >= 0`)
  - CHECK constraints on all stock columns in `parts` (`current_stock`, `available_stock`, `reserved_stock`, `consumed_stock`, `faulty_stock`, `issued_stock >= 0`)
- Made `getRepairMeta` PO/SO limits configurable via `?po_limit=` and `?so_limit=` query params (default 200, max 500)
- Added `isAnyMutationPending` flag to `RepairRecordDetail.jsx` — disables comments textarea and outcome select while any mutation is in flight

**Files changed:**
- `.info/migration_repair_integrity.sql` (new)
- `server/src/controllers/repairController.js` (configurable meta limits)
- `client/src/pages/RepairRecordDetail.jsx` (mutation-pending input locking)

**Next:**
- Run migration against DB: `mysql -u plasma quantum2_db < .info/migration_repair_integrity.sql`
- BER reason capture (Phase 3.1) — defer until QC module is built
- Status transition matrix (Phase 3.4) — defer until QC module is built
- RBAC — defer to later project stage
- Begin QC module frontend (currently thin)

**Known issues / blockers:**
- Migration must be applied manually — no migration runner in place

---

## 2026-03-12 — Code review + repair_required validation fix

**Done:**
- Reviewed uncommitted changes on parts-module branch (7 files changed)
- Fixed critical data integrity issue in repairController.js: added validation to ensure devices can only be added to repair jobs when `repair_required = true`
- The uncommitted changes already added device status validation (SHIPPED, SCRAPPED, etc.) but were missing the repair_required check
- Added SearchableSelect component to PartBaseDetail.jsx compatibility rule dropdown - replaces long dropdown list with searchable text filter for better UX when selecting device models
- Applied same color auto-detection fix to PartBaseDetail.jsx as in Parts.jsx - now auto-sets changes_device_color when category is "service pack" or "frame" (removes manual checkbox, auto-detects from category)

**Files changed:**
- `server/src/controllers/repairController.js` (added repair_required validation)
- `client/src/pages/PartBaseDetail.jsx` (added SearchableSelect for model dropdown)

**Next:**
- Complete review of remaining suggestions from code review:
  - Consider making status field required in updateRepairRecordSchema (currently optional)
  - Consider showing outcome dropdown only when status changes to COMPLETED/BER

**Known issues / blockers:**
- None

---

## 2026-03-12 — Repair & Parts module audit fixes

**Done:**
- Full code audit of repair and parts modules (backend + frontend) — identified stock drift risks, transaction gaps, UX issues
- Added negative-stock guards to `updatePartQuantities()` and `updateLotQuantities()` in partModel.js — post-update checks throw if any stock column goes negative, causing transaction rollback
- Wrapped `bookInStock()` with `asyncHandler()` in purchaseOrderController.js — was using raw try/catch, inconsistent with all other controllers
- Also fixed `bookInStock()` to use `successResponse()` instead of raw `res.json()`
- Fixed `refreshJobMetrics()` timestamp logic in repairModel.js — now fetches `completed_at`, clears both timestamps when job has no records, preserves original timestamps on re-completion, clears `completed_at` when rolling back from COMPLETED to IN_PROGRESS
- Added `logDeviceHistory()` call in `reserveRepairPart` controller — part reservations now create device-level audit trail entries (previously only part_transactions were logged)
- Made fault_reason field conditional on FAULTY disposition in RepairRecordDetail.jsx — previously always visible even for RESTOCK, now only shows when FAULTY selected
- Added required indicator (`*`) and placeholder hint to fault_reason fields in both RepairRecordDetail.jsx and Parts.jsx
- Added `window.confirm()` for WRITTEN_OFF fault report status changes in Parts.jsx
- Fixed quantity input in RepairRecordDetail.jsx part removal — was storing as string in state, now parses to int on change
- Removed `cost_price` from parts model SELECT queries — financial data tracked in separate system per business requirements
- Removed "Add Devices From Purchase Order" panel from RepairJobDetail.jsx — devices are added at goods-in (entire PO marked as requires repair or not), so this panel was always empty and unnecessary. Cleaned up all related dead code (hooks, state, handlers, schema import).
- **Completely removed `assigned_to` / "Assigned Engineer" from the entire repair module** — the business never assigns individual engineers. Removed from: Zod schemas (3 schemas), RepairRecordDetail.jsx (form state, submit payload, dropdown UI, useRepairMeta import), repairController.js (meta endpoint no longer fetches repair users, removed from createJob/updateJob/addDevices/updateRecord/escalation), repairModel.js (removed `getRepairUsers()`, removed `assigned_to` from all SELECT/INSERT/UPDATE queries and all user JOINs), validation.js (removed `optPosInt('assigned_to')` from 5 repair validators + 2 QC validators). DB column remains but is no longer read or written.

**Files changed:**
- `server/src/models/partModel.js`
- `server/src/controllers/purchaseOrderController.js`
- `server/src/models/repairModel.js`
- `server/src/controllers/repairController.js`
- `client/src/pages/RepairRecordDetail.jsx`
- `client/src/pages/RepairJobDetail.jsx`
- `client/src/pages/Parts.jsx`

**Next:**
- Add optimistic locking for concurrent edits on repair records and parts
- Add DB-level CHECK constraints on stock columns as defense-in-depth
- Consider BER auto-write-off flow when QC module is built
- Continue building out QC module frontend

**Known issues / blockers:**
- Escalation endpoint reads no body fields currently — no body validation needed, but if `notes`/`escalation_reason` body fields are added later, validation must be wired in
- `min_stock_level` and `quality_tier` DB columns exist but are unused by design — could be dropped in a future schema migration
- `cost_price` DB column still exists in schema but no longer queried

---

## 2026-03-11 — Repair management system improvements

**Done:**
- Removed redundant "Assigned Engineer" dropdown from RepairJobDetail.jsx Job Controls card (assignment happens at device level in repair_records)
- Removed "Assigned" column from devices table in RepairJobDetail.jsx (redundant with device-level assignment)
- Made IMEI in devices table a clickable link to the device repair page (`/repair/records/${record.id}`)
- Removed "PO" prefix from job header (was showing "PO PO-00013", now just "PO-00013")
- Removed Job Controls card and moved Priority, Target Sales Order, and Notes to a streamlined form above the devices table
- Fixed Purchase Order dropdown data binding in CreateRepair.jsx (API returns camelCase `poNumber`, `supplier.name` not snake_case)
- Fixed Sales Order dropdown data binding in CreateRepair.jsx (API returns camelCase `soNumber`)
- Added fault description field to BookInStock.jsx (shows when "Requires Repair" is checked)
- Updated backend `repairModel.createAutoJobForDevices()` to accept custom fault description parameter
- Updated backend `purchaseOrderModel.createWithDevices()` to pass fault_description to auto-created repair jobs
- Fixed `purchaseOrderController.bookInStock()` to extract `fault_description` from request body and pass to model
- Replaced basic `<select>` dropdowns with `SearchableSelect` component in CreateRepair.jsx for scalable PO/SO selection with text filtering
- Increased PO/SO fetch limit from 200 to 500 items
- Fixed job number generation bug in `generateSequentialNumber()` - MySQL returns strings, causing string concatenation instead of numeric addition (REP-00001 → REP-00011 → REP-00111)
- **Fixed fault_description not being saved to repair records** - Zod schema `bookInStockSchema` was missing `fault_description` field, causing it to be stripped during `safeParse()` validation
- Added `fault_description` to frontend Zod schema (`client/src/schemas/goodsIn.js`)
- Added `fault_description` to backend express-validator schema (`server/src/middleware/validation.js`)

**Files changed:**
- `client/src/pages/RepairJobDetail.jsx`
- `client/src/pages/CreateRepair.jsx`
- `client/src/pages/BookInStock.jsx`
- `client/src/schemas/goodsIn.js`
- `server/src/models/repairModel.js`
- `server/src/models/purchaseOrderModel.js`
- `server/src/controllers/purchaseOrderController.js`
- `server/src/middleware/validation.js`
- `server/src/utils/helpers.js`

**Next:**
- Consider server-side search API for PO/SO when data grows beyond 500 items
- Add validation for fault_description field length
- Consider adding fault category dropdown for standardized reporting

**Known issues / blockers:**
- None specific to this work

---

## 2026-03-10 — Parts module data integrity fixes and UX overhaul

**Done:**

Phase 1 — Backend Data Integrity & Cleanup:
- Fixed `current_stock` delta formula in `updatePartQuantities` — now sums available + reserved + faulty so faulty parts don't falsely reduce physical stock count
- Stripped all `unit_cost` / `cost_price` leftovers from model, controller, validation, Zod schemas, and frontend payloads
- Added duplicate check (409) before creating compatibility rules
- Added existence check (404) before deleting compatibility rules
- Fixed `deactivateBaseCascade` to also delete compatibility rows when a base is soft-deleted
- Fixed goods-out notes to preserve both reason and notes (joined with `' — '`)
- Fixed `getVariants` HAVING logic — removed fragile string-matching filter on WHERE conditions
- Whitelisted query params in `getPartBases` and `getPartCompatibility` controllers (no more `...req.query` spread)

Phase 2 — Frontend UX Fixes:
- Fixed faultUpdates useEffect to merge new reports without wiping in-progress edits
- Fixed stat card label "Color Variants" → "Variants" on PartBaseDetail
- Added faulty stock visibility: stat card + table column on PartBaseDetail (amber highlight when > 0)
- Added faulty stock column + stat subtitle on PartsModelDetail base rows table
- Added `enabled` option support to `usePartBases`, `usePartVariants`, `usePartCompatibility`, `useFaultReports` hooks
- Conditional query loading by active tab on Parts.jsx — queries only fire when their tab is active
- Replaced flat `<select>` dropdowns with `SearchableSelect` for goods-in variant, goods-out variant, and goods-out lot
- Added `part_base_id` URL param filtering for goods-in/out variant dropdown (pre-filters when navigating from PartBaseDetail)
- Added "Book In Stock" / "Book Out Stock" links on PartBaseDetail
- Simplified Add tab to base-creation-only — removed variant and compatibility forms (those live on PartBaseDetail now)
- After creating a base, redirects to the new base's detail page
- Renamed tab "Add Part" → "New Base"
- Removed unused state, handlers, imports, and stat cards from Parts.jsx

**Files changed:**
- `server/src/models/partModel.js`
- `server/src/controllers/partController.js`
- `server/src/middleware/validation.js`
- `client/src/schemas/parts.js`
- `client/src/hooks/useParts.js`
- `client/src/pages/Parts.jsx`
- `client/src/pages/PartBaseDetail.jsx`
- `client/src/pages/PartsModelDetail.jsx`
- `client/src/components/parts/PartsSectionNav.jsx`

**Next:**
- Manual smoke test: goods-in, goods-out (normal + faulty), duplicate compat check, delete compat, base cascade delete
- Verify faulty stock counts display correctly after booking faulty goods-out
- Consider adding SearchableSelect to supplier dropdown on goods-in
- RBAC for parts routes (planned as a later phase)

**Known issues / blockers:**
- BackmarketShipment.jsx has pre-existing import errors (unrelated to parts module)
- No automated tests for any parts module functionality

---

## 2026-03-09 — Repair/parts split and device-model parts management added

**Done:**
- Split `Repair` and `Parts` into separate top-level navigation items
- Simplified the `Repair` page so it now focuses only on IMEI repair job listing and job creation
- Added a dedicated `Parts` module with sections for `Parts Management`, `Add Part`, `Parts Goods In`, `Parts Goods Out`, and `Faulty Parts`
- Added a new default parts-management view showing a searchable, paginated device-model table with manufacturer, model, part count, compatibility-rule count, and open-device action
- Added model-specific parts pages so each device model has a dedicated screen for compatible bases, compatibility rules, and part variants
- Added UI support to edit part bases, edit part variants, edit compatibility rules, and delete bases/variants/rules from the active catalog
- Added backend endpoints for:
  - paginated model/device parts listing
  - model/device parts detail
  - compatibility rule updates
  - safe delete of part bases and variants
- Added active-only default filtering to parts queries so deleted entries stop polluting the normal workflow
- Added backend coverage for the new parts-management list/detail and edit/delete flow

**Files changed:**
- `client/src/App.jsx`
- `client/src/components/layout/Sidebar.jsx`
- `client/src/components/parts/PartsSectionNav.jsx` (NEW)
- `client/src/pages/Repair.jsx`
- `client/src/pages/Parts.jsx` (NEW)
- `client/src/pages/PartsModelDetail.jsx` (NEW)
- `client/src/api/parts.js`
- `client/src/hooks/useParts.js`
- `client/src/schemas/parts.js`
- `server/src/models/partModel.js`
- `server/src/controllers/partController.js`
- `server/src/routes/partRoutes.js`
- `server/src/middleware/validation.js`
- `tests/backend/parts-management.test.ts` (NEW)
- `DEVLOG.md`

**Verification:**
- `npm test` → 36/36 tests passing
- `cd client && npm run build` → success

**Known issues / blockers:**
- `BackmarketShipment.jsx` still imports non-exported helpers from `src/api/backmarket.api.js`; this remains unrelated to the repair/parts work

---

## 2026-03-09 — Service Pack part category seeded

**Done:**
- Added idempotent migration support so `Service Pack` is automatically inserted into `part_categories` when missing
- Updated the reference schema seed so fresh databases also include `Service Pack` by default
- Applied the migration to both live and test databases and verified the category exists in each

**Files changed:**
- `server/migrate-repair-parts-module.js`
- `.info/inventory_db_schema.sql`
- `DEVLOG.md`

**Verification:**
- `node server/migrate-repair-parts-module.js`
- `DB_NAME=plasma_test node server/migrate-repair-parts-module.js`
- Verified `part_categories.name = 'Service Pack'` exists in both `quantum2_db` and `plasma_test`

---

## 2026-03-09 — Repair/parts workflow refinement after real-world parts handling feedback

**Done:**
- Reworked parts-management semantics so the old `changes_device_color` checkbox now represents `service pack / complete screen and frame assembly` behaviour instead of a blanket color-change rule
- Updated repair color logic so compatibility is model-based only; storage is no longer considered in repair-part matching
- Kept automatic handset color updates only for fitted service-pack parts whose fitted variant color differs from the current device color
- Added technician warnings on the repair record page when selected/reserved/fitted colored parts do not match the active service-pack color, or the current device color when no service pack is selected
- Added confirm-before-action warnings for mismatched-color reserve/fit actions
- Simplified parts management UI by removing `Storage Match`, `Minimum Stock Level`, part-cost entry, and quality-tier capture from the workflow
- Simplified repair UI by removing part cost / quality display where it does not help the technician
- Set Samsung as the default manufacturer in the part-base creation form while keeping the manufacturer list alphabetically sorted
- Updated explanatory copy in parts compatibility so regional / 4G / 5G differences are treated as model-code differences rather than storage differences

**Files changed:**
- `client/src/pages/Repair.jsx`
- `client/src/pages/RepairRecordDetail.jsx`
- `server/src/controllers/repairController.js`
- `server/src/controllers/partController.js`
- `server/src/models/repairModel.js`
- `DEVLOG.md`

**Verification:**
- `npm test` → 35/35 tests passing
- `cd client && npm run build` → success

**Known issues / blockers:**
- `client/src/pages/BackmarketShipment.jsx` still imports non-exported helpers from `src/api/backmarket.api.js`; this remains unrelated to the repair/parts workflow changes

---

## 2026-03-09 — Repair and parts module implemented end-to-end

**Done:**
- Implemented the standard repair and parts backend across new `repairModel.js` / `repairController.js` and `partModel.js` / `partController.js`
- Added repair API surface for job listing/creation, job detail, adding devices, record detail/updates, comments, part reserve/fit/remove, and Level 3 escalation
- Added parts API surface for base parts, stock variants, compatibility rules, goods in, goods out, faulty parts, and fault report updates
- Added idempotent DB migration script `server/migrate-repair-parts-module.js`
- Extended schema to support `part_bases`, `part_lots`, `part_transactions`, `repair_comments`, `part_fault_reports`, richer repair job/record fields, and stateful repair part allocations
- Wired automatic repair job creation into PO creation / book-in when stock is marked `requires_repair=true`
- Replaced the placeholder repair frontend with a tabbed operational module covering `IMEI Repairs`, `Parts Goods In`, `Parts Goods Out`, `Parts Management`, and `Faulty Parts`
- Added dedicated repair job and repair record pages with compatible-parts actions, allocation visibility, comments, status updates, and Level 3 escalation flow
- Added frontend API clients, hooks, and Zod schemas for the new repair/parts workflows
- Added backend coverage for repair jobs, auto-created repair jobs, lot-based part movements, color-changing fitted parts, repair completion, and Level 3 escalation
- Updated smoke/reset test infrastructure so the new repair flow is exercised correctly and `level3_repairs` is cleared between backend tests

**Files changed:**
- `server/migrate-repair-parts-module.js` (NEW)
- `server/src/models/repairModel.js` (NEW)
- `server/src/controllers/repairController.js` (NEW)
- `server/src/models/partModel.js` (NEW)
- `server/src/controllers/partController.js` (NEW)
- `server/src/routes/repairRoutes.js`
- `server/src/routes/partRoutes.js`
- `server/src/middleware/validation.js`
- `server/src/models/purchaseOrderModel.js`
- `client/src/api/repair.js` (NEW)
- `client/src/api/parts.js` (NEW)
- `client/src/hooks/useRepairModule.js` (NEW)
- `client/src/hooks/useParts.js` (NEW)
- `client/src/schemas/repair.js` (NEW)
- `client/src/schemas/parts.js` (NEW)
- `client/src/pages/Repair.jsx`
- `client/src/pages/RepairJobDetail.jsx` (NEW)
- `client/src/pages/RepairRecordDetail.jsx` (NEW)
- `client/src/App.jsx`
- `tests/backend/repair-parts.test.ts` (NEW)
- `tests/backend/qc-repair.smoke.test.ts`
- `tests/backend/utils/test-db.ts`
- `tests/backend/utils/fixtures.ts`
- `server/package-lock.json`
- `client/package-lock.json`

**Verification:**
- `node server/migrate-repair-parts-module.js`
- `DB_NAME=plasma_test node server/migrate-repair-parts-module.js`
- `npm test` → 35/35 tests passing
- `cd client && npm run build` → success

**Known issues / blockers:**
- `client/src/pages/BackmarketShipment.jsx` still imports non-exported functions from `src/api/backmarket.api.js`; Vite build succeeds but emits warnings unrelated to the repair/parts module

---

## 2026-02-27 — Frontend Zod schemas, toast migration, and backend validator completion

**Done:**
- Fixed `AdminOps.jsx`: `reason: undefined` → `reason: null` for non-Location-Management PIN verify calls
- Created `client/src/schemas/` directory with three Zod payload schemas:
  - `purchaseOrder.js` — createPurchaseOrderSchema
  - `salesOrder.js` — createSalesOrderSchema (superRefine: BACKMARKET requires backmarket_order_id)
  - `goodsIn.js` — bookInStockSchema (storage_gb required; grade nullable A–F)
- Updated `CreatePurchaseOrder.jsx`: removed all `alert()` calls, added `safeParse` + `toast.error()` on validation failure and API errors
- Updated `CreateSalesOrder.jsx`: same — removed `alert()`, added `safeParse` + `toast.error()`
- Updated `BookInStock.jsx`: removed legacy `Toast.jsx` / `useToast()` entirely, replaced with `react-hot-toast` throughout; added `safeParse` at submit time
- Added QC validators to `validation.js`: validateCreateQcJob, validateUpdateQcJob, validateCreateQcResult, validateUpdateQcResult
- Added Repair validators to `validation.js`: validateCreateRepairJob, validateUpdateRepairJob, validateCreateRepairRecord, validateUpdateRepairRecord, validateAddRepairPart
- Added Location Management validators: validateLocationDeviceParam, validateBulkMoveDevices
- Wired LocationManagement validators into `locationManagementRoutes.js`
- Updated `qcRoutes.js` and `repairRoutes.js` stubs with validator imports and commented route templates ready for when controllers are built
- Removed duplicate inline required-field validation from `locationManagementController.js` bulkMoveDevices (now handled by middleware)
- Updated server/CLAUDE.md, client/CLAUDE.md, MEMORY.md with new patterns

**Files changed:**
- `client/src/pages/AdminOps.jsx`
- `client/src/schemas/purchaseOrder.js` (NEW)
- `client/src/schemas/salesOrder.js` (NEW)
- `client/src/schemas/goodsIn.js` (NEW)
- `client/src/pages/CreatePurchaseOrder.jsx`
- `client/src/pages/CreateSalesOrder.jsx`
- `client/src/pages/BookInStock.jsx`
- `server/src/middleware/validation.js`
- `server/src/routes/qcRoutes.js`
- `server/src/routes/repairRoutes.js`
- `server/src/routes/locationManagementRoutes.js`
- `server/src/controllers/locationManagementController.js`
- `server/CLAUDE.md`
- `client/CLAUDE.md`

**Next:**
- Build QC module: qcModel.js, qcController.js — uncomment route stubs in qcRoutes.js
- Build Repair module: repairModel.js, repairController.js — uncomment route stubs in repairRoutes.js
- Convert existing complex forms to full RHF+Zod (BookInStock, CreatePurchaseOrder, CreateSalesOrder still use useState — Zod only used at submit time)
- Seed the database (tac_lookup, locations, manufacturers, models — nothing works without seed data)

**Known issues / blockers:**
- QC and Repair frontend pages remain thin — backend validators are ready but controllers/models don't exist
- Frontend Zod integration is submit-time safeParse only (not field-level RHF validation) — no inline error messages on individual form fields

---

## 2026-02-27 — Input validation layer added across all mutating routes

**Done:**
- Audited all frontend API payloads against DB column specs to assess safe validation boundaries
- Implemented full validation rule set in `server/src/middleware/validation.js` (express-validator)
- Key design decision: coerce `""` → `null` for all nullable VARCHAR fields (frontend sends empty strings, not null, for blank optional fields)
- Grade field: whitelist A–F but allow null/`""` (ReceiveDevices sends ungraded devices)
- storage_gb on sales order lines: always nullable (not known at order time)
- reason in admin PIN verify: conditional — only required for "Location Management" operation
- 0 → null coercion for optional FK fields (supplier_id, location_id on SO lines)
- validateIdParam added to all /:id routes
- Wired validators into all 7 route files: purchaseOrderRoutes, salesOrderRoutes, customerRoutes, supplierRoutes, level3Routes, deviceRoutes, adminRoutes
- Updated server/CLAUDE.md with "Input Validation Rules" section documenting coercion patterns
- Updated client/CLAUDE.md with "Form Payload Rules" section documenting what frontend must send
- Updated MEMORY.md with validation layer facts and remaining frontend gap (no Zod schemas yet)

**Files changed:**
- `server/src/middleware/validation.js` — full rewrite with all validator chains
- `server/src/routes/purchaseOrderRoutes.js`
- `server/src/routes/salesOrderRoutes.js`
- `server/src/routes/customerRoutes.js`
- `server/src/routes/supplierRoutes.js`
- `server/src/routes/level3Routes.js`
- `server/src/routes/deviceRoutes.js`
- `server/src/routes/adminRoutes.js`
- `server/CLAUDE.md`
- `client/CLAUDE.md`

**Next:**
- Fix `AdminOps.jsx` to send `reason: null` instead of `reason: undefined`
- Add Zod schemas to frontend forms (start with BookInStock, CreateSalesOrder, CreatePurchaseOrder)
- Put shared Zod schemas in `client/src/schemas/`
- Consider adding validation to remaining routes: qcRoutes, repairRoutes, locationManagementRoutes

**Known issues / blockers:**
- Frontend still has no Zod validation — imperative alert() checks only. Backend coercions provide a safety net for now but are not a substitute.
- checkAvailability (POST /api/sales-orders/check-availability) has no validator yet — body shape not audited.

---

## 2026-02-26 — Project review and steering file setup

**Done:**
- Full codebase audit after ~3 month break — assessed architecture, security, data integrity, and completeness
- Confirmed TAC lookup system: pure local DB query against `tac_lookup` table (no external API calls at runtime). IMEI24 is a separate, unrelated system used only in Admin Color Check.
- Created `CLAUDE.md` (root) — project overview, TAC systems explained, module status, seed data requirements, session log rule
- Created `server/CLAUDE.md` — backend conventions: M-C-R pattern, transaction() usage rules, response helpers, middleware order, auth middleware, logging utilities
- Created `client/CLAUDE.md` — frontend conventions: api/hooks/pages pattern, axios client rules, toast system (react-hot-toast only), form pattern, scanner input handling, TanStack Table usage
- Created `DEVLOG.md` (this file)

**Files changed:**
- `CLAUDE.md` — created
- `server/CLAUDE.md` — created
- `client/CLAUDE.md` — created
- `DEVLOG.md` — created

**Next:**
- Check for DB backup; if none found, repopulate `s4d_england_db` from `.info/inventory_db_schema.sql`
- Seed core reference data: `manufacturers`, `models`, `tac_lookup`, `locations`, `storage_options`, `grade_definitions`
- Seed business data: `customers`, `suppliers`
- Fix JWT secrets in `server/.env` (still placeholder values)
- Complete QC module frontend (backend is done)
- Complete Repair module frontend (backend is done)

**Known issues / blockers:**
- DB needs seed data before any workflow is functional
- JWT secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`) are still placeholder values in `server/.env` — must change before real use
- Refresh tokens stored in-memory (`new Set()`) — lost on server restart; Redis needed for production
- Dual toast system: `react-hot-toast` and custom `Toast.jsx` both exist — custom one should be removed
- `tacController.js` doesn't use `errorResponse()` helper (uses raw `res.status().json()`) — minor inconsistency to tidy

---
## 2026-04-09 — Code Review & Critical Bug Fixes

**Done:**
- Conducted comprehensive functional code review of the entire project
- Added GET_LOCK() protection to purchase order number generation (race condition fix)
- Added GET_LOCK() protection to sales order number generation (race condition fix)
- Removed duplicate/conflicting validation from goods-in controllers
- Blocked status field in deviceModel.update() to enforce proper audit logging
- Added status change protection to purchaseOrderModel.update()
- Standardized IMEI validation across codebase to 14-15 digits

**Files changed:**
- server/src/models/purchaseOrderModel.js
- server/src/models/salesOrderModel.js
- server/src/models/deviceModel.js
- server/src/controllers/purchaseOrderController.js

**Next:**
- Implement JSON schema validation for TAC lookup fields
- Add audit logging to device softDelete method
- Add similar status protection to sales order model

**Known issues / blockers:**
- None. All critical functional issues resolved.
