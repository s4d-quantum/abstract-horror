import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import plasmaPool from './src/config/database.js';
import {
  createQuantumDbConfig,
  createQuantumPollerConfig,
  ensureQuantumPollerCompatibility,
  runQuantumPollerOnce,
} from './src/services/quantumPoller.service.js';
import { createPlasmaAutomationClient } from './src/services/plasmaAutomationClient.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: false });
dotenv.config({ path: path.resolve(__dirname, '.env'), override: false });

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function validateQuantumDbConfig(config) {
  if (!config.host || !config.user || !config.database) {
    throw new Error('Quantum DB config is incomplete. Set QUANTUM_DB_HOST, QUANTUM_DB_USER, and QUANTUM_DB_NAME.');
  }
}

async function main() {
  const watchMode = process.argv.includes('--watch');
  const pollerConfig = createQuantumPollerConfig(process.env);

  if (!pollerConfig.plasmaAutomationKey) {
    throw new Error('PLASMA_AUTOMATION_KEY is required for the Quantum poller.');
  }

  const quantumDbConfig = createQuantumDbConfig(process.env);
  validateQuantumDbConfig(quantumDbConfig);

  await ensureQuantumPollerCompatibility();

  const quantumPool = mysql.createPool({
    ...quantumDbConfig,
    waitForConnections: true,
    connectionLimit: 4,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

  const plasmaClient = createPlasmaAutomationClient({
    baseUrl: pollerConfig.plasmaAutomationBaseUrl,
    automationKey: pollerConfig.plasmaAutomationKey,
  });

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    await Promise.allSettled([
      quantumPool.end(),
      plasmaPool.end(),
    ]);
  };

  process.on('SIGINT', async () => {
    await shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await shutdown();
    process.exit(0);
  });

  try {
    do {
      const result = await runQuantumPollerOnce({
        quantumConnection: quantumPool,
        plasmaClient,
        config: pollerConfig,
      });

      if (!watchMode) {
        if (result.status === 'dead_letter') {
          process.exitCode = 1;
        }
        break;
      }

      if (result.status === 'dead_letter') {
        process.exitCode = 1;
        break;
      }

      await sleep(pollerConfig.intervalMs);
    } while (!shuttingDown);
  } finally {
    await shutdown();
  }
}

main().catch((error) => {
  console.error('[quantum-poller] fatal', error);
  process.exitCode = 1;
});
