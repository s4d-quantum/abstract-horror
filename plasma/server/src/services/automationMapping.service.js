import { AppError } from '../utils/helpers.js';

function sanitizeNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function canonicalizeModelLookupValue(value) {
  const normalized = sanitizeNullableString(value);
  if (!normalized) {
    return null;
  }

  const exact = normalized.toUpperCase();
  const compact = exact.replace(/\s+/g, '');
  const stripped = compact.replace(/-/g, '');
  const samsungNormalized = stripped.startsWith('SM') ? stripped.slice(2) : stripped;
  const nameNormalized = exact.replace(/[^A-Z0-9]+/g, '');

  return {
    exact,
    compact,
    stripped,
    samsungNormalized,
    nameNormalized,
  };
}

function doesModelMatchLookup(model, lookup) {
  if (!lookup) {
    return false;
  }

  const number = canonicalizeModelLookupValue(model.model_number);
  const name = canonicalizeModelLookupValue(model.model_name);

  const numberMatch = number && (
    number.exact === lookup.exact
    || number.compact === lookup.compact
    || number.stripped === lookup.stripped
    || number.samsungNormalized === lookup.samsungNormalized
  );

  const nameMatch = name && (
    name.exact === lookup.exact
    || name.compact === lookup.compact
    || name.nameNormalized === lookup.nameNormalized
  );

  return Boolean(numberMatch || nameMatch);
}

function sanitizeBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') {
    return true;
  }
  if (normalized === 'false' || normalized === '0') {
    return false;
  }

  return defaultValue;
}

export function normalizeGrade(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = String(value).trim().toUpperCase();
  if (!normalized || normalized === '0') {
    return null;
  }

  const gradeMap = {
    '1': 'A',
    '2': 'B',
    '3': 'C',
    '4': 'D',
    '5': 'E',
    '6': 'F',
    A: 'A',
    B: 'B',
    C: 'C',
    D: 'D',
    E: 'E',
    F: 'F',
  };

  return gradeMap[normalized] || null;
}

export function normalizeStorageGb(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = parseInt(String(value).trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function resolveLocationIdByCode(connection, locationCode, { required = true } = {}) {
  const normalizedCode = sanitizeNullableString(locationCode);
  if (!normalizedCode) {
    if (required) {
      throw new AppError('Location code is required', 400, 'AUTOMATION_LOCATION_REQUIRED');
    }
    return null;
  }

  const [rows] = await connection.execute(
    `SELECT id, code, is_active
     FROM locations
     WHERE code = ?
     LIMIT 1`,
    [normalizedCode],
  );

  if (rows.length === 0) {
    if (required) {
      throw new AppError(
        `Location ${normalizedCode} is not mapped in Plasma`,
        422,
        'AUTOMATION_LOCATION_NOT_FOUND',
      );
    }
    return null;
  }

  if (!rows[0].is_active) {
    throw new AppError(
      `Location ${normalizedCode} is inactive in Plasma`,
      409,
      'AUTOMATION_LOCATION_INACTIVE',
    );
  }

  return rows[0].id;
}

export async function resolveOrUpsertSupplier(connection, supplier) {
  const supplierCode = sanitizeNullableString(supplier?.supplier_code);
  const supplierName = sanitizeNullableString(supplier?.name);

  if (!supplierCode || !supplierName) {
    throw new AppError(
      'Supplier payload must include supplier_code and name',
      400,
      'AUTOMATION_SUPPLIER_INVALID',
    );
  }

  const values = {
    supplier_code: supplierCode,
    name: supplierName,
    address_line1: sanitizeNullableString(supplier.address_line1),
    address_line2: sanitizeNullableString(supplier.address_line2),
    city: sanitizeNullableString(supplier.city),
    postcode: sanitizeNullableString(supplier.postcode),
    country: sanitizeNullableString(supplier.country) || 'United Kingdom',
    phone: sanitizeNullableString(supplier.phone),
    email: sanitizeNullableString(supplier.email),
    vat_number: sanitizeNullableString(supplier.vat_number),
  };

  const [existingRows] = await connection.execute(
    `SELECT id
     FROM suppliers
     WHERE supplier_code = ?
     LIMIT 1`,
    [supplierCode],
  );

  if (existingRows.length > 0) {
    await connection.execute(
      `UPDATE suppliers
       SET
         name = ?,
         address_line1 = ?,
         address_line2 = ?,
         city = ?,
         postcode = ?,
         country = ?,
         phone = ?,
         email = ?,
         vat_number = ?,
         is_active = TRUE
       WHERE id = ?`,
      [
        values.name,
        values.address_line1,
        values.address_line2,
        values.city,
        values.postcode,
        values.country,
        values.phone,
        values.email,
        values.vat_number,
        existingRows[0].id,
      ],
    );

    return existingRows[0].id;
  }

  const [result] = await connection.execute(
    `INSERT INTO suppliers (
       supplier_code,
       name,
       address_line1,
       address_line2,
       city,
       postcode,
       country,
       phone,
       email,
       vat_number,
       is_active
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
    [
      values.supplier_code,
      values.name,
      values.address_line1,
      values.address_line2,
      values.city,
      values.postcode,
      values.country,
      values.phone,
      values.email,
      values.vat_number,
    ],
  );

  return result.insertId;
}

export async function resolveOrUpsertCustomer(connection, customer) {
  const customerCode = sanitizeNullableString(customer?.customer_code);
  const customerName = sanitizeNullableString(customer?.name);

  if (!customerCode || !customerName) {
    throw new AppError(
      'Customer payload must include customer_code and name',
      400,
      'AUTOMATION_CUSTOMER_INVALID',
    );
  }

  const values = {
    customer_code: customerCode,
    name: customerName,
    address_line1: sanitizeNullableString(customer.address_line1),
    address_line2: sanitizeNullableString(customer.address_line2),
    city: sanitizeNullableString(customer.city),
    postcode: sanitizeNullableString(customer.postcode),
    country: sanitizeNullableString(customer.country) || 'United Kingdom',
    phone: sanitizeNullableString(customer.phone),
    email: sanitizeNullableString(customer.email),
    vat_number: sanitizeNullableString(customer.vat_number),
    is_backmarket: sanitizeBoolean(customer.is_backmarket, false),
  };

  const [existingRows] = await connection.execute(
    `SELECT id
     FROM customers
     WHERE customer_code = ?
     LIMIT 1`,
    [customerCode],
  );

  if (existingRows.length > 0) {
    await connection.execute(
      `UPDATE customers
       SET
         name = ?,
         address_line1 = ?,
         address_line2 = ?,
         city = ?,
         postcode = ?,
         country = ?,
         phone = ?,
         email = ?,
         vat_number = ?,
         is_backmarket = ?,
         is_active = TRUE
       WHERE id = ?`,
      [
        values.name,
        values.address_line1,
        values.address_line2,
        values.city,
        values.postcode,
        values.country,
        values.phone,
        values.email,
        values.vat_number,
        values.is_backmarket ? 1 : 0,
        existingRows[0].id,
      ],
    );

    return existingRows[0].id;
  }

  const [result] = await connection.execute(
    `INSERT INTO customers (
       customer_code,
       name,
       address_line1,
       address_line2,
       city,
       postcode,
       country,
       phone,
       email,
       vat_number,
       is_backmarket,
       is_active
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
    [
      values.customer_code,
      values.name,
      values.address_line1,
      values.address_line2,
      values.city,
      values.postcode,
      values.country,
      values.phone,
      values.email,
      values.vat_number,
      values.is_backmarket ? 1 : 0,
    ],
  );

  return result.insertId;
}

export async function resolveLegacyManufacturerModel(connection, legacyBrand, legacyDetails) {
  const normalizedBrand = sanitizeNullableString(legacyBrand);
  const normalizedDetails = sanitizeNullableString(legacyDetails);

  if (!normalizedBrand || !normalizedDetails) {
    throw new AppError(
      'Device mapping requires both item_brand and item_details',
      422,
      'AUTOMATION_MODEL_MAPPING_MISSING_INPUT',
    );
  }

  const [rows] = await connection.execute(
    `SELECT
       lsm.manufacturer_id,
       lsm.model_id
     FROM legacy_sales_model_map lsm
     WHERE lsm.legacy_item_brand = ?
       AND lsm.legacy_item_details = ?
     LIMIT 1`,
    [normalizedBrand, normalizedDetails],
  );

  if (rows.length === 0) {
    const [brandMapRows] = await connection.execute(
      `SELECT manufacturer_id
       FROM legacy_sales_brand_map
       WHERE legacy_item_brand = ?
       LIMIT 1`,
      [normalizedBrand],
    );

    let manufacturerId = brandMapRows[0]?.manufacturer_id || null;

    if (!manufacturerId) {
      const [legacyBrandRows] = await connection.execute(
        `SELECT m.id
         FROM legacy_brand_map lbm
         JOIN manufacturers m
           ON UPPER(m.name) = UPPER(lbm.manufacturer_name)
           OR UPPER(m.code) = UPPER(lbm.manufacturer_name)
         WHERE lbm.legacy_item_brand = ?`,
        [normalizedBrand],
      );

      if (legacyBrandRows.length > 1) {
        throw new AppError(
          `Legacy brand ${normalizedBrand} matches multiple manufacturers in Plasma`,
          422,
          'AUTOMATION_BRAND_MAPPING_AMBIGUOUS',
        );
      }

      manufacturerId = legacyBrandRows[0]?.id || null;
    }

    if (!manufacturerId) {
      throw new AppError(
        `No Plasma manufacturer mapping exists for ${normalizedBrand}`,
        422,
        'AUTOMATION_BRAND_MAPPING_NOT_FOUND',
      );
    }

    const [modelRows] = await connection.execute(
      `SELECT id, model_number, model_name
       FROM models
       WHERE manufacturer_id = ?`,
      [manufacturerId],
    );

    const lookup = canonicalizeModelLookupValue(normalizedDetails);
    const matchingModels = modelRows.filter((row) => doesModelMatchLookup(row, lookup));

    if (matchingModels.length === 1) {
      return {
        manufacturerId,
        modelId: matchingModels[0].id,
      };
    }

    if (matchingModels.length > 1) {
      throw new AppError(
        `Legacy model ${normalizedBrand} / ${normalizedDetails} is ambiguous in Plasma`,
        422,
        'AUTOMATION_MODEL_MAPPING_AMBIGUOUS',
      );
    }

    throw new AppError(
      `No Plasma model mapping exists for ${normalizedBrand} / ${normalizedDetails}`,
      422,
      'AUTOMATION_MODEL_MAPPING_NOT_FOUND',
    );
  }

  return {
    manufacturerId: rows[0].manufacturer_id,
    modelId: rows[0].model_id,
  };
}

export async function findLegacyPurchaseOrder(connection, legacyPurchaseId) {
  const [rows] = await connection.execute(
    `SELECT
       po.id,
       po.po_number
     FROM legacy_purchase_order_map lpom
     JOIN purchase_orders po ON po.id = lpom.purchase_order_id
     WHERE lpom.legacy_purchase_id = ?
     LIMIT 1`,
    [legacyPurchaseId],
  );

  if (rows.length > 0) {
    return rows[0];
  }

  const [fallbackRows] = await connection.execute(
    `SELECT id, po_number
     FROM purchase_orders
     WHERE po_number = ?
     LIMIT 1`,
    [`LEG-${legacyPurchaseId}`],
  );

  return fallbackRows[0] || null;
}

export async function ensureLegacyPurchaseOrderMap(connection, legacyPurchaseId, purchaseOrderId, poNumber) {
  await connection.execute(
    `INSERT INTO legacy_purchase_order_map (legacy_purchase_id, purchase_order_id, po_number)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       purchase_order_id = VALUES(purchase_order_id),
       po_number = VALUES(po_number)`,
    [legacyPurchaseId, purchaseOrderId, poNumber],
  );
}

export async function findLegacySalesOrder(connection, legacyOrderId) {
  const [rows] = await connection.execute(
    `SELECT
       so.id,
       so.so_number
     FROM legacy_sales_order_map lsom
     JOIN sales_orders so ON so.id = lsom.sales_order_id
     WHERE lsom.legacy_order_id = ?
     LIMIT 1`,
    [legacyOrderId],
  );

  if (rows.length > 0) {
    return rows[0];
  }

  const [fallbackRows] = await connection.execute(
    `SELECT id, so_number
     FROM sales_orders
     WHERE so_number = ?
     LIMIT 1`,
    [`LEG-SO-${legacyOrderId}`],
  );

  return fallbackRows[0] || null;
}

export async function ensureLegacySalesOrderMap(connection, legacyOrderId, salesOrderId, soNumber) {
  await connection.execute(
    `INSERT INTO legacy_sales_order_map (legacy_order_id, sales_order_id, so_number)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       sales_order_id = VALUES(sales_order_id),
       so_number = VALUES(so_number)`,
    [legacyOrderId, salesOrderId, soNumber],
  );
}

export function groupSalesOrderDevices(devices) {
  const groups = new Map();

  for (const device of devices) {
    const key = [
      device.supplier_id || '',
      device.manufacturer_id,
      device.model_id,
      device.storage_gb || '',
      device.color || '',
      device.grade || '',
      device.location_id || '',
    ].join('|');

    if (!groups.has(key)) {
      groups.set(key, {
        supplier_id: device.supplier_id || null,
        manufacturer_id: device.manufacturer_id,
        model_id: device.model_id,
        storage_gb: device.storage_gb || null,
        color: device.color || null,
        grade: device.grade || null,
        location_id: device.location_id || null,
        requested_quantity: 0,
        device_ids: [],
      });
    }

    const group = groups.get(key);
    group.requested_quantity += 1;
    group.device_ids.push(device.device_id);
  }

  return Array.from(groups.values());
}

export function sanitizeAutomationText(value) {
  return sanitizeNullableString(value);
}

export function sanitizeAutomationBoolean(value, defaultValue = false) {
  return sanitizeBoolean(value, defaultValue);
}
