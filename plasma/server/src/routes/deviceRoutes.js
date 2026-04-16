import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  getAllDevices,
  getDeviceById,
  getDeviceHistory,
  updateDevice,
  updateDeviceStatus,
  getFilterOptions,
  searchByImei
} from '../controllers/deviceController.js';
import {
  validateUpdateDevice,
  validateUpdateDeviceStatus,
  validateIdParam
} from '../middleware/validation.js';

const router = express.Router();

// All device routes require authentication
router.use(verifyToken);

// Device endpoints
router.get('/', getAllDevices);
router.get('/search/imei', searchByImei);
router.get('/filters/options', getFilterOptions);
router.get('/:id', validateIdParam, getDeviceById);
router.get('/:id/history', validateIdParam, getDeviceHistory);
router.patch('/:id', validateIdParam, validateUpdateDevice, updateDevice);
router.patch('/:id/status', validateIdParam, validateUpdateDeviceStatus, updateDeviceStatus);

export default router;
