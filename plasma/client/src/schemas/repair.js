import { z } from 'zod';

export const createRepairJobSchema = z.object({
  purchase_order_id: z.number().int().positive('Purchase order is required'),
  notes: z.string().nullable().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  target_sales_order_id: z.number().int().positive().nullable().optional(),
});

export const addDevicesToJobSchema = z.object({
  device_ids: z.array(z.number().int().positive()).min(1, 'Select at least one device'),
  fault_description: z.string().min(5, 'Fault description must be at least 5 characters'),
});

export const updateRepairRecordSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BER']).optional(),
  engineer_comments: z.string().nullable().optional(),
  outcome: z.enum([
    'Repaired',
    'Part Replaced',
    'Screen Replaced',
    'Battery Replaced',
    'Logic Board Repair',
    'Software Issue',
    'Not Repairable'
  ]).nullable().optional(),
  resolution_notes: z.string().nullable().optional(),
});

export const repairCommentSchema = z.object({
  comment_text: z.string().min(2, 'Comment must be at least 2 characters'),
});

export const reserveRepairPartSchema = z.object({
  part_id: z.number().int().positive(),
  part_lot_id: z.number().int().positive(),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  notes: z.string().nullable().optional(),
});

export const fitReservedPartSchema = z.object({
  repair_part_id: z.number().int().positive(),
  quantity: z.number().int().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const fitDirectPartSchema = z.object({
  part_id: z.number().int().positive(),
  part_lot_id: z.number().int().positive(),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  direct_from_available: z.literal(true),
  notes: z.string().nullable().optional(),
});

export const removeRepairPartSchema = z.object({
  repair_part_id: z.number().int().positive(),
  disposition: z.enum(['RESTOCK', 'FAULTY']),
  quantity: z.number().int().positive().nullable().optional(),
  fault_reason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.disposition === 'FAULTY' && (!value.fault_reason || value.fault_reason.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Fault reason is required when marking a part faulty',
      path: ['fault_reason'],
    });
  }
});

export const bulkRepairSchema = z.object({
  device_ids: z.array(z.number().int().positive()).min(1, 'Select at least one device'),
  part_allocations: z.array(z.object({
    part_id: z.number().int().positive(),
    part_lot_id: z.number().int().positive(),
  })).min(1, 'Select at least one part'),
});
