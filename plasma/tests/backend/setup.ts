import { afterAll, beforeAll, beforeEach } from 'vitest';
import { runQcModuleMigration } from '../../server/migrate-qc-module.js';
import {
  closeTestDatabase,
  configureTestDatabaseEnv,
  ensureTestDatabaseConnection,
  resetTestDatabase,
} from './utils/test-db';

configureTestDatabaseEnv();
await runQcModuleMigration();

beforeAll(async () => {
  await ensureTestDatabaseConnection();
});

beforeEach(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await closeTestDatabase();
});
