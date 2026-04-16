import { tacModel } from '../models/tacModel.js';
import { asyncHandler } from '../middleware/validation.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

export const lookupByTac = asyncHandler(async (req, res) => {
  const { tac } = req.params;

  if (!/^\d{8}$/.test(tac)) {
    return errorResponse(res, 'Invalid TAC format. TAC must be 8 digits.', 'INVALID_TAC', 400);
  }

  const result = await tacModel.lookupByTac(tac);

  if (!result) {
    return errorResponse(
      res,
      'Device information not found for this TAC code',
      'TAC_NOT_FOUND',
      404
    );
  }

  return successResponse(res, { data: result }, 'TAC lookup successful');
});

export const lookupByModel = asyncHandler(async (req, res) => {
  const { modelId } = req.params;

  if (!modelId) {
    return errorResponse(res, 'Model ID is required', 'MISSING_MODEL_ID', 400);
  }

  const result = await tacModel.lookupByModel(modelId);

  if (!result) {
    return errorResponse(res, 'No TAC data found for this model', 'TAC_NOT_FOUND', 404);
  }

  return successResponse(res, { data: result }, 'Model TAC lookup successful');
});
