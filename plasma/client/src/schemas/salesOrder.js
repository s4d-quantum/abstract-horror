import { z } from 'zod';

const nullableStr = z.string().optional().nullable()
  .transform(v => (v === '' ? null : v ?? null));

export const createSalesOrderSchema = z.object({
  customer_id: z.number().int().positive('Customer is required'),
  order_type: z.enum(['B2B', 'BACKMARKET']).default('B2B'),
  backmarket_order_id: nullableStr,
  customer_ref: nullableStr,
  po_ref: nullableStr,
  notes: nullableStr,
  lines: z.array(z.object({
    supplier_id: z.number().int().positive().nullable().optional()
      .transform(v => (v === 0 ? null : v ?? null)),
    manufacturer_id: z.number().int().positive(),
    model_id: z.number().int().positive(),
    storage_gb: z.number().int().positive().nullable().optional()
      .transform(v => v ?? null),
    color: nullableStr,
    grade: nullableStr,
    location_id: z.number().int().positive().nullable().optional()
      .transform(v => (v === 0 ? null : v ?? null)),
    requested_quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  })).min(1, 'At least one line is required'),
}).superRefine((data, ctx) => {
  if (data.order_type === 'BACKMARKET' && !data.backmarket_order_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['backmarket_order_id'],
      message: 'Backmarket Order ID is required for Backmarket orders',
    });
  }
});
