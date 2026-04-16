import pool, { query } from '../config/database.js';
import { generateSequentialNumber } from '../utils/helpers.js';

const REQUIRED_QC_SCHEMA = {
  qc_jobs: ['created_by'],
  qc_results: ['functional_result', 'cosmetic_result', 'non_uk'],
};

let qcSchemaCheckPromise = null;

function runWithConnection(connection = null) {
  return connection
    ? (sql, params = []) => connection.execute(sql, params)
    : (sql, params = []) => pool.execute(sql, params);
}

function buildQcSchemaError(missingColumns) {
  const details = missingColumns.length > 0
    ? ` Missing: ${missingColumns.join(', ')}`
    : '';
  const error = new Error(
    `QC schema is outdated. Run the QC migration before using the QC module.${details}`,
  );
  error.statusCode = 503;
  error.code = 'QC_SCHEMA_OUTDATED';
  return error;
}

async function ensureQcSchemaCompatibility() {
  if (!qcSchemaCheckPromise) {
    qcSchemaCheckPromise = (async () => {
      const [rows] = await pool.execute(
        `SELECT table_name, column_name
         FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND (
             (table_name = 'qc_jobs' AND column_name = ?)
             OR (table_name = 'qc_results' AND column_name IN (?, ?, ?))
           )`,
        [
          REQUIRED_QC_SCHEMA.qc_jobs[0],
          REQUIRED_QC_SCHEMA.qc_results[0],
          REQUIRED_QC_SCHEMA.qc_results[1],
          REQUIRED_QC_SCHEMA.qc_results[2],
        ],
      );

      const presentColumns = new Set(
        rows.map((row) => `${row.table_name || row.TABLE_NAME}.${row.column_name || row.COLUMN_NAME}`),
      );

      const missingColumns = [];
      for (const [tableName, columns] of Object.entries(REQUIRED_QC_SCHEMA)) {
        for (const columnName of columns) {
          if (!presentColumns.has(`${tableName}.${columnName}`)) {
            missingColumns.push(`${tableName}.${columnName}`);
          }
        }
      }

      if (missingColumns.length > 0) {
        throw buildQcSchemaError(missingColumns);
      }

      return true;
    })().catch((error) => {
      qcSchemaCheckPromise = null;
      throw error;
    });
  }

  return qcSchemaCheckPromise;
}

export const qcModel = {
  async getJobs(filters = {}, pagination = {}) {
    await ensureQcSchemaCompatibility();

    const page = Math.max(parseInt(pagination.page || 1, 10), 1);
    const limit = Math.max(parseInt(pagination.limit || 25, 10), 1);
    const offset = (page - 1) * limit;

    const whereConditions = ['1 = 1'];
    const params = [];

    if (filters.status) {
      whereConditions.push('qj.status = ?');
      params.push(filters.status);
    }

    if (filters.purchase_order_id) {
      whereConditions.push('qj.purchase_order_id = ?');
      params.push(parseInt(filters.purchase_order_id, 10));
    }

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      whereConditions.push(
        '(qj.job_number LIKE ? OR po.po_number LIKE ? OR s.name LIKE ?)',
      );
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.join(' AND ');

    const jobs = await query(
      `SELECT
         qj.id,
         qj.job_number,
         qj.purchase_order_id,
         qj.status,
         qj.total_devices,
         qj.completed_devices,
         qj.passed_devices,
         qj.failed_devices,
         qj.started_at,
         qj.completed_at,
         qj.created_at,
         po.po_number,
         po.supplier_ref,
         po.requires_repair,
         s.id AS supplier_id,
         s.name AS supplier_name,
         l.code AS location_code,
         l.name AS location_name,
         creator.id AS created_by,
         creator.display_name AS created_by_name,
         assignee.display_name AS assigned_to_name
       FROM qc_jobs qj
       JOIN purchase_orders po ON qj.purchase_order_id = po.id
       JOIN suppliers s ON po.supplier_id = s.id
       LEFT JOIN devices first_device ON first_device.id = (
         SELECT MIN(id) FROM devices WHERE purchase_order_id = po.id
       )
       LEFT JOIN locations l ON first_device.location_id = l.id
       LEFT JOIN users creator ON qj.created_by = creator.id
       LEFT JOIN users assignee ON qj.assigned_to = assignee.id
       WHERE ${whereClause}
       ORDER BY qj.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    const countRows = await query(
      `SELECT COUNT(DISTINCT qj.id) AS total
       FROM qc_jobs qj
       JOIN purchase_orders po ON qj.purchase_order_id = po.id
       JOIN suppliers s ON po.supplier_id = s.id
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
    await ensureQcSchemaCompatibility();

    const rows = await query(
      `SELECT
         qj.id,
         qj.job_number,
         qj.purchase_order_id,
         qj.status,
         qj.total_devices,
         qj.completed_devices,
         qj.passed_devices,
         qj.failed_devices,
         qj.assigned_to,
         qj.started_at,
         qj.completed_at,
         qj.created_at,
         po.po_number,
         po.supplier_ref,
         po.requires_repair,
         po.requires_qc,
         s.id AS supplier_id,
         s.name AS supplier_name,
         creator.display_name AS created_by_name,
         assignee.display_name AS assigned_to_name
       FROM qc_jobs qj
       JOIN purchase_orders po ON qj.purchase_order_id = po.id
       JOIN suppliers s ON po.supplier_id = s.id
       LEFT JOIN users creator ON qj.created_by = creator.id
       LEFT JOIN users assignee ON qj.assigned_to = assignee.id
       WHERE qj.id = ?`,
      [id],
    );
    return rows[0] || null;
  },

  async getJobResults(jobId) {
    await ensureQcSchemaCompatibility();

    return query(
      `SELECT
         qr.id,
         qr.qc_job_id,
         qr.device_id,
         qr.functional_result,
         qr.cosmetic_result,
         qr.overall_pass,
         qr.grade_assigned,
         qr.color_verified,
         qr.comments,
         qr.non_uk,
         qr.blackbelt_ref,
         qr.blackbelt_passed,
         qr.tested_by,
         qr.tested_at,
         qr.created_at,
         d.imei,
         d.storage_gb,
         d.color,
         d.oem_color,
         d.grade,
         d.status AS device_status,
         d.location_id,
         l.code AS location_code,
         m.name AS manufacturer_name,
         mo.model_name,
         mo.model_number,
         tester.display_name AS tested_by_name
       FROM qc_results qr
       JOIN devices d ON qr.device_id = d.id
       JOIN manufacturers m ON d.manufacturer_id = m.id
       JOIN models mo ON d.model_id = mo.id
       LEFT JOIN locations l ON d.location_id = l.id
       LEFT JOIN users tester ON qr.tested_by = tester.id
       WHERE qr.qc_job_id = ?
       ORDER BY qr.created_at ASC, qr.id ASC`,
      [jobId],
    );
  },

  async getNextJobNumber(connection = null) {
    await ensureQcSchemaCompatibility();

    const execute = runWithConnection(connection);

    const lockName = 'qc_job_number_lock';
    const lockTimeout = 10;

    try {
      const [lockResult] = await execute(
        `SELECT GET_LOCK(?, ?) AS lock_result`,
        [lockName, lockTimeout],
      );

      if (lockResult[0]?.lock_result !== 1) {
        try {
          await execute(`SELECT RELEASE_LOCK(?)`, [lockName]).catch(() => {});
        } catch (_) {
          // ignore
        }
        throw new Error('JOB_NUMBER_LOCK_TIMEOUT');
      }

      const [rows] = await execute(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(job_number, 4) AS UNSIGNED)), 0) AS max_num
         FROM qc_jobs
         WHERE job_number LIKE 'QC-%'`,
      );

      const jobNumber = generateSequentialNumber('QC', rows[0]?.max_num || 0);

      await execute(`SELECT RELEASE_LOCK(?)`, [lockName]);

      return jobNumber;
    } catch (error) {
      try {
        await execute(`SELECT RELEASE_LOCK(?)`, [lockName]).catch(() => {});
      } catch (_) {
        // ignore
      }

      // Fallback: non-locked approach
      const [rows] = await execute(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(job_number, 4) AS UNSIGNED)), 0) AS max_num
         FROM qc_jobs
         WHERE job_number LIKE 'QC-%'`,
      );
      return generateSequentialNumber('QC', rows[0]?.max_num || 0);
    }
  },

  async createJob(data, connection = null) {
    await ensureQcSchemaCompatibility();

    const execute = runWithConnection(connection);
    const [result] = await execute(
      `INSERT INTO qc_jobs (
         job_number,
         purchase_order_id,
         status,
         total_devices,
         created_by,
         assigned_to
       ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.job_number,
        data.purchase_order_id,
        data.status || 'PENDING',
        data.total_devices || 0,
        data.created_by || null,
        data.assigned_to || null,
      ],
    );
    return result.insertId;
  },

  async updateJob(id, updates, connection = null) {
    await ensureQcSchemaCompatibility();

    const execute = runWithConnection(connection);
    const fields = [];
    const values = [];

    const allowedFields = [
      'status',
      'assigned_to',
      'started_at',
      'completed_at',
      'total_devices',
      'completed_devices',
      'passed_devices',
      'failed_devices',
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    });

    if (fields.length === 0) return false;

    values.push(id);
    await execute(`UPDATE qc_jobs SET ${fields.join(', ')} WHERE id = ?`, values);
    return true;
  },

  async createPendingResult(jobId, deviceId, connection = null) {
    await ensureQcSchemaCompatibility();

    const execute = runWithConnection(connection);

    const [result] = await execute(
      `INSERT INTO qc_results (qc_job_id, device_id)
       VALUES (?, ?)`,
      [jobId, deviceId],
    );
    return result.insertId;
  },

  async getJobResultRowsForUpdate(jobId, connection = null) {
    await ensureQcSchemaCompatibility();

    const execute = runWithConnection(connection);
    const [rows] = await execute(
      `SELECT
         id,
         device_id,
         functional_result,
         cosmetic_result,
         grade_assigned,
         color_verified,
         comments,
         non_uk,
         blackbelt_ref,
         blackbelt_passed,
         tested_by,
         tested_at
       FROM qc_results
       WHERE qc_job_id = ?
       FOR UPDATE`,
      [jobId],
    );
    return rows;
  },

  async updateExistingResult(jobId, data, currentRow, userId, connection = null) {
    await ensureQcSchemaCompatibility();

    const execute = runWithConnection(connection);

    const functionalResult = data.functional_result ?? null;
    const cosmeticResult = data.cosmetic_result ?? null;
    const gradeAssigned = data.grade_assigned ?? null;
    const colorVerified = data.color_verified ?? null;
    const comments = data.comments ?? null;
    const nonUk = data.non_uk ? 1 : 0;
    const blackbeltRef = data.blackbelt_ref ?? null;
    const blackbeltPassed = data.blackbelt_passed != null ? (data.blackbelt_passed ? 1 : 0) : null;

    let overallPass = null;
    if (functionalResult === 'PASS') overallPass = true;
    else if (functionalResult === 'FAIL') overallPass = false;

    const shouldStampTester =
      currentRow.tested_by == null
      || currentRow.tested_at == null
      || currentRow.functional_result !== functionalResult;

    const testedBy = shouldStampTester
      ? userId
      : currentRow.tested_by;
    const testedAt = shouldStampTester
      ? new Date()
      : currentRow.tested_at;

    await execute(
      `UPDATE qc_results
       SET
         functional_result = ?,
         cosmetic_result = ?,
         overall_pass = ?,
         grade_assigned = ?,
         color_verified = ?,
         comments = ?,
         non_uk = ?,
         blackbelt_ref = ?,
         blackbelt_passed = ?,
         tested_by = ?,
         tested_at = ?
       WHERE qc_job_id = ? AND device_id = ?`,
      [
        functionalResult,
        cosmeticResult,
        overallPass,
        gradeAssigned,
        colorVerified,
        comments,
        nonUk,
        blackbeltRef,
        blackbeltPassed,
        testedBy,
        testedAt,
        jobId,
        data.device_id,
      ],
    );
    return true;
  },

  async saveResults(jobId, results, currentRows, userId, connection = null) {
    await ensureQcSchemaCompatibility();

    const rowMap = new Map(currentRows.map((row) => [row.device_id, row]));

    for (const row of results) {
      await this.updateExistingResult(jobId, row, rowMap.get(row.device_id), userId, connection);
    }
    return results.length;
  },

  async refreshJobMetrics(jobId, connection = null) {
    await ensureQcSchemaCompatibility();

    const execute = runWithConnection(connection);

    const [countsRows] = await execute(
      `SELECT
         COUNT(*) AS total_devices,
         SUM(CASE WHEN functional_result IS NOT NULL THEN 1 ELSE 0 END) AS completed_devices,
         SUM(CASE WHEN overall_pass = TRUE THEN 1 ELSE 0 END) AS passed_devices,
         SUM(CASE WHEN overall_pass = FALSE THEN 1 ELSE 0 END) AS failed_devices
       FROM qc_results
       WHERE qc_job_id = ?`,
      [jobId],
    );

    const counts = countsRows[0] || {};
    const totalDevices = counts.total_devices || 0;
    const completedDevices = counts.completed_devices || 0;
    const passedDevices = counts.passed_devices || 0;
    const failedDevices = counts.failed_devices || 0;

    await execute(
      `UPDATE qc_jobs
       SET total_devices = ?, completed_devices = ?, passed_devices = ?, failed_devices = ?
       WHERE id = ?`,
      [totalDevices, completedDevices, passedDevices, failedDevices, jobId],
    );

    return { totalDevices, completedDevices, passedDevices, failedDevices };
  },

  // Creates a QC job and one result row per device (all results start with NULL functional_result).
  // Called automatically from purchaseOrderModel.createWithDevices when requires_qc=true.
  async createAutoJobForDevices(connection, purchaseOrderId, deviceIds, userId) {
    await ensureQcSchemaCompatibility();

    if (!deviceIds || deviceIds.length === 0) {
      return null;
    }

    const jobNumber = await this.getNextJobNumber(connection);
    const jobId = await this.createJob(
      {
        job_number: jobNumber,
        purchase_order_id: purchaseOrderId,
        status: 'PENDING',
        total_devices: deviceIds.length,
        created_by: userId,
      },
      connection,
    );

    for (const deviceId of deviceIds) {
      await this.createPendingResult(jobId, deviceId, connection);
    }

    await this.refreshJobMetrics(jobId, connection);

    return { jobId, jobNumber };
  },

  async getExistingJobForDevices(purchaseOrderId, deviceIds, connection = null) {
    await ensureQcSchemaCompatibility();

    if (!deviceIds || deviceIds.length === 0) {
      return null;
    }

    const execute = runWithConnection(connection);
    const placeholders = deviceIds.map(() => '?').join(', ');
    const [rows] = await execute(
      `SELECT DISTINCT qj.id, qj.job_number, qj.status, qj.created_at
       FROM qc_jobs qj
       JOIN qc_results qr ON qr.qc_job_id = qj.id
       WHERE qj.purchase_order_id = ?
         AND qj.status <> 'CANCELLED'
         AND qr.device_id IN (${placeholders})
       ORDER BY qj.created_at DESC
       LIMIT 1`,
      [purchaseOrderId, ...deviceIds],
    );

    return rows[0] || null;
  },
};
