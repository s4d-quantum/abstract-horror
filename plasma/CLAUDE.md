# Plasma - Inventory Management System

## Session Log Rule

**At the end of every session where any code or files were changed, update [DEVLOG.md](DEVLOG.md) before finishing.**

Entry format:
```
## YYYY-MM-DD — Short title describing the session

**Done:**
- bullet points of everything changed or implemented

**Files changed:**
- list every file that was created or modified

**Next:**
- what should be picked up next session

**Known issues / blockers:**
- anything broken, incomplete, or decisions deferred
```

Do not skip this even for small changes. It is the primary record of project progress.

Mobile device refurbishment company. Manages the full device lifecycle: goods in (purchase orders), QC, repair, goods out (sales orders + Backmarket B2C), admin ops, and courier integrations.

## Running the Project

```bash
# From project root - starts both server (3001) and client (5173)
npm run dev

# Or individually
cd server && npm run dev
cd client && npm run dev
```

Default login: `admin` / `admin123`

## Tech Stack

- **Backend**: Node.js + Express (ES modules), MySQL/MariaDB via `mysql2/promise`, JWT auth
- **Frontend**: React 18, Vite, React Router v6, TanStack Query, TanStack Table, Tailwind CSS, React Hook Form + Zod
- **DB**: `quantum2_db` on localhost, user `plasma`

## Architecture

`server/src/`: models → controllers → routes (strict separation)
`client/src/`: api functions → custom hooks (React Query) → pages

Detailed conventions: see [server/CLAUDE.md](server/CLAUDE.md) and [client/CLAUDE.md](client/CLAUDE.md).

## Core Architectural Rules (Mandatory)

1. **Database Transactions**: Any operation involving multiple tables or multiple row writes (e.g., updating a device status AND inserting into device_history, or executing multiple inserts) MUST use the `transaction()` wrapper from `server/src/config/database.js`. Manual `connection.beginTransaction()` usage is deprecated.
2. **Input Validation**: All `POST`, `PUT`, and `PATCH` routes MUST have `express-validator` middleware. For routes lacking frontend Zod schemas, utilize coercion strategies to bridge the gap; otherwise, strictly validate payload types and structure.

## TAC Lookup - Two Systems

**System 1 - Primary (goods-in workflow):**
- Route: `GET /api/tac/:tacCode` and `GET /api/tac/model/:modelId`
- Table: `tac_lookup` — maps 8-digit TAC prefix to `manufacturer_id`, `model_id`, `possible_storage` (JSON), `possible_colors` (JSON)
- Used in: `ReceiveDevices.jsx`, `BookInStock.jsx` — extract `imei.substring(0, 8)`, call `lookupTac(tac)`, auto-populate color/storage options
- This is the **primary lookup** — seed this table for the system to work

**System 2 - Secondary (admin color check only):**
- Service: `server/src/services/imei24Service.js` — calls `https://pro.imei24.com/apii.php`
- Cache-first: checks `color_check_cache` table before making external calls
- Used only in `ColorCheck.jsx` / `colorCheckController.js`
- Updates `devices.oem_color` field

## Critical Known Issues

1. **JWT secrets** - `server/.env` still has placeholder values (`your_jwt_secret_here...`). Change before any real use.
2. **Refresh tokens** - stored in-memory (`new Set()`). Lost on server restart. Redis needed for production.
3. **Dual toast system** - `react-hot-toast` and a custom `Toast.jsx` both exist. Use `react-hot-toast` exclusively; the custom component should be removed.
4. **No tests** - zero test coverage. Add tests as each module is touched.

## Database Seed Data Needed

Fresh install requires seeding:
- `manufacturers` and `models` (core reference)
- `tac_lookup` (required for goods-in scanning to work)
- `locations` (warehouse locations)
- `storage_options` and `grade_definitions`
- `customers` and `suppliers` (business data)
- `users` (default admin already seeded via `server/src/utils/seed.js`)

Schema: `.info/inventory_db_schema.sql`
Documentation: `.info/inventory_db_documentation.md`

## Module Completion Status

| Module | Backend | Frontend |
|---|---|---|
| Auth | Done | Done |
| Dashboard | Done | Done |
| Inventory | Done | Done |
| Goods In | Done | Done |
| Goods Out | Done | Done |
| Customers/Suppliers | Done | Done |
| Admin Ops / Color Check | Done | Done |
| Level 3 Repairs | Done | Done |
| QC | Done | Thin |
| Repair | Done | Thin |
| Backmarket integration | Done | Done |
| DPD/courier tracking | Done | Partial |

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
