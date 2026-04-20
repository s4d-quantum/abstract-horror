import { AppError } from '../utils/helpers.js';

const PURCHASE_HEADER_SQL = `
  SELECT
    p.purchase_id,
    p.user_id,
    p.date,
    p.po_ref,
    p.supplier_id,
    p.qc_required,
    p.repair_required,
    p.report_comment,
    s.supplier_id AS supplier_code,
    s.name AS supplier_name,
    s.address AS address_line1,
    s.address2 AS address_line2,
    s.city,
    s.postcode,
    s.country,
    s.phone,
    s.email,
    s.vat AS vat_number
  FROM tbl_purchases p
  LEFT JOIN tbl_suppliers s
    ON s.supplier_id = p.supplier_id
  WHERE p.purchase_id = ?
  ORDER BY p.id
  LIMIT 1
`;

const PURCHASE_DEVICES_SQL = `
  SELECT
    i.purchase_id,
    i.item_imei,
    i.item_tac,
    i.item_color,
    i.item_grade,
    i.item_gb,
    i.created_at,
    p.tray_id,
    t.item_brand,
    t.item_details
  FROM tbl_imei i
  LEFT JOIN tbl_tac t
    ON t.item_tac = i.item_tac
  LEFT JOIN tbl_purchases p
    ON p.purchase_id = i.purchase_id
   AND p.item_imei = i.item_imei
  WHERE i.purchase_id = ?
  ORDER BY i.id
`;

const QC_ROWS_SQL = `
  SELECT
    q.purchase_id,
    q.item_code,
    q.item_comments,
    q.item_cosmetic_passed,
    q.item_functional_passed,
    q.item_eu,
    q.item_flashed,
    q.user_id,
    i.item_imei,
    i.item_color,
    i.item_grade,
    t.item_brand,
    t.item_details
  FROM tbl_qc_imei_products q
  LEFT JOIN tbl_imei i
    ON i.item_imei = q.item_code
   AND i.purchase_id = q.purchase_id
  LEFT JOIN tbl_tac t
    ON t.item_tac = i.item_tac
  WHERE q.purchase_id = ?
  ORDER BY q.id
`;

const SALES_ORDER_ROWS_SQL = `
  SELECT
    so.order_id,
    so.date,
    so.customer_id,
    so.supplier_id,
    so.item_brand,
    so.item_details,
    so.item_color,
    so.item_grade,
    so.item_gb,
    so.tray_id,
    so.po_ref,
    so.customer_ref,
    so.item_code,
    c.customer_id AS customer_code,
    c.name AS customer_name,
    c.address AS customer_address_line1,
    c.address2 AS customer_address_line2,
    c.city AS customer_city,
    c.postcode AS customer_postcode,
    c.country AS customer_country,
    c.phone AS customer_phone,
    c.email AS customer_email,
    c.vat AS customer_vat_number,
    s.supplier_id AS supplier_code,
    s.name AS supplier_name,
    s.address AS supplier_address_line1,
    s.address2 AS supplier_address_line2,
    s.city AS supplier_city,
    s.postcode AS supplier_postcode,
    s.country AS supplier_country,
    s.phone AS supplier_phone,
    s.email AS supplier_email,
    s.vat AS supplier_vat_number
  FROM tbl_imei_sales_orders so
  LEFT JOIN tbl_customers c
    ON c.customer_id = so.customer_id
  LEFT JOIN tbl_suppliers s
    ON s.supplier_id = so.supplier_id
  WHERE so.order_id = ?
  ORDER BY so.id
`;

export class QuantumSnapshotError extends Error {
  constructor(message, code = 'QUANTUM_SNAPSHOT_ERROR') {
    super(message);
    this.code = code;
    this.permanent = true;
  }
}

function sanitizeNullableText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function normalizeIsoTimestamp(value) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function normalizeIsoDate(value) {
  const normalized = sanitizeNullableText(value);
  if (!normalized) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized}T00:00:00.000Z`;
  }

  return normalizeIsoTimestamp(normalized);
}

function normalizeBooleanFlag(value, defaultValue = false) {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  if (value === true || value === false) {
    return value;
  }

  if (value === 1 || value === '1') {
    return true;
  }

  if (value === 0 || value === '0') {
    return false;
  }

  return defaultValue;
}

function requireValue(value, message, code) {
  const normalized = sanitizeNullableText(value);
  if (!normalized) {
    throw new QuantumSnapshotError(message, code);
  }

  return normalized;
}

function buildAutomationEnvelope(group, snapshotGeneratedAt) {
  return {
    quantum_event_id: String(group.maxOutboxId),
    idempotency_key: requireValue(
      group.latestRow.idempotency_key,
      `Outbox row ${group.maxOutboxId} is missing idempotency_key`,
      'QUANTUM_OUTBOX_IDEMPOTENCY_KEY_MISSING',
    ),
    source_event_type: group.latestRow.event_type,
    source_created_at: normalizeIsoTimestamp(group.latestRow.created_at),
    source_user: sanitizeNullableText(group.latestRow.source_user),
    snapshot_generated_at: normalizeIsoTimestamp(snapshotGeneratedAt) || new Date().toISOString(),
  };
}

function buildSupplierSnapshot(row, prefix = '') {
  const supplierCode = sanitizeNullableText(row[`${prefix}supplier_code`] ?? row.supplier_code);
  const supplierName = sanitizeNullableText(row[`${prefix}supplier_name`] ?? row.supplier_name);

  if (!supplierCode || !supplierName) {
    return null;
  }

  return {
    supplier_code: supplierCode,
    name: supplierName,
    address_line1: sanitizeNullableText(row[`${prefix}address_line1`] ?? row.address_line1),
    address_line2: sanitizeNullableText(row[`${prefix}address_line2`] ?? row.address_line2),
    city: sanitizeNullableText(row[`${prefix}city`] ?? row.city),
    postcode: sanitizeNullableText(row[`${prefix}postcode`] ?? row.postcode),
    country: sanitizeNullableText(row[`${prefix}country`] ?? row.country),
    phone: sanitizeNullableText(row[`${prefix}phone`] ?? row.phone),
    email: sanitizeNullableText(row[`${prefix}email`] ?? row.email),
    vat_number: sanitizeNullableText(row[`${prefix}vat_number`] ?? row.vat_number),
  };
}

function buildCustomerSnapshot(row) {
  const customerCode = requireValue(
    row.customer_code,
    `Customer row is missing customer_code for sales order ${row.order_id}`,
    'QUANTUM_CUSTOMER_CODE_MISSING',
  );
  const customerName = requireValue(
    row.customer_name,
    `Customer row is missing name for sales order ${row.order_id}`,
    'QUANTUM_CUSTOMER_NAME_MISSING',
  );

  return {
    customer_code: customerCode,
    name: customerName,
    is_backmarket: false,
    address_line1: sanitizeNullableText(row.customer_address_line1),
    address_line2: sanitizeNullableText(row.customer_address_line2),
    city: sanitizeNullableText(row.customer_city),
    postcode: sanitizeNullableText(row.customer_postcode),
    country: sanitizeNullableText(row.customer_country),
    phone: sanitizeNullableText(row.customer_phone),
    email: sanitizeNullableText(row.customer_email),
    vat_number: sanitizeNullableText(row.customer_vat_number),
  };
}

function groupSalesOrderLines(rows, legacyOrderId) {
  const groupedLines = new Map();

  for (const row of rows) {
    const supplierCode = requireValue(
      row.supplier_id || row.supplier_code,
      `Sales order ${legacyOrderId} line is missing supplier_id`,
      'QUANTUM_SALES_ORDER_SUPPLIER_MISSING',
    );
    const trayId = requireValue(
      row.tray_id,
      `Sales order ${legacyOrderId} line is missing tray_id`,
      'QUANTUM_SALES_ORDER_TRAY_MISSING',
    );
    const itemBrand = requireValue(
      row.item_brand,
      `Sales order ${legacyOrderId} line is missing item_brand`,
      'QUANTUM_SALES_ORDER_BRAND_MISSING',
    );
    const itemDetails = requireValue(
      row.item_details,
      `Sales order ${legacyOrderId} line is missing item_details`,
      'QUANTUM_SALES_ORDER_DETAILS_MISSING',
    );

    const supplier = buildSupplierSnapshot(row, 'supplier_');
    const key = [
      supplierCode,
      trayId,
      itemBrand,
      itemDetails,
      sanitizeNullableText(row.item_gb) || '',
      sanitizeNullableText(row.item_color) || '',
      sanitizeNullableText(row.item_grade) || '',
    ].join('|');

    if (!groupedLines.has(key)) {
      groupedLines.set(key, {
        supplier_code: supplierCode,
        tray_id: trayId,
        item_brand: itemBrand,
        item_details: itemDetails,
        item_gb: sanitizeNullableText(row.item_gb),
        item_color: sanitizeNullableText(row.item_color),
        item_grade: sanitizeNullableText(row.item_grade),
        requested_quantity: 0,
        ...(supplier ? { supplier } : {}),
      });
    }

    groupedLines.get(key).requested_quantity += 1;
  }

  return Array.from(groupedLines.values());
}

export async function buildPurchaseSyncRequest(quantumConnection, group, snapshotGeneratedAt = new Date()) {
  const legacyPurchaseId = String(group.entityId);
  const [headerRows] = await quantumConnection.execute(PURCHASE_HEADER_SQL, [legacyPurchaseId]);

  if (!headerRows.length) {
    throw new QuantumSnapshotError(
      `Purchase ${legacyPurchaseId} was not found in Quantum`,
      'QUANTUM_PURCHASE_NOT_FOUND',
    );
  }

  const header = headerRows[0];
  const supplier = buildSupplierSnapshot(header);
  if (!supplier) {
    throw new QuantumSnapshotError(
      `Purchase ${legacyPurchaseId} is missing supplier data in Quantum`,
      'QUANTUM_PURCHASE_SUPPLIER_MISSING',
    );
  }

  const [deviceRows] = await quantumConnection.execute(PURCHASE_DEVICES_SQL, [legacyPurchaseId]);
  if (!deviceRows.length) {
    throw new QuantumSnapshotError(
      `Purchase ${legacyPurchaseId} has no current devices in Quantum`,
      'QUANTUM_PURCHASE_DEVICES_MISSING',
    );
  }

  const devices = deviceRows.map((row) => ({
    imei: requireValue(
      row.item_imei,
      `Purchase ${legacyPurchaseId} has a device row without item_imei`,
      'QUANTUM_PURCHASE_DEVICE_IMEI_MISSING',
    ),
    tray_id: requireValue(
      row.tray_id,
      `Purchase ${legacyPurchaseId} device ${row.item_imei || '(unknown)'} is missing tray_id`,
      'QUANTUM_PURCHASE_DEVICE_TRAY_MISSING',
    ),
    item_brand: requireValue(
      row.item_brand,
      `Purchase ${legacyPurchaseId} device ${row.item_imei || '(unknown)'} is missing item_brand`,
      'QUANTUM_PURCHASE_DEVICE_BRAND_MISSING',
    ),
    item_details: requireValue(
      row.item_details,
      `Purchase ${legacyPurchaseId} device ${row.item_imei || '(unknown)'} is missing item_details`,
      'QUANTUM_PURCHASE_DEVICE_DETAILS_MISSING',
    ),
    item_gb: sanitizeNullableText(row.item_gb),
    item_color: sanitizeNullableText(row.item_color),
    item_grade: row.item_grade,
    received_at: normalizeIsoTimestamp(row.created_at),
  }));

  return {
    groupType: group.groupType,
    entityType: group.entityType,
    entityId: legacyPurchaseId,
    path: `/api/automation/purchases/${legacyPurchaseId}/sync`,
    payload: {
      ...buildAutomationEnvelope(group, snapshotGeneratedAt),
      purchase: {
        purchase_date: normalizeIsoDate(header.date),
        po_ref: sanitizeNullableText(header.po_ref),
        requires_qc: normalizeBooleanFlag(header.qc_required, false),
        requires_repair: normalizeBooleanFlag(header.repair_required, false),
        notes: sanitizeNullableText(header.report_comment),
        supplier,
        devices,
      },
    },
  };
}

export async function buildPurchaseQcSyncRequest(quantumConnection, group, snapshotGeneratedAt = new Date()) {
  const legacyPurchaseId = String(group.entityId);
  const [rows] = await quantumConnection.execute(QC_ROWS_SQL, [legacyPurchaseId]);

  if (!rows.length) {
    throw new QuantumSnapshotError(
      `Purchase ${legacyPurchaseId} has no QC rows in Quantum`,
      'QUANTUM_QC_ROWS_MISSING',
    );
  }

  const devices = rows.map((row) => ({
    imei: requireValue(
      row.item_imei || row.item_code,
      `QC row for purchase ${legacyPurchaseId} is missing item_code/item_imei`,
      'QUANTUM_QC_IMEI_MISSING',
    ),
    item_grade: row.item_grade,
    item_color: sanitizeNullableText(row.item_color),
    item_comments: sanitizeNullableText(row.item_comments),
    item_functional_passed: row.item_functional_passed,
    item_cosmetic_passed: row.item_cosmetic_passed,
    item_eu: sanitizeNullableText(row.item_eu),
    item_flashed: row.item_flashed,
  }));

  return {
    groupType: group.groupType,
    entityType: group.entityType,
    entityId: legacyPurchaseId,
    path: `/api/automation/qc/purchases/${legacyPurchaseId}/sync`,
    payload: {
      ...buildAutomationEnvelope(group, snapshotGeneratedAt),
      purchase: {
        devices,
      },
    },
  };
}

export async function buildSalesOrderSyncRequest(quantumConnection, group, snapshotGeneratedAt = new Date()) {
  const legacyOrderId = String(group.entityId);
  const [rows] = await quantumConnection.execute(SALES_ORDER_ROWS_SQL, [legacyOrderId]);

  if (!rows.length) {
    throw new QuantumSnapshotError(
      `Sales order ${legacyOrderId} was not found in Quantum`,
      'QUANTUM_SALES_ORDER_NOT_FOUND',
    );
  }

  const header = rows[0];
  const lines = groupSalesOrderLines(rows, legacyOrderId);

  return {
    groupType: group.groupType,
    entityType: group.entityType,
    entityId: legacyOrderId,
    path: `/api/automation/sales-orders/${legacyOrderId}/sync`,
    payload: {
      ...buildAutomationEnvelope(group, snapshotGeneratedAt),
      sales_order: {
        order_date: normalizeIsoTimestamp(header.date),
        customer_ref: sanitizeNullableText(header.customer_ref),
        po_ref: sanitizeNullableText(header.po_ref),
        devices_authoritative: false,
        customer: buildCustomerSnapshot(header),
        lines,
        devices: [],
      },
    },
  };
}

export function buildMoveSyncRequest(group, snapshotGeneratedAt = new Date()) {
  const payload = group.latestPayload || {};
  const imei = requireValue(
    payload.imei || group.entityId,
    `Move outbox row ${group.maxOutboxId} is missing imei`,
    'QUANTUM_MOVE_IMEI_MISSING',
  );
  const newLocation = requireValue(
    payload.new_tray_id,
    `Move outbox row ${group.maxOutboxId} is missing new_tray_id`,
    'QUANTUM_MOVE_NEW_LOCATION_MISSING',
  );

  return {
    groupType: group.groupType,
    entityType: group.entityType,
    entityId: imei,
    path: `/api/automation/devices/${imei}/move`,
    payload: {
      ...buildAutomationEnvelope(group, snapshotGeneratedAt),
      new_location: newLocation,
      old_location: sanitizeNullableText(payload.old_tray_id),
      reason: sanitizeNullableText(payload.reason)
        || sanitizeNullableText(payload.operation)
        || 'quantum_stock_move',
      operation_date: sanitizeNullableText(payload.operation_date),
      admin_op_id: sanitizeNullableText(payload.admin_op_id),
    },
  };
}

export async function buildAutomationRequestForGroup(quantumConnection, group, snapshotGeneratedAt = new Date()) {
  switch (group.groupType) {
    case 'purchase':
      return buildPurchaseSyncRequest(quantumConnection, group, snapshotGeneratedAt);
    case 'qc':
      return buildPurchaseQcSyncRequest(quantumConnection, group, snapshotGeneratedAt);
    case 'sales_order':
      return buildSalesOrderSyncRequest(quantumConnection, group, snapshotGeneratedAt);
    case 'move':
      return buildMoveSyncRequest(group, snapshotGeneratedAt);
    default:
      throw new AppError(`Unsupported poller group type ${group.groupType}`, 400, 'QUANTUM_POLLER_GROUP_UNSUPPORTED');
  }
}
