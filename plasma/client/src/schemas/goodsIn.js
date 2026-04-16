import { z } from 'zod';

const nullableStr = z.string().optional().nullable()
  .transform(v => (v === '' ? null : v ?? null));

export const bookInStockSchema = z.object({
  supplier_id: z.number().int().positive('Supplier is required'),
  supplier_ref: nullableStr,
  notes: nullableStr,
  requires_qc: z.boolean().default(true),
  requires_repair: z.boolean().default(false),
  fault_description: nullableStr,
  devices: z.array(z.object({
    imei: z.string().regex(/^\d{14,15}$/, 'IMEI must be 14–15 digits'),
    manufacturer_id: z.number().int().positive(),
    model_id: z.number().int().positive(),
    storage_gb: z.number().int().positive('Storage is required'),
    color: z.string().min(1, 'Color is required'),
    grade: z.string().regex(/^[A-F]$/).nullable().optional()
      .transform(v => (v === '' ? null : v ?? null)),
    location_id: z.number().int().positive('Location is required'),
  })).min(1, 'At least one device is required'),
});
