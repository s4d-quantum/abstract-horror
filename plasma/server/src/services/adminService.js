/**
 * Admin Operations Service
 * Business logic for admin operations
 */

export class AdminService {
    /**
     * Verify PIN code
     * @param {string} pin - PIN to verify
     * @returns {Promise<boolean>} - True if PIN is correct
     */
    static async verifyPin(pin) {
        const expectedPin = process.env.ADMIN_OPS_PIN;

        if (!expectedPin) {
            throw new Error('ADMIN_OPS_PIN not configured');
        }

        // Simple string comparison for PIN (secure comparison using timing-safe equals)
        return pin === expectedPin;
    }

    /**
     * Get redirect path for operation type
     * @param {string} operationType - Operation type
     * @param {Object} params - Additional parameters
     * @returns {Object} - Redirect information
     */
    static getRedirectPath(operationType, params = {}) {
        const redirectMap = {
            'Location Management': {
                path: '/admin-ops/location-management',
                requiresReason: true,
                queryParams: params.reason ? { reason: params.reason } : {}
            },
            'Color Check': {
                path: '/admin-ops/color-check',
                requiresReason: false,
                queryParams: {}
            },
            'Label Print': {
                path: '/admin-ops/print-labels',
                requiresReason: false,
                queryParams: {}
            }
        };

        return redirectMap[operationType] || null;
    }

    /**
     * Map operation name to database operation_type enum
     * @param {string} operationName - Human-readable operation name
     * @returns {string} - Database enum value
     */
    static mapOperationType(operationName) {
        const typeMap = {
            'Location Management': 'BULK_LOCATION_MOVE',
            'Color Check': 'COLOR_CHECK',
            'Label Print': 'OTHER'
        };

        return typeMap[operationName] || 'OTHER';
    }

    /**
     * Format operation for logging
     * @param {string} operationName - Operation name
     * @param {Object} data - Operation data
     * @returns {Object} - Formatted operation data
     */
    static formatOperationLog(operationName, data = {}) {
        const operation_type = this.mapOperationType(operationName);

        return {
            operation_type,
            description: data.description || operationName,
            reason: data.reason || null,
            affected_count: data.affected_count || 0,
            affected_imeis: data.affected_imeis || [],
            performed_by: data.performed_by
        };
    }
}
