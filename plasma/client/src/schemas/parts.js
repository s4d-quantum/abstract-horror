import { z } from 'zod';

export const createPartBaseSchema = z.object({
  base_code: z.string().min(3, 'Base code is required'),
  name: z.string().min(2, 'Name is required'),
  category_id: z.number().int().positive('Category is required'),
  manufacturer_id: z.number().int().positive().nullable().optional(),
  subtype: z.string().nullable().optional(),
  changes_device_color: z.boolean().default(false),
  notes: z.string().nullable().optional(),
});

export const updatePartBaseSchema = z.object({
  base_code: z.string().min(3, 'Base code is required').optional(),
  name: z.string().min(2, 'Name is required').optional(),
  category_id: z.number().int().positive('Category is required').optional(),
  manufacturer_id: z.number().int().positive().nullable().optional(),
  subtype: z.string().nullable().optional(),
  changes_device_color: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

export const createPartVariantSchema = z.object({
  part_base_id: z.number().int().positive('Part base is required'),
  category_id: z.number().int().positive('Category is required'),
  sku: z.string().min(2, 'SKU is required'),
  name: z.string().min(2, 'Name is required'),
  color: z.string().nullable().optional(),
  quality_tier: z.enum(['OEM', 'OEM_PULL', 'PREMIUM', 'AFTERMARKET', 'REFURBISHED', 'OTHER']).default('OTHER'),
  supplier_part_ref: z.string().nullable().optional(),
});

export const updatePartVariantSchema = z.object({
  part_base_id: z.number().int().positive('Part base is required').optional(),
  category_id: z.number().int().positive('Category is required').optional(),
  sku: z.string().min(2, 'SKU is required').optional(),
  name: z.string().min(2, 'Name is required').optional(),
  color: z.string().nullable().optional(),
  quality_tier: z.enum(['OEM', 'OEM_PULL', 'PREMIUM', 'AFTERMARKET', 'REFURBISHED', 'OTHER']).optional(),
  supplier_part_ref: z.string().nullable().optional(),
});

export const createPartCompatibilitySchema = z.object({
  part_base_id: z.number().int().positive('Part base is required'),
  model_id: z.number().int().positive('Model is required'),
  notes: z.string().nullable().optional(),
});

export const updatePartCompatibilitySchema = z.object({
  part_base_id: z.number().int().positive('Part base is required').optional(),
  model_id: z.number().int().positive('Model is required').optional(),
  notes: z.string().nullable().optional(),
});

export const partGoodsInSchema = z.object({
  part_id: z.number().int().positive('Part variant is required'),
  supplier_id: z.number().int().positive().nullable().optional(),
  supplier_ref: z.string().nullable().optional(),
  lot_ref: z.string().nullable().optional(),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  notes: z.string().nullable().optional(),
});

export const partGoodsOutSchema = z.object({
  part_id: z.number().int().positive('Part variant is required'),
  part_lot_id: z.number().int().positive('Lot is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  reason: z.string().min(2, 'Reason is required'),
  is_faulty: z.boolean().default(false),
  fault_reason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.is_faulty && (!value.fault_reason || value.fault_reason.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Fault reason is required for faulty goods out',
      path: ['fault_reason'],
    });
  }
});

export const updateFaultReportSchema = z.object({
  status: z.enum(['OPEN', 'RMA_REQUESTED', 'RETURNED', 'CREDIT_RECEIVED', 'WRITTEN_OFF']),
  notes: z.string().nullable().optional(),
});
