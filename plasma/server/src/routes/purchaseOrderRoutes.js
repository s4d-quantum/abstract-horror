import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  confirmPurchaseOrder,
  cancelPurchaseOrder,
  receiveDevices,
  getReceivedDevices,
  bookInStock
} from '../controllers/purchaseOrderController.js';
import {
  validateCreatePurchaseOrder,
  validateUpdatePurchaseOrder,
  validateReceiveDevices,
  validateBookInStock,
  validateIdParam,
  validatePurchaseOrderQuery
} from '../middleware/validation.js';

const router = express.Router();

// All purchase order routes require authentication
router.use(verifyToken);

// Purchase order endpoints
router.get('/', validatePurchaseOrderQuery, getAllPurchaseOrders);
router.post('/', validateCreatePurchaseOrder, createPurchaseOrder);
router.post('/book-in', validateBookInStock, bookInStock);
router.get('/:id', validateIdParam, getPurchaseOrderById);
router.patch('/:id', validateIdParam, validateUpdatePurchaseOrder, updatePurchaseOrder);
router.post('/:id/confirm', validateIdParam, confirmPurchaseOrder);
router.post('/:id/cancel', validateIdParam, cancelPurchaseOrder);
router.post('/:id/receive', validateIdParam, validateReceiveDevices, receiveDevices);
router.get('/:id/devices', validateIdParam, getReceivedDevices);

export default router;
