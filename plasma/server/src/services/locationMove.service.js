import { AppError, logDeviceHistory } from '../utils/helpers.js';

const DEFAULT_BLOCKED_STATUSES = ['OUT_OF_STOCK', 'SHIPPED', 'SCRAPPED'];

export async function prepareLocationMove(
  connection,
  {
    imeis,
    newLocationCode,
    blockedStatuses = DEFAULT_BLOCKED_STATUSES,
  },
) {
  if (!Array.isArray(imeis) || imeis.length === 0) {
    throw new AppError('At least one IMEI is required', 400, 'MOVE_IMEIS_REQUIRED');
  }

  const [locationRows] = await connection.execute(
    `SELECT id, code, is_active
     FROM locations
     WHERE code = ?
     LIMIT 1`,
    [newLocationCode],
  );

  if (locationRows.length === 0) {
    throw new AppError(`Location ${newLocationCode} not found`, 400, 'MOVE_LOCATION_NOT_FOUND');
  }

  if (!locationRows[0].is_active) {
    throw new AppError(`Location ${newLocationCode} is not active`, 400, 'MOVE_LOCATION_INACTIVE');
  }

  const placeholders = imeis.map(() => '?').join(', ');
  const blockedPlaceholders = blockedStatuses.map(() => '?').join(', ');
  const [deviceRows] = await connection.execute(
    `SELECT
       d.id,
       d.imei,
       d.status,
       l.code AS current_location,
       l.id AS current_location_id
     FROM devices d
     LEFT JOIN locations l ON l.id = d.location_id
     WHERE d.imei IN (${placeholders})
       AND d.status NOT IN (${blockedPlaceholders})`,
    [...imeis, ...blockedStatuses],
  );

  if (deviceRows.length !== imeis.length) {
    const foundImeis = new Set(deviceRows.map((row) => row.imei));
    const missingImeis = imeis.filter((imei) => !foundImeis.has(imei));
    throw new AppError(
      `Some devices not found or not available for location move: ${missingImeis.join(', ')}`,
      400,
      'MOVE_DEVICE_NOT_FOUND',
    );
  }

  const alreadyInLocation = deviceRows.filter((row) => row.current_location === newLocationCode);
  if (alreadyInLocation.length > 0) {
    throw new AppError(
      `Some devices are already in location ${newLocationCode}: ${alreadyInLocation.map((row) => row.imei).join(', ')}`,
      409,
      'MOVE_ALREADY_IN_LOCATION',
    );
  }

  return {
    locationId: locationRows[0].id,
    newLocationCode,
    devices: deviceRows.map((row) => ({
      deviceId: row.id,
      imei: row.imei,
      oldLocation: row.current_location,
      oldLocationId: row.current_location_id,
      status: row.status,
    })),
  };
}

export async function applyPreparedLocationMove(
  connection,
  {
    movePlan,
    userId,
    referenceType = 'AUTOMATION',
    referenceId = null,
    notes = null,
  },
) {
  if (!movePlan?.devices?.length) {
    return movePlan;
  }

  await connection.execute(
    `UPDATE devices
     SET location_id = ?
     WHERE id IN (${movePlan.devices.map(() => '?').join(',')})`,
    [movePlan.locationId, ...movePlan.devices.map((device) => device.deviceId)],
  );

  for (const device of movePlan.devices) {
    await logDeviceHistory(connection, {
      deviceId: device.deviceId,
      imei: device.imei,
      eventType: 'LOCATION_CHANGE',
      fieldChanged: 'location',
      oldValue: device.oldLocation || null,
      newValue: movePlan.newLocationCode,
      referenceType,
      referenceId,
      notes,
      userId,
    });
  }

  return movePlan;
}
