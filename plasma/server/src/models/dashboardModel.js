import { query } from '../config/database.js';

export const dashboardModel = {
  // Get all dashboard metrics in one call
  async getMetrics() {
    // Use the pre-built view
    const results = await query('SELECT * FROM v_dashboard_metrics');
    return results[0] || {
      total_in_stock: 0,
      unprocessed_orders: 0,
      awaiting_qc: 0,
      awaiting_repair: 0,
      booked_in_7days: 0,
      booked_out_7days: 0,
      returns_7days: 0
    };
  },

  // Get recent purchase orders (last 10)
  async getRecentPurchaseOrders(limit = 10) {
    const sql = `
      SELECT
        po.id,
        po.po_number,
        po.created_at,
        s.name as supplier_name,
        po.supplier_ref,
        po.status,
        po.expected_quantity,
        po.received_quantity,
        u.display_name as created_by
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      JOIN users u ON po.created_by = u.id
      ORDER BY po.created_at DESC
      LIMIT ${limit}
    `;
    return await query(sql);
  },

  // Get recent unprocessed sales orders (last 10)
  async getRecentSalesOrders(limit = 10) {
    const sql = `
      SELECT
        so.id,
        so.so_number,
        so.created_at,
        so.order_type,
        so.status,
        c.name as customer_name,
        so.customer_ref,
        so.backmarket_order_id,
        u.display_name as created_by,
        COUNT(DISTINCT sol.id) as line_count,
        COUNT(DISTINCT soi.id) as picked_count
      FROM sales_orders so
      JOIN customers c ON so.customer_id = c.id
      JOIN users u ON so.created_by = u.id
      LEFT JOIN sales_order_lines sol ON so.id = sol.sales_order_id
      LEFT JOIN sales_order_items soi ON so.id = soi.sales_order_id
      WHERE so.status IN ('DRAFT', 'CONFIRMED', 'PROCESSING')
      GROUP BY so.id, so.so_number, so.created_at, so.order_type, so.status, c.name, so.customer_ref, so.backmarket_order_id, u.display_name
      ORDER BY so.created_at DESC
      LIMIT ${limit}
    `;
    return await query(sql);
  },

  // Get activity summary for last 7 days
  async getActivitySummary() {
    const sql = `
      SELECT
        DATE(created_at) as activity_date,
        COUNT(*) as total_activities,
        SUM(CASE WHEN action LIKE '%DEVICE%' THEN 1 ELSE 0 END) as device_activities,
        SUM(CASE WHEN action LIKE '%ORDER%' THEN 1 ELSE 0 END) as order_activities
      FROM activity_log
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY activity_date DESC
    `;
    return await query(sql);
  },

  // Get low stock alerts (if we track min levels)
  async getLowStockAlerts() {
    const sql = `
      SELECT
        m.name as manufacturer,
        mo.model_name,
        d.storage_gb,
        d.color,
        d.grade,
        COUNT(*) as quantity,
        l.code as location
      FROM devices d
      JOIN manufacturers m ON d.manufacturer_id = m.id
      JOIN models mo ON d.model_id = mo.id
      LEFT JOIN locations l ON d.location_id = l.id
      WHERE d.status = 'IN_STOCK'
      GROUP BY m.id, mo.id, d.storage_gb, d.color, d.grade, l.id
      HAVING COUNT(*) < 5
      ORDER BY COUNT(*) ASC
      LIMIT 10
    `;
    return await query(sql);
  },

  // Get devices by status breakdown
  async getDeviceStatusBreakdown() {
    const sql = `
      SELECT
        status,
        COUNT(*) as count
      FROM devices
      GROUP BY status
      ORDER BY count DESC
    `;
    return await query(sql);
  },

  // Get top manufacturers by stock
  async getTopManufacturers(limit = 5) {
    const sql = `
      SELECT
        m.name as manufacturer,
        COUNT(*) as device_count,
        COUNT(DISTINCT d.model_id) as model_count
      FROM devices d
      JOIN manufacturers m ON d.manufacturer_id = m.id
      WHERE d.status = 'IN_STOCK'
      GROUP BY m.id, m.name
      ORDER BY device_count DESC
      LIMIT ${limit}
    `;
    return await query(sql);
  }
};
