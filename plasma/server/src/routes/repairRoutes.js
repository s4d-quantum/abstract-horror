import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  validateCreateRepairJob,
  validateUpdateRepairJob,
  validateUpdateRepairRecord,
  validateAddDevicesToRepairJob,
  validateAddRepairComment,
  validateRepairPartReserve,
  validateRepairPartFit,
  validateRepairPartRemove,
  validateIdParam,
  validateBulkRepair
} from '../middleware/validation.js';
import {
  addDevicesToRepairJob,
  addRepairComment,
  bulkRepair,
  createRepairJob,
  escalateRepairToLevel3,
  fitRepairPart,
  getBulkParts,
  getRepairJobById,
  getRepairMeta,
  getRepairRecordById,
  listRepairJobs,
  removeRepairPart,
  reserveRepairPart,
  updateRepairJob,
  updateRepairRecord,
} from '../controllers/repairController.js';

const router = express.Router();
router.use(verifyToken);

router.get('/meta', getRepairMeta);

router.get('/jobs', listRepairJobs);
router.post('/jobs', validateCreateRepairJob, createRepairJob);
router.get('/jobs/:id', validateIdParam, getRepairJobById);
router.patch('/jobs/:id', validateIdParam, validateUpdateRepairJob, updateRepairJob);
router.post('/jobs/:id/devices', validateIdParam, validateAddDevicesToRepairJob, addDevicesToRepairJob);

router.get('/records/:id', validateIdParam, getRepairRecordById);
router.patch('/records/:id', validateIdParam, validateUpdateRepairRecord, updateRepairRecord);
router.post('/records/:id/comments', validateIdParam, validateAddRepairComment, addRepairComment);
router.post('/records/:id/parts/reserve', validateIdParam, validateRepairPartReserve, reserveRepairPart);
router.post('/records/:id/parts/fit', validateIdParam, validateRepairPartFit, fitRepairPart);
router.post('/records/:id/parts/remove', validateIdParam, validateRepairPartRemove, removeRepairPart);
router.post('/records/:id/escalate-l3', validateIdParam, escalateRepairToLevel3);

router.get('/jobs/:id/bulk-parts', validateIdParam, getBulkParts);
router.post('/jobs/:id/bulk-repair', validateIdParam, validateBulkRepair, bulkRepair);

export default router;
