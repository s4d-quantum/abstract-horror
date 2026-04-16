import db from './src/config/database.js';

async function checkTables() {
  try {
    const [tables] = await db.query("SHOW TABLES");
    console.log('All tables in database:');
    console.log(tables);

    // Check for TAC-related tables
    console.log('\nLooking for TAC/device info tables...');
    const tacTables = tables.filter(t => {
      const tableName = Object.values(t)[0].toLowerCase();
      return tableName.includes('tac') || tableName.includes('dev');
    });
    console.log('TAC/device tables:', tacTables);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTables();
