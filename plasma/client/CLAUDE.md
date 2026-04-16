# Client - Frontend Conventions

React 18 + Vite. All components are `.jsx`. ES modules throughout.

## Directory Structure

```
src/
  App.jsx             - Router setup, layout wrapping, protected routes
  main.jsx            - App bootstrap (ReactDOM, QueryClient, AuthProvider)
  lib/
    api.js            - Axios instance with auth interceptors + token refresh
  context/
    AuthContext.jsx   - Auth state (user, token), login/logout, token persistence
  api/                - Plain async functions that call the API (no React)
  hooks/              - React Query hooks wrapping the api/ functions
  components/
    layout/           - Header.jsx, Sidebar.jsx, Layout.jsx
    ui/               - Reusable UI primitives (buttons, modals, inputs, etc.)
  pages/              - Full route-level page components
```

## Data Fetching Pattern

Every feature follows: `api/ function` → `hooks/ custom hook` → `pages/ component`

**1. API function** (`src/api/devices.js`) — pure async, no React:
```javascript
import api from '../lib/api';

export const getDevices = async (params) => {
  const { data } = await api.get('/devices', { params });
  return data;
};

export const updateDevice = async (id, payload) => {
  const { data } = await api.patch(`/devices/${id}`, payload);
  return data;
};
```

**2. Hook** (`src/hooks/useDevices.js`) — React Query wrapping:
```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDevices, updateDevice } from '../api/devices';
import toast from 'react-hot-toast';

export function useDevices(params) {
  return useQuery({
    queryKey: ['devices', params],
    queryFn: () => getDevices(params),
  });
}

export function useUpdateDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateDevice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast.success('Device updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message ?? 'Update failed');
    },
  });
}
```

**3. Page component** — consumes the hook:
```javascript
const { data, isLoading, isError } = useDevices({ page, status });
const updateDevice = useUpdateDevice();
```

## Axios Client (lib/api.js)

Single axios instance with base URL `VITE_API_URL` (defaults to `http://localhost:3001/api`).

- Request interceptor: attaches `Authorization: Bearer <token>` from localStorage
- Response interceptor: on 401, attempts silent token refresh via `POST /auth/refresh`, then retries original request
- On refresh failure: clears auth state and redirects to `/login`

Import as: `import api from '../lib/api';` — never create a new axios instance.

## Toast Notifications

Use **`react-hot-toast` exclusively**. The custom `Toast.jsx` component is legacy and should be removed when encountered.

```javascript
import toast from 'react-hot-toast';

toast.success('Devices received');
toast.error('IMEI not found in this purchase order');
toast.loading('Booking shipment...');  // returns an id
toast.dismiss(toastId);
```

`<Toaster />` is already mounted in `App.jsx`. Do not add another one.

## Forms

Use **React Hook Form + Zod** for all forms with user input.

```javascript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  imei: z.string().length(15, 'IMEI must be 15 digits').regex(/^\d+$/, 'Digits only'),
  quantity: z.number().int().positive(),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

## Scanner Inputs

IMEI scanner inputs need special handling — barcode scanners fire rapid keystrokes ending with Enter.

```javascript
const handleScannerInput = (e) => {
  if (e.key === 'Enter' && e.target.value.length === 15) {
    processScan(e.target.value);
    e.target.value = '';
  }
};

// Input should have: autoFocus, onKeyDown={handleScannerInput}
```

## TAC Lookup (goods-in workflow)

```javascript
import { lookupTac } from '../api/tac';

// When an IMEI is scanned:
const tac = imei.substring(0, 8);
const result = await lookupTac(tac);  // GET /api/tac/:tac

// result.data shape:
// { manufacturer, model, colors: [], storages: [], manufacturerId, modelId }

// Use colors and storages to populate dropdowns
// Use manufacturerId + modelId to match against PO lines
```

## Tables

Use **TanStack React Table** for all data tables. Server-side pagination/sorting/filtering.

- Pagination state: `{ pageIndex, pageSize }` (default pageSize 25)
- Pass `pageIndex` and `pageSize` as query params to the API
- API returns `{ data, total, totalPages, page }`
- Keep filter state in `useState` alongside pagination state

## Protected Routes

Routes are wrapped in `<ProtectedRoute>` in `App.jsx`. It checks `AuthContext` for a valid user and redirects to `/login` if unauthenticated.

Role-specific pages should additionally check `user.role` and show a 403 message or redirect if the user lacks permission.

## Loading and Error States

Every page that fetches data must handle all three states:

```jsx
if (isLoading) return <div className="p-6">Loading...</div>;
if (isError) return <div className="p-6 text-red-600">Failed to load data.</div>;
```

Use skeleton loaders for tables (shimmer rows), spinners for action buttons.

## Adding a New Page

1. Create `src/api/feature.js` — API call functions
2. Create `src/hooks/useFeature.js` — React Query hooks
3. Create `src/pages/Feature.jsx` — page component
4. Add the route in `App.jsx` under the appropriate layout
5. Add nav link in `components/layout/Sidebar.jsx` if needed

## Form Payload Rules

The backend validates all mutating endpoints. Follow these rules to avoid 400 errors:

**1. Optional fields must send `null`, not `""`**

The backend coerces `""` → `null`, but future strict validation may not. Use Zod transforms to be safe:
```javascript
const schema = z.object({
  notes: z.string().optional().transform(v => v === '' ? null : v ?? null),
  supplier_ref: z.string().optional().transform(v => v === '' ? null : v ?? null),
});
```
For forms not yet using Zod, manually convert: `notes: formValue || null`.

**2. `reason` in Admin PIN verify must be `null`, not `undefined`**

```javascript
// Wrong — undefined is dropped from JSON
{ pin, operation, reason: undefined }

// Correct — null is serialised in JSON
{ pin, operation, reason: null }
```

**3. Grade fields accept null for ungraded devices**

Always send `grade: null` (not `""` or `"none"`) when a device has no grade assigned.

**4. `storage_gb` on sales order lines is optional**

Omit it or send `null` when storage is not specified — never send `0`.

**5. FK filter fields (`supplier_id`, `location_id` on SO lines)**

If a user clears a filter select, send `null` — not `0` or `"0"`. The backend coerces `0` → `null` currently, but source data should be clean.

**6. No `alert()` validation**

All new forms must use React Hook Form + Zod. Put schemas in `src/schemas/` and import them into pages. Do not add validation logic inline in submit handlers.

**7. Zod schemas live in `src/schemas/` by domain**

- `src/schemas/purchaseOrder.js` — `createPurchaseOrderSchema`
- `src/schemas/salesOrder.js` — `createSalesOrderSchema`
- `src/schemas/goodsIn.js` — `bookInStockSchema`

For existing complex forms that use `useState` (not RHF): use `schema.safeParse(payload)` at submit time. New forms should use full RHF + `zodResolver` integration.

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
