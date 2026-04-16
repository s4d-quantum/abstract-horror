# Quant Inventory Management System

A comprehensive inventory management system for mobile device refurbishment operations, handling the complete lifecycle from purchasing through sales and shipping.

## Project Status

This is the initial implementation with foundational infrastructure completed. The system is set up with:

- ✅ Server infrastructure (Express.js + MySQL)
- ✅ Database schema fully loaded (40 tables)
- ✅ Authentication system (JWT with refresh tokens)
- ✅ React client with routing
- ✅ Basic UI layout and navigation

## Technology Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MySQL/MariaDB
- **Authentication:** JWT with refresh token rotation
- **API Style:** RESTful

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Routing:** React Router v6
- **State Management:** React Query + Context API
- **Styling:** Tailwind CSS
- **Forms:** React Hook Form (planned)
- **Tables:** TanStack Table (planned)
- **Icons:** Lucide React

## Project Structure

```
new_update_attempt/
├── server/
│   ├── src/
│   │   ├── config/          # Database & environment config
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Auth, validation, error handling
│   │   ├── models/          # Database models
│   │   ├── routes/          # Express routes
│   │   ├── services/        # Business logic (to be added)
│   │   ├── utils/           # Helper functions
│   │   ├── app.js           # Express app setup
│   │   └── server.js        # Server entry point
│   ├── .env                 # Environment variables
│   └── package.json
├── client/
│   ├── src/
│   │   ├── api/             # API client functions (to be added)
│   │   ├── components/      # Reusable components
│   │   │   ├── layout/      # Layout components
│   │   │   └── ui/          # UI components (to be added)
│   │   ├── context/         # React contexts
│   │   ├── features/        # Feature modules (to be added)
│   │   ├── lib/             # Utilities & API client
│   │   ├── pages/           # Route pages
│   │   ├── App.jsx          # Main app component
│   │   └── main.jsx         # Entry point
│   ├── index.html
│   └── package.json
└── .info/                   # Documentation & schema
```

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL/MariaDB
- npm or yarn

### Database Setup

The database `quantum2_db` should already be set up with:
- User: `quant`
- Password: `715525`
- Host: `127.0.0.1`
- Port: `3306`

All 40 tables from the schema are loaded and ready.

### Running the Application

1. **Start the backend server:**
   ```bash
   cd server
   npm install  # Already done
   npm run dev  # Or: node src/server.js
   ```
   Server runs on: http://localhost:3001

2. **Start the frontend client:**
   ```bash
   cd client
   npm install  # Already done
   npm run dev
   ```
   Client runs on: http://localhost:5173

### Default Credentials

- **Username:** `admin`
- **Password:** `admin123`
- **PIN:** `1234` (for admin operations)

## API Structure

The API is organized into the following endpoints:

- `/api/auth` - Authentication (login, refresh, logout)
- `/api/dashboard` - Dashboard metrics and summaries
- `/api/devices` - Device inventory management
- `/api/manufacturers` - Manufacturer data
- `/api/models` - Device models
- `/api/locations` - Stock locations
- `/api/customers` - Customer management
- `/api/suppliers` - Supplier management
- `/api/purchase-orders` - Purchase orders (goods in)
- `/api/sales-orders` - Sales orders (goods out)
- `/api/backmarket` - Backmarket integration
- `/api/tracking` - Shipment tracking
- `/api/qc` - Quality control
- `/api/repair` - Repair management
- `/api/level3` - Level 3 board repairs
- `/api/parts` - Parts management
- `/api/admin` - Admin operations
- `/api/lookup` - TAC/IMEI lookups

## Database Schema

The database includes 40 tables organized into:

### Core Tables
- `manufacturers`, `models`, `tac_lookup`, `locations`
- `storage_options`, `grade_definitions`

### Business Entities
- `customers`, `suppliers`, `users`

### Inventory
- `devices` (main inventory table)
- `device_history` (audit trail)

### Purchase Orders
- `purchase_orders`, `purchase_order_lines`, `purchase_order_receipts`

### Sales Orders
- `sales_orders`, `sales_order_lines`, `sales_order_items`
- `backmarket_shipments`

### Quality Control & Repair
- `qc_jobs`, `qc_results`
- `repair_jobs`, `repair_records`, `repair_parts_used`
- `level3_repairs`

### Parts Management
- `parts`, `part_categories`, `part_compatibility`

### Admin & Logging
- `admin_operations`, `color_check_cache`
- `activity_log` (partitioned)
- `shipment_tracking`, `blackbelt_logs`

### Views
- `v_stock_summary`, `v_awaiting_qc`, `v_awaiting_repair`
- `v_unprocessed_sales_orders`, `v_recent_purchase_orders`
- `v_dashboard_metrics`

## Next Steps

The following modules need to be implemented:

### Priority 1 - Core Operations
1. **Dashboard Module**
   - Widget metrics (stock count, orders, QC, repairs)
   - Recent POs and SOs tables
   - 7-day activity summaries

2. **Inventory Module**
   - Paginated device list with search and filters
   - Device detail view with history
   - IMEI search capability

3. **Goods In (Purchase Orders)**
   - Stage 1: Create PO with expected items
   - Stage 2: Receive stock with IMEI scanning
   - TAC lookup integration
   - Validation against expected items

4. **Goods Out (Sales Orders)**
   - Create sales order with inventory selection
   - Goods-out picking with IMEI scanning
   - Shipping information capture
   - Dispatch note generation

### Priority 2 - QC & Repair
5. **QC Module**
   - QC job list by purchase order
   - Per-device testing interface
   - Grade assignment
   - Cosmetic/functional pass/fail

6. **Repair Module**
   - Repair job management
   - Device repair detail with parts
   - Compatible parts lookup
   - Repair completion tracking

7. **Level 3 Repairs**
   - Book in repairs to L3 locations
   - Status tracking (In Progress, Complete, BER, etc.)
   - Engineer comments

### Priority 3 - Business Entities
8. **Customers Module**
   - CRUD operations
   - Pagination and search

9. **Suppliers Module**
   - CRUD operations
   - Pagination and search

### Priority 4 - Admin & Integration
10. **Admin Operations**
    - PIN-protected operations
    - Bulk location moves
    - Color check (IMEI24 integration)
    - Operation audit log

11. **Backmarket Integration**
    - Order fetching
    - Shipping booking
    - Tracking updates
    - Address validation

12. **Courier Integrations**
    - DPD, UPS, DHL, FedEx APIs
    - Tracking event retrieval
    - Label generation

13. **External API Services**
    - TAC lookup service
    - IMEI24 API (with caching)
    - Ideal Postcodes (address validation)
    - Blackbelt QC log ingestion

## Development Notes

### Environment Variables

Server `.env`:
- Database connection settings
- JWT secrets (change in production!)
- External API keys (currently empty)

Client `.env`:
- `VITE_API_URL` points to backend API

### Security Considerations

- JWT tokens expire in 15 minutes (configurable)
- Refresh tokens last 7 days
- Admin operations require PIN verification
- All API routes (except auth) require authentication
- Role-based access control implemented

### Known Issues & TODOs

- [ ] Implement actual business logic in route handlers
- [ ] Add form validation with Zod schemas
- [ ] Build reusable UI components (Table, Modal, etc.)
- [ ] Implement React Query hooks for data fetching
- [ ] Add loading states and error boundaries
- [ ] Implement Excel export functionality
- [ ] Add print stylesheets for dispatch notes
- [ ] Implement barcode scanner input handling
- [ ] Add comprehensive error handling
- [ ] Write tests (unit + integration)

## API Testing

You can test the API using curl or Postman:

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get dashboard metrics (requires token)
curl http://localhost:3001/api/dashboard/metrics \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Database Utilities

Seed default admin user:
```bash
cd server
node src/utils/seed.js
```

Test database connection:
```bash
cd server
node test-db.js
```

## Contributing

This is a comprehensive system with many interconnected parts. When implementing new features:

1. Start with the database model
2. Create the API endpoints
3. Build the UI components
4. Wire up with React Query
5. Test the complete flow

## License

Proprietary - Quant Inventory Management System

## Support

For issues or questions, contact the development team.

---

**Last Updated:** December 1, 2025
**Version:** 0.1.0 (Initial Setup)
