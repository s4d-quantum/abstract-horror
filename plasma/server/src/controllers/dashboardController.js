import { dashboardModel } from '../models/dashboardModel.js';
import { asyncHandler } from '../middleware/validation.js';
import { successResponse } from '../utils/helpers.js';

// Get dashboard metrics
export const getMetrics = asyncHandler(async (req, res) => {
  const metrics = await dashboardModel.getMetrics();

  successResponse(res, {
    metrics: {
      totalInStock: parseInt(metrics.total_in_stock) || 0,
      unprocessedOrders: parseInt(metrics.unprocessed_orders) || 0,
      awaitingQC: parseInt(metrics.awaiting_qc) || 0,
      awaitingRepair: parseInt(metrics.awaiting_repair) || 0,
      bookedIn7Days: parseInt(metrics.booked_in_7days) || 0,
      bookedOut7Days: parseInt(metrics.booked_out_7days) || 0,
      returns7Days: parseInt(metrics.returns_7days) || 0
    }
  });
});

// Get recent purchase orders
export const getRecentPurchaseOrders = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const orders = await dashboardModel.getRecentPurchaseOrders(limit);

  successResponse(res, {
    orders: orders.map(order => ({
      id: order.id,
      poNumber: order.po_number,
      date: order.created_at,
      supplier: order.supplier_name,
      supplierRef: order.supplier_ref,
      status: order.status,
      expectedQty: order.expected_quantity,
      receivedQty: order.received_quantity,
      createdBy: order.created_by
    }))
  });
});

// Get recent sales orders
export const getRecentSalesOrders = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const orders = await dashboardModel.getRecentSalesOrders(limit);

  successResponse(res, {
    orders: orders.map(order => ({
      id: order.id,
      soNumber: order.so_number,
      date: order.created_at,
      orderType: order.order_type,
      status: order.status,
      customer: order.customer_name,
      customerRef: order.customer_ref,
      backmarketOrderId: order.backmarket_order_id,
      createdBy: order.created_by,
      lineCount: order.line_count,
      pickedCount: order.picked_count
    }))
  });
});

// Get activity summary
export const getActivitySummary = asyncHandler(async (req, res) => {
  const summary = await dashboardModel.getActivitySummary();

  successResponse(res, {
    summary: summary.map(day => ({
      date: day.activity_date,
      total: day.total_activities,
      devices: day.device_activities,
      orders: day.order_activities
    }))
  });
});

// Get low stock alerts
export const getLowStockAlerts = asyncHandler(async (req, res) => {
  const alerts = await dashboardModel.getLowStockAlerts();

  successResponse(res, {
    alerts: alerts.map(alert => ({
      manufacturer: alert.manufacturer,
      model: alert.model_name,
      storage: alert.storage_gb,
      color: alert.color,
      grade: alert.grade,
      quantity: alert.quantity,
      location: alert.location
    }))
  });
});

// Get device status breakdown
export const getDeviceStatusBreakdown = asyncHandler(async (req, res) => {
  const breakdown = await dashboardModel.getDeviceStatusBreakdown();

  successResponse(res, {
    breakdown: breakdown.map(item => ({
      status: item.status,
      count: item.count
    }))
  });
});

// Get top manufacturers
export const getTopManufacturers = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  const manufacturers = await dashboardModel.getTopManufacturers(limit);

  successResponse(res, {
    manufacturers: manufacturers.map(mfr => ({
      name: mfr.manufacturer,
      deviceCount: mfr.device_count,
      modelCount: mfr.model_count
    }))
  });
});
