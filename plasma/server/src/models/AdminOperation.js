import db from '../config/database.js';

/**
 * Admin Operations Model
 * Handles database operations for admin_operations table
 */

export class AdminOperation {
    /**
     * Create a new admin operation log entry
     * @param {Object} data - Operation data
     * @param {string} data.operation_type - Type of operation (BULK_LOCATION_MOVE, COLOR_CHECK, etc.)
     * @param {string} data.description - Description of the operation
     * @param {string} data.reason - Reason for the operation
     * @param {number} data.affected_count - Number of items affected
     * @param {Array} data.affected_imeis - Array of affected IMEIs
     * @param {number} data.performed_by - User ID who performed the operation
     * @returns {Promise<number>} - ID of created operation
     */
    static async create({ operation_type, description, reason, affected_count = 0, affected_imeis = [], performed_by }) {
        const query = `
      INSERT INTO admin_operations 
      (operation_type, description, reason, affected_count, affected_imeis, performed_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

        const affected_imeis_json = JSON.stringify(affected_imeis);
        const [result] = await db.execute(query, [
            operation_type,
            description,
            reason,
            affected_count,
            affected_imeis_json,
            performed_by
        ]);

        return result.insertId;
    }

    /**
     * Get paginated list of admin operations
     * @param {Object} options - Query options
     * @param {number} options.page - Page number (1-indexed)
     * @param {number} options.limit - Items per page
     * @returns {Promise<Object>} - Operations list and pagination info
     */
    static async getAll({ page = 1, limit = 10 } = {}) {
        const offset = (page - 1) * limit;

        const query = `
      SELECT 
        ao.id,
        ao.operation_type,
        ao.description,
        ao.reason,
        ao.affected_count,
        ao.performed_by,
        ao.performed_at,
        u.username,
        u.display_name
      FROM admin_operations ao
      LEFT JOIN users u ON u.id = ao.performed_by
      ORDER BY ao.performed_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

        const countQuery = `SELECT COUNT(*) as total FROM admin_operations`;

        const [operations] = await db.execute(query);
        const [countResult] = await db.execute(countQuery);
        const total = countResult[0].total;

        return {
            operations,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get a specific admin operation by ID
     * @param {number} id - Operation ID
     * @returns {Promise<Object|null>} - Operation details or null if not found
     */
    static async getById(id) {
        const query = `
      SELECT 
        ao.id,
        ao.operation_type,
        ao.description,
        ao.reason,
        ao.affected_count,
        ao.affected_imeis,
        ao.performed_by,
        ao.performed_at,
        u.username,
        u.display_name
      FROM admin_operations ao
      LEFT JOIN users u ON u.id = ao.performed_by
      WHERE ao.id = ?
    `;

        const [results] = await db.execute(query, [id]);

        if (results.length === 0) {
            return null;
        }

        const operation = results[0];

        // Parse JSON fields
        if (operation.affected_imeis) {
            try {
                operation.affected_imeis = JSON.parse(operation.affected_imeis);
            } catch (e) {
                operation.affected_imeis = [];
            }
        }

        return operation;
    }

    /**
     * Get recent operations (for dashboard)
     * @param {number} limit - Number of recent operations to fetch
     * @returns {Promise<Array>} - Array of recent operations
     */
    static async getRecent(limit = 10) {
        const query = `
      SELECT 
        ao.id,
        ao.operation_type,
        ao.description,
        ao.reason,
        ao.affected_count,
        ao.performed_at,
        u.username,
        u.display_name
      FROM admin_operations ao
      LEFT JOIN users u ON u.id = ao.performed_by
      ORDER BY ao.performed_at DESC
      LIMIT ${limit}
    `;

        const [operations] = await db.execute(query);
        return operations;
    }
}
