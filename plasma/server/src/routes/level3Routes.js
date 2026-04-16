import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  getActiveRepairs,
  getCompletedRepairs,
  getRepairById,
  bookRepair,
  updateRepair,
  getAvailableLocations
} from '../controllers/level3Controller.js';
import {
  validateBookRepair,
  validateUpdateRepair,
  validateIdParam
} from '../middleware/validation.js';

const router = express.Router();

// All routes protected by authentication
router.use(verifyToken);

// List routes
router.get('/active', getActiveRepairs);
router.get('/completed', getCompletedRepairs);
router.get('/locations', getAvailableLocations);

// Single repair routes
router.get('/:id', validateIdParam, getRepairById);
router.post('/book', validateBookRepair, bookRepair);
router.patch('/:id', validateIdParam, validateUpdateRepair, updateRepair);

export default router;
