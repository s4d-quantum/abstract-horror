import { query } from '../config/database.js';
import { hashPassword } from '../middleware/auth.js';

async function seedDefaultUser() {
  try {
    // Check if admin user exists
    const existing = await query('SELECT id FROM users WHERE username = ?', ['admin']);

    if (existing.length > 0) {
      console.log('✓ Admin user already exists');
      return;
    }

    // Create default admin user
    const passwordHash = await hashPassword('admin123');
    const pinHash = await hashPassword('1234');

    await query(
      `INSERT INTO users (username, display_name, email, password_hash, role, pin_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['admin', 'System Administrator', 'admin@example.com', passwordHash, 'ADMIN', pinHash]
    );

    console.log('✓ Default admin user created');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('  PIN: 1234');
  } catch (error) {
    console.error('✗ Failed to create admin user:', error.message);
  }
}

seedDefaultUser().then(() => process.exit(0));
