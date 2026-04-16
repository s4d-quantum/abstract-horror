import db from '../config/database.js';

export const tacModel = {
  // Lookup device info by TAC code (first 8 digits of IMEI)
  async lookupByTac(tacCode) {
    const [results] = await db.query(`
      SELECT
        tl.manufacturer_id,
        tl.model_id,
        tl.possible_storage,
        tl.possible_colors,
        m.name as manufacturer_name,
        mo.model_name,
        mo.model_number
      FROM tac_lookup tl
      JOIN manufacturers m ON tl.manufacturer_id = m.id
      JOIN models mo ON tl.model_id = mo.id
      WHERE tl.tac_code = ?
      LIMIT 1
    `, [tacCode]);

    if (results.length === 0) {
      return null;
    }

    const result = results[0];

    // Parse JSON arrays for colors and storage
    let colors = [];
    let storages = [];

    try {
      if (result.possible_colors) {
        colors = JSON.parse(result.possible_colors);
      }
    } catch (e) {
      console.error('Error parsing possible_colors:', e);
    }

    try {
      if (result.possible_storage) {
        storages = JSON.parse(result.possible_storage);
      }
    } catch (e) {
      console.error('Error parsing possible_storage:', e);
    }

    return {
      manufacturer: result.manufacturer_name,
      model: result.model_name || result.model_number,
      colors: colors,
      storages: storages,
      manufacturerId: result.manufacturer_id,
      modelId: result.model_id
    };
  },

  // Lookup colors and storage options by model ID
  // Aggregates all possible options from all TAC codes for this model
  async lookupByModel(modelId) {
    const [results] = await db.query(`
      SELECT
        tl.possible_storage,
        tl.possible_colors
      FROM tac_lookup tl
      WHERE tl.model_id = ?
    `, [modelId]);

    if (results.length === 0) {
      return null;
    }

    // Aggregate all unique colors and storages
    const allColors = new Set();
    const allStorages = new Set();

    for (const row of results) {
      try {
        if (row.possible_colors) {
          const colors = JSON.parse(row.possible_colors);
          colors.forEach(color => allColors.add(color));
        }
      } catch (e) {
        console.error('Error parsing possible_colors:', e);
      }

      try {
        if (row.possible_storage) {
          const storages = JSON.parse(row.possible_storage);
          storages.forEach(storage => allStorages.add(storage));
        }
      } catch (e) {
        console.error('Error parsing possible_storage:', e);
      }
    }

    return {
      colors: Array.from(allColors).sort(),
      storages: Array.from(allStorages).sort((a, b) => a - b)
    };
  }
};
