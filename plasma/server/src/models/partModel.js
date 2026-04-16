import pool, { query } from '../config/database.js';

function runWithConnection(connection = null) {
  return connection
    ? (sql, params = []) => connection.execute(sql, params)
    : (sql, params = []) => pool.execute(sql, params);
}

export const partModel = {
  async getMeta() {
    const [categories, suppliers, manufacturers, models] = await Promise.all([
      query('SELECT id, name, description FROM part_categories ORDER BY name'),
      query('SELECT id, name FROM suppliers WHERE is_active = TRUE ORDER BY name'),
      query('SELECT id, name, code FROM manufacturers ORDER BY name'),
      query(
        `SELECT id, manufacturer_id, model_number, model_name
         FROM models
         ORDER BY model_name, model_number`,
      ),
    ]);

    return { categories, suppliers, manufacturers, models };
  },

  async getBases(filters = {}) {
    const whereConditions = ['1 = 1'];
    const params = [];

    if (!filters.include_inactive) {
      whereConditions.push('pb.is_active = TRUE');
    }

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      whereConditions.push('(pb.base_code LIKE ? OR pb.name LIKE ? OR pb.subtype LIKE ?)');
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (filters.category_id) {
      whereConditions.push('pb.category_id = ?');
      params.push(parseInt(filters.category_id, 10));
    }

    if (filters.manufacturer_id) {
      whereConditions.push('pb.manufacturer_id = ?');
      params.push(parseInt(filters.manufacturer_id, 10));
    }

    if (filters.model_id) {
      whereConditions.push('compat.model_id = ?');
      params.push(parseInt(filters.model_id, 10));
    }

    const bases = await query(
      `SELECT
         pb.id,
         pb.base_code,
         pb.name,
         pb.category_id,
         pc.name AS category_name,
         pb.manufacturer_id,
         m.name AS manufacturer_name,
         pb.subtype,
         pb.changes_device_color,
         pb.notes,
         pb.is_active,
         pb.created_at,
         pb.updated_at,
         COUNT(DISTINCT p.id) AS variant_count,
         COUNT(DISTINCT compat.id) AS compatibility_count
       FROM part_bases pb
       JOIN part_categories pc ON pb.category_id = pc.id
       LEFT JOIN manufacturers m ON pb.manufacturer_id = m.id
       LEFT JOIN parts p ON p.part_base_id = pb.id AND p.is_active = TRUE
       LEFT JOIN part_compatibility compat ON compat.part_base_id = pb.id
       WHERE ${whereConditions.join(' AND ')}
       GROUP BY pb.id, pc.name, m.name
       ORDER BY pb.created_at DESC, pb.id DESC`,
      params,
    );

    return bases;
  },

  async getBaseById(id) {
    const rows = await query(
      `SELECT
         pb.id,
         pb.base_code,
         pb.name,
         pb.category_id,
         pb.manufacturer_id,
         pb.subtype,
         pb.changes_device_color,
         pb.notes,
         pb.is_active,
         pb.created_at,
         pb.updated_at
       FROM part_bases pb
       WHERE pb.id = ?`,
      [id],
    );
    return rows[0] || null;
  },

  async createBase(data, connection = null) {
    const execute = runWithConnection(connection);
    const [result] = await execute(
      `INSERT INTO part_bases (
         base_code,
         name,
         category_id,
         manufacturer_id,
         subtype,
         changes_device_color,
         notes,
         is_active
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.base_code,
        data.name,
        data.category_id,
        data.manufacturer_id || null,
        data.subtype || null,
        data.changes_device_color ? 1 : 0,
        data.notes || null,
        data.is_active !== false,
      ],
    );
    return result.insertId;
  },

  async updateBase(id, updates, connection = null) {
    const execute = runWithConnection(connection);
    const fields = [];
    const values = [];
    const allowedFields = ['base_code', 'name', 'category_id', 'manufacturer_id', 'subtype', 'changes_device_color', 'notes', 'is_active'];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    });

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    await execute(`UPDATE part_bases SET ${fields.join(', ')} WHERE id = ?`, values);
    return true;
  },

  async getVariants(filters = {}) {
    const whereConditions = ['1 = 1'];
    const params = [];

    if (!filters.include_inactive) {
      whereConditions.push('p.is_active = TRUE');
      whereConditions.push('COALESCE(pb.is_active, TRUE) = TRUE');
    }

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      whereConditions.push('(p.sku LIKE ? OR p.name LIKE ? OR pb.base_code LIKE ? OR pb.name LIKE ?)');
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (filters.part_base_id) {
      whereConditions.push('p.part_base_id = ?');
      params.push(parseInt(filters.part_base_id, 10));
    }

    if (filters.model_id) {
      whereConditions.push('compat.model_id = ?');
      params.push(parseInt(filters.model_id, 10));
    }

    const baseQuery = `
      SELECT
        p.id,
        p.part_base_id,
        p.sku,
        p.name,
        p.category_id,
        p.color,
        p.quality_tier,
        p.supplier_part_ref,
        p.current_stock,
        p.available_stock,
        p.reserved_stock,
        p.consumed_stock,
        p.faulty_stock,
        p.issued_stock,
        p.is_active,
        p.created_at,
        p.updated_at,
        pb.base_code,
        pb.name AS base_name,
        pb.changes_device_color,
        pc.name AS category_name,
        COUNT(DISTINCT compat.id) AS compatibility_count,
        COUNT(DISTINCT pl.id) AS lot_count,
        COALESCE(SUM(pl.available_quantity), 0) AS total_available_quantity
      FROM parts p
      LEFT JOIN part_bases pb ON p.part_base_id = pb.id
      LEFT JOIN part_categories pc ON p.category_id = pc.id
      LEFT JOIN part_compatibility compat ON compat.part_base_id = pb.id
      LEFT JOIN part_lots pl ON pl.part_id = p.id
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY p.id, pb.base_code, pb.name, pb.changes_device_color, pc.name
    `;

    const havingClause = filters.in_stock_only ? ' HAVING total_available_quantity > 0' : '';

    const variants = await query(`${baseQuery}${havingClause} ORDER BY p.created_at DESC, p.id DESC`, params);

    return variants;
  },

  async getVariantById(id) {
    const rows = await query(
      `SELECT
         p.id,
         p.part_base_id,
         p.sku,
         p.name,
         p.category_id,
         p.color,
         p.quality_tier,
         p.supplier_part_ref,
         p.current_stock,
         p.available_stock,
         p.reserved_stock,
         p.consumed_stock,
         p.faulty_stock,
         p.issued_stock,
         p.is_active,
         p.created_at,
         p.updated_at,
         pb.base_code,
         pb.name AS base_name,
         pb.changes_device_color,
         pc.name AS category_name
       FROM parts p
       LEFT JOIN part_bases pb ON p.part_base_id = pb.id
       LEFT JOIN part_categories pc ON p.category_id = pc.id
       WHERE p.id = ?`,
      [id],
    );
    return rows[0] || null;
  },

  async getLotsForPartIds(partIds = []) {
    if (partIds.length === 0) {
      return [];
    }

    const placeholders = partIds.map(() => '?').join(', ');
    return query(
      `SELECT
         pl.id,
         pl.part_id,
         pl.supplier_id,
         pl.supplier_ref,
         pl.lot_ref,
         pl.received_quantity,
         pl.available_quantity,
         pl.reserved_quantity,
         pl.consumed_quantity,
         pl.faulty_quantity,
         pl.issued_quantity,
         pl.received_at,
         pl.notes,
         s.name AS supplier_name
       FROM part_lots pl
       LEFT JOIN suppliers s ON pl.supplier_id = s.id
       WHERE pl.part_id IN (${placeholders})
       ORDER BY pl.received_at DESC, pl.id DESC`,
      partIds,
    );
  },

  async createVariant(data, connection = null) {
    const execute = runWithConnection(connection);
    const [result] = await execute(
      `INSERT INTO parts (
         part_base_id,
         sku,
         name,
         category_id,
         color,
         quality_tier,
         supplier_part_ref,
         current_stock,
         available_stock,
         reserved_stock,
         consumed_stock,
         faulty_stock,
         issued_stock,
         is_active
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, ?)`,
      [
        data.part_base_id,
        data.sku,
        data.name,
        data.category_id,
        data.color || null,
        data.quality_tier || 'OTHER',
        data.supplier_part_ref || null,
        data.is_active !== false,
      ],
    );
    return result.insertId;
  },

  async updateVariant(id, updates, connection = null) {
    const execute = runWithConnection(connection);
    const fields = [];
    const values = [];
    const allowedFields = [
      'sku',
      'name',
      'category_id',
      'color',
      'quality_tier',
      'supplier_part_ref',
      'is_active',
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    });

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    await execute(`UPDATE parts SET ${fields.join(', ')} WHERE id = ?`, values);
    return true;
  },

  async getCompatibility(filters = {}) {
    const whereConditions = ['1 = 1'];
    const params = [];

    if (!filters.include_inactive) {
      whereConditions.push('pb.is_active = TRUE');
    }

    if (filters.part_base_id) {
      whereConditions.push('pc.part_base_id = ?');
      params.push(parseInt(filters.part_base_id, 10));
    }

    if (filters.model_id) {
      whereConditions.push('pc.model_id = ?');
      params.push(parseInt(filters.model_id, 10));
    }

    return query(
      `SELECT
         pc.id,
         pc.part_base_id,
         pc.model_id,
        pc.notes,
         pb.base_code,
         pb.name AS base_name,
         pb.category_id,
         cat.name AS category_name,
         pb.manufacturer_id,
         base_manufacturer.name AS base_manufacturer_name,
         pb.subtype,
         pb.changes_device_color,
         pb.is_active,
         m.name AS manufacturer_name,
         mo.model_name,
         mo.model_number
       FROM part_compatibility pc
       JOIN part_bases pb ON pc.part_base_id = pb.id
       JOIN part_categories cat ON pb.category_id = cat.id
       LEFT JOIN manufacturers base_manufacturer ON pb.manufacturer_id = base_manufacturer.id
       JOIN models mo ON pc.model_id = mo.id
       JOIN manufacturers m ON mo.manufacturer_id = m.id
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY pb.base_code, m.name, mo.model_name, mo.model_number`,
      params,
    );
  },

  async getCompatibilityById(id) {
    const rows = await query(
      `SELECT
         pc.id,
         pc.part_base_id,
         pc.model_id,
         pc.notes
       FROM part_compatibility pc
       WHERE pc.id = ?`,
      [id],
    );
    return rows[0] || null;
  },

  async addCompatibility(data, connection = null) {
    const execute = runWithConnection(connection);
    const [result] = await execute(
      `INSERT INTO part_compatibility (
         part_base_id,
         model_id,
         notes
       ) VALUES (?, ?, ?)`,
      [data.part_base_id, data.model_id, data.notes || null],
    );
    return result.insertId;
  },

  async updateCompatibility(id, updates, connection = null) {
    const execute = runWithConnection(connection);
    const fields = [];
    const values = [];
    const allowedFields = ['part_base_id', 'model_id', 'notes'];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    });

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    await execute(`UPDATE part_compatibility SET ${fields.join(', ')} WHERE id = ?`, values);
    return true;
  },

  async removeCompatibility(id, connection = null) {
    const execute = runWithConnection(connection);
    await execute('DELETE FROM part_compatibility WHERE id = ?', [id]);
    return true;
  },

  async getDeviceModels(filters = {}, pagination = {}) {
    const whereConditions = ['1 = 1'];
    const params = [];
    const page = Math.max(parseInt(pagination.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(pagination.limit || '25', 10), 1), 100);
    const offset = (page - 1) * limit;

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      whereConditions.push(
        '(man.name LIKE ? OR mo.model_name LIKE ? OR mo.model_number LIKE ?)',
      );
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (filters.manufacturer_id) {
      whereConditions.push('mo.manufacturer_id = ?');
      params.push(parseInt(filters.manufacturer_id, 10));
    }

    const totalRows = await query(
      `SELECT COUNT(*) AS total
       FROM models mo
       JOIN manufacturers man ON mo.manufacturer_id = man.id
       WHERE ${whereConditions.join(' AND ')}`,
      params,
    );

    const models = await query(
      `SELECT
         mo.id,
         mo.manufacturer_id,
         man.name AS manufacturer_name,
         man.code AS manufacturer_code,
         mo.model_name,
         mo.model_number,
         COUNT(DISTINCT CASE WHEN pb.id IS NOT NULL THEN pc.id END) AS compatibility_rule_count,
         COUNT(DISTINCT p.id) AS part_entry_count
       FROM models mo
       JOIN manufacturers man ON mo.manufacturer_id = man.id
       LEFT JOIN part_compatibility pc ON pc.model_id = mo.id
       LEFT JOIN part_bases pb ON pb.id = pc.part_base_id AND pb.is_active = TRUE
       LEFT JOIN parts p ON p.part_base_id = pb.id AND p.is_active = TRUE
       WHERE ${whereConditions.join(' AND ')}
       GROUP BY mo.id, man.name, man.code
       ORDER BY man.name, COALESCE(mo.model_name, mo.model_number), mo.model_number
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    return {
      models,
      pagination: {
        page,
        limit,
        total: totalRows[0]?.total || 0,
        totalPages: Math.max(Math.ceil((totalRows[0]?.total || 0) / limit), 1),
      },
    };
  },

  async getDeviceModelById(id) {
    const rows = await query(
      `SELECT
         mo.id,
         mo.manufacturer_id,
         man.name AS manufacturer_name,
         man.code AS manufacturer_code,
         mo.model_name,
         mo.model_number,
         COUNT(DISTINCT CASE WHEN pb.id IS NOT NULL THEN pc.id END) AS compatibility_rule_count,
         COUNT(DISTINCT p.id) AS part_entry_count
       FROM models mo
       JOIN manufacturers man ON mo.manufacturer_id = man.id
       LEFT JOIN part_compatibility pc ON pc.model_id = mo.id
       LEFT JOIN part_bases pb ON pb.id = pc.part_base_id AND pb.is_active = TRUE
       LEFT JOIN parts p ON p.part_base_id = pb.id AND p.is_active = TRUE
       WHERE mo.id = ?
       GROUP BY mo.id, man.name, man.code`,
      [id],
    );
    return rows[0] || null;
  },

  async getBaseDeleteSummary(id, connection = null) {
    const execute = runWithConnection(connection);
    const [rows] = await execute(
      `SELECT
         pb.id,
         pb.is_active,
         COUNT(DISTINCT p.id) AS variant_count,
         COALESCE(SUM(p.current_stock), 0) AS current_stock,
         COALESCE(SUM(p.available_stock), 0) AS available_stock,
         COALESCE(SUM(p.reserved_stock), 0) AS reserved_stock,
         COALESCE(SUM(p.faulty_stock), 0) AS faulty_stock
       FROM part_bases pb
       LEFT JOIN parts p ON p.part_base_id = pb.id
       WHERE pb.id = ?
       GROUP BY pb.id
       FOR UPDATE`,
      [id],
    );
    return rows[0] || null;
  },

  async getVariantDeleteSummary(id, connection = null) {
    const execute = runWithConnection(connection);
    const [rows] = await execute(
      `SELECT
         p.id,
         p.is_active,
         p.current_stock,
         p.available_stock,
         p.reserved_stock,
         p.faulty_stock
       FROM parts p
       WHERE p.id = ?
       FOR UPDATE`,
      [id],
    );
    return rows[0] || null;
  },

  async deactivateBaseCascade(id, connection) {
    const execute = runWithConnection(connection);
    await execute('UPDATE part_bases SET is_active = FALSE WHERE id = ?', [id]);
    await execute('UPDATE parts SET is_active = FALSE WHERE part_base_id = ?', [id]);
    await execute('DELETE FROM part_compatibility WHERE part_base_id = ?', [id]);
    return true;
  },

  async getLotById(id, connection = null) {
    const execute = runWithConnection(connection);
    const [rows] = await execute(
      `SELECT
         pl.*,
         p.part_base_id,
         p.color AS part_color,
         p.quality_tier,
         pb.base_code,
         pb.name AS base_name,
         pb.changes_device_color
       FROM part_lots pl
       JOIN parts p ON pl.part_id = p.id
       LEFT JOIN part_bases pb ON p.part_base_id = pb.id
       WHERE pl.id = ?
       FOR UPDATE`,
      [id],
    );
    return rows[0] || null;
  },

  async getPartByIdForUpdate(id, connection = null) {
    const execute = runWithConnection(connection);
    const [rows] = await execute(
      `SELECT
         p.*,
         pb.base_code,
         pb.name AS base_name,
         pb.changes_device_color
       FROM parts p
       LEFT JOIN part_bases pb ON p.part_base_id = pb.id
       WHERE p.id = ?
       FOR UPDATE`,
      [id],
    );
    return rows[0] || null;
  },

  async createLot(data, connection = null) {
    const execute = runWithConnection(connection);
    const [result] = await execute(
      `INSERT INTO part_lots (
         part_id,
         supplier_id,
         supplier_ref,
         lot_ref,
         received_quantity,
         available_quantity,
         reserved_quantity,
         consumed_quantity,
         faulty_quantity,
         issued_quantity,
         received_at,
         notes,
         created_by
       ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?, ?)`,
      [
        data.part_id,
        data.supplier_id || null,
        data.supplier_ref || null,
        data.lot_ref || null,
        data.received_quantity,
        data.available_quantity,
        data.received_at || new Date(),
        data.notes || null,
        data.created_by || null,
      ],
    );
    return result.insertId;
  },

  async updateLotQuantities(id, deltas, connection = null) {
    const execute = runWithConnection(connection);
    const [result] = await execute(
      `UPDATE part_lots
       SET available_quantity = available_quantity + ?,
           reserved_quantity = reserved_quantity + ?,
           consumed_quantity = consumed_quantity + ?,
           faulty_quantity = faulty_quantity + ?,
           issued_quantity = issued_quantity + ?
       WHERE id = ?
         AND (available_quantity + ?) >= 0
         AND (reserved_quantity + ?) >= 0
         AND (consumed_quantity + ?) >= 0
         AND (faulty_quantity + ?) >= 0
         AND (issued_quantity + ?) >= 0`,
      [
        deltas.available || 0,
        deltas.reserved || 0,
        deltas.consumed || 0,
        deltas.faulty || 0,
        deltas.issued || 0,
        id,
        deltas.available || 0,
        deltas.reserved || 0,
        deltas.consumed || 0,
        deltas.faulty || 0,
        deltas.issued || 0,
      ],
    );
    if (result.affectedRows === 0) {
      throw new Error('Part lot stock cannot go negative — operation would result in invalid quantities');
    }

    return true;
  },

  async updatePartQuantities(id, deltas, connection = null) {
    const execute = runWithConnection(connection);
    const [result] = await execute(
      `UPDATE parts
       SET current_stock = current_stock + ?,
           available_stock = available_stock + ?,
           reserved_stock = reserved_stock + ?,
           consumed_stock = consumed_stock + ?,
           faulty_stock = faulty_stock + ?,
           issued_stock = issued_stock + ?
       WHERE id = ?
         AND (current_stock + ?) >= 0
         AND (available_stock + ?) >= 0
         AND (reserved_stock + ?) >= 0
         AND (consumed_stock + ?) >= 0
         AND (faulty_stock + ?) >= 0
         AND (issued_stock + ?) >= 0`,
      [
        (deltas.available || 0) + (deltas.reserved || 0) + (deltas.consumed || 0) + (deltas.faulty || 0) + (deltas.issued || 0),
        deltas.available || 0,
        deltas.reserved || 0,
        deltas.consumed || 0,
        deltas.faulty || 0,
        deltas.issued || 0,
        id,
        (deltas.available || 0) + (deltas.reserved || 0) + (deltas.consumed || 0) + (deltas.faulty || 0) + (deltas.issued || 0),
        deltas.available || 0,
        deltas.reserved || 0,
        deltas.consumed || 0,
        deltas.faulty || 0,
        deltas.issued || 0,
      ],
    );
    if (result.affectedRows === 0) {
      throw new Error('Part stock cannot go negative — operation would result in invalid quantities');
    }

    return true;
  },

  async createTransaction(data, connection = null) {
    const execute = runWithConnection(connection);
    const [result] = await execute(
      `INSERT INTO part_transactions (
         part_id,
         part_lot_id,
         movement_type,
         quantity,
         available_delta,
         reserved_delta,
         consumed_delta,
         faulty_delta,
         issued_delta,
         reference_type,
         reference_id,
         notes,
         user_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.part_id,
        data.part_lot_id || null,
        data.movement_type,
        data.quantity,
        data.available_delta || 0,
        data.reserved_delta || 0,
        data.consumed_delta || 0,
        data.faulty_delta || 0,
        data.issued_delta || 0,
        data.reference_type || null,
        data.reference_id || null,
        data.notes || null,
        data.user_id || null,
      ],
    );
    return result.insertId;
  },

  async createFaultReport(data, connection = null) {
    const execute = runWithConnection(connection);
    const [result] = await execute(
      `INSERT INTO part_fault_reports (
         part_id,
         part_lot_id,
         supplier_id,
         repair_record_id,
         quantity,
         reason,
         status,
         notes,
         created_by,
         updated_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.part_id,
        data.part_lot_id || null,
        data.supplier_id || null,
        data.repair_record_id || null,
        data.quantity || 1,
        data.reason,
        data.status || 'OPEN',
        data.notes || null,
        data.created_by || null,
        data.updated_by || data.created_by || null,
      ],
    );
    return result.insertId;
  },

  async getFaultReports(filters = {}) {
    const whereConditions = ['1 = 1'];
    const params = [];

    if (filters.status) {
      whereConditions.push('pfr.status = ?');
      params.push(filters.status);
    }

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      whereConditions.push('(p.sku LIKE ? OR p.name LIKE ? OR pb.base_code LIKE ? OR pb.name LIKE ? OR pfr.reason LIKE ?)');
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const page = Math.max(parseInt(filters.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(filters.limit || '25', 10), 1), 100);
    const offset = (page - 1) * limit;

    const countRows = await query(
      `SELECT COUNT(*) AS total
       FROM part_fault_reports pfr
       JOIN parts p ON pfr.part_id = p.id
       LEFT JOIN part_bases pb ON p.part_base_id = pb.id
       WHERE ${whereConditions.join(' AND ')}`,
      params,
    );

    const data = await query(
      `SELECT
         pfr.id,
         pfr.part_id,
         pfr.part_lot_id,
         pfr.supplier_id,
         pfr.repair_record_id,
         pfr.quantity,
         pfr.reason,
         pfr.status,
         pfr.notes,
         pfr.created_at,
         pfr.updated_at,
         p.sku,
         p.name AS variant_name,
         pb.base_code,
         pb.name AS base_name,
         pl.lot_ref,
         s.name AS supplier_name,
         creator.display_name AS created_by_name,
         updater.display_name AS updated_by_name
       FROM part_fault_reports pfr
       JOIN parts p ON pfr.part_id = p.id
       LEFT JOIN part_bases pb ON p.part_base_id = pb.id
       LEFT JOIN part_lots pl ON pfr.part_lot_id = pl.id
       LEFT JOIN suppliers s ON pfr.supplier_id = s.id
       LEFT JOIN users creator ON pfr.created_by = creator.id
       LEFT JOIN users updater ON pfr.updated_by = updater.id
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY pfr.created_at DESC, pfr.id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    return {
      data,
      pagination: {
        page,
        limit,
        total: countRows[0]?.total || 0,
        totalPages: Math.max(Math.ceil((countRows[0]?.total || 0) / limit), 1),
      },
    };
  },

  async updateFaultReport(id, updates, connection = null) {
    const execute = runWithConnection(connection);
    const fields = [];
    const values = [];
    const allowedFields = ['status', 'notes', 'updated_by'];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    });

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    await execute(`UPDATE part_fault_reports SET ${fields.join(', ')} WHERE id = ?`, values);
    return true;
  },

  async getGoodsInHistory(filters = {}) {
    const page = Math.max(parseInt(filters.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(filters.limit || '10', 10), 1), 100);
    const offset = (page - 1) * limit;

    const countRows = await query(
      `SELECT COUNT(*) AS total FROM (
         SELECT COALESCE(pl.lot_ref, CONCAT('__', pl.id)) AS group_key
         FROM part_lots pl
         LEFT JOIN suppliers s ON pl.supplier_id = s.id
         GROUP BY COALESCE(pl.lot_ref, CONCAT('__', pl.id)), pl.supplier_id, s.name
       ) AS grouped`,
    );

    const rows = await query(
      `SELECT
         pl.lot_ref,
         MIN(pl.id) AS first_lot_id,
         MIN(pl.received_at) AS order_date,
         pl.supplier_id,
         s.name AS supplier_name,
         COUNT(*) AS part_count,
         SUM(pl.received_quantity) AS total_quantity
       FROM part_lots pl
       LEFT JOIN suppliers s ON pl.supplier_id = s.id
       GROUP BY COALESCE(pl.lot_ref, CONCAT('__', pl.id)), pl.supplier_id, s.name
       ORDER BY MIN(pl.received_at) DESC
       LIMIT ? OFFSET ?`,
      [limit, offset],
    );

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: countRows[0]?.total || 0,
        totalPages: Math.max(Math.ceil((countRows[0]?.total || 0) / limit), 1),
      },
    };
  },

  async getGoodsInDetail(opts = {}) {
    let whereClause;
    let params;

    if (opts.lot_ref) {
      whereClause = 'pl.lot_ref = ?';
      params = [opts.lot_ref];
    } else {
      whereClause = 'pl.id = ?';
      params = [parseInt(opts.lot_id, 10)];
    }

    const rows = await query(
      `SELECT
         pl.id AS lot_id,
         pl.lot_ref,
         pl.supplier_id,
         pl.received_at,
         pl.received_quantity,
         pl.notes,
         s.name AS supplier_name,
         p.sku,
         p.name AS variant_name,
         p.color,
         pb.name AS base_name
       FROM part_lots pl
       LEFT JOIN suppliers s ON pl.supplier_id = s.id
       JOIN parts p ON pl.part_id = p.id
       LEFT JOIN part_bases pb ON p.part_base_id = pb.id
       WHERE ${whereClause}
       ORDER BY pl.id ASC`,
      params,
    );

    return rows;
  },
};
