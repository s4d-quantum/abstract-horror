# Quant Inventory Management System - Development Prompt

## Project Overview

Build a comprehensive inventory management system for a mobile device refurbishment company. The system handles the full lifecycle of devices: purchasing, receiving, quality control, repair, sales, and shipping. It must support both B2B customers and Backmarket (B2C marketplace) integration.

## Tech Stack

- **Backend:** Node.js with Express.js
- **Frontend:** React (with React Router for navigation)
- **Database:** MySQL/MariaDB (schema provided below)
- **Styling:** Tailwind CSS
- **State Management:** React Query for server state, Context API for app state
- **Forms:** React Hook Form with Zod validation
- **Tables:** TanStack Table (React Table) for data grids with pagination, sorting, filtering
- **Authentication:** JWT-based with refresh tokens
- **API Style:** RESTful with consistent error handling

## Database Schema

The complete database schema is provided in `inventory_db_schema.sql`. Key tables include:

**Core:** `devices`, `manufacturers`, `models`, `locations`, `tac_lookup`
**Business:** `customers`, `suppliers`, `users`
**Purchase Orders:** `purchase_orders`, `purchase_order_lines`, `purchase_order_receipts`
**Sales Orders:** `sales_orders`, `sales_order_lines`, `sales_order_items`, `backmarket_shipments`
**QC/Repair:** `qc_jobs`, `qc_results`, `repair_jobs`, `repair_records`, `level3_repairs`
**Parts:** `parts`, `part_categories`, `part_compatibility`, `repair_parts_used`
**Logging:** `activity_log`, `device_history`, `admin_operations`

---

## Application Modules

### 1. Authentication & Authorization

- JWT-based login with refresh token rotation
- Role-based access control (ADMIN, SALES, WAREHOUSE, QC, REPAIR, VIEWER)
- PIN code verification for protected admin operations
- Session management with automatic logout on inactivity

### 2. Dashboard (Landing Page)

**Widgets to display:**
- Total count of devices currently in stock
- Count of unprocessed sales orders
- Devices booked in (goods-in) in last 7 days
- Devices booked out (shipped) in last 7 days
- Returned devices in last 7 days
- Count of devices awaiting QC
- Count of devices awaiting repair

**Tables:**
- 10 most recent purchase orders (PO number, date, supplier, qty, status)
- 10 most recent unprocessed sales orders (SO number, date, customer, creator)

### 3. Inventory Module

**Main inventory table displaying:**
- Purchase ID, IMEI, Manufacturer, Model, Supplier, Location, Color, OEM Color, Storage, Grade, Status

**Features:**
- Pagination (handle hundreds/thousands of records)
- Search by IMEI and Model (both model number and model name)
- Dropdown filters for: Status, Manufacturer, Supplier, Color, OEM Color, Grade, Location
- Date range filter (Date From / Date To)
- Click row to view device details/history

### 4. Goods In Module (Purchase Orders)

**Two-stage process:**

**Stage 1 - Create Purchase Order (Sales Staff):**
- Select supplier from dropdown
- Add line items: Manufacturer → Model → Storage → Color → Quantity
- Can add multiple lines to one PO
- Shows running total of expected units
- Enter supplier reference number
- Save as draft or confirm PO

**Stage 2 - Receive Stock (Warehouse Staff):**
- Main page: Paginated table of POs with search (PO number, supplier)
- Columns: PO Number, Date, Supplier, Expected Qty, Received Qty, Status, Actions
- Click to open receiving interface

**Receiving Interface:**
- Display PO details and expected items
- IMEI scanning input field
- On scan: 
  - Extract TAC (first 8 digits)
  - Lookup manufacturer/model from `tac_lookup`
  - Display possible storage configs and colors from enhanced TAC data
  - Staff select/confirm storage and color
  - Validate scanned device matches an expected line item
  - Show error if device doesn't match any expected items
- Display table of scanned/received devices
- Finalize button: commits devices to stock, updates PO status

### 5. Goods Out Module (Sales Orders)

**Two sub-sections in navigation:**
- "Sales Orders" - B2B orders (with toggle to include Backmarket)
- "Backmarket" - B2C orders only (customer = Backmarket Consumer)

Both show notification badge with unprocessed order count.

**Sales Orders Table:**
- Columns: SO Number, Date, Customer, Creator (user), Actions
- Actions for unprocessed: View, Goods-Out
- Actions for completed: View, Export (Excel), Track

**New Sales Order Flow:**
1. Select customer
2. Select manufacturer (only shows manufacturers with stock)
3. Display grouped inventory table:
   - Group devices by: Manufacturer, Model, Color, OEM Color, Storage, Grade, Location
   - Show quantity available per group
   - Search by model, filter by storage/color
   - User enters quantity wanted, clicks Add
4. Selected items shown in order summary table below
5. Can remove items from order
6. Save (draft) or Complete (ready for goods-out)

**Goods-Out Interface:**
- Display order info: Date, Customer, SO Number, Customer Ref, (BM Order ID if applicable)
- Input fields: No. of Pallets, No. of Boxes, Courier dropdown, Tracking Number
- Table of expected items: Manufacturer, Model, Storage, Color, Grade, Supplier, Location
- IMEI scanning input
- On scan:
  - TAC lookup for manufacturer/model verification
  - Staff manually verify color/storage (can't be determined from TAC)
  - Validate device matches expected items (error if not)
- Table of scanned devices
- Buttons:
  - Save (partial completion, hold order)
  - Complete (finalize shipment, update stock, show dispatch note)
  
**Backmarket-specific buttons:**
- "Book Shipment" - triggers BM/DPD integration flow
- "Update BM" - sends tracking/IMEI to Backmarket API

**Export:** Generate Excel with order items

**Track:** Display tracking events from courier API (DPD, UPS, DHL, FedEx)

### 6. QC Module

**Main page:**
- Table of QC jobs grouped by Purchase ID
- Columns: Date, Purchase ID, Supplier, Location, Quantity, Status
- Click Purchase ID to open QC job

**QC Job Page:**
- Table of devices in the purchase order
- Columns: IMEI, Manufacturer, Model, Storage, Color (editable), Grade (dropdown A-F), Cosmetic (Pass/Fail checkboxes), Functional (Pass/Fail checkboxes), Comments (text input)
- "QC Complete" checkbox at bottom
- Save button

### 7. Repair Module

**Two sub-sections:**

**Repairs:**
- Main table: Date, Purchase ID, Supplier, Quantity, Status, View button
- Job page: Table of devices with columns: IMEI, Manufacturer, Model, Color, Storage, Grade, Parts (list), Comments
- Click IMEI to open device repair detail

**Device Repair Detail:**
- Device info: Make/Model, Color, Storage, Grade, Supplier
- Engineer comments text box
- Table of compatible parts (from `part_compatibility`): Part Name, Color, Qty Available, Add button
- Table of parts added to this device: Part Name, Color, Remove button
- "Repair Complete" checkbox
- Save button
- When all devices in PO marked complete, auto-complete the job

**Level 3 Repairs:**
- Main table: Date, Location, IMEI, Manufacturer, Model, Fault, Status
- "Book In Repair" button opens modal:
  - Dropdown: Select L3 location (level3_1, level3_2, etc.)
  - IMEI input
  - Fault description text input
  - Book In button
- Click IMEI to open L3 detail page:
  - Display: Date, Location, IMEI, Manufacturer, Model, Fault
  - Engineer comments text input
  - Status dropdown: In Progress, Complete, BER, On Hold, Awaiting Parts, Unrepairable
  - Save button
  - Status logic: Complete → location = level3_complete; BER/Unrepairable → location = level3_fails

### 8. Admin Ops Module

**Protected by PIN code entry.**

Main page shows buttons for operations and table of last 10 uses (Date, User, Operation, Reason).

**Location Management:**
- Requires PIN + Reason
- Dropdown to select destination location
- Text area for IMEI input (one per line, supports paste)
- Bulk move all scanned IMEIs to selected location
- Log operation to `admin_operations`

**Color Check:**
- IMEI input (one per line) or CSV/XLSX upload
- "Inventory Search" button opens modal with searchable/filterable inventory table
  - Can tick devices to add to check
- "Lookup Info" button:
  - First check `color_check_cache` for existing data
  - If not cached, call IMEI24 API
  - Cache results
  - Display results table with device info

### 9. Customers Module

- Paginated table: Name, Address, Contact No, Email, Actions (Edit, Delete)
- "New Customer" button opens modal with form fields
- Edit opens same modal pre-populated
- Delete with confirmation

### 10. Suppliers Module

- Same as Customers but with VAT Number field
- Paginated table: Name, Address, Contact No, Email, VAT No, Actions

---

## External Integrations

### TAC Lookup (Internal)
- Query `tac_lookup` table using first 8 digits of IMEI
- Returns manufacturer, model, possible_storage (JSON array), possible_colors (JSON array)

### Backmarket API
- **Get Order Details:** Fetch customer shipping info by BM order ID
- **Update Order:** Send tracking number, courier, IMEI(s) to BM
- **Download Dispatch Note:** Get PDF dispatch note URL
- Implement proper error handling and retry logic

### Ideal Postcodes API
- Address validation/cleaning
- Used to clean BM customer addresses before DPD booking

### DPD API
- Book shipment with customer details
- Get tracking events
- Download ZPL label

### Other Couriers (UPS, DHL, FedEx)
- Tracking API integration for each
- Abstract into courier service with strategy pattern

### IMEI24 API
- Paid device info lookup
- Returns manufacturer, model, color, storage
- Cache all results in `color_check_cache` to avoid repeat costs

### Blackbelt Integration
- Ingest QC logs from Blackbelt application
- Store in `blackbelt_logs` table
- Link to devices by IMEI for QC verification

---

## API Structure

```
/api/auth
  POST /login
  POST /refresh
  POST /logout
  POST /verify-pin

/api/dashboard
  GET /metrics
  GET /recent-purchase-orders
  GET /recent-sales-orders

/api/devices
  GET /                    # List with pagination, search, filters
  GET /:id                 # Single device details
  GET /:id/history         # Device history
  PATCH /:id               # Update device
  POST /bulk-move          # Bulk location move (admin)

/api/manufacturers
  GET /
  GET /:id/models

/api/models
  GET /
  GET /:id

/api/locations
  GET /
  POST /
  PATCH /:id
  DELETE /:id

/api/customers
  GET /
  POST /
  GET /:id
  PATCH /:id
  DELETE /:id

/api/suppliers
  GET /
  POST /
  GET /:id
  PATCH /:id
  DELETE /:id

/api/purchase-orders
  GET /                    # List with pagination
  POST /                   # Create PO
  GET /:id                 # PO details with lines
  PATCH /:id               # Update PO
  POST /:id/receive        # Receive device against PO
  POST /:id/finalize       # Finalize receiving

/api/sales-orders
  GET /                    # List with filters (type, status)
  POST /                   # Create SO
  GET /:id                 # SO details
  PATCH /:id               # Update SO
  POST /:id/pick           # Pick device for SO
  POST /:id/complete       # Complete goods-out
  GET /:id/export          # Export to Excel

/api/backmarket
  GET /orders              # BM orders only
  POST /:id/book-shipment  # Book DPD shipment
  POST /:id/update-bm      # Update Backmarket

/api/tracking
  GET /:salesOrderId       # Get tracking events

/api/qc
  GET /jobs                # List QC jobs
  GET /jobs/:id            # Job with devices
  POST /jobs/:id/results   # Submit QC results

/api/repair
  GET /jobs                # List repair jobs
  GET /jobs/:id            # Job with devices
  GET /records/:id         # Single repair record
  PATCH /records/:id       # Update repair record
  POST /records/:id/parts  # Add part to repair
  DELETE /records/:id/parts/:partId

/api/level3
  GET /                    # List L3 repairs
  POST /                   # Book in L3 repair
  GET /:id
  PATCH /:id               # Update L3 repair

/api/parts
  GET /                    # List parts
  GET /compatible/:modelId # Parts compatible with model
  POST /
  PATCH /:id
  DELETE /:id

/api/admin
  GET /operations          # List recent operations
  POST /color-check        # Perform color check
  POST /bulk-move          # Bulk location move

/api/lookup
  GET /tac/:tacCode        # TAC lookup
  POST /imei24             # IMEI24 lookup (with caching)
```

---

## Frontend Routes

```
/                          # Redirect to /dashboard
/login                     # Login page
/dashboard                 # Dashboard

/inventory                 # Inventory list
/inventory/:id             # Device detail

/goods-in                  # Purchase orders list
/goods-in/new              # Create PO
/goods-in/:id              # View/receive PO

/goods-out                 # Sales orders list
/goods-out/new             # Create SO
/goods-out/:id             # View SO
/goods-out/:id/pick        # Goods-out picking

/backmarket                # BM orders list
/backmarket/:id            # BM order detail
/backmarket/:id/pick       # BM goods-out

/qc                        # QC jobs list
/qc/:id                    # QC job detail

/repair                    # Repair jobs list
/repair/:id                # Repair job detail
/repair/device/:id         # Device repair detail

/level3                    # L3 repairs list
/level3/book               # Book L3 repair
/level3/:id                # L3 repair detail

/admin                     # Admin ops (PIN protected)
/admin/location-move       # Bulk location move
/admin/color-check         # Color check

/customers                 # Customers list
/customers/:id             # Customer detail (or modal)

/suppliers                 # Suppliers list
/suppliers/:id             # Supplier detail (or modal)
```

---

## UI/UX Requirements

1. **Navigation:** Persistent sidebar with icons and labels, collapsible on mobile
2. **Notification badges:** Show counts on Goods Out, Backmarket nav items
3. **Tables:** Use TanStack Table with:
   - Server-side pagination
   - Column sorting
   - Column filtering
   - Row selection where needed
4. **Forms:** Validate on submit, show inline errors
5. **Scanning inputs:** Auto-focus, handle barcode scanner input (rapid keystrokes ending in Enter)
6. **Modals:** Use for confirmations, quick forms (new customer, etc.)
7. **Toast notifications:** Success/error feedback
8. **Loading states:** Skeleton loaders for tables, spinners for actions
9. **Responsive:** Works on desktop (primary) and tablet (secondary)
10. **Print:** Dispatch notes should be printable/styled for print

---

## Project Structure

```
/server
  /src
    /config           # DB, env, constants
    /controllers      # Route handlers
    /middleware       # Auth, validation, error handling
    /models           # Database queries (use mysql2/promise)
    /routes           # Express routers
    /services         # Business logic, external APIs
    /utils            # Helpers
    app.js
    server.js

/client
  /src
    /api              # API client functions
    /components       # Reusable components
      /ui             # Button, Input, Modal, Table, etc.
      /layout         # Sidebar, Header, PageWrapper
    /features         # Feature-specific components
      /auth
      /dashboard
      /inventory
      /goods-in
      /goods-out
      /qc
      /repair
      /admin
      /customers
      /suppliers
    /hooks            # Custom hooks
    /context          # Auth context, etc.
    /lib              # Utils, constants
    /pages            # Route page components
    App.jsx
    main.jsx
```

---

## Key Implementation Notes

1. **IMEI Uniqueness:** Same IMEI can exist multiple times (device re-enters system) but never duplicated while IN_STOCK. Handle this in device creation logic.

2. **TAC Lookup Flow:**
   ```javascript
   const tac = imei.substring(0, 8);
   const result = await db.query('SELECT * FROM tac_lookup WHERE tac_code = ?', [tac]);
   // result includes manufacturer_id, model_id, possible_storage (JSON), possible_colors (JSON)
   ```

3. **Goods-Out Validation:** When scanning for goods-out, validate:
   - Device exists and is IN_STOCK
   - Device properties match an expected line item (manufacturer, model, storage, color, grade)
   - Device not already picked for this order

4. **Status Transitions:** Implement state machine for device status changes. Log all transitions to `device_history`.

5. **Partitioned Logging:** The `activity_log` table is partitioned. Ensure inserts include `log_date` column.

6. **Caching:** Cache TAC lookups in memory (they don't change). Cache IMEI24 results in DB.

7. **Error Handling:** Consistent error response format:
   ```json
   { "success": false, "error": { "code": "DEVICE_NOT_FOUND", "message": "..." } }
   ```

8. **Transactions:** Use DB transactions for multi-step operations (receiving, goods-out completion).

---

## Getting Started

1. Set up MySQL database and run `inventory_db_schema.sql`
2. Create `.env` files for server (DB connection, JWT secret, API keys)
3. Initialize Node/Express server with basic middleware
4. Initialize React app with Vite
5. Implement auth flow first
6. Build out modules in order: Dashboard → Inventory → Goods In → Goods Out → QC → Repair → Admin
7. Add integrations last (Backmarket, couriers, IMEI24)

---

## Environment Variables

**Server (.env):**
```
PORT=3001
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=quant_user
DB_PASSWORD=
DB_NAME=quant_inventory

JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

BACKMARKET_API_KEY=
BACKMARKET_API_URL=

DPD_API_KEY=
DPD_ACCOUNT_NO=

IDEAL_POSTCODES_API_KEY=

IMEI24_API_KEY=

PRINT_WEBHOOK_URL=
```

**Client (.env):**
```
VITE_API_URL=http://localhost:3001/api
```
