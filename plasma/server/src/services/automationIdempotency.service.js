import crypto from 'node:crypto';
import { AppError } from '../utils/helpers.js';

const AUTOMATION_LOCK_TIMEOUT_SECONDS = 10;

function buildAutomationLockName(quantumEventId, idempotencyKey) {
  const digest = crypto
    .createHash('sha256')
    .update(`${quantumEventId}:${idempotencyKey}`)
    .digest('hex')
    .slice(0, 32);

  return `automation:${digest}`;
}

export function computePayloadHash(payload) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
}

export async function getAppliedQuantumEvent(connection, quantumEventId, idempotencyKey) {
  const [rows] = await connection.execute(
    `SELECT
       quantum_event_id,
       idempotency_key,
       event_type,
       legacy_entity_type,
       legacy_entity_id,
       route_name,
       payload_hash,
       processed_at
     FROM applied_quantum_events
     WHERE quantum_event_id = ? OR idempotency_key = ?
     LIMIT 1`,
    [quantumEventId, idempotencyKey],
  );

  return rows[0] || null;
}

export async function recordAppliedQuantumEvent(connection, data) {
  await connection.execute(
    `INSERT INTO applied_quantum_events (
       quantum_event_id,
       idempotency_key,
       event_type,
       legacy_entity_type,
       legacy_entity_id,
       route_name,
       payload_hash
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.quantumEventId,
      data.idempotencyKey,
      data.eventType,
      data.legacyEntityType,
      data.legacyEntityId,
      data.routeName,
      data.payloadHash || null,
    ],
  );
}

export async function withAutomationEventLock(connection, quantumEventId, idempotencyKey, callback) {
  const lockName = buildAutomationLockName(quantumEventId, idempotencyKey);
  const [lockRows] = await connection.execute(
    'SELECT GET_LOCK(?, ?) AS lock_result',
    [lockName, AUTOMATION_LOCK_TIMEOUT_SECONDS],
  );

  if (lockRows[0]?.lock_result !== 1) {
    throw new AppError(
      'Timed out acquiring automation event lock',
      503,
      'AUTOMATION_LOCK_TIMEOUT',
    );
  }

  try {
    return await callback();
  } finally {
    try {
      await connection.execute('SELECT RELEASE_LOCK(?)', [lockName]);
    } catch (_) {
      // Best-effort cleanup only.
    }
  }
}
