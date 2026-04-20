import db, { transaction } from '../config/database.js';
import { asyncHandler } from '../middleware/validation.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import { applyPreparedLocationMove, prepareLocationMove } from '../services/locationMove.service.js';

/**
 * Location Management Controller
 * Handles bulk stock location movements
 */

/**
 * Get device details by IMEI for scanning
 * GET /api/admin/location-management/device/:imei
 */
export const getDeviceByImei = asyncHandler(async (req, res) => {
    const { imei } = req.params;

    const query = `
    SELECT
      d.id,
      d.imei,
      d.status,
      m.name as manufacturer,
      mo.model_name as model,
      d.storage_gb,
      d.color,
      d.grade,
      l.code as current_location,
      l.name as location_name
    FROM devices d
    LEFT JOIN manufacturers m ON m.id = d.manufacturer_id
    LEFT JOIN models mo ON mo.id = d.model_id
    LEFT JOIN locations l ON l.id = d.location_id
    WHERE d.imei = ? AND d.status NOT IN ('OUT_OF_STOCK', 'SHIPPED', 'SCRAPPED')
    LIMIT 1
  `;

    const [results] = await db.execute(query, [imei]);

    if (results.length === 0) {
        return errorResponse(
            res,
            'Device not found or not available for location move',
            'DEVICE_NOT_FOUND',
            404
        );
    }

    successResponse(res, { device: results[0] });
});

/**
 * Bulk move devices to new location
 * POST /api/admin/location-management/bulk-move
 */
export const bulkMoveDevices = asyncHandler(async (req, res) => {
    // Input validation is handled by validateBulkMoveDevices middleware
    const { devices, new_location, reason } = req.body;

    const result = await transaction(async (connection) => {
        const movePlan = await prepareLocationMove(
            connection,
            {
                imeis: devices.map((device) => device.imei),
                newLocationCode: new_location,
            },
        );

        // Create admin operation log
        const adminOpData = {
            operation_type: 'BULK_LOCATION_MOVE',
            description: `Bulk moved ${movePlan.devices.length} device(s) to ${new_location}`,
            reason,
            affected_count: movePlan.devices.length,
            affected_imeis: movePlan.devices.map((move) => move.imei),
            performed_by: req.user.id
        };

        const [opResult] = await connection.execute(
            `INSERT INTO admin_operations 
       (operation_type, description, reason, affected_count, affected_imeis, performed_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [
                adminOpData.operation_type,
                adminOpData.description,
                adminOpData.reason,
                adminOpData.affected_count,
                JSON.stringify(adminOpData.affected_imeis),
                adminOpData.performed_by
            ]
        );

        const adminOpId = opResult.insertId;

        await applyPreparedLocationMove(
            connection,
            {
                movePlan,
                userId: req.user.id,
                referenceType: 'ADMIN_OPERATION',
                referenceId: adminOpId,
                notes: reason || null,
            },
        );

        return {
            isError: false,
            adminOpId,
            movedCount: movePlan.devices.length,
            devices: movePlan.devices
        };
    });

    if (result.isError) {
        return errorResponse(res, result.message, 'BULK_MOVE_FAILED', result.status);
    }

    successResponse(res, {
        adminOpId: result.adminOpId,
        movedCount: result.movedCount,
        devices: result.devices
    });
});

/**
 * Get all active locations
 * GET /api/admin/location-management/locations
 */
export const getActiveLocations = asyncHandler(async (req, res) => {
    const query = `
    SELECT 
      id,
      code,
      name,
      location_type
    FROM locations
    WHERE is_active = TRUE
    ORDER BY code
  `;

    const [locations] = await db.execute(query);

    successResponse(res, { locations });
});
