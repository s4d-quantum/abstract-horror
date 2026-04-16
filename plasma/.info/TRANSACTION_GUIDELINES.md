# Database Transaction Guidelines

## Overview

This document provides guidelines for when and how to use database transactions in the Quant Inventory System. Following these guidelines ensures data consistency, prevents race conditions, and maintains database integrity.

---

## When to Use Transactions

### ✅ ALWAYS Use Transactions For:

1. **Multiple Related Inserts/Updates**
   - Any operation that modifies 2+ tables
   - Example: Updating device status + inserting into device_history

2. **Read-Then-Write Operations**
   - Reading a value, modifying it, and writing it back
   - Example: Checking stock quantity before updating
   - **Important:** Use row locking (`FOR UPDATE`) to prevent race conditions

3. **Status Changes with Side Effects**
   - Changing a record's status and logging the change
   - Example: Device status updates, order status changes

4. **Dependent Operations**
   - Operation B depends on the success of Operation A
   - Example: Inserting order + inserting order lines + reserving devices

5. **Financial Operations**
   - ANY operation involving money, credits, or inventory counts
   - Example: Recording payments, adjusting stock levels

6. **External API + Database Updates**
   - When persisting results from external API calls
   - **Important:** Make external API calls OUTSIDE the transaction

---

## When NOT to Use Transactions

### ❌ DON'T Use Transactions For:

1. **Single Operation Queries**
   - Single INSERT, UPDATE, or DELETE (these are atomic by nature)
   - Example: Simple update of one field in one table

2. **Read-Only Operations**
   - SELECT queries without any modifications
   - Example: Fetching data for display

3. **Long-Running Operations**
   - Operations that take a long time (API calls, file processing)
   - Keep transactions short to avoid locking issues

---

## How to Use the Transaction Helper

### Basic Usage

```javascript
import { transaction } from '../config/database.js';

// Example: Update device status with history logging
async updateStatus(deviceId, newStatus, userId) {
  return transaction(async (connection) => {
    // All database operations here
    await connection.execute(
      'UPDATE devices SET status = ? WHERE id = ?',
      [newStatus, deviceId]
    );

    await connection.execute(
      'INSERT INTO device_history (device_id, event_type, new_value, user_id) VALUES (?, ?, ?, ?)',
      [deviceId, 'STATUS_CHANGE', newStatus, userId]
    );

    // Return value will be the result of the transaction
    return { success: true };
  });
}
```

### With Row Locking (Preventing Race Conditions)

```javascript
async reserveDevice(deviceId, orderId) {
  return transaction(async (connection) => {
    // Lock the row to prevent concurrent modifications
    const [devices] = await connection.execute(
      'SELECT id, status FROM devices WHERE id = ? FOR UPDATE',
      [deviceId]
    );

    if (devices.length === 0) {
      throw new Error('Device not found');
    }

    if (devices[0].status !== 'IN_STOCK') {
      throw new Error('Device not available');
    }

    // Safe to update now - we have an exclusive lock
    await connection.execute(
      'UPDATE devices SET reserved_for_order_id = ?, status = ? WHERE id = ?',
      [orderId, 'RESERVED', deviceId]
    );

    return devices[0];
  });
}
```

### With External API Calls

```javascript
async shipOrder(orderId) {
  // Step 1: Do external API calls OUTSIDE the transaction
  const trackingInfo = await courierService.bookShipment(orderData);
  const label = await courierService.getLabel(trackingInfo.shipmentId);

  // Step 2: Only persist to database inside transaction
  return transaction(async (connection) => {
    await connection.execute(
      'UPDATE orders SET status = ?, tracking_number = ?, shipped_at = NOW() WHERE id = ?',
      ['SHIPPED', trackingInfo.trackingNumber, orderId]
    );

    await connection.execute(
      'UPDATE order_items SET shipped = 1 WHERE order_id = ?',
      [orderId]
    );

    await connection.execute(
      'INSERT INTO shipment_labels (order_id, label_data) VALUES (?, ?)',
      [orderId, label]
    );
  });
}
```

### Error Handling

The transaction helper automatically handles rollback and connection cleanup:

```javascript
try {
  const result = await transaction(async (connection) => {
    // Your database operations
    await connection.execute(...);
    await connection.execute(...);
    return { success: true };
  });

  console.log('Transaction committed:', result);
} catch (error) {
  // Transaction was automatically rolled back
  console.error('Transaction failed:', error.message);
  // Handle error appropriately
}
```

---

## Common Patterns

### Pattern 1: Status Update with Logging

```javascript
async updateDeviceStatus(id, newStatus, userId, notes) {
  return transaction(async (connection) => {
    // Lock and get current state
    const [devices] = await connection.execute(
      'SELECT id, imei, status FROM devices WHERE id = ? FOR UPDATE',
      [id]
    );

    if (devices.length === 0) {
      throw new Error('Device not found');
    }

    const oldStatus = devices[0].status;

    // Skip if already at target status
    if (oldStatus === newStatus) {
      return { updated: false };
    }

    // Update status
    await connection.execute(
      'UPDATE devices SET status = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, id]
    );

    // Log to history
    await connection.execute(
      'INSERT INTO device_history (device_id, imei, event_type, old_value, new_value, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, devices[0].imei, 'STATUS_CHANGE', oldStatus, newStatus, notes, userId]
    );

    return { updated: true, oldStatus, newStatus };
  });
}
```

### Pattern 2: Create with Multiple Related Records

```javascript
async createPurchaseOrder(poData, lineItems, userId) {
  return transaction(async (connection) => {
    // Insert header
    const [poResult] = await connection.execute(
      'INSERT INTO purchase_orders (supplier_id, po_number, created_by) VALUES (?, ?, ?)',
      [poData.supplierId, poData.poNumber, userId]
    );

    const poId = poResult.insertId;

    // Insert all line items
    for (const item of lineItems) {
      await connection.execute(
        'INSERT INTO purchase_order_lines (po_id, manufacturer_id, model_id, quantity) VALUES (?, ?, ?, ?)',
        [poId, item.manufacturerId, item.modelId, item.quantity]
      );
    }

    // Log the creation
    await connection.execute(
      'INSERT INTO activity_log (event_type, reference_id, user_id) VALUES (?, ?, ?)',
      ['PO_CREATED', poId, userId]
    );

    return { id: poId, po_number: poData.poNumber };
  });
}
```

### Pattern 3: Bulk Operations

```javascript
async bulkUpdateLocations(devices, newLocationId, userId) {
  return transaction(async (connection) => {
    const deviceIds = devices.map(d => d.id);

    // Validate all devices exist and get current locations
    const [deviceResults] = await connection.execute(
      `SELECT id, imei, location_id FROM devices WHERE id IN (${deviceIds.map(() => '?').join(',')})`,
      deviceIds
    );

    if (deviceResults.length !== devices.length) {
      throw new Error('Some devices not found');
    }

    // Bulk update locations
    await connection.execute(
      `UPDATE devices SET location_id = ? WHERE id IN (${deviceIds.map(() => '?').join(',')})`,
      [newLocationId, ...deviceIds]
    );

    // Log each change to history
    for (const device of deviceResults) {
      await connection.execute(
        'INSERT INTO device_history (device_id, imei, event_type, field_changed, old_value, new_value, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [device.id, device.imei, 'LOCATION_CHANGE', 'location', device.location_id, newLocationId, userId]
      );
    }

    return { movedCount: deviceResults.length };
  });
}
```

---

## Best Practices

### 1. Keep Transactions Short
```javascript
// ❌ BAD: Long-running operations inside transaction
await transaction(async (conn) => {
  await conn.execute('UPDATE ...');
  await sleep(5000); // Don't do this!
  await externalAPI.call(); // Don't do this!
  await conn.execute('INSERT ...');
});

// ✅ GOOD: Only database operations
const apiResult = await externalAPI.call(); // Do this first
await transaction(async (conn) => {
  await conn.execute('UPDATE ...');
  await conn.execute('INSERT ...');
});
```

### 2. Use Row Locking for Read-Then-Write
```javascript
// ❌ BAD: Race condition possible
const device = await getDevice(id);
if (device.status === 'IN_STOCK') {
  await updateDevice(id, 'SHIPPED'); // Another process might have changed it!
}

// ✅ GOOD: Atomic with row lock
await transaction(async (conn) => {
  const [devices] = await conn.execute(
    'SELECT * FROM devices WHERE id = ? FOR UPDATE',
    [id]
  );

  if (devices[0].status === 'IN_STOCK') {
    await conn.execute('UPDATE devices SET status = ? WHERE id = ?', ['SHIPPED', id]);
  }
});
```

### 3. Return Meaningful Results
```javascript
// ❌ BAD: No return value
await transaction(async (conn) => {
  await conn.execute('INSERT ...');
  await conn.execute('UPDATE ...');
});

// ✅ GOOD: Return useful information
const result = await transaction(async (conn) => {
  const [insertResult] = await conn.execute('INSERT ...');
  await conn.execute('UPDATE ...');

  return {
    id: insertResult.insertId,
    affectedRows: insertResult.affectedRows
  };
});
```

### 4. Validate Before Modifying
```javascript
await transaction(async (conn) => {
  // 1. Validate everything first
  const [devices] = await conn.execute('SELECT ...');
  const [locations] = await conn.execute('SELECT ...');

  if (devices.length === 0) throw new Error('Device not found');
  if (!locations[0].is_active) throw new Error('Location inactive');

  // 2. Then perform modifications
  await conn.execute('UPDATE devices ...');
  await conn.execute('INSERT INTO device_history ...');
});
```

### 5. Handle Errors Gracefully
```javascript
async moveDevice(deviceId, locationId, userId) {
  try {
    return await transaction(async (conn) => {
      // Database operations
    });
  } catch (error) {
    // Transaction automatically rolled back
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error('Device already exists at this location');
    }

    // Log for debugging
    console.error('Failed to move device:', error);
    throw error; // Re-throw
  }
}
```

---

## Checklist for New Features

Before committing code, verify:

- [ ] Multi-step database operations are wrapped in transactions
- [ ] Row locking (`FOR UPDATE`) used for read-then-write operations
- [ ] External API calls are OUTSIDE transactions
- [ ] Transactions are kept as short as possible
- [ ] Proper error handling with meaningful error messages
- [ ] Function returns useful information (IDs, counts, etc.)
- [ ] Validation happens before modifications
- [ ] All related tables are updated atomically

---

## Examples from Codebase

### Good Examples ✅

1. **[deviceModel.js](../server/src/models/deviceModel.js)** - `updateStatus()`
   - Uses transaction helper
   - Row locking with FOR UPDATE
   - Updates status + inserts history atomically

2. **[backmarketController.js](../server/src/controllers/backmarketController.js)** - `bookBackmarketShipment()`
   - External API calls first
   - Transaction for all database updates
   - Updates 4 tables atomically

3. **[salesOrderModel.js](../server/src/models/salesOrderModel.js)** - `ship()`
   - Updates order + items + devices atomically
   - Proper transaction boundaries

4. **[purchaseOrderModel.js](../server/src/models/purchaseOrderModel.js)** - `receiveDevices()`
   - Creates devices + updates PO + logs history atomically
   - Status validation within transaction

---

## Monitoring and Debugging

### Enable Query Logging (Development Only)

```javascript
// In database.js
export async function query(sql, params) {
  try {
    console.log('Query:', sql, 'Params:', params); // Development only
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
}
```

### Transaction Duration Warning

```javascript
// Enhanced transaction helper with timing
export async function transaction(callback) {
  const connection = await pool.getConnection();
  const startTime = Date.now();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`Slow transaction: ${duration}ms`);
    }

    return result;
  } catch (error) {
    await connection.rollback();
    error.message = `Transaction failed: ${error.message}`;
    throw error;
  } finally {
    connection.release();
  }
}
```

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Not Using Transactions for Multi-Step Operations
```javascript
// BAD
async updateStatus(id, status) {
  await query('UPDATE devices SET status = ? WHERE id = ?', [status, id]);
  await query('INSERT INTO device_history ...'); // Could fail, leaving inconsistent state
}

// GOOD
async updateStatus(id, status) {
  return transaction(async (conn) => {
    await conn.execute('UPDATE devices SET status = ? WHERE id = ?', [status, id]);
    await conn.execute('INSERT INTO device_history ...');
  });
}
```

### ❌ Mistake 2: Calling Separate Transactional Functions
```javascript
// BAD - Each has its own transaction, not atomic together
await updateOrder(orderId, data);
await shipOrder(orderId);

// GOOD - Single transaction
await transaction(async (conn) => {
  await conn.execute('UPDATE orders ...');
  await conn.execute('UPDATE order_items ...');
  await conn.execute('UPDATE devices ...');
});
```

### ❌ Mistake 3: External API Calls Inside Transactions
```javascript
// BAD - API call inside transaction locks database
await transaction(async (conn) => {
  await conn.execute('UPDATE ...');
  await externalAPI.call(); // SLOW! Locks held too long
  await conn.execute('INSERT ...');
});

// GOOD - API call outside
const apiResult = await externalAPI.call();
await transaction(async (conn) => {
  await conn.execute('UPDATE ...');
  await conn.execute('INSERT ...');
});
```

### ❌ Mistake 4: Not Using Row Locks
```javascript
// BAD - Race condition
const device = await getDevice(id);
if (device.quantity > 0) {
  await updateDevice(id, { quantity: device.quantity - 1 }); // Another request might have changed it
}

// GOOD - Row lock
await transaction(async (conn) => {
  const [devices] = await conn.execute(
    'SELECT quantity FROM devices WHERE id = ? FOR UPDATE',
    [id]
  );

  if (devices[0].quantity > 0) {
    await conn.execute('UPDATE devices SET quantity = quantity - 1 WHERE id = ?', [id]);
  }
});
```

---

## Further Reading

- [MySQL Transaction Documentation](https://dev.mysql.com/doc/refman/8.0/en/commit.html)
- [ACID Properties](https://en.wikipedia.org/wiki/ACID)
- [Database Locking](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html)
- [Transaction Isolation Levels](https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html)

---

**Last Updated:** 2025-12-12
**Maintained By:** Development Team
