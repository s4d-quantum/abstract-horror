import db, { query, transaction } from '../config/database.js';
import { asyncHandler } from '../middleware/validation.js';
import { deviceModel } from '../models/deviceModel.js';
import { partModel } from '../models/partModel.js';
import { repairModel } from '../models/repairModel.js';
import { errorResponse, logDeviceHistory, successResponse } from '../utils/helpers.js';

const OPEN_RECORD_STATUSES = ['PENDING', 'IN_PROGRESS'];
const CLOSED_RECORD_STATUSES = ['COMPLETED', 'BER', 'ESCALATED_L3'];
const JOB_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

function mapDomainError(error) {
  const message = String(error?.message || '').replace(/^Transaction failed: /, '');

  if (message.includes('open repair record')) {
    return { isError: true, status: 409, code: 'DUPLICATE_REPAIR_RECORD', message };
  }
  if (message.includes('not compatible')) {
    return { isError: true, status: 400, code: 'PART_INCOMPATIBLE', message };
  }
  if (message.includes('Invalid allocation quantity')) {
    return { isError: true, status: 400, code: 'INVALID_QUANTITY', message };
  }
  if (message.includes('stock cannot go negative')) {
    return { isError: true, status: 409, code: 'INSUFFICIENT_PART_STOCK', message: 'Not enough stock to complete this operation. Another process may have consumed the required parts.' };
  }

  throw error;
}

async function getLockedRecord(connection, id) {
  const [rows] = await connection.execute(
    `SELECT
       rr.*,
       rj.purchase_order_id,
       rj.job_number,
       rj.status AS job_status,
       d.imei,
       d.model_id,
       d.storage_gb,
       d.color,
       d.status AS device_status,
       d.location_id,
       d.repair_required,
       d.repair_completed
     FROM repair_records rr
     JOIN repair_jobs rj ON rr.repair_job_id = rj.id
     JOIN devices d ON rr.device_id = d.id
     WHERE rr.id = ?
     FOR UPDATE`,
    [id],
  );
  return rows[0] || null;
}

async function getLockedDevice(connection, id) {
  const [rows] = await connection.execute(
    `SELECT id, imei, color, status, location_id, repair_required, repair_completed
     FROM devices
     WHERE id = ?
     FOR UPDATE`,
    [id],
  );
  return rows[0] || null;
}

async function getLockedRepairAllocation(connection, id) {
  const [rows] = await connection.execute(
    `SELECT *
     FROM repair_parts_used
     WHERE id = ?
     FOR UPDATE`,
    [id],
  );
  return rows[0] || null;
}

async function ensureDeviceOpenForRepair(connection, deviceId) {
  const openRecord = await repairModel.getOpenRecordByDeviceId(deviceId, connection);
  if (openRecord) {
    throw new Error('Device already belongs to an open repair record');
  }
}

async function ensurePartCompatibility(connection, recordId, partId) {
  const [rows] = await connection.execute(
    `SELECT 1
     FROM repair_records rr
     JOIN devices d ON rr.device_id = d.id
     JOIN parts p ON p.id = ?
     JOIN part_compatibility pc
       ON pc.part_base_id = p.part_base_id
      AND pc.model_id = d.model_id
     WHERE rr.id = ?
     LIMIT 1`,
    [partId, recordId],
  );

  if (rows.length === 0) {
    throw new Error('Selected part is not compatible with this device');
  }
}

async function createAllocation(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO repair_parts_used (
       repair_record_id,
       part_id,
       part_lot_id,
       quantity,
       status,
       notes,
       added_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.repair_record_id,
      data.part_id,
      data.part_lot_id,
      data.quantity,
      data.status,
      data.notes || null,
      data.added_by || null,
    ],
  );
  return result.insertId;
}

async function splitOrCloseAllocation(connection, allocation, quantity, replacementStatus, userId, notes) {
  if (quantity <= 0 || quantity > allocation.quantity) {
    throw new Error('Invalid allocation quantity');
  }

  if (quantity === allocation.quantity) {
    await connection.execute(
      `UPDATE repair_parts_used
       SET status = ?, removed_at = CURRENT_TIMESTAMP, removed_by = ?, notes = COALESCE(?, notes)
       WHERE id = ?`,
      [replacementStatus, userId, notes || null, allocation.id],
    );
    return allocation.id;
  }

  await connection.execute(
    `UPDATE repair_parts_used
     SET quantity = quantity - ?
     WHERE id = ?`,
    [quantity, allocation.id],
  );

  const [result] = await connection.execute(
    `INSERT INTO repair_parts_used (
       repair_record_id,
       part_id,
       part_lot_id,
       quantity,
       status,
       notes,
       added_by,
       added_at,
       removed_at,
       removed_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
    [
      allocation.repair_record_id,
      allocation.part_id,
      allocation.part_lot_id,
      quantity,
      replacementStatus,
      notes || null,
      allocation.added_by || userId,
      allocation.added_at,
      userId,
    ],
  );

  return result.insertId;
}

async function applyDeviceColorChange(connection, recordId, device, lot, userId) {
  if (!lot.changes_device_color || !lot.part_color || lot.part_color === device.color) {
    return null;
  }

  await connection.execute(
    `UPDATE devices
     SET color = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [lot.part_color, device.id],
  );

  await logDeviceHistory(connection, {
    deviceId: device.id,
    imei: device.imei,
    eventType: 'PROPERTY_UPDATE',
    fieldChanged: 'color',
    oldValue: device.color,
    newValue: lot.part_color,
    referenceType: 'REPAIR_RECORD',
    referenceId: recordId,
    notes: `Color updated after fitting ${lot.base_name || lot.base_code || 'part'}`,
    userId,
  });

  return lot.part_color;
}

async function setDeviceStatus(connection, device, nextStatus, referenceId, userId, notes = null) {
  if (device.status === nextStatus) {
    return;
  }

  await connection.execute(
    `UPDATE devices
     SET status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [nextStatus, device.id],
  );

  await logDeviceHistory(connection, {
    deviceId: device.id,
    imei: device.imei,
    eventType: 'STATUS_CHANGE',
    fieldChanged: 'status',
    oldValue: device.status,
    newValue: nextStatus,
    referenceType: 'REPAIR_RECORD',
    referenceId,
    notes,
    userId,
  });
}

async function promoteRecordToInProgress(connection, record, device, recordId, userId, notes) {
  if (record.status !== 'PENDING') {
    return;
  }

  await repairModel.updateRecord(
    recordId,
    { status: 'IN_PROGRESS', started_at: record.started_at || new Date() },
    connection,
  );
  await setDeviceStatus(connection, device, 'IN_REPAIR', recordId, userId, notes);
  await repairModel.refreshJobMetrics(record.repair_job_id, connection);
}

function getBulkDeviceModelKey(device) {
  return `${device.manufacturer_id}:${device.model_id}`;
}

function buildBulkDeviceMap(records) {
  return records.reduce((acc, record) => {
    acc[record.device_id] = {
      device_id: record.device_id,
      record_id: record.record_id,
      record_status: record.status,
      has_open_record: OPEN_RECORD_STATUSES.includes(record.status),
      manufacturer_id: record.manufacturer_id,
      model_id: record.model_id,
      manufacturer_name: record.manufacturer_name,
      model_name: record.model_name,
      model_number: record.model_number,
      imei: record.imei,
      color: record.color,
      storage_gb: record.storage_gb,
    };
    return acc;
  }, {});
}

export const getRepairMeta = asyncHandler(async (req, res) => {
  const poLimit = Math.min(Math.max(parseInt(req.query.po_limit || '200', 10), 1), 500);
  const soLimit = Math.min(Math.max(parseInt(req.query.so_limit || '200', 10), 1), 500);

  const [purchaseOrders, salesOrders] = await Promise.all([
    query(
      `SELECT po.id, po.po_number, s.name AS supplier_name
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.id
       WHERE po.status IN ('CONFIRMED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED')
       ORDER BY po.created_at DESC
       LIMIT ${poLimit}`,
    ),
    query(
      `SELECT id, so_number, status
       FROM sales_orders
       WHERE status IN ('CONFIRMED', 'PROCESSING', 'PARTIALLY_SHIPPED')
       ORDER BY created_at DESC
       LIMIT ${soLimit}`,
    ),
  ]);

  successResponse(res, {
    purchaseOrders,
    salesOrders,
    jobPriorities: JOB_PRIORITIES,
    recordStatuses: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BER', 'ESCALATED_L3'],
  });
});

export const listRepairJobs = asyncHandler(async (req, res) => {
  const result = await repairModel.getJobs(req.query, {
    page: req.query.page,
    limit: req.query.limit,
  });

  successResponse(res, result);
});

export const getRepairJobById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [job, records, eligibleDevices] = await Promise.all([
    repairModel.getJobById(id),
    repairModel.getJobRecords(id),
    repairModel.getEligibleDevices(id),
  ]);

  if (!job) {
    return errorResponse(res, 'Repair job not found', 'REPAIR_JOB_NOT_FOUND', 404);
  }

  successResponse(res, {
    job,
    records,
    eligibleDevices,
  });
});

export const createRepairJob = asyncHandler(async (req, res) => {
  const { purchase_order_id, notes, priority, target_sales_order_id } = req.body;

  const result = await transaction(async (connection) => {
    const [poRows] = await connection.execute(
      'SELECT id FROM purchase_orders WHERE id = ? FOR UPDATE',
      [purchase_order_id],
    );
    if (poRows.length === 0) {
      return { isError: true, status: 404, code: 'PO_NOT_FOUND', message: 'Purchase order not found' };
    }

    if (target_sales_order_id) {
      const [soRows] = await connection.execute('SELECT id FROM sales_orders WHERE id = ?', [target_sales_order_id]);
      if (soRows.length === 0) {
        return { isError: true, status: 404, code: 'SO_NOT_FOUND', message: 'Target sales order not found' };
      }
    }

    const jobNumber = await repairModel.getNextJobNumber(connection);
    const jobId = await repairModel.createJob(
      {
        job_number: jobNumber,
        purchase_order_id,
        notes,
        priority: priority || 'NORMAL',
        target_sales_order_id,
        created_by: req.user.id,
      },
      connection,
    );

    await repairModel.refreshJobMetrics(jobId, connection);
    return { isError: false, jobId, jobNumber };
  });

  if (result.isError) {
    return errorResponse(res, result.message, result.code, result.status);
  }

  successResponse(
    res,
    { jobId: result.jobId, jobNumber: result.jobNumber },
    'Repair job created successfully',
    201,
  );
});

export const updateRepairJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes, priority, target_sales_order_id, status } = req.body;

  const result = await transaction(async (connection) => {
    const [jobRows] = await connection.execute('SELECT * FROM repair_jobs WHERE id = ? FOR UPDATE', [id]);
    const job = jobRows[0];
    if (!job) {
      return { isError: true, status: 404, code: 'REPAIR_JOB_NOT_FOUND', message: 'Repair job not found' };
    }

    const updates = {};
    if (notes !== undefined) updates.notes = notes || null;
    if (priority !== undefined) updates.priority = priority;
    if (target_sales_order_id !== undefined) updates.target_sales_order_id = target_sales_order_id || null;

    if (status === 'CANCELLED' || status === 'COMPLETED') {
      const [recordRows] = await connection.execute(
        `SELECT COUNT(*) AS open_records
         FROM repair_records
         WHERE repair_job_id = ?
           AND status IN ('PENDING', 'IN_PROGRESS')`,
        [id],
      );
      if (recordRows[0].open_records > 0) {
        return {
          isError: true,
          status: 409,
          code: 'OPEN_RECORDS_EXIST',
          message: status === 'COMPLETED'
            ? 'All repair records must be closed (completed, BER, or escalated) before completing this job'
            : 'Close or move the open repair records before cancelling this job',
        };
      }
      updates.status = status;
      updates.completed_at = new Date();
    }

    const updated = await repairModel.updateJob(id, updates, connection);
    if (!updated) {
      return { isError: true, status: 400, code: 'NO_UPDATES', message: 'No valid job fields supplied' };
    }

    if (!updates.status) {
      await repairModel.refreshJobMetrics(id, connection);
    }

    return { isError: false };
  });

  if (result.isError) {
    return errorResponse(res, result.message, result.code, result.status);
  }

  successResponse(res, {}, 'Repair job updated successfully');
});

export const addDevicesToRepairJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { device_ids, fault_description } = req.body;

  const result = await transaction(async (connection) => {
    try {
      const [jobRows] = await connection.execute(
        `SELECT id, purchase_order_id, status
         FROM repair_jobs
         WHERE id = ?
         FOR UPDATE`,
        [id],
      );
      const job = jobRows[0];
      if (!job) {
        return {
          isError: true,
          status: 404,
          code: 'REPAIR_JOB_NOT_FOUND',
          message: 'Repair job not found',
        };
      }

      if (job.status === 'CANCELLED' || job.status === 'COMPLETED') {
        return {
          isError: true,
          status: 409,
          code: 'REPAIR_JOB_CLOSED',
          message: 'This repair job is closed and cannot accept more devices',
        };
      }

      const placeholders = device_ids.map(() => '?').join(', ');
      const [deviceRows] = await connection.execute(
        `SELECT id, imei, purchase_order_id, status, repair_required
         FROM devices
         WHERE id IN (${placeholders})
         FOR UPDATE`,
        device_ids,
      );

      if (deviceRows.length !== device_ids.length) {
        return {
          isError: true,
          status: 404,
          code: 'DEVICE_NOT_FOUND',
          message: 'One or more selected devices no longer exist',
        };
      }

      // Validate device status within transaction to prevent stale data issues
      const forbiddenStatuses = ['SHIPPED', 'SCRAPPED', 'RETURNED', 'OUT_OF_STOCK'];
      for (const device of deviceRows) {
        if (forbiddenStatuses.includes(device.status)) {
          return {
            isError: true,
            status: 409,
            code: 'DEVICE_NOT_ELIGIBLE',
            message: `Device ${device.imei} is ${device.status} and cannot be added to repair`,
          };
        }

        // Validate repair_required flag - devices must be marked as requiring repair
        if (!device.repair_required) {
          return {
            isError: true,
            status: 409,
            code: 'DEVICE_NOT_MARKED_FOR_REPAIR',
            message: `Device ${device.imei} is not marked as requiring repair`,
          };
        }
      }

      for (const device of deviceRows) {
        if (device.purchase_order_id !== job.purchase_order_id) {
          return {
            isError: true,
            status: 400,
            code: 'PO_MISMATCH',
            message: `Device ${device.imei} does not belong to this purchase order`,
          };
        }
        await ensureDeviceOpenForRepair(connection, device.id);
        await repairModel.createRecord(
          {
            repair_job_id: id,
            device_id: device.id,
            fault_description,
          },
          connection,
        );

        if (device.status !== 'AWAITING_REPAIR' && device.status !== 'IN_REPAIR') {
          await connection.execute(
            `UPDATE devices
             SET status = 'AWAITING_REPAIR', repair_required = TRUE, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [device.id],
          );

          await logDeviceHistory(connection, {
            deviceId: device.id,
            imei: device.imei,
            eventType: 'STATUS_CHANGE',
            fieldChanged: 'status',
            oldValue: device.status,
            newValue: 'AWAITING_REPAIR',
            referenceType: 'REPAIR_JOB',
            referenceId: id,
            notes: 'Added to repair job',
            userId: req.user.id,
          });
        }
      }

      await repairModel.refreshJobMetrics(id, connection);
      return { isError: false, addedCount: deviceRows.length };
    } catch (error) {
      return mapDomainError(error);
    }
  });

  if (result.isError) {
    return errorResponse(res, result.message, result.code, result.status);
  }

  successResponse(res, { addedCount: result.addedCount }, 'Devices added to repair job');
});

export const getRepairRecordById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [record, comments, allocations, compatibleParts] = await Promise.all([
    repairModel.getRecordById(id),
    repairModel.getComments(id),
    repairModel.getPartAllocations(id),
    repairModel.getCompatibleParts(id),
  ]);

  if (!record) {
    return errorResponse(res, 'Repair record not found', 'REPAIR_RECORD_NOT_FOUND', 404);
  }

  successResponse(res, {
    record,
    comments,
    allocations,
    compatibleParts,
  });
});

export const updateRepairRecord = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, engineer_comments, outcome, resolution_notes } = req.body;

  const result = await transaction(async (connection) => {
    const record = await getLockedRecord(connection, id);
    if (!record) {
      return { isError: true, status: 404, code: 'REPAIR_RECORD_NOT_FOUND', message: 'Repair record not found' };
    }

    if (CLOSED_RECORD_STATUSES.includes(record.status)) {
      return {
        isError: true,
        status: 409,
        code: 'REPAIR_RECORD_CLOSED',
        message: 'Closed repair records cannot be edited',
      };
    }

    if (status === 'ESCALATED_L3') {
      return {
        isError: true,
        status: 400,
        code: 'USE_ESCALATE_ENDPOINT',
        message: 'Use the dedicated L3 escalation endpoint for this action',
      };
    }

    const device = await getLockedDevice(connection, record.device_id);
    const updates = {
      engineer_comments: engineer_comments !== undefined ? engineer_comments || null : record.engineer_comments,
      outcome: outcome !== undefined ? outcome || null : record.outcome,
      resolution_notes: resolution_notes !== undefined ? resolution_notes || null : record.resolution_notes,
    };

    if (status) {
      updates.status = status;
    }

    if (status === 'IN_PROGRESS') {
      updates.started_at = record.started_at || new Date();
      await setDeviceStatus(connection, device, 'IN_REPAIR', id, req.user.id, 'Repair work started');
    }

    if (status === 'PENDING') {
      updates.started_at = record.started_at;
      await setDeviceStatus(connection, device, 'AWAITING_REPAIR', id, req.user.id, 'Repair returned to pending');
    }

    if (status === 'COMPLETED') {
      updates.completed_at = new Date();
      updates.repaired_by = req.user.id;
      updates.outcome = updates.outcome || 'Repaired';

      await connection.execute(
        `UPDATE devices
         SET
           status = 'IN_STOCK',
           repair_required = FALSE,
           repair_completed = TRUE,
           repair_completed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [record.device_id],
      );

      await logDeviceHistory(connection, {
        deviceId: record.device_id,
        imei: record.imei,
        eventType: 'REPAIR_COMPLETE',
        fieldChanged: 'status',
        oldValue: device.status,
        newValue: 'IN_STOCK',
        referenceType: 'REPAIR_RECORD',
        referenceId: id,
        notes: 'Repair completed',
        userId: req.user.id,
      });
    }

    if (status === 'BER') {
      updates.completed_at = new Date();
      updates.repaired_by = req.user.id;
      updates.outcome = updates.outcome || 'BER';

      await connection.execute(
        `UPDATE devices
         SET
           status = 'SCRAPPED',
           repair_required = FALSE,
           repair_completed = FALSE,
           repair_completed_at = NULL,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [record.device_id],
      );

      await logDeviceHistory(connection, {
        deviceId: record.device_id,
        imei: record.imei,
        eventType: 'STATUS_CHANGE',
        fieldChanged: 'status',
        oldValue: device.status,
        newValue: 'SCRAPPED',
        referenceType: 'REPAIR_RECORD',
        referenceId: id,
        notes: 'Marked BER from repair workflow',
        userId: req.user.id,
      });
    }

    await repairModel.updateRecord(id, updates, connection);
    await repairModel.refreshJobMetrics(record.repair_job_id, connection);

    return { isError: false };
  });

  if (result.isError) {
    return errorResponse(res, result.message, result.code, result.status);
  }

  successResponse(res, {}, 'Repair record updated successfully');
});

export const addRepairComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { comment_text } = req.body;

  const record = await repairModel.getRecordById(id);
  if (!record) {
    return errorResponse(res, 'Repair record not found', 'REPAIR_RECORD_NOT_FOUND', 404);
  }

  const commentId = await repairModel.addComment({
    repair_record_id: id,
    comment_text,
    created_by: req.user.id,
  });

  successResponse(res, { commentId }, 'Repair comment added', 201);
});

export const reserveRepairPart = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { part_id, part_lot_id, quantity, notes } = req.body;

  const result = await transaction(async (connection) => {
    try {
      const record = await getLockedRecord(connection, id);
      if (!record) {
        return { isError: true, status: 404, code: 'REPAIR_RECORD_NOT_FOUND', message: 'Repair record not found' };
      }
      if (!OPEN_RECORD_STATUSES.includes(record.status)) {
        return { isError: true, status: 409, code: 'REPAIR_RECORD_CLOSED', message: 'Parts cannot be reserved on a closed repair record' };
      }

      await ensurePartCompatibility(connection, id, part_id);

      const lot = await partModel.getLotById(part_lot_id, connection);
      const part = await partModel.getPartByIdForUpdate(part_id, connection);

      if (!lot || !part || lot.part_id !== part.id) {
        return { isError: true, status: 404, code: 'PART_LOT_NOT_FOUND', message: 'Part lot not found' };
      }
      if (lot.available_quantity < quantity) {
        return { isError: true, status: 409, code: 'INSUFFICIENT_PART_STOCK', message: 'Not enough available stock in this lot' };
      }

      const allocationId = await createAllocation(connection, {
        repair_record_id: id,
        part_id,
        part_lot_id,
        quantity,
        status: 'RESERVED',
        notes,
        added_by: req.user.id,
      });

      await partModel.updateLotQuantities(part_lot_id, { available: -quantity, reserved: quantity }, connection);
      await partModel.updatePartQuantities(part_id, { available: -quantity, reserved: quantity }, connection);
      await partModel.createTransaction(
        {
          part_id,
          part_lot_id,
          movement_type: 'RESERVE',
          quantity,
          available_delta: -quantity,
          reserved_delta: quantity,
          reference_type: 'REPAIR_RECORD',
          reference_id: id,
          notes: notes || 'Reserved for repair record',
          user_id: req.user.id,
        },
        connection,
      );

      await logDeviceHistory(connection, {
        deviceId: record.device_id,
        imei: record.imei,
        eventType: 'PROPERTY_UPDATE',
        fieldChanged: 'parts',
        oldValue: null,
        newValue: `Part ${part_id} x${quantity} reserved (lot ${part_lot_id})`,
        referenceType: 'REPAIR_RECORD',
        referenceId: id,
        notes: notes || 'Part reserved for repair',
        userId: req.user.id,
      });

      if (record.status === 'PENDING') {
        const device = await getLockedDevice(connection, record.device_id);
        await promoteRecordToInProgress(
          connection,
          record,
          device,
          id,
          req.user.id,
          'Repair work started by reserving part',
        );
      }

      return { isError: false, allocationId };
    } catch (error) {
      return mapDomainError(error);
    }
  });

  if (result.isError) {
    return errorResponse(res, result.message, result.code, result.status);
  }

  successResponse(res, { allocationId: result.allocationId }, 'Part reserved successfully', 201);
});

export const fitRepairPart = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { repair_part_id, part_id, part_lot_id, quantity, direct_from_available, notes } = req.body;

  const result = await transaction(async (connection) => {
    try {
      const record = await getLockedRecord(connection, id);
      if (!record) {
        return { isError: true, status: 404, code: 'REPAIR_RECORD_NOT_FOUND', message: 'Repair record not found' };
      }
      if (!OPEN_RECORD_STATUSES.includes(record.status)) {
        return { isError: true, status: 409, code: 'REPAIR_RECORD_CLOSED', message: 'Parts cannot be fitted on a closed repair record' };
      }

      const device = await getLockedDevice(connection, record.device_id);
      let fittedPartId = part_id;
      let fittedLotId = part_lot_id;
      let fittedQuantity = quantity;
      let lot;
      let part;

      if (repair_part_id) {
        const allocation = await getLockedRepairAllocation(connection, repair_part_id);
        if (!allocation || allocation.repair_record_id !== parseInt(id, 10)) {
          return { isError: true, status: 404, code: 'ALLOCATION_NOT_FOUND', message: 'Reserved part allocation not found' };
        }
        if (allocation.status !== 'RESERVED') {
          return { isError: true, status: 409, code: 'ALLOCATION_NOT_RESERVED', message: 'Only reserved allocations can be fitted directly' };
        }

        fittedPartId = allocation.part_id;
        fittedLotId = allocation.part_lot_id;
        fittedQuantity = fittedQuantity || allocation.quantity;
        lot = await partModel.getLotById(fittedLotId, connection);
        part = await partModel.getPartByIdForUpdate(fittedPartId, connection);

        if (lot.reserved_quantity < fittedQuantity) {
          return { isError: true, status: 409, code: 'INSUFFICIENT_RESERVED_STOCK', message: 'Reserved quantity is no longer available' };
        }

        if (fittedQuantity === allocation.quantity) {
          await connection.execute(
            `UPDATE repair_parts_used
             SET status = 'FITTED', notes = COALESCE(?, notes)
             WHERE id = ?`,
            [notes || null, repair_part_id],
          );
        } else {
          await connection.execute('UPDATE repair_parts_used SET quantity = quantity - ? WHERE id = ?', [
            fittedQuantity,
            repair_part_id,
          ]);
          await createAllocation(connection, {
            repair_record_id: id,
            part_id: fittedPartId,
            part_lot_id: fittedLotId,
            quantity: fittedQuantity,
            status: 'FITTED',
            notes,
            added_by: req.user.id,
          });
        }

        await partModel.updateLotQuantities(fittedLotId, { reserved: -fittedQuantity, consumed: fittedQuantity }, connection);
        await partModel.updatePartQuantities(fittedPartId, { reserved: -fittedQuantity, consumed: fittedQuantity }, connection);
        await partModel.createTransaction(
          {
            part_id: fittedPartId,
            part_lot_id: fittedLotId,
            movement_type: 'FIT_RESERVED',
            quantity: fittedQuantity,
            reserved_delta: -fittedQuantity,
            consumed_delta: fittedQuantity,
            reference_type: 'REPAIR_RECORD',
            reference_id: id,
            notes: notes || 'Fitted reserved part',
            user_id: req.user.id,
          },
          connection,
        );
      } else {
        if (!direct_from_available) {
          return {
            isError: true,
            status: 400,
            code: 'DIRECT_FIT_FLAG_REQUIRED',
            message: 'Fitting without a reservation requires direct_from_available=true',
          };
        }

        await ensurePartCompatibility(connection, id, fittedPartId);
        lot = await partModel.getLotById(fittedLotId, connection);
        part = await partModel.getPartByIdForUpdate(fittedPartId, connection);

        if (!lot || !part || lot.part_id !== part.id) {
          return { isError: true, status: 404, code: 'PART_LOT_NOT_FOUND', message: 'Part lot not found' };
        }
        if (lot.available_quantity < fittedQuantity) {
          return { isError: true, status: 409, code: 'INSUFFICIENT_PART_STOCK', message: 'Not enough available stock in this lot' };
        }

        await createAllocation(connection, {
          repair_record_id: id,
          part_id: fittedPartId,
          part_lot_id: fittedLotId,
          quantity: fittedQuantity,
          status: 'FITTED',
          notes,
          added_by: req.user.id,
        });
        await partModel.updateLotQuantities(fittedLotId, { available: -fittedQuantity, consumed: fittedQuantity }, connection);
        await partModel.updatePartQuantities(fittedPartId, { available: -fittedQuantity, consumed: fittedQuantity }, connection);
        await partModel.createTransaction(
          {
            part_id: fittedPartId,
            part_lot_id: fittedLotId,
            movement_type: 'FIT_DIRECT',
            quantity: fittedQuantity,
            available_delta: -fittedQuantity,
            consumed_delta: fittedQuantity,
            reference_type: 'REPAIR_RECORD',
            reference_id: id,
            notes: notes || 'Fitted directly from available stock',
            user_id: req.user.id,
          },
          connection,
        );
      }

      await applyDeviceColorChange(connection, id, device, lot, req.user.id);

      await promoteRecordToInProgress(
        connection,
        record,
        device,
        id,
        req.user.id,
        'Repair work started by fitting part',
      );

      return { isError: false };
    } catch (error) {
      return mapDomainError(error);
    }
  });

  if (result.isError) {
    return errorResponse(res, result.message, result.code, result.status);
  }

  successResponse(res, {}, 'Part fitted successfully');
});

export const removeRepairPart = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { repair_part_id, disposition, quantity, fault_reason, notes } = req.body;

  const result = await transaction(async (connection) => {
    try {
      const record = await getLockedRecord(connection, id);
      if (!record) {
        return { isError: true, status: 404, code: 'REPAIR_RECORD_NOT_FOUND', message: 'Repair record not found' };
      }

      const allocation = await getLockedRepairAllocation(connection, repair_part_id);
      if (!allocation || allocation.repair_record_id !== parseInt(id, 10)) {
        return { isError: true, status: 404, code: 'ALLOCATION_NOT_FOUND', message: 'Part allocation not found' };
      }
      if (!['RESERVED', 'FITTED'].includes(allocation.status)) {
        return { isError: true, status: 409, code: 'ALLOCATION_NOT_ACTIVE', message: 'Only active allocations can be removed' };
      }

      const removeQuantity = quantity || allocation.quantity;
      if (removeQuantity > allocation.quantity) {
        return { isError: true, status: 400, code: 'INVALID_QUANTITY', message: 'Removal quantity exceeds the allocated quantity' };
      }

      const lot = await partModel.getLotById(allocation.part_lot_id, connection);
      const part = await partModel.getPartByIdForUpdate(allocation.part_id, connection);
      if (!lot || !part) {
        return { isError: true, status: 404, code: 'PART_LOT_NOT_FOUND', message: 'Part lot not found' };
      }

      let lotDeltas;
      let partDeltas;
      let movementType;
      let replacementStatus;

      if (allocation.status === 'RESERVED' && disposition === 'RESTOCK') {
        lotDeltas = { available: removeQuantity, reserved: -removeQuantity };
        partDeltas = { available: removeQuantity, reserved: -removeQuantity };
        movementType = 'UNRESERVE';
        replacementStatus = 'REMOVED_RESTOCKED';
      } else if (allocation.status === 'RESERVED' && disposition === 'FAULTY') {
        lotDeltas = { reserved: -removeQuantity, faulty: removeQuantity };
        partDeltas = { reserved: -removeQuantity, faulty: removeQuantity };
        movementType = 'REMOVE_FAULTY';
        replacementStatus = 'REMOVED_FAULTY';
      } else if (allocation.status === 'FITTED' && disposition === 'RESTOCK') {
        lotDeltas = { available: removeQuantity, consumed: -removeQuantity };
        partDeltas = { available: removeQuantity, consumed: -removeQuantity };
        movementType = 'REMOVE_RESTOCK';
        replacementStatus = 'REMOVED_RESTOCKED';
      } else if (allocation.status === 'FITTED' && disposition === 'FAULTY') {
        lotDeltas = { faulty: removeQuantity, consumed: -removeQuantity };
        partDeltas = { faulty: removeQuantity, consumed: -removeQuantity };
        movementType = 'REMOVE_FAULTY';
        replacementStatus = 'REMOVED_FAULTY';
      } else {
        return { isError: true, status: 400, code: 'INVALID_DISPOSITION', message: 'Invalid part disposition' };
      }

      await splitOrCloseAllocation(connection, allocation, removeQuantity, replacementStatus, req.user.id, notes);
      await partModel.updateLotQuantities(allocation.part_lot_id, lotDeltas, connection);
      await partModel.updatePartQuantities(allocation.part_id, partDeltas, connection);
      await partModel.createTransaction(
        {
          part_id: allocation.part_id,
          part_lot_id: allocation.part_lot_id,
          movement_type: movementType,
          quantity: removeQuantity,
          available_delta: lotDeltas.available || 0,
          reserved_delta: lotDeltas.reserved || 0,
          consumed_delta: lotDeltas.consumed || 0,
          faulty_delta: lotDeltas.faulty || 0,
          reference_type: 'REPAIR_RECORD',
          reference_id: id,
          notes: notes || null,
          user_id: req.user.id,
        },
        connection,
      );

      let faultReportId = null;
      if (disposition === 'FAULTY') {
        faultReportId = await partModel.createFaultReport(
          {
            part_id: allocation.part_id,
            part_lot_id: allocation.part_lot_id,
            supplier_id: lot.supplier_id || null,
            repair_record_id: id,
            quantity: removeQuantity,
            reason: fault_reason || 'Marked faulty during repair',
            notes: notes || null,
            created_by: req.user.id,
          },
          connection,
        );
      }

      return { isError: false, faultReportId };
    } catch (error) {
      return mapDomainError(error);
    }
  });

  if (result.isError) {
    return errorResponse(res, result.message, result.code, result.status);
  }

  successResponse(res, { faultReportId: result.faultReportId }, 'Part removed successfully');
});

export const escalateRepairToLevel3 = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await transaction(async (connection) => {
    const record = await getLockedRecord(connection, id);
    if (!record) {
      return { isError: true, status: 404, code: 'REPAIR_RECORD_NOT_FOUND', message: 'Repair record not found' };
    }
    if (CLOSED_RECORD_STATUSES.includes(record.status)) {
      return { isError: true, status: 409, code: 'REPAIR_RECORD_CLOSED', message: 'Closed repair records cannot be escalated' };
    }

    const device = await getLockedDevice(connection, record.device_id);
    const queueLocation = await repairModel.getLevel3QueueLocation(connection);
    if (!queueLocation) {
      return { isError: true, status: 500, code: 'LEVEL3_QUEUE_MISSING', message: 'Level 3 queue location is missing' };
    }

    const level3RepairId = await repairModel.createLevel3Repair(
      {
        device_id: record.device_id,
        location_code: queueLocation.code,
        fault_description: record.fault_description || 'Escalated from standard repair',
        engineer_comments: record.resolution_notes || record.engineer_comments || null,
        booked_in_by: req.user.id,
      },
      connection,
    );

    await repairModel.updateRecord(
      id,
      {
        status: 'ESCALATED_L3',
        completed_at: new Date(),
        repaired_by: req.user.id,
        outcome: 'Escalated to Level 3',
      },
      connection,
    );

    await connection.execute(
      `UPDATE devices
       SET
         status = 'IN_LEVEL3',
         location_id = ?,
         repair_required = TRUE,
         repair_completed = FALSE,
         repair_completed_at = NULL,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [queueLocation.id, record.device_id],
    );

    if (device.location_id !== queueLocation.id) {
      await logDeviceHistory(connection, {
        deviceId: record.device_id,
        imei: record.imei,
        eventType: 'LOCATION_CHANGE',
        fieldChanged: 'location_id',
        oldValue: device.location_id ? String(device.location_id) : null,
        newValue: String(queueLocation.id),
        referenceType: 'LEVEL3_REPAIR',
        referenceId: level3RepairId,
        notes: 'Escalated from standard repair into Level 3 queue',
        userId: req.user.id,
      });
    }

    await logDeviceHistory(connection, {
      deviceId: record.device_id,
      imei: record.imei,
      eventType: 'STATUS_CHANGE',
      fieldChanged: 'status',
      oldValue: device.status,
      newValue: 'IN_LEVEL3',
      referenceType: 'LEVEL3_REPAIR',
      referenceId: level3RepairId,
      notes: 'Escalated from standard repair',
      userId: req.user.id,
    });

    await repairModel.refreshJobMetrics(record.repair_job_id, connection);
    return { isError: false, level3RepairId };
  });

  if (result.isError) {
    return errorResponse(res, result.message, result.code, result.status);
  }

  successResponse(res, { level3RepairId: result.level3RepairId }, 'Repair escalated to Level 3');
});

export const getBulkParts = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { device_ids } = req.query;

  if (!device_ids) {
    return errorResponse(res, 'device_ids query parameter is required', 'MISSING_DEVICE_IDS', 400);
  }

  const deviceIds = device_ids.split(',').map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id));

  if (deviceIds.length === 0) {
    return errorResponse(res, 'No valid device IDs provided', 'INVALID_DEVICE_IDS', 400);
  }

  const [job, jobRecords] = await Promise.all([
    repairModel.getJobById(id),
    repairModel.getJobRecordsByDeviceIds(id, deviceIds),
  ]);

  if (!job) {
    return errorResponse(res, 'Repair job not found', 'REPAIR_JOB_NOT_FOUND', 404);
  }

  if (jobRecords.length !== deviceIds.length) {
    return errorResponse(
      res,
      'One or more selected devices are not attached to this repair job',
      'DEVICE_NOT_IN_JOB',
      404,
    );
  }

  const modelKeys = new Set(jobRecords.map(getBulkDeviceModelKey));
  if (modelKeys.size > 1) {
    return errorResponse(
      res,
      'Bulk repair only supports devices with the same manufacturer and model',
      'MIXED_DEVICE_MODELS',
      400,
    );
  }

  const requiredQuantity = deviceIds.length;
  const parts = (await repairModel.getBulkCompatibleParts(deviceIds)).map((part) => ({
    ...part,
    required_quantity: requiredQuantity,
    can_allocate_to_all: part.available_quantity >= requiredQuantity,
    shortage_quantity: Math.max(requiredQuantity - part.available_quantity, 0),
  }));

  const primaryRecord = jobRecords[0];

  successResponse(res, {
    parts,
    selection_summary: {
      device_count: jobRecords.length,
      manufacturer_id: primaryRecord.manufacturer_id,
      model_id: primaryRecord.model_id,
      manufacturer_name: primaryRecord.manufacturer_name,
      model_name: primaryRecord.model_name,
      model_number: primaryRecord.model_number,
      required_quantity: requiredQuantity,
    },
  });
});

export const bulkRepair = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { device_ids, part_allocations } = req.body;

  const result = await transaction(async (connection) => {
    try {
      const [jobRows] = await connection.execute(
        'SELECT id, status FROM repair_jobs WHERE id = ? FOR UPDATE',
        [id],
      );
      const job = jobRows[0];
      if (!job) {
        return { isError: true, status: 404, code: 'REPAIR_JOB_NOT_FOUND', message: 'Repair job not found' };
      }
      if (job.status === 'CANCELLED' || job.status === 'COMPLETED') {
        return { isError: true, status: 409, code: 'REPAIR_JOB_CLOSED', message: 'This repair job is closed' };
      }

      const placeholders = device_ids.map(() => '?').join(', ');
      const [deviceRows] = await connection.execute(
        `SELECT d.id, d.imei, d.manufacturer_id, d.model_id, d.color, d.status
         FROM devices d
         WHERE d.id IN (${placeholders})
         FOR UPDATE`,
        device_ids,
      );

      if (deviceRows.length !== device_ids.length) {
        return { isError: true, status: 404, code: 'DEVICE_NOT_FOUND', message: 'One or more devices not found' };
      }

      // Lock repair_records rows to prevent concurrent modification
      const repairRecords = await repairModel.getJobRecordsByDeviceIds(id, device_ids, connection, true);
      if (repairRecords.length !== device_ids.length) {
        return {
          isError: true,
          status: 404,
          code: 'DEVICE_NOT_IN_JOB',
          message: 'One or more selected devices are not attached to this repair job',
        };
      }

      const modelKeys = new Set(repairRecords.map(getBulkDeviceModelKey));
      if (modelKeys.size > 1) {
        return {
          isError: true,
          status: 400,
          code: 'MIXED_DEVICE_MODELS',
          message: 'Bulk repair only supports devices with the same manufacturer and model',
        };
      }

      const closedRecords = repairRecords.filter((record) => !OPEN_RECORD_STATUSES.includes(record.status));
      if (closedRecords.length > 0) {
        return {
          isError: true,
          status: 409,
          code: 'REPAIR_RECORD_CLOSED',
          message: `Selected devices must have open repair records. Closed devices: ${closedRecords.map((record) => record.imei).join(', ')}`,
        };
      }

      const recordMap = {};
      repairRecords.forEach((record) => {
        recordMap[record.device_id] = record;
      });

      const requiredQuantity = deviceRows.length;
      const validatedAllocations = [];
      const seenAllocations = new Set();

      for (const allocation of part_allocations) {
        const allocationKey = `${allocation.part_id}:${allocation.part_lot_id}`;
        if (seenAllocations.has(allocationKey)) {
          return {
            isError: true,
            status: 400,
            code: 'DUPLICATE_PART_ALLOCATION',
            message: 'Duplicate part lot selections are not allowed in bulk repair',
          };
        }
        seenAllocations.add(allocationKey);

        const lot = await partModel.getLotById(allocation.part_lot_id, connection);
        const part = await partModel.getPartByIdForUpdate(allocation.part_id, connection);

        if (!lot || !part || lot.part_id !== part.id) {
          return { isError: true, status: 404, code: 'PART_LOT_NOT_FOUND', message: 'Part lot not found' };
        }
        if (lot.available_quantity < requiredQuantity) {
          return {
            isError: true,
            status: 409,
            code: 'INSUFFICIENT_PART_STOCK',
            message: `Part ${part.sku} only has ${lot.available_quantity} available but ${requiredQuantity} are required`,
          };
        }

        validatedAllocations.push({
          ...allocation,
          lot,
          part,
        });
      }

      // All devices share the same model (validated above), so compatibility only
      // needs to be checked once per part — use the first record as the reference.
      for (const allocation of validatedAllocations) {
        await ensurePartCompatibility(connection, repairRecords[0].record_id, allocation.part_id);
      }

      for (const device of deviceRows) {
        const record = recordMap[device.id];

        for (const allocation of validatedAllocations) {
          await createAllocation(connection, {
            repair_record_id: record.record_id,
            part_id: allocation.part_id,
            part_lot_id: allocation.part_lot_id,
            quantity: 1,
            status: 'FITTED',
            notes: 'Bulk repair allocation',
            added_by: req.user.id,
          });

          // One stock transaction per device per part for a traceable audit trail
          await partModel.createTransaction(
            {
              part_id: allocation.part_id,
              part_lot_id: allocation.part_lot_id,
              movement_type: 'FIT_DIRECT',
              quantity: 1,
              available_delta: -1,
              consumed_delta: 1,
              reference_type: 'REPAIR_RECORD',
              reference_id: record.record_id,
              notes: 'Fitted via bulk repair',
              user_id: req.user.id,
            },
            connection,
          );

          const nextColor = await applyDeviceColorChange(connection, record.record_id, device, allocation.lot, req.user.id);
          if (nextColor) {
            device.color = nextColor;
          }
        }

        await repairModel.updateRecord(
          record.record_id,
          {
            status: 'COMPLETED',
            started_at: record.started_at || new Date(),
            completed_at: new Date(),
            repaired_by: req.user.id,
            outcome: 'Part Replaced',
            resolution_notes: record.fault_description
              ? `Completed via bulk repair. Original fault: ${record.fault_description}`
              : 'Completed via bulk repair',
          },
          connection,
        );

        await connection.execute(
          `UPDATE devices
           SET status = 'IN_STOCK', repair_required = FALSE, repair_completed = TRUE,
               repair_completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [device.id],
        );

        await logDeviceHistory(connection, {
          deviceId: device.id,
          imei: device.imei,
          eventType: 'REPAIR_COMPLETE',
          fieldChanged: 'status',
          oldValue: device.status,
          newValue: 'IN_STOCK',
          referenceType: 'REPAIR_RECORD',
          referenceId: record.record_id,
          notes: 'Repair completed via bulk repair',
          userId: req.user.id,
        });
      }

      // Batch the lot/part quantity decrements — one update per allocation
      // instead of one per device. Lot rows are already FOR UPDATE locked above.
      for (const allocation of validatedAllocations) {
        await partModel.updateLotQuantities(
          allocation.part_lot_id,
          { available: -requiredQuantity, consumed: requiredQuantity },
          connection,
        );
        await partModel.updatePartQuantities(
          allocation.part_id,
          { available: -requiredQuantity, consumed: requiredQuantity },
          connection,
        );
      }

      await repairModel.refreshJobMetrics(id, connection);
      return { isError: false, completedCount: deviceRows.length };
    } catch (error) {
      return mapDomainError(error);
    }
  });

  if (result.isError) {
    return errorResponse(res, result.message, result.code, result.status);
  }

  successResponse(res, { completedCount: result.completedCount }, 'Bulk repair completed successfully');
});
