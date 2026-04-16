import db from './src/config/database.js';

async function addReservationColumn() {
  try {
    console.log('Adding reserved_for_so_id column to devices table...');

    await db.query(`
      ALTER TABLE devices
      ADD COLUMN reserved_for_so_id INT(10) UNSIGNED NULL AFTER status
    `);

    console.log('Column added successfully!');

    console.log('Adding index...');
    await db.query(`
      ALTER TABLE devices
      ADD KEY idx_reserved_for_so (reserved_for_so_id)
    `);

    console.log('Index added successfully!');

    console.log('Adding foreign key constraint...');
    await db.query(`
      ALTER TABLE devices
      ADD CONSTRAINT fk_devices_reserved_so
      FOREIGN KEY (reserved_for_so_id)
      REFERENCES sales_orders(id)
      ON DELETE SET NULL
    `);

    console.log('Foreign key added successfully!');
    console.log('\n✅ Migration completed successfully!');

    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠️  Column already exists, skipping...');
      process.exit(0);
    }
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addReservationColumn();
