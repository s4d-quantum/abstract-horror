import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  formatCoverageReport,
  runDeviceCatalogCoverage,
} from './src/services/deviceCatalogSync.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const apply = process.argv.includes('--apply');
if (!apply) {
  console.error('Refusing to write without --apply. Use report-quantum-device-catalog.js for read-only mode.');
  process.exit(1);
}

runDeviceCatalogCoverage({ env: process.env, apply: true })
  .then((result) => {
    console.log(formatCoverageReport(result));
  })
  .catch((error) => {
    console.error('Quantum device catalog sync failed:', error);
    process.exitCode = 1;
  });
