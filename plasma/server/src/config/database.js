import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test the connection
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✓ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    return false;
  }
}

// Helper function for executing queries with error handling
export async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
}

/**
 * Execute a database transaction with automatic connection management
 *
 * @param {Function} callback - Async function that receives a connection and performs database operations
 * @returns {Promise<any>} - Result from the callback function
 *
 * @example
 * // Simple transaction
 * const result = await transaction(async (conn) => {
 *   await conn.execute('INSERT INTO users (name) VALUES (?)', ['John']);
 *   await conn.execute('INSERT INTO logs (action) VALUES (?)', ['user_created']);
 *   return { success: true };
 * });
 *
 * @example
 * // Transaction with row locking
 * const device = await transaction(async (conn) => {
 *   const [rows] = await conn.execute(
 *     'SELECT * FROM devices WHERE id = ? FOR UPDATE',
 *     [deviceId]
 *   );
 *   await conn.execute('UPDATE devices SET status = ? WHERE id = ?', ['SHIPPED', deviceId]);
 *   return rows[0];
 * });
 */
export async function transaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    // Re-throw with additional context
    error.message = `Transaction failed: ${error.message}`;
    throw error;
  } finally {
    connection.release();
  }
}

export default pool;
