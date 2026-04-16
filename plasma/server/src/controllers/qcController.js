import { transaction } from '../config/database.js';
import { asyncHandler } from '../middleware/validation.js';
import { qcModel } from '../models/qcModel.js';
import { repairModel } from '../models/repairModel.js';
import { AppError, logActivity, logDeviceHistory, successResponse } from '../utils/helpers.js';

// ─── List QC jobs ─────────────────────────────────────────────────────────────

export const listQcJobs = asyncHandler(async (req, res) => {
  const { page, limit, status, purchase_order_id, search } = req.query;
  const result = await qcModel.getJobs(
    { status, purchase_order_id, search },
    { page, limit },
  );
  return successResponse(res, result, 'QC jobs retrieved');
});

// ─── Get single QC job with all device results ───────────────────────────────

export const getQcJobById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [job, results] = await Promise.all([
    qcModel.getJobById(id),
    qcModel.getJobResults(id),
  ]);

  if (!job) throw new AppError('QC job not found', 404, 'QC_JOB_NOT_FOUND');

  return successResponse(res, { job, results }, 'QC job retrieved');
});

// ─── Create QC job manually ───────────────────────────────────────────────────

export const createQcJob = asyncHandler(async (req, res) => {
  const { purchase_order_id } = req.body;
  const userId = req.user.id;

  const result = await transaction(async (conn) => {
    // Verify PO exists
    const [poRows] = await conn.execute(
      `SELECT id, po_number FROM purchase_orders WHERE id = ? FOR UPDATE`,
      [purchase_order_id],
    );
    if (!poRows[0]) throw new AppError('Purchase order not found', 404, 'PO_NOT_FOUND');

    // Fetch devices from this PO that are in AWAITING_QC
    const [deviceRows] = await conn.execute(
      `SELECT id FROM devices WHERE purchase_order_id = ? AND status = 'AWAITING_QC'`,
      [purchase_order_id],
    );

    const deviceIds = deviceRows.map((r) => r.id);

    if (deviceIds.length === 0) {
      throw new AppError(
        'No devices are currently awaiting QC for this purchase order',
        422,
        'NO_QC_ELIGIBLE_DEVICES',
      );
    }

    const existingJob = await qcModel.getExistingJobForDevices(
      purchase_order_id,
      deviceIds,
      conn,
    );
    if (existingJob) {
      throw new AppError(
        `QC job ${existingJob.job_number} already exists for one or more selected devices`,
        409,
        'QC_JOB_ALREADY_EXISTS',
      );
    }

    const { jobId, jobNumber } = await qcModel.createAutoJobForDevices(
      conn,
      purchase_order_id,
      deviceIds,
      userId,
    );

    return { jobId, jobNumber };
  });

  return successResponse(res, result, 'QC job created', 201);
});

// ─── Update QC job (status / assigned_to) ────────────────────────────────────

export const updateQcJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, assigned_to } = req.body;

  if (status === 'COMPLETED') {
    throw new AppError(
      'QC jobs must be completed via the dedicated completion workflow',
      409,
      'QC_COMPLETE_VIA_WORKFLOW',
    );
  }

  await transaction(async (conn) => {
    const [rows] = await conn.execute(
      `SELECT id, status FROM qc_jobs WHERE id = ? FOR UPDATE`,
      [id],
    );
    const job = rows[0];
    if (!job) throw new AppError('QC job not found', 404, 'QC_JOB_NOT_FOUND');

    if (status === 'CANCELLED' && job.status === 'COMPLETED') {
      throw new AppError('Cannot cancel a completed QC job', 409, 'QC_JOB_COMPLETED');
    }

    const updates = {};
    if (status !== undefined) updates.status = status;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;

    await qcModel.updateJob(id, updates, conn);
  });

  return successResponse(res, {}, 'QC job updated');
});

// ─── Batch save QC result rows ────────────────────────────────────────────────

export const saveQcResults = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { results } = req.body;
  const userId = req.user.id;

  await transaction(async (conn) => {
    const [rows] = await conn.execute(
      `SELECT id, status FROM qc_jobs WHERE id = ? FOR UPDATE`,
      [id],
    );
    const job = rows[0];
    if (!job) throw new AppError('QC job not found', 404, 'QC_JOB_NOT_FOUND');

    if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
      throw new AppError('Cannot edit a closed QC job', 409, 'QC_JOB_CLOSED');
    }

    const currentRows = await qcModel.getJobResultRowsForUpdate(id, conn);
    if (currentRows.length === 0) {
      throw new AppError('QC job has no devices', 422, 'EMPTY_QC_JOB');
    }

    const seenDeviceIds = new Set();
    const currentRowMap = new Map(currentRows.map((row) => [row.device_id, row]));
    for (const row of results) {
      if (seenDeviceIds.has(row.device_id)) {
        throw new AppError(
          `Duplicate QC result payload for device ${row.device_id}`,
          422,
          'DUPLICATE_QC_RESULT_DEVICE',
        );
      }
      seenDeviceIds.add(row.device_id);

      if (!currentRowMap.has(row.device_id)) {
        throw new AppError(
          `Device ${row.device_id} is not part of this QC job`,
          422,
          'DEVICE_NOT_IN_QC_JOB',
        );
      }
    }

    // Auto-promote to IN_PROGRESS on first save
    if (job.status === 'PENDING') {
      await qcModel.updateJob(id, { status: 'IN_PROGRESS', started_at: new Date() }, conn);
    }

    await qcModel.saveResults(id, results, currentRows, userId, conn);
    await qcModel.refreshJobMetrics(id, conn);

    await logActivity(conn, {
      action: 'QC_RESULTS_SAVED',
      entityType: 'QC_JOB',
      entityId: parseInt(id),
      details: { rows_saved: results.length },
      userId,
    });
  });

  return successResponse(res, {}, 'QC results saved');
});

// ─── Complete QC job ──────────────────────────────────────────────────────────
// This is the central workflow action:
//   1. Validates all devices have a functional_result
//   2. Updates device statuses (FAIL → IN_STOCK, PASS/UNABLE/NA → IN_STOCK or AWAITING_REPAIR)
//   3. Applies color/grade corrections to devices
//   4. Auto-creates repair job for devices going to AWAITING_REPAIR
//   5. Marks the QC job COMPLETED

export const completeQcJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  await transaction(async (conn) => {
    // 1. Lock job + PO
    const [jobRows] = await conn.execute(
      `SELECT
         qj.id,
         qj.job_number,
         qj.status AS job_status,
         po.id AS po_id,
         po.requires_repair,
         po.requires_qc
       FROM qc_jobs qj
       JOIN purchase_orders po ON qj.purchase_order_id = po.id
       WHERE qj.id = ?
       FOR UPDATE`,
      [id],
    );
    const job = jobRows[0];
    if (!job) throw new AppError('QC job not found', 404, 'QC_JOB_NOT_FOUND');
    if (job.job_status === 'COMPLETED') throw new AppError('QC job already completed', 409, 'ALREADY_COMPLETED');
    if (job.job_status === 'CANCELLED') throw new AppError('Cannot complete a cancelled job', 409, 'QC_JOB_CANCELLED');

    // 2. Lock all result rows + devices
    const [resultRows] = await conn.execute(
      `SELECT
         qr.id AS result_id,
         qr.device_id,
         qr.functional_result,
         qr.cosmetic_result,
         qr.grade_assigned,
         qr.color_verified,
         qr.non_uk,
         d.imei,
         d.color AS device_color,
         d.grade AS device_grade,
         d.status AS device_status
       FROM qc_results qr
       JOIN devices d ON qr.device_id = d.id
       WHERE qr.qc_job_id = ?
       FOR UPDATE`,
      [id],
    );

    // 3. Guard: must have at least one device
    if (resultRows.length === 0) {
      throw new AppError('QC job has no devices', 422, 'EMPTY_QC_JOB');
    }

    // 4. Validate all devices have functional_result
    const unassessed = resultRows.filter((r) => !r.functional_result);
    if (unassessed.length > 0) {
      const imeis = unassessed.map((r) => r.imei).join(', ');
      throw new AppError(
        `All devices must have a functional result before completing. Missing: ${imeis}`,
        422,
        'INCOMPLETE_RESULTS',
      );
    }

    const now = new Date();
    const repairDeviceIds = [];

    for (const result of resultRows) {
      const deviceId = result.device_id;

      // 5. Compute overall_pass
      const overallPass =
        result.functional_result === 'PASS' ? true
          : result.functional_result === 'FAIL' ? false
            : null; // UNABLE / NA = null

      // 6. Update qc_result: set overall_pass only
      await conn.execute(
        `UPDATE qc_results
         SET overall_pass = ?
         WHERE id = ?`,
        [overallPass, result.result_id],
      );

      // 7. Determine new device status
      let newDeviceStatus;
      if (result.functional_result === 'FAIL') {
        // Failed functional — back to stock, flagged (overall_pass=FALSE)
        newDeviceStatus = 'IN_STOCK';
      } else if (job.requires_repair) {
        // PASS / UNABLE / NA + PO requires repair → queue for repair
        newDeviceStatus = 'AWAITING_REPAIR';
        repairDeviceIds.push(deviceId);
      } else {
        // PASS / UNABLE / NA, no repair → back to stock
        newDeviceStatus = 'IN_STOCK';
      }

      // 8. Build device update payload
      const deviceUpdates = {
        status: newDeviceStatus,
        qc_completed: 1,
        qc_completed_at: now,
      };

      // Apply color correction if provided and different
      const colorChanged = result.color_verified && result.color_verified !== result.device_color;
      if (colorChanged) {
        deviceUpdates.color = result.color_verified;
      }

      // Apply grade correction if provided and different
      const gradeChanged = result.grade_assigned && result.grade_assigned !== result.device_grade;
      if (gradeChanged) {
        deviceUpdates.grade = result.grade_assigned;
      }

      const setClause = Object.keys(deviceUpdates).map((k) => `${k} = ?`).join(', ');
      const setValues = Object.values(deviceUpdates);

      await conn.execute(
        `UPDATE devices SET ${setClause}, updated_at = NOW() WHERE id = ?`,
        [...setValues, deviceId],
      );

      // 9. Log device history — status change
      await logDeviceHistory(conn, {
        deviceId,
        imei: result.imei,
        eventType: 'STATUS_CHANGE',
        fieldChanged: 'status',
        oldValue: result.device_status,
        newValue: newDeviceStatus,
        referenceType: 'QC_JOB',
        referenceId: parseInt(id),
        notes: `QC completed. Functional: ${result.functional_result}. Overall pass: ${overallPass}`,
        userId,
      });

      // Log color change separately if it occurred
      if (colorChanged) {
        await logDeviceHistory(conn, {
          deviceId,
          imei: result.imei,
          eventType: 'PROPERTY_UPDATE',
          fieldChanged: 'color',
          oldValue: result.device_color,
          newValue: result.color_verified,
          referenceType: 'QC_JOB',
          referenceId: parseInt(id),
          notes: 'Color corrected during QC',
          userId,
        });
      }

      // Log grade change separately if it occurred
      if (gradeChanged) {
        await logDeviceHistory(conn, {
          deviceId,
          imei: result.imei,
          eventType: 'PROPERTY_UPDATE',
          fieldChanged: 'grade',
          oldValue: result.device_grade,
          newValue: result.grade_assigned,
          referenceType: 'QC_JOB',
          referenceId: parseInt(id),
          notes: 'Grade assigned during QC',
          userId,
        });
      }
    }

    // 10. Auto-create repair job for devices going to AWAITING_REPAIR
    if (repairDeviceIds.length > 0) {
      // Re-check eligible devices under lock to prevent concurrent QC completions
      // from creating duplicate repair jobs for the same devices.
      const placeholders = repairDeviceIds.map(() => '?').join(', ');
      const [stillEligible] = await conn.execute(
        `SELECT d.id
         FROM devices d
         WHERE d.id IN (${placeholders})
           AND d.status = 'AWAITING_REPAIR'
           AND d.id NOT IN (
             SELECT rr.device_id
             FROM repair_records rr
             JOIN repair_jobs rj ON rr.repair_job_id = rj.id
             WHERE rj.status != 'CANCELLED'
               AND rr.status IN ('PENDING', 'IN_PROGRESS')
           )`,
        repairDeviceIds,
      );
      const filteredDeviceIds = stillEligible.map((r) => r.id);

      if (filteredDeviceIds.length > 0) {
        await repairModel.createAutoJobForDevices(
          conn,
          job.po_id,
          filteredDeviceIds,
          userId,
          'Devices from QC — functional passed or unable/NA, queued for repair',
        );
      }
    }

    // 11. Refresh metrics and mark COMPLETED
    await qcModel.refreshJobMetrics(id, conn);
    await qcModel.updateJob(id, { status: 'COMPLETED', completed_at: now }, conn);

    // 12. Activity log
    await logActivity(conn, {
      action: 'QC_JOB_COMPLETED',
      entityType: 'QC_JOB',
      entityId: parseInt(id),
      details: {
        job_number: job.job_number,
        total: resultRows.length,
        repair_queued: repairDeviceIds.length,
      },
      userId,
    });
  });

  return successResponse(res, {}, 'QC job completed successfully');
});
