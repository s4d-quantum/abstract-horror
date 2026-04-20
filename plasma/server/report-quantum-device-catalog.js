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

runDeviceCatalogCoverage({ env: process.env, apply: false })
  .then((result) => {
    console.log(formatCoverageReport(result));
  })
  .catch((error) => {
    console.error('Quantum device catalog coverage report failed:', error);
    process.exitCode = 1;
  });
