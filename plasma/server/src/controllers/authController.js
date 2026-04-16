import jwt from 'jsonwebtoken';
import { userModel } from '../models/userModel.js';
import { comparePassword, generateTokens, hashPassword } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/validation.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

// Store refresh tokens (in production, use Redis)
const refreshTokens = new Set();

// Login
export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return errorResponse(res, 'Username and password are required', 'MISSING_CREDENTIALS', 400);
  }

  // Find user
  const user = await userModel.findByUsername(username);

  if (!user) {
    return errorResponse(res, 'Invalid credentials', 'INVALID_CREDENTIALS', 401);
  }

  // Verify password
  const isValidPassword = await comparePassword(password, user.password_hash);

  if (!isValidPassword) {
    return errorResponse(res, 'Invalid credentials', 'INVALID_CREDENTIALS', 401);
  }

  // Generate tokens
  const tokens = generateTokens(user);

  // Store refresh token
  refreshTokens.add(tokens.refreshToken);

  // Update last login
  await userModel.updateLastLogin(user.id);

  successResponse(res, {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role
    },
    ...tokens
  }, 'Login successful');
});

// Refresh token
export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return errorResponse(res, 'Refresh token required', 'NO_REFRESH_TOKEN', 400);
  }

  if (!refreshTokens.has(refreshToken)) {
    return errorResponse(res, 'Invalid refresh token', 'INVALID_REFRESH_TOKEN', 401);
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Find user
    const user = await userModel.findById(decoded.id);

    if (!user) {
      return errorResponse(res, 'User not found', 'USER_NOT_FOUND', 404);
    }

    // Remove old refresh token
    refreshTokens.delete(refreshToken);

    // Generate new tokens
    const tokens = generateTokens(user);

    // Store new refresh token
    refreshTokens.add(tokens.refreshToken);

    successResponse(res, tokens, 'Token refreshed');
  } catch (error) {
    refreshTokens.delete(refreshToken);
    return errorResponse(res, 'Invalid refresh token', 'INVALID_REFRESH_TOKEN', 401);
  }
});

// Logout
export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    refreshTokens.delete(refreshToken);
  }

  successResponse(res, {}, 'Logged out successfully');
});

// Verify PIN
export const verifyPinCode = asyncHandler(async (req, res) => {
  const { pin } = req.body;

  if (!pin) {
    return errorResponse(res, 'PIN is required', 'NO_PIN', 400);
  }

  const user = await userModel.findById(req.user.id);

  if (!user || !user.pin_hash) {
    return errorResponse(res, 'PIN not set', 'PIN_NOT_SET', 400);
  }

  const isValid = await comparePassword(pin, user.pin_hash);

  if (!isValid) {
    return errorResponse(res, 'Invalid PIN', 'INVALID_PIN', 401);
  }

  successResponse(res, { verified: true }, 'PIN verified');
});

// Get current user
export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.user.id);

  if (!user) {
    return errorResponse(res, 'User not found', 'USER_NOT_FOUND', 404);
  }

  successResponse(res, { user });
});
