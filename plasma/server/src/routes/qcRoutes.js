import express from 'express';
import { requireRole, verifyToken } from '../middleware/auth.js';
import {
  validateCreateQcJob,
  validateUpdateQcJob,
  validateSaveQcResults,
  validateIdParam
} from '../middleware/validation.js';
import {
  listQcJobs,
  getQcJobById,
  createQcJob,
  updateQcJob,
  saveQcResults,
  completeQcJob,
} from '../controllers/qcController.js';

const router = express.Router();
router.use(verifyToken);

router.get('/jobs',               listQcJobs);
router.get('/jobs/:id',           validateIdParam, getQcJobById);
router.post('/jobs',              requireRole('ADMIN', 'QC'), validateCreateQcJob, createQcJob);
router.patch('/jobs/:id',         requireRole('ADMIN', 'QC'), validateIdParam, validateUpdateQcJob, updateQcJob);
router.post('/jobs/:id/results',  requireRole('ADMIN', 'QC'), validateIdParam, validateSaveQcResults, saveQcResults);
router.post('/jobs/:id/complete', requireRole('ADMIN', 'QC'), validateIdParam, completeQcJob);

export default router;
