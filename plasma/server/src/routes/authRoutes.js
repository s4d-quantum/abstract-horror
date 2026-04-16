import express from 'express';
import { body } from 'express-validator';
import { login, refresh, logout, verifyPinCode, getCurrentUser } from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

// Login
router.post('/login',
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  login
);

// Refresh token
router.post('/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required')
  ],
  validate,
  refresh
);

// Logout
router.post('/logout', logout);

// Verify PIN
router.post('/verify-pin',
  verifyToken,
  [
    body('pin').notEmpty().withMessage('PIN is required')
  ],
  validate,
  verifyPinCode
);

// Get current user
router.get('/me', verifyToken, getCurrentUser);

export default router;
