# Development Checklist

Use this checklist to track progress on each module implementation.

## Module Development Template

For each module, complete these steps:

### Backend
- [ ] Create model file in `server/src/models/`
- [ ] Implement database queries
- [ ] Create controller file in `server/src/controllers/`
- [ ] Implement business logic
- [ ] Update route file (already exists as placeholder)
- [ ] Add validation middleware
- [ ] Test endpoints with curl/Postman

### Frontend
- [ ] Create API functions in `client/src/api/`
- [ ] Create React Query hooks in `client/src/hooks/`
- [ ] Build page component
- [ ] Create feature-specific components
- [ ] Add to navigation (if needed)
- [ ] Test user flow

---

## Dashboard Module

### Backend
- [ ] `dashboardModel.js` - Query dashboard metrics
  - [ ] Get total in stock count
  - [ ] Get unprocessed orders count
  - [ ] Get devices booked in (7 days)
  - [ ] Get devices booked out (7 days)
  - [ ] Get returned devices (7 days)
  - [ ] Get awaiting QC count
  - [ ] Get awaiting repair count
- [ ] `dashboardController.js` - Dashboard endpoints
  - [ ] GET /metrics - Return all metrics
  - [ ] GET /recent-purchase-orders - Last 10 POs
  - [ ] GET /recent-sales-orders - Last 10 SOs
- [ ] Update `dashboardRoutes.js` with real handlers
- [ ] Test all endpoints

### Frontend
- [ ] `client/src/api/dashboard.js` - API functions
- [ ] `client/src/hooks/useDashboard.js` - React Query hooks
- [ ] `client/src/components/dashboard/MetricCard.jsx` - Widget component
- [ ] Update `client/src/pages/Dashboard.jsx`
  - [ ] Display metrics in cards
  - [ ] Show recent POs table
  - [ ] Show recent SOs table
  - [ ] Add loading states
  - [ ] Add error handling

---

## Inventory Module

### Backend
- [ ] `deviceModel.js`
  - [ ] getAll(filters, pagination)
  - [ ] getById(id)
  - [ ] getHistory(deviceId)
  - [ ] create(deviceData)
  - [ ] update(id, updates)
  - [ ] updateStatus(id, status)
- [ ] `deviceController.js`
  - [ ] GET / - List devices with filters
  - [ ] GET /:id - Device details
  - [ ] GET /:id/history - Device history
  - [ ] PATCH /:id - Update device
- [ ] Update `deviceRoutes.js`
- [ ] Test pagination, search, filters

### Frontend
- [ ] `client/src/api/devices.js`
- [ ] `client/src/hooks/useDevices.js`
- [ ] `client/src/components/inventory/DeviceTable.jsx` (TanStack Table)
- [ ] `client/src/components/inventory/DeviceFilters.jsx`
- [ ] `client/src/components/inventory/DeviceDetail.jsx`
- [ ] Update `client/src/pages/Inventory.jsx`
  - [ ] Implement table with sorting
  - [ ] Add search input
  - [ ] Add filter dropdowns
  - [ ] Add date range picker
  - [ ] Device detail modal/page
  - [ ] Device history view

---

## Goods In (Purchase Orders)

### Backend
- [ ] `purchaseOrderModel.js`
  - [ ] getAll(filters, pagination)
  - [ ] getById(id)
  - [ ] getWithLines(id)
  - [ ] create(poData)
  - [ ] addLine(poId, lineData)
  - [ ] receiveDevice(poId, imeiData)
  - [ ] finalize(poId)
- [ ] `lookupModel.js`
  - [ ] getTacInfo(tacCode)
  - [ ] getManufacturers()
  - [ ] getModelsByManufacturer(manufacturerId)
- [ ] `purchaseOrderController.js`
  - [ ] GET / - List POs
  - [ ] POST / - Create PO
  - [ ] GET /:id - PO details
  - [ ] POST /:id/lines - Add line
  - [ ] POST /:id/receive - Receive device
  - [ ] POST /:id/finalize - Complete receiving
- [ ] Update routes
- [ ] Test complete PO workflow

### Frontend
- [ ] `client/src/api/purchaseOrders.js`
- [ ] `client/src/api/lookup.js`
- [ ] `client/src/hooks/usePurchaseOrders.js`
- [ ] `client/src/components/goods-in/POForm.jsx`
- [ ] `client/src/components/goods-in/POLineForm.jsx`
- [ ] `client/src/components/goods-in/ReceivingInterface.jsx`
- [ ] `client/src/components/goods-in/ScannedDevicesTable.jsx`
- [ ] Update `client/src/pages/GoodsIn.jsx`
  - [ ] PO list page
  - [ ] Create PO page
  - [ ] Receiving page
  - [ ] Scanner input handling
  - [ ] TAC lookup display
  - [ ] Validation messaging

---

## Goods Out (Sales Orders)

### Backend
- [ ] `salesOrderModel.js`
  - [ ] getAll(filters, pagination)
  - [ ] getById(id)
  - [ ] getWithLines(id)
  - [ ] create(soData)
  - [ ] addLine(soId, lineData)
  - [ ] pickDevice(soId, deviceId)
  - [ ] complete(soId, shippingInfo)
  - [ ] getAvailableInventory(filters)
- [ ] `salesOrderController.js`
  - [ ] GET / - List SOs
  - [ ] POST / - Create SO
  - [ ] GET /:id - SO details
  - [ ] POST /:id/pick - Pick device
  - [ ] POST /:id/complete - Complete goods-out
  - [ ] GET /:id/export - Export to Excel
- [ ] Update routes
- [ ] Test complete SO workflow

### Frontend
- [ ] `client/src/api/salesOrders.js`
- [ ] `client/src/hooks/useSalesOrders.js`
- [ ] `client/src/components/goods-out/SOForm.jsx`
- [ ] `client/src/components/goods-out/InventorySelection.jsx`
- [ ] `client/src/components/goods-out/PickingInterface.jsx`
- [ ] `client/src/components/goods-out/ShippingForm.jsx`
- [ ] Update `client/src/pages/GoodsOut.jsx`
  - [ ] SO list page
  - [ ] Create SO page
  - [ ] Picking page
  - [ ] Grouped inventory table
  - [ ] Shipping info capture
  - [ ] Dispatch note view

---

## Backmarket Integration

### Backend
- [ ] `backmarketModel.js`
  - [ ] getOrders(filters)
  - [ ] getOrderById(bmOrderId)
- [ ] `backmarketService.js`
  - [ ] fetchOrderDetails(bmOrderId)
  - [ ] updateOrder(bmOrderId, tracking, imeis)
  - [ ] getDispatchNote(bmOrderId)
- [ ] `dpdService.js`
  - [ ] bookShipment(shipmentData)
  - [ ] getLabel(consignment)
- [ ] `idealPostcodesService.js`
  - [ ] cleanAddress(address)
- [ ] `backmarketController.js`
  - [ ] GET /orders - List BM orders
  - [ ] POST /:id/book-shipment - Book DPD
  - [ ] POST /:id/update-bm - Update Backmarket
- [ ] Update routes
- [ ] Test with mock data (no real API keys yet)

### Frontend
- [ ] `client/src/api/backmarket.js`
- [ ] `client/src/hooks/useBackmarket.js`
- [ ] `client/src/components/backmarket/BMOrderList.jsx`
- [ ] `client/src/components/backmarket/ShipmentBooking.jsx`
- [ ] Update `client/src/pages/Backmarket.jsx`

---

## QC Module

### Backend
- [ ] `qcModel.js`
  - [ ] getJobs(filters)
  - [ ] getJobById(id)
  - [ ] getJobWithDevices(id)
  - [ ] submitResults(jobId, deviceId, results)
  - [ ] completeJob(jobId)
- [ ] `qcController.js`
- [ ] Update routes

### Frontend
- [ ] `client/src/api/qc.js`
- [ ] `client/src/hooks/useQC.js`
- [ ] `client/src/components/qc/QCJobList.jsx`
- [ ] `client/src/components/qc/QCDeviceTable.jsx`
- [ ] Update `client/src/pages/QC.jsx`

---

## Repair Module

### Backend
- [ ] `repairModel.js`
  - [ ] getJobs(filters)
  - [ ] getJobWithDevices(id)
  - [ ] getRepairRecord(id)
  - [ ] updateRecord(id, updates)
  - [ ] addPart(recordId, partId, quantity)
  - [ ] removePart(recordId, partId)
- [ ] `partModel.js`
  - [ ] getAll()
  - [ ] getCompatible(modelId)
- [ ] `repairController.js`
- [ ] Update routes

### Frontend
- [ ] `client/src/api/repair.js`
- [ ] `client/src/api/parts.js`
- [ ] `client/src/hooks/useRepair.js`
- [ ] `client/src/components/repair/RepairJobList.jsx`
- [ ] `client/src/components/repair/RepairDeviceDetail.jsx`
- [ ] `client/src/components/repair/PartSelector.jsx`
- [ ] Update `client/src/pages/Repair.jsx`

---

## Level 3 Repairs

### Backend
- [ ] `level3Model.js`
  - [ ] getAll(filters)
  - [ ] getById(id)
  - [ ] bookIn(deviceId, locationCode, fault)
  - [ ] update(id, updates)
- [ ] `level3Controller.js`
- [ ] Update routes

### Frontend
- [ ] `client/src/api/level3.js`
- [ ] `client/src/hooks/useLevel3.js`
- [ ] `client/src/components/level3/L3RepairList.jsx`
- [ ] `client/src/components/level3/BookInModal.jsx`
- [ ] Update `client/src/pages/Level3.jsx`

---

## Customers & Suppliers

### Backend
- [ ] `customerModel.js`
  - [ ] getAll(pagination, search)
  - [ ] getById(id)
  - [ ] create(data)
  - [ ] update(id, data)
  - [ ] delete(id)
- [ ] `supplierModel.js` (same as above)
- [ ] `customerController.js`
- [ ] `supplierController.js`
- [ ] Update routes

### Frontend
- [ ] `client/src/api/customers.js`
- [ ] `client/src/api/suppliers.js`
- [ ] `client/src/hooks/useCustomers.js`
- [ ] `client/src/hooks/useSuppliers.js`
- [ ] `client/src/components/ui/DataTable.jsx` (reusable)
- [ ] `client/src/components/ui/Modal.jsx` (reusable)
- [ ] `client/src/components/customers/CustomerForm.jsx`
- [ ] `client/src/components/suppliers/SupplierForm.jsx`
- [ ] Update `client/src/pages/Customers.jsx`
- [ ] Update `client/src/pages/Suppliers.jsx`

---

## Admin Operations

### Backend
- [ ] `adminModel.js`
  - [ ] getRecentOperations()
  - [ ] bulkLocationMove(imeis, locationId, userId, reason)
  - [ ] colorCheck(imeis)
- [ ] `imei24Service.js`
  - [ ] lookup(imei)
  - [ ] getCached(imei)
- [ ] `adminController.js`
- [ ] Add PIN verification middleware
- [ ] Update routes

### Frontend
- [ ] `client/src/api/admin.js`
- [ ] `client/src/hooks/useAdmin.js`
- [ ] `client/src/components/admin/PINModal.jsx`
- [ ] `client/src/components/admin/BulkLocationMove.jsx`
- [ ] `client/src/components/admin/ColorCheck.jsx`
- [ ] Update `client/src/pages/Admin.jsx`

---

## Reusable Components

Priority components needed across modules:

- [ ] `Button.jsx` - Consistent button styles
- [ ] `Input.jsx` - Form input with validation
- [ ] `Select.jsx` - Dropdown select
- [ ] `Modal.jsx` - Modal dialog
- [ ] `Table.jsx` - Data table with TanStack Table
- [ ] `Pagination.jsx` - Pagination controls
- [ ] `SearchInput.jsx` - Search input with debounce
- [ ] `DateRangePicker.jsx` - Date range selector
- [ ] `Badge.jsx` - Status badge
- [ ] `LoadingSpinner.jsx` - Loading indicator
- [ ] `ErrorMessage.jsx` - Error display
- [ ] `ConfirmDialog.jsx` - Confirmation modal
- [ ] `ScannerInput.jsx` - Specialized IMEI scanner input

---

## Testing Checklist

For each completed module:

### Backend Tests
- [ ] Unit tests for model functions
- [ ] Integration tests for endpoints
- [ ] Test error scenarios
- [ ] Test validation
- [ ] Test authentication/authorization

### Frontend Tests
- [ ] Component unit tests
- [ ] Integration tests for flows
- [ ] Test loading states
- [ ] Test error states
- [ ] Test form validation
- [ ] E2E test critical paths

---

## Documentation Checklist

- [ ] API endpoint documentation
- [ ] Component prop documentation
- [ ] Database query optimization notes
- [ ] Deployment guide
- [ ] User manual
- [ ] Troubleshooting guide

---

## Current Sprint

**Focus:** Foundation Complete ✅

**Next Sprint:** Dashboard + Inventory

**Sprint Goals:**
1. Implement Dashboard with real data
2. Build Inventory module with full functionality
3. Create reusable Table component
4. Start Goods In module

---

*Update this checklist as you complete items. Mark completed items with [x].*
