import { transaction } from '../config/database.js';
import { asyncHandler } from '../middleware/validation.js';
import { partModel } from '../models/partModel.js';
import { AppError, errorResponse, successResponse } from '../utils/helpers.js';

export const getPartsMeta = asyncHandler(async (_req, res) => {
  const meta = await partModel.getMeta();
  successResponse(res, meta);
});

export const getPartBases = asyncHandler(async (req, res) => {
  const { search, category_id, manufacturer_id, model_id, include_inactive } = req.query;
  const [bases, meta] = await Promise.all([
    partModel.getBases({
      search,
      category_id,
      manufacturer_id,
      model_id,
      include_inactive: include_inactive === 'true' || include_inactive === true,
    }),
    partModel.getMeta(),
  ]);
  successResponse(res, { bases, ...meta });
});

export const getPartBaseById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [base, compatibility, variants] = await Promise.all([
    partModel.getBaseById(id),
    partModel.getCompatibility({ part_base_id: id }),
    partModel.getVariants({ part_base_id: id }),
  ]);

  if (!base) {
    return errorResponse(res, 'Part base not found', 'PART_BASE_NOT_FOUND', 404);
  }

  successResponse(res, { base, compatibility, variants });
});

export const getPartDeviceModels = asyncHandler(async (req, res) => {
  const result = await partModel.getDeviceModels(req.query, {
    page: req.query.page,
    limit: req.query.limit,
  });
  successResponse(res, result);
});

export const getPartDeviceModelById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [model, compatibility, variants] = await Promise.all([
    partModel.getDeviceModelById(id),
    partModel.getCompatibility({ model_id: id }),
    partModel.getVariants({ model_id: id }),
  ]);

  if (!model) {
    return errorResponse(res, 'Device model not found', 'MODEL_NOT_FOUND', 404);
  }

  successResponse(res, { model, compatibility, variants });
});

export const createPartBase = asyncHandler(async (req, res) => {
  const { base_code, name, category_id } = req.body;
  const baseId = await partModel.createBase({
    base_code,
    name,
    category_id,
    manufacturer_id: req.body.manufacturer_id || null,
    subtype: req.body.subtype || null,
    changes_device_color: req.body.changes_device_color || false,
    notes: req.body.notes || null,
    is_active: req.body.is_active !== false,
  });

  successResponse(res, { baseId }, 'Part base created successfully', 201);
});

export const updatePartBase = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await partModel.getBaseById(id);
  if (!existing) {
    return errorResponse(res, 'Part base not found', 'PART_BASE_NOT_FOUND', 404);
  }

  const updated = await partModel.updateBase(id, req.body);
  if (!updated) {
    return errorResponse(res, 'No valid part base updates supplied', 'NO_UPDATES', 400);
  }

  successResponse(res, {}, 'Part base updated successfully');
});

export const getPartVariants = asyncHandler(async (req, res) => {
  const variants = await partModel.getVariants({
    search: req.query.search,
    part_base_id: req.query.part_base_id,
    model_id: req.query.model_id,
    in_stock_only: req.query.in_stock_only === 'true' || req.query.in_stock_only === true,
    include_inactive: req.query.include_inactive === 'true' || req.query.include_inactive === true,
  });
  const lots = await partModel.getLotsForPartIds(variants.map((variant) => variant.id));

  successResponse(res, { variants, lots });
});

export const createPartVariant = asyncHandler(async (req, res) => {
  const base = await partModel.getBaseById(req.body.part_base_id);
  if (!base || !base.is_active) {
    return errorResponse(res, 'Part base not found', 'PART_BASE_NOT_FOUND', 404);
  }

  const variantId = await partModel.createVariant({
    part_base_id: req.body.part_base_id,
    sku: req.body.sku,
    name: req.body.name,
    category_id: req.body.category_id || base.category_id,
    color: req.body.color || null,
    quality_tier: req.body.quality_tier || 'OTHER',
    supplier_part_ref: req.body.supplier_part_ref || null,
    is_active: req.body.is_active !== false,
  });

  successResponse(res, { variantId }, 'Part variant created successfully', 201);
});

export const updatePartVariant = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await partModel.getVariantById(id);
  if (!existing) {
    return errorResponse(res, 'Part variant not found', 'PART_VARIANT_NOT_FOUND', 404);
  }

  const updated = await partModel.updateVariant(id, req.body);
  if (!updated) {
    return errorResponse(res, 'No valid part variant updates supplied', 'NO_UPDATES', 400);
  }

  successResponse(res, {}, 'Part variant updated successfully');
});

export const getPartCompatibility = asyncHandler(async (req, res) => {
  const { part_base_id, model_id, include_inactive } = req.query;
  const compatibility = await partModel.getCompatibility({
    part_base_id,
    model_id,
    include_inactive: include_inactive === 'true' || include_inactive === true,
  });
  successResponse(res, { compatibility });
});

export const createPartCompatibility = asyncHandler(async (req, res) => {
  const base = await partModel.getBaseById(req.body.part_base_id);
  if (!base || !base.is_active) {
    return errorResponse(res, 'Part base not found', 'PART_BASE_NOT_FOUND', 404);
  }

  const existingRules = await partModel.getCompatibility({
    part_base_id: req.body.part_base_id,
    model_id: req.body.model_id,
  });
  if (existingRules.length > 0) {
    return errorResponse(res, 'This part base is already linked to this device model', 'DUPLICATE_COMPATIBILITY', 409);
  }

  const compatibilityId = await partModel.addCompatibility({
    part_base_id: req.body.part_base_id,
    model_id: req.body.model_id,
    notes: req.body.notes || null,
  });

  successResponse(res, { compatibilityId }, 'Compatibility rule created successfully', 201);
});

export const updatePartCompatibility = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await partModel.getCompatibilityById(id);
  if (!existing) {
    return errorResponse(res, 'Compatibility rule not found', 'COMPATIBILITY_NOT_FOUND', 404);
  }

  const nextBaseId = req.body.part_base_id || existing.part_base_id;
  const nextModelId = req.body.model_id || existing.model_id;

  const [base, model] = await Promise.all([
    partModel.getBaseById(nextBaseId),
    partModel.getDeviceModelById(nextModelId),
  ]);

  if (!base || !base.is_active) {
    return errorResponse(res, 'Part base not found', 'PART_BASE_NOT_FOUND', 404);
  }
  if (!model) {
    return errorResponse(res, 'Device model not found', 'MODEL_NOT_FOUND', 404);
  }

  const updated = await partModel.updateCompatibility(id, {
    part_base_id: nextBaseId,
    model_id: nextModelId,
    notes: req.body.notes ?? existing.notes ?? null,
  });

  if (!updated) {
    return errorResponse(res, 'No valid compatibility updates supplied', 'NO_UPDATES', 400);
  }

  successResponse(res, {}, 'Compatibility rule updated successfully');
});

export const deletePartCompatibility = asyncHandler(async (req, res) => {
  const existing = await partModel.getCompatibilityById(req.params.id);
  if (!existing) {
    return errorResponse(res, 'Compatibility rule not found', 'COMPATIBILITY_NOT_FOUND', 404);
  }

  await partModel.removeCompatibility(req.params.id);
  successResponse(res, {}, 'Compatibility rule deleted successfully');
});

export const deletePartBase = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await transaction(async (connection) => {
    const existing = await partModel.getBaseDeleteSummary(id, connection);
    if (!existing) {
      throw new AppError('Part base not found', 404, 'PART_BASE_NOT_FOUND');
    }

    const hasStock =
      Number(existing.current_stock || 0) > 0 ||
      Number(existing.available_stock || 0) > 0 ||
      Number(existing.reserved_stock || 0) > 0 ||
      Number(existing.faulty_stock || 0) > 0;

    if (hasStock) {
      throw new AppError('Cannot delete a part base while related variants still hold stock', 409, 'PART_BASE_HAS_STOCK');
    }

    await partModel.deactivateBaseCascade(id, connection);
  });

  successResponse(res, {}, 'Part base deleted successfully');
});

export const deletePartVariant = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await transaction(async (connection) => {
    const existing = await partModel.getVariantDeleteSummary(id, connection);
    if (!existing) {
      throw new AppError('Part variant not found', 404, 'PART_VARIANT_NOT_FOUND');
    }

    const hasStock =
      Number(existing.current_stock || 0) > 0 ||
      Number(existing.available_stock || 0) > 0 ||
      Number(existing.reserved_stock || 0) > 0 ||
      Number(existing.faulty_stock || 0) > 0;

    if (hasStock) {
      throw new AppError('Cannot delete a part variant while it still holds stock', 409, 'PART_VARIANT_HAS_STOCK');
    }

    await partModel.updateVariant(id, { is_active: false }, connection);
  });

  successResponse(res, {}, 'Part variant deleted successfully');
});

export const partGoodsIn = asyncHandler(async (req, res) => {
  const { part_id, supplier_id, supplier_ref, lot_ref, quantity, notes } = req.body;

  const lotId = await transaction(async (connection) => {
    const part = await partModel.getPartByIdForUpdate(part_id, connection);
    if (!part) {
      throw new AppError('Part variant not found', 404, 'PART_VARIANT_NOT_FOUND');
    }

    const id = await partModel.createLot(
      {
        part_id,
        supplier_id,
        supplier_ref,
        lot_ref,
        received_quantity: quantity,
        available_quantity: quantity,
        notes,
        created_by: req.user.id,
      },
      connection,
    );

    await partModel.updatePartQuantities(part_id, { available: quantity }, connection);
    await partModel.createTransaction(
      {
        part_id,
        part_lot_id: id,
        movement_type: 'GOODS_IN',
        quantity,
        available_delta: quantity,
        reference_type: 'PART_GOODS_IN',
        notes: notes || null,
        user_id: req.user.id,
      },
      connection,
    );

    return id;
  });

  successResponse(res, { lotId }, 'Parts booked into stock', 201);
});

export const partBulkGoodsIn = asyncHandler(async (req, res) => {
  const { items, lot_ref: sharedLotRef } = req.body;

  const lotIds = await transaction(async (connection) => {
    const ids = [];
    for (const item of items) {
      const part = await partModel.getPartByIdForUpdate(item.part_id, connection);
      if (!part) {
        throw new AppError(`Part variant ${item.part_id} not found`, 404, 'PART_VARIANT_NOT_FOUND');
      }

      const lotId = await partModel.createLot(
        {
          part_id: item.part_id,
          supplier_id: req.body.supplier_id || null,
          supplier_ref: item.supplier_ref || null,
          lot_ref: sharedLotRef || item.lot_ref || null,
          received_quantity: item.quantity,
          available_quantity: item.quantity,
          notes: item.notes || req.body.notes || null,
          created_by: req.user.id,
        },
        connection,
      );

      await partModel.updatePartQuantities(item.part_id, { available: item.quantity }, connection);
      await partModel.createTransaction(
        {
          part_id: item.part_id,
          part_lot_id: lotId,
          movement_type: 'GOODS_IN',
          quantity: item.quantity,
          available_delta: item.quantity,
          reference_type: 'PART_GOODS_IN',
          notes: item.notes || null,
          user_id: req.user.id,
        },
        connection,
      );

      ids.push(lotId);
    }
    return ids;
  });

  successResponse(res, { lotIds }, `${lotIds.length} lot(s) booked into stock`, 201);
});

export const partGoodsOut = asyncHandler(async (req, res) => {
  const { part_id, part_lot_id, quantity, reason, is_faulty, fault_reason, notes } = req.body;

  const faultReportId = await transaction(async (connection) => {
    const part = await partModel.getPartByIdForUpdate(part_id, connection);
    const lot = await partModel.getLotById(part_lot_id, connection);

    if (!part || !lot || lot.part_id !== part.id) {
      throw new AppError('Part lot not found', 404, 'PART_LOT_NOT_FOUND');
    }
    if (lot.available_quantity < quantity) {
      throw new AppError('Not enough available stock in this lot', 409, 'INSUFFICIENT_PART_STOCK');
    }
    if (is_faulty && !fault_reason) {
      throw new AppError('A fault reason is required when booking out a faulty part', 400, 'FAULT_REASON_REQUIRED');
    }

    const deltas = is_faulty
      ? { available: -quantity, faulty: quantity }
      : { available: -quantity, issued: quantity };

    await partModel.updateLotQuantities(part_lot_id, deltas, connection);
    await partModel.updatePartQuantities(part_id, deltas, connection);
    await partModel.createTransaction(
      {
        part_id,
        part_lot_id,
        movement_type: is_faulty ? 'FAULTY_GOODS_OUT' : 'MANUAL_GOODS_OUT',
        quantity,
        available_delta: deltas.available,
        faulty_delta: deltas.faulty || 0,
        issued_delta: deltas.issued || 0,
        reference_type: 'PART_GOODS_OUT',
        notes: [reason, notes].filter(Boolean).join(' — '),
        user_id: req.user.id,
      },
      connection,
    );

    let frId = null;
    if (is_faulty) {
      frId = await partModel.createFaultReport(
        {
          part_id,
          part_lot_id,
          supplier_id: lot.supplier_id || null,
          quantity,
          reason: fault_reason,
          notes: [reason, notes].filter(Boolean).join(' — '),
          created_by: req.user.id,
        },
        connection,
      );
    }

    return frId;
  });

  successResponse(res, { faultReportId }, 'Parts booked out successfully');
});

export const getFaultyParts = asyncHandler(async (req, res) => {
  const result = await partModel.getFaultReports({
    ...req.query,
    page: req.query.page,
    limit: req.query.limit,
  });
  successResponse(res, result);
});

export const updateFaultyPart = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await partModel.updateFaultReport(id, {
    status: req.body.status,
    notes: req.body.notes,
    updated_by: req.user.id,
  });

  if (!updated) {
    return errorResponse(res, 'No valid fault report updates supplied', 'NO_UPDATES', 400);
  }

  successResponse(res, {}, 'Fault report updated successfully');
});

export const getGoodsInHistory = asyncHandler(async (req, res) => {
  const result = await partModel.getGoodsInHistory({
    page: req.query.page,
    limit: req.query.limit,
  });
  successResponse(res, result);
});

export const getGoodsInDetail = asyncHandler(async (req, res) => {
  const { lot_ref, lot_id } = req.query;
  if (!lot_ref && !lot_id) {
    return errorResponse(res, 'lot_ref or lot_id is required', 'MISSING_PARAM', 400);
  }
  const rows = await partModel.getGoodsInDetail({ lot_ref, lot_id });
  successResponse(res, { lots: rows });
});
