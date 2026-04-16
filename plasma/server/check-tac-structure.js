import db from './src/config/database.js';

async function checkTacStructure() {
  try {
    console.log('TAC Lookup table structure:');
    const [structure] = await db.query("DESCRIBE tac_lookup");
    console.log(structure);

    console.log('\nSample data from tac_lookup:');
    const [sample] = await db.query("SELECT * FROM tac_lookup LIMIT 3");
    console.log(JSON.stringify(sample, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTacStructure();
