import pool from '../config/database.js';

export const customerModel = {
    /**
     * Get all customers with optional filters and pagination
     */
    async getAll(filters = {}, pagination = { page: 1, limit: 50 }) {
        const { search, status, is_backmarket, sortBy = 'created_at', sortDir = 'DESC' } = filters;
        const { page, limit } = pagination;
        const offset = (page - 1) * limit;

        // Build WHERE clause
        const conditions = [];
        const params = [];

        if (search) {
            conditions.push('(c.customer_code LIKE ? OR c.name LIKE ? OR c.email LIKE ?)');
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        if (status === 'active') {
            conditions.push('c.is_active = TRUE');
        } else if (status === 'inactive') {
            conditions.push('c.is_active = FALSE');
        }

        if (is_backmarket === 'true') {
            conditions.push('c.is_backmarket = TRUE');
        } else if (is_backmarket === 'false') {
            conditions.push('c.is_backmarket = FALSE');
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Validate sortBy to prevent SQL injection
        const validSortFields = ['customer_code', 'name', 'city', 'country', 'created_at', 'updated_at'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
        const sortDirection = sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Get total count
        const countQuery = `
      SELECT COUNT(*) as total
      FROM customers c
      ${whereClause}
    `;

        const [countResult] = await pool.query(countQuery, params);
        const total = countResult[0].total;

        // Get paginated results
        const query = `
      SELECT 
        c.id,
        c.customer_code,
        c.name,
        c.address_line1,
        c.address_line2,
        c.city,
        c.postcode,
        c.country,
        c.phone,
        c.email,
        c.vat_number,
        c.is_backmarket,
        c.is_active,
        c.created_at,
        c.updated_at
      FROM customers c
      ${whereClause}
      ORDER BY c.${sortField} ${sortDirection}
      LIMIT ${limit} OFFSET ${offset}
    `;

        const [customers] = await pool.query(query, params);

        return {
            customers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    },

    /**
     * Get customer by ID
     */
    async getById(id) {
        const query = `
      SELECT 
        c.id,
        c.customer_code,
        c.name,
        c.address_line1,
        c.address_line2,
        c.city,
        c.postcode,
        c.country,
        c.phone,
        c.email,
        c.vat_number,
        c.is_backmarket,
        c.is_active,
        c.created_at,
        c.updated_at
      FROM customers c
      WHERE c.id = ?
    `;

        const [customers] = await pool.query(query, [id]);
        return customers.length > 0 ? customers[0] : null;
    },

    /**
     * Create a new customer
     */
    async create(data) {
        // Generate next customer code
        const codeQuery = `
      SELECT customer_code 
      FROM customers 
      ORDER BY id DESC 
      LIMIT 1
    `;

        const [lastCustomer] = await pool.query(codeQuery);
        let nextCode = 'CST-0001';

        if (lastCustomer.length > 0) {
            const lastCode = lastCustomer[0].customer_code;
            const match = lastCode.match(/CST-(\d+)/);
            if (match) {
                const nextNum = parseInt(match[1]) + 1;
                nextCode = `CST-${String(nextNum).padStart(4, '0')}`;
            }
        }

        const query = `
      INSERT INTO customers (
        customer_code,
        name,
        address_line1,
        address_line2,
        city,
        postcode,
        country,
        phone,
        email,
        vat_number,
        is_backmarket,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            data.is_backmarket !== undefined ? data.is_backmarket : false,
            data.is_active !== undefined ? data.is_active : true
        ]);

        return {
            id: result.insertId,
            customerCode: nextCode
        };
    },

    /**
     * Update customer
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
        if (data.is_backmarket !== undefined) {
            updates.push('is_backmarket = ?');
            params.push(data.is_backmarket);
        }
        if (data.is_active !== undefined) {
            updates.push('is_active = ?');
            params.push(data.is_active);
        }

        if (updates.length === 0) {
            return false; // No fields to update
        }

        const query = `
      UPDATE customers 
      SET ${updates.join(', ')}
      WHERE id = ?
    `;

        params.push(id);
        const [result] = await pool.query(query, params);

        return result.affectedRows > 0;
    },

    /**
     * Deactivate customer (set is_active to false)
     */
    async deactivate(id) {
        const query = `
      UPDATE customers 
      SET is_active = FALSE
      WHERE id = ?
    `;

        const [result] = await pool.query(query, [id]);
        return result.affectedRows > 0;
    },

    /**
     * Reactivate customer (set is_active to true)
     */
    async reactivate(id) {
        const query = `
      UPDATE customers
      SET is_active = TRUE
      WHERE id = ?
    `;

        const [result] = await pool.query(query, [id]);
        return result.affectedRows > 0;
    },

    /**
     * Permanently delete customer
     */
    async delete(id) {
        const query = `
      DELETE FROM customers
      WHERE id = ?
    `;

        const [result] = await pool.query(query, [id]);
        return result.affectedRows > 0;
    }
};
