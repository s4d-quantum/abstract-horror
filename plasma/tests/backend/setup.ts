import { afterAll, beforeAll, beforeEach } from 'vitest';
import {
  closeTestDatabase,
  configureTestDatabaseEnv,
  ensureTestDatabaseConnection,
  resetTestDatabase,
} from './utils/test-db';

configureTestDatabaseEnv();
process.env.PLASMA_AUTOMATION_KEY = 'test-automation-key';

const [
  { runAutomationModuleMigration },
  { runQcModuleMigration },
  { runQuantumPollerMigration },
] = await Promise.all([
  import('../../server/migrate-automation.js'),
  import('../../server/migrate-qc-module.js'),
  import('../../server/migrate-quantum-poller.js'),
]);

await runQcModuleMigration();
await runAutomationModuleMigration();
await runQuantumPollerMigration();

beforeAll(async () => {
  await ensureTestDatabaseConnection();
});

beforeEach(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await closeTestDatabase();
});
