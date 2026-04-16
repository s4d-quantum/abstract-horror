import { query } from '../config/database.js';

export const userModel = {
  // Find user by username
  async findByUsername(username) {
    const results = await query(
      'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
      [username]
    );
    return results[0] || null;
  },

  // Find user by ID
  async findById(id) {
    const results = await query(
      'SELECT id, username, display_name, email, role, is_active, last_login, created_at FROM users WHERE id = ? AND is_active = TRUE',
      [id]
    );
    return results[0] || null;
  },

  // Create new user
  async create(userData) {
    const { username, display_name, email, password_hash, role, pin_hash } = userData;

    const result = await query(
      `INSERT INTO users (username, display_name, email, password_hash, role, pin_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, display_name, email || null, password_hash, role || 'VIEWER', pin_hash || null]
    );

    return result.insertId;
  },

  // Update last login
  async updateLastLogin(id) {
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
  },

  // Get all users
  async getAll() {
    return await query(
      'SELECT id, username, display_name, email, role, is_active, last_login, created_at FROM users ORDER BY username'
    );
  },

  // Update user
  async update(id, updates) {
    const fields = [];
    const values = [];

    if (updates.display_name !== undefined) {
      fields.push('display_name = ?');
      values.push(updates.display_name);
    }
    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.role !== undefined) {
      fields.push('role = ?');
      values.push(updates.role);
    }
    if (updates.password_hash !== undefined) {
      fields.push('password_hash = ?');
      values.push(updates.password_hash);
    }
    if (updates.pin_hash !== undefined) {
      fields.push('pin_hash = ?');
      values.push(updates.pin_hash);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);

    await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return true;
  },

  // Deactivate user
  async deactivate(id) {
    await query(
      'UPDATE users SET is_active = FALSE WHERE id = ?',
      [id]
    );
  }
};
