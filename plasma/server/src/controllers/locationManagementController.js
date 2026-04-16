import db, { transaction } from '../config/database.js';
import { AdminOperation } from '../models/AdminOperation.js';
import { AdminService } from '../services/adminService.js';
import { asyncHandler } from '../middleware/validation.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

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
    const { devices, new_location, reason, operation_date } = req.body;

    const result = await transaction(async (connection) => {
        // Get location_id for new location
        const [locationResults] = await connection.execute(
            'SELECT id, is_active FROM locations WHERE code = ?',
            [new_location]
        );

        if (locationResults.length === 0) {
            return {
                isError: true,
                message: `Location ${new_location} not found`,
                status: 400
            };
        }

        const locationId = locationResults[0].id;
        const isActive = locationResults[0].is_active;

        if (!isActive) {
            return {
                isError: true,
                message: `Location ${new_location} is not active`,
                status: 400
            };
        }

        // Validate all devices and collect their current locations
        const deviceMoves = [];
        const imeis = devices.map(d => d.imei);

        const [deviceResults] = await connection.execute(
            `SELECT
        d.id,
        d.imei,
        d.status,
        l.code as current_location,
        l.id as current_location_id
      FROM devices d
      LEFT JOIN locations l ON l.id = d.location_id
      WHERE d.imei IN (${imeis.map(() => '?').join(',')}) AND d.status NOT IN ('OUT_OF_STOCK', 'SHIPPED', 'SCRAPPED')`,
            imeis
        );

        // Check all devices were found
        if (deviceResults.length !== devices.length) {
            const foundImeis = deviceResults.map(d => d.imei);
            const missingImeis = imeis.filter(imei => !foundImeis.includes(imei));
            return {
                isError: true,
                message: `Some devices not found or not available for location move: ${missingImeis.join(', ')}`,
                status: 400
            };
        }

        // Check if any devices are already in the target location
        const alreadyInLocation = deviceResults.filter(d => d.current_location === new_location);
        if (alreadyInLocation.length > 0) {
            return {
                isError: true,
                message: `Some devices are already in location ${new_location}: ${alreadyInLocation.map(d => d.imei).join(', ')}`,
                status: 400
            };
        }

        // Prepare device moves
        deviceResults.forEach(device => {
            deviceMoves.push({
                device_id: device.id,
                imei: device.imei,
                old_location: device.current_location,
                old_location_id: device.current_location_id
            });
        });

        // Create admin operation log
        const adminOpData = {
            operation_type: 'BULK_LOCATION_MOVE',
            description: `Bulk moved ${deviceMoves.length} device(s) to ${new_location}`,
            reason,
            affected_count: deviceMoves.length,
            affected_imeis: deviceMoves.map(m => m.imei),
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

        // Update device locations
        await connection.execute(
            `UPDATE devices SET location_id = ? WHERE id IN (${deviceMoves.map(() => '?').join(',')})`,
            [locationId, ...deviceMoves.map(m => m.device_id)]
        );

        // Log to device_history for each device
        for (const move of deviceMoves) {
            await connection.execute(
                `INSERT INTO device_history 
         (device_id, imei, event_type, field_changed, old_value, new_value, reference_type, reference_id, user_id)
         VALUES (?, ?, 'LOCATION_CHANGE', 'location', ?, ?, 'ADMIN_OPERATION', ?, ?)`,
                [
                    move.device_id,
                    move.imei,
                    move.old_location || 'null',
                    new_location,
                    adminOpId,
                    req.user.id
                ]
            );
        }

        return {
            isError: false,
            adminOpId,
            movedCount: deviceMoves.length,
            devices: deviceMoves
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
