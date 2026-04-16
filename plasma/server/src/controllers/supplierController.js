import { supplierModel } from '../models/supplierModel.js';
import { asyncHandler } from '../middleware/validation.js';
import { successResponse, errorResponse } from '../utils/helpers.js';

/**
 * Get all suppliers with filters and pagination
 */
export const getAllSuppliers = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 50,
        search,
        status,
        sortBy,
        sortDir
    } = req.query;

    const filters = {
        search,
        status,
        sortBy,
        sortDir
    };

    // Remove undefined values
    Object.keys(filters).forEach(key =>
        filters[key] === undefined && delete filters[key]
    );

    const result = await supplierModel.getAll(filters, {
        page: parseInt(page),
        limit: parseInt(limit)
    });

    successResponse(res, {
        suppliers: result.suppliers.map(supplier => ({
            id: supplier.id,
            supplierCode: supplier.supplier_code,
            name: supplier.name,
            addressLine1: supplier.address_line1,
            addressLine2: supplier.address_line2,
            city: supplier.city,
            postcode: supplier.postcode,
            country: supplier.country,
            phone: supplier.phone,
            email: supplier.email,
            vatNumber: supplier.vat_number,
            isActive: supplier.is_active,
            createdAt: supplier.created_at,
            updatedAt: supplier.updated_at
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
 * Get single supplier by ID
 */
export const getSupplierById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const supplier = await supplierModel.getById(id);

    if (!supplier) {
        return errorResponse(res, 'Supplier not found', 'SUPPLIER_NOT_FOUND', 404);
    }

    successResponse(res, {
        supplier: {
            id: supplier.id,
            supplierCode: supplier.supplier_code,
            name: supplier.name,
            addressLine1: supplier.address_line1,
            addressLine2: supplier.address_line2,
            city: supplier.city,
            postcode: supplier.postcode,
            country: supplier.country,
            phone: supplier.phone,
            email: supplier.email,
            vatNumber: supplier.vat_number,
            isActive: supplier.is_active,
            createdAt: supplier.created_at,
            updatedAt: supplier.updated_at
        }
    });
});

/**
 * Create new supplier
 */
export const createSupplier = asyncHandler(async (req, res) => {
    const {
        name,
        address_line1,
        address_line2,
        city,
        postcode,
        country,
        phone,
        email,
        vat_number
    } = req.body;

    // Validate required fields
    if (!name || name.trim() === '') {
        return errorResponse(res, 'Supplier name is required', 'MISSING_NAME', 400);
    }

    const result = await supplierModel.create({
        name: name.trim(),
        address_line1,
        address_line2,
        city,
        postcode,
        country,
        phone,
        email,
        vat_number
    });

    successResponse(
        res,
        {
            id: result.id,
            supplierCode: result.supplierCode
        },
        'Supplier created successfully',
        201
    );
});

/**
 * Update supplier
 */
export const updateSupplier = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    // Check if supplier exists
    const supplier = await supplierModel.getById(id);
    if (!supplier) {
        return errorResponse(res, 'Supplier not found', 'SUPPLIER_NOT_FOUND', 404);
    }

    // Validate name if provided
    if (updates.name !== undefined && (!updates.name || updates.name.trim() === '')) {
        return errorResponse(res, 'Supplier name cannot be empty', 'INVALID_NAME', 400);
    }

    const updated = await supplierModel.update(id, updates);

    if (!updated) {
        return errorResponse(res, 'No valid fields to update', 'NO_UPDATES', 400);
    }

    // Get updated supplier
    const updatedSupplier = await supplierModel.getById(id);

    successResponse(
        res,
        {
            supplier: {
                id: updatedSupplier.id,
                supplierCode: updatedSupplier.supplier_code,
                name: updatedSupplier.name,
                addressLine1: updatedSupplier.address_line1,
                addressLine2: updatedSupplier.address_line2,
                city: updatedSupplier.city,
                postcode: updatedSupplier.postcode,
                country: updatedSupplier.country,
                phone: updatedSupplier.phone,
                email: updatedSupplier.email,
                vatNumber: updatedSupplier.vat_number,
                isActive: updatedSupplier.is_active,
                createdAt: updatedSupplier.created_at,
                updatedAt: updatedSupplier.updated_at
            }
        },
        'Supplier updated successfully'
    );
});

/**
 * Deactivate supplier (soft delete - set is_active to false)
 */
export const deactivateSupplier = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if supplier exists
    const supplier = await supplierModel.getById(id);
    if (!supplier) {
        return errorResponse(res, 'Supplier not found', 'SUPPLIER_NOT_FOUND', 404);
    }

    const deactivated = await supplierModel.deactivate(id);

    if (!deactivated) {
        return errorResponse(res, 'Failed to deactivate supplier', 'DELETE_FAILED', 500);
    }

    successResponse(res, {}, 'Supplier deactivated successfully');
});

/**
 * Reactivate supplier
 */
export const reactivateSupplier = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const supplier = await supplierModel.getById(id);
    if (!supplier) {
        return errorResponse(res, 'Supplier not found', 'SUPPLIER_NOT_FOUND', 404);
    }

    const reactivated = await supplierModel.reactivate(id);

    if (!reactivated) {
        return errorResponse(res, 'Failed to reactivate supplier', 'REACTIVATE_FAILED', 500);
    }

    successResponse(res, {}, 'Supplier reactivated successfully');
});

/**
 * Permanently delete supplier
 */
export const deleteSupplier = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const supplier = await supplierModel.getById(id);
    if (!supplier) {
        return errorResponse(res, 'Supplier not found', 'SUPPLIER_NOT_FOUND', 404);
    }

    try {
        const deleted = await supplierModel.delete(id);

        if (!deleted) {
            return errorResponse(res, 'Failed to delete supplier', 'DELETE_FAILED', 500);
        }
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
            return errorResponse(
                res,
                'Supplier cannot be deleted because it is linked to existing devices, purchase orders, returns, parts, or sales order lines',
                'SUPPLIER_IN_USE',
                409
            );
        }

        throw error;
    }

    successResponse(res, {}, 'Supplier deleted successfully');
});
