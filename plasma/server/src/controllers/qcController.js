import { transaction } from '../config/database.js';
import { asyncHandler } from '../middleware/validation.js';
import { qcModel } from '../models/qcModel.js';
import { AppError, logActivity, logDeviceHistory, successResponse } from '../utils/helpers.js';
import { completeQcJobInTransaction } from '../services/qcCompletion.service.js';

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
    await completeQcJobInTransaction(conn, {
      jobId: id,
      userId,
    });
  });

  return successResponse(res, {}, 'QC job completed successfully');
});
