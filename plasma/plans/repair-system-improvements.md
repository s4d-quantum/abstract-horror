# Repair Management System - Improvements Plan

## Executive Summary

This plan addresses multiple issues and inconsistencies in the repair management module, focusing on:
1. Removing redundant UI elements
2. Fixing broken dropdown functionality  
3. Implementing scalable selection mechanisms for large datasets
4. Verifying and enhancing auto-creation of repair jobs from goods-in workflow

---

## Issues Identified

### Issue 1: Assigned Engineer Dropdown in Job Controls

**Location:** [`RepairJobDetail.jsx`](client/src/pages/RepairJobDetail.jsx:227-241)

**Problem:** The "Assigned Engineer" dropdown exists at the job level, but repair assignments are actually tracked at the individual device/record level (`repair_records.assigned_to`). This creates confusion - should engineers be assigned to the whole job or individual devices?

**Recommendation:** 
- **Option A (Recommended):** Remove the job-level assignment dropdown entirely since assignment happens at device level
- **Option B:** Repurpose as "Default Assignee" that pre-populates new device records when adding devices to the job

---

### Issue 2: Purchase Order Dropdown Not Working

**Location:** [`CreateRepair.jsx`](client/src/pages/CreateRepair.jsx:69-81)

**Root Cause:** The API returns data with camelCase properties and nested supplier object:

```javascript
// API response structure (from purchaseOrderController.js:40-48)
{
  id: order.id,
  poNumber: order.po_number,        // camelCase
  supplier: {                        // nested object
    id: order.supplier_id,
    name: order.supplier_name
  }
}
```

But the code expects snake_case and flat structure:
```javascript
order.po_number      // Wrong - should be order.poNumber
order.supplier_name  // Wrong - should be order.supplier?.name
```

**Fix:** Update the property names to match the actual API response structure.

---

### Issue 3: Scalability of Dropdowns

**Problem:** Simple dropdowns will become unusable with hundreds of PO/SO entries.

**Solution:** Use the existing [`SearchableSelect`](client/src/components/SearchableSelect.jsx) component which provides:
- Text search/filter capability
- Keyboard navigation
- Clear button
- Custom label/value accessors

---

### Issue 4: Auto-Creation of Repair Jobs

**Status:** ✅ Already Implemented

The auto-creation feature IS already implemented:
- [`BookInStock.jsx`](client/src/pages/BookInStock.jsx:24) has `requires_repair` checkbox
- [`purchaseOrderModel.js`](server/src/models/purchaseOrderModel.js:455-457) calls `repairModel.createAutoJobForDevices()` when `requires_repair` is true
- [`repairModel.js`](server/src/models/repairModel.js:625-657) contains the `createAutoJobForDevices()` function

**Potential Enhancement:** Add an optional fault description field to the book-in form for devices requiring repair.

---

## Implementation Plan

### Phase 1: Quick Fixes

#### 1.1 Fix Purchase Order Dropdown in CreateRepair.jsx

**File:** `client/src/pages/CreateRepair.jsx`

**Changes:**
```jsx
// Before (line 76-80)
{purchaseOrders.map((order) => (
  <option key={order.id} value={order.id}>
    {order.po_number} - {order.supplier_name}
  </option>
))}

// After
{purchaseOrders.map((order) => (
  <option key={order.id} value={order.id}>
    {order.poNumber || order.po_number} - {order.supplier?.name || order.supplier_name}
  </option>
))}
```

#### 1.2 Fix Sales Order Dropdown in CreateRepair.jsx

**File:** `client/src/pages/CreateRepair.jsx`

**Changes:**
```jsx
// Before (line 107-111)
{salesOrders.map((order) => (
  <option key={order.id} value={order.id}>
    {order.so_number} - {order.status}
  </option>
))}

// After
{salesOrders.map((order) => (
  <option key={order.id} value={order.id}>
    {order.soNumber || order.so_number} - {order.status}
  </option>
))}
```

#### 1.3 Remove Assigned Engineer from Job Controls

**File:** `client/src/pages/RepairJobDetail.jsx`

**Changes:** Remove lines 227-241 (the Assigned Engineer dropdown from Job Controls form)

---

### Phase 2: Implement Searchable Dropdowns

#### 2.1 Update CreateRepair.jsx to Use SearchableSelect

**File:** `client/src/pages/CreateRepair.jsx`

Replace basic dropdowns with SearchableSelect component:

```jsx
import SearchableSelect from '../components/SearchableSelect';

// Replace PO dropdown with:
<SearchableSelect
  options={purchaseOrders}
  value={jobForm.purchase_order_id}
  onChange={(value) => setJobForm({ ...jobForm, purchase_order_id: value })}
  placeholder="Select Purchase Order..."
  getOptionLabel={(order) => `${order.poNumber || order.po_number} - ${order.supplier?.name || order.supplier_name || 'Unknown'}`}
  getOptionValue={(order) => order.id}
/>

// Replace SO dropdown with:
<SearchableSelect
  options={salesOrders}
  value={jobForm.target_sales_order_id}
  onChange={(value) => setJobForm({ ...jobForm, target_sales_order_id: value })}
  placeholder="Select Target Sales Order (optional)..."
  getOptionLabel={(order) => `${order.soNumber || order.so_number} - ${order.status}`}
  getOptionValue={(order) => order.id}
/>
```

#### 2.2 Update RepairJobDetail.jsx to Use SearchableSelect

**File:** `client/src/pages/RepairJobDetail.jsx`

Replace Target Sales Order dropdown with SearchableSelect component.

---

### Phase 3: Enhance Auto-Creation (Optional)

#### 3.1 Add Fault Description to Book-In Form

**File:** `client/src/pages/BookInStock.jsx`

Add an optional fault description field that appears when `requires_repair` is checked:

```jsx
const [faultDescription, setFaultDescription] = useState('');

// In the form, show when requires_repair is true:
{requiresRepair && (
  <div className="mt-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Fault Description (Optional)
    </label>
    <textarea
      value={faultDescription}
      onChange={(e) => setFaultDescription(e.target.value)}
      className="input w-full"
      rows="2"
      placeholder="Describe the known fault..."
    />
  </div>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `client/src/pages/CreateRepair.jsx` | Fix data binding, add SearchableSelect |
| `client/src/pages/RepairJobDetail.jsx` | Remove Assigned Engineer, add SearchableSelect |
| `client/src/pages/BookInStock.jsx` | Optional: Add fault description field |
| `server/src/models/purchaseOrderModel.js` | Optional: Pass fault description to auto-job creation |
| `server/src/models/repairModel.js` | Optional: Accept fault description in createAutoJobForDevices |

---

## User Decisions (Confirmed)

1. **Assigned Engineer Handling:** ✅ Remove completely (assignment is at device level)

2. **Fault Description on Book-In:** ✅ Add optional fault description field when "Requires Repair" is checked

3. **Searchable Dropdowns:** With 100+ orders/day, client-side filtering won't scale. Options:
   - **Option A (Recommended):** Use SearchableSelect with server-side search API
   - **Option B:** Text input with autocomplete - user types PO number directly
   - **Option C:** Limit dropdown to recent orders (last 30/60/90 days) with date filter

---

## Final Implementation Plan

### Phase 1: Quick Fixes

#### 1.1 Fix Purchase Order Dropdown Data Binding
**File:** `client/src/pages/CreateRepair.jsx`
- Change `order.po_number` to `order.poNumber || order.po_number`
- Change `order.supplier_name` to `order.supplier?.name || order.supplier_name`

#### 1.2 Fix Sales Order Dropdown Data Binding
**File:** `client/src/pages/CreateRepair.jsx`
- Change `order.so_number` to `order.soNumber || order.so_number`

#### 1.3 Remove Assigned Engineer from Job Controls
**File:** `client/src/pages/RepairJobDetail.jsx`
- Remove the Assigned Engineer dropdown (lines 227-241)

### Phase 2: Add Fault Description to Book-In

#### 2.1 Add Fault Description Field
**File:** `client/src/pages/BookInStock.jsx`
- Add `faultDescription` state
- Show textarea when `requiresRepair` is true
- Pass to API when booking

#### 2.2 Update Backend to Accept Fault Description
**File:** `server/src/models/purchaseOrderModel.js`
- Pass fault description to `createAutoJobForDevices()`

**File:** `server/src/models/repairModel.js`
- Update `createAutoJobForDevices()` to accept custom fault description

### Phase 3: Scalable PO/SO Selection

#### 3.1 Implement Server-Side Search (Recommended)
Create search endpoints:
- `GET /api/purchase-orders/search?q=...&limit=20`
- `GET /api/sales-orders/search?q=...&limit=20`

Update SearchableSelect to use async search with debouncing.

#### 3.2 Alternative: Text Input with Verification
Allow users to type PO number directly, then verify it exists on submit.

---

## Next Steps

1. Switch to Code mode to implement changes
2. Update DEVLOG.md after completion
