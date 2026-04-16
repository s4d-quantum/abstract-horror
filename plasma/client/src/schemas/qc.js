import { z } from 'zod';

export const FUNCTIONAL_RESULTS = ['PASS', 'FAIL', 'UNABLE', 'NA'];
export const COSMETIC_RESULTS = ['PASS', 'FAIL', 'NA'];
export const GRADES = ['A', 'B', 'C', 'D', 'E', 'F'];

// One row in the editable QC results table
export const qcResultRowSchema = z.object({
  device_id: z.number().int().positive(),
  functional_result: z.enum(['PASS', 'FAIL', 'UNABLE', 'NA']).nullable().optional(),
  cosmetic_result: z.enum(['PASS', 'FAIL', 'NA']).nullable().optional(),
  grade_assigned: z.enum(['A', 'B', 'C', 'D', 'E', 'F']).nullable().optional()
    .transform((v) => v === '' ? null : (v ?? null)),
  color_verified: z.string().nullable().optional()
    .transform((v) => v === '' ? null : (v ?? null)),
  comments: z.string().nullable().optional()
    .transform((v) => v === '' ? null : (v ?? null)),
  non_uk: z.boolean().optional().default(false),
  blackbelt_ref: z.string().nullable().optional()
    .transform((v) => v === '' ? null : (v ?? null)),
  blackbelt_passed: z.boolean().nullable().optional(),
});

// Batch save payload
export const saveQcResultsSchema = z.object({
  results: z.array(qcResultRowSchema).min(1, 'At least one result row is required'),
});

// Manual job creation
export const createQcJobSchema = z.object({
  purchase_order_id: z.number().int().positive('Purchase order is required'),
});
