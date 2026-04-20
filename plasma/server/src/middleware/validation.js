import { validationResult, body, param, query } from 'express-validator';

// ─── Core middleware ──────────────────────────────────────────────────────────

// Run after validator chains — returns 400 with details if any rule failed
export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array()
      }
    });
  }
  next();
}

// Wrap async controllers so unhandled promise rejections reach the error handler
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ─── Reusable field validators ────────────────────────────────────────────────

// Coerce empty strings to null for optional text fields — never reject them
const nullableString = (fieldPath) =>
  body(fieldPath)
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v));

// Positive integer (accepts numeric strings — coerces to int)
const posInt = (fieldPath) =>
  body(fieldPath)
    .notEmpty().withMessage(`${fieldPath} is required`)
    .isInt({ min: 1 }).withMessage(`${fieldPath} must be a positive integer`)
    .toInt();

const optPosInt = (fieldPath) =>
  body(fieldPath)
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage(`${fieldPath} must be a positive integer`)
    .toInt();

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export const validateCreatePurchaseOrder = [
  posInt('supplier_id'),
  nullableString('supplier_ref'),
  nullableString('notes'),
  body('status')
    .optional()
    .isIn(['DRAFT', 'CONFIRMED']).withMessage('status must be DRAFT or CONFIRMED'),
  body('lines')
    .optional()
    .isArray().withMessage('lines must be an array'),
  body('lines.*.manufacturer_id')
    .isInt({ min: 1 }).withMessage('lines[].manufacturer_id must be a positive integer')
    .toInt(),
  body('lines.*.model_id')
    .isInt({ min: 1 }).withMessage('lines[].model_id must be a positive integer')
    .toInt(),
  body('lines.*.storage_gb')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' || v === 0 ? null : v))
    .if(body('lines.*.storage_gb').not().isIn([null, '']))
    .isInt({ min: 1 }).withMessage('lines[].storage_gb must be a positive integer')
    .toInt(),
  body('lines.*.color')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v)),
  body('lines.*.expected_quantity')
    .isInt({ min: 1 }).withMessage('lines[].expected_quantity must be at least 1')
    .toInt(),
  validate
];

export const validateUpdatePurchaseOrder = [
  nullableString('supplier_ref'),
  nullableString('notes'),
  validate
];

export const validateReceiveDevices = [
  body('location_id')
    .isInt({ min: 1 }).withMessage('location_id must be a positive integer')
    .toInt(),
  body('devices')
    .isArray({ min: 1 }).withMessage('devices must be a non-empty array'),
  body('devices.*.imei')
    .matches(/^\d{14,15}$/).withMessage('Each IMEI must be 14–15 digits'),
  body('devices.*.manufacturer_id')
    .isInt({ min: 1 }).toInt(),
  body('devices.*.model_id')
    .isInt({ min: 1 }).toInt(),
  body('devices.*.storage_gb')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' || v === 0 ? null : v)),
  body('devices.*.color')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v)),
  body('devices.*.grade')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v))
    .if(body('devices.*.grade').not().isIn([null, undefined]))
    .isIn(['A', 'B', 'C', 'D', 'E', 'F']).withMessage('grade must be A–F'),
  body('devices.*.supplier_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).toInt(),
  validate
];

export const validateBookInStock = [
  posInt('supplier_id'),
  nullableString('supplier_ref'),
  nullableString('notes'),
  body('requires_qc')
    .optional()
    .isBoolean().withMessage('requires_qc must be a boolean')
    .toBoolean(),
  body('requires_repair')
    .optional()
    .isBoolean().withMessage('requires_repair must be a boolean')
    .toBoolean(),
  nullableString('fault_description'),
  body('devices')
    .isArray({ min: 1 }).withMessage('devices must be a non-empty array'),
  body('devices.*.imei')
    .matches(/^\d{14,15}$/).withMessage('Each IMEI must be 14–15 digits'),
  body('devices.*.manufacturer_id')
    .isInt({ min: 1 }).toInt(),
  body('devices.*.model_id')
    .isInt({ min: 1 }).toInt(),
  body('devices.*.storage_gb')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' || v === 0 ? null : v))
    .if(body('devices.*.storage_gb').not().isIn([null, '']))
    .isIn([8, 16, 32, 64, 128, 256, 512, 1024]).withMessage('storage_gb must be a known storage value'),
  body('devices.*.color')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v)),
  body('devices.*.grade')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v))
    .if(body('devices.*.grade').not().isIn([null, undefined]))
    .isIn(['A', 'B', 'C', 'D', 'E', 'F']).withMessage('grade must be A–F'),
  body('devices.*.location_id')
    .isInt({ min: 1 }).withMessage('devices[].location_id is required')
    .toInt(),
  validate
];

// ─── Sales Orders ─────────────────────────────────────────────────────────────

export const validateCreateSalesOrder = [
  posInt('customer_id'),
  body('order_type')
    .optional()
    .isIn(['B2B', 'BACKMARKET']).withMessage('order_type must be B2B or BACKMARKET'),
  nullableString('backmarket_order_id'),
  nullableString('customer_ref'),
  nullableString('po_ref'),
  nullableString('notes'),
  body('lines')
    .optional()
    .isArray().withMessage('lines must be an array'),
  body('lines.*.manufacturer_id')
    .isInt({ min: 1 }).toInt(),
  body('lines.*.model_id')
    .isInt({ min: 1 }).toInt(),
  body('lines.*.storage_gb')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' || v === 0 ? null : v)),
  body('lines.*.color')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v)),
  body('lines.*.grade')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v)),
  body('lines.*.supplier_id')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === 0 || v === '0' ? null : v))
    .if(body('lines.*.supplier_id').not().isIn([null, undefined]))
    .isInt({ min: 1 }).toInt(),
  body('lines.*.location_id')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === 0 || v === '0' ? null : v))
    .if(body('lines.*.location_id').not().isIn([null, undefined]))
    .isInt({ min: 1 }).toInt(),
  body('lines.*.requested_quantity')
    .isInt({ min: 1 }).withMessage('lines[].requested_quantity must be at least 1')
    .toInt(),
  validate
];

export const validateUpdateSalesOrder = [
  nullableString('customer_ref'),
  nullableString('po_ref'),
  nullableString('notes'),
  nullableString('courier'),
  nullableString('tracking_number'),
  body('total_boxes')
    .optional({ nullable: true })
    .isInt({ min: 0 }).toInt(),
  body('total_pallets')
    .optional({ nullable: true })
    .isInt({ min: 0 }).toInt(),
  validate
];

export const validatePickDevices = [
  body('devices')
    .isArray({ min: 1 }).withMessage('devices must be a non-empty array'),
  body('devices.*.device_id')
    .isInt({ min: 1 }).toInt(),
  body('devices.*.sales_order_line_id')
    .isInt({ min: 1 }).toInt(),
  validate
];

export const validateShipOrder = [
  body('courier')
    .notEmpty().withMessage('courier is required')
    .trim(),
  body('tracking_number')
    .notEmpty().withMessage('tracking_number is required')
    .trim(),
  validate
];

export const validateSalesOrderQuery = [
  query('page').optional().toInt().isInt({ min: 1 }),
  query('limit').optional().toInt().isInt({ min: 1, max: 200 }),
  query('status').optional().isIn([
    'DRAFT',
    'CONFIRMED',
    'PROCESSING',
    'PARTIALLY_SHIPPED',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED'
  ]),
  query('customer_id').optional().toInt().isInt({ min: 1 }),
  // order_type matches the DB ENUM('B2B','BACKMARKET'). Note: is_backmarket is a separate
  // customer-level flag; order_type is the order's own classification.
  query('order_type').optional().isIn(['B2B', 'BACKMARKET']),
  query('search').optional().trim().isLength({ max: 100 }),
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
  query('is_backmarket').optional().isIn(['true', 'false']),
  validate
];

export const validatePurchaseOrderQuery = [
  query('page').optional().toInt().isInt({ min: 1 }),
  query('limit').optional().toInt().isInt({ min: 1, max: 200 }),
  query('status').optional().isIn([
    'DRAFT',
    'CONFIRMED',
    'PARTIALLY_RECEIVED',
    'FULLY_RECEIVED',
    'CANCELLED'
  ]),
  query('supplier_id').optional().toInt().isInt({ min: 1 }),
  query('search').optional().trim().isLength({ max: 100 }),
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
  query('sortBy').optional().isIn(['created_at', 'status', 'po_number', 'supplier_name']),
  query('sortDir').optional().isIn(['ASC', 'DESC', 'asc', 'desc']),
  validate
];

// ─── Customers ────────────────────────────────────────────────────────────────

export const validateCreateCustomer = [
  body('name')
    .notEmpty().withMessage('name is required')
    .isLength({ max: 150 })
    .trim(),
  nullableString('address_line1'),
  nullableString('address_line2'),
  nullableString('city'),
  nullableString('postcode'),
  nullableString('country'),
  body('phone')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v))
    .if(body('phone').not().isIn([null, '']))
    .isLength({ max: 50 }),
  body('email')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v))
    .if(body('email').not().isIn([null, '']))
    .isEmail().withMessage('email must be a valid email address')
    .isLength({ max: 150 }),
  nullableString('vat_number'),
  body('is_backmarket')
    .optional()
    .isBoolean().withMessage('is_backmarket must be a boolean')
    .toBoolean(),
  validate
];

export const validateUpdateCustomer = [
  body('name')
    .optional()
    .notEmpty().withMessage('name cannot be empty')
    .isLength({ max: 150 })
    .trim(),
  nullableString('address_line1'),
  nullableString('address_line2'),
  nullableString('city'),
  nullableString('postcode'),
  nullableString('country'),
  body('phone')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v))
    .if(body('phone').not().isIn([null, '']))
    .isLength({ max: 50 }),
  body('email')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v))
    .if(body('email').not().isIn([null, '']))
    .isEmail().withMessage('email must be a valid email address')
    .isLength({ max: 150 }),
  nullableString('vat_number'),
  body('is_backmarket')
    .optional()
    .isBoolean().withMessage('is_backmarket must be a boolean')
    .toBoolean(),
  validate
];

// ─── Suppliers ────────────────────────────────────────────────────────────────

export const validateCreateSupplier = [
  body('name')
    .notEmpty().withMessage('name is required')
    .isLength({ max: 150 })
    .trim(),
  nullableString('address_line1'),
  nullableString('address_line2'),
  nullableString('city'),
  nullableString('postcode'),
  nullableString('country'),
  body('phone')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v))
    .if(body('phone').not().isIn([null, '']))
    .isLength({ max: 50 }),
  body('email')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v))
    .if(body('email').not().isIn([null, '']))
    .isEmail().withMessage('email must be a valid email address')
    .isLength({ max: 150 }),
  nullableString('vat_number'),
  validate
];

export const validateUpdateSupplier = [
  body('name')
    .optional()
    .notEmpty().withMessage('name cannot be empty')
    .isLength({ max: 150 })
    .trim(),
  nullableString('address_line1'),
  nullableString('address_line2'),
  nullableString('city'),
  nullableString('postcode'),
  nullableString('country'),
  body('phone')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v))
    .if(body('phone').not().isIn([null, '']))
    .isLength({ max: 50 }),
  body('email')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v))
    .if(body('email').not().isIn([null, '']))
    .isEmail().withMessage('email must be a valid email address')
    .isLength({ max: 150 }),
  nullableString('vat_number'),
  validate
];

// ─── Level 3 Repairs ──────────────────────────────────────────────────────────

export const validateBookRepair = [
  body('imei')
    .matches(/^\d{14,15}$/).withMessage('IMEI must be 14–15 digits'),
  body('location_code')
    .notEmpty().withMessage('location_code is required')
    .trim(),
  body('fault_description')
    .notEmpty().withMessage('fault_description is required')
    .isLength({ min: 5 }).withMessage('fault_description must be at least 5 characters')
    .trim(),
  validate
];

export const validateUpdateRepair = [
  body('status')
    .optional()
    .isIn(['BOOKED_IN', 'IN_PROGRESS', 'AWAITING_PARTS', 'ON_HOLD', 'COMPLETED', 'BER', 'UNREPAIRABLE'])
    .withMessage('Invalid repair status'),
  body('engineer_comments')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v)),
  validate
];

// ─── Admin Operations ─────────────────────────────────────────────────────────

export const validateVerifyPin = [
  body('pin')
    .notEmpty().withMessage('pin is required'),
  body('operation')
    .notEmpty().withMessage('operation is required')
    .isIn(['Location Management', 'Color Check', 'Label Print'])
    .withMessage('Invalid operation type'),
  // reason required only when operation is "Location Management"
  body('reason').custom((value, { req }) => {
    if (req.body.operation === 'Location Management') {
      if (!value || String(value).trim() === '') {
        throw new Error('reason is required for Location Management operations');
      }
    }
    return true;
  }),
  validate
];

// ─── Devices ──────────────────────────────────────────────────────────────────

export const validateUpdateDevice = [
  body('storage_gb')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' || v === 0 ? null : v)),
  body('color')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v)),
  body('oem_color')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v)),
  body('grade')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v))
    .if(body('grade').not().isIn([null, undefined]))
    .isIn(['A', 'B', 'C', 'D', 'E', 'F']).withMessage('grade must be A–F'),
  body('location_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).toInt(),
  validate
];

export const validateUpdateDeviceStatus = [
  body('status')
    .notEmpty().withMessage('status is required')
    .isIn([
      'IN_STOCK', 'OUT_OF_STOCK', 'AWAITING_QC', 'IN_QC',
      'AWAITING_REPAIR', 'IN_REPAIR', 'IN_LEVEL3',
      'SHIPPED', 'RETURNED', 'SCRAPPED'
    ]).withMessage('Invalid device status'),
  validate
];

// ─── QC Jobs & Results ────────────────────────────────────────────────────────

export const validateCreateQcJob = [
  posInt('purchase_order_id'),
  validate
];

export const validateUpdateQcJob = [
  body('status')
    .optional()
    .isIn(['PENDING', 'IN_PROGRESS', 'CANCELLED'])
    .withMessage('Invalid QC job status'),
  optPosInt('assigned_to'),
  validate
];

// Batch-save endpoint: validates an array of per-device result rows
export const validateSaveQcResults = [
  body('results')
    .isArray({ min: 1 }).withMessage('results must be a non-empty array')
    .custom((rows) => {
      const deviceIds = rows.map((row) => row?.device_id);
      if (new Set(deviceIds).size !== deviceIds.length) {
        throw new Error('results must not contain duplicate device_id values');
      }
      return true;
    }),
  body('results.*.device_id')
    .isInt({ min: 1 }).withMessage('device_id must be a positive integer')
    .toInt(),
  body('results.*.functional_result')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v))
    .if(body('results.*.functional_result').not().isIn([null, undefined]))
    .isIn(['PASS', 'FAIL', 'UNABLE', 'NA'])
    .withMessage('functional_result must be PASS, FAIL, UNABLE, or NA'),
  body('results.*.cosmetic_result')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v))
    .if(body('results.*.cosmetic_result').not().isIn([null, undefined]))
    .isIn(['PASS', 'FAIL', 'NA'])
    .withMessage('cosmetic_result must be PASS, FAIL, or NA'),
  body('results.*.grade_assigned')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v))
    .if(body('results.*.grade_assigned').not().isIn([null, undefined]))
    .isIn(['A', 'B', 'C', 'D', 'E', 'F'])
    .withMessage('grade_assigned must be A–F'),
  body('results.*.color_verified')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v)),
  body('results.*.comments')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v)),
  body('results.*.non_uk')
    .optional({ nullable: true })
    .isBoolean().toBoolean(),
  body('results.*.blackbelt_ref')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v)),
  body('results.*.blackbelt_passed')
    .optional({ nullable: true })
    .isBoolean().toBoolean(),
  validate
];

// Kept for backwards-compatibility — no longer used directly (batch save replaces these)
export const validateCreateQcResult = [validate];
export const validateUpdateQcResult = [validate];

// ─── Repair Jobs & Records ────────────────────────────────────────────────────

export const validateCreateRepairJob = [
  posInt('purchase_order_id'),
  nullableString('notes'),
  body('priority')
    .optional()
    .isIn(['LOW', 'NORMAL', 'HIGH', 'URGENT']).withMessage('Invalid repair priority'),
  body('target_sales_order_id')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' || v === 0 || v === '0' ? null : v))
    .if(body('target_sales_order_id').not().isIn([null, undefined]))
    .isInt({ min: 1 }).withMessage('target_sales_order_id must be a positive integer')
    .toInt(),
  validate
];

export const validateUpdateRepairJob = [
  body('status')
    .optional()
    .isIn(['CANCELLED', 'COMPLETED'])
    .withMessage('Invalid repair job status'),
  nullableString('notes'),
  body('priority')
    .optional()
    .isIn(['LOW', 'NORMAL', 'HIGH', 'URGENT']).withMessage('Invalid repair priority'),
  body('target_sales_order_id')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' || v === 0 || v === '0' ? null : v))
    .if(body('target_sales_order_id').not().isIn([null, undefined]))
    .isInt({ min: 1 }).withMessage('target_sales_order_id must be a positive integer')
    .toInt(),
  validate
];

export const validateCreateRepairRecord = [
  posInt('repair_job_id'),
  posInt('device_id'),
  body('fault_description')
    .notEmpty().withMessage('fault_description is required')
    .isLength({ min: 5 }).withMessage('fault_description must be at least 5 characters')
    .trim(),
  nullableString('engineer_comments'),
  validate
];

export const validateUpdateRepairRecord = [
  body('status')
    .optional()
    .isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ESCALATED_L3', 'BER'])
    .withMessage('Invalid repair record status'),
  nullableString('engineer_comments'),
  nullableString('outcome'),
  nullableString('resolution_notes'),
  validate
];

export const validateAddRepairPart = [
  posInt('part_id'),
  body('quantity')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('quantity must be at least 1')
    .toInt(),
  validate
];

export const validateAddDevicesToRepairJob = [
  body('device_ids')
    .isArray({ min: 1 }).withMessage('device_ids must be a non-empty array'),
  body('device_ids.*')
    .isInt({ min: 1 }).withMessage('Each device id must be a positive integer')
    .toInt(),
  body('fault_description')
    .notEmpty().withMessage('fault_description is required')
    .isLength({ min: 5 }).withMessage('fault_description must be at least 5 characters')
    .trim(),
  validate
];

export const validateAddRepairComment = [
  body('comment_text')
    .notEmpty().withMessage('comment_text is required')
    .isLength({ min: 2 }).withMessage('comment_text must be at least 2 characters')
    .trim(),
  validate
];

export const validateRepairPartReserve = [
  posInt('part_id'),
  posInt('part_lot_id'),
  body('quantity')
    .isInt({ min: 1 }).withMessage('quantity must be at least 1')
    .toInt(),
  nullableString('notes'),
  validate
];

export const validateRepairPartFit = [
  body('repair_part_id')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' || v === 0 || v === '0' ? null : v))
    .if(body('repair_part_id').not().isIn([null, undefined]))
    .isInt({ min: 1 }).withMessage('repair_part_id must be a positive integer')
    .toInt(),
  body('part_id')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' || v === 0 || v === '0' ? null : v))
    .if(body('part_id').not().isIn([null, undefined]))
    .isInt({ min: 1 }).withMessage('part_id must be a positive integer')
    .toInt(),
  body('part_lot_id')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' || v === 0 || v === '0' ? null : v))
    .if(body('part_lot_id').not().isIn([null, undefined]))
    .isInt({ min: 1 }).withMessage('part_lot_id must be a positive integer')
    .toInt(),
  body('quantity')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('quantity must be at least 1')
    .toInt(),
  body('direct_from_available')
    .optional()
    .isBoolean().withMessage('direct_from_available must be a boolean')
    .toBoolean(),
  nullableString('notes'),
  body().custom((value, { req }) => {
    if (!req.body.repair_part_id && (!req.body.part_id || !req.body.part_lot_id || !req.body.quantity)) {
      throw new Error('Either repair_part_id or part_id + part_lot_id + quantity is required');
    }
    return true;
  }),
  validate
];

export const validateRepairPartRemove = [
  posInt('repair_part_id'),
  body('disposition')
    .notEmpty().withMessage('disposition is required')
    .isIn(['RESTOCK', 'FAULTY']).withMessage('Invalid part disposition'),
  body('quantity')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('quantity must be at least 1')
    .toInt(),
  nullableString('fault_reason'),
  nullableString('notes'),
  body('fault_reason').custom((value, { req }) => {
    if (req.body.disposition === 'FAULTY' && (!value || !String(value).trim())) {
      throw new Error('fault_reason is required when removing a part as faulty');
    }
    return true;
  }),
  validate
];

export const validateBulkRepair = [
  body('device_ids')
    .isArray({ min: 1, max: 50 }).withMessage('device_ids must contain between 1 and 50 devices')
    .custom((value) => {
      const unique = new Set(value);
      if (unique.size !== value.length) {
        throw new Error('Duplicate device IDs are not allowed');
      }
      return true;
    }),
  body('device_ids.*')
    .isInt({ min: 1 }).withMessage('Each device id must be a positive integer')
    .toInt(),
  body('part_allocations')
    .isArray({ min: 1, max: 20 }).withMessage('part_allocations must contain between 1 and 20 parts'),
  body('part_allocations.*.part_id')
    .isInt({ min: 1 }).withMessage('Each part_id must be a positive integer')
    .toInt(),
  body('part_allocations.*.part_lot_id')
    .isInt({ min: 1 }).withMessage('Each part_lot_id must be a positive integer')
    .toInt(),
  validate
];

export const validateCreatePartBase = [
  body('base_code')
    .notEmpty().withMessage('base_code is required')
    .isLength({ max: 120 }).trim(),
  body('name')
    .notEmpty().withMessage('name is required')
    .isLength({ max: 200 }).trim(),
  posInt('category_id'),
  optPosInt('manufacturer_id'),
  nullableString('subtype'),
  body('changes_device_color')
    .optional()
    .isBoolean().withMessage('changes_device_color must be a boolean')
    .toBoolean(),
  nullableString('notes'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean')
    .toBoolean(),
  validate
];

export const validateUpdatePartBase = [
  body('base_code')
    .optional()
    .isLength({ max: 120 }).trim(),
  body('name')
    .optional()
    .isLength({ max: 200 }).trim(),
  optPosInt('category_id'),
  optPosInt('manufacturer_id'),
  nullableString('subtype'),
  body('changes_device_color')
    .optional()
    .isBoolean().withMessage('changes_device_color must be a boolean')
    .toBoolean(),
  nullableString('notes'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean')
    .toBoolean(),
  validate
];

export const validateCreatePartVariant = [
  posInt('part_base_id'),
  body('sku')
    .notEmpty().withMessage('sku is required')
    .isLength({ max: 50 }).trim(),
  body('name')
    .notEmpty().withMessage('name is required')
    .isLength({ max: 200 }).trim(),
  posInt('category_id'),
  nullableString('color'),
  body('quality_tier')
    .optional()
    .isIn(['OEM', 'OEM_PULL', 'PREMIUM', 'AFTERMARKET', 'REFURBISHED', 'OTHER'])
    .withMessage('Invalid quality tier'),
  nullableString('supplier_part_ref'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean')
    .toBoolean(),
  validate
];

export const validateUpdatePartVariant = [
  body('sku')
    .optional()
    .isLength({ max: 50 }).trim(),
  body('name')
    .optional()
    .isLength({ max: 200 }).trim(),
  optPosInt('category_id'),
  nullableString('color'),
  body('quality_tier')
    .optional()
    .isIn(['OEM', 'OEM_PULL', 'PREMIUM', 'AFTERMARKET', 'REFURBISHED', 'OTHER'])
    .withMessage('Invalid quality tier'),
  nullableString('supplier_part_ref'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean')
    .toBoolean(),
  validate
];

export const validateCreatePartCompatibility = [
  posInt('part_base_id'),
  posInt('model_id'),
  nullableString('notes'),
  validate
];

export const validateUpdatePartCompatibility = [
  optPosInt('part_base_id'),
  optPosInt('model_id'),
  nullableString('notes'),
  validate
];

export const validatePartGoodsIn = [
  posInt('part_id'),
  optPosInt('supplier_id'),
  nullableString('supplier_ref'),
  nullableString('lot_ref'),
  body('quantity')
    .isInt({ min: 1 }).withMessage('quantity must be at least 1')
    .toInt(),
  nullableString('notes'),
  validate
];

export const validateBulkGoodsIn = [
  optPosInt('supplier_id'),
  nullableString('lot_ref'),
  nullableString('notes'),
  body('items')
    .isArray({ min: 1 }).withMessage('items must be a non-empty array'),
  body('items.*.part_id')
    .isInt({ min: 1 }).withMessage('Each item part_id must be a positive integer')
    .toInt(),
  body('items.*.quantity')
    .isInt({ min: 1 }).withMessage('Each item quantity must be at least 1')
    .toInt(),
  body('items.*.notes')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v)),
  validate
];

export const validatePartGoodsOut = [
  posInt('part_id'),
  posInt('part_lot_id'),
  body('quantity')
    .isInt({ min: 1 }).withMessage('quantity must be at least 1')
    .toInt(),
  body('reason').custom((value, { req }) => {
    const isFaulty = req.body.is_faulty === true || req.body.is_faulty === 'true';
    if (!isFaulty && (!value || !String(value).trim())) {
      throw new Error('reason is required');
    }
    return true;
  }).customSanitizer((v) => (v === '' ? null : v)),
  body('is_faulty')
    .optional()
    .isBoolean().withMessage('is_faulty must be a boolean')
    .toBoolean(),
  nullableString('fault_reason'),
  nullableString('notes'),
  body('fault_reason').custom((value, { req }) => {
    if (req.body.is_faulty && (!value || !String(value).trim())) {
      throw new Error('fault_reason is required when booking out a faulty part');
    }
    return true;
  }),
  validate
];

export const validateUpdateFaultReport = [
  body('status')
    .optional()
    .isIn(['OPEN', 'RMA_REQUESTED', 'RETURNED', 'CREDIT_RECEIVED', 'WRITTEN_OFF'])
    .withMessage('Invalid fault report status'),
  nullableString('notes'),
  validate
];

// ─── Location Management ──────────────────────────────────────────────────────

export const validateLocationDeviceParam = [
  param('imei')
    .matches(/^\d{14,15}$/).withMessage('IMEI must be 14–15 digits'),
  validate
];

export const validateBulkMoveDevices = [
  body('devices').isArray({ min: 1 }).withMessage('devices must be a non-empty array'),
  body('devices.*.imei')
    .matches(/^\d{14,15}$/).withMessage('Each device IMEI must be 14–15 digits'),
  body('new_location').notEmpty().withMessage('new_location is required').trim(),
  body('reason').notEmpty().withMessage('reason is required').trim(),
  body('operation_date')
    .optional({ nullable: true })
    .custom((v) => {
      if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        throw new Error('operation_date must be in YYYY-MM-DD format');
      }
      return true;
    }),
  validate
];

const validateAutomationEnvelope = [
  body('quantum_event_id')
    .matches(/^\d+$/).withMessage('quantum_event_id must be a positive integer string'),
  body('idempotency_key')
    .notEmpty().withMessage('idempotency_key is required')
    .isLength({ max: 255 }).withMessage('idempotency_key is too long'),
  body('source_event_type')
    .notEmpty().withMessage('source_event_type is required')
    .isLength({ max: 100 }).withMessage('source_event_type is too long'),
  body('source_created_at')
    .notEmpty().withMessage('source_created_at is required')
    .isISO8601().withMessage('source_created_at must be ISO8601'),
  body('source_user')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v))
    .isLength({ max: 100 }).withMessage('source_user is too long'),
  body('snapshot_generated_at')
    .notEmpty().withMessage('snapshot_generated_at is required')
    .isISO8601().withMessage('snapshot_generated_at must be ISO8601'),
];

export const validateAutomationPurchaseSync = [
  param('legacyPurchaseId')
    .matches(/^\d+$/).withMessage('legacyPurchaseId must be a positive integer string'),
  ...validateAutomationEnvelope,
  body('purchase').isObject().withMessage('purchase is required'),
  body('purchase.purchase_date')
    .optional({ nullable: true })
    .isISO8601().withMessage('purchase.purchase_date must be ISO8601'),
  body('purchase.po_ref')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v)),
  body('purchase.supplier')
    .isObject().withMessage('purchase.supplier is required'),
  body('purchase.supplier.supplier_code')
    .notEmpty().withMessage('purchase.supplier.supplier_code is required'),
  body('purchase.supplier.name')
    .notEmpty().withMessage('purchase.supplier.name is required'),
  body('purchase.requires_qc')
    .optional()
    .isBoolean().withMessage('purchase.requires_qc must be boolean')
    .toBoolean(),
  body('purchase.requires_repair')
    .optional()
    .isBoolean().withMessage('purchase.requires_repair must be boolean')
    .toBoolean(),
  body('purchase.notes')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v)),
  body('purchase.fault_description')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v)),
  body('purchase.devices')
    .isArray({ min: 1 }).withMessage('purchase.devices must be a non-empty array'),
  body('purchase.devices.*.imei')
    .matches(/^\d{14,15}$/).withMessage('purchase.devices[].imei must be 14–15 digits'),
  body('purchase.devices.*.tray_id')
    .notEmpty().withMessage('purchase.devices[].tray_id is required'),
  body('purchase.devices.*.item_brand')
    .notEmpty().withMessage('purchase.devices[].item_brand is required'),
  body('purchase.devices.*.item_details')
    .notEmpty().withMessage('purchase.devices[].item_details is required'),
  body('purchase.devices.*.item_gb')
    .optional({ nullable: true }),
  body('purchase.devices.*.item_color')
    .optional({ nullable: true }),
  body('purchase.devices.*.item_grade')
    .optional({ nullable: true }),
  body('purchase.devices.*.received_at')
    .optional({ nullable: true })
    .isISO8601().withMessage('purchase.devices[].received_at must be ISO8601'),
  validate,
];

export const validateAutomationSalesOrderSync = [
  param('legacyOrderId')
    .matches(/^\d+$/).withMessage('legacyOrderId must be a positive integer string'),
  ...validateAutomationEnvelope,
  body('sales_order').isObject().withMessage('sales_order is required'),
  body('sales_order.order_date')
    .optional({ nullable: true })
    .isISO8601().withMessage('sales_order.order_date must be ISO8601'),
  body('sales_order.customer').isObject().withMessage('sales_order.customer is required'),
  body('sales_order.customer.customer_code')
    .notEmpty().withMessage('sales_order.customer.customer_code is required'),
  body('sales_order.customer.name')
    .notEmpty().withMessage('sales_order.customer.name is required'),
  body('sales_order.customer.is_backmarket')
    .optional()
    .isBoolean().withMessage('sales_order.customer.is_backmarket must be boolean')
    .toBoolean(),
  body('sales_order.customer_ref')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v)),
  body('sales_order.po_ref')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v)),
  body('sales_order.notes')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v)),
  body('sales_order.devices_authoritative')
    .optional()
    .isBoolean().withMessage('sales_order.devices_authoritative must be boolean')
    .toBoolean(),
  body('sales_order.lines')
    .optional()
    .isArray({ min: 1 }).withMessage('sales_order.lines must be a non-empty array when provided'),
  body('sales_order.lines.*.supplier_code')
    .optional()
    .notEmpty().withMessage('sales_order.lines[].supplier_code is required'),
  body('sales_order.lines.*.tray_id')
    .optional()
    .notEmpty().withMessage('sales_order.lines[].tray_id is required'),
  body('sales_order.lines.*.item_brand')
    .optional()
    .notEmpty().withMessage('sales_order.lines[].item_brand is required'),
  body('sales_order.lines.*.item_details')
    .optional()
    .notEmpty().withMessage('sales_order.lines[].item_details is required'),
  body('sales_order.lines.*.item_gb')
    .optional({ nullable: true }),
  body('sales_order.lines.*.item_color')
    .optional({ nullable: true }),
  body('sales_order.lines.*.item_grade')
    .optional({ nullable: true }),
  body('sales_order.lines.*.requested_quantity')
    .optional()
    .isInt({ min: 1 }).withMessage('sales_order.lines[].requested_quantity must be a positive integer')
    .toInt(),
  body('sales_order.lines.*.supplier')
    .optional({ nullable: true })
    .isObject().withMessage('sales_order.lines[].supplier must be an object when provided'),
  body('sales_order.devices')
    .optional()
    .isArray().withMessage('sales_order.devices must be an array when provided'),
  body('sales_order.devices.*.imei')
    .matches(/^\d{14,15}$/).withMessage('sales_order.devices[].imei must be 14–15 digits'),
  body('sales_order.devices.*.supplier_code')
    .notEmpty().withMessage('sales_order.devices[].supplier_code is required'),
  body('sales_order.devices.*.tray_id')
    .notEmpty().withMessage('sales_order.devices[].tray_id is required'),
  body('sales_order.devices.*.item_brand')
    .notEmpty().withMessage('sales_order.devices[].item_brand is required'),
  body('sales_order.devices.*.item_details')
    .notEmpty().withMessage('sales_order.devices[].item_details is required'),
  body('sales_order.devices.*.item_gb')
    .optional({ nullable: true }),
  body('sales_order.devices.*.item_color')
    .optional({ nullable: true }),
  body('sales_order.devices.*.item_grade')
    .optional({ nullable: true }),
  body('sales_order.devices.*.supplier')
    .optional({ nullable: true })
    .isObject().withMessage('sales_order.devices[].supplier must be an object when provided'),
  body('sales_order').custom((salesOrder) => {
    const hasLines = Array.isArray(salesOrder?.lines) && salesOrder.lines.length > 0;
    const hasDevices = Array.isArray(salesOrder?.devices) && salesOrder.devices.length > 0;

    if (!hasLines && !hasDevices) {
      throw new Error('sales_order must include at least one line or device');
    }

    if (salesOrder?.devices_authoritative && !hasDevices) {
      throw new Error('sales_order.devices_authoritative requires a non-empty devices array');
    }

    return true;
  }),
  validate,
];

export const validateAutomationQcSync = [
  param('legacyPurchaseId')
    .matches(/^\d+$/).withMessage('legacyPurchaseId must be a positive integer string'),
  ...validateAutomationEnvelope,
  body('purchase').isObject().withMessage('purchase is required'),
  body('purchase.devices')
    .isArray({ min: 1 }).withMessage('purchase.devices must be a non-empty array'),
  body('purchase.devices.*.imei')
    .matches(/^\d{14,15}$/).withMessage('purchase.devices[].imei must be 14–15 digits'),
  body('purchase.devices.*.functional_result')
    .optional({ nullable: true })
    .isIn(['PASS', 'FAIL', 'UNABLE', 'NA']).withMessage('functional_result must be PASS, FAIL, UNABLE, or NA'),
  body('purchase.devices.*.cosmetic_result')
    .optional({ nullable: true })
    .isIn(['PASS', 'FAIL', 'NA']).withMessage('cosmetic_result must be PASS, FAIL, or NA'),
  body('purchase.devices.*.non_uk')
    .optional()
    .isBoolean().withMessage('non_uk must be boolean')
    .toBoolean(),
  body('purchase.devices.*.item_functional_passed')
    .optional({ nullable: true })
    .isIn([0, 1, '0', '1']).withMessage('item_functional_passed must be 0 or 1'),
  body('purchase.devices.*.item_cosmetic_passed')
    .optional({ nullable: true })
    .isIn([0, 1, '0', '1']).withMessage('item_cosmetic_passed must be 0 or 1'),
  body('purchase.devices.*.item_grade')
    .optional({ nullable: true }),
  body('purchase.devices.*.item_color')
    .optional({ nullable: true }),
  body('purchase.devices.*.item_comments')
    .optional({ nullable: true }),
  body('purchase.devices.*.item_eu')
    .optional({ nullable: true }),
  validate,
];

export const validateAutomationDeviceMove = [
  param('imei')
    .matches(/^\d{14,15}$/).withMessage('imei must be 14–15 digits'),
  ...validateAutomationEnvelope,
  body('new_location')
    .notEmpty().withMessage('new_location is required')
    .trim(),
  body('old_location')
    .optional({ nullable: true })
    .customSanitizer((v) => (v === '' ? null : v)),
  body('reason')
    .notEmpty().withMessage('reason is required')
    .trim(),
  body('operation_date')
    .optional({ nullable: true })
    .custom((v) => {
      if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        throw new Error('operation_date must be in YYYY-MM-DD format');
      }
      return true;
    }),
  body('admin_op_id')
    .optional({ nullable: true })
    .matches(/^\d+$/).withMessage('admin_op_id must be a positive integer string'),
  validate,
];

// ─── Common param validators ──────────────────────────────────────────────────

// Use on routes with :id param to ensure it's a positive integer
export const validateIdParam = [
  param('id')
    .isInt({ min: 1 }).withMessage('id must be a positive integer')
    .toInt(),
  validate
];
