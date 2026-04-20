import { qcModel } from '../models/qcModel.js';
import { repairModel } from '../models/repairModel.js';
import { AppError, logActivity, logDeviceHistory } from '../utils/helpers.js';

export async function completeQcJobInTransaction(
  connection,
  {
    jobId,
    userId,
    allowAlreadyCompleted = false,
  },
) {
  const [jobRows] = await connection.execute(
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
    [jobId],
  );

  const job = jobRows[0];
  if (!job) {
    throw new AppError('QC job not found', 404, 'QC_JOB_NOT_FOUND');
  }

  if (job.job_status === 'COMPLETED') {
    if (allowAlreadyCompleted) {
      return { alreadyCompleted: true, repairQueued: 0, totalDevices: 0 };
    }
    throw new AppError('QC job already completed', 409, 'ALREADY_COMPLETED');
  }

  if (job.job_status === 'CANCELLED') {
    throw new AppError('Cannot complete a cancelled job', 409, 'QC_JOB_CANCELLED');
  }

  const [resultRows] = await connection.execute(
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
    [jobId],
  );

  if (resultRows.length === 0) {
    throw new AppError('QC job has no devices', 422, 'EMPTY_QC_JOB');
  }

  const unassessed = resultRows.filter((row) => !row.functional_result);
  if (unassessed.length > 0) {
    const imeis = unassessed.map((row) => row.imei).join(', ');
    throw new AppError(
      `All devices must have a functional result before completing. Missing: ${imeis}`,
      422,
      'INCOMPLETE_RESULTS',
    );
  }

  const now = new Date();
  const repairDeviceIds = [];

  for (const result of resultRows) {
    const overallPass = result.functional_result === 'PASS'
      ? true
      : result.functional_result === 'FAIL'
        ? false
        : null;

    await connection.execute(
      `UPDATE qc_results
       SET overall_pass = ?
       WHERE id = ?`,
      [overallPass, result.result_id],
    );

    let newDeviceStatus;
    if (result.functional_result === 'FAIL') {
      newDeviceStatus = 'IN_STOCK';
    } else if (job.requires_repair) {
      newDeviceStatus = 'AWAITING_REPAIR';
      repairDeviceIds.push(result.device_id);
    } else {
      newDeviceStatus = 'IN_STOCK';
    }

    const deviceUpdates = {
      status: newDeviceStatus,
      qc_completed: 1,
      qc_completed_at: now,
    };

    const colorChanged = result.color_verified && result.color_verified !== result.device_color;
    if (colorChanged) {
      deviceUpdates.color = result.color_verified;
    }

    const gradeChanged = result.grade_assigned && result.grade_assigned !== result.device_grade;
    if (gradeChanged) {
      deviceUpdates.grade = result.grade_assigned;
    }

    const setClause = Object.keys(deviceUpdates).map((key) => `${key} = ?`).join(', ');
    await connection.execute(
      `UPDATE devices
       SET ${setClause}, updated_at = NOW()
       WHERE id = ?`,
      [...Object.values(deviceUpdates), result.device_id],
    );

    await logDeviceHistory(connection, {
      deviceId: result.device_id,
      imei: result.imei,
      eventType: 'STATUS_CHANGE',
      fieldChanged: 'status',
      oldValue: result.device_status,
      newValue: newDeviceStatus,
      referenceType: 'QC_JOB',
      referenceId: parseInt(jobId, 10),
      notes: `QC completed. Functional: ${result.functional_result}. Overall pass: ${overallPass}`,
      userId,
    });

    if (colorChanged) {
      await logDeviceHistory(connection, {
        deviceId: result.device_id,
        imei: result.imei,
        eventType: 'PROPERTY_UPDATE',
        fieldChanged: 'color',
        oldValue: result.device_color,
        newValue: result.color_verified,
        referenceType: 'QC_JOB',
        referenceId: parseInt(jobId, 10),
        notes: 'Color corrected during QC',
        userId,
      });
    }

    if (gradeChanged) {
      await logDeviceHistory(connection, {
        deviceId: result.device_id,
        imei: result.imei,
        eventType: 'PROPERTY_UPDATE',
        fieldChanged: 'grade',
        oldValue: result.device_grade,
        newValue: result.grade_assigned,
        referenceType: 'QC_JOB',
        referenceId: parseInt(jobId, 10),
        notes: 'Grade assigned during QC',
        userId,
      });
    }
  }

  if (repairDeviceIds.length > 0) {
    const placeholders = repairDeviceIds.map(() => '?').join(', ');
    const [stillEligible] = await connection.execute(
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

    const filteredDeviceIds = stillEligible.map((row) => row.id);
    if (filteredDeviceIds.length > 0) {
      await repairModel.createAutoJobForDevices(
        connection,
        job.po_id,
        filteredDeviceIds,
        userId,
        'Devices from QC — functional passed or unable/NA, queued for repair',
      );
    }
  }

  await qcModel.refreshJobMetrics(jobId, connection);
  await qcModel.updateJob(jobId, { status: 'COMPLETED', completed_at: now }, connection);

  await logActivity(connection, {
    action: 'QC_JOB_COMPLETED',
    entityType: 'QC_JOB',
    entityId: parseInt(jobId, 10),
    details: {
      job_number: job.job_number,
      total: resultRows.length,
      repair_queued: repairDeviceIds.length,
    },
    userId,
  });

  return {
    alreadyCompleted: false,
    repairQueued: repairDeviceIds.length,
    totalDevices: resultRows.length,
  };
}
