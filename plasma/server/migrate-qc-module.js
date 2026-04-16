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

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [tableName, columnName],
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

async function execute(connection, sql) {
  await connection.query(sql);
}

export async function runQcModuleMigration() {
  const connection = await mysql.createConnection(getConfig());

  try {
    await connection.beginTransaction();

    if (!(await columnExists(connection, 'qc_results', 'functional_result'))) {
      await execute(
        connection,
        `ALTER TABLE qc_results
         ADD COLUMN functional_result ENUM('PASS', 'FAIL', 'UNABLE', 'NA') NULL
         COMMENT 'Functional test outcome: PASS/FAIL/UNABLE (could not test)/NA (not applicable)'
         AFTER device_id`,
      );
    }

    if (!(await columnExists(connection, 'qc_results', 'cosmetic_result'))) {
      await execute(
        connection,
        `ALTER TABLE qc_results
         ADD COLUMN cosmetic_result ENUM('PASS', 'FAIL', 'NA') NULL
         COMMENT 'Cosmetic test outcome: PASS/FAIL/NA'
         AFTER functional_result`,
      );
    }

    if (!(await columnExists(connection, 'qc_results', 'non_uk'))) {
      await execute(
        connection,
        `ALTER TABLE qc_results
         ADD COLUMN non_uk BOOLEAN NOT NULL DEFAULT FALSE
         COMMENT 'Device is not UK-compatible (network bands / region lock)'
         AFTER blackbelt_passed`,
      );
    }

    if (await columnExists(connection, 'qc_results', 'functional_pass')) {
      await execute(connection, 'ALTER TABLE qc_results DROP COLUMN functional_pass');
    }

    if (await columnExists(connection, 'qc_results', 'cosmetic_pass')) {
      await execute(connection, 'ALTER TABLE qc_results DROP COLUMN cosmetic_pass');
    }

    if (!(await indexExists(connection, 'qc_results', 'idx_functional_result'))) {
      await execute(connection, 'ALTER TABLE qc_results ADD INDEX idx_functional_result (functional_result)');
    }

    if (!(await indexExists(connection, 'qc_results', 'idx_non_uk'))) {
      await execute(connection, 'ALTER TABLE qc_results ADD INDEX idx_non_uk (non_uk)');
    }

    if (!(await columnExists(connection, 'qc_jobs', 'created_by'))) {
      await execute(
        connection,
        `ALTER TABLE qc_jobs
         ADD COLUMN created_by INT UNSIGNED NULL
         COMMENT 'User who created the job'
         AFTER assigned_to`,
      );
    }

    if (!(await foreignKeyExists(connection, 'qc_jobs', 'fk_qc_jobs_created_by'))) {
      await execute(
        connection,
        `ALTER TABLE qc_jobs
         ADD CONSTRAINT fk_qc_jobs_created_by
         FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`,
      );
    }

    await connection.commit();
    return { database: getConfig().database };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

if (process.argv[1] === __filename) {
  runQcModuleMigration()
    .then(({ database }) => {
      console.log(`QC module migration applied to ${database}`);
    })
    .catch((error) => {
      console.error('QC module migration failed:', error);
      process.exitCode = 1;
    });
}
