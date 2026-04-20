import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import { KNOWN_LEGACY_BRAND_OVERRIDES } from './automationSchema.service.js';

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

function looksLikeModelCode(value) {
  const normalized = sanitizeNullableString(value);
  if (!normalized) {
    return false;
  }

  if (/^[A-Z0-9/-]{3,}$/i.test(normalized) && /[0-9]/.test(normalized)) {
    return true;
  }

  return false;
}

function truncateWithHash(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  const hash = crypto.createHash('sha1').update(value).digest('hex').slice(0, 8);
  return `${value.slice(0, maxLength - 9)}-${hash}`;
}

function buildManufacturerCode(name, usedCodes) {
  const normalized = sanitizeNullableString(name) || 'Manufacturer';
  let base = normalized
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!base) {
    base = 'MFR';
  }

  if (/^\d+$/.test(base)) {
    base = `MFR_${base}`;
  }

  base = truncateWithHash(base, 20);

  let candidate = base;
  let suffix = 2;
  while (usedCodes.has(candidate)) {
    const suffixText = `_${suffix}`;
    candidate = truncateWithHash(base, 20 - suffixText.length) + suffixText;
    suffix += 1;
  }

  usedCodes.add(candidate);
  return candidate;
}

function buildModelRecord(itemDetails) {
  const normalized = sanitizeNullableString(itemDetails);
  if (!normalized) {
    throw new Error('itemDetails is required to build a model record');
  }

  if (looksLikeModelCode(normalized)) {
    return {
      model_number: truncateWithHash(normalized.toUpperCase(), 50),
      model_name: null,
    };
  }

  return {
    model_number: truncateWithHash(normalized, 50),
    model_name: truncateWithHash(normalized, 100),
  };
}

function createPlasmaConfig(env) {
  return {
    host: env.PLASMA_DB_HOST || env.TEST_DB_HOST || env.DB_HOST || 'localhost',
    port: parseInt(env.PLASMA_DB_PORT || env.TEST_DB_PORT || env.DB_PORT || '3306', 10),
    user: env.PLASMA_DB_USER || env.TEST_DB_USER || env.DB_USER,
    password: env.PLASMA_DB_PASSWORD || env.TEST_DB_PASSWORD || env.DB_PASSWORD,
    database: env.PLASMA_DB_NAME || env.PLASMA_TEST_DB_NAME || env.TEST_DB_NAME || env.DB_NAME,
  };
}

function createQuantumConfig(env) {
  return {
    host: env.QUANTUM_DB_HOST || env.QUANTUM_TEST_DB_HOST,
    port: parseInt(env.QUANTUM_DB_PORT || env.QUANTUM_TEST_DB_PORT || '3306', 10),
    user: env.QUANTUM_DB_USER || env.QUANTUM_TEST_DB_USER,
    password: env.QUANTUM_DB_PASSWORD || env.QUANTUM_TEST_DB_PASSWORD,
    database: env.QUANTUM_DB_NAME || env.QUANTUM_TEST_DB_NAME || 's4d_england_db',
  };
}

async function fetchQuantumCoverage(quantumConnection) {
  const [rows] = await quantumConnection.execute(
    `SELECT
       src.item_brand,
       src.item_details,
       SUM(src.usage_count) AS usage_count
     FROM (
       SELECT t.item_brand, t.item_details, COUNT(*) AS usage_count
       FROM tbl_tac t
       WHERE t.item_brand IS NOT NULL
         AND t.item_details IS NOT NULL
         AND TRIM(t.item_details) <> ''
       GROUP BY t.item_brand, t.item_details

       UNION ALL

       SELECT so.item_brand, so.item_details, COUNT(*) AS usage_count
       FROM tbl_imei_sales_orders so
       WHERE so.item_brand IS NOT NULL
         AND so.item_details IS NOT NULL
         AND TRIM(so.item_details) <> ''
       GROUP BY so.item_brand, so.item_details
     ) src
     GROUP BY src.item_brand, src.item_details
     ORDER BY usage_count DESC, src.item_brand, src.item_details`,
  );

  return rows.map((row) => ({
    item_brand: sanitizeNullableString(row.item_brand),
    item_details: sanitizeNullableString(row.item_details),
    usage_count: Number(row.usage_count || 0),
  }));
}

async function fetchPlasmaState(plasmaConnection) {
  const [brandRows] = await plasmaConnection.execute(
    `SELECT legacy_item_brand, manufacturer_name
     FROM legacy_brand_map`,
  );
  const [legacyBrandRows] = await plasmaConnection.execute(
    `SELECT legacy_item_brand, manufacturer_id
     FROM legacy_sales_brand_map`,
  );
  const [manufacturerRows] = await plasmaConnection.execute(
    `SELECT id, code, name
     FROM manufacturers`,
  );
  const [modelRows] = await plasmaConnection.execute(
    `SELECT id, manufacturer_id, model_number, model_name
     FROM models`,
  );
  const [legacyModelRows] = await plasmaConnection.execute(
    `SELECT legacy_item_brand, legacy_item_details, manufacturer_id, model_id
     FROM legacy_sales_model_map`,
  );

  return {
    legacyBrandMap: brandRows,
    legacySalesBrandMap: legacyBrandRows,
    manufacturers: manufacturerRows,
    models: modelRows,
    legacySalesModelMap: legacyModelRows,
  };
}

async function ensureKnownLegacyBrandOverrides(connection) {
  if (!KNOWN_LEGACY_BRAND_OVERRIDES.length) {
    return;
  }

  await connection.execute(
    `INSERT INTO legacy_brand_map (legacy_item_brand, manufacturer_name)
     VALUES ${KNOWN_LEGACY_BRAND_OVERRIDES.map(() => '(?, ?)').join(', ')}
     ON DUPLICATE KEY UPDATE
       manufacturer_name = VALUES(manufacturer_name)`,
    KNOWN_LEGACY_BRAND_OVERRIDES.flat(),
  );
}

function createStateIndexes(state) {
  const brandNameByCode = new Map();
  for (const row of state.legacyBrandMap) {
    brandNameByCode.set(row.legacy_item_brand, row.manufacturer_name);
  }

  const manufacturerByLowerName = new Map();
  const manufacturerByUpperCode = new Map();
  const usedManufacturerCodes = new Set();
  for (const row of state.manufacturers) {
    manufacturerByLowerName.set(String(row.name).toLowerCase(), row);
    manufacturerByUpperCode.set(String(row.code).toUpperCase(), row);
    usedManufacturerCodes.add(String(row.code).toUpperCase());
  }

  const modelsByManufacturerId = new Map();
  for (const row of state.models) {
    if (!modelsByManufacturerId.has(row.manufacturer_id)) {
      modelsByManufacturerId.set(row.manufacturer_id, []);
    }
    modelsByManufacturerId.get(row.manufacturer_id).push(row);
  }

  const legacyBrandByCode = new Map();
  for (const row of state.legacySalesBrandMap) {
    legacyBrandByCode.set(row.legacy_item_brand, row);
  }

  const legacyModelByKey = new Map();
  for (const row of state.legacySalesModelMap) {
    legacyModelByKey.set(`${row.legacy_item_brand}|||${row.legacy_item_details}`, row);
  }

  return {
    brandNameByCode,
    manufacturerByLowerName,
    manufacturerByUpperCode,
    usedManufacturerCodes,
    modelsByManufacturerId,
    legacyBrandByCode,
    legacyModelByKey,
  };
}

function findManufacturerForBrand(indexes, brandCode) {
  const manufacturerName = indexes.brandNameByCode.get(brandCode);
  if (!manufacturerName) {
    return {
      manufacturerName: null,
      manufacturer: null,
    };
  }

  const lowerName = String(manufacturerName).toLowerCase();
  const upperName = String(manufacturerName).toUpperCase();

  return {
    manufacturerName,
    manufacturer: indexes.manufacturerByLowerName.get(lowerName)
      || indexes.manufacturerByUpperCode.get(upperName)
      || null,
  };
}

function findMatchingModels(indexes, manufacturerId, itemDetails) {
  const models = indexes.modelsByManufacturerId.get(manufacturerId) || [];
  const lookup = canonicalizeModelLookupValue(itemDetails);
  return models.filter((row) => doesModelMatchLookup(row, lookup));
}

function classifyCoverageEntry(indexes, entry) {
  const legacyKey = `${entry.item_brand}|||${entry.item_details}`;
  const explicitMap = indexes.legacyModelByKey.get(legacyKey);
  if (explicitMap) {
    return {
      status: 'exact_legacy_map',
      manufacturerId: explicitMap.manufacturer_id,
      modelId: explicitMap.model_id,
      manufacturerName: indexes.brandNameByCode.get(entry.item_brand) || null,
    };
  }

  const { manufacturerName, manufacturer } = findManufacturerForBrand(indexes, entry.item_brand);
  if (!manufacturerName) {
    return {
      status: 'missing_brand_map',
      manufacturerName: null,
      manufacturerId: null,
      modelId: null,
    };
  }

  if (!manufacturer) {
    return {
      status: 'missing_manufacturer',
      manufacturerName,
      manufacturerId: null,
      modelId: null,
    };
  }

  const matches = findMatchingModels(indexes, manufacturer.id, entry.item_details);
  if (matches.length === 1) {
    return {
      status: 'existing_model_match',
      manufacturerName,
      manufacturerId: manufacturer.id,
      modelId: matches[0].id,
    };
  }

  if (matches.length > 1) {
    return {
      status: 'ambiguous_model_match',
      manufacturerName,
      manufacturerId: manufacturer.id,
      modelId: null,
      matchedModelIds: matches.map((row) => row.id),
    };
  }

  return {
    status: 'missing_model',
    manufacturerName,
    manufacturerId: manufacturer.id,
    modelId: null,
  };
}

function summarizeCoverage(results) {
  const summary = {
    totalPairs: results.length,
    totalUsage: results.reduce((sum, row) => sum + row.usage_count, 0),
    exactLegacyMap: 0,
    existingModelMatch: 0,
    missingBrandMap: 0,
    missingManufacturer: 0,
    missingModel: 0,
    ambiguousModelMatch: 0,
  };

  for (const row of results) {
    switch (row.status) {
      case 'exact_legacy_map':
        summary.exactLegacyMap += 1;
        break;
      case 'existing_model_match':
        summary.existingModelMatch += 1;
        break;
      case 'missing_brand_map':
        summary.missingBrandMap += 1;
        break;
      case 'missing_manufacturer':
        summary.missingManufacturer += 1;
        break;
      case 'ambiguous_model_match':
        summary.ambiguousModelMatch += 1;
        break;
      default:
        summary.missingModel += 1;
        break;
    }
  }

  return summary;
}

async function ensureManufacturer(connection, indexes, manufacturerName, stats) {
  const lowerName = String(manufacturerName).toLowerCase();
  const existing = indexes.manufacturerByLowerName.get(lowerName)
    || indexes.manufacturerByUpperCode.get(String(manufacturerName).toUpperCase());

  if (existing) {
    return existing;
  }

  const code = buildManufacturerCode(manufacturerName, indexes.usedManufacturerCodes);
  const [result] = await connection.execute(
    `INSERT INTO manufacturers (code, name)
     VALUES (?, ?)`,
    [code, manufacturerName],
  );

  const manufacturer = {
    id: result.insertId,
    code,
    name: manufacturerName,
  };

  indexes.manufacturerByLowerName.set(lowerName, manufacturer);
  indexes.manufacturerByUpperCode.set(code.toUpperCase(), manufacturer);
  if (!indexes.modelsByManufacturerId.has(manufacturer.id)) {
    indexes.modelsByManufacturerId.set(manufacturer.id, []);
  }
  stats.manufacturersInserted += 1;
  return manufacturer;
}

async function ensureLegacyBrandMap(connection, indexes, brandCode, manufacturerId, stats) {
  await connection.execute(
    `INSERT INTO legacy_sales_brand_map (legacy_item_brand, manufacturer_id)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE
       manufacturer_id = VALUES(manufacturer_id)`,
    [brandCode, manufacturerId],
  );

  indexes.legacyBrandByCode.set(brandCode, {
    legacy_item_brand: brandCode,
    manufacturer_id: manufacturerId,
  });
  stats.legacyBrandMappingsUpserted += 1;
}

async function ensureModelForDetails(connection, indexes, manufacturer, entry, stats) {
  const matches = findMatchingModels(indexes, manufacturer.id, entry.item_details);
  if (matches.length === 1) {
    return matches[0];
  }

  if (matches.length > 1) {
    return null;
  }

  const modelRecord = buildModelRecord(entry.item_details);
  const [result] = await connection.execute(
    `INSERT INTO models (manufacturer_id, model_number, model_name)
     VALUES (?, ?, ?)`,
    [manufacturer.id, modelRecord.model_number, modelRecord.model_name],
  );

  const model = {
    id: result.insertId,
    manufacturer_id: manufacturer.id,
    model_number: modelRecord.model_number,
    model_name: modelRecord.model_name,
  };

  if (!indexes.modelsByManufacturerId.has(manufacturer.id)) {
    indexes.modelsByManufacturerId.set(manufacturer.id, []);
  }
  indexes.modelsByManufacturerId.get(manufacturer.id).push(model);
  stats.modelsInserted += 1;
  return model;
}

async function ensureLegacyModelMap(connection, indexes, entry, manufacturerId, modelId, stats) {
  await connection.execute(
    `INSERT INTO legacy_sales_model_map (
       legacy_item_brand,
       legacy_item_details,
       manufacturer_id,
       model_id
     ) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       manufacturer_id = VALUES(manufacturer_id),
       model_id = VALUES(model_id)`,
    [entry.item_brand, entry.item_details, manufacturerId, modelId],
  );

  indexes.legacyModelByKey.set(`${entry.item_brand}|||${entry.item_details}`, {
    legacy_item_brand: entry.item_brand,
    legacy_item_details: entry.item_details,
    manufacturer_id: manufacturerId,
    model_id: modelId,
  });
  stats.legacyModelMappingsUpserted += 1;
}

async function applyCatalogBootstrap(plasmaConnection, coverageEntries, state) {
  const indexes = createStateIndexes(state);
  const stats = {
    manufacturersInserted: 0,
    modelsInserted: 0,
    legacyBrandMappingsUpserted: 0,
    legacyModelMappingsUpserted: 0,
    unresolved: [],
  };

  await plasmaConnection.beginTransaction();
  try {
    for (const [brandCode, manufacturerName] of indexes.brandNameByCode.entries()) {
      const manufacturer = await ensureManufacturer(plasmaConnection, indexes, manufacturerName, stats);
      await ensureLegacyBrandMap(plasmaConnection, indexes, brandCode, manufacturer.id, stats);
    }

    for (const entry of coverageEntries) {
      const manufacturerName = indexes.brandNameByCode.get(entry.item_brand);
      if (!manufacturerName) {
        stats.unresolved.push({
          ...entry,
          reason: 'missing_brand_map',
        });
        continue;
      }

      const manufacturer = await ensureManufacturer(plasmaConnection, indexes, manufacturerName, stats);
      await ensureLegacyBrandMap(plasmaConnection, indexes, entry.item_brand, manufacturer.id, stats);

      const model = await ensureModelForDetails(plasmaConnection, indexes, manufacturer, entry, stats);
      if (!model) {
        stats.unresolved.push({
          ...entry,
          reason: 'ambiguous_model_match',
        });
        continue;
      }

      await ensureLegacyModelMap(
        plasmaConnection,
        indexes,
        entry,
        manufacturer.id,
        model.id,
        stats,
      );
    }

    await plasmaConnection.commit();
    return stats;
  } catch (error) {
    await plasmaConnection.rollback();
    throw error;
  }
}

export async function runDeviceCatalogCoverage({ env = process.env, apply = false } = {}) {
  const plasmaConfig = createPlasmaConfig(env);
  const quantumConfig = createQuantumConfig(env);

  const quantumConnection = await mysql.createConnection(quantumConfig);
  const plasmaConnection = await mysql.createConnection(plasmaConfig);

  try {
    await ensureKnownLegacyBrandOverrides(plasmaConnection);

    const coverageEntries = await fetchQuantumCoverage(quantumConnection);
    const plasmaState = await fetchPlasmaState(plasmaConnection);
    const indexes = createStateIndexes(plasmaState);

    const reportRows = coverageEntries.map((entry) => ({
      ...entry,
      ...classifyCoverageEntry(indexes, entry),
    }));

    const summary = summarizeCoverage(reportRows);

    if (!apply) {
      return {
        mode: 'report',
        plasmaConfig,
        quantumConfig,
        summary,
        reportRows,
      };
    }

    const applyStats = await applyCatalogBootstrap(plasmaConnection, coverageEntries, plasmaState);
    const refreshedState = await fetchPlasmaState(plasmaConnection);
    const refreshedIndexes = createStateIndexes(refreshedState);
    const refreshedRows = coverageEntries.map((entry) => ({
      ...entry,
      ...classifyCoverageEntry(refreshedIndexes, entry),
    }));

    return {
      mode: 'apply',
      plasmaConfig,
      quantumConfig,
      summaryBefore: summary,
      applyStats,
      summaryAfter: summarizeCoverage(refreshedRows),
      reportRowsAfter: refreshedRows,
    };
  } finally {
    await quantumConnection.end();
    await plasmaConnection.end();
  }
}

export function formatCoverageReport(result, { top = 25 } = {}) {
  if (result.mode === 'apply') {
    const before = result.summaryBefore;
    const after = result.summaryAfter;
    const unresolved = result.reportRowsAfter
      .filter((row) => row.status !== 'exact_legacy_map' && row.status !== 'existing_model_match')
      .slice(0, top);

    return [
      `Mode: apply`,
      `Quantum DB: ${result.quantumConfig.database} @ ${result.quantumConfig.host}`,
      `Plasma DB: ${result.plasmaConfig.database} @ ${result.plasmaConfig.host}`,
      '',
      `Before: total=${before.totalPairs}, exact=${before.exactLegacyMap}, existing=${before.existingModelMatch}, missingBrand=${before.missingBrandMap}, missingManufacturer=${before.missingManufacturer}, missingModel=${before.missingModel}, ambiguous=${before.ambiguousModelMatch}`,
      `Applied: manufacturersInserted=${result.applyStats.manufacturersInserted}, modelsInserted=${result.applyStats.modelsInserted}, legacyBrandMappingsUpserted=${result.applyStats.legacyBrandMappingsUpserted}, legacyModelMappingsUpserted=${result.applyStats.legacyModelMappingsUpserted}, unresolved=${result.applyStats.unresolved.length}`,
      `After: total=${after.totalPairs}, exact=${after.exactLegacyMap}, existing=${after.existingModelMatch}, missingBrand=${after.missingBrandMap}, missingManufacturer=${after.missingManufacturer}, missingModel=${after.missingModel}, ambiguous=${after.ambiguousModelMatch}`,
      '',
      'Top unresolved after apply:',
      ...unresolved.map((row) => `  - ${row.item_brand} / ${row.item_details} | usage=${row.usage_count} | status=${row.status}`),
    ].join('\n');
  }

  const unresolved = result.reportRows
    .filter((row) => !['exact_legacy_map', 'existing_model_match'].includes(row.status))
    .slice(0, top);

  return [
    `Mode: report`,
    `Quantum DB: ${result.quantumConfig.database} @ ${result.quantumConfig.host}`,
    `Plasma DB: ${result.plasmaConfig.database} @ ${result.plasmaConfig.host}`,
    '',
    `Summary: total=${result.summary.totalPairs}, usage=${result.summary.totalUsage}, exact=${result.summary.exactLegacyMap}, existing=${result.summary.existingModelMatch}, missingBrand=${result.summary.missingBrandMap}, missingManufacturer=${result.summary.missingManufacturer}, missingModel=${result.summary.missingModel}, ambiguous=${result.summary.ambiguousModelMatch}`,
    '',
    'Top unresolved:',
    ...unresolved.map((row) => `  - ${row.item_brand} / ${row.item_details} | usage=${row.usage_count} | status=${row.status}${row.manufacturerName ? ` | manufacturer=${row.manufacturerName}` : ''}`),
  ].join('\n');
}
