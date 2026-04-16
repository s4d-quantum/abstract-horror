import db from './src/config/database.js';

async function checkSalesSchema() {
  try {
    console.log('Sales Orders table structure:');
    const [soStructure] = await db.query("DESCRIBE sales_orders");
    console.log(soStructure);

    console.log('\n\nSales Order Lines table structure:');
    const [solStructure] = await db.query("DESCRIBE sales_order_lines");
    console.log(solStructure);

    console.log('\n\nSales Order Items table structure:');
    const [soiStructure] = await db.query("DESCRIBE sales_order_items");
    console.log(soiStructure);

    console.log('\n\nSample sales order (if exists):');
    const [sample] = await db.query("SELECT * FROM sales_orders LIMIT 1");
    console.log(JSON.stringify(sample, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSalesSchema();
