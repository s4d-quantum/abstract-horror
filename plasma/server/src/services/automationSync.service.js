import { qcModel } from '../models/qcModel.js';
import { repairModel } from '../models/repairModel.js';
import {
  ensureLegacyPurchaseOrderMap,
  ensureLegacySalesOrderMap,
  findLegacyPurchaseOrder,
  findLegacySalesOrder,
  normalizeGrade,
  normalizeStorageGb,
  resolveLegacyManufacturerModel,
  resolveLocationIdByCode,
  resolveOrUpsertCustomer,
  resolveOrUpsertSupplier,
  sanitizeAutomationBoolean,
  sanitizeAutomationText,
} from './automationMapping.service.js';
import { completeQcJobInTransaction } from './qcCompletion.service.js';
import { applyPreparedLocationMove, prepareLocationMove } from './locationMove.service.js';
import { AppError, logActivity, logDeviceHistory } from '../utils/helpers.js';

function parseSnapshotDate(value, fallbackValue = null) {
  const candidate = value ?? fallbackValue;
  if (!candidate) {
    return new Date();
  }

  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function normalizeFunctionalResult(device) {
  if (device.functional_result) {
    const normalized = String(device.functional_result).trim().toUpperCase();
    return ['PASS', 'FAIL', 'UNABLE', 'NA'].includes(normalized) ? normalized : null;
  }

  if (device.item_functional_passed === 1 || device.item_functional_passed === '1' || device.item_functional_passed === true) {
    return 'PASS';
  }

  if (device.item_functional_passed === 0 || device.item_functional_passed === '0' || device.item_functional_passed === false) {
    return 'FAIL';
  }

  return null;
}

function normalizeCosmeticResult(device) {
  if (device.cosmetic_result) {
    const normalized = String(device.cosmetic_result).trim().toUpperCase();
    return ['PASS', 'FAIL', 'NA'].includes(normalized) ? normalized : null;
  }

  if (device.item_cosmetic_passed === 1 || device.item_cosmetic_passed === '1' || device.item_cosmetic_passed === true) {
    return 'PASS';
  }

  if (device.item_cosmetic_passed === 0 || device.item_cosmetic_passed === '0' || device.item_cosmetic_passed === false) {
    return 'FAIL';
  }

  return null;
}

function normalizeNonUk(device) {
  if (device.non_uk !== undefined) {
    return sanitizeAutomationBoolean(device.non_uk, false);
  }

  const itemEu = sanitizeAutomationText(device.item_eu);
  if (!itemEu || itemEu === '-1' || itemEu.toUpperCase() === 'EU-UK') {
    return false;
  }

  return true;
}

async function findSupplierIdByCode(connection, supplierCode) {
  const normalizedCode = sanitizeAutomationText(supplierCode);
  if (!normalizedCode) {
    throw new AppError('supplier_code is required', 400, 'AUTOMATION_SUPPLIER_CODE_REQUIRED');
  }

  const [rows] = await connection.execute(
    `SELECT id
     FROM suppliers
     WHERE supplier_code = ?
     LIMIT 1`,
    [normalizedCode],
  );

  if (rows.length === 0) {
    throw new AppError(
      `Supplier ${normalizedCode} is not available in Plasma`,
      422,
      'AUTOMATION_SUPPLIER_NOT_FOUND',
    );
  }

  return rows[0].id;
}

async function ensureQcJobForPurchase(connection, purchaseOrderId, deviceIds, userId) {
  if (!deviceIds.length) {
    return null;
  }

  const existingJob = await qcModel.getExistingJobForDevices(
    purchaseOrderId,
    deviceIds,
    connection,
  );

  if (!existingJob) {
    const created = await qcModel.createAutoJobForDevices(
      connection,
      purchaseOrderId,
      deviceIds,
      userId,
    );
    return created?.jobId || null;
  }

  const [resultRows] = await connection.execute(
    `SELECT device_id
     FROM qc_results
     WHERE qc_job_id = ?`,
    [existingJob.id],
  );

  const existingDeviceIds = new Set(resultRows.map((row) => row.device_id));
  for (const deviceId of deviceIds) {
    if (!existingDeviceIds.has(deviceId)) {
      await qcModel.createPendingResult(existingJob.id, deviceId, connection);
    }
  }

  await qcModel.refreshJobMetrics(existingJob.id, connection);
  return existingJob.id;
}

async function ensureRepairJobForPurchase(connection, purchaseOrderId, deviceIds, userId, faultDescription = null) {
  if (!deviceIds.length) {
    return null;
  }

  const [jobRows] = await connection.execute(
    `SELECT id
     FROM repair_jobs
     WHERE purchase_order_id = ?
       AND status IN ('PENDING', 'IN_PROGRESS')
     ORDER BY created_at DESC
     LIMIT 1`,
    [purchaseOrderId],
  );

  if (jobRows.length === 0) {
    const created = await repairModel.createAutoJobForDevices(
      connection,
      purchaseOrderId,
      deviceIds,
      userId,
      faultDescription,
    );
    return created?.jobId || null;
  }

  const repairJobId = jobRows[0].id;
  const placeholders = deviceIds.map(() => '?').join(', ');
  const [recordRows] = await connection.execute(
    `SELECT device_id
     FROM repair_records
     WHERE repair_job_id = ?
       AND device_id IN (${placeholders})`,
    [repairJobId, ...deviceIds],
  );

  const existingDeviceIds = new Set(recordRows.map((row) => row.device_id));
  const defaultFault = faultDescription
    || 'Booked into repair from goods in. Add engineer diagnosis on device page.';

  for (const deviceId of deviceIds) {
    if (!existingDeviceIds.has(deviceId)) {
      await repairModel.createRecord(
        {
          repair_job_id: repairJobId,
          device_id: deviceId,
          fault_description: defaultFault,
        },
        connection,
      );
    }
  }

  await repairModel.refreshJobMetrics(repairJobId, connection);
  return repairJobId;
}

async function loadDeviceByImeiForUpdate(connection, imei) {
  const [rows] = await connection.execute(
    `SELECT
       id,
       imei,
       status,
       reserved_for_so_id,
       purchase_order_id,
       qc_required,
       qc_completed,
       repair_required,
       repair_completed
     FROM devices
     WHERE imei = ?
     LIMIT 1
     FOR UPDATE`,
    [imei],
  );

  return rows[0] || null;
}

async function buildSalesOrderLineItems(connection, order) {
  const rawLineItems = Array.isArray(order.lines) && order.lines.length > 0
    ? order.lines
    : Array.isArray(order.devices)
      ? order.devices
      : [];

  const normalizedLineItems = [];
  for (const item of rawLineItems) {
    if (item.supplier) {
      await resolveOrUpsertSupplier(connection, item.supplier);
    }

    const supplierId = await findSupplierIdByCode(connection, item.supplier_code);
    const { manufacturerId, modelId } = await resolveLegacyManufacturerModel(
      connection,
      item.item_brand,
      item.item_details,
    );

    normalizedLineItems.push({
      supplier_id: supplierId,
      manufacturer_id: manufacturerId,
      model_id: modelId,
      storage_gb: normalizeStorageGb(item.item_gb),
      color: sanitizeAutomationText(item.item_color),
      grade: normalizeGrade(item.item_grade),
      location_id: await resolveLocationIdByCode(connection, item.tray_id),
      requested_quantity: item.requested_quantity || 1,
    });
  }

  if (normalizedLineItems.length === 0) {
    throw new AppError(
      'Sales-order snapshot contains no lines or devices',
      422,
      'AUTOMATION_EMPTY_SALES_ORDER',
    );
  }

  const groupedLineMap = new Map();
  for (const line of normalizedLineItems) {
    const key = [
      line.supplier_id || '',
      line.manufacturer_id,
      line.model_id,
      line.storage_gb || '',
      line.color || '',
      line.grade || '',
      line.location_id || '',
    ].join('|');

    if (!groupedLineMap.has(key)) {
      groupedLineMap.set(key, {
        ...line,
        requested_quantity: 0,
      });
    }

    groupedLineMap.get(key).requested_quantity += line.requested_quantity;
  }

  return Array.from(groupedLineMap.values());
}

async function buildAuthoritativeSalesOrderDevices(connection, order, salesOrderId, legacyOrderId) {
  const exactDevices = [];

  for (const item of order.devices || []) {
    if (item.supplier) {
      await resolveOrUpsertSupplier(connection, item.supplier);
    }

    const supplierId = await findSupplierIdByCode(connection, item.supplier_code);
    const { manufacturerId, modelId } = await resolveLegacyManufacturerModel(
      connection,
      item.item_brand,
      item.item_details,
    );

    const device = await loadDeviceByImeiForUpdate(connection, item.imei);
    if (!device) {
      throw new AppError(
        `Device ${item.imei} does not exist in Plasma`,
        422,
        'AUTOMATION_RESERVED_DEVICE_NOT_FOUND',
      );
    }

    if (device.reserved_for_so_id && device.reserved_for_so_id !== salesOrderId) {
      throw new AppError(
        `Device ${item.imei} is already reserved for another sales order`,
        409,
        'AUTOMATION_DEVICE_ALREADY_RESERVED',
      );
    }

    if (device.status !== 'IN_STOCK' && device.reserved_for_so_id !== salesOrderId) {
      throw new AppError(
        `Device ${item.imei} is not currently reservable`,
        409,
        'AUTOMATION_DEVICE_NOT_IN_STOCK',
      );
    }

    exactDevices.push({
      device_id: device.id,
      supplier_id: supplierId,
      manufacturer_id: manufacturerId,
      model_id: modelId,
      storage_gb: normalizeStorageGb(item.item_gb),
      color: sanitizeAutomationText(item.item_color),
      grade: normalizeGrade(item.item_grade),
      location_id: await resolveLocationIdByCode(connection, item.tray_id),
      imei: item.imei,
    });
  }

  if (exactDevices.length === 0) {
    throw new AppError(
      'Authoritative sales-order sync requires at least one device',
      422,
      'AUTOMATION_AUTHORITATIVE_DEVICES_REQUIRED',
    );
  }

  const [conflictingLegacyRows] = await connection.execute(
    `SELECT device_id, legacy_sales_order_id
     FROM legacy_device_reserved_sales_order_map
     WHERE device_id IN (${exactDevices.map(() => '?').join(',')})
       AND legacy_sales_order_id != ?`,
    [...exactDevices.map((device) => device.device_id), legacyOrderId],
  );

  if (conflictingLegacyRows.length > 0) {
    throw new AppError(
      'One or more devices are already mapped to a different legacy sales order',
      409,
      'AUTOMATION_LEGACY_RESERVATION_CONFLICT',
    );
  }

  return exactDevices;
}

export async function syncLegacyPurchaseSnapshot(connection, payload, userId, legacyPurchaseId) {
  const purchase = payload.purchase;
  const purchaseDate = parseSnapshotDate(
    purchase.purchase_date,
    payload.source_created_at || payload.snapshot_generated_at,
  );
  const supplierId = await resolveOrUpsertSupplier(connection, purchase.supplier);
  const requiresQc = sanitizeAutomationBoolean(purchase.requires_qc, true);
  const requiresRepair = sanitizeAutomationBoolean(purchase.requires_repair, false);
  const supplierRef = sanitizeAutomationText(purchase.supplier_ref)
    || sanitizeAutomationText(purchase.po_ref);
  const notes = sanitizeAutomationText(purchase.notes);
  const poNumber = `LEG-${legacyPurchaseId}`;

  let purchaseOrderId;
  const existingPurchaseOrder = await findLegacyPurchaseOrder(connection, legacyPurchaseId);

  if (existingPurchaseOrder) {
    purchaseOrderId = existingPurchaseOrder.id;
    await connection.execute(
      `UPDATE purchase_orders
       SET
         po_number = ?,
         supplier_id = ?,
         supplier_ref = ?,
         status = 'FULLY_RECEIVED',
         expected_quantity = ?,
         received_quantity = ?,
         requires_qc = ?,
         requires_repair = ?,
         notes = ?,
         confirmed_at = COALESCE(confirmed_at, ?)
       WHERE id = ?`,
      [
        poNumber,
        supplierId,
        supplierRef,
        purchase.devices.length,
        purchase.devices.length,
        requiresQc ? 1 : 0,
        requiresRepair ? 1 : 0,
        notes,
        purchaseDate,
        existingPurchaseOrder.id,
      ],
    );
  } else {
    const [insertResult] = await connection.execute(
      `INSERT INTO purchase_orders (
         po_number,
         supplier_id,
         supplier_ref,
         status,
         expected_quantity,
         received_quantity,
         requires_qc,
         requires_repair,
         notes,
         created_by,
         confirmed_at,
         created_at
       ) VALUES (?, ?, ?, 'FULLY_RECEIVED', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        poNumber,
        supplierId,
        supplierRef,
        purchase.devices.length,
        purchase.devices.length,
        requiresQc ? 1 : 0,
        requiresRepair ? 1 : 0,
        notes,
        userId,
        purchaseDate,
        purchaseDate,
      ],
    );

    purchaseOrderId = insertResult.insertId;
  }

  await ensureLegacyPurchaseOrderMap(connection, legacyPurchaseId, purchaseOrderId, poNumber);

  const syncedDeviceIds = [];
  for (const device of purchase.devices) {
    const { manufacturerId, modelId } = await resolveLegacyManufacturerModel(
      connection,
      device.item_brand,
      device.item_details,
    );

    const locationId = await resolveLocationIdByCode(connection, device.tray_id);
    const grade = normalizeGrade(device.item_grade);
    const storageGb = normalizeStorageGb(device.item_gb);
    const color = sanitizeAutomationText(device.item_color);
    const receivedAt = parseSnapshotDate(
      device.received_at,
      purchase.received_at || purchaseDate,
    );
    const desiredStatus = requiresQc
      ? 'AWAITING_QC'
      : requiresRepair
        ? 'AWAITING_REPAIR'
        : 'IN_STOCK';

    const existingDevice = await loadDeviceByImeiForUpdate(connection, device.imei);
    if (existingDevice) {
      const nextStatus = existingDevice.qc_completed || existingDevice.repair_completed
        ? existingDevice.status
        : desiredStatus;

      await connection.execute(
        `UPDATE devices
         SET
           tac_code = ?,
           manufacturer_id = ?,
           model_id = ?,
           storage_gb = ?,
           color = ?,
           grade = ?,
           status = ?,
           location_id = ?,
           purchase_order_id = ?,
           supplier_id = ?,
           qc_required = ?,
           repair_required = ?,
           received_at = ?,
           updated_at = NOW()
         WHERE id = ?`,
        [
          String(device.imei).slice(0, 8),
          manufacturerId,
          modelId,
          storageGb,
          color,
          grade,
          nextStatus,
          locationId,
          purchaseOrderId,
          supplierId,
          requiresQc ? 1 : 0,
          requiresRepair ? 1 : 0,
          receivedAt,
          existingDevice.id,
        ],
      );

      syncedDeviceIds.push(existingDevice.id);
    } else {
      const [insertResult] = await connection.execute(
        `INSERT INTO devices (
           imei,
           tac_code,
           manufacturer_id,
           model_id,
           storage_gb,
           color,
           grade,
           status,
           location_id,
           purchase_order_id,
           supplier_id,
           qc_required,
           repair_required,
           received_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          device.imei,
          String(device.imei).slice(0, 8),
          manufacturerId,
          modelId,
          storageGb,
          color,
          grade,
          desiredStatus,
          locationId,
          purchaseOrderId,
          supplierId,
          requiresQc ? 1 : 0,
          requiresRepair ? 1 : 0,
          receivedAt,
        ],
      );

      syncedDeviceIds.push(insertResult.insertId);

      await logDeviceHistory(connection, {
        deviceId: insertResult.insertId,
        imei: device.imei,
        eventType: 'RECEIVED',
        referenceType: 'PURCHASE_ORDER',
        referenceId: purchaseOrderId,
        notes: `Received via ${poNumber}`,
        userId,
      });
    }
  }

  if (requiresQc) {
    await ensureQcJobForPurchase(connection, purchaseOrderId, syncedDeviceIds, userId);
  } else if (requiresRepair) {
    await ensureRepairJobForPurchase(
      connection,
      purchaseOrderId,
      syncedDeviceIds,
      userId,
      sanitizeAutomationText(purchase.fault_description),
    );
  }

  return {
    purchaseOrderId,
    poNumber,
    deviceCount: syncedDeviceIds.length,
  };
}

export async function syncLegacySalesOrderSnapshot(connection, payload, userId, legacyOrderId) {
  const order = payload.sales_order;
  const orderDate = parseSnapshotDate(
    order.order_date,
    payload.source_created_at || payload.snapshot_generated_at,
  );
  const devicesAuthoritative = sanitizeAutomationBoolean(order.devices_authoritative, false);
  const customerId = await resolveOrUpsertCustomer(connection, order.customer);
  const orderType = sanitizeAutomationBoolean(order.customer?.is_backmarket, false)
    ? 'BACKMARKET'
    : 'B2B';
  const soNumber = `LEG-SO-${legacyOrderId}`;
  const customerRef = sanitizeAutomationText(order.customer_ref);
  const poRef = sanitizeAutomationText(order.po_ref);
  const notes = sanitizeAutomationText(order.notes);

  let salesOrderId;
  const existingSalesOrder = await findLegacySalesOrder(connection, legacyOrderId);

  if (existingSalesOrder) {
    salesOrderId = existingSalesOrder.id;
    await connection.execute(
      `UPDATE sales_orders
       SET
         so_number = ?,
         customer_id = ?,
         order_type = ?,
         customer_ref = ?,
         po_ref = ?,
         notes = ?,
         status = 'CONFIRMED',
         confirmed_at = COALESCE(confirmed_at, ?),
         courier = NULL,
         tracking_number = NULL,
         total_boxes = 0,
         total_pallets = 0
       WHERE id = ?`,
      [
        soNumber,
        customerId,
        orderType,
        customerRef,
        poRef,
        notes,
        orderDate,
        salesOrderId,
      ],
    );
  } else {
    const [insertResult] = await connection.execute(
      `INSERT INTO sales_orders (
         so_number,
         customer_id,
         order_type,
         customer_ref,
         po_ref,
         notes,
         status,
         created_by,
         confirmed_at,
         created_at
       ) VALUES (?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?)`,
      [
        soNumber,
        customerId,
        orderType,
        customerRef,
        poRef,
        notes,
        userId,
        orderDate,
        orderDate,
      ],
    );

    salesOrderId = insertResult.insertId;
  }

  await ensureLegacySalesOrderMap(connection, legacyOrderId, salesOrderId, soNumber);

  const groupedLines = await buildSalesOrderLineItems(connection, order);
  const exactDevices = devicesAuthoritative
    ? await buildAuthoritativeSalesOrderDevices(connection, order, salesOrderId, legacyOrderId)
    : [];

  await connection.execute(
    'DELETE FROM sales_order_items WHERE sales_order_id = ?',
    [salesOrderId],
  );
  await connection.execute(
    'DELETE FROM sales_order_lines WHERE sales_order_id = ?',
    [salesOrderId],
  );

  for (const line of groupedLines) {
    await connection.execute(
      `INSERT INTO sales_order_lines (
         sales_order_id,
         manufacturer_id,
         model_id,
         storage_gb,
         color,
         grade,
         supplier_id,
         location_id,
         requested_quantity,
         picked_quantity
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        salesOrderId,
        line.manufacturer_id,
        line.model_id,
        line.storage_gb,
        line.color,
        line.grade,
        line.supplier_id,
        line.location_id,
        line.requested_quantity,
      ],
    );
  }

  await connection.execute(
    'UPDATE devices SET reserved_for_so_id = NULL WHERE reserved_for_so_id = ?',
    [salesOrderId],
  );
  await connection.execute(
    'DELETE FROM legacy_device_reserved_sales_order_map WHERE legacy_sales_order_id = ?',
    [legacyOrderId],
  );

  if (devicesAuthoritative) {
    await connection.execute(
      `UPDATE devices
       SET reserved_for_so_id = ?
       WHERE id IN (${exactDevices.map(() => '?').join(',')})`,
      [salesOrderId, ...exactDevices.map((device) => device.device_id)],
    );

    await connection.execute(
      `INSERT INTO legacy_device_reserved_sales_order_map (device_id, legacy_sales_order_id)
       VALUES ${exactDevices.map(() => '(?, ?)').join(', ')}`,
      exactDevices.flatMap((device) => [device.device_id, legacyOrderId]),
    );
  }

  return {
    salesOrderId,
    soNumber,
    devicesAuthoritative,
    reservedDeviceCount: exactDevices.length,
    lineCount: groupedLines.length,
  };
}

export async function syncLegacyPurchaseQcSnapshot(connection, payload, userId, legacyPurchaseId) {
  const purchase = payload.purchase;
  const existingPurchaseOrder = await findLegacyPurchaseOrder(connection, legacyPurchaseId);
  if (!existingPurchaseOrder) {
    throw new AppError(
      `No legacy-backed purchase order exists for purchase ${legacyPurchaseId}`,
      404,
      'AUTOMATION_PURCHASE_NOT_FOUND',
    );
  }

  const [purchaseRows] = await connection.execute(
    `SELECT id, requires_qc, requires_repair
     FROM purchase_orders
     WHERE id = ?
     LIMIT 1
     FOR UPDATE`,
    [existingPurchaseOrder.id],
  );

  const purchaseOrder = purchaseRows[0];
  if (!purchaseOrder) {
    throw new AppError('Purchase order not found', 404, 'PO_NOT_FOUND');
  }

  if (!purchaseOrder.requires_qc) {
    return {
      purchaseOrderId: purchaseOrder.id,
      qcJobId: null,
      completed: false,
      updatedDevices: 0,
    };
  }

  const [deviceRows] = await connection.execute(
    `SELECT id, imei, qc_required
     FROM devices
     WHERE purchase_order_id = ?`,
    [purchaseOrder.id],
  );

  const deviceByImei = new Map(deviceRows.map((row) => [row.imei, row]));
  const qcDeviceIds = deviceRows
    .filter((row) => row.qc_required)
    .map((row) => row.id);

  const qcJobId = await ensureQcJobForPurchase(connection, purchaseOrder.id, qcDeviceIds, userId);
  if (!qcJobId) {
    throw new AppError('Failed to ensure QC job exists for purchase', 500, 'AUTOMATION_QC_JOB_MISSING');
  }

  let currentRows = await qcModel.getJobResultRowsForUpdate(qcJobId, connection);
  const currentRowMap = new Map(currentRows.map((row) => [row.device_id, row]));

  let updatedDevices = 0;
  for (const device of purchase.devices) {
    const purchaseDevice = deviceByImei.get(device.imei);
    if (!purchaseDevice) {
      throw new AppError(
        `QC snapshot referenced unknown device ${device.imei}`,
        422,
        'AUTOMATION_QC_DEVICE_NOT_FOUND',
      );
    }

    if (!purchaseDevice.qc_required) {
      continue;
    }

    if (!currentRowMap.has(purchaseDevice.id)) {
      await qcModel.createPendingResult(qcJobId, purchaseDevice.id, connection);
      currentRows = await qcModel.getJobResultRowsForUpdate(qcJobId, connection);
      currentRowMap.clear();
      currentRows.forEach((row) => currentRowMap.set(row.device_id, row));
    }

    await qcModel.updateExistingResult(
      qcJobId,
      {
        device_id: purchaseDevice.id,
        functional_result: normalizeFunctionalResult(device),
        cosmetic_result: normalizeCosmeticResult(device),
        grade_assigned: normalizeGrade(device.grade_assigned ?? device.item_grade),
        color_verified: sanitizeAutomationText(device.color_verified ?? device.item_color),
        comments: sanitizeAutomationText(device.comments ?? device.item_comments),
        non_uk: normalizeNonUk(device),
      },
      currentRowMap.get(purchaseDevice.id),
      userId,
      connection,
    );
    updatedDevices += 1;
  }

  await qcModel.refreshJobMetrics(qcJobId, connection);

  let completed = false;
  if (payload.source_event_type !== 'qc.updated') {
    const refreshedRows = await qcModel.getJobResultRowsForUpdate(qcJobId, connection);
    const terminalRows = refreshedRows.filter((row) => row.functional_result);
    if (terminalRows.length === refreshedRows.length && refreshedRows.length > 0) {
      const completionResult = await completeQcJobInTransaction(
        connection,
        {
          jobId: qcJobId,
          userId,
          allowAlreadyCompleted: true,
        },
      );
      completed = !completionResult.alreadyCompleted;
    }
  }

  return {
    purchaseOrderId: purchaseOrder.id,
    qcJobId,
    completed,
    updatedDevices,
  };
}

export async function moveLegacyDeviceSnapshot(connection, payload, userId, imei) {
  const movePlan = await prepareLocationMove(
    connection,
    {
      imeis: [imei],
      newLocationCode: payload.new_location,
    },
  );

  await applyPreparedLocationMove(
    connection,
    {
      movePlan,
      userId,
      referenceType: 'AUTOMATION',
      referenceId: null,
      notes: sanitizeAutomationText(payload.reason) || 'Quantum automation stock move',
    },
  );

  const movedDevice = movePlan.devices[0];
  await logActivity(connection, {
    action: 'AUTOMATION_DEVICE_MOVED',
    entityType: 'DEVICE',
    entityId: movedDevice.deviceId,
    imei: movedDevice.imei,
    details: {
      admin_op_id: payload.admin_op_id || null,
      old_location: sanitizeAutomationText(payload.old_location) || movedDevice.oldLocation || null,
      new_location: payload.new_location,
      reason: sanitizeAutomationText(payload.reason),
      operation_date: sanitizeAutomationText(payload.operation_date),
    },
    userId,
  });

  return {
    deviceId: movedDevice.deviceId,
    imei: movedDevice.imei,
    oldLocation: movedDevice.oldLocation,
    newLocation: movePlan.newLocationCode,
  };
}
