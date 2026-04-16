import db, { transaction } from '../config/database.js';
import { getBackmarketCustomerPredicate, isBackmarketCustomerRecord } from '../utils/backmarket.utils.js';

/**
 * Tokenize model strings for the legacy line-assignment heuristic.
 * Short/common fragments like `sm`, `ds`, and `legacy` are ignored because
 * they create noisy matches across Samsung dual-SIM and migration-era names.
 */
function extractModelTokens(...values) {
  const tokenSet = new Set();

  values
    .filter(Boolean)
    .flatMap((value) => String(value).toLowerCase().split(/[^a-z0-9]+/))
    .forEach((token) => {
      if (!token || token === 'sm' || token === 'ds' || token === 'legacy' || token.length < 2) {
        return;
      }

      tokenSet.add(token);

      if (token.startsWith('sm') && token.length > 2) {
        tokenSet.add(token.slice(2));
      }
    });

  return tokenSet;
}

function scoreLegacyDeviceForLine(device, line) {
  if (line.manufacturer_id && device.manufacturer_id !== line.manufacturer_id) {
    return -1;
  }

  if (line.supplier_id && device.supplier_id !== line.supplier_id) {
    return -1;
  }

  if (line.storage_gb && device.storage !== line.storage_gb) {
    return -1;
  }

  if (line.color && device.color !== line.color) {
    return -1;
  }

  if (line.grade && device.grade !== line.grade) {
    return -1;
  }

  let score = 0;
  const lineTokens = extractModelTokens(line.model_name, line.model_number);
  const deviceTokens = extractModelTokens(device.model_name, device.model_number);

  // Model token matches are weighted more heavily than specs on purpose:
  // the legacy migration data is noisier around attributes than model names.
  for (const token of lineTokens) {
    if (deviceTokens.has(token)) {
      score += 3;
    }
  }

  if (line.storage_gb && device.storage === line.storage_gb) {
    score += 2;
  }

  if (line.color && device.color === line.color) {
    score += 2;
  }

  if (line.grade && device.grade === line.grade) {
    score += 2;
  }

  if (line.supplier_id && device.supplier_id === line.supplier_id) {
    score += 2;
  }

  return score;
}

function isMissingLegacyTableError(error) {
  return error?.code === 'ER_NO_SUCH_TABLE';
}

async function assignLegacyDevicesToLines(salesOrderId, devices) {
  const devicesCopy = devices.map((device) => ({ ...device }));

  if (!devicesCopy.some((device) => !device.sales_order_line_id)) {
    return devicesCopy;
  }

  const [lines] = await db.query(`
    SELECT
      sol.id,
      sol.manufacturer_id,
      sol.model_id,
      mo.model_name,
      mo.model_number,
      sol.storage_gb,
      sol.color,
      sol.grade,
      sol.supplier_id,
      sol.requested_quantity
    FROM sales_order_lines sol
    JOIN models mo ON mo.id = sol.model_id
    WHERE sol.sales_order_id = ?
    ORDER BY sol.id
  `, [salesOrderId]);

  if (lines.length === 0) {
    return devicesCopy;
  }

  const assignedCounts = new Map();
  for (const line of lines) {
    assignedCounts.set(line.id, 0);
  }

  for (const device of devicesCopy) {
    if (device.sales_order_line_id) {
      assignedCounts.set(
        device.sales_order_line_id,
        (assignedCounts.get(device.sales_order_line_id) || 0) + 1
      );
    }
  }

  const unmatchedDevices = devicesCopy.filter((device) => !device.sales_order_line_id);
  for (const device of unmatchedDevices) {
    const candidates = lines
      .filter((line) => (assignedCounts.get(line.id) || 0) < line.requested_quantity)
      .map((line) => ({ line, score: scoreLegacyDeviceForLine(device, line) }))
      .filter((candidate) => candidate.score >= 0)
      .sort((a, b) => b.score - a.score || a.line.id - b.line.id);

    let chosenLine = null;

    if (candidates.length > 0) {
      // Ties are resolved by the candidate sort above: highest score wins,
      // then the lowest sales_order_lines.id wins to keep assignment stable.
      chosenLine = candidates[0].line;
    } else if (lines.length === 1) {
      chosenLine = lines[0];
    }

    if (chosenLine) {
      device.sales_order_line_id = chosenLine.id;
      assignedCounts.set(chosenLine.id, (assignedCounts.get(chosenLine.id) || 0) + 1);
    }
  }

  return devicesCopy;
}

export const salesOrderModel = {
  // Get available devices grouped by criteria for sales order creation
  async getAvailableDevicesGrouped(filters, pagination) {
    const { supplier_id, manufacturer_id, model_search, storage_gb, color } = filters;
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    const whereConditions = ['d.supplier_id = ?'];
    const params = [supplier_id];

    if (manufacturer_id) {
      whereConditions.push('d.manufacturer_id = ?');
      params.push(manufacturer_id);
    }

    if (storage_gb) {
      whereConditions.push('d.storage_gb = ?');
      params.push(storage_gb);
    }

    if (color) {
      whereConditions.push('d.color LIKE ?');
      params.push(`%${color}%`);
    }

    if (model_search) {
      whereConditions.push('(mo.model_name LIKE ? OR mo.model_number LIKE ?)');
      params.push(`%${model_search}%`, `%${model_search}%`);
    }

    // Get grouped devices with availability (aggregated across all locations)
    const [groups] = await db.query(`
      SELECT
        d.supplier_id,
        s.name as supplier_name,
        d.manufacturer_id,
        m.name as manufacturer_name,
        d.model_id,
        mo.model_name,
        mo.model_number,
        d.storage_gb,
        d.color,
        d.grade,
        COUNT(*) as available_count,
        SUM(CASE WHEN d.reserved_for_so_id IS NOT NULL THEN 1 ELSE 0 END) as reserved_count,
        COUNT(*) as total_count
      FROM devices d
      JOIN suppliers s ON d.supplier_id = s.id
      JOIN manufacturers m ON d.manufacturer_id = m.id
      JOIN models mo ON d.model_id = mo.id
      WHERE d.status = 'IN_STOCK' AND ${whereConditions.join(' AND ')}
      GROUP BY d.supplier_id, s.name, d.manufacturer_id, m.name, d.model_id, mo.model_name, mo.model_number, d.storage_gb, d.color, d.grade
      ORDER BY m.name, mo.model_name, mo.model_number, d.storage_gb, d.color, d.grade
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get total count of unique device groups
    const [countResult] = await db.query(`
      SELECT COUNT(DISTINCT CONCAT(
        d.supplier_id, '-',
        d.manufacturer_id, '-',
        d.model_id, '-',
        COALESCE(d.storage_gb, ''), '-',
        COALESCE(d.color, ''), '-',
        COALESCE(d.grade, '')
      )) as total
      FROM devices d
      JOIN suppliers s ON d.supplier_id = s.id
      JOIN manufacturers m ON d.manufacturer_id = m.id
      JOIN models mo ON d.model_id = mo.id
      WHERE d.status = 'IN_STOCK' AND ${whereConditions.join(' AND ')}
    `, params);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    return {
      groups,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages
      }
    };
  },

  // Check availability for order lines
  async checkAvailability(lines) {
    const availability = [];

    for (const line of lines) {
      const whereConditions = ['1=1'];
      const params = [];

      if (line.supplier_id) {
        whereConditions.push('supplier_id = ?');
        params.push(line.supplier_id);
      }

      if (line.manufacturer_id) {
        whereConditions.push('manufacturer_id = ?');
        params.push(line.manufacturer_id);
      }

      if (line.model_id) {
        whereConditions.push('model_id = ?');
        params.push(line.model_id);
      }

      if (line.storage_gb) {
        whereConditions.push('storage_gb = ?');
        params.push(line.storage_gb);
      }

      if (line.color) {
        whereConditions.push('color = ?');
        params.push(line.color);
      }

      if (line.grade) {
        whereConditions.push('grade = ?');
        params.push(line.grade);
      }

      const [results] = await db.query(`
        SELECT
          location_code,
          location_name,
          total_count,
          available_count,
          reserved_count,
          SUM(available_count) OVER() as total_available,
          SUM(total_count) OVER() as total_stock
        FROM v_device_availability
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY available_count DESC
      `, params);

      const totalAvailable = results.length > 0 ? results[0].total_available : 0;
      const totalStock = results.length > 0 ? results[0].total_stock : 0;

      availability.push({
        line: line,
        totalAvailable: parseInt(totalAvailable) || 0,
        totalStock: parseInt(totalStock) || 0,
        requested: line.requested_quantity || 0,
        isOverCommitted: (line.requested_quantity || 0) > (parseInt(totalAvailable) || 0),
        locations: results.map(r => ({
          locationCode: r.location_code,
          locationName: r.location_name,
          totalCount: r.total_count,
          availableCount: parseInt(r.available_count),
          reservedCount: parseInt(r.reserved_count)
        }))
      });
    }

    return availability;
  },

  // Get all sales orders with filters
  async getAll(filters = {}, pagination = {}, includeSummary = false) {
    const { page = 1, limit = 50 } = pagination;
    const offset = (page - 1) * limit;

    const selectClause = `
      SELECT
        so.id,
        so.so_number,
        so.customer_id,
        c.name as customer_name,
        c.customer_code,
        c.is_backmarket,
        so.order_type,
        so.backmarket_order_id,
        so.customer_ref,
        so.po_ref,
        so.status,
        so.courier,
        so.tracking_number,
        so.total_boxes,
        so.total_pallets,
        so.notes,
        so.created_by,
        u.username as created_by_username,
        so.confirmed_at,
        so.shipped_at,
        so.created_at,
        so.updated_at,
        COALESCE(sol.line_count, 0) as line_count,
        COALESCE(sol.total_requested, 0) as total_requested,
        COALESCE(sol.total_picked, 0) as total_picked
    `;
    const countFromClause = `
      FROM sales_orders so
      JOIN customers c ON so.customer_id = c.id
      WHERE 1=1
    `;
    const pageFromClause = `
      FROM sales_orders so
      JOIN customers c ON so.customer_id = c.id
      JOIN users u ON so.created_by = u.id
      LEFT JOIN (
        SELECT
          sales_order_id,
          COUNT(*) as line_count,
          SUM(requested_quantity) as total_requested,
          SUM(picked_quantity) as total_picked
        FROM sales_order_lines
        GROUP BY sales_order_id
      ) sol ON so.id = sol.sales_order_id
      WHERE 1=1
    `;
    // WARNING: Only ever extend whereClause using parameterized `?` placeholders.
    // Never use string interpolation (e.g. `AND status = '${value}'`) — SQL injection risk.
    let whereClause = '';

    const params = [];

    if (filters.status) {
      whereClause += ` AND so.status = ?`;
      params.push(filters.status);
    }

    if (filters.customer_id) {
      whereClause += ` AND so.customer_id = ?`;
      params.push(filters.customer_id);
    }

    if (filters.order_type) {
      whereClause += ` AND so.order_type = ?`;
      params.push(filters.order_type);
    }

    if (filters.search) {
      whereClause += ` AND (so.so_number LIKE ? OR so.backmarket_order_id LIKE ? OR so.customer_ref LIKE ? OR so.po_ref LIKE ? OR c.name LIKE ?)`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (filters.date_from) {
      whereClause += ` AND so.created_at >= ?`;
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      whereClause += ` AND so.created_at <= ?`;
      params.push(`${filters.date_to} 23:59:59`);
    }

    // Filter by is_backmarket flag
    if (filters.is_backmarket !== undefined) {
      const backmarketPredicate = getBackmarketCustomerPredicate('c');
      whereClause += filters.is_backmarket
        ? ` AND ${backmarketPredicate.clause}`
        : ` AND NOT ${backmarketPredicate.clause}`;
      params.push(...backmarketPredicate.params);
    }

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total ${countFromClause} ${whereClause}`,
      params
    );
    const total = Number(countResult[0]?.total) || 0;

    const [orders] = await db.query(
      `${selectClause} ${pageFromClause} ${whereClause} ORDER BY so.created_at DESC LIMIT ? OFFSET ?`,
      // Generate SO number with lock to prevent duplicates
      const lockName = "sales_order_number_lock";
      const lockTimeout = 10;

      try {
        const [lockResult] = await connection.query(
          `SELECT GET_LOCK(?, ?) AS lock_result`,
          [lockName, lockTimeout]
        );

        if (lockResult[0]?.lock_result !== 1) {
          try { await connection.query(`SELECT RELEASE_LOCK(?)`, [lockName]).catch(() => {}); } catch (_) {}
          throw new Error("SO_NUMBER_LOCK_TIMEOUT");
        }

        const [maxSO] = await connection.query(
          "SELECT MAX(CAST(SUBSTRING(so_number, 4) AS UNSIGNED)) as max_num FROM sales_orders"
        );
        const nextNum = (maxSO[0].max_num || 0) + 1;
        const soNumber = `SO-${String(nextNum).padStart(5, "0")}`;

        // Release lock early
        await connection.query(`SELECT RELEASE_LOCK(?)`, [lockName]).catch(() => {});
          JOIN customers c ON so.customer_id = c.id
          WHERE 1=1
          ${whereClause}
          GROUP BY so.status
        `,
        params
      );

      const [deviceCount] = await db.query(
        `
          SELECT COALESCE(SUM(line_totals.total_requested), 0) as total
          FROM sales_orders so
          JOIN customers c ON so.customer_id = c.id
          LEFT JOIN (
            SELECT
              sales_order_id,
              SUM(requested_quantity) as total_requested
            FROM sales_order_lines
            GROUP BY sales_order_id
          ) line_totals ON line_totals.sales_order_id = so.id
          WHERE 1=1
          ${whereClause}
        `,
        params
      );

      summary = {
        totalOrders: Number(total),
        processing: Number(statusCounts.find((row) => row.status === 'PROCESSING')?.count) || 0,
        shipped: (Number(statusCounts.find((row) => row.status === 'SHIPPED')?.count) || 0)
          + (Number(statusCounts.find((row) => row.status === 'DELIVERED')?.count) || 0),
        totalDevices: Number(deviceCount[0]?.total) || 0
      };
    }

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasMore: page * limit < total
      },
      summary
    };
  },

  // Get sales order by ID with full details
  async getById(id) {
    const [orders] = await db.query(`
      SELECT
        so.id,
        so.so_number,
        so.customer_id,
        c.name as customer_name,
        c.customer_code,
        c.is_backmarket,
        c.email as customer_email,
        c.phone as customer_phone,
        so.order_type,
        so.backmarket_order_id,
        so.customer_ref,
        so.po_ref,
        so.status,
        so.courier,
        so.tracking_number,
        so.total_boxes,
        so.total_pallets,
        so.notes,
        so.created_by,
        u.username as created_by_username,
        so.confirmed_at,
        so.shipped_at,
        so.created_at,
        so.updated_at
      FROM sales_orders so
      JOIN customers c ON so.customer_id = c.id
      JOIN users u ON so.created_by = u.id
      WHERE so.id = ?
    `, [id]);

    if (orders.length === 0) {
      return null;
    }

    const order = orders[0];

    // Get order lines
    const [lines] = await db.query(`
      SELECT
        sol.id,
        sol.manufacturer_id,
        m.name as manufacturer_name,
        sol.model_id,
        mo.model_name,
        mo.model_number,
        sol.storage_gb,
        sol.color,
        sol.grade,
        sol.supplier_id,
        s.name as supplier_name,
        sol.location_id,
        l.code as location_code,
        l.name as location_name,
        sol.requested_quantity,
        sol.picked_quantity,
        sol.created_at
      FROM sales_order_lines sol
      JOIN manufacturers m ON sol.manufacturer_id = m.id
      JOIN models mo ON sol.model_id = mo.id
      LEFT JOIN suppliers s ON sol.supplier_id = s.id
      LEFT JOIN locations l ON sol.location_id = l.id
      WHERE sol.sales_order_id = ?
      ORDER BY sol.id
    `, [id]);

    // Get available device locations for each line
    for (const line of lines) {
      const [locations] = await db.query(`
        SELECT
          l.code,
          l.name,
          COUNT(*) as quantity
        FROM devices d
        JOIN locations l ON d.location_id = l.id
        WHERE d.status = 'IN_STOCK'
          AND d.manufacturer_id = ?
          AND d.model_id = ?
          AND d.supplier_id = ?
          ${line.storage_gb ? 'AND d.storage_gb = ?' : ''}
          ${line.color ? 'AND d.color = ?' : ''}
          ${line.grade ? 'AND d.grade = ?' : ''}
        GROUP BY l.id, l.code, l.name
        ORDER BY l.code
      `, [
        line.manufacturer_id,
        line.model_id,
        line.supplier_id,
        ...(line.storage_gb ? [line.storage_gb] : []),
        ...(line.color ? [line.color] : []),
        ...(line.grade ? [line.grade] : [])
      ]);

      line.available_locations = locations;
    }

    order.lines = lines;

    return order;
  },

  async create(orderData, userId) {
    return transaction(async (connection) => {
      const [customers] = await connection.query(
        'SELECT id, customer_code, name, is_backmarket FROM customers WHERE id = ?',
        [orderData.customer_id]
      );

      if (customers.length === 0) {
        const error = new Error('Customer not found');
        error.statusCode = 404;
        error.code = 'CUSTOMER_NOT_FOUND';
        throw error;
      }

      const customer = customers[0];
      const resolvedOrderType = isBackmarketCustomerRecord(customer) ? 'BACKMARKET' : 'B2B';

      // Generate SO number
      const [maxSO] = await connection.query(
        "SELECT MAX(CAST(SUBSTRING(so_number, 4) AS UNSIGNED)) as max_num FROM sales_orders"
      );
      const nextNum = (maxSO[0].max_num || 0) + 1;
      const soNumber = `SO-${String(nextNum).padStart(5, '0')}`;

      // Insert sales order
      const [result] = await connection.query(`
        INSERT INTO sales_orders (
          so_number, customer_id, order_type, backmarket_order_id,
          customer_ref, po_ref, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        soNumber,
        orderData.customer_id,
        resolvedOrderType,
        orderData.backmarket_order_id || null,
        orderData.customer_ref || null,
        orderData.po_ref || null,
        orderData.notes || null,
        userId
      ]);

      const salesOrderId = result.insertId;

      // Insert sales order lines
      if (orderData.lines && orderData.lines.length > 0) {
        for (const line of orderData.lines) {
          await connection.query(`
            INSERT INTO sales_order_lines (
              sales_order_id, manufacturer_id, model_id, storage_gb,
              color, grade, supplier_id, location_id, requested_quantity
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            salesOrderId,
            line.manufacturer_id,
            line.model_id,
            line.storage_gb || null,
            line.color || null,
            line.grade || null,
            line.supplier_id || null,
            line.location_id || null,
            line.requested_quantity
          ]);
        }
      }

      return { id: salesOrderId, so_number: soNumber };
    });
  },

  // Update sales order (metadata only, not lines)
  async update(id, updates) {
    const [result] = await db.query(`
      UPDATE sales_orders
      SET
        customer_ref = COALESCE(?, customer_ref),
        po_ref = COALESCE(?, po_ref),
        notes = COALESCE(?, notes),
        courier = COALESCE(?, courier),
        tracking_number = COALESCE(?, tracking_number),
        total_boxes = COALESCE(?, total_boxes),
        total_pallets = COALESCE(?, total_pallets)
      WHERE id = ? AND status = 'DRAFT'
    `, [
      updates.customer_ref,
      updates.po_ref,
      updates.notes,
      updates.courier,
      updates.tracking_number,
      updates.total_boxes,
      updates.total_pallets,
      id
    ]);

    return result.affectedRows > 0;
  },

  // Confirm sales order and reserve devices
  async confirm(id) {
    return transaction(async (connection) => {
      // Update sales order status
      const [result] = await connection.query(`
        UPDATE sales_orders
        SET status = 'CONFIRMED', confirmed_at = NOW()
        WHERE id = ? AND status = 'DRAFT'
      `, [id]);

      if (result.affectedRows === 0) {
        return false;
      }

      // Get order lines for reservation
      const [lines] = await connection.query(`
        SELECT
          id,
          supplier_id,
          manufacturer_id,
          model_id,
          storage_gb,
          color,
          grade,
          requested_quantity
        FROM sales_order_lines
        WHERE sales_order_id = ?
      `, [id]);

      // Reserve devices for each line
      for (const line of lines) {
        const whereConditions = [
          'd.status = "IN_STOCK"',
          'd.reserved_for_so_id IS NULL',
          'd.supplier_id = ?',
          'd.manufacturer_id = ?',
          'd.model_id = ?'
        ];

        const params = [
          line.supplier_id,
          line.manufacturer_id,
          line.model_id
        ];

        if (line.storage_gb) {
          whereConditions.push('d.storage_gb = ?');
          params.push(line.storage_gb);
        }

        if (line.color) {
          whereConditions.push('d.color = ?');
          params.push(line.color);
        }

        if (line.grade) {
          whereConditions.push('d.grade = ?');
          params.push(line.grade);
        }

        const reserveLimit = parseInt(line.requested_quantity);

        await connection.query(`
          UPDATE devices d
          SET d.reserved_for_so_id = ?
          WHERE ${whereConditions.join(' AND ')}
          ORDER BY d.created_at
          LIMIT ?
        `, [id, ...params, reserveLimit]);
      }

      return true;
    });
  },

  // Cancel sales order and release reservations
  async cancel(id) {
    return transaction(async (connection) => {
      // Update sales order status
      const [result] = await connection.query(`
        UPDATE sales_orders
        SET status = 'CANCELLED'
        WHERE id = ? AND status IN ('DRAFT', 'CONFIRMED')
      `, [id]);

      if (result.affectedRows === 0) {
        return false;
      }

      // Release all reserved devices for this sales order
      await connection.query(`
        UPDATE devices
        SET reserved_for_so_id = NULL
        WHERE reserved_for_so_id = ? AND status = 'IN_STOCK'
      `, [id]);

      return true;
    });
  },

  // Pick devices for order
  async pickDevices(salesOrderId, picks, userId) {
    return transaction(async (connection) => {
      for (const pick of picks) {
        const { device_id, sales_order_line_id } = pick;

        // Check if device is available
        const [device] = await connection.query(
          `SELECT id, status FROM devices WHERE id = ? AND status = 'IN_STOCK' FOR UPDATE`,
          [device_id]
        );

        if (device.length === 0) {
          throw new Error(`Device ${device_id} is not available for picking`);
        }

        // Lock the sales order line to prevent race conditions when multiple users pick simultaneously
        if (sales_order_line_id) {
          const [salesOrderLine] = await connection.query(
            `SELECT id, requested_quantity, picked_quantity FROM sales_order_lines WHERE id = ? FOR UPDATE`,
            [sales_order_line_id]
          );

          if (salesOrderLine.length === 0) {
            throw new Error(`Sales order line ${sales_order_line_id} not found`);
          }

          if (salesOrderLine[0].picked_quantity >= salesOrderLine[0].requested_quantity) {
            throw new Error(`Sales order line ${sales_order_line_id} is already fully picked`);
          }
        }

        // Insert into sales_order_items
        await connection.query(`
          INSERT INTO sales_order_items (
            sales_order_id, sales_order_line_id, device_id, picked_by, verified
          ) VALUES (?, ?, ?, ?, 1)
        `, [salesOrderId, sales_order_line_id || null, device_id, userId]);

        // Device stays IN_STOCK until shipped - tracking is done via sales_order_items table

        // Update picked quantity on line if line_id provided
        if (sales_order_line_id) {
          await connection.query(
            `UPDATE sales_order_lines
             SET picked_quantity = picked_quantity + 1
             WHERE id = ?`,
            [sales_order_line_id]
          );
        }
      }

      // Update sales order status to PROCESSING if it was CONFIRMED
      await connection.query(
        `UPDATE sales_orders
         SET status = 'PROCESSING'
         WHERE id = ? AND status = 'CONFIRMED'`,
        [salesOrderId]
      );

      return true;
    });
  },

  // Get picked devices for order
  async getPickedDevices(salesOrderId) {
    const [devices] = await db.query(`
      SELECT
        soi.id,
        soi.device_id,
        soi.sales_order_line_id,
        d.imei,
        m.name as manufacturer,
        mo.model_name,
        mo.model_number,
        d.storage_gb as storage,
        d.color,
        d.grade,
        d.status,
        soi.scanned_at,
        soi.verified,
        soi.shipped,
        soi.shipped_at,
        u.username as picked_by
      FROM sales_order_items soi
      JOIN devices d ON soi.device_id = d.id
      JOIN manufacturers m ON d.manufacturer_id = m.id
      JOIN models mo ON d.model_id = mo.id
      JOIN users u ON soi.picked_by = u.id
      WHERE soi.sales_order_id = ?
      ORDER BY soi.scanned_at DESC
    `, [salesOrderId]);

    if (devices.length > 0) {
      return devices;
    }

    // Skip legacy/reserved fallbacks for DRAFT orders — they can't have legacy data
    const [[soRow]] = await db.query('SELECT status FROM sales_orders WHERE id = ?', [salesOrderId]);
    if (!soRow || soRow.status === 'DRAFT') {
      return [];
    }

    let legacyMappedDevices = [];

    try {
      [legacyMappedDevices] = await db.query(`
        SELECT
          d.id,
          d.id as device_id,
          NULL as sales_order_line_id,
          d.imei,
          m.name as manufacturer,
          mo.model_name,
          mo.model_number,
          d.storage_gb as storage,
          d.color,
          d.grade,
          d.status,
          COALESCE(ldrsom.created_at, lsom.created_at, so.shipped_at, d.updated_at, d.created_at) as scanned_at,
          1 as verified,
          CASE
            WHEN so.status = 'SHIPPED' OR d.status IN ('SHIPPED', 'OUT_OF_STOCK') THEN 1
            ELSE 0
          END as shipped,
          so.shipped_at,
          NULL as picked_by,
          d.supplier_id,
          d.manufacturer_id,
          d.model_id
        FROM sales_orders so
        JOIN legacy_sales_order_map lsom ON lsom.sales_order_id = so.id
        JOIN legacy_device_reserved_sales_order_map ldrsom ON ldrsom.legacy_sales_order_id = lsom.legacy_order_id
        JOIN devices d ON d.id = ldrsom.device_id
        JOIN manufacturers m ON d.manufacturer_id = m.id
        JOIN models mo ON d.model_id = mo.id
        WHERE so.id = ?
      `, [salesOrderId]);
    } catch (error) {
      if (!isMissingLegacyTableError(error)) {
        throw error;
      }
    }

    if (legacyMappedDevices.length > 0) {
      const assignedLegacyDevices = await assignLegacyDevicesToLines(salesOrderId, legacyMappedDevices);
      return assignedLegacyDevices.map(({ supplier_id, manufacturer_id, model_id, ...device }) => device);
    }

    const [reservedDevices] = await db.query(`
      SELECT
        d.id,
        d.id as device_id,
        NULL as sales_order_line_id,
        d.imei,
        m.name as manufacturer,
        mo.model_name,
        mo.model_number,
        d.storage_gb as storage,
        d.color,
        d.grade,
        d.status,
        COALESCE(so.shipped_at, d.updated_at, d.created_at) as scanned_at,
        1 as verified,
        CASE
          WHEN so.status = 'SHIPPED' OR d.status IN ('SHIPPED', 'OUT_OF_STOCK') THEN 1
          ELSE 0
        END as shipped,
        so.shipped_at,
        NULL as picked_by,
        d.supplier_id,
        d.manufacturer_id,
        d.model_id
      FROM sales_orders so
      JOIN devices d ON d.reserved_for_so_id = so.id
      JOIN manufacturers m ON d.manufacturer_id = m.id
      JOIN models mo ON d.model_id = mo.id
      WHERE so.id = ?
      ORDER BY scanned_at DESC
    `, [salesOrderId]);

    const legacyDevices = [...legacyMappedDevices, ...reservedDevices];

    const dedupedLegacyDevices = Array.from(
      legacyDevices.reduce((deviceMap, device) => {
        const existing = deviceMap.get(device.device_id);
        if (!existing || new Date(device.scanned_at) > new Date(existing.scanned_at)) {
          deviceMap.set(device.device_id, device);
        }
        return deviceMap;
      }, new Map()).values()
    );
    dedupedLegacyDevices.sort((a, b) => new Date(b.scanned_at) - new Date(a.scanned_at));

    const assignedLegacyDevices = await assignLegacyDevicesToLines(salesOrderId, dedupedLegacyDevices);

    return assignedLegacyDevices.map(({ supplier_id, manufacturer_id, model_id, ...device }) => device);
  },

  // Ship order
  async ship(id, shipmentData) {
    return transaction(async (connection) => {
      // Update sales order
      await connection.query(`
        UPDATE sales_orders
        SET
          status = 'SHIPPED',
          shipped_at = NOW(),
          courier = ?,
          tracking_number = ?
        WHERE id = ?
      `, [shipmentData.courier, shipmentData.tracking_number, id]);

      // Mark all items as shipped
      await connection.query(`
        UPDATE sales_order_items
        SET shipped = 1, shipped_at = NOW()
        WHERE sales_order_id = ?
      `, [id]);

      // Update device status to SHIPPED
      await connection.query(`
        UPDATE devices d
        JOIN sales_order_items soi ON d.id = soi.device_id
        SET d.status = 'SHIPPED'
        WHERE soi.sales_order_id = ?
      `, [id]);

      return true;
    });
  }
};
