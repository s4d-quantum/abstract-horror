import { level3Model } from '../models/level3Model.js';
import { deviceModel } from '../models/deviceModel.js';
import { asyncHandler } from '../middleware/validation.js';
import { successResponse, errorResponse, validateIMEI } from '../utils/helpers.js';
import { transaction } from '../config/database.js';

// Get active repairs (BOOKED_IN, IN_PROGRESS, AWAITING_PARTS, ON_HOLD)
export const getActiveRepairs = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const status = req.query.status || undefined;

  const result = await level3Model.getActiveRepairs({ page, limit, status });

  return successResponse(res, result);
});

// Get completed repairs (COMPLETED, BER, UNREPAIRABLE)
export const getCompletedRepairs = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));

  const result = await level3Model.getCompletedRepairs({ page, limit });

  return successResponse(res, result);
});

// Get single repair by ID
export const getRepairById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const repair = await level3Model.getRepairById(id);

  if (!repair) {
    return errorResponse(res, 'Repair not found', 'REPAIR_NOT_FOUND', 404);
  }

  return successResponse(res, { repair });
});

// Get available L3 locations (unoccupied single-bay locations)
export const getAvailableLocations = asyncHandler(async (req, res) => {
  const locations = await level3Model.getAvailableL3Locations();

  return successResponse(res, { locations });
});

// Book new L3 repair
export const bookRepair = asyncHandler(async (req, res) => {
  const { imei, location_code, fault_description } = req.body;
  const userId = req.user.id;

  if (!imei || !location_code || !fault_description) {
    return errorResponse(
      res,
      'IMEI, location code, and fault description are required',
      'MISSING_FIELDS',
      400
    );
  }

  if (!validateIMEI(imei)) {
    return errorResponse(res, 'Invalid IMEI format', 'INVALID_IMEI', 400);
  }

  if (fault_description.length < 5) {
    return errorResponse(
      res,
      'Fault description must be at least 5 characters',
      'INVALID_FAULT_DESC',
      400
    );
  }

  if (!['LEVEL3_1', 'LEVEL3_2'].includes(location_code)) {
    return errorResponse(
      res,
      'Invalid location code. Must be LEVEL3_1 or LEVEL3_2',
      'INVALID_LOCATION',
      400
    );
  }

  const result = await transaction(async (connection) => {
    const device = await deviceModel.getByImei(imei);

    if (!device) {
      return { isError: true, error: 'Device not found', code: 'DEVICE_NOT_FOUND', status: 404 };
    }

    if (device.status === 'SHIPPED' || device.status === 'SOLD') {
      return {
        isError: true,
        error: `Device cannot be repaired - already ${device.status}`,
        code: 'INVALID_DEVICE_STATUS',
        status: 400
      };
    }

    const existingRepair = await level3Model.getActiveRepairByDeviceId(device.id);

    if (existingRepair) {
      return {
        isError: true,
        error: `Device already has active L3 repair in ${existingRepair.location_code} (status: ${existingRepair.status})`,
        code: 'DUPLICATE_REPAIR',
        status: 409
      };
    }

    const [locationRows] = await connection.execute(
      'SELECT id, is_active FROM locations WHERE code = ? FOR UPDATE',
      [location_code]
    );

    if (locationRows.length === 0) {
      return {
        isError: true,
        error: `Location ${location_code} not found`,
        code: 'LOCATION_NOT_FOUND',
        status: 404
      };
    }

    const locationId = locationRows[0].id;
    const isActive = locationRows[0].is_active;

    if (!isActive) {
      return {
        isError: true,
        error: `Location ${location_code} is not active`,
        code: 'LOCATION_INACTIVE',
        status: 400
      };
    }

    const [occupancyRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM devices WHERE location_id = ?',
      [locationId]
    );

    if (occupancyRows[0].count > 0) {
      return {
        isError: true,
        error: `Location ${location_code} is already occupied. Please select another bay.`,
        code: 'LOCATION_OCCUPIED',
        status: 409
      };
    }

    const repairId = await level3Model.createRepair(
      {
        device_id: device.id,
        location_code,
        fault_description,
        booked_in_by: userId
      },
      connection
    );

    const oldStatus = device.status;
    await connection.execute(
      'UPDATE devices SET location_id = ?, status = ? WHERE id = ?',
      [locationId, 'AWAITING_REPAIR', device.id]
    );

    await connection.execute(
      `INSERT INTO device_history
       (device_id, imei, event_type, field_changed, old_value, new_value, reference_type, reference_id, user_id)
       VALUES (?, ?, 'LOCATION_CHANGE', 'location', ?, ?, 'LEVEL3_REPAIR', ?, ?)`,
      [
        device.id,
        device.imei,
        device.location || 'null',
        location_code,
        repairId,
        userId
      ]
    );

    if (oldStatus !== 'AWAITING_REPAIR') {
      await connection.execute(
        `INSERT INTO device_history
         (device_id, imei, event_type, field_changed, old_value, new_value, reference_type, reference_id, user_id)
         VALUES (?, ?, 'STATUS_CHANGE', 'status', ?, ?, 'LEVEL3_REPAIR', ?, ?)`,
        [
          device.id,
          device.imei,
          oldStatus,
          'AWAITING_REPAIR',
          repairId,
          userId
        ]
      );
    }

    return { isError: false, repairId, message: 'Repair booked successfully', status: 201 };
  });

  if (result.isError) {
    return errorResponse(res, result.error, result.code, result.status);
  }

  return successResponse(
    res,
    { repairId: result.repairId, repairMessage: result.message },
    result.message,
    result.status
  );
});

// Update repair (status, engineer comments)
export const updateRepair = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, engineer_comments } = req.body;
  const userId = req.user.id;

  if (!status) {
    return errorResponse(res, 'Status is required', 'MISSING_STATUS', 400);
  }

  const validStatuses = [
    'BOOKED_IN',
    'IN_PROGRESS',
    'AWAITING_PARTS',
    'ON_HOLD',
    'COMPLETED',
    'BER',
    'UNREPAIRABLE'
  ];

  if (!validStatuses.includes(status)) {
    return errorResponse(res, 'Invalid status', 'INVALID_STATUS', 400);
  }

  const result = await transaction(async (connection) => {
    const repair = await level3Model.getRepairById(id);

    if (!repair) {
      return { isError: true, error: 'Repair not found', code: 'REPAIR_NOT_FOUND', status: 404 };
    }

    const closedStatuses = ['COMPLETED', 'BER', 'UNREPAIRABLE'];
    if (closedStatuses.includes(repair.status)) {
      return {
        isError: true,
        error: `Cannot update closed repair (current status: ${repair.status})`,
        code: 'INVALID_TRANSITION',
        status: 400
      };
    }

    const oldStatus = repair.status;
    const newStatus = status;
    const updates = {
      status: newStatus,
      engineer_comments: engineer_comments !== undefined ? engineer_comments : repair.engineer_comments
    };

    if (closedStatuses.includes(newStatus)) {
      updates.completed_at = new Date();
    }

    await level3Model.updateRepair(id, updates, connection);

    let newLocationCode = null;
    if (closedStatuses.includes(newStatus)) {
      if (newStatus === 'COMPLETED') {
        newLocationCode = 'LEVEL3_COMPLETE';
      } else if (newStatus === 'BER' || newStatus === 'UNREPAIRABLE') {
        newLocationCode = 'LEVEL3_FAILS';
      }

      if (newLocationCode) {
        const [newLocationRows] = await connection.execute(
          'SELECT id FROM locations WHERE code = ?',
          [newLocationCode]
        );

        if (newLocationRows.length > 0) {
          const newLocationId = newLocationRows[0].id;

          await connection.execute(
            'UPDATE devices SET location_id = ? WHERE id = ?',
            [newLocationId, repair.device_id]
          );

          await connection.execute(
            `INSERT INTO device_history
             (device_id, imei, event_type, field_changed, old_value, new_value, reference_type, reference_id, user_id)
             VALUES (?, ?, 'LOCATION_CHANGE', 'location', ?, ?, 'LEVEL3_REPAIR', ?, ?)`,
            [
              repair.device_id,
              repair.imei,
              repair.location_code,
              newLocationCode,
              id,
              userId
            ]
          );
        }
      }
    }

    if (oldStatus !== newStatus) {
      await connection.execute(
        `INSERT INTO device_history
         (device_id, imei, event_type, field_changed, old_value, new_value, reference_type, reference_id, user_id, notes)
         VALUES (?, ?, 'STATUS_CHANGE', 'l3_repair_status', ?, ?, 'LEVEL3_REPAIR', ?, ?, ?)`,
        [
          repair.device_id,
          repair.imei,
          oldStatus,
          newStatus,
          id,
          userId,
          engineer_comments || null
        ]
      );
    }

    return { isError: false, repairId: id, message: 'Repair updated successfully' };
  });

  if (result.isError) {
    return errorResponse(res, result.error, result.code, result.status);
  }

  return successResponse(res, { repairId: result.repairId, repairMessage: result.message }, 'Repair updated');
});
