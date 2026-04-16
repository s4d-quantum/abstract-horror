import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';

// Verify JWT token
export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'NO_TOKEN',
        message: 'No token provided'
      }
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token expired'
        }
      });
    }
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid token'
      }
    });
  }
}

// Check if user has required role
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
    }

    next();
  };
}

// Verify PIN for admin operations
export async function verifyPin(req, res, next) {
  const { pin } = req.body;

  if (!pin) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'NO_PIN',
        message: 'PIN is required for this operation'
      }
    });
  }

  try {
    const users = await query(
      'SELECT pin_hash FROM users WHERE id = ? AND is_active = TRUE',
      [req.user.id]
    );

    if (users.length === 0 || !users[0].pin_hash) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PIN_NOT_SET',
          message: 'PIN not set for this user'
        }
      });
    }

    const isValid = await bcrypt.compare(pin, users[0].pin_hash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_PIN',
          message: 'Invalid PIN'
        }
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

// Generate tokens
export function generateTokens(user) {
  const accessToken = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    {
      id: user.id,
      username: user.username
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
}

// Hash password
export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// Compare password
export async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
