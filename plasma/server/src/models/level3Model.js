import { query } from '../config/database.js';
import pool from '../config/database.js';

export const level3Model = {
  // Get active repairs (BOOKED_IN, IN_PROGRESS, AWAITING_PARTS, ON_HOLD)
  async getActiveRepairs(params = {}) {
    const { page = 1, limit = 50, status } = params;
    const offset = (page - 1) * limit;

    const statusFilter = status && ['BOOKED_IN', 'IN_PROGRESS', 'AWAITING_PARTS', 'ON_HOLD'].includes(status)
      ? status
      : null;

    const statusClause = statusFilter
      ? `l3r.status = '${statusFilter}'`
      : `l3r.status IN ('BOOKED_IN', 'IN_PROGRESS', 'AWAITING_PARTS', 'ON_HOLD')`;

    const sql = `
      SELECT
        l3r.id,
        l3r.device_id,
        l3r.location_code,
        l3r.fault_description,
        l3r.engineer_comments,
        l3r.status,
        l3r.booked_in_at,
        l3r.completed_at,
        d.imei,
        d.storage_gb,
        d.color,
        d.grade,
        m.name as manufacturer,
        mo.model_number,
        mo.model_name,
        l.code as current_location,
        u.display_name as booked_by_name,
        u.email as booked_by_email
      FROM level3_repairs l3r
      JOIN devices d ON l3r.device_id = d.id
      JOIN manufacturers m ON d.manufacturer_id = m.id
      JOIN models mo ON d.model_id = mo.id
      LEFT JOIN locations l ON d.location_id = l.id
      LEFT JOIN users u ON l3r.booked_in_by = u.id
      WHERE ${statusClause}
      ORDER BY l3r.booked_in_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countSql = `
      SELECT COUNT(*) as total
      FROM level3_repairs l3r
      WHERE ${statusClause}
    `;

    const repairs = await query(sql);
    const countResult = await query(countSql);
    const total = countResult[0]?.total || 0;

    return {
      repairs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  // Get completed repairs (COMPLETED, BER, UNREPAIRABLE)
  async getCompletedRepairs(params = {}) {
    const { page = 1, limit = 50 } = params;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT
        l3r.id,
        l3r.device_id,
        l3r.location_code,
        l3r.fault_description,
        l3r.engineer_comments,
        l3r.status,
        l3r.booked_in_at,
        l3r.completed_at,
        d.imei,
        d.storage_gb,
        d.color,
        d.grade,
        m.name as manufacturer,
        mo.model_number,
        mo.model_name,
        l.code as current_location,
        u.display_name as booked_by_name,
        u.email as booked_by_email
      FROM level3_repairs l3r
      JOIN devices d ON l3r.device_id = d.id
      JOIN manufacturers m ON d.manufacturer_id = m.id
      JOIN models mo ON d.model_id = mo.id
      LEFT JOIN locations l ON d.location_id = l.id
      LEFT JOIN users u ON l3r.booked_in_by = u.id
      WHERE l3r.status IN ('COMPLETED', 'BER', 'UNREPAIRABLE')
      ORDER BY l3r.completed_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countSql = `
      SELECT COUNT(*) as total
      FROM level3_repairs l3r
      WHERE l3r.status IN ('COMPLETED', 'BER', 'UNREPAIRABLE')
    `;

    const repairs = await query(sql);
    const countResult = await query(countSql);
    const total = countResult[0]?.total || 0;

    return {
      repairs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  // Get single repair by ID with full details
  async getRepairById(id) {
    const sql = `
      SELECT
        l3r.id,
        l3r.device_id,
        l3r.location_code,
        l3r.fault_description,
        l3r.engineer_comments,
        l3r.status,
        l3r.booked_in_at,
        l3r.completed_at,
        d.imei,
        d.tac_code,
        d.storage_gb,
        d.color,
        d.oem_color,
        d.grade,
        d.status as device_status,
        m.id as manufacturer_id,
        m.name as manufacturer,
        mo.id as model_id,
        mo.model_number,
        mo.model_name,
        l.id as location_id,
        l.code as current_location,
        l.name as location_name,
        u.id as booked_by_id,
        u.display_name as booked_by_name,
        u.email as booked_by_email
      FROM level3_repairs l3r
      JOIN devices d ON l3r.device_id = d.id
      JOIN manufacturers m ON d.manufacturer_id = m.id
      JOIN models mo ON d.model_id = mo.id
      LEFT JOIN locations l ON d.location_id = l.id
      LEFT JOIN users u ON l3r.booked_in_by = u.id
      WHERE l3r.id = ?
    `;

    const results = await query(sql, [id]);
    return results[0] || null;
  },

  // Create new repair record
  async createRepair(data, connection = null) {
    const { device_id, location_code, fault_description, booked_in_by } = data;

    const sql = `
      INSERT INTO level3_repairs
      (device_id, location_code, fault_description, booked_in_by, status)
      VALUES (?, ?, ?, ?, 'BOOKED_IN')
    `;

    const executeQuery = connection
      ? (sql, params) => connection.execute(sql, params)
      : (sql, params) => pool.execute(sql, params);

    const [result] = await executeQuery(sql, [device_id, location_code, fault_description, booked_in_by]);
    return result.insertId;
  },

  // Update repair record
  async updateRepair(id, updates, connection = null) {
    const { status, engineer_comments, completed_at } = updates;

    const fields = [];
    const values = [];

    if (status !== undefined) {
      fields.push('status = ?');
      values.push(status);
    }

    if (engineer_comments !== undefined) {
      fields.push('engineer_comments = ?');
      values.push(engineer_comments);
    }

    if (completed_at !== undefined) {
      fields.push('completed_at = ?');
      values.push(completed_at);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const sql = `UPDATE level3_repairs SET ${fields.join(', ')} WHERE id = ?`;

    const executeQuery = connection
      ? (sql, params) => connection.execute(sql, params)
      : (sql, params) => pool.execute(sql, params);

    await executeQuery(sql, values);
    return true;
  },

  // Check if a location is occupied (for single-bay locations)
  async checkLocationOccupancy(locationCode) {
    const sql = `
      SELECT COUNT(*) as count
      FROM devices d
      JOIN locations l ON d.location_id = l.id
      WHERE l.code = ?
    `;

    const results = await query(sql, [locationCode]);
    const count = results[0]?.count || 0;

    return {
      occupied: count > 0,
      currentCount: count
    };
  },

  // Get available L3 locations (unoccupied single-bay repair locations)
  async getAvailableL3Locations() {
    const sql = `
      SELECT
        l.id,
        l.code,
        l.name,
        l.location_type,
        COUNT(d.id) as device_count
      FROM locations l
      LEFT JOIN devices d ON d.location_id = l.id
      WHERE l.location_type = 'LEVEL3'
        AND l.code NOT IN ('LEVEL3_COMPLETE', 'LEVEL3_FAILS')
        AND l.is_active = TRUE
      GROUP BY l.id, l.code, l.name, l.location_type
      HAVING device_count = 0
      ORDER BY l.code
    `;

    return await query(sql);
  },

  // Check if device already has an active L3 repair
  async getActiveRepairByDeviceId(deviceId) {
    const sql = `
      SELECT
        id,
        location_code,
        status,
        fault_description
      FROM level3_repairs
      WHERE device_id = ?
        AND status NOT IN ('COMPLETED', 'BER', 'UNREPAIRABLE')
      LIMIT 1
    `;

    const results = await query(sql, [deviceId]);
    return results[0] || null;
  }
};
