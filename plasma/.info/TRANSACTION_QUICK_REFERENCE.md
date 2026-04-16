# Transaction Quick Reference Card

> **TL;DR:** Use `transaction()` helper for ANY operation that modifies 2+ tables or does read-then-write.

---

## Import

```javascript
import { transaction } from '../config/database.js';
```

---

## Basic Pattern

```javascript
async function myOperation(params) {
  return transaction(async (connection) => {
    // All your database operations here
    await connection.execute('INSERT INTO ...', [params]);
    await connection.execute('UPDATE ...', [params]);

    return { success: true };
  });
}
```

---

## Decision Tree

```
Do you need to modify the database?
│
├─ YES → Is it ONE single INSERT/UPDATE/DELETE?
│        │
│        ├─ YES → Use regular query() - NO transaction needed ✅
│        │
│        └─ NO → Multiple operations?
│               │
│               └─ YES → Use transaction() helper ✅
│
└─ NO → Read-only? Use regular query() ✅
```

---

## Common Use Cases

### ✅ Use Transactions For:

| Scenario | Example |
|----------|---------|
| **Update + Log** | Update device status AND insert history |
| **Create + Lines** | Create order AND insert order lines |
| **Read-Then-Write** | Check stock AND reserve device |
| **Bulk Updates** | Move multiple devices AND log each move |
| **External API Result** | Store shipment data from courier API |

### ❌ Don't Use Transactions For:

| Scenario | Example |
|----------|---------|
| **Single Operation** | Just one INSERT or UPDATE |
| **Read-Only** | SELECT queries |
| **Long Operations** | File uploads, email sending |

---

## Patterns

### Pattern 1: Update with Logging

```javascript
async updateStatus(id, newStatus, userId) {
  return transaction(async (conn) => {
    // Get current state with lock
    const [rows] = await conn.execute(
      'SELECT status, imei FROM devices WHERE id = ? FOR UPDATE',
      [id]
    );

    // Update
    await conn.execute(
      'UPDATE devices SET status = ? WHERE id = ?',
      [newStatus, id]
    );

    // Log
    await conn.execute(
      'INSERT INTO device_history (device_id, old_value, new_value, user_id) VALUES (?, ?, ?, ?)',
      [id, rows[0].status, newStatus, userId]
    );

    return { updated: true };
  });
}
```

### Pattern 2: External API + Database

```javascript
async shipOrder(orderId) {
  // Step 1: External API (OUTSIDE transaction)
  const tracking = await courierAPI.bookShipment(orderData);
  const label = await courierAPI.getLabel(tracking.shipmentId);

  // Step 2: Database (INSIDE transaction)
  return transaction(async (conn) => {
    await conn.execute('UPDATE orders SET status = ?, tracking = ? WHERE id = ?', ['SHIPPED', tracking.number, orderId]);
    await conn.execute('INSERT INTO labels (order_id, data) VALUES (?, ?)', [orderId, label]);
  });
}
```

### Pattern 3: Bulk Operations

```javascript
async bulkMove(deviceIds, newLocation, userId) {
  return transaction(async (conn) => {
    // Validate all exist
    const [devices] = await conn.execute(
      `SELECT id, imei FROM devices WHERE id IN (${deviceIds.map(() => '?').join(',')})`,
      deviceIds
    );

    // Bulk update
    await conn.execute(
      `UPDATE devices SET location_id = ? WHERE id IN (${deviceIds.map(() => '?').join(',')})`,
      [newLocation, ...deviceIds]
    );

    // Log each
    for (const device of devices) {
      await conn.execute(
        'INSERT INTO device_history (device_id, imei, event_type, user_id) VALUES (?, ?, ?, ?)',
        [device.id, device.imei, 'LOCATION_CHANGE', userId]
      );
    }

    return { count: devices.length };
  });
}
```

---

## Row Locking (Preventing Race Conditions)

### When to Lock

Use `FOR UPDATE` when:
- Reading a value you're about to modify
- Checking availability before reserving
- Any read-then-write operation

### How to Lock

```javascript
return transaction(async (conn) => {
  // Lock the row(s)
  const [rows] = await conn.execute(
    'SELECT * FROM devices WHERE id = ? FOR UPDATE',
    [deviceId]
  );

  // Now safe to modify
  await conn.execute('UPDATE devices SET ...', [...]);
});
```

---

## Error Handling

### Automatic Rollback

```javascript
try {
  const result = await transaction(async (conn) => {
    // If ANY error occurs, transaction auto-rolls back
    await conn.execute('INSERT ...');
    await conn.execute('UPDATE ...');
    return { success: true };
  });
} catch (error) {
  // Transaction already rolled back
  console.error('Failed:', error.message);
}
```

### Validation

```javascript
return transaction(async (conn) => {
  // Validate FIRST
  const [device] = await conn.execute('SELECT * FROM devices WHERE id = ?', [id]);

  if (!device) {
    throw new Error('Device not found'); // Auto rollback
  }

  if (device.status !== 'IN_STOCK') {
    throw new Error('Not in stock'); // Auto rollback
  }

  // Then modify
  await conn.execute('UPDATE devices SET ...', [...]);
});
```

---

## Checklist

Before you commit:

- [ ] Multi-table updates wrapped in `transaction()`?
- [ ] Row lock (`FOR UPDATE`) for read-then-write?
- [ ] External API calls OUTSIDE transaction?
- [ ] Validation BEFORE modifications?
- [ ] Returns meaningful result?

---

## Real Examples in Codebase

| File | Function | Line |
|------|----------|------|
| `server/src/models/deviceModel.js` | `updateStatus()` | 209 |
| `server/src/controllers/backmarketController.js` | `bookBackmarketShipment()` | 145 |
| `server/src/controllers/colorCheckController.js` | `processImei()` | 177 |
| `server/src/models/salesOrderModel.js` | `ship()` | 647 |
| `server/src/models/purchaseOrderModel.js` | `receiveDevices()` | 257 |

---

## Common Mistakes

### ❌ Mistake: API Inside Transaction
```javascript
// BAD
await transaction(async (conn) => {
  await conn.execute('UPDATE ...');
  await externalAPI.call(); // SLOW!
  await conn.execute('INSERT ...');
});
```

### ✅ Fix: API Outside Transaction
```javascript
// GOOD
const result = await externalAPI.call();
await transaction(async (conn) => {
  await conn.execute('UPDATE ...');
  await conn.execute('INSERT ...');
});
```

---

### ❌ Mistake: No Row Lock
```javascript
// BAD - Race condition
const device = await getDevice(id);
if (device.status === 'IN_STOCK') {
  await updateDevice(id, 'SHIPPED'); // Might fail!
}
```

### ✅ Fix: Use Row Lock
```javascript
// GOOD
await transaction(async (conn) => {
  const [devices] = await conn.execute(
    'SELECT status FROM devices WHERE id = ? FOR UPDATE',
    [id]
  );

  if (devices[0].status === 'IN_STOCK') {
    await conn.execute('UPDATE devices SET status = ? WHERE id = ?', ['SHIPPED', id]);
  }
});
```

---

### ❌ Mistake: Manual Connection Management
```javascript
// BAD - Manual cleanup
const conn = await db.getConnection();
try {
  await conn.beginTransaction();
  await conn.execute('...');
  await conn.commit();
} catch (e) {
  await conn.rollback();
  throw e;
} finally {
  conn.release();
}
```

### ✅ Fix: Use Transaction Helper
```javascript
// GOOD - Automatic cleanup
await transaction(async (conn) => {
  await conn.execute('...');
});
```

---

## Get Help

📖 **Full Guide:** `.info/TRANSACTION_GUIDELINES.md`
📊 **Summary:** `.info/TRANSACTION_REFACTOR_SUMMARY.md`
🔧 **Helper Code:** `server/src/config/database.js`

---

**Remember:** When in doubt, use a transaction. It's better to be safe than to have inconsistent data!
