import express from 'express';
import { automationAuth } from '../middleware/automationAuth.js';
import {
  validateAutomationDeviceMove,
  validateAutomationPurchaseSync,
  validateAutomationQcSync,
  validateAutomationSalesOrderSync,
} from '../middleware/validation.js';
import {
  moveLegacyDevice,
  syncLegacyPurchase,
  syncLegacyPurchaseQc,
  syncLegacySalesOrder,
} from '../controllers/automationController.js';

const router = express.Router();

router.use(automationAuth);

router.post('/purchases/:legacyPurchaseId/sync', validateAutomationPurchaseSync, syncLegacyPurchase);
router.post('/sales-orders/:legacyOrderId/sync', validateAutomationSalesOrderSync, syncLegacySalesOrder);
router.post('/qc/purchases/:legacyPurchaseId/sync', validateAutomationQcSync, syncLegacyPurchaseQc);
router.post('/devices/:imei/move', validateAutomationDeviceMove, moveLegacyDevice);

export default router;
