import pool from '../config/database.js';

export const supplierModel = {
    /**
     * Get all suppliers with optional filters and pagination
     */
    async getAll(filters = {}, pagination = { page: 1, limit: 50 }) {
        const { search, status, sortBy = 'created_at', sortDir = 'DESC' } = filters;
        const { page, limit } = pagination;
        const offset = (page - 1) * limit;

        // Build WHERE clause
        const conditions = [];
        const params = [];

        if (search) {
            conditions.push('(s.supplier_code LIKE ? OR s.name LIKE ? OR s.email LIKE ?)');
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        if (status === 'active') {
            conditions.push('s.is_active = TRUE');
        } else if (status === 'inactive') {
            conditions.push('s.is_active = FALSE');
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Validate sortBy to prevent SQL injection
        const validSortFields = ['supplier_code', 'name', 'city', 'country', 'created_at', 'updated_at'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
        const sortDirection = sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Get total count
        const countQuery = `
      SELECT COUNT(*) as total
      FROM suppliers s
      ${whereClause}
    `;

        const [countResult] = await pool.query(countQuery, params);
        const total = countResult[0].total;

        // Get paginated results
        const query = `
      SELECT 
        s.id,
        s.supplier_code,
        s.name,
        s.address_line1,
        s.address_line2,
        s.city,
        s.postcode,
        s.country,
        s.phone,
        s.email,
        s.vat_number,
        s.is_active,
        s.created_at,
        s.updated_at
      FROM suppliers s
      ${whereClause}
      ORDER BY s.${sortField} ${sortDirection}
      LIMIT ${limit} OFFSET ${offset}
    `;

        const [suppliers] = await pool.query(query, params);

        return {
            suppliers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    },

    /**
     * Get supplier by ID
     */
    async getById(id) {
        const query = `
      SELECT 
        s.id,
        s.supplier_code,
        s.name,
        s.address_line1,
        s.address_line2,
        s.city,
        s.postcode,
        s.country,
        s.phone,
        s.email,
        s.vat_number,
        s.is_active,
        s.created_at,
        s.updated_at
      FROM suppliers s
      WHERE s.id = ?
    `;

        const [suppliers] = await pool.query(query, [id]);
        return suppliers.length > 0 ? suppliers[0] : null;
    },

    /**
     * Create a new supplier
     */
    async create(data) {
        // Generate next supplier code
        const codeQuery = `
      SELECT supplier_code 
      FROM suppliers 
      ORDER BY id DESC 
      LIMIT 1
    `;

        const [lastSupplier] = await pool.query(codeQuery);
        let nextCode = 'SUP-0001';

        if (lastSupplier.length > 0) {
            const lastCode = lastSupplier[0].supplier_code;
            const match = lastCode.match(/SUP-(\d+)/);
            if (match) {
                const nextNum = parseInt(match[1]) + 1;
                nextCode = `SUP-${String(nextNum).padStart(4, '0')}`;
            }
        }

        const query = `
      INSERT INTO suppliers (
        supplier_code,
        name,
        address_line1,
        address_line2,
        city,
        postcode,
        country,
        phone,
        email,
        vat_number,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const [result] = await pool.query(query, [
            nextCode,
            data.name,
            data.address_line1 || null,
            data.address_line2 || null,
            data.city || null,
            data.postcode || null,
            data.country || 'United Kingdom',
            data.phone || null,
            data.email || null,
            data.vat_number || null,
            data.is_active !== undefined ? data.is_active : true
        ]);

        return {
            id: result.insertId,
            supplierCode: nextCode
        };
    },

    /**
     * Update supplier
     */
    async update(id, data) {
        const updates = [];
        const params = [];

        // Build dynamic UPDATE query based on provided fields
        if (data.name !== undefined) {
            updates.push('name = ?');
            params.push(data.name);
        }
        if (data.address_line1 !== undefined) {
            updates.push('address_line1 = ?');
            params.push(data.address_line1);
        }
        if (data.address_line2 !== undefined) {
            updates.push('address_line2 = ?');
            params.push(data.address_line2);
        }
        if (data.city !== undefined) {
            updates.push('city = ?');
            params.push(data.city);
        }
        if (data.postcode !== undefined) {
            updates.push('postcode = ?');
            params.push(data.postcode);
        }
        if (data.country !== undefined) {
            updates.push('country = ?');
            params.push(data.country);
        }
        if (data.phone !== undefined) {
            updates.push('phone = ?');
            params.push(data.phone);
        }
        if (data.email !== undefined) {
            updates.push('email = ?');
            params.push(data.email);
        }
        if (data.vat_number !== undefined) {
            updates.push('vat_number = ?');
            params.push(data.vat_number);
        }
        if (data.is_active !== undefined) {
            updates.push('is_active = ?');
            params.push(data.is_active);
        }

        if (updates.length === 0) {
            return false; // No fields to update
        }

        const query = `
      UPDATE suppliers 
      SET ${updates.join(', ')}
      WHERE id = ?
    `;

        params.push(id);
        const [result] = await pool.query(query, params);

        return result.affectedRows > 0;
    },

    /**
     * Deactivate supplier (set is_active to false)
     */
    async deactivate(id) {
        const query = `
      UPDATE suppliers 
      SET is_active = FALSE
      WHERE id = ?
    `;

        const [result] = await pool.query(query, [id]);
        return result.affectedRows > 0;
    },

    /**
     * Reactivate supplier (set is_active to true)
     */
    async reactivate(id) {
        const query = `
      UPDATE suppliers
      SET is_active = TRUE
      WHERE id = ?
    `;

        const [result] = await pool.query(query, [id]);
        return result.affectedRows > 0;
    },

    /**
     * Permanently delete supplier
     */
    async delete(id) {
        const query = `
      DELETE FROM suppliers
      WHERE id = ?
    `;

        const [result] = await pool.query(query, [id]);
        return result.affectedRows > 0;
    }
};
