# Parts Module Remediation Plan

Based on code review findings and user notes. Covers bugs, security, performance, frontend improvements, and cleanup of scrapped features.

---

## Phase 1 — Critical Bug Fixes

### 1.1 Fix `current_stock` delta formula (partModel.js:710)

**Problem:** `current_stock` delta only sums `available + reserved + faulty`, omitting `consumed` and `issued`. This means state transitions (reserve, fault, issue) cause `current_stock` to drift from the sum of sub-states.

**Fix:** Sum all five deltas so `current_stock` only changes on true goods-in (+N) or goods-out/waste (-N):

```js
// Line 710 — change from:
(deltas.available || 0) + (deltas.reserved || 0) + (deltas.faulty || 0)
// To:
(deltas.available || 0) + (deltas.reserved || 0) + (deltas.consumed || 0) + (deltas.faulty || 0) + (deltas.issued || 0)
```

**File:** `server/src/models/partModel.js:710`

---

### 1.2 Fix transaction error-object pattern — throw instead of returning error objects

**Problem:** `deletePartBase`, `deletePartVariant`, `partGoodsIn`, `partGoodsOut` all return `{ isError: true, ... }` inside `transaction()` callbacks. The transaction auto-commits (no-op if no writes, but semantically fragile).

**Fix:** Replace returned error objects with thrown errors. Create a small `AppError` class or use plain `Error` with status/code properties. Wrap the `transaction()` call in try/catch in each controller.

**Files:**
- `server/src/controllers/partController.js` — all four transaction-using functions (lines 224-291, 259-291, 294-341, 343-406)

**Approach:**
1. Add a lightweight `AppError` class to `server/src/utils/helpers.js`:
   ```js
   export class AppError extends Error {
     constructor(message, code, statusCode) {
       super(message);
       this.code = code;
       this.statusCode = statusCode;
     }
   }
   ```
2. In each controller, change the pattern from:
   ```js
   const result = await transaction(async (connection) => {
     if (!existing) return { isError: true, status: 404, ... };
     // ...
     return { isError: false };
   });
   if (result.isError) return errorResponse(res, ...);
   ```
   To:
   ```js
   try {
     await transaction(async (connection) => {
       if (!existing) throw new AppError('Part base not found', 'PART_BASE_NOT_FOUND', 404);
       // ...
     });
   } catch (err) {
     if (err instanceof AppError) return errorResponse(res, err.message, err.code, err.statusCode);
     throw err;
   }
   ```

---

### 1.3 Fix race condition in negative-stock checks

**Problem:** `updateLotQuantities` and `updatePartQuantities` (lines 661-735) do UPDATE then SELECT-then-check. Between those steps, concurrent transactions can drive values negative.

**Fix:** Use atomic UPDATE with a WHERE guard:

```js
// In updateLotQuantities — replace UPDATE + SELECT pattern with:
const [result] = await execute(
  `UPDATE part_lots
   SET available_quantity = available_quantity + ?,
       reserved_quantity = reserved_quantity + ?,
       consumed_quantity = consumed_quantity + ?,
       faulty_quantity = faulty_quantity + ?,
       issued_quantity = issued_quantity + ?
   WHERE id = ?
     AND (available_quantity + ?) >= 0
     AND (reserved_quantity + ?) >= 0
     AND (consumed_quantity + ?) >= 0
     AND (faulty_quantity + ?) >= 0
     AND (issued_quantity + ?) >= 0`,
  [
    deltas.available || 0, deltas.reserved || 0, deltas.consumed || 0, deltas.faulty || 0, deltas.issued || 0,
    id,
    deltas.available || 0, deltas.reserved || 0, deltas.consumed || 0, deltas.faulty || 0, deltas.issued || 0,
  ],
);
if (result.affectedRows === 0) {
  throw new Error('Part lot stock cannot go negative — operation would result in invalid quantities');
}
```

Same pattern for `updatePartQuantities` with its six columns (including `current_stock`).

**File:** `server/src/models/partModel.js:661-735`

---

### 1.4 Fix `deactivateBaseCascade` transaction safety

**Problem:** If called without a connection, the three statements run outside a transaction.

**Fix:** Remove the `connection = null` default — make `connection` a required parameter. This forces all callers to provide a transactional connection.

**File:** `server/src/models/partModel.js:582-588`

```js
// Change signature from:
async deactivateBaseCascade(id, connection = null) {
// To:
async deactivateBaseCascade(id, connection) {
```

Verify the only caller (`deletePartBase` controller) already passes a connection — confirmed at line 248.

---

### 1.5 Fix `getVariantById` missing category join

**Problem:** `getVariantById` (line 223-253) does not join `part_categories`, so the response lacks `category_name`.

**Fix:** Add the same LEFT JOIN on `part_categories` and select `pc.name AS category_name` as done in `getVariants`.

**File:** `server/src/models/partModel.js:223-253`

---

## Phase 2 — Compatibility Cleanup (storage_gb removal)

### 2.1 Remove `storage_gb` from compatibility system

**User decision:** `storage_gb` was added accidentally and has no relevance for part compatibility. All values are 0.

**Changes:**

1. **Model — `addCompatibility`** (`server/src/models/partModel.js:417-429`): Remove `storage_gb` from INSERT.
2. **Model — `updateCompatibility`** (`server/src/models/partModel.js:431-451`): Remove `storage_gb` from `allowedFields`.
3. **Model — `getCompatibility`** queries: Remove `pc.storage_gb` from SELECT (multiple places).
4. **Controller — `createPartCompatibility`** (`server/src/controllers/partController.js:168`): Remove `storage_gb: 0` from the model call.
5. **Controller — `updatePartCompatibility`** (`server/src/controllers/partController.js:200`): Remove `storage_gb: 0` from the model call.
6. **Backend validator** (`server/src/middleware/validation.js:725-747`): Remove `storage_gb` validators from `validateCreatePartCompatibility` and `validateUpdatePartCompatibility`.
7. **Frontend Zod schema** (`client/src/schemas/parts.js:28-35`): Remove `storage_gb` from `createPartCompatibilitySchema`.
8. **Frontend — `PartBaseDetail.jsx`**: Remove `storage_gb: 0` from `handleSubmitCompatibility` payload (line 234).
9. **DB migration** (optional): Run `ALTER TABLE part_compatibility DROP COLUMN storage_gb;` — but only if no other code references it.

**Files:** 6 files (model, controller, validation, schema, PartBaseDetail.jsx, migration SQL)

---

### 2.2 Remove `part_base_id` from variant updatable fields

**Problem:** A user can change a variant's `part_base_id` to point to an incompatible base.

**Fix:** Remove `'part_base_id'` from `allowedFields` in `updateVariant` (`server/src/models/partModel.js:325-335`).

Also remove `optPosInt('part_base_id')` from `validateUpdatePartVariant` in `server/src/middleware/validation.js:699-723`.

**Files:**
- `server/src/models/partModel.js:325`
- `server/src/middleware/validation.js:700`

---

## Phase 3 — Frontend Zod Schema Fixes

### 3.1 Create proper update schemas with all fields optional

**Problem:** `updatePartBaseSchema`, `updatePartVariantSchema`, and `updatePartCompatibilitySchema` are aliases of their create counterparts. PATCH endpoints accept partial updates but frontend schemas require all fields.

**Fix:** In `client/src/schemas/parts.js`, replace aliases with proper partial schemas:

```js
export const updatePartBaseSchema = z.object({
  base_code: z.string().min(3).optional(),
  name: z.string().min(2).optional(),
  category_id: z.number().int().positive().optional(),
  manufacturer_id: z.number().int().positive().nullable().optional(),
  subtype: z.string().nullable().optional(),
  changes_device_color: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

export const updatePartVariantSchema = z.object({
  sku: z.string().min(2).optional(),
  name: z.string().min(2).optional(),
  category_id: z.number().int().positive().optional(),
  color: z.string().nullable().optional(),
  quality_tier: z.enum(['OEM', 'OEM_PULL', 'PREMIUM', 'AFTERMARKET', 'REFURBISHED', 'OTHER']).optional(),
  supplier_part_ref: z.string().nullable().optional(),
});

export const updatePartCompatibilitySchema = z.object({
  model_id: z.number().int().positive().optional(),
  notes: z.string().nullable().optional(),
});
```

Note: `storage_gb` removed per Phase 3, `min_stock_level` and `part_base_id` removed per user notes (scrapped feature / removed from updateable).

**File:** `client/src/schemas/parts.js`

---

### 3.2 Remove `received_at` from frontend goods-in schema and form

**User decision:** `received_at` should be set automatically to the current date/time by the server — not user-editable.

**Changes:**
1. **Frontend Zod schema** (`client/src/schemas/parts.js:37-44`): No change needed — `received_at` is already absent.
2. **Backend controller** (`server/src/controllers/partController.js:295`): Remove `received_at` from destructured body. Always pass `received_at: new Date()` to `createLot`.
3. **Backend validator** (`server/src/middleware/validation.js:758-765`): Remove the `received_at` validator from `validatePartGoodsIn`.

The `createLot` model method already defaults `received_at` to `new Date()` (line 653), so simply not passing it from the controller achieves the desired behavior.

**Files:**
- `server/src/controllers/partController.js:295,311`
- `server/src/middleware/validation.js:758-765`

---

## Phase 4 — Scrapped Feature Removal

### 4.1 Remove `min_stock_level` from all code paths

**User decision:** Minimum stock level is a scrapped feature. No low-stock alerting needed.

**Changes:**
1. **Model — `createVariant`** (`server/src/models/partModel.js:286-319`): Remove `min_stock_level` from INSERT and parameter list.
2. **Model — `updateVariant`** (`server/src/models/partModel.js:325-335`): Remove `'min_stock_level'` from `allowedFields`.
3. **Model — `getVariants`** (`server/src/models/partModel.js:196`): Remove `p.min_stock_level` from SELECT.
4. **Model — `getVariantById`** (`server/src/models/partModel.js:240`): Remove `p.min_stock_level` from SELECT.
5. **Controller — `createPartVariant`** (`server/src/controllers/partController.js:122`): Remove `min_stock_level` from model call.
6. **Backend validators** (`server/src/middleware/validation.js:688-691,714-717`): Remove `min_stock_level` from both variant validators.
7. **Frontend Zod schemas** (`client/src/schemas/parts.js:23`): Remove `min_stock_level` from `createPartVariantSchema`.
8. **Frontend — `PartBaseDetail.jsx`** (`line 297`): Remove `min_stock_level` from variant submit payload.
9. **DB migration** (optional): `ALTER TABLE parts DROP COLUMN min_stock_level;`

**Files:** model, controller, validation, schema, PartBaseDetail.jsx, migration SQL

---

### 4.2 Remove `unit_cost` / cost-price references

**User decision:** No pricing/cost tracking in this system. `unit_cost` is a scrapped feature.

**Changes:**
1. **Model — `createLot`** (`server/src/models/partModel.js:631`): The INSERT already does not include `unit_cost` — confirmed (line 631-658). No change needed.
2. **Model — `getLotsForPartIds`** (`server/src/models/partModel.js:268`): Remove `pl.unit_cost` from SELECT.
3. **Model — `getLotById`** (`server/src/models/partModel.js:590-609`): Uses `pl.*` — no direct change but after DB column drop it won't appear.
4. **DB schema** (`inventory_db_schema.sql:758`): `cost_price DECIMAL(10, 2)` on `parts` table — remove from schema file (documentation only).
5. **DB migration** (optional): `ALTER TABLE part_lots DROP COLUMN unit_cost;` and `ALTER TABLE parts DROP COLUMN cost_price;`

**Files:** model (SELECT cleanup), schema docs, migration SQL

---

## Phase 5  — Performance & UI Improvements

### 5.1 Add pagination and status filter to Fault Reports tab

**Problem:** Fault reports tab loads ALL reports with no pagination or filtering.

**Backend changes:**
1. **Model — `getFaultReports`** (`server/src/models/partModel.js:805-846`): Add `pagination` parameter support (page, limit). Add `search` filter. Return `{ data, pagination }` shape.

**Frontend changes:**
2. **Parts.jsx** — faulty tab (lines 679-758): Add status filter dropdown, search input, pagination controls matching the management tab pattern.
3. **Hook** (`client/src/hooks/useParts.js:205-211`): Pass status/page/limit params through.
4. **API** (`client/src/api/parts.js:94-97`): Already passes params — no change needed.

**Files:**
- `server/src/models/partModel.js`
- `client/src/pages/Parts.jsx`
- `client/src/hooks/useParts.js` (if query key change needed)

---

### 5.2 Add server-side search to variant SearchableSelect for goods-in/out

**Problem:** Goods-in/out fetches ALL variants unfiltered. Doesn't scale.

**Backend changes:**
1. `GET /api/parts/variants` already supports `?search=` — confirmed in controller (line 97) and model (line 164-168). No backend changes needed.

**Frontend changes:**
2. **SearchableSelect component** (`client/src/components/SearchableSelect.jsx`): Add optional `onSearch` callback prop for debounced server-side search. When provided, use it instead of local filtering.
3. **Parts.jsx** goods-in/out tabs: Instead of fetching all variants, implement debounced search that calls the variants API with `?search=<term>`. Use the `onSearch` callback to dynamically load options.

**Files:**
- `client/src/components/SearchableSelect.jsx`
- `client/src/pages/Parts.jsx` (goods-in and goods-out sections)
- `client/src/hooks/useParts.js` (add a search-based variant hook)

---

### 5.3 Add bulk goods-in support

**Problem:** Each variant must be booked in individually.

**Backend:**
1. **New endpoint:** `POST /api/parts/goods-in/bulk` — accepts `{ items: [{ part_id, quantity, lot_ref, supplier_ref, notes }], supplier_id, notes }`.
2. **New validator:** `validateBulkGoodsIn` in `validation.js`.
3. **New controller function:** `partBulkGoodsIn` in `partController.js` — wraps all inserts in a single transaction.
4. **New model function:** reuse existing `createLot`, `updatePartQuantities`, `createTransaction` in a loop.

**Frontend:**
5. Add a "Bulk Goods In" tab or toggle on the goods-in section.
6. Allow adding multiple rows (part variant + quantity + lot ref) with a shared supplier.
7. Submit as single bulk request.

**Files:**
- `server/src/models/partModel.js` (no new model needed — reuse existing)
- `server/src/controllers/partController.js` (new function)
- `server/src/routes/partRoutes.js` (new route)
- `server/src/middleware/validation.js` (new validator)
- `client/src/pages/Parts.jsx` (bulk goods-in UI)
- `client/src/api/parts.js` (new API function)
- `client/src/hooks/useParts.js` (new hook)

---

## Phase 6 — Code Quality

### 6.1 Extract shared category-color logic to utility

**Problem:** Category-to-color detection logic is duplicated in `Parts.jsx:435-436` and `PartBaseDetail.jsx:443-444`.

**Fix:** Create a shared utility in `client/src/utils/parts.js`:

```js
export function categoryChangesDeviceColor(categoryName) {
  const name = String(categoryName || '').toLowerCase();
  return name === 'service pack' || name === 'frame';
}
```

Then import and use in both files.

**Files:**
- `client/src/utils/parts.js` (new)
- `client/src/pages/Parts.jsx`
- `client/src/pages/PartBaseDetail.jsx`

---

## Execution Order

| Order | Phase | Items | Estimated scope |
|---|---|---|---|
| 1 | Phase 1 | 1.1–1.5 (Critical bugs) | ~5 files, ~80 lines changed |
| 2 | Phase 2 | 2.1 (Security / RBAC) | ~1 file, ~15 lines changed |
| 3 | Phase 3 | 3.1–3.2 (storage_gb + variant base_id) | ~5 files, ~40 lines changed |
| 4 | Phase 4 | 4.1–4.2 (Zod schemas + received_at) | ~3 files, ~40 lines changed |
| 5 | Phase 5 | 5.1–5.2 (Scrapped feature removal) | ~5 files, ~30 lines changed |
| 6 | Phase 6 | 6.1–6.3 (Performance + bulk) | ~6 files, ~150+ lines added |
| 7 | Phase 7 | 7.1 (Code quality) | ~3 files, ~10 lines changed |

---

## Files Modified (Full List)

| File | Phases |
|---|---|
| `server/src/models/partModel.js` | 1.1, 1.3, 1.4, 1.5, 3.1, 3.2, 5.1, 5.2, 6.1 |
| `server/src/controllers/partController.js` | 1.2, 3.1, 4.2, 5.1, 6.3 |
| `server/src/routes/partRoutes.js` | 2.1, 6.3 |
| `server/src/middleware/validation.js` | 3.1, 3.2, 4.2, 5.1, 6.3 |
| `server/src/utils/helpers.js` | 1.2 (AppError class) |
| `client/src/schemas/parts.js` | 3.1, 4.1, 5.1 |
| `client/src/pages/Parts.jsx` | 6.1, 6.2, 6.3, 7.1 |
| `client/src/pages/PartBaseDetail.jsx` | 3.1, 5.1, 7.1 |
| `client/src/components/SearchableSelect.jsx` | 6.2 |
| `client/src/hooks/useParts.js` | 6.1, 6.2, 6.3 |
| `client/src/api/parts.js` | 6.3 |
| `client/src/utils/parts.js` (new) | 7.1 |

## Skipped (per user notes)

- **#4** (Race condition) — user didn't mention but it's a data integrity risk, included in Phase 1
- **#12** (Stock adjustment) — deferred to Admin Ops module
- **#13** (Low-stock alerting) — scrapped, removing `min_stock_level` in Phase 5
- **#14** (Inventory valuation) — scrapped cost tracking, removing in Phase 5
- **#15** (Bulk goods-in) — included in Phase 6
- **#16** (RHF+Zod forms) — noted, not in scope for this plan
- **#18** (Samsung default) — user confirmed deliberate, keeping as-is
