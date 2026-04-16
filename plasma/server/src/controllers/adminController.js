import { AdminOperation } from '../models/AdminOperation.js';
import { AdminService } from '../services/adminService.js';
import { asyncHandler } from '../middleware/validation.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

/**
 * Admin Operations Controller
 * Handles HTTP requests for admin operations
 */

/**
 * Verify PIN and return redirect path
 * POST /api/admin/verify-pin
 */
export const verifyPin = asyncHandler(async (req, res) => {
    const { pin, operation, reason } = req.body;

    // Validate required fields
    if (!pin || !operation) {
        return errorResponse(res, 'PIN and operation are required', 'MISSING_FIELDS', 400);
    }

    // Verify PIN
    const isValid = await AdminService.verifyPin(pin);

    if (!isValid) {
        return errorResponse(res, 'Invalid PIN code', 'INVALID_PIN', 403);
    }

    // Get redirect information
    const redirectInfo = AdminService.getRedirectPath(operation, { reason });

    if (!redirectInfo) {
        return errorResponse(res, 'Unknown operation requested', 'UNKNOWN_OPERATION', 400);
    }

    // Check if reason is required
    if (redirectInfo.requiresReason && !reason) {
        return errorResponse(res, 'Reason is required for this operation', 'MISSING_REASON', 400);
    }

    // For Color Check and Label Print, log the operation immediately
    const shouldLogNow = operation !== 'Location Management';
    let adminOpId = null;

    if (shouldLogNow) {
        const operationLog = AdminService.formatOperationLog(operation, {
            description: operation,
            reason: operation === 'Color Check' ? 'color check' : 'label printing',
            performed_by: req.user.id
        });

        adminOpId = await AdminOperation.create(operationLog);
    }

    successResponse(res, {
        redirect: redirectInfo.path,
        queryParams: redirectInfo.queryParams,
        adminOpId
    });
});

/**
 * Get paginated list of admin operations
 * GET /api/admin/operations
 */
export const getOperations = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await AdminOperation.getAll({ page, limit });

    successResponse(res, result);
});

/**
 * Get specific admin operation details
 * GET /api/admin/operations/:id
 */
export const getOperationDetail = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const operation = await AdminOperation.getById(id);

    if (!operation) {
        return errorResponse(res, 'Operation not found', 'OPERATION_NOT_FOUND', 404);
    }

    successResponse(res, { operation });
});

/**
 * Get recent admin operations (for dashboard)
 * GET /api/admin/operations/recent
 */
export const getRecentOperations = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;

    const operations = await AdminOperation.getRecent(limit);

    successResponse(res, { operations });
});
