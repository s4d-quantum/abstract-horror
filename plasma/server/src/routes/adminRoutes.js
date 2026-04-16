import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import * as adminController from '../controllers/adminController.js';
import { validateVerifyPin } from '../middleware/validation.js';

const router = express.Router();

router.use(verifyToken);

// PIN verification
router.post('/verify-pin', validateVerifyPin, adminController.verifyPin);

// Operations list and details
router.get('/operations/recent', adminController.getRecentOperations);
router.get('/operations/:id', adminController.getOperationDetail);
router.get('/operations', adminController.getOperations);

export default router;
