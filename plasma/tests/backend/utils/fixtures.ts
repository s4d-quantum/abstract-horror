import { getTestDbPool } from './test-db';

export interface CoreFixtureIds {
  userId: number;
  supplierId: number;
  customerId: number;
  manufacturerId: number;
  modelId: number;
  sourceLocationId: number;
  targetLocationId: number;
}

export async function seedCoreFixtures(): Promise<CoreFixtureIds> {
  const pool = await getTestDbPool();

  await pool.query(
    `INSERT INTO users (id, username, display_name, password_hash, role, is_active)
     VALUES (1, 'test_admin', 'Test Admin', 'test-password-hash', 'ADMIN', TRUE)`,
  );

  await pool.query(
    `INSERT INTO suppliers (id, supplier_code, name, is_active)
     VALUES (1, 'SUP-TEST-001', 'Test Supplier', TRUE)`,
  );

  await pool.query(
    `INSERT INTO customers (id, customer_code, name, is_backmarket, is_active)
     VALUES (1, 'CST-TEST-001', 'Test Customer', FALSE, TRUE)`,
  );

  await pool.query(
    `INSERT INTO manufacturers (id, code, name)
     VALUES (1, 'APPLE', 'Apple')`,
  );

  await pool.query(
    `INSERT INTO models (id, manufacturer_id, model_number, model_name)
     VALUES (1, 1, 'A2890', 'iPhone 15 Pro')`,
  );

  await pool.query(
    `INSERT INTO locations (id, code, name, location_type, is_active)
     VALUES
      (1, 'TR001', 'Tray 1', 'TRAY', TRUE),
      (2, 'TR002', 'Tray 2', 'TRAY', TRUE),
      (3, 'LEVEL3_QUEUE', 'Level 3 Queue', 'LEVEL3', TRUE)`,
  );

  return {
    userId: 1,
    supplierId: 1,
    customerId: 1,
    manufacturerId: 1,
    modelId: 1,
    sourceLocationId: 1,
    targetLocationId: 2,
  };
}

export async function seedInStockDevice({
  imei = '123456789012345',
  manufacturerId = 1,
  modelId = 1,
  supplierId = 1,
  locationId = 1,
  status = 'IN_STOCK',
}: {
  imei?: string;
  manufacturerId?: number;
  modelId?: number;
  supplierId?: number;
  locationId?: number;
  status?: string;
} = {}) {
  const pool = await getTestDbPool();

  const tac = imei.slice(0, 8);
  await pool.query(
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
      supplier_id,
      qc_required,
      repair_required,
      received_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [imei, tac, manufacturerId, modelId, 128, 'Black', 'A', status, locationId, supplierId, true, false],
  );
}
