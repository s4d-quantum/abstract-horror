import { query, transaction } from '../config/database.js';
import { buildFilterQuery } from '../utils/helpers.js';

export const deviceModel = {
  // Get all devices with pagination and filters
  async getAll(filters = {}, pagination = {}) {
    const { page = 1, limit = 50 } = pagination;
    const offset = (page - 1) * limit;

    // Base query
    let baseQuery = `
      SELECT
        d.id,
        d.imei,
        d.tac_code,
        m.name as manufacturer,
        mo.model_number,
        mo.model_name,
        d.storage_gb,
        d.color,
        d.oem_color,
        d.grade,
        d.status,
        l.code as location,
        s.id as supplier_id,
        s.name as supplier,
        d.created_at,
        d.received_at
      FROM devices d
      JOIN manufacturers m ON d.manufacturer_id = m.id
      JOIN models mo ON d.model_id = mo.id
      LEFT JOIN locations l ON d.location_id = l.id
      LEFT JOIN suppliers s ON d.supplier_id = s.id
    `;

    // Build filtered query
    const { query: filteredQuery, params } = buildFilterQuery(baseQuery, filters);

    // Add ordering
    const orderBy = filters.sortBy || 'created_at';
    const orderDir = filters.sortDir || 'DESC';
    const finalQuery = `${filteredQuery} ORDER BY d.${orderBy} ${orderDir} LIMIT ${limit} OFFSET ${offset}`;

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM devices d
      JOIN manufacturers m ON d.manufacturer_id = m.id
      JOIN models mo ON d.model_id = mo.id
      LEFT JOIN locations l ON d.location_id = l.id
      LEFT JOIN suppliers s ON d.supplier_id = s.id
      ${filteredQuery.includes('WHERE') ? filteredQuery.substring(filteredQuery.indexOf('WHERE')) : ''}`;

    const [devices, countResult] = await Promise.all([
      query(finalQuery, params),
      query(countQuery, params)
    ]);

    return {
      devices,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    };
  },

  // Get single device by ID with full details
  async getById(id) {
    const sql = `
      SELECT
        d.*,
        m.name as manufacturer,
        m.code as manufacturer_code,
        mo.model_number,
        mo.model_name,
        l.code as location_code,
        l.name as location_name,
        s.name as supplier_name,
        s.supplier_code
      FROM devices d
      JOIN manufacturers m ON d.manufacturer_id = m.id
      JOIN models mo ON d.model_id = mo.id
      LEFT JOIN locations l ON d.location_id = l.id
      LEFT JOIN suppliers s ON d.supplier_id = s.id
      WHERE d.id = ?
    `;

    const results = await query(sql, [id]);
    return results[0] || null;
  },

  // Get device by IMEI
  async getByImei(imei) {
    const sql = `
      SELECT
        d.*,
        m.name as manufacturer,
        mo.model_number,
        mo.model_name,
        l.code as location,
        s.name as supplier
      FROM devices d
      JOIN manufacturers m ON d.manufacturer_id = m.id
      JOIN models mo ON d.model_id = mo.id
      LEFT JOIN locations l ON d.location_id = l.id
      LEFT JOIN suppliers s ON d.supplier_id = s.id
      WHERE d.imei = ?
      ORDER BY d.created_at DESC
      LIMIT 1
    `;

    const results = await query(sql, [imei]);
    return results[0] || null;
  },

  // Get device history
  async getHistory(deviceId, limit = 50) {
    const sql = `
      SELECT
        dh.id,
        dh.event_type,
        dh.field_changed,
        dh.old_value,
        dh.new_value,
        dh.reference_type,
        dh.reference_id,
        dh.notes,
        dh.created_at,
        u.display_name as user_name
      FROM device_history dh
      LEFT JOIN users u ON dh.user_id = u.id
      WHERE dh.device_id = ?
      ORDER BY dh.created_at DESC
      LIMIT ${limit}
    `;

    return await query(sql, [deviceId]);
  },

  // Create new device
  async create(deviceData) {
    const {
      imei,
      tac_code,
      manufacturer_id,
      model_id,
      storage_gb,
      color,
      oem_color,
      grade,
      status,
      location_id,
      purchase_order_id,
      supplier_id,
      qc_required,
      repair_required,
      received_at
    } = deviceData;

    const sql = `
      INSERT INTO devices (
        imei, tac_code, manufacturer_id, model_id, storage_gb, color, oem_color,
        grade, status, location_id, purchase_order_id, supplier_id,
        qc_required, repair_required, received_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await query(sql, [
      imei, tac_code, manufacturer_id, model_id, storage_gb || null,
      color || null, oem_color || null, grade || null, status || 'AWAITING_QC',
      location_id || null, purchase_order_id || null, supplier_id || null,
      qc_required !== false, repair_required || false, received_at || null
    ]);

    return result.insertId;
  },

  // Update device
  async update(id, updates) {
    const fields = [];
    const values = [];

    // Build dynamic update query
    const allowedFields = [
      "storage_gb", "color", "oem_color", "grade",
      "location_id", "qc_completed", "qc_completed_at",
      "repair_completed", "repair_completed_at"
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);

    const sql = `UPDATE devices SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await query(sql, values);

    return true;
  },

  // Update device status with transaction protection
  async updateStatus(id, newStatus, userId = null, notes = null) {
    return transaction(async (connection) => {
      // Lock row and get current status atomically
      const [devices] = await connection.execute(
        'SELECT id, imei, status FROM devices WHERE id = ? FOR UPDATE',
        [id]
      );

      if (devices.length === 0) {
        throw new Error('Device not found');
      }

      const device = devices[0];
      const oldStatus = device.status;

      // Skip update if status is already the target status
      if (oldStatus === newStatus) {
        return true;
      }

      // Update status
      await connection.execute(
        'UPDATE devices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newStatus, id]
      );

      // Log history
      await connection.execute(
        `INSERT INTO device_history (device_id, imei, event_type, field_changed, old_value, new_value, notes, user_id)
         VALUES (?, ?, 'STATUS_CHANGE', 'status', ?, ?, ?, ?)`,
        [id, device.imei, oldStatus, newStatus, notes, userId]
      );

      return true;
    });
  },

  // Get filter options (for dropdowns)
  async getFilterOptions() {
    const [manufacturers, suppliers, locations, statuses, models, customers] = await Promise.all([
      query('SELECT id, name, code FROM manufacturers ORDER BY name'),
      query('SELECT id, name FROM suppliers WHERE is_active = TRUE ORDER BY name'),
      query('SELECT id, code, name FROM locations WHERE is_active = TRUE ORDER BY code'),
      query(`SELECT DISTINCT status FROM devices ORDER BY status`),
      query('SELECT id, manufacturer_id, model_number, model_name FROM models ORDER BY model_name, model_number'),
      query(`
        SELECT id, customer_code, name, email, is_backmarket
        FROM customers
        WHERE is_active = TRUE
        ORDER BY name
      `)
    ]);

    return {
      manufacturers,
      suppliers,
      locations,
      models,
      customers,
      statuses: statuses.map(s => s.status),
      grades: ['A', 'B', 'C', 'D', 'E', 'F'],
      storageOptions: [8, 16, 32, 64, 128, 256, 512, 1024]
    };
  },

  // Delete device (soft delete by changing status)
  async softDelete(id) {
    await query('UPDATE devices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['SCRAPPED', id]);
    return true;
  },

  // Get devices by purchase order
  async getByPurchaseOrder(purchaseOrderId) {
    const sql = `
      SELECT
        d.*,
        m.name as manufacturer,
        mo.model_name
      FROM devices d
      JOIN manufacturers m ON d.manufacturer_id = m.id
      JOIN models mo ON d.model_id = mo.id
      WHERE d.purchase_order_id = ?
      ORDER BY d.created_at DESC
    `;

    return await query(sql, [purchaseOrderId]);
  },

  // Check if IMEI exists in stock
  async existsInStock(imei) {
    const result = await query(
      'SELECT id FROM devices WHERE imei = ? AND status = ?',
      [imei, 'IN_STOCK']
    );
    return result.length > 0;
  }
};
