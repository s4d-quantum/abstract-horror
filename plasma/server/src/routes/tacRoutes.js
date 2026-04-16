import express from 'express';
import { lookupByTac, lookupByModel } from '../controllers/tacController.js';

const router = express.Router();

// GET /api/tac/model/:modelId - Lookup colors/storage by model ID
router.get('/model/:modelId', lookupByModel);

// GET /api/tac/:tac - Lookup device info by TAC code
router.get('/:tac', lookupByTac);

export default router;
