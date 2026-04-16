# Server - Backend Conventions

Node.js + Express with ES modules (`"type": "module"` in package.json). All imports use `import/export`.

## Directory Structure

```
src/
  app.js              - Express app: middleware stack + route mounting
  server.js           - Entry point (port 3001, DB health check on start)
  config/
    database.js       - DB pool, query(), transaction() helpers
    constants.js      - Shared constant values
  models/             - Raw SQL queries only. No business logic.
  controllers/        - Request handling, validation, calls model/service
  routes/             - Route definitions + middleware assignment only
  middleware/
    auth.js           - verifyToken, requireRole, verifyPin, generateTokens
    validation.js     - asyncHandler wrapper
    errorHandler.js   - Global error handler (must be last middleware)
    notFoundHandler.js
  services/           - External API integrations (Backmarket, DPD, IMEI24, etc.)
  utils/
    helpers.js        - successResponse, errorResponse, buildFilterQuery,
                        buildPaginationResponse, logActivity, logDeviceHistory,
                        validateIMEI, extractTAC, formatDateForMySQL
    seed.js           - DB seeding utility
```

## Model Layer Rules

- SQL queries only — no business logic, no HTTP concerns
- Use `query(sql, params)` for single queries
- Use `transaction(async (conn) => { ... })` for multi-step writes
- Always use `?` placeholders — never string concatenation
- Return raw result data; let the controller shape the response

```javascript
import { query, transaction } from '../config/database.js';

// Simple query
export async function getById(id) {
  const [rows] = await query('SELECT * FROM devices WHERE id = ?', [id]);
  return rows[0] || null;
}

// Multi-step write — always use transaction
export async function createWithHistory(data) {
  return transaction(async (conn) => {
    const [result] = await conn.execute(
      'INSERT INTO devices (imei, status) VALUES (?, ?)',
      [data.imei, 'IN_STOCK']
    );
    await conn.execute(
      'INSERT INTO device_history (device_id, status, changed_by) VALUES (?, ?, ?)',
      [result.insertId, 'IN_STOCK', data.userId]
    );
    return { id: result.insertId };
  });
}
```

## Controller Layer Rules

- Wrap all async controllers with `asyncHandler` to catch promise rejections
- Use `successResponse` and `errorResponse` from `utils/helpers.js` — never call `res.json()` directly
- Validate input at the top of the controller before touching the DB
- 404 checks after every model fetch that may return null

```javascript
import { asyncHandler } from '../middleware/validation.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

export const getDevice = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const device = await deviceModel.getById(id);
  if (!device) {
    return errorResponse(res, 'Device not found', 'DEVICE_NOT_FOUND', 404);
  }

  return successResponse(res, { device }, 'Device retrieved');
});
```

## Response Format

All responses use these helpers. Do not deviate from this format.

```javascript
// Success
successResponse(res, data, message = 'Success', statusCode = 200)
// Produces: { success: true, message, ...data }

// Error
errorResponse(res, message, code = 'ERROR', statusCode = 400)
// Produces: { success: false, error: { code, message } }
```

**Error code conventions** (SCREAMING_SNAKE_CASE):
- `NOT_FOUND` suffix for 404s (e.g. `DEVICE_NOT_FOUND`, `PO_NOT_FOUND`)
- `INVALID_FORMAT` for malformed input
- `DUPLICATE_ENTRY` for unique constraint violations
- `MISSING_CREDENTIALS` / `INVALID_CREDENTIALS` for auth
- `INSUFFICIENT_PERMISSIONS` for 403s
- `INVALID_PIN` for PIN failures

## Route Layer Rules

- Route files define paths and assign middleware only — no logic
- Protected routes use `verifyToken` middleware
- Role-restricted routes use `requireRole('ADMIN', 'WAREHOUSE')` etc.
- Admin ops requiring PIN use `verifyPin` middleware

```javascript
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';

router.get('/', verifyToken, getAllDevices);
router.post('/bulk-move', verifyToken, requireRole('ADMIN', 'WAREHOUSE'), bulkMove);
```

## Transaction Rules

Use `transaction()` whenever a request involves **more than one write** to the database.

**Always use transaction for:**
- Creating a device + inserting device_history
- Receiving PO devices (update PO + create devices + log)
- Completing goods-out (update SO + update device statuses + log)
- Any status change that also writes to device_history

**Single-read or single-write:** use `query()` directly, no transaction needed.

**Row locking for read-then-write:**
```javascript
// Lock the row to prevent race conditions
const [rows] = await conn.execute(
  'SELECT id, status FROM devices WHERE id = ? FOR UPDATE',
  [deviceId]
);
```

## Middleware Stack (app.js order)

1. `helmet()` - security headers
2. `cors({ origin: 'http://localhost:5173' })`
3. `rateLimit()` - 100 req / 15 min per IP
4. `morgan()` - request logging
5. `express.json({ limit: '10mb' })`
6. `express.urlencoded({ limit: '10mb' })`
7. Route handlers
8. `notFoundHandler` - must be after all routes
9. `errorHandler` - must be absolutely last

## Auth Middleware

```javascript
import { verifyToken, requireRole, verifyPin } from '../middleware/auth.js';

verifyToken          // Validates JWT, sets req.user = { id, username, role }
requireRole(...roles) // Checks req.user.role, returns 403 if not in list
verifyPin            // Validates PIN from request body against stored hash
```

Available roles: `ADMIN`, `SALES`, `WAREHOUSE`, `QC`, `REPAIR`, `VIEWER`

Public routes (no auth): `/api/auth/*`, `/api/tac/*`

## Logging Utilities

Always log device status changes and significant operations:

```javascript
import { logDeviceHistory, logActivity } from '../utils/helpers.js';

// Log a device status change (writes to device_history)
await logDeviceHistory(conn, deviceId, oldStatus, newStatus, userId, notes);

// Log an activity (writes to activity_log — partitioned table, include log_date)
await logActivity(conn, userId, action, entityType, entityId, details);
```

The `activity_log` table is partitioned by quarter. Always pass `log_date` explicitly in inserts.

## Input Validation Rules

All mutating routes (POST/PATCH/PUT) must use validator chains from `middleware/validation.js` before the controller.

**Pattern:**
```javascript
import { validateCreateFoo, validateIdParam } from '../middleware/validation.js';

router.post('/', validateCreateFoo, createFoo);
router.patch('/:id', validateIdParam, validateUpdateFoo, updateFoo);
```

**Critical rules when writing new validators:**

1. **Never reject empty strings for nullable fields** — coerce `""` → `null`:
   ```javascript
   body('notes').optional({ nullable: true }).customSanitizer((v) => v === '' ? null : v)
   ```
   Use the `nullableString(fieldPath)` helper already in `validation.js`.

2. **Grade field** — whitelist A–F but allow null/`""`:
   ```javascript
   body('grade')
     .optional({ nullable: true })
     .customSanitizer((v) => v === '' ? null : v)
     .if(body('grade').not().isIn([null, undefined]))
     .isIn(['A', 'B', 'C', 'D', 'E', 'F'])
   ```

3. **storage_gb on sales order lines is always nullable** — never require it.

4. **Conditional validation** — use `.custom()` for fields that are only required in some cases:
   ```javascript
   body('reason').custom((value, { req }) => {
     if (req.body.operation === 'Location Management') {
       if (!value || !String(value).trim()) throw new Error('reason required');
     }
     return true;
   })
   ```

5. **Coerce 0 → null for optional FK fields** (`supplier_id`, `location_id` on SO lines):
   ```javascript
   .customSanitizer((v) => (v === 0 || v === '0' ? null : v))
   ```

6. **Pagination query params** are URL strings — coerce with `.toInt()`, never strictly require `number` type.

7. **Always add `validateIdParam`** to routes with `/:id`.

8. **QC and Repair validators are pre-defined** in `validation.js` — wire them in as controllers are built. These modules are currently stub status (no controllers/models exist yet).

## Adding a New Route/Feature

1. Create `models/featureModel.js` — SQL queries
2. Create `controllers/featureController.js` — handlers using `asyncHandler`
3. Create `routes/featureRoutes.js` — paths + middleware
4. Add validator arrays to `middleware/validation.js` for each mutating endpoint
5. Mount in `app.js`: `app.use('/api/feature', featureRoutes)`

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
