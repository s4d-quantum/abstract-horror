import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

function getConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };
}

async function tableExists(connection, tableName) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [tableName],
  );
  return rows[0].count > 0;
}

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [tableName, columnName],
  );
  return rows[0].count > 0;
}

async function foreignKeyExists(connection, tableName, constraintName) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count
     FROM information_schema.table_constraints
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND constraint_type = 'FOREIGN KEY'
       AND constraint_name = ?`,
    [tableName, constraintName],
  );
  return rows[0].count > 0;
}

async function indexExists(connection, tableName, indexName) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count
     FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
    [tableName, indexName],
  );
  return rows[0].count > 0;
}

async function execute(connection, sql) {
  await connection.query(sql);
}

async function ensureRepairTableColumns(connection) {
  if (!(await columnExists(connection, 'repair_jobs', 'notes'))) {
    await execute(connection, 'ALTER TABLE repair_jobs ADD COLUMN notes TEXT NULL AFTER completed_at');
  }
  if (!(await columnExists(connection, 'repair_jobs', 'priority'))) {
    await execute(
      connection,
      `ALTER TABLE repair_jobs
       ADD COLUMN priority ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL' AFTER status`,
    );
  }
  if (!(await columnExists(connection, 'repair_jobs', 'target_sales_order_id'))) {
    await execute(connection, 'ALTER TABLE repair_jobs ADD COLUMN target_sales_order_id INT UNSIGNED NULL AFTER notes');
  }
  if (!(await columnExists(connection, 'repair_jobs', 'created_by'))) {
    await execute(connection, 'ALTER TABLE repair_jobs ADD COLUMN created_by INT UNSIGNED NULL AFTER target_sales_order_id');
  }
  if (!(await columnExists(connection, 'repair_jobs', 'updated_at'))) {
    await execute(
      connection,
      `ALTER TABLE repair_jobs
       ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
       ON UPDATE CURRENT_TIMESTAMP AFTER created_at`,
    );
  }
  if (!(await foreignKeyExists(connection, 'repair_jobs', 'fk_repair_jobs_target_so'))) {
    await execute(
      connection,
      `ALTER TABLE repair_jobs
       ADD CONSTRAINT fk_repair_jobs_target_so
       FOREIGN KEY (target_sales_order_id) REFERENCES sales_orders(id) ON DELETE SET NULL`,
    );
  }
  if (!(await foreignKeyExists(connection, 'repair_jobs', 'fk_repair_jobs_created_by'))) {
    await execute(
      connection,
      `ALTER TABLE repair_jobs
       ADD CONSTRAINT fk_repair_jobs_created_by
       FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`,
    );
  }

  if (!(await columnExists(connection, 'repair_records', 'assigned_to'))) {
    await execute(connection, 'ALTER TABLE repair_records ADD COLUMN assigned_to INT UNSIGNED NULL AFTER engineer_comments');
  }
  if (!(await columnExists(connection, 'repair_records', 'outcome'))) {
    await execute(connection, 'ALTER TABLE repair_records ADD COLUMN outcome VARCHAR(100) NULL AFTER assigned_to');
  }
  if (!(await columnExists(connection, 'repair_records', 'resolution_notes'))) {
    await execute(connection, 'ALTER TABLE repair_records ADD COLUMN resolution_notes TEXT NULL AFTER outcome');
  }
  if (!(await columnExists(connection, 'repair_records', 'updated_at'))) {
    await execute(
      connection,
      `ALTER TABLE repair_records
       ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
       ON UPDATE CURRENT_TIMESTAMP AFTER created_at`,
    );
  }
  if (!(await foreignKeyExists(connection, 'repair_records', 'fk_repair_records_assigned_to'))) {
    await execute(
      connection,
      `ALTER TABLE repair_records
       ADD CONSTRAINT fk_repair_records_assigned_to
       FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL`,
    );
  }

  if (!(await tableExists(connection, 'repair_comments'))) {
    await execute(
      connection,
      `CREATE TABLE repair_comments (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        repair_record_id INT UNSIGNED NOT NULL,
        comment_text TEXT NOT NULL,
        created_by INT UNSIGNED NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_repair_comments_record FOREIGN KEY (repair_record_id) REFERENCES repair_records(id) ON DELETE CASCADE,
        CONSTRAINT fk_repair_comments_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_repair_comments_record (repair_record_id),
        INDEX idx_repair_comments_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
    );
  }

  if (!(await columnExists(connection, 'repair_parts_used', 'part_lot_id'))) {
    await execute(connection, 'ALTER TABLE repair_parts_used ADD COLUMN part_lot_id INT UNSIGNED NULL AFTER part_id');
  }
  if (!(await columnExists(connection, 'repair_parts_used', 'status'))) {
    await execute(
      connection,
      `ALTER TABLE repair_parts_used
       ADD COLUMN status ENUM('RESERVED', 'FITTED', 'REMOVED_RESTOCKED', 'REMOVED_FAULTY')
       NOT NULL DEFAULT 'FITTED' AFTER quantity`,
    );
  }
  if (!(await columnExists(connection, 'repair_parts_used', 'notes'))) {
    await execute(connection, 'ALTER TABLE repair_parts_used ADD COLUMN notes TEXT NULL AFTER status');
  }
  if (!(await columnExists(connection, 'repair_parts_used', 'removed_at'))) {
    await execute(connection, 'ALTER TABLE repair_parts_used ADD COLUMN removed_at TIMESTAMP NULL AFTER added_at');
  }
  if (!(await columnExists(connection, 'repair_parts_used', 'removed_by'))) {
    await execute(connection, 'ALTER TABLE repair_parts_used ADD COLUMN removed_by INT UNSIGNED NULL AFTER removed_at');
  }
  if (!(await columnExists(connection, 'repair_parts_used', 'updated_at'))) {
    await execute(
      connection,
      `ALTER TABLE repair_parts_used
       ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
       ON UPDATE CURRENT_TIMESTAMP AFTER removed_by`,
    );
  }
}

async function ensurePartsTables(connection) {
  if (!(await tableExists(connection, 'part_bases'))) {
    await execute(
      connection,
      `CREATE TABLE part_bases (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        base_code VARCHAR(120) NOT NULL,
        name VARCHAR(200) NOT NULL,
        category_id INT UNSIGNED NOT NULL,
        manufacturer_id INT UNSIGNED NULL,
        subtype VARCHAR(100) NULL,
        changes_device_color BOOLEAN NOT NULL DEFAULT FALSE,
        notes TEXT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_part_base_code (base_code),
        KEY idx_part_bases_category (category_id),
        KEY idx_part_bases_manufacturer (manufacturer_id),
        CONSTRAINT fk_part_bases_category FOREIGN KEY (category_id) REFERENCES part_categories(id),
        CONSTRAINT fk_part_bases_manufacturer FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
    );
  }

  if (!(await columnExists(connection, 'parts', 'part_base_id'))) {
    await execute(connection, 'ALTER TABLE parts ADD COLUMN part_base_id INT UNSIGNED NULL AFTER id');
  }
  if (!(await columnExists(connection, 'parts', 'quality_tier'))) {
    await execute(
      connection,
      `ALTER TABLE parts
       ADD COLUMN quality_tier ENUM('OEM', 'OEM_PULL', 'PREMIUM', 'AFTERMARKET', 'REFURBISHED', 'OTHER')
       NOT NULL DEFAULT 'OTHER' AFTER name`,
    );
  }
  if (!(await columnExists(connection, 'parts', 'supplier_part_ref'))) {
    await execute(connection, 'ALTER TABLE parts ADD COLUMN supplier_part_ref VARCHAR(100) NULL AFTER quality_tier');
  }
  if (!(await columnExists(connection, 'parts', 'available_stock'))) {
    await execute(connection, 'ALTER TABLE parts ADD COLUMN available_stock INT NOT NULL DEFAULT 0 AFTER current_stock');
  }
  if (!(await columnExists(connection, 'parts', 'reserved_stock'))) {
    await execute(connection, 'ALTER TABLE parts ADD COLUMN reserved_stock INT NOT NULL DEFAULT 0 AFTER available_stock');
  }
  if (!(await columnExists(connection, 'parts', 'consumed_stock'))) {
    await execute(connection, 'ALTER TABLE parts ADD COLUMN consumed_stock INT NOT NULL DEFAULT 0 AFTER reserved_stock');
  }
  if (!(await columnExists(connection, 'parts', 'faulty_stock'))) {
    await execute(connection, 'ALTER TABLE parts ADD COLUMN faulty_stock INT NOT NULL DEFAULT 0 AFTER consumed_stock');
  }
  if (!(await columnExists(connection, 'parts', 'issued_stock'))) {
    await execute(connection, 'ALTER TABLE parts ADD COLUMN issued_stock INT NOT NULL DEFAULT 0 AFTER faulty_stock');
  }
  if (!(await foreignKeyExists(connection, 'parts', 'fk_parts_base'))) {
    await execute(
      connection,
      `ALTER TABLE parts
       ADD CONSTRAINT fk_parts_base FOREIGN KEY (part_base_id) REFERENCES part_bases(id) ON DELETE SET NULL`,
    );
  }
  if (!(await indexExists(connection, 'parts', 'idx_parts_base'))) {
    await execute(connection, 'ALTER TABLE parts ADD INDEX idx_parts_base (part_base_id)');
  }

  if (!(await tableExists(connection, 'part_lots'))) {
    await execute(
      connection,
      `CREATE TABLE part_lots (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        part_id INT UNSIGNED NOT NULL,
        supplier_id INT UNSIGNED NULL,
        supplier_ref VARCHAR(100) NULL,
        lot_ref VARCHAR(100) NULL,
        unit_cost DECIMAL(10, 2) NULL,
        received_quantity INT UNSIGNED NOT NULL DEFAULT 0,
        available_quantity INT UNSIGNED NOT NULL DEFAULT 0,
        reserved_quantity INT UNSIGNED NOT NULL DEFAULT 0,
        consumed_quantity INT UNSIGNED NOT NULL DEFAULT 0,
        faulty_quantity INT UNSIGNED NOT NULL DEFAULT 0,
        issued_quantity INT UNSIGNED NOT NULL DEFAULT 0,
        received_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        notes TEXT NULL,
        created_by INT UNSIGNED NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_part_lots_part FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE,
        CONSTRAINT fk_part_lots_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
        CONSTRAINT fk_part_lots_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_part_lots_part (part_id),
        INDEX idx_part_lots_supplier (supplier_id),
        INDEX idx_part_lots_available (available_quantity)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
    );
  }

  if (!(await tableExists(connection, 'part_transactions'))) {
    await execute(
      connection,
      `CREATE TABLE part_transactions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        part_id INT UNSIGNED NOT NULL,
        part_lot_id INT UNSIGNED NULL,
        movement_type ENUM(
          'GOODS_IN',
          'RESERVE',
          'UNRESERVE',
          'FIT_RESERVED',
          'FIT_DIRECT',
          'REMOVE_RESTOCK',
          'REMOVE_FAULTY',
          'MANUAL_GOODS_OUT',
          'FAULTY_GOODS_OUT',
          'ADJUSTMENT'
        ) NOT NULL,
        quantity INT UNSIGNED NOT NULL,
        available_delta INT NOT NULL DEFAULT 0,
        reserved_delta INT NOT NULL DEFAULT 0,
        consumed_delta INT NOT NULL DEFAULT 0,
        faulty_delta INT NOT NULL DEFAULT 0,
        issued_delta INT NOT NULL DEFAULT 0,
        reference_type VARCHAR(50) NULL,
        reference_id INT UNSIGNED NULL,
        notes TEXT NULL,
        user_id INT UNSIGNED NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_part_transactions_part FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE,
        CONSTRAINT fk_part_transactions_lot FOREIGN KEY (part_lot_id) REFERENCES part_lots(id) ON DELETE SET NULL,
        CONSTRAINT fk_part_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_part_transactions_part (part_id),
        INDEX idx_part_transactions_lot (part_lot_id),
        INDEX idx_part_transactions_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
    );
  }

  const hasLegacyPartId = await columnExists(connection, 'part_compatibility', 'part_id');
  const hasBaseId = await columnExists(connection, 'part_compatibility', 'part_base_id');
  if (hasLegacyPartId && !hasBaseId) {
    const [rows] = await connection.execute('SELECT COUNT(*) AS count FROM part_compatibility');
    if (rows[0].count > 0) {
      throw new Error('part_compatibility contains legacy rows. Clear or migrate them before applying this upgrade.');
    }

    if (await foreignKeyExists(connection, 'part_compatibility', 'part_compatibility_ibfk_1')) {
      await execute(connection, 'ALTER TABLE part_compatibility DROP FOREIGN KEY part_compatibility_ibfk_1');
    }
    if (await indexExists(connection, 'part_compatibility', 'uk_part_model')) {
      await execute(connection, 'ALTER TABLE part_compatibility DROP INDEX uk_part_model');
    }
    await execute(connection, 'ALTER TABLE part_compatibility DROP COLUMN part_id');
    await execute(connection, 'ALTER TABLE part_compatibility ADD COLUMN part_base_id INT UNSIGNED NOT NULL AFTER id');
  }

  if (!(await columnExists(connection, 'part_compatibility', 'storage_gb'))) {
    await execute(
      connection,
      'ALTER TABLE part_compatibility ADD COLUMN storage_gb SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER model_id',
    );
  }
  if (!(await foreignKeyExists(connection, 'part_compatibility', 'fk_part_compatibility_base'))) {
    await execute(
      connection,
      `ALTER TABLE part_compatibility
       ADD CONSTRAINT fk_part_compatibility_base
       FOREIGN KEY (part_base_id) REFERENCES part_bases(id) ON DELETE CASCADE`,
    );
  }
  if (!(await indexExists(connection, 'part_compatibility', 'uk_part_base_model_storage'))) {
    await execute(
      connection,
      'ALTER TABLE part_compatibility ADD UNIQUE KEY uk_part_base_model_storage (part_base_id, model_id, storage_gb)',
    );
  }

  if (!(await tableExists(connection, 'part_fault_reports'))) {
    await execute(
      connection,
      `CREATE TABLE part_fault_reports (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        part_id INT UNSIGNED NOT NULL,
        part_lot_id INT UNSIGNED NULL,
        supplier_id INT UNSIGNED NULL,
        repair_record_id INT UNSIGNED NULL,
        quantity INT UNSIGNED NOT NULL DEFAULT 1,
        reason VARCHAR(255) NOT NULL,
        status ENUM('OPEN', 'RMA_REQUESTED', 'RETURNED', 'CREDIT_RECEIVED', 'WRITTEN_OFF') NOT NULL DEFAULT 'OPEN',
        notes TEXT NULL,
        created_by INT UNSIGNED NULL,
        updated_by INT UNSIGNED NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_part_fault_reports_part FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE,
        CONSTRAINT fk_part_fault_reports_lot FOREIGN KEY (part_lot_id) REFERENCES part_lots(id) ON DELETE SET NULL,
        CONSTRAINT fk_part_fault_reports_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
        CONSTRAINT fk_part_fault_reports_record FOREIGN KEY (repair_record_id) REFERENCES repair_records(id) ON DELETE SET NULL,
        CONSTRAINT fk_part_fault_reports_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_part_fault_reports_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_part_fault_reports_status (status),
        INDEX idx_part_fault_reports_supplier (supplier_id),
        INDEX idx_part_fault_reports_part (part_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
    );
  }
}

async function ensureRepairAndLevel3Support(connection) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count
     FROM locations
     WHERE code = 'LEVEL3_QUEUE'`,
  );
  if (rows[0].count === 0) {
    await connection.execute(
      `INSERT INTO locations (code, name, location_type, is_active)
       VALUES ('LEVEL3_QUEUE', 'Level 3 Queue', 'LEVEL3', TRUE)`,
    );
  }
}

async function ensurePartCategorySupport(connection) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count
     FROM part_categories
     WHERE name = 'Service Pack'`,
  );

  if (rows[0].count === 0) {
    await connection.execute(
      `INSERT INTO part_categories (name, description)
       VALUES ('Service Pack', 'Complete screen and frame assemblies / service packs')`,
    );
  }
}

async function main() {
  const connection = await mysql.createConnection(getConfig());
  try {
    await connection.beginTransaction();
    await ensureRepairTableColumns(connection);
    await ensurePartsTables(connection);
    await ensureRepairAndLevel3Support(connection);
    await ensurePartCategorySupport(connection);
    await connection.commit();
    console.log(`Repair and parts module migration applied to ${getConfig().database}`);
  } catch (error) {
    await connection.rollback();
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main();
