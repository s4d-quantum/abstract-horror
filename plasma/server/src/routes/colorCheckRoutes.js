import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import * as colorCheckController from '../controllers/colorCheckController.js';

const router = express.Router();

router.use(verifyToken);

// Check colors for IMEIs
router.post('/', colorCheckController.checkColors);

export default router;
