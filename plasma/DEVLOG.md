## 2026-04-17 — Repair agent-damaged files: purchaseOrderController/Model + salesOrderModel + full server audit

**Done:**
- purchaseOrderController.js: valid, follows asyncHandler/successResponse conventions
- purchaseOrderModel.js: fixed missing `fault_description=null` param in two `repairModel.createAutoJobForDevices()` calls (lines 343,499); transactions/SQL correct
- salesOrderModel.js: complex legacy fallback code intact/valid; no syntax/transaction issues
- Full server/src audit: no syntax errors (`node -c` clean), no broken imports, models/controllers follow CLAUDE.md patterns
- Startup fails on missing .env vars (BM_API_AUTH, IDEAL_POSTCODES_API_KEY, DPD vars) — pre-existing placeholders, not agent damage
- Confirmed qcModel/repairModel functions exist and match calls

**Files changed:**
- server/src/models/purchaseOrderModel.js

**Next:**
- Copy server/.env.example → server/.env and populate real values to start server
- Run `cd server && npm run dev` post-env setup

**Known issues / blockers:**
- Env vars missing (pre-existing; server starts clean once set)

## 2026-04-20 — Quantum poller/orchestrator MVP worker

**Done:**
- Added a standalone Quantum poller worker in `server/poll-quantum-outbox.js` with one-shot and watch modes, root/server env loading, durable checkpointing, retry handling, and dead-letter stopping behavior
- Added poller-owned Plasma schema/migration support for `quantum_poller_state` and `quantum_poller_attempts`, plus DB helpers for checkpoint reads/writes and attempt status tracking
- Implemented Quantum outbox batch reading and coalescing for purchases, QC, sales orders, and device moves, including newest-move wins semantics per IMEI
- Implemented Quantum snapshot builders for purchase sync, QC sync, requirement-only sales-order sync, and move normalization with HTTP dispatch to Plasma automation routes via `x-plasma-robot-key`
- Added focused backend tests covering schema initialization, coalescing, purchase/QC/sales-order/move payload generation, retry vs permanent classification, checkpoint advancement, and malformed-payload dead-lettering
- Verified the new poller test suite and the existing automation sync suite together: `npx vitest run --project backend tests/backend/automation-sync.test.ts tests/backend/quantum-poller.test.ts`

**Files changed:**
- DEVLOG.md
- server/package.json
- server/poll-quantum-outbox.js
- server/migrate-quantum-poller.js
- server/src/services/plasmaAutomationClient.service.js
- server/src/services/quantumPoller.service.js
- server/src/services/quantumSnapshotBuilder.service.js
- tests/backend/setup.ts
- tests/backend/utils/test-db.ts
- tests/backend/quantum-poller.test.ts

**Next:**
- Exercise `npm run poller:run-once` against the real Quantum outbox and local Plasma server with `PLASMA_AUTOMATION_KEY` set, then inspect the new poller tables for checkpoint/attempt records
- Decide whether we want an operator-facing README/runbook for backfills, retry inspection, and dead-letter intervention

**Known issues / blockers:**
- The worker and tests are implemented, but I did not perform a live end-to-end run against the real Quantum DB and a running Plasma API in this session
