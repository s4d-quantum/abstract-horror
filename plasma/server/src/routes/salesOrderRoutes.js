import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  getAvailableDevicesGrouped,
  checkAvailability,
  getAllSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateSalesOrder,
  confirmSalesOrder,
  cancelSalesOrder,
  pickDevices,
  getPickedDevices,
  shipSalesOrder
} from '../controllers/salesOrderController.js';
import {
  validateCreateSalesOrder,
  validateUpdateSalesOrder,
  validatePickDevices,
  validateShipOrder,
  validateIdParam,
  validateSalesOrderQuery
} from '../middleware/validation.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// GET /api/sales-orders/available-devices - Get available devices grouped by criteria
router.get('/available-devices', getAvailableDevicesGrouped);

// POST /api/sales-orders/check-availability - Check availability for order lines
router.post('/check-availability', checkAvailability);

// GET /api/sales-orders - Get all sales orders with filters
router.get('/', validateSalesOrderQuery, getAllSalesOrders);

// POST /api/sales-orders - Create new sales order
router.post('/', validateCreateSalesOrder, createSalesOrder);

// GET /api/sales-orders/:id - Get sales order by ID
router.get('/:id', validateIdParam, getSalesOrderById);

// PATCH /api/sales-orders/:id - Update sales order (metadata only)
router.patch('/:id', validateIdParam, validateUpdateSalesOrder, updateSalesOrder);

// POST /api/sales-orders/:id/confirm - Confirm sales order
router.post('/:id/confirm', validateIdParam, confirmSalesOrder);

// POST /api/sales-orders/:id/cancel - Cancel sales order
router.post('/:id/cancel', validateIdParam, cancelSalesOrder);

// POST /api/sales-orders/:id/pick - Pick devices for order
router.post('/:id/pick', validateIdParam, validatePickDevices, pickDevices);

// GET /api/sales-orders/:id/devices - Get picked devices for order
router.get('/:id/devices', validateIdParam, getPickedDevices);

// POST /api/sales-orders/:id/ship - Ship the order
router.post('/:id/ship', validateIdParam, validateShipOrder, shipSalesOrder);

export default router;
