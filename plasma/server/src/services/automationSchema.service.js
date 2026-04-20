import pool from '../config/database.js';

export const AUTOMATION_ROBOT_USERNAME = 'automation_robot';
export const AUTOMATION_ROBOT_DISPLAY_NAME = 'Automation Robot';
export const AUTOMATION_ROBOT_PASSWORD_HASH = '$2a$10$hJy3Xv/NGnqcJ8wR1FfBbO4mXZQLdOQ5K79VaA0URshx7PqAj3KMW';
export const AUTOMATION_ROBOT_ROLE = 'ADMIN';
export const KNOWN_LEGACY_BRAND_OVERRIDES = [
  ['CAT4', 'Asus'],
  ['CAT7', 'Lenovo'],
  ['CAT8', 'HP'],
  ['CAT10', 'Acer'],
  ['CAT13', 'Blackberry'],
];

let automationCompatibilityPromise = null;

function runWithConnection(connection = null) {
  return connection
    ? (sql, params = []) => connection.execute(sql, params)
    : (sql, params = []) => pool.execute(sql, params);
}

export async function ensureLegacyBrandMapTable(connection = null) {
  const execute = runWithConnection(connection);

  await execute(`
    CREATE TABLE IF NOT EXISTS legacy_brand_map (
      legacy_item_brand VARCHAR(20) NOT NULL,
      manufacturer_name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (legacy_item_brand),
      KEY idx_legacy_brand_map_manufacturer_name (manufacturer_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await execute(`
    INSERT INTO legacy_brand_map (legacy_item_brand, manufacturer_name)
    SELECT lsbm.legacy_item_brand, m.name
    FROM legacy_sales_brand_map lsbm
    JOIN manufacturers m ON m.id = lsbm.manufacturer_id
    ON DUPLICATE KEY UPDATE
      manufacturer_name = VALUES(manufacturer_name)
  `).catch((error) => {
    if (error?.code !== 'ER_NO_SUCH_TABLE') {
      throw error;
    }
  });

  if (KNOWN_LEGACY_BRAND_OVERRIDES.length > 0) {
    await execute(
      `INSERT INTO legacy_brand_map (legacy_item_brand, manufacturer_name)
       VALUES ${KNOWN_LEGACY_BRAND_OVERRIDES.map(() => '(?, ?)').join(', ')}
       ON DUPLICATE KEY UPDATE
         manufacturer_name = VALUES(manufacturer_name)`,
      KNOWN_LEGACY_BRAND_OVERRIDES.flat(),
    );
  }
}

export async function ensureAppliedQuantumEventsTable(connection = null) {
  const execute = runWithConnection(connection);

  await execute(`
    CREATE TABLE IF NOT EXISTS applied_quantum_events (
      quantum_event_id BIGINT UNSIGNED NOT NULL,
      idempotency_key VARCHAR(255) NOT NULL,
      event_type VARCHAR(100) NOT NULL,
      legacy_entity_type VARCHAR(100) NOT NULL,
      legacy_entity_id VARCHAR(100) NOT NULL,
      route_name VARCHAR(100) NOT NULL,
      payload_hash CHAR(64) DEFAULT NULL,
      processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (quantum_event_id),
      UNIQUE KEY uq_applied_quantum_events_idempotency_key (idempotency_key),
      KEY idx_applied_quantum_events_route_name (route_name),
      KEY idx_applied_quantum_events_entity (legacy_entity_type, legacy_entity_id),
      KEY idx_applied_quantum_events_processed_at (processed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
}

export async function ensureAutomationRobotUser(connection = null) {
  const execute = runWithConnection(connection);

  await execute(
    `INSERT INTO users (username, display_name, password_hash, role, is_active)
     VALUES (?, ?, ?, ?, TRUE)
     ON DUPLICATE KEY UPDATE
       display_name = VALUES(display_name),
       role = VALUES(role),
       is_active = TRUE`,
    [
      AUTOMATION_ROBOT_USERNAME,
      AUTOMATION_ROBOT_DISPLAY_NAME,
      AUTOMATION_ROBOT_PASSWORD_HASH,
      AUTOMATION_ROBOT_ROLE,
    ],
  );

  const [rows] = await execute(
    `SELECT id, username, display_name, role
     FROM users
     WHERE username = ?
     LIMIT 1`,
    [AUTOMATION_ROBOT_USERNAME],
  );

  return rows[0] || null;
}

export async function runAutomationMigration(connection = null) {
  await ensureLegacyBrandMapTable(connection);
  await ensureAppliedQuantumEventsTable(connection);
  return ensureAutomationRobotUser(connection);
}

export async function ensureAutomationCompatibility() {
  if (!automationCompatibilityPromise) {
    automationCompatibilityPromise = runAutomationMigration()
      .catch((error) => {
        automationCompatibilityPromise = null;
        throw error;
      });
  }

  return automationCompatibilityPromise;
}
