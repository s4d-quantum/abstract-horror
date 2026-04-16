import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  validateCreatePartBase,
  validateUpdatePartBase,
  validateCreatePartVariant,
  validateUpdatePartVariant,
  validateCreatePartCompatibility,
  validateUpdatePartCompatibility,
  validatePartGoodsIn,
  validatePartGoodsOut,
  validateBulkGoodsIn,
  validateUpdateFaultReport,
  validateIdParam,
} from '../middleware/validation.js';
import {
  createPartBase,
  createPartCompatibility,
  createPartVariant,
  deletePartBase,
  deletePartVariant,
  deletePartCompatibility,
  getFaultyParts,
  getGoodsInDetail,
  getGoodsInHistory,
  getPartBaseById,
  getPartBases,
  getPartCompatibility,
  getPartDeviceModelById,
  getPartDeviceModels,
  getPartsMeta,
  getPartVariants,
  partGoodsIn,
  partGoodsOut,
  partBulkGoodsIn,
  updatePartCompatibility,
  updateFaultyPart,
  updatePartBase,
  updatePartVariant,
} from '../controllers/partController.js';

const router = express.Router();
router.use(verifyToken);

router.get('/meta', getPartsMeta);
router.get('/models', getPartDeviceModels);
router.get('/models/:id', validateIdParam, getPartDeviceModelById);

router.get('/bases', getPartBases);
router.get('/bases/:id', validateIdParam, getPartBaseById);
router.post('/bases', validateCreatePartBase, createPartBase);
router.patch('/bases/:id', validateIdParam, validateUpdatePartBase, updatePartBase);
router.delete('/bases/:id', validateIdParam, deletePartBase);

router.get('/variants', getPartVariants);
router.post('/variants', validateCreatePartVariant, createPartVariant);
router.patch('/variants/:id', validateIdParam, validateUpdatePartVariant, updatePartVariant);
router.delete('/variants/:id', validateIdParam, deletePartVariant);

router.get('/compatibility', getPartCompatibility);
router.post('/compatibility', validateCreatePartCompatibility, createPartCompatibility);
router.patch('/compatibility/:id', validateIdParam, validateUpdatePartCompatibility, updatePartCompatibility);
router.delete('/compatibility/:id', validateIdParam, deletePartCompatibility);

router.get('/lots/history', getGoodsInHistory);
router.get('/lots/detail', getGoodsInDetail);

router.post('/goods-in', validatePartGoodsIn, partGoodsIn);
router.post('/bulk-goods-in', validateBulkGoodsIn, partBulkGoodsIn);
router.post('/goods-out', validatePartGoodsOut, partGoodsOut);

router.get('/faulty', getFaultyParts);
router.patch('/faulty/:id', validateIdParam, validateUpdateFaultReport, updateFaultyPart);

export default router;
