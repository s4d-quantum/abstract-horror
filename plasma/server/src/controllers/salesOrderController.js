import { salesOrderModel } from '../models/salesOrderModel.js';
import { asyncHandler } from '../middleware/validation.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

export const getAvailableDevicesGrouped = asyncHandler(async (req, res) => {
  const {
    supplier_id,
    manufacturer_id,
    model_search,
    storage_gb,
    color,
    page = 1,
    limit = 50
  } = req.query;

  if (!supplier_id) {
    return errorResponse(res, 'Supplier ID is required', 'MISSING_SUPPLIER_ID', 400);
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

  const filters = {
    supplier_id: parseInt(supplier_id, 10),
    manufacturer_id: manufacturer_id ? parseInt(manufacturer_id, 10) : null,
    model_search: model_search || null,
    storage_gb: storage_gb ? parseInt(storage_gb, 10) : null,
    color: color || null
  };

  const result = await salesOrderModel.getAvailableDevicesGrouped(filters, {
    page: parsedPage,
    limit: parsedLimit
  });

  return successResponse(res, result, 'Available devices retrieved');
});

export const checkAvailability = asyncHandler(async (req, res) => {
  const { lines } = req.body;

  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    return errorResponse(res, 'Lines array is required', 'MISSING_LINES', 400);
  }

  const availability = await salesOrderModel.checkAvailability(lines);

  return successResponse(res, { availability }, 'Availability checked');
});

export const getAllSalesOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const filters = {
    status: req.query.status,
    customer_id: req.query.customer_id,
    order_type: req.query.order_type,
    search: req.query.search,
    date_from: req.query.date_from,
    date_to: req.query.date_to,
    is_backmarket: req.query.is_backmarket !== undefined
      ? req.query.is_backmarket === 'true'
      : undefined
  };

  const includeSummary = req.query.include_summary === 'true';
  const result = await salesOrderModel.getAll(filters, { page, limit }, includeSummary);

  const formattedOrders = result.orders.map((order) => ({
    id: order.id,
    soNumber: order.so_number,
    customerId: order.customer_id,
    customerName: order.customer_name,
    orderType: order.order_type,
    backmarketOrderId: order.backmarket_order_id,
    customerRef: order.customer_ref,
    poRef: order.po_ref,
    status: order.status,
    courier: order.courier,
    trackingNumber: order.tracking_number,
    totalBoxes: order.total_boxes,
    totalPallets: order.total_pallets,
    lineCount: parseInt(order.line_count, 10) || 0,
    totalRequested: parseInt(order.total_requested, 10) || 0,
    totalPicked: parseInt(order.total_picked, 10) || 0,
    createdBy: order.created_by_username,
    confirmedAt: order.confirmed_at,
    shippedAt: order.shipped_at,
    createdAt: order.created_at,
    updatedAt: order.updated_at
  }));

  return successResponse(res, {
    orders: formattedOrders,
    pagination: result.pagination,
    summary: result.summary
  }, 'Sales orders retrieved');
});

export const getSalesOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await salesOrderModel.getById(id);

  if (!order) {
    return errorResponse(res, 'Sales order not found', 'SALES_ORDER_NOT_FOUND', 404);
  }

  const formattedOrder = {
    id: order.id,
    soNumber: order.so_number,
    customer: {
      id: order.customer_id,
      name: order.customer_name,
      email: order.customer_email,
      phone: order.customer_phone
    },
    orderType: order.order_type,
    backmarketOrderId: order.backmarket_order_id,
    customerRef: order.customer_ref,
    poRef: order.po_ref,
    status: order.status,
    courier: order.courier,
    trackingNumber: order.tracking_number,
    totalBoxes: order.total_boxes,
    totalPallets: order.total_pallets,
    notes: order.notes,
    createdBy: order.created_by_username,
    confirmedAt: order.confirmed_at,
    shippedAt: order.shipped_at,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    lines: order.lines.map((line) => ({
      id: line.id,
      manufacturer: {
        id: line.manufacturer_id,
        name: line.manufacturer_name
      },
      model: {
        id: line.model_id,
        name: line.model_name,
        number: line.model_number
      },
      storage: line.storage_gb,
      color: line.color,
      grade: line.grade,
      supplier: line.supplier_id ? {
        id: line.supplier_id,
        name: line.supplier_name
      } : null,
      location: line.location_id ? {
        id: line.location_id,
        code: line.location_code,
        name: line.location_name
      } : null,
      available_locations: line.available_locations || [],
      requestedQty: line.requested_quantity,
      pickedQty: line.picked_quantity,
      createdAt: line.created_at
    })),
    totalRequested: order.lines.reduce((sum, line) => sum + line.requested_quantity, 0),
    totalPicked: order.lines.reduce((sum, line) => sum + line.picked_quantity, 0)
  };

  return successResponse(res, { order: formattedOrder }, 'Sales order retrieved');
});

export const createSalesOrder = asyncHandler(async (req, res) => {
  const result = await salesOrderModel.create(req.body, req.user.id);

  return successResponse(res, result, 'Sales order created successfully', 201);
});

export const updateSalesOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const updated = await salesOrderModel.update(id, req.body);

  if (!updated) {
    const order = await salesOrderModel.getById(id);
    if (!order) {
      return errorResponse(res, 'Sales order not found', 'SALES_ORDER_NOT_FOUND', 404);
    }
    return errorResponse(
      res,
      'Sales order cannot be updated unless it is in DRAFT status',
      'INVALID_STATUS',
      400
    );
  }

  return successResponse(res, {}, 'Sales order updated successfully');
});

export const confirmSalesOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const confirmed = await salesOrderModel.confirm(id);

  if (!confirmed) {
    const order = await salesOrderModel.getById(id);
    if (!order) {
      return errorResponse(res, 'Sales order not found', 'SALES_ORDER_NOT_FOUND', 404);
    }
    return errorResponse(
      res,
      'Sales order cannot be confirmed unless it is in DRAFT status',
      'INVALID_STATUS',
      400
    );
  }

  return successResponse(res, {}, 'Sales order confirmed successfully');
});

export const cancelSalesOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const cancelled = await salesOrderModel.cancel(id);

  if (!cancelled) {
    const order = await salesOrderModel.getById(id);
    if (!order) {
      return errorResponse(res, 'Sales order not found', 'SALES_ORDER_NOT_FOUND', 404);
    }
    return errorResponse(
      res,
      'Sales order cannot be cancelled unless it is in DRAFT or CONFIRMED status',
      'INVALID_STATUS',
      400
    );
  }

  return successResponse(res, {}, 'Sales order cancelled successfully');
});

export const pickDevices = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { devices } = req.body;

  if (!devices || !Array.isArray(devices) || devices.length === 0) {
    return errorResponse(res, 'No devices provided for picking', 'MISSING_DEVICES', 400);
  }

  await salesOrderModel.pickDevices(id, devices, req.user.id);

  return successResponse(res, {}, `Successfully picked ${devices.length} device(s)`);
});

export const getPickedDevices = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const devices = await salesOrderModel.getPickedDevices(id);

  const formattedDevices = devices.map((device) => ({
    id: device.id,
    deviceId: device.device_id,
    salesOrderLineId: device.sales_order_line_id,
    imei: device.imei,
    manufacturer: device.manufacturer,
    modelName: device.model_name,
    modelNumber: device.model_number,
    storage: device.storage,
    color: device.color,
    grade: device.grade,
    status: device.status,
    scannedAt: device.scanned_at,
    verified: device.verified,
    shipped: device.shipped,
    shippedAt: device.shipped_at,
    pickedBy: device.picked_by
  }));

  return successResponse(res, { devices: formattedDevices }, 'Picked devices retrieved');
});

export const shipSalesOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { courier, tracking_number } = req.body;

  if (!courier || !tracking_number) {
    return errorResponse(
      res,
      'Courier and tracking number are required',
      'MISSING_SHIPMENT_FIELDS',
      400
    );
  }

  await salesOrderModel.ship(id, { courier, tracking_number });

  return successResponse(res, {}, 'Sales order shipped successfully');
});
