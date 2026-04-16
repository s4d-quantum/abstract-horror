import pool, { query } from '../config/database.js';
import { generateSequentialNumber } from '../utils/helpers.js';

// Whitelist for future configurable sorting — only allow columns that exist on repair_jobs.
// Currently unused (getJobs uses hard-coded priority + created_at ordering) but prevents
// SQL injection if sort parameters are ever exposed to the client.
export const VALID_SORT_COLUMNS = Object.freeze({
  created_at: 'rj.created_at',
  updated_at: 'rj.updated_at',
  status: 'rj.status',
  priority: 'rj.priority',
});

function runWithConnection(connection = null) {
  return connection
    ? (sql, params = []) => connection.execute(sql, params)
    : (sql, params = []) => pool.execute(sql, params);
}

export const repairModel = {
  async getJobs(filters = {}, pagination = {}) {
    const page = Math.max(parseInt(pagination.page || 1, 10), 1);
    const limit = Math.max(parseInt(pagination.limit || 25, 10), 1);
    const offset = (page - 1) * limit;

    const whereConditions = ['1 = 1'];
    const params = [];

    if (filters.status) {
      whereConditions.push('rj.status = ?');
      params.push(filters.status);
    }

    if (filters.purchase_order_id) {
      whereConditions.push('rj.purchase_order_id = ?');
      params.push(parseInt(filters.purchase_order_id, 10));
    }

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      whereConditions.push(
        '(rj.job_number LIKE ? OR po.po_number LIKE ? OR s.name LIKE ? OR so.so_number LIKE ?)',
      );
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.join(' AND ');

    const jobs = await query(
      `SELECT
         rj.id,
         rj.job_number,
         rj.purchase_order_id,
         rj.status,
         rj.priority,
         rj.total_devices,
         rj.completed_devices,
         rj.notes,
         rj.target_sales_order_id,
         rj.started_at,
         rj.completed_at,
         rj.created_at,
         po.po_number,
         po.supplier_ref,
         s.id AS supplier_id,
         s.name AS supplier_name,
         creator.id AS created_by,
         creator.display_name AS created_by_name,
         so.so_number AS target_sales_order_number
       FROM repair_jobs rj
       JOIN purchase_orders po ON rj.purchase_order_id = po.id
       JOIN suppliers s ON po.supplier_id = s.id
       LEFT JOIN users creator ON rj.created_by = creator.id
       LEFT JOIN sales_orders so ON rj.target_sales_order_id = so.id
       WHERE ${whereClause}
       ORDER BY
         CASE rj.priority
           WHEN 'URGENT' THEN 1
           WHEN 'HIGH' THEN 2
           WHEN 'NORMAL' THEN 3
           ELSE 4
         END,
         rj.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    const countRows = await query(
      `SELECT COUNT(*) AS total
       FROM repair_jobs rj
       JOIN purchase_orders po ON rj.purchase_order_id = po.id
       JOIN suppliers s ON po.supplier_id = s.id
       LEFT JOIN sales_orders so ON rj.target_sales_order_id = so.id
       WHERE ${whereClause}`,
      params,
    );

    const total = countRows[0]?.total || 0;

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  },

  async getJobById(id) {
    const rows = await query(
      `SELECT
         rj.id,
         rj.job_number,
         rj.purchase_order_id,
         rj.status,
         rj.priority,
         rj.total_devices,
         rj.completed_devices,
         rj.notes,
         rj.target_sales_order_id,
         rj.started_at,
         rj.completed_at,
         rj.created_at,
         rj.updated_at,
         po.po_number,
         po.supplier_ref,
         po.requires_qc,
         po.requires_repair,
         s.id AS supplier_id,
         s.name AS supplier_name,
         creator.display_name AS created_by_name,
         so.so_number AS target_sales_order_number
       FROM repair_jobs rj
       JOIN purchase_orders po ON rj.purchase_order_id = po.id
       JOIN suppliers s ON po.supplier_id = s.id
       LEFT JOIN users creator ON rj.created_by = creator.id
       LEFT JOIN sales_orders so ON rj.target_sales_order_id = so.id
       WHERE rj.id = ?`,
      [id],
    );
    return rows[0] || null;
  },

  async getJobRecords(jobId) {
    return query(
      `SELECT
         rr.id,
         rr.repair_job_id,
         rr.device_id,
         rr.status,
         rr.fault_description,
         rr.engineer_comments,
         rr.outcome,
         rr.resolution_notes,
         rr.started_at,
         rr.completed_at,
         rr.created_at,
         rr.updated_at,
         d.imei,
         d.manufacturer_id,
         d.model_id,
         d.storage_gb,
         d.color,
         d.grade,
         d.status AS device_status,
         d.location_id,
         l.code AS location_code,
         m.name AS manufacturer_name,
         mo.model_name,
         mo.model_number,
         repaired.display_name AS repaired_by_name
       FROM repair_records rr
       JOIN devices d ON rr.device_id = d.id
       JOIN manufacturers m ON d.manufacturer_id = m.id
       JOIN models mo ON d.model_id = mo.id
       LEFT JOIN locations l ON d.location_id = l.id
       LEFT JOIN users repaired ON rr.repaired_by = repaired.id
       WHERE rr.repair_job_id = ?
       ORDER BY rr.created_at ASC, rr.id ASC`,
      [jobId],
    );
  },

  async getEligibleDevices(jobId) {
    return query(
      `SELECT
         d.id,
         d.imei,
         d.storage_gb,
         d.color,
         d.grade,
         d.status,
         d.repair_required,
         l.code AS location_code,
         m.name AS manufacturer_name,
         mo.model_name,
         mo.model_number
       FROM repair_jobs rj
       JOIN devices d ON d.purchase_order_id = rj.purchase_order_id
       JOIN manufacturers m ON d.manufacturer_id = m.id
       JOIN models mo ON d.model_id = mo.id
       LEFT JOIN locations l ON d.location_id = l.id
       WHERE rj.id = ?
         AND d.status NOT IN ('SHIPPED', 'SCRAPPED', 'RETURNED', 'OUT_OF_STOCK')
         AND (d.repair_required = TRUE OR d.status IN ('AWAITING_REPAIR', 'IN_REPAIR'))
         AND NOT EXISTS (
           SELECT 1
           FROM repair_records rr2
           JOIN repair_jobs rj2 ON rr2.repair_job_id = rj2.id
           WHERE rr2.device_id = d.id
             AND rj2.status != 'CANCELLED'
             AND rr2.status IN ('PENDING', 'IN_PROGRESS')
         )
       ORDER BY d.created_at ASC, d.id ASC`,
      [jobId],
    );
  },

  async getOpenRecordByDeviceId(deviceId, connection = null) {
    const execute = runWithConnection(connection);
    const [rows] = await execute(
      `SELECT
         rr.id,
         rr.repair_job_id,
         rr.status,
         rj.status AS job_status
       FROM repair_records rr
       JOIN repair_jobs rj ON rr.repair_job_id = rj.id
       WHERE rr.device_id = ?
         AND rj.status != 'CANCELLED'
         AND rr.status IN ('PENDING', 'IN_PROGRESS')
       LIMIT 1`,
      [deviceId],
    );
    return rows[0] || null;
  },

  async getRecordById(id) {
    const rows = await query(
      `SELECT
         rr.id,
         rr.repair_job_id,
         rr.device_id,
         rr.status,
         rr.fault_description,
         rr.engineer_comments,
         rr.outcome,
         rr.resolution_notes,
         rr.repaired_by,
         rr.started_at,
         rr.completed_at,
         rr.created_at,
         rr.updated_at,
         rj.job_number,
         rj.priority,
         rj.notes AS job_notes,
         rj.purchase_order_id,
         rj.target_sales_order_id,
         po.po_number,
         po.supplier_ref,
         s.id AS supplier_id,
         s.name AS supplier_name,
         so.so_number AS target_sales_order_number,
         d.imei,
         d.tac_code,
         d.storage_gb,
         d.color,
         d.oem_color,
         d.grade,
         d.status AS device_status,
         d.location_id,
         d.repair_required,
         d.repair_completed,
         d.repair_completed_at,
         l.code AS location_code,
         l.name AS location_name,
         m.id AS manufacturer_id,
         m.name AS manufacturer_name,
         mo.id AS model_id,
         mo.model_name,
         mo.model_number,
         repaired.display_name AS repaired_by_name
       FROM repair_records rr
       JOIN repair_jobs rj ON rr.repair_job_id = rj.id
       JOIN purchase_orders po ON rj.purchase_order_id = po.id
       JOIN suppliers s ON po.supplier_id = s.id
       JOIN devices d ON rr.device_id = d.id
       JOIN manufacturers m ON d.manufacturer_id = m.id
       JOIN models mo ON d.model_id = mo.id
       LEFT JOIN locations l ON d.location_id = l.id
       LEFT JOIN sales_orders so ON rj.target_sales_order_id = so.id
       LEFT JOIN users repaired ON rr.repaired_by = repaired.id
       WHERE rr.id = ?`,
      [id],
    );
    return rows[0] || null;
  },

  async getComments(recordId) {
    return query(
      `SELECT
         rc.id,
         rc.repair_record_id,
         rc.comment_text,
         rc.created_by,
         rc.created_at,
         u.display_name AS created_by_name
       FROM repair_comments rc
       LEFT JOIN users u ON rc.created_by = u.id
       WHERE rc.repair_record_id = ?
       ORDER BY rc.created_at DESC, rc.id DESC`,
      [recordId],
    );
  },

  async getPartAllocations(recordId) {
    return query(
      `SELECT
         rpu.id,
         rpu.repair_record_id,
         rpu.part_id,
         rpu.part_lot_id,
         rpu.quantity,
         rpu.status,
         rpu.notes,
         rpu.added_at,
         rpu.removed_at,
         p.sku,
         p.name AS variant_name,
         p.color AS variant_color,
         p.quality_tier,
         pb.id AS part_base_id,
         pb.base_code,
         pb.name AS base_name,
         pb.changes_device_color,
         pl.lot_ref,
         s.name AS supplier_name
       FROM repair_parts_used rpu
       JOIN parts p ON rpu.part_id = p.id
       LEFT JOIN part_bases pb ON p.part_base_id = pb.id
       LEFT JOIN part_lots pl ON rpu.part_lot_id = pl.id
       LEFT JOIN suppliers s ON pl.supplier_id = s.id
       WHERE rpu.repair_record_id = ?
       ORDER BY rpu.added_at DESC, rpu.id DESC`,
      [recordId],
    );
  },

  async getCompatibleParts(recordId) {
    return query(
      `SELECT
         p.id AS part_id,
         p.sku,
         p.name AS variant_name,
         p.color AS variant_color,
         p.quality_tier,
         p.supplier_part_ref,
         p.available_stock,
         pb.id AS part_base_id,
         pb.base_code,
         pb.name AS base_name,
         pb.changes_device_color,
         pl.id AS part_lot_id,
         pl.lot_ref,
         pl.available_quantity,
         pl.received_at,
         s.id AS supplier_id,
         s.name AS supplier_name
        FROM repair_records rr
       JOIN devices d ON rr.device_id = d.id
       JOIN part_compatibility pc
         ON pc.model_id = d.model_id
       JOIN part_bases pb ON pc.part_base_id = pb.id AND pb.is_active = TRUE
       JOIN parts p ON p.part_base_id = pb.id AND p.is_active = TRUE
       JOIN part_lots pl ON pl.part_id = p.id AND pl.available_quantity > 0
       LEFT JOIN suppliers s ON pl.supplier_id = s.id
       WHERE rr.id = ?
       ORDER BY pb.name, p.sku, pl.received_at`,
      [recordId],
    );
  },

  async getNextJobNumber(connection = null) {
    const execute = runWithConnection(connection);
    
    // Use GET_LOCK for atomic job number generation
    // This ensures only one request can generate a number at a time
    const lockName = 'repair_job_number_lock';
    const lockTimeout = 10; // seconds
    
    try {
      // Try to acquire lock (returns 1 if acquired, 0 if timeout, NULL if error)
      const [lockResult] = await execute(
        `SELECT GET_LOCK(?, ?) AS lock_result`,
        [lockName, lockTimeout]
      );
      
      if (lockResult[0]?.lock_result !== 1) {
        // Lock not acquired - release any partial lock and throw error to trigger retry
        try {
          await execute(`SELECT RELEASE_LOCK(?)`, [lockName]).catch(() => {});
        } catch (releaseError) {
          // Ignore release errors
        }
        throw new Error('JOB_NUMBER_LOCK_TIMEOUT');
      }
      
      // Now safely get and increment the number
      const [rows] = await execute(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(job_number, 5) AS UNSIGNED)), 0) AS max_num
         FROM repair_jobs
         WHERE job_number LIKE 'REP-%'`
      );
      
      const jobNumber = generateSequentialNumber('REP', rows[0]?.max_num || 0);
      
      // Release the lock
      await execute(`SELECT RELEASE_LOCK(?)`, [lockName]);
      
      return jobNumber;
    } catch (error) {
      // If lock fails for any reason, release if held and try simple approach
      try {
        await execute(`SELECT RELEASE_LOCK(?)`, [lockName]).catch(() => {});
      } catch (releaseError) {
        // Ignore release errors
      }
      
      // Fallback to non-locked approach (less safe but functional)
      const [rows] = await execute(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(job_number, 5) AS UNSIGNED)), 0) AS max_num
         FROM repair_jobs
         WHERE job_number LIKE 'REP-%'`
      );
      return generateSequentialNumber('REP', rows[0]?.max_num || 0);
    }
  },

  async createJob(data, connection = null) {
    const execute = runWithConnection(connection);
    const [result] = await execute(
      `INSERT INTO repair_jobs (
         job_number,
         purchase_order_id,
         status,
         priority,
         notes,
         target_sales_order_id,
         created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.job_number,
        data.purchase_order_id,
        data.status || 'PENDING',
        data.priority || 'NORMAL',
        data.notes || null,
        data.target_sales_order_id || null,
        data.created_by || null,
      ],
    );
    return result.insertId;
  },

  async updateJob(id, updates, connection = null) {
    const execute = runWithConnection(connection);
    const fields = [];
    const values = [];

    const allowedFields = ['status', 'priority', 'notes', 'target_sales_order_id', 'started_at', 'completed_at'];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    });

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    await execute(`UPDATE repair_jobs SET ${fields.join(', ')} WHERE id = ?`, values);
    return true;
  },

  async createRecord(data, connection = null) {
    const execute = runWithConnection(connection);
    const [result] = await execute(
      `INSERT INTO repair_records (
         repair_job_id,
         device_id,
         status,
         fault_description,
         engineer_comments,
         outcome,
         resolution_notes
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.repair_job_id,
        data.device_id,
        data.status || 'PENDING',
        data.fault_description || null,
        data.engineer_comments || null,
        data.outcome || null,
        data.resolution_notes || null,
      ],
    );
    return result.insertId;
  },

  async updateRecord(id, updates, connection = null) {
    const execute = runWithConnection(connection);
    const fields = [];
    const values = [];

    const allowedFields = [
      'status',
      'fault_description',
      'engineer_comments',
      'outcome',
      'resolution_notes',
      'repaired_by',
      'started_at',
      'completed_at',
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    });

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    await execute(`UPDATE repair_records SET ${fields.join(', ')} WHERE id = ?`, values);
    return true;
  },

  async addComment(data, connection = null) {
    const execute = runWithConnection(connection);
    const [result] = await execute(
      `INSERT INTO repair_comments (repair_record_id, comment_text, created_by)
       VALUES (?, ?, ?)`,
      [data.repair_record_id, data.comment_text, data.created_by || null],
    );
    return result.insertId;
  },

  async refreshJobMetrics(jobId, connection = null) {
    const execute = runWithConnection(connection);
    const [countsRows] = await execute(
      `SELECT
         COUNT(*) AS total_devices,
         SUM(CASE WHEN status IN ('COMPLETED', 'BER', 'ESCALATED_L3') THEN 1 ELSE 0 END) AS completed_devices,
         SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS in_progress_devices
       FROM repair_records
       WHERE repair_job_id = ?`,
      [jobId],
    );

    const counts = countsRows[0] || {};
    const totalDevices = counts.total_devices || 0;
    const completedDevices = counts.completed_devices || 0;
    const inProgressDevices = counts.in_progress_devices || 0;

    const [jobRows] = await execute('SELECT status, started_at, completed_at FROM repair_jobs WHERE id = ?', [jobId]);
    const currentJob = jobRows[0];
    if (!currentJob) {
      return null;
    }

    let nextStatus = currentJob.status;
    let startedAt = currentJob.started_at;
    let completedAt = currentJob.completed_at;

    if (currentJob.status !== 'CANCELLED') {
      if (totalDevices === 0) {
        nextStatus = 'PENDING';
        startedAt = null;
        completedAt = null;
      } else if (completedDevices === totalDevices) {
        nextStatus = 'COMPLETED';
        startedAt = startedAt || new Date();
        completedAt = completedAt || new Date();
      } else if (inProgressDevices > 0 || completedDevices > 0) {
        nextStatus = 'IN_PROGRESS';
        startedAt = startedAt || new Date();
        completedAt = null;
      } else {
        nextStatus = 'PENDING';
        completedAt = null;
      }

      await execute(
        `UPDATE repair_jobs
         SET total_devices = ?, completed_devices = ?, status = ?, started_at = ?, completed_at = ?
         WHERE id = ?`,
        [totalDevices, completedDevices, nextStatus, startedAt, completedAt, jobId],
      );
    } else {
      await execute(
        `UPDATE repair_jobs
         SET total_devices = ?, completed_devices = ?
         WHERE id = ?`,
        [totalDevices, completedDevices, jobId],
      );
    }

    return {
      totalDevices,
      completedDevices,
      status: nextStatus,
    };
  },

  async getLevel3QueueLocation(connection = null) {
    const execute = runWithConnection(connection);
    const [rows] = await execute(
      `SELECT id, code, name
       FROM locations
       WHERE code = 'LEVEL3_QUEUE'
       LIMIT 1`,
    );
    return rows[0] || null;
  },

  async createLevel3Repair(data, connection = null) {
    const execute = runWithConnection(connection);
    const [result] = await execute(
      `INSERT INTO level3_repairs (
         device_id,
         location_code,
         fault_description,
         engineer_comments,
         status,
         booked_in_by
       ) VALUES (?, ?, ?, ?, 'BOOKED_IN', ?)`,
      [
        data.device_id,
        data.location_code,
        data.fault_description,
        data.engineer_comments || null,
        data.booked_in_by,
      ],
    );
    return result.insertId;
  },

  async createAutoJobForDevices(connection, purchaseOrderId, deviceIds, userId, faultDescription = null) {
    if (!deviceIds || deviceIds.length === 0) {
      return null;
    }

    const jobNumber = await this.getNextJobNumber(connection);
    const jobId = await this.createJob(
      {
        job_number: jobNumber,
        purchase_order_id: purchaseOrderId,
        status: 'PENDING',
        priority: 'NORMAL',
        notes: faultDescription 
          ? `Auto-created from goods in. Fault: ${faultDescription}`
          : 'Auto-created from goods in for stock marked as requiring repair',
        created_by: userId,
      },
      connection,
    );

    const defaultFault = 'Booked into repair from goods in. Add engineer diagnosis on device page.';
    const recordFault = faultDescription || defaultFault;

    for (const deviceId of deviceIds) {
      await this.createRecord(
        {
          repair_job_id: jobId,
          device_id: deviceId,
          fault_description: recordFault,
        },
        connection,
      );
    }

    await this.refreshJobMetrics(jobId, connection);

    return { jobId, jobNumber };
  },

  async getBulkCompatibleParts(deviceIds) {
    if (!deviceIds || deviceIds.length === 0) {
      return [];
    }
    const devicePlaceholders = deviceIds.map(() => '?').join(', ');
    return query(
      `SELECT
         p.id AS part_id,
         p.sku,
         p.name AS variant_name,
         p.color AS variant_color,
         p.quality_tier,
         pb.id AS part_base_id,
         pb.base_code,
         pb.name AS base_name,
         pb.changes_device_color,
         pl.id AS part_lot_id,
         pl.lot_ref,
         pl.available_quantity,
         pl.received_at,
         s.id AS supplier_id,
         s.name AS supplier_name
       FROM parts p
       JOIN part_bases pb ON p.part_base_id = pb.id AND pb.is_active = TRUE
       JOIN part_lots pl ON pl.part_id = p.id AND pl.available_quantity > 0
       LEFT JOIN suppliers s ON pl.supplier_id = s.id
       WHERE p.is_active = TRUE
         AND pb.id IN (
           SELECT pc.part_base_id
           FROM part_compatibility pc
           WHERE pc.model_id IN (
             SELECT d.model_id
             FROM devices d
             WHERE d.id IN (${devicePlaceholders})
           )
           GROUP BY pc.part_base_id
           HAVING COUNT(DISTINCT pc.model_id) = (
             SELECT COUNT(DISTINCT d2.model_id)
             FROM devices d2
             WHERE d2.id IN (${devicePlaceholders})
           )
         )
       ORDER BY pb.name, p.sku, pl.received_at`,
      [...deviceIds, ...deviceIds],
    );
  },

  async getJobRecordsByDeviceIds(jobId, deviceIds, connection = null, forUpdate = false) {
    if (!jobId || !deviceIds || deviceIds.length === 0) {
      return [];
    }

    const execute = runWithConnection(connection);
    const placeholders = deviceIds.map(() => '?').join(', ');
    const lockClause = forUpdate ? ' FOR UPDATE' : '';
    const [rows] = await execute(
      `SELECT
          rr.device_id,
          rr.id AS record_id,
          rr.status,
          rr.fault_description,
          rr.repair_job_id,
          rr.started_at,
          rr.completed_at,
          d.imei,
          d.manufacturer_id,
          d.model_id,
          d.storage_gb,
          d.color,
          m.name AS manufacturer_name,
          mo.model_name,
          mo.model_number
        FROM repair_records rr
        JOIN devices d ON rr.device_id = d.id
        JOIN manufacturers m ON d.manufacturer_id = m.id
        JOIN models mo ON d.model_id = mo.id
        WHERE rr.repair_job_id = ?
          AND rr.device_id IN (${placeholders})${lockClause}`,
      [jobId, ...deviceIds],
    );
    return rows;
  },
};
