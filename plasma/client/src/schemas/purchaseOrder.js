import { z } from 'zod';

// Reusable: coerce empty strings and undefined to null for optional text fields
const nullableStr = z.string().optional().nullable()
  .transform(v => (v === '' ? null : v ?? null));

export const createPurchaseOrderSchema = z.object({
  supplier_id: z.number().int().positive('Supplier is required'),
  supplier_ref: nullableStr,
  notes: nullableStr,
  status: z.enum(['DRAFT', 'CONFIRMED']).default('DRAFT'),
  lines: z.array(z.object({
    manufacturer_id: z.number().int().positive('Manufacturer is required'),
    model_id: z.number().int().positive('Model is required'),
    storage_gb: z.number().int().positive().nullable().optional()
      .transform(v => v ?? null),
    color: nullableStr,
    expected_quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  })).min(1, 'At least one line is required'),
});
