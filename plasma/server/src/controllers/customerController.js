import { customerModel } from '../models/customerModel.js';
import { asyncHandler } from '../middleware/validation.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

/**
 * Get all customers with filters and pagination
 */
export const getAllCustomers = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 50,
        search,
        status,
        is_backmarket,
        sortBy,
        sortDir
    } = req.query;

    const filters = {
        search,
        status,
        is_backmarket,
        sortBy,
        sortDir
    };

    // Remove undefined values
    Object.keys(filters).forEach(key =>
        filters[key] === undefined && delete filters[key]
    );

    const result = await customerModel.getAll(filters, {
        page: parseInt(page),
        limit: parseInt(limit)
    });

    successResponse(res, {
        customers: result.customers.map(customer => ({
            id: customer.id,
            customerCode: customer.customer_code,
            name: customer.name,
            addressLine1: customer.address_line1,
            addressLine2: customer.address_line2,
            city: customer.city,
            postcode: customer.postcode,
            country: customer.country,
            phone: customer.phone,
            email: customer.email,
            vatNumber: customer.vat_number,
            isBackmarket: customer.is_backmarket,
            isActive: customer.is_active,
            createdAt: customer.created_at,
            updatedAt: customer.updated_at
        })),
        pagination: {
            page: result.pagination.page,
            limit: result.pagination.limit,
            total: result.pagination.total,
            totalPages: result.pagination.totalPages,
            hasMore: result.pagination.page < result.pagination.totalPages
        }
    });
});

/**
 * Get single customer by ID
 */
export const getCustomerById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const customer = await customerModel.getById(id);

    if (!customer) {
        return errorResponse(res, 'Customer not found', 'CUSTOMER_NOT_FOUND', 404);
    }

    successResponse(res, {
        customer: {
            id: customer.id,
            customerCode: customer.customer_code,
            name: customer.name,
            addressLine1: customer.address_line1,
            addressLine2: customer.address_line2,
            city: customer.city,
            postcode: customer.postcode,
            country: customer.country,
            phone: customer.phone,
            email: customer.email,
            vatNumber: customer.vat_number,
            isBackmarket: customer.is_backmarket,
            isActive: customer.is_active,
            createdAt: customer.created_at,
            updatedAt: customer.updated_at
        }
    });
});

/**
 * Create new customer
 */
export const createCustomer = asyncHandler(async (req, res) => {
    const {
        name,
        address_line1,
        address_line2,
        city,
        postcode,
        country,
        phone,
        email,
        vat_number,
        is_backmarket
    } = req.body;

    // Validate required fields
    if (!name || name.trim() === '') {
        return errorResponse(res, 'Customer name is required', 'MISSING_NAME', 400);
    }

    const result = await customerModel.create({
        name: name.trim(),
        address_line1,
        address_line2,
        city,
        postcode,
        country,
        phone,
        email,
        vat_number,
        is_backmarket
    });

    successResponse(
        res,
        {
            id: result.id,
            customerCode: result.customerCode
        },
        'Customer created successfully',
        201
    );
});

/**
 * Update customer
 */
export const updateCustomer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    // Check if customer exists
    const customer = await customerModel.getById(id);
    if (!customer) {
        return errorResponse(res, 'Customer not found', 'CUSTOMER_NOT_FOUND', 404);
    }

    // Validate name if provided
    if (updates.name !== undefined && (!updates.name || updates.name.trim() === '')) {
        return errorResponse(res, 'Customer name cannot be empty', 'INVALID_NAME', 400);
    }

    const updated = await customerModel.update(id, updates);

    if (!updated) {
        return errorResponse(res, 'No valid fields to update', 'NO_UPDATES', 400);
    }

    // Get updated customer
    const updatedCustomer = await customerModel.getById(id);

    successResponse(
        res,
        {
            customer: {
                id: updatedCustomer.id,
                customerCode: updatedCustomer.customer_code,
                name: updatedCustomer.name,
                addressLine1: updatedCustomer.address_line1,
                addressLine2: updatedCustomer.address_line2,
                city: updatedCustomer.city,
                postcode: updatedCustomer.postcode,
                country: updatedCustomer.country,
                phone: updatedCustomer.phone,
                email: updatedCustomer.email,
                vatNumber: updatedCustomer.vat_number,
                isBackmarket: updatedCustomer.is_backmarket,
                isActive: updatedCustomer.is_active,
                createdAt: updatedCustomer.created_at,
                updatedAt: updatedCustomer.updated_at
            }
        },
        'Customer updated successfully'
    );
});

/**
 * Deactivate customer (soft delete - set is_active to false)
 */
export const deactivateCustomer = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if customer exists
    const customer = await customerModel.getById(id);
    if (!customer) {
        return errorResponse(res, 'Customer not found', 'CUSTOMER_NOT_FOUND', 404);
    }

    const deactivated = await customerModel.deactivate(id);

    if (!deactivated) {
        return errorResponse(res, 'Failed to deactivate customer', 'DELETE_FAILED', 500);
    }

    successResponse(res, {}, 'Customer deactivated successfully');
});

/**
 * Reactivate customer
 */
export const reactivateCustomer = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const customer = await customerModel.getById(id);
    if (!customer) {
        return errorResponse(res, 'Customer not found', 'CUSTOMER_NOT_FOUND', 404);
    }

    const reactivated = await customerModel.reactivate(id);

    if (!reactivated) {
        return errorResponse(res, 'Failed to reactivate customer', 'REACTIVATE_FAILED', 500);
    }

    successResponse(res, {}, 'Customer reactivated successfully');
});

/**
 * Permanently delete customer
 */
export const deleteCustomer = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const customer = await customerModel.getById(id);
    if (!customer) {
        return errorResponse(res, 'Customer not found', 'CUSTOMER_NOT_FOUND', 404);
    }

    try {
        const deleted = await customerModel.delete(id);

        if (!deleted) {
            return errorResponse(res, 'Failed to delete customer', 'DELETE_FAILED', 500);
        }
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
            return errorResponse(
                res,
                'Customer cannot be deleted because it is linked to existing sales orders or returns',
                'CUSTOMER_IN_USE',
                409
            );
        }

        throw error;
    }

    successResponse(res, {}, 'Customer deleted successfully');
});
