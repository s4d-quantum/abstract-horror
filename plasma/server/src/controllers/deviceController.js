import { deviceModel } from '../models/deviceModel.js';
import { asyncHandler } from '../middleware/validation.js';
import { successResponse, errorResponse, buildPaginationResponse } from '../utils/helpers.js';

// Get all devices with filters and pagination
export const getAllDevices = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    search,
    status,
    manufacturer_id,
    supplier_id,
    location_id,
    grade,
    color,
    oem_color,
    storage_gb,
    date_from,
    date_to,
    sortBy,
    sortDir
  } = req.query;

  const filters = {
    search,
    status,
    manufacturer_id,
    supplier_id,
    location_id,
    grade,
    color,
    oem_color,
    storage_gb,
    date_from,
    date_to,
    sortBy,
    sortDir
  };

  // Remove undefined values
  Object.keys(filters).forEach(key =>
    filters[key] === undefined && delete filters[key]
  );

  const result = await deviceModel.getAll(filters, {
    page: parseInt(page),
    limit: parseInt(limit)
  });

  successResponse(res, {
    devices: result.devices.map(device => ({
      id: device.id,
      imei: device.imei,
      tacCode: device.tac_code,
      manufacturer: device.manufacturer,
      modelNumber: device.model_number,
      modelName: device.model_name,
      storage: device.storage_gb,
      color: device.color,
      oemColor: device.oem_color,
      grade: device.grade,
      status: device.status,
      location: device.location,
      supplierId: device.supplier_id,
      supplier: device.supplier,
      createdAt: device.created_at,
      receivedAt: device.received_at
    })),
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
      hasMore: result.page < result.totalPages
    }
  });
});

// Get single device by ID
export const getDeviceById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const device = await deviceModel.getById(id);

  if (!device) {
    return errorResponse(res, 'Device not found', 'DEVICE_NOT_FOUND', 404);
  }

  successResponse(res, {
    device: {
      id: device.id,
      imei: device.imei,
      tacCode: device.tac_code,
      manufacturer: {
        id: device.manufacturer_id,
        name: device.manufacturer,
        code: device.manufacturer_code
      },
      model: {
        id: device.model_id,
        number: device.model_number,
        name: device.model_name
      },
      storage: device.storage_gb,
      color: device.color,
      oemColor: device.oem_color,
      grade: device.grade,
      status: device.status,
      location: device.location_code ? {
        id: device.location_id,
        code: device.location_code,
        name: device.location_name
      } : null,
      supplier: device.supplier_name ? {
        id: device.supplier_id,
        code: device.supplier_code,
        name: device.supplier_name
      } : null,
      purchaseOrderId: device.purchase_order_id,
      qcRequired: device.qc_required,
      qcCompleted: device.qc_completed,
      qcCompletedAt: device.qc_completed_at,
      repairRequired: device.repair_required,
      repairCompleted: device.repair_completed,
      repairCompletedAt: device.repair_completed_at,
      receivedAt: device.received_at,
      createdAt: device.created_at,
      updatedAt: device.updated_at
    }
  });
});

// Get device history
export const getDeviceHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 50 } = req.query;

  // Check if device exists
  const device = await deviceModel.getById(id);
  if (!device) {
    return errorResponse(res, 'Device not found', 'DEVICE_NOT_FOUND', 404);
  }

  const history = await deviceModel.getHistory(id, parseInt(limit));

  successResponse(res, {
    history: history.map(entry => ({
      id: entry.id,
      eventType: entry.event_type,
      fieldChanged: entry.field_changed,
      oldValue: entry.old_value,
      newValue: entry.new_value,
      referenceType: entry.reference_type,
      referenceId: entry.reference_id,
      notes: entry.notes,
      userName: entry.user_name,
      createdAt: entry.created_at
    }))
  });
});

// Update device
export const updateDevice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Check if device exists
  const device = await deviceModel.getById(id);
  if (!device) {
    return errorResponse(res, 'Device not found', 'DEVICE_NOT_FOUND', 404);
  }

  const updated = await deviceModel.update(id, updates);

  if (!updated) {
    return errorResponse(res, 'No valid fields to update', 'NO_UPDATES', 400);
  }

  // Get updated device
  const updatedDevice = await deviceModel.getById(id);

  successResponse(res, {
    device: updatedDevice
  }, 'Device updated successfully');
});

// Update device status
export const updateDeviceStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  if (!status) {
    return errorResponse(res, 'Status is required', 'MISSING_STATUS', 400);
  }

  await deviceModel.updateStatus(id, status, req.user.id, notes);

  successResponse(res, {}, 'Device status updated successfully');
});

// Get filter options
export const getFilterOptions = asyncHandler(async (req, res) => {
  const options = await deviceModel.getFilterOptions();

  successResponse(res, { options });
});

// Search devices by IMEI
export const searchByImei = asyncHandler(async (req, res) => {
  const { imei } = req.query;

  if (!imei) {
    return errorResponse(res, 'IMEI is required', 'MISSING_IMEI', 400);
  }

  const device = await deviceModel.getByImei(imei);

  if (!device) {
    return errorResponse(res, 'Device not found', 'DEVICE_NOT_FOUND', 404);
  }

  successResponse(res, { device });
});
