import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import * as locationManagementController from '../controllers/locationManagementController.js';
import {
  validateLocationDeviceParam,
  validateBulkMoveDevices
} from '../middleware/validation.js';

const router = express.Router();

router.use(verifyToken);

// Get device details by IMEI
router.get('/device/:imei', validateLocationDeviceParam, locationManagementController.getDeviceByImei);

// Get active locations
router.get('/locations', locationManagementController.getActiveLocations);

// Bulk move devices
router.post('/bulk-move', validateBulkMoveDevices, locationManagementController.bulkMoveDevices);

export default router;
