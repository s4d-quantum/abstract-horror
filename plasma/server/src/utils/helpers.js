// Extract TAC (first 8 digits) from IMEI
export function extractTAC(imei) {
  if (!imei || imei.length < 8) {
    throw new Error('Invalid IMEI');
  }
  return imei.substring(0, 8);
}

// Validate IMEI format (basic validation)
export function validateIMEI(imei) {
  if (!imei) return false;
  // IMEI should be 15 or 14 digits
  return /^\d{14,15}$/.test(imei);
}

// Generate next sequential number for entities
export function generateSequentialNumber(prefix, currentMax) {
  // Ensure currentMax is a number (MySQL returns strings)
  const maxNum = Number(currentMax) || 0;
  const nextNum = maxNum + 1;
  return `${prefix}-${String(nextNum).padStart(5, '0')}`;
}

// Build pagination response
export function buildPaginationResponse(data, page, limit, total) {
  return {
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total
    }
  };
}

// Build query with filters
export function buildFilterQuery(baseQuery, filters, params = []) {
  let query = baseQuery;
  const queryParams = [...params];

  // Add WHERE clause if filters exist
  const whereConditions = [];

  if (filters.status) {
    whereConditions.push('d.status = ?');
    queryParams.push(filters.status);
  }

  if (filters.manufacturer_id) {
    whereConditions.push('d.manufacturer_id = ?');
    queryParams.push(Number(filters.manufacturer_id));
  }

  if (filters.model_id) {
    whereConditions.push('d.model_id = ?');
    queryParams.push(Number(filters.model_id));
  }

  if (filters.supplier_id) {
    whereConditions.push('d.supplier_id = ?');
    queryParams.push(Number(filters.supplier_id));
  }

  if (filters.location_id) {
    whereConditions.push('d.location_id = ?');
    queryParams.push(Number(filters.location_id));
  }

  if (filters.grade) {
    whereConditions.push('d.grade = ?');
    queryParams.push(filters.grade);
  }

  if (filters.color) {
    whereConditions.push('d.color = ?');
    queryParams.push(filters.color);
  }

  if (filters.oem_color) {
    whereConditions.push('d.oem_color = ?');
    queryParams.push(filters.oem_color);
  }

  // Date range filters
  if (filters.date_from) {
    whereConditions.push('d.created_at >= ?');
    queryParams.push(filters.date_from);
  }

  if (filters.date_to) {
    whereConditions.push('d.created_at <= ?');
    queryParams.push(filters.date_to + ' 23:59:59');
  }

  // Search filters
  if (filters.search) {
    whereConditions.push('(d.imei LIKE ? OR mo.model_number LIKE ? OR mo.model_name LIKE ?)');
    const searchTerm = `%${filters.search}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm);
  }

  if (whereConditions.length > 0) {
    // Check if WHERE already exists in base query
    if (query.toUpperCase().includes('WHERE')) {
      query += ' AND ' + whereConditions.join(' AND ');
    } else {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
  }

  return { query, params: queryParams };
}

// Format date to MySQL datetime
export function formatDateForMySQL(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// Log activity
export async function logActivity(connection, data) {
  const { action, entityType, entityId, imei, details, userId, ipAddress, sessionId } = data;

  const sql = `
    INSERT INTO activity_log (log_date, action, entity_type, entity_id, imei, details, user_id, ip_address, session_id)
    VALUES (CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await connection.execute(sql, [
    action,
    entityType || null,
    entityId || null,
    imei || null,
    details ? JSON.stringify(details) : null,
    userId || null,
    ipAddress || null,
    sessionId || null
  ]);
}

// Log device history
export async function logDeviceHistory(connection, data) {
  const { deviceId, imei, eventType, fieldChanged, oldValue, newValue, referenceType, referenceId, notes, userId } = data;

  const sql = `
    INSERT INTO device_history
    (device_id, imei, event_type, field_changed, old_value, new_value, reference_type, reference_id, notes, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await connection.execute(sql, [
    deviceId,
    imei,
    eventType,
    fieldChanged || null,
    oldValue || null,
    newValue || null,
    referenceType || null,
    referenceId || null,
    notes || null,
    userId || null
  ]);
}

export class AppError extends Error {
  constructor(message, statusCode = 400, code = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

// Success response helper
export function successResponse(res, data, message = 'Success', statusCode = 200) {
  if (process.env.NODE_ENV !== 'production' && data && ('success' in data || 'message' in data)) {
    console.warn('[successResponse] data contains reserved key "success" or "message" — it will shadow the response envelope');
  }
  res.status(statusCode).json({
    success: true,
    message,
    ...data
  });
}

// Error response helper
export function errorResponse(res, message, code = 'ERROR', statusCode = 400) {
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message
    }
  });
}
