# Reservation System Database Changes

## Date: 2025-12-02

### Summary
Added reservation system to prevent over-selling of inventory when sales orders are confirmed.

---

## 1. New Column: `devices.reserved_for_so_id`

**Purpose**: Track which sales order has reserved a device

**Migration SQL**:
```sql
ALTER TABLE devices
ADD COLUMN reserved_for_so_id INT(10) UNSIGNED NULL AFTER status,
ADD KEY idx_reserved_for_so (reserved_for_so_id),
ADD CONSTRAINT fk_devices_reserved_so
    FOREIGN KEY (reserved_for_so_id)
    REFERENCES sales_orders(id)
    ON DELETE SET NULL;
```

**Schema**:
- **Column**: `reserved_for_so_id`
- **Type**: `INT(10) UNSIGNED NULL`
- **Position**: After `status` column
- **Foreign Key**: References `sales_orders(id)` with `ON DELETE SET NULL`
- **Index**: `idx_reserved_for_so`

**Usage**:
- `NULL` = Device is not reserved (available for any order)
- `<sales_order_id>` = Device is soft-reserved for specific sales order
- Set when sales order status changes from `DRAFT` to `CONFIRMED`
- Cleared when sales order is `CANCELLED` or device is `PICKED`

---

## 2. New View: `v_device_availability`

**Purpose**: Provides real-time aggregated device availability grouped by all relevant criteria

**Creation SQL**:
```sql
CREATE OR REPLACE VIEW v_device_availability AS
SELECT
  d.supplier_id,
  s.name as supplier_name,
  d.manufacturer_id,
  m.name as manufacturer_name,
  d.model_id,
  mo.model_name,
  mo.model_number,
  d.storage_gb,
  d.color,
  d.grade,
  d.location_id,
  l.code as location_code,
  l.name as location_name,
  COUNT(d.id) as total_count,
  SUM(CASE WHEN d.status = 'IN_STOCK' AND d.reserved_for_so_id IS NULL THEN 1 ELSE 0 END) as available_count,
  SUM(CASE WHEN d.reserved_for_so_id IS NOT NULL THEN 1 ELSE 0 END) as reserved_count,
  SUM(CASE WHEN d.status = 'PICKED' THEN 1 ELSE 0 END) as picked_count
FROM devices d
JOIN suppliers s ON d.supplier_id = s.id
JOIN manufacturers m ON d.manufacturer_id = m.id
JOIN models mo ON d.model_id = mo.id
LEFT JOIN locations l ON d.location_id = l.id
WHERE d.status IN ('IN_STOCK', 'PICKED')
GROUP BY
  d.supplier_id, s.name,
  d.manufacturer_id, m.name,
  d.model_id, mo.model_name, mo.model_number,
  d.storage_gb, d.color, d.grade,
  d.location_id, l.code, l.name
HAVING total_count > 0;
```

**Columns**:
- `supplier_id`, `supplier_name` - Supplier information
- `manufacturer_id`, `manufacturer_name` - Manufacturer information
- `model_id`, `model_name`, `model_number` - Model information
- `storage_gb` - Storage capacity
- `color` - Device color
- `grade` - Device grade (A, B, C, etc.)
- `location_id`, `location_code`, `location_name` - Location information
- `total_count` - Total devices matching criteria
- `available_count` - Devices available (IN_STOCK and not reserved)
- `reserved_count` - Devices reserved for sales orders
- `picked_count` - Devices already picked for orders

**Usage Examples**:
```sql
-- Check availability for specific criteria
SELECT * FROM v_device_availability
WHERE supplier_id = 1
  AND manufacturer_id = 2
  AND model_id = 5
  AND storage_gb = 128
  AND color = 'Black'
  AND grade = 'A';

-- Get location breakdown for a model
SELECT
  location_code,
  available_count,
  reserved_count,
  total_count
FROM v_device_availability
WHERE supplier_id = 1
  AND model_id = 5
ORDER BY available_count DESC;

-- Get total availability across all locations
SELECT
  SUM(available_count) as total_available,
  SUM(reserved_count) as total_reserved,
  SUM(total_count) as total_stock
FROM v_device_availability
WHERE supplier_id = 1 AND model_id = 5;
```

---

## 3. Business Logic Changes

### Reservation Workflow

**1. Create Sales Order (DRAFT)**
- No reservations made
- Availability checked for warnings only
- Can be edited freely

**2. Confirm Sales Order**
- Automatically reserves matching available devices
- Reservation criteria (STRICT match required):
  - `supplier_id` - MUST match
  - `manufacturer_id` - MUST match
  - `model_id` - MUST match
  - `storage_gb` - MUST match (if specified)
  - `color` - MUST match (if specified)
  - `grade` - MUST match (if specified)
  - `location_id` - FLEXIBLE (any location OK)
- Reserves up to `requested_quantity` devices per line
- Uses oldest devices first (`ORDER BY created_at`)
- Transaction-safe (all-or-nothing)

**3. Pick Devices (Goods Out)**
- User scans IMEI to pick device
- System validates device matches order line criteria
- Device can be reserved OR unreserved (flexible picking)
- Updates device status to `PICKED`
- Clears `reserved_for_so_id`
- Updates `picked_quantity` on sales order line

**4. Cancel Sales Order**
- Releases all reservations
- Clears `reserved_for_so_id` for all reserved devices
- Devices return to available pool

### Over-Commitment Handling
- System ALLOWS creating orders when `requested_quantity` > `available_count`
- Displays WARNING to user showing:
  - Requested quantity
  - Available quantity
  - Shortfall amount
  - Location breakdown
- Useful for pre-orders or pending stock
- Confirmation still proceeds (soft reservation model)

---

## 4. API Changes

### New Endpoint: POST /api/sales-orders/check-availability

**Request Body**:
```json
{
  "lines": [
    {
      "supplier_id": 1,
      "manufacturer_id": 2,
      "model_id": 5,
      "storage_gb": 128,
      "color": "Black",
      "grade": "A",
      "requested_quantity": 10
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "availability": [
    {
      "line": { ...lineData },
      "totalAvailable": 8,
      "totalStock": 12,
      "requested": 10,
      "isOverCommitted": true,
      "locations": [
        {
          "locationCode": "TR001",
          "locationName": "Triage Bay 1",
          "totalCount": 7,
          "availableCount": 5,
          "reservedCount": 2
        },
        {
          "locationCode": "TR012",
          "locationName": "Triage Bay 12",
          "totalCount": 5,
          "availableCount": 3,
          "reservedCount": 2
        }
      ]
    }
  ]
}
```

---

## 5. Migration Script Locations

- `/home/gascat/new_update_attempt/server/add-reservation-column.js` - Adds reserved_for_so_id column
- `/home/gascat/new_update_attempt/server/create-availability-view.js` - Creates v_device_availability view

Both scripts are idempotent and safe to run multiple times.

---

## Implementation Status

✅ Database schema updated
✅ View created and tested
✅ Backend model updated with reservation logic
✅ API endpoint created
✅ Frontend API client updated
⏳ Create Sales Order UI (in progress)
⏳ Picking/Goods Out UI (pending)
⏳ Documentation updated (this file)

---

## Notes

- Reservation is "soft" - allows over-commitment
- Location is flexible during picking
- Supplier is strictly enforced
- All other criteria (manufacturer, model, storage, color, grade) are strictly enforced
- Transaction-safe operations prevent partial reservations
- View provides O(1) aggregated lookups instead of expensive JOINs
