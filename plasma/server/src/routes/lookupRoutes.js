import express from 'express';
import { verifyToken } from '../middleware/auth.js';
const router = express.Router();
router.use(verifyToken);
router.get('/', (req, res) => res.json({ success: true, data: [] }));
export default router;
