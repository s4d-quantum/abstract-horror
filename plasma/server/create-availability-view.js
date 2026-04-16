import db from './src/config/database.js';

async function createAvailabilityView() {
  try {
    console.log('Creating v_device_availability view...');

    await db.query(`
      CREATE OR REPLACE VIEW v_device_availability AS
      SELECT
        d.supplier_id,
        s.name as supplier_name,
        d.manufacturer_id,
        m.name as manufacturer_name,
        d.model_id,
        mo.model_name,
        mo.model_number,
        d.storage_gb,
        d.color,
        d.grade,
        d.location_id,
        l.code as location_code,
        l.name as location_name,
        COUNT(d.id) as total_count,
        SUM(CASE WHEN d.status = 'IN_STOCK' AND d.reserved_for_so_id IS NULL THEN 1 ELSE 0 END) as available_count,
        SUM(CASE WHEN d.reserved_for_so_id IS NOT NULL THEN 1 ELSE 0 END) as reserved_count,
        SUM(CASE WHEN d.status = 'PICKED' THEN 1 ELSE 0 END) as picked_count
      FROM devices d
      JOIN suppliers s ON d.supplier_id = s.id
      JOIN manufacturers m ON d.manufacturer_id = m.id
      JOIN models mo ON d.model_id = mo.id
      LEFT JOIN locations l ON d.location_id = l.id
      WHERE d.status IN ('IN_STOCK', 'PICKED')
      GROUP BY
        d.supplier_id, s.name,
        d.manufacturer_id, m.name,
        d.model_id, mo.model_name, mo.model_number,
        d.storage_gb, d.color, d.grade,
        d.location_id, l.code, l.name
      HAVING total_count > 0
    `);

    console.log('✅ View created successfully!');

    // Test the view
    console.log('\nTesting view with sample query...');
    const [results] = await db.query(`
      SELECT
        supplier_name,
        manufacturer_name,
        model_name,
        storage_gb,
        color,
        grade,
        location_code,
        total_count,
        available_count,
        reserved_count
      FROM v_device_availability
      LIMIT 5
    `);

    console.log('\nSample results:');
    console.log(JSON.stringify(results, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create view:', error);
    process.exit(1);
  }
}

createAvailabilityView();
