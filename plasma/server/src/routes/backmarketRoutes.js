import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { bookBackmarketShipment } from '../controllers/backmarketController.js';

const router = express.Router();

// Protect all routes
router.use(verifyToken);

// Book BackMarket shipment (automated workflow)
router.post('/sales-order/:salesOrderId/book-shipment', bookBackmarketShipment);

export default router;
