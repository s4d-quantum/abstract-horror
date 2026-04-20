import dotenv from 'dotenv';
import path from 'node:path';

const ENV_PATH = path.resolve(process.cwd(), 'server/.env');
dotenv.config({ path: ENV_PATH, override: true });

const TABLES_TO_TRUNCATE = [
  'quantum_poller_attempts',
  'quantum_poller_state',
  'applied_quantum_events',
  'part_transactions',
  'part_fault_reports',
  'part_lots',
  'repair_comments',
  'repair_parts_used',
  'repair_records',
  'repair_jobs',
  'qc_results',
  'qc_jobs',
  'level3_repairs',
  'part_compatibility',
  'parts',
  'part_bases',
  'sales_order_items',
  'sales_order_lines',
  'sales_orders',
  'purchase_order_receipts',
  'purchase_order_lines',
  'purchase_orders',
  'device_history',
  'devices',
  'admin_operations',
  'legacy_device_reserved_sales_order_map',
  'legacy_brand_map',
  'legacy_sales_order_map',
  'legacy_purchase_order_map',
  'legacy_sales_model_map',
  'legacy_sales_brand_map',
  'tac_lookup',
  'models',
  'manufacturers',
  'customers',
  'suppliers',
  'locations',
  'users',
  'color_check_cache',
];

let configured = false;
let dbModulePromise: Promise<typeof import('../../../server/src/config/database.js')> | null = null;

function setIfDefined(key: string, value?: string) {
  if (value && value.trim()) {
    process.env[key] = value;
  }
}

function getConfiguredDbName() {
  return (
    process.env.TEST_DB_NAME ||
    process.env.DB_TEST_NAME ||
    process.env.DB_NAME_TEST ||
    process.env.DB_NAME ||
    ''
  );
}

export function configureTestDatabaseEnv() {
  if (configured) {
    return;
  }

  process.env.NODE_ENV = 'test';

  const explicitTestDbName = process.env.TEST_DB_NAME || process.env.DB_TEST_NAME || process.env.DB_NAME_TEST;

  setIfDefined('DB_HOST', process.env.TEST_DB_HOST || process.env.DB_HOST_TEST || process.env.DB_HOST);
  setIfDefined('DB_PORT', process.env.TEST_DB_PORT || process.env.DB_PORT_TEST || process.env.DB_PORT);
  setIfDefined('DB_USER', process.env.TEST_DB_USER || process.env.DB_USER_TEST || process.env.DB_USER);
  setIfDefined('DB_PASSWORD', process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD_TEST || process.env.DB_PASSWORD);
  setIfDefined('DB_NAME', getConfiguredDbName());

  const dbName = process.env.DB_NAME;
  if (!dbName) {
    throw new Error('DB_NAME is not configured for tests.');
  }

  const looksLikeTestDb = /test/i.test(dbName);
  if (!explicitTestDbName && !looksLikeTestDb) {
    throw new Error(
      `Refusing to run tests against non-test DB "${dbName}". Set TEST_DB_NAME/TEST_DB_* in server/.env.`,
    );
  }

  configured = true;
}

async function loadDbModule() {
  configureTestDatabaseEnv();
  if (!dbModulePromise) {
    dbModulePromise = import('../../../server/src/config/database.js');
  }
  return dbModulePromise;
}

export async function getTestDbPool() {
  const dbModule = await loadDbModule();
  return dbModule.default;
}

export async function ensureTestDatabaseConnection() {
  const dbModule = await loadDbModule();
  const ok = await dbModule.testConnection();
  if (!ok) {
    throw new Error('Unable to connect to the configured TEST database.');
  }
}

export async function resetTestDatabase() {
  const pool = await getTestDbPool();

  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    for (const table of TABLES_TO_TRUNCATE) {
      try {
        await pool.query(`TRUNCATE TABLE ${table}`);
      } catch (error: any) {
        if (error?.code !== 'ER_NO_SUCH_TABLE') {
          throw error;
        }
      }
    }
  } finally {
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
  }
}

export async function closeTestDatabase() {
  const pool = await getTestDbPool();
  await pool.end();
}
