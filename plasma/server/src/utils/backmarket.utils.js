import db from '../config/database.js';

export const BACKMARKET_CUSTOMER_CODES = ['CST-78'];
export const BACKMARKET_CUSTOMER_NAMES = ['backmarket consumer'];

function normalizeCustomerName(name) {
    return String(name || '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();
}

export function isBackmarketCustomerRecord(customer = {}) {
    return customer.is_backmarket === 1
        || customer.is_backmarket === true
        || BACKMARKET_CUSTOMER_CODES.includes(customer.customer_code)
        || BACKMARKET_CUSTOMER_NAMES.includes(normalizeCustomerName(customer.name));
}

export function getBackmarketCustomerPredicate(alias = 'c') {
    const codePlaceholders = BACKMARKET_CUSTOMER_CODES.map(() => '?').join(', ');
    const namePlaceholders = BACKMARKET_CUSTOMER_NAMES.map(() => '?').join(', ');

    return {
        clause: `(
      COALESCE(${alias}.is_backmarket, 0) = 1
      OR ${alias}.customer_code IN (${codePlaceholders})
      OR LOWER(TRIM(${alias}.name)) IN (${namePlaceholders})
    )`,
        params: [...BACKMARKET_CUSTOMER_CODES, ...BACKMARKET_CUSTOMER_NAMES]
    };
}

/**
 * BackMarket Utilities
 * Helper functions for BackMarket integration
 */

/**
 * Check if a customer is BackMarket
 * @param {number} customerId - Customer ID to check
 * @returns {boolean} True if customer is BackMarket
 */
export async function isBackmarketCustomer(customerId) {
    const sql = 'SELECT customer_code, name, is_backmarket FROM customers WHERE id = ?';
    const [rows] = await db.execute(sql, [customerId]);

    if (rows.length === 0) {
        return false;
    }

    return isBackmarketCustomerRecord(rows[0]);
}

/**
 * Link a BackMarket shipment to a sales order
 * @param {string} backmarketOrderId - BackMarket order ID
 * @param {number} salesOrderId - Sales order ID
 */
export async function linkShipmentToSalesOrder(backmarketOrderId, salesOrderId) {
    const sql = `
    UPDATE backmarket_shipments 
    SET sales_order_id = ? 
    WHERE backmarket_order_id = ?
  `;

    await db.execute(sql, [salesOrderId, backmarketOrderId]);
}

/**
 * Get BackMarket shipment for a sales order
 * @param {number} salesOrderId - Sales order ID
 * @returns {Object|null} Shipment data or null
 */
export async function getShipmentForSalesOrder(salesOrderId) {
    const sql = 'SELECT * FROM backmarket_shipments WHERE sales_order_id = ?';
    const [rows] = await db.execute(sql, [salesOrderId]);

    return rows[0] || null;
}

/**
 * Create activity log entry for BackMarket operations
 * @param {string} action - Action performed
 * @param {string} bmOrderId - BackMarket order ID
 * @param {number} userId - User ID
 * @param {Object} details - Additional details
 */
export async function logBackmarketActivity(action, bmOrderId, userId, details = {}) {
    const sql = `
    INSERT INTO activity_log (
      log_date,
      action,
      entity_type,
      entity_id,
      details,
      user_id
    ) VALUES (CURDATE(), ?, 'BACKMARKET_ORDER', ?, ?, ?)
  `;

    await db.execute(sql, [
        action,
        bmOrderId,
        JSON.stringify(details),
        userId
    ]);
}
