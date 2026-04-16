import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import * as labelPrintController from '../controllers/labelPrintController.js';

const router = express.Router();

router.use(verifyToken);

// Print single label
router.post('/single', labelPrintController.printSingleLabel);

// Print batch labels
router.post('/batch', labelPrintController.printBatchLabels);

export default router;
