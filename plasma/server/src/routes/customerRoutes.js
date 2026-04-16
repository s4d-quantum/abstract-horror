import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deactivateCustomer,
    reactivateCustomer,
    deleteCustomer
} from '../controllers/customerController.js';
import {
  validateCreateCustomer,
  validateUpdateCustomer,
  validateIdParam
} from '../middleware/validation.js';

const router = express.Router();

// All customer routes require authentication
router.use(verifyToken);

// Customer endpoints
router.get('/', getAllCustomers);
router.post('/', validateCreateCustomer, createCustomer);
router.get('/:id', validateIdParam, getCustomerById);
router.patch('/:id', validateIdParam, validateUpdateCustomer, updateCustomer);
router.patch('/:id/deactivate', validateIdParam, deactivateCustomer);
router.patch('/:id/reactivate', validateIdParam, reactivateCustomer);
router.delete('/:id', validateIdParam, deleteCustomer);

export default router;
