import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
    getAllSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deactivateSupplier,
    reactivateSupplier,
    deleteSupplier
} from '../controllers/supplierController.js';
import {
  validateCreateSupplier,
  validateUpdateSupplier,
  validateIdParam
} from '../middleware/validation.js';

const router = express.Router();

// All supplier routes require authentication
router.use(verifyToken);

// Supplier endpoints
router.get('/', getAllSuppliers);
router.post('/', validateCreateSupplier, createSupplier);
router.get('/:id', validateIdParam, getSupplierById);
router.patch('/:id', validateIdParam, validateUpdateSupplier, updateSupplier);
router.patch('/:id/deactivate', validateIdParam, deactivateSupplier);
router.patch('/:id/reactivate', validateIdParam, reactivateSupplier);
router.delete('/:id', validateIdParam, deleteSupplier);

export default router;
