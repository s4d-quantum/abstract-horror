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
