import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  getMetrics,
  getRecentPurchaseOrders,
  getRecentSalesOrders,
  getActivitySummary,
  getLowStockAlerts,
  getDeviceStatusBreakdown,
  getTopManufacturers
} from '../controllers/dashboardController.js';

const router = express.Router();

// All dashboard routes require authentication
router.use(verifyToken);

// Dashboard endpoints
router.get('/metrics', getMetrics);
router.get('/recent-purchase-orders', getRecentPurchaseOrders);
router.get('/recent-sales-orders', getRecentSalesOrders);
router.get('/activity-summary', getActivitySummary);
router.get('/low-stock-alerts', getLowStockAlerts);
router.get('/status-breakdown', getDeviceStatusBreakdown);
router.get('/top-manufacturers', getTopManufacturers);

export default router;
