import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAutomationMigration } from './src/services/automationSchema.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

function getConfig() {
  const isTest = process.env.NODE_ENV === 'test';

  return {
    host: isTest ? process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost' : process.env.DB_HOST || 'localhost',
    port: parseInt(isTest ? process.env.TEST_DB_PORT || process.env.DB_PORT || '3306' : process.env.DB_PORT || '3306', 10),
    user: isTest ? process.env.TEST_DB_USER || process.env.DB_USER : process.env.DB_USER,
    password: isTest ? process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD : process.env.DB_PASSWORD,
    database: isTest ? process.env.TEST_DB_NAME || process.env.DB_NAME : process.env.DB_NAME,
  };
}

export async function runAutomationModuleMigration() {
  const connection = await mysql.createConnection(getConfig());

  try {
    await runAutomationMigration(connection);
    return { database: getConfig().database };
  } finally {
    await connection.end();
  }
}

if (process.argv[1] === __filename) {
  runAutomationModuleMigration()
    .then(({ database }) => {
      console.log(`Automation migration applied to ${database}`);
    })
    .catch((error) => {
      console.error('Automation migration failed:', error);
      process.exitCode = 1;
    });
}
