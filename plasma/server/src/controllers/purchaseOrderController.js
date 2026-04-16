import { purchaseOrderModel } from '../models/purchaseOrderModel.js';
import { asyncHandler } from '../middleware/validation.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

// Get all purchase orders with filters and pagination
export const getAllPurchaseOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    search,
    status,
    supplier_id,
    date_from,
    date_to,
    sortBy,
    sortDir
  } = req.query;

  const filters = {
    search,
    status,
    supplier_id,
    date_from,
    date_to,
    sortBy,
    sortDir
  };

  // Remove undefined values
  Object.keys(filters).forEach(key =>
    filters[key] === undefined && delete filters[key]
  );

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

  const result = await purchaseOrderModel.getAll(filters, {
    page: parsedPage,
    limit: parsedLimit
  });

  successResponse(res, {
    orders: result.orders.map(order => ({
      id: order.id,
      poNumber: order.po_number,
      status: order.status,
      supplier: {
        id: order.supplier_id,
        name: order.supplier_name,
        code: order.supplier_code
      },
      expectedQty: order.expected_quantity,
      receivedQty: order.received_quantity,
      supplierRef: order.supplier_ref,
      notes: order.notes,
      createdBy: order.created_by_name,
      createdAt: order.created_at,
      confirmedAt: order.confirmed_at,
      updatedAt: order.updated_at
    })),
    pagination: result.pagination
  });
});

// Get single purchase order by ID
export const getPurchaseOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await purchaseOrderModel.getById(id);

  if (!order) {
    return errorResponse(res, 'Purchase order not found', 'PO_NOT_FOUND', 404);
  }

  successResponse(res, {
    order: {
      id: order.id,
      poNumber: order.po_number,
      status: order.status,
      supplier: {
        id: order.supplier_id,
        name: order.supplier_name,
        code: order.supplier_code
      },
      expectedQty: order.expected_quantity,
      receivedQty: order.received_quantity,
      supplierRef: order.supplier_ref,
      notes: order.notes,
      createdBy: order.created_by_name,
      createdAt: order.created_at,
      confirmedAt: order.confirmed_at,
      updatedAt: order.updated_at,
      lines: order.lines.map(line => ({
        id: line.id,
        manufacturer: {
          id: line.manufacturer_id,
          name: line.manufacturer_name
        },
        model: {
          id: line.model_id,
          number: line.model_number,
          name: line.model_name
        },
        storage: line.storage_gb,
        color: line.color,
        expectedQty: line.expected_quantity,
        receivedQty: line.received_quantity,
        createdAt: line.created_at
      }))
    }
  });
});

// Create new purchase order
export const createPurchaseOrder = asyncHandler(async (req, res) => {
  const { supplier_id, supplier_ref, notes, lines, status } = req.body;

  if (!supplier_id) {
    return errorResponse(res, 'Supplier is required', 'MISSING_SUPPLIER', 400);
  }

  const result = await purchaseOrderModel.create(
    { supplier_id, supplier_ref, notes, lines, status },
    req.user.id
  );

  successResponse(res, result, 'Purchase order created successfully', 201);
});

// Update purchase order
export const updatePurchaseOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Check if PO exists
  const order = await purchaseOrderModel.getById(id);
  if (!order) {
    return errorResponse(res, 'Purchase order not found', 'PO_NOT_FOUND', 404);
  }

  // Can only update draft or confirmed orders
  if (!['DRAFT', 'CONFIRMED'].includes(order.status)) {
    return errorResponse(
      res,
      'Cannot update purchase order in current status',
      'INVALID_STATUS',
      400
    );
  }

  const updated = await purchaseOrderModel.update(id, updates);

  if (!updated) {
    return errorResponse(res, 'No valid fields to update', 'NO_UPDATES', 400);
  }

  // Get updated order
  const updatedOrder = await purchaseOrderModel.getById(id);

  successResponse(res, { order: updatedOrder }, 'Purchase order updated successfully');
});

// Confirm purchase order
export const confirmPurchaseOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await purchaseOrderModel.getById(id);
  if (!order) {
    return errorResponse(res, 'Purchase order not found', 'PO_NOT_FOUND', 404);
  }

  if (order.status !== 'DRAFT') {
    return errorResponse(
      res,
      'Only draft purchase orders can be confirmed',
      'INVALID_STATUS',
      400
    );
  }

  await purchaseOrderModel.confirm(id);

  successResponse(res, {}, 'Purchase order confirmed successfully');
});

// Cancel purchase order
export const cancelPurchaseOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await purchaseOrderModel.getById(id);
  if (!order) {
    return errorResponse(res, 'Purchase order not found', 'PO_NOT_FOUND', 404);
  }

  if (!['DRAFT', 'CONFIRMED'].includes(order.status)) {
    return errorResponse(
      res,
      'Cannot cancel purchase order in current status',
      'INVALID_STATUS',
      400
    );
  }

  await purchaseOrderModel.cancel(id);

  successResponse(res, {}, 'Purchase order cancelled successfully');
});

// Receive devices against a purchase order
export const receiveDevices = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { devices, location_id } = req.body;

  if (!devices || !Array.isArray(devices) || devices.length === 0) {
    return errorResponse(res, 'Devices array is required', 'MISSING_DEVICES', 400);
  }

  // Note: All validation handled by validateReceiveDevices middleware
  // - IMEI format (14-15 digits)
  // - Required fields: manufacturer_id, model_id, location_id
  // - Optional fields: storage_gb, color, grade, supplier_id

  const result = await purchaseOrderModel.receiveDevices(
    id,
    devices,
    req.user.id,
    location_id
  );

  successResponse(
    res,
    result,
    `Successfully received ${result.count} device(s)`
  );
});

// Get devices received for a purchase order
export const getReceivedDevices = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if PO exists
  const order = await purchaseOrderModel.getById(id);
  if (!order) {
    return errorResponse(res, 'Purchase order not found', 'PO_NOT_FOUND', 404);
  }

  const devices = await purchaseOrderModel.getReceivedDevices(id, parseInt(limit));

  successResponse(res, {
    devices: devices.map(device => ({
      id: device.id,
      imei: device.imei,
      manufacturer: device.manufacturer,
      modelNumber: device.model_number,
      modelName: device.model_name,
      storage: device.storage_gb,
      color: device.color,
      grade: device.grade,
      status: device.status,
      location: device.location,
      receivedAt: device.received_at
    }))
  });
});

// Book in stock - Create PO and receive devices in one transaction (new simplified flow)
export const bookInStock = asyncHandler(async (req, res) => {
  const { supplier_id, supplier_ref, requires_qc, requires_repair, fault_description, notes, devices } = req.body;
  const userId = req.user.id;

  // Validation
  if (!supplier_id) {
    return errorResponse(res, 'Supplier is required', 'MISSING_SUPPLIER', 400);
  }

  if (!devices || !Array.isArray(devices) || devices.length === 0) {
    return errorResponse(res, 'At least one device must be scanned', 'NO_DEVICES', 400);
  }

  // Validate each device
  for (const device of devices) {
    if (!device.imei || !/^\d{15}$/.test(device.imei)) {
      return errorResponse(res, `Invalid IMEI format: ${device.imei}`, 'INVALID_IMEI', 400);
    }

    if (!device.manufacturer_id || !device.model_id) {
      return errorResponse(res, `Device ${device.imei}: Manufacturer and model are required`, 'MISSING_DEVICE_INFO', 400);
    }

    if (!device.storage_gb || !device.color) {
      return errorResponse(res, `Device ${device.imei}: Storage and color are required`, 'MISSING_ATTRIBUTES', 400);
    }

    if (!device.location_id) {
      return errorResponse(res, `Device ${device.imei}: Location is required`, 'MISSING_LOCATION', 400);
    }
  }

  // Create PO and receive devices in one transaction
  const result = await purchaseOrderModel.createWithDevices(
    { supplier_id, supplier_ref, requires_qc, requires_repair, fault_description, notes },
    devices,
    userId
  );

  return successResponse(res, { result }, `Successfully booked in ${devices.length} device(s)`, 201);
