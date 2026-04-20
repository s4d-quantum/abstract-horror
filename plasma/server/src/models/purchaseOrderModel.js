import db, { transaction } from '../config/database.js';
import { qcModel } from './qcModel.js';
import { repairModel } from './repairModel.js';

export const purchaseOrderModel = {
  // Get all purchase orders with filters and pagination
  async getAll(filters = {}, pagination = {}) {
    const { page = 1, limit = 50 } = pagination;
    const offset = (page - 1) * limit;

    const selectClause = `
      SELECT
        po.id,
        po.po_number,
        po.status,
        po.expected_quantity,
        po.received_quantity,
        po.supplier_ref,
        po.notes,
        po.created_at,
        po.confirmed_at,
        po.updated_at,
        s.id as supplier_id,
        s.name as supplier_name,
        s.supplier_code,
        u.display_name as created_by_name
    `;
    const fromClause = `
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON po.created_by = u.id
      WHERE 1=1
    `;
    // WARNING: Only ever extend whereClause using parameterized `?` placeholders.
    // Never use string interpolation (e.g. `AND status = '${value}'`) — SQL injection risk.
    let whereClause = '';

    const params = [];

    // Apply filters
    if (filters.status) {
      whereClause += ' AND po.status = ?';
      params.push(filters.status);
    }

    if (filters.supplier_id) {
      whereClause += ' AND po.supplier_id = ?';
      params.push(Number(filters.supplier_id));
    }

    if (filters.search) {
      whereClause += ' AND (po.po_number LIKE ? OR s.name LIKE ? OR po.supplier_ref LIKE ?)';
      const searchPattern = `%${filters.search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (filters.date_from) {
      whereClause += ' AND po.created_at >= ?';
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      whereClause += ' AND po.created_at <= ?';
      params.push(filters.date_to);
    }

    // Count total records
    const countQuery = `SELECT COUNT(*) as total ${fromClause}${whereClause}`;
    const [countResult] = await db.query(countQuery, params);
    const total = Number(countResult[0]?.total) || 0;

    const ALLOWED_PO_SORT = {
      created_at: 'po.created_at',
      status: 'po.status',
      po_number: 'po.po_number',
      supplier_name: 's.name'
    };
    const sortCol = ALLOWED_PO_SORT[filters.sortBy] || 'po.created_at';
    const sortDir = /^ASC$/i.test(filters.sortDir) ? 'ASC' : 'DESC';

    const query = `${selectClause}${fromClause}${whereClause} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [orders] = await db.query(query, params);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasMore: page * limit < total
      }
    };
  },

  // Get single purchase order by ID with lines
  async getById(id) {
    const [orders] = await db.query(`
      SELECT
        po.id,
        po.po_number,
        po.status,
        po.expected_quantity,
        po.received_quantity,
        po.supplier_ref,
        po.notes,
        po.created_at,
        po.confirmed_at,
        po.updated_at,
        s.id as supplier_id,
        s.name as supplier_name,
        s.supplier_code,
        u.display_name as created_by_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON po.created_by = u.id
      WHERE po.id = ?
    `, [id]);

    if (orders.length === 0) return null;

    const order = orders[0];

    // Get lines
    const [lines] = await db.query(`
      SELECT
        pol.id,
        pol.expected_quantity,
        pol.received_quantity,
        pol.storage_gb,
        pol.color,
        pol.created_at,
        m.id as manufacturer_id,
        m.name as manufacturer_name,
        mo.id as model_id,
        mo.model_number,
        mo.model_name
      FROM purchase_order_lines pol
      LEFT JOIN manufacturers m ON pol.manufacturer_id = m.id
      LEFT JOIN models mo ON pol.model_id = mo.id
      WHERE pol.purchase_order_id = ?
      ORDER BY pol.id
    `, [id]);

    order.lines = lines;
    return order;
  },

  // Create new purchase order
  async create(data, userId) {
    return transaction(async (connection) => {
      // Generate PO number
      const [maxPO] = await connection.query(
        "SELECT po_number FROM purchase_orders ORDER BY id DESC LIMIT 1"
      );

      let poNumber = 'PO-0001';
      if (maxPO.length > 0 && maxPO[0].po_number) {
        const lastNum = parseInt(maxPO[0].po_number.split('-')[1]);
        poNumber = `PO-${String(lastNum + 1).padStart(4, '0')}`;
      }

      // Insert PO header
      const [result] = await connection.query(`
        INSERT INTO purchase_orders (
          po_number, supplier_id, supplier_ref, status,
          expected_quantity, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        poNumber,
        data.supplier_id,
        data.supplier_ref || null,
        data.status || 'DRAFT',
        data.expected_quantity || 0,
        data.notes || null,
        userId
      ]);

      const poId = result.insertId;

      // Insert lines if provided
      if (data.lines && data.lines.length > 0) {
        for (const line of data.lines) {
          await connection.query(`
            INSERT INTO purchase_order_lines (
              purchase_order_id, manufacturer_id, model_id,
              storage_gb, color, expected_quantity
            ) VALUES (?, ?, ?, ?, ?, ?)
          `, [
            poId,
            line.manufacturer_id,
            line.model_id,
            line.storage_gb || null,
            line.color || null,
            line.expected_quantity || 1
          ]);
        }

        // Update expected quantity
        const totalExpected = data.lines.reduce((sum, line) => sum + (line.expected_quantity || 1), 0);
        await connection.query(
          'UPDATE purchase_orders SET expected_quantity = ? WHERE id = ?',
          [totalExpected, poId]
        );
      }

      return { id: poId, po_number: poNumber };
    });
  },

  // Update purchase order
  async update(id, data) {
    const updates = [];
    const params = [];

    if (data.supplier_ref !== undefined) {
      updates.push('supplier_ref = ?');
      params.push(data.supplier_ref);
    }

    if (data.notes !== undefined) {
      updates.push('notes = ?');
      params.push(data.notes);
    }

    if (updates.length === 0) return false;

    params.push(id);
    await db.query(
      `UPDATE purchase_orders SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return true;
  },

  // Confirm purchase order
  async confirm(id) {
    await db.query(`
      UPDATE purchase_orders
      SET status = 'CONFIRMED', confirmed_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'DRAFT'
    `, [id]);

    return true;
  },

  // Cancel purchase order
  async cancel(id) {
    await db.query(`
      UPDATE purchase_orders
      SET status = 'CANCELLED'
      WHERE id = ? AND status IN ('DRAFT', 'CONFIRMED')
    `, [id]);

    return true;
  },

  // Receive devices against a purchase order
  async receiveDevices(poId, devices, userId, locationId) {
    return transaction(async (connection) => {
      // Verify PO exists and is in correct status
      const [pos] = await connection.query(
        'SELECT id, status, requires_qc, requires_repair FROM purchase_orders WHERE id = ?',
        [poId]
      );

      if (pos.length === 0) {
        throw new Error('Purchase order not found');
      }

      if (!['CONFIRMED', 'PARTIALLY_RECEIVED'].includes(pos[0].status)) {
        throw new Error('Purchase order must be confirmed before receiving');
      }

      const po = pos[0];

      // Determine device status — QC always runs before repair when both flags set
      let deviceStatus = 'IN_STOCK';
      if (po.requires_qc !== false && po.requires_qc !== 0) {
        deviceStatus = 'AWAITING_QC';
      } else if (po.requires_repair) {
        deviceStatus = 'AWAITING_REPAIR';
      }

      const receivedDevices = [];

      // Process each device
      for (const device of devices) {
        // Insert device
        const [deviceResult] = await connection.query(`
          INSERT INTO devices (
            imei, tac_code, manufacturer_id, model_id,
            storage_gb, color, oem_color, grade,
            status, location_id, purchase_order_id, supplier_id,
            qc_required, repair_required, received_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          device.imei,
          device.imei.substring(0, 8),
          device.manufacturer_id,
          device.model_id,
          device.storage_gb || null,
          device.color || null,
          device.oem_color || null,
          device.grade || null,
          deviceStatus,
          locationId || null,
          poId,
          device.supplier_id,
          po.requires_qc !== false && po.requires_qc !== 0 ? 1 : 0,
          po.requires_repair ? 1 : 0
        ]);

        const deviceId = deviceResult.insertId;
        receivedDevices.push(deviceId);

        // Create history entry
        await connection.query(`
          INSERT INTO device_history (
            device_id, imei, event_type, reference_type, reference_id,
            notes, user_id
          ) VALUES (?, ?, 'RECEIVED', 'PURCHASE_ORDER', ?, ?, ?)
        `, [deviceId, device.imei, poId, `Received via PO`, userId]);

        // Update line received quantity if line_id provided
        if (device.line_id) {
          await connection.query(`
            UPDATE purchase_order_lines
            SET received_quantity = received_quantity + 1
            WHERE id = ?
          `, [device.line_id]);
        }
      }

      if (po.requires_qc !== false && po.requires_qc !== 0) {
        // QC required — create QC job; repair (if also required) runs after QC completes
        await qcModel.createAutoJobForDevices(connection, poId, receivedDevices, userId);
      } else if (po.requires_repair) {
        // No QC — create repair job immediately
        await repairModel.createAutoJobForDevices(connection, poId, receivedDevices, userId, null);
      }

      // Update PO received quantity
      await connection.query(`
        UPDATE purchase_orders
        SET received_quantity = received_quantity + ?
        WHERE id = ?
      `, [devices.length, poId]);

      // Update PO status based on received vs expected
      const [updatedPO] = await connection.query(
        'SELECT expected_quantity, received_quantity FROM purchase_orders WHERE id = ?',
        [poId]
      );

      if (updatedPO[0].received_quantity >= updatedPO[0].expected_quantity) {
        await connection.query(
          "UPDATE purchase_orders SET status = 'FULLY_RECEIVED' WHERE id = ?",
          [poId]
        );
      } else {
        await connection.query(
          "UPDATE purchase_orders SET status = 'PARTIALLY_RECEIVED' WHERE id = ?",
          [poId]
        );
      }

      return { receivedDevices, count: devices.length };
    });
  },

  // Get devices received for a PO
  async getReceivedDevices(poId, limit = 100) {
    const [devices] = await db.query(`
      SELECT
        d.id,
        d.imei,
        d.storage_gb,
        d.color,
        d.grade,
        d.status,
        d.received_at,
        m.name as manufacturer,
        mo.model_number,
        mo.model_name,
        l.code as location
      FROM devices d
      LEFT JOIN manufacturers m ON d.manufacturer_id = m.id
      LEFT JOIN models mo ON d.model_id = mo.id
      LEFT JOIN locations l ON d.location_id = l.id
      WHERE d.purchase_order_id = ?
      ORDER BY d.received_at DESC
      LIMIT ?
    `, [poId, limit]);

    return devices;
  },

  // New method: Create PO and receive devices in one transaction (book-as-arrive flow)
  async createWithDevices(poData, devicesData, userId) {
    return transaction(async (connection) => {
      // Step 1: Generate PO number
      const [maxPO] = await connection.query(
        "SELECT MAX(CAST(SUBSTRING(po_number, 4, 6) AS SIGNED)) as max_num FROM purchase_orders WHERE po_number LIKE 'PO-%'"
      );
      const nextNum = (maxPO[0].max_num || 0) + 1;
      const poNumber = `PO-${String(nextNum).padStart(4, '0')}`;

      // Step 2: Insert purchase order
      const [poResult] = await connection.query(`
        INSERT INTO purchase_orders (
          po_number, supplier_id, supplier_ref, status,
          expected_quantity, received_quantity,
          requires_qc, requires_repair, notes, created_by, confirmed_at
        ) VALUES (?, ?, ?, 'FULLY_RECEIVED', ?, ?, ?, ?, ?, ?, NOW())
      `, [
        poNumber,
        poData.supplier_id,
        poData.supplier_ref || null,
        devicesData.length,  // expected = received (book-as-arrive)
        devicesData.length,
        poData.requires_qc !== false,  // Default true
        poData.requires_repair || false,
        poData.notes || null,
        userId
      ]);

      const purchaseOrderId = poResult.insertId;

      // Step 3: Determine device status based on PO flags.
      // QC always runs BEFORE repair when both flags are set.
      // The repair job is created AFTER QC completes (via completeQcJob controller).
      let deviceStatus = 'IN_STOCK';
      if (poData.requires_qc !== false) {
        deviceStatus = 'AWAITING_QC';       // QC first — even if repair also required
      } else if (poData.requires_repair) {
        deviceStatus = 'AWAITING_REPAIR';   // No QC — straight to repair
      }

      const receivedDeviceIds = [];

      // Step 4: Insert all devices
      for (const device of devicesData) {
        const tacCode = device.imei.substring(0, 8);

        const [deviceResult] = await connection.query(`
          INSERT INTO devices (
            imei, tac_code, manufacturer_id, model_id,
            storage_gb, color, grade, status, location_id,
            purchase_order_id, supplier_id,
            qc_required, repair_required, received_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          device.imei,
          tacCode,
          device.manufacturer_id,
          device.model_id,
          device.storage_gb,
          device.color,
          device.grade || null,
          deviceStatus,
          device.location_id,
          purchaseOrderId,
          poData.supplier_id,
          poData.requires_qc !== false,
          poData.requires_repair || false
        ]);

        receivedDeviceIds.push(deviceResult.insertId);

        // Step 5: Create device history entry
        await connection.query(`
          INSERT INTO device_history (
            device_id, imei, event_type, reference_type, reference_id,
            notes, user_id
          ) VALUES (?, ?, 'RECEIVED', 'PURCHASE_ORDER', ?, ?, ?)
        `, [
          deviceResult.insertId,
          device.imei,
          purchaseOrderId,
          `Received via ${poNumber}`,
          userId
        ]);
      }

      if (poData.requires_qc !== false) {
        // QC required — create QC job now; repair job (if also required) created after QC completes
        await qcModel.createAutoJobForDevices(
          connection,
          purchaseOrderId,
          receivedDeviceIds,
          userId,
        );
      } else if (poData.requires_repair) {
        // No QC — create repair job immediately
        await repairModel.createAutoJobForDevices(
          connection,
          purchaseOrderId,
          receivedDeviceIds,
          userId,
          poData.fault_description,
        );
      }

      return { id: purchaseOrderId, po_number: poNumber };
    });
  }
};
