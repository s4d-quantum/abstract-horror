import pool, { transaction } from '../config/database.js';
import { buildAutomationRequestForGroup } from './quantumSnapshotBuilder.service.js';

export const SUPPORTED_QUANTUM_EVENT_TYPES = [
  'goods_in.device_booked',
  'sales_order.device_reserved',
  'sales_order.updated',
  'stock.device_moved',
  'qc.updated',
  'qc.device_passed',
  'qc.device_failed',
];

const RETRYABLE_ERROR_CODES = new Set([
  'ECONNABORTED',
  'ECONNREFUSED',
  'ECONNRESET',
  'EAI_AGAIN',
  'ENOTFOUND',
  'ETIMEDOUT',
  'ER_LOCK_WAIT_TIMEOUT',
  'PROTOCOL_CONNECTION_LOST',
  'PROTOCOL_SEQUENCE_TIMEOUT',
]);

let quantumPollerCompatibilityPromise = null;

function runWithConnection(connection = null) {
  return connection
    ? (sql, params = []) => connection.execute(sql, params)
    : (sql, params = []) => pool.execute(sql, params);
}

function sanitizeNullableText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function parsePositiveInteger(value, fallbackValue) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue;
}

function parseQuantumPayload(row) {
  const value = row.payload_json;

  if (value && typeof value === 'object') {
    return value;
  }

  if (typeof value !== 'string') {
    throw createPermanentPollerError(
      `Outbox row ${row.id} has an unsupported payload_json value`,
      'QUANTUM_OUTBOX_PAYLOAD_INVALID',
      {
        outboxRowId: row.id,
        eventType: row.event_type,
        entityType: row.entity_type,
        entityId: sanitizeNullableText(row.entity_id),
      },
    );
  }

  try {
    return JSON.parse(value);
  } catch {
    throw createPermanentPollerError(
      `Outbox row ${row.id} has malformed payload_json`,
      'QUANTUM_OUTBOX_PAYLOAD_MALFORMED',
      {
        outboxRowId: row.id,
        eventType: row.event_type,
        entityType: row.entity_type,
        entityId: sanitizeNullableText(row.entity_id),
      },
    );
  }
}

function createPermanentPollerError(message, code = 'QUANTUM_POLLER_ERROR', metadata = {}) {
  const error = new Error(message);
  error.code = code;
  error.permanent = true;
  Object.assign(error, metadata);
  return error;
}

function extractLogicalEntity(row, payload) {
  if (row.event_type === 'goods_in.device_booked') {
    const purchaseId = sanitizeNullableText(payload.purchase_id ?? payload.legacy_purchase_id);
    if (!purchaseId) {
      throw createPermanentPollerError(
        `Outbox row ${row.id} is missing purchase_id`,
        'QUANTUM_PURCHASE_ID_MISSING',
        {
          outboxRowId: row.id,
          eventType: row.event_type,
          entityType: 'purchase',
          entityId: sanitizeNullableText(row.entity_id),
        },
      );
    }

    return {
      groupType: 'purchase',
      entityType: 'purchase',
      entityId: purchaseId,
    };
  }

  if (row.event_type === 'qc.updated' || row.event_type === 'qc.device_passed' || row.event_type === 'qc.device_failed') {
    const purchaseId = sanitizeNullableText(payload.legacy_purchase_id ?? payload.purchase_id);
    if (!purchaseId) {
      throw createPermanentPollerError(
        `Outbox row ${row.id} is missing legacy_purchase_id`,
        'QUANTUM_QC_PURCHASE_ID_MISSING',
        {
          outboxRowId: row.id,
          eventType: row.event_type,
          entityType: 'purchase',
          entityId: sanitizeNullableText(row.entity_id),
        },
      );
    }

    return {
      groupType: 'qc',
      entityType: 'purchase',
      entityId: purchaseId,
    };
  }

  if (row.event_type === 'sales_order.device_reserved' || row.event_type === 'sales_order.updated') {
    const legacyOrderId = sanitizeNullableText(payload.legacy_order_id ?? payload.order_id);
    if (!legacyOrderId) {
      throw createPermanentPollerError(
        `Outbox row ${row.id} is missing legacy_order_id`,
        'QUANTUM_SALES_ORDER_ID_MISSING',
        {
          outboxRowId: row.id,
          eventType: row.event_type,
          entityType: 'sales_order',
          entityId: sanitizeNullableText(row.entity_id),
        },
      );
    }

    return {
      groupType: 'sales_order',
      entityType: 'sales_order',
      entityId: legacyOrderId,
    };
  }

  if (row.event_type === 'stock.device_moved') {
    const imei = sanitizeNullableText(payload.imei ?? row.entity_id);
    if (!imei) {
      throw createPermanentPollerError(
        `Outbox row ${row.id} is missing imei`,
        'QUANTUM_MOVE_IMEI_MISSING',
        {
          outboxRowId: row.id,
          eventType: row.event_type,
          entityType: 'device',
          entityId: sanitizeNullableText(row.entity_id),
        },
      );
    }

    return {
      groupType: 'move',
      entityType: 'device',
      entityId: imei,
    };
  }

  throw createPermanentPollerError(
    `Outbox row ${row.id} has unsupported event_type ${row.event_type}`,
    'QUANTUM_EVENT_UNSUPPORTED',
    {
      outboxRowId: row.id,
      eventType: row.event_type,
      entityType: sanitizeNullableText(row.entity_type),
      entityId: sanitizeNullableText(row.entity_id),
    },
  );
}

function serializeResponseBody(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function computeRetryDelayMs(attemptCount, intervalMs) {
  return Math.max(intervalMs, 1000) * Math.max(attemptCount, 1);
}

function formatOutboxRange(outboxIds) {
  if (!Array.isArray(outboxIds) || outboxIds.length === 0) {
    return 'n/a';
  }

  if (outboxIds.length === 1) {
    return String(outboxIds[0]);
  }

  return `${outboxIds[0]}-${outboxIds[outboxIds.length - 1]}`;
}

export function createQuantumPollerConfig(env = process.env) {
  return {
    consumerName: sanitizeNullableText(env.POLLER_CONSUMER_NAME) || 'quantum_to_plasma_v1',
    batchSize: parsePositiveInteger(env.POLLER_BATCH_SIZE, 50),
    intervalMs: parsePositiveInteger(env.POLLER_INTERVAL_MS, 5000),
    maxRetries: parsePositiveInteger(env.POLLER_MAX_RETRIES, 10),
    plasmaAutomationBaseUrl: sanitizeNullableText(env.PLASMA_AUTOMATION_BASE_URL) || 'http://localhost:3001',
    plasmaAutomationKey: sanitizeNullableText(env.PLASMA_AUTOMATION_KEY),
  };
}

export function createQuantumDbConfig(env = process.env) {
  return {
    host: sanitizeNullableText(env.QUANTUM_DB_HOST || env.QUANTUM_TEST_DB_HOST),
    port: parsePositiveInteger(env.QUANTUM_DB_PORT || env.QUANTUM_TEST_DB_PORT, 3306),
    user: sanitizeNullableText(env.QUANTUM_DB_USER || env.QUANTUM_TEST_DB_USER),
    password: sanitizeNullableText(env.QUANTUM_DB_PASSWORD || env.QUANTUM_TEST_DB_PASSWORD),
    database: sanitizeNullableText(env.QUANTUM_DB_NAME || env.QUANTUM_TEST_DB_NAME) || 's4d_england_db',
  };
}

export async function ensureQuantumPollerSchema(connection = null) {
  const execute = runWithConnection(connection);

  await execute(`
    CREATE TABLE IF NOT EXISTS quantum_poller_state (
      consumer_name VARCHAR(100) NOT NULL,
      last_outbox_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (consumer_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS quantum_poller_attempts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      consumer_name VARCHAR(100) NOT NULL,
      outbox_id BIGINT UNSIGNED NOT NULL,
      event_type VARCHAR(100) NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      entity_id VARCHAR(100) NOT NULL,
      coalesced_outbox_ids_json JSON NOT NULL,
      attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
      status ENUM('retry', 'dead_letter', 'done') NOT NULL,
      last_error TEXT DEFAULT NULL,
      last_http_status INT DEFAULT NULL,
      last_response_body LONGTEXT DEFAULT NULL,
      next_retry_at DATETIME DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_quantum_poller_attempts_consumer_outbox (consumer_name, outbox_id),
      KEY idx_quantum_poller_attempts_status_retry (consumer_name, status, next_retry_at),
      KEY idx_quantum_poller_attempts_entity (entity_type, entity_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
}

export async function ensureQuantumPollerCompatibility() {
  if (!quantumPollerCompatibilityPromise) {
    quantumPollerCompatibilityPromise = ensureQuantumPollerSchema()
      .catch((error) => {
        quantumPollerCompatibilityPromise = null;
        throw error;
      });
  }

  return quantumPollerCompatibilityPromise;
}

export async function getQuantumPollerState(consumerName, connection = null) {
  const execute = runWithConnection(connection);

  await execute(
    `INSERT INTO quantum_poller_state (consumer_name, last_outbox_id)
     VALUES (?, 0)
     ON DUPLICATE KEY UPDATE consumer_name = VALUES(consumer_name)`,
    [consumerName],
  );

  const [rows] = await execute(
    `SELECT consumer_name, last_outbox_id, updated_at
     FROM quantum_poller_state
     WHERE consumer_name = ?
     LIMIT 1`,
    [consumerName],
  );

  return rows[0] || {
    consumer_name: consumerName,
    last_outbox_id: 0,
    updated_at: null,
  };
}

export async function updateQuantumPollerCheckpoint(consumerName, lastOutboxId, connection = null) {
  const execute = runWithConnection(connection);

  await execute(
    `INSERT INTO quantum_poller_state (consumer_name, last_outbox_id)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE
       last_outbox_id = VALUES(last_outbox_id)`,
    [consumerName, lastOutboxId],
  );
}

export async function getQuantumPollerAttempt(consumerName, outboxId, connection = null) {
  const execute = runWithConnection(connection);
  const [rows] = await execute(
    `SELECT *
     FROM quantum_poller_attempts
     WHERE consumer_name = ?
       AND outbox_id = ?
     LIMIT 1`,
    [consumerName, outboxId],
  );

  return rows[0] || null;
}

export async function upsertQuantumPollerAttempt(record, connection = null) {
  const execute = runWithConnection(connection);

  await execute(
    `INSERT INTO quantum_poller_attempts (
       consumer_name,
       outbox_id,
       event_type,
       entity_type,
       entity_id,
       coalesced_outbox_ids_json,
       attempt_count,
       status,
       last_error,
       last_http_status,
       last_response_body,
       next_retry_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       event_type = VALUES(event_type),
       entity_type = VALUES(entity_type),
       entity_id = VALUES(entity_id),
       coalesced_outbox_ids_json = VALUES(coalesced_outbox_ids_json),
       attempt_count = VALUES(attempt_count),
       status = VALUES(status),
       last_error = VALUES(last_error),
       last_http_status = VALUES(last_http_status),
       last_response_body = VALUES(last_response_body),
       next_retry_at = VALUES(next_retry_at)`,
    [
      record.consumerName,
      record.outboxId,
      record.eventType,
      record.entityType,
      record.entityId,
      JSON.stringify(record.coalescedOutboxIds || []),
      record.attemptCount,
      record.status,
      record.lastError || null,
      record.lastHttpStatus ?? null,
      record.lastResponseBody || null,
      record.nextRetryAt || null,
    ],
  );
}

export async function markQuantumPollerAttemptDone(record, connection = null) {
  const execute = runWithConnection(connection);

  await execute(
    `INSERT INTO quantum_poller_attempts (
       consumer_name,
       outbox_id,
       event_type,
       entity_type,
       entity_id,
       coalesced_outbox_ids_json,
       attempt_count,
       status,
       last_error,
       last_http_status,
       last_response_body,
       next_retry_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 'done', NULL, ?, NULL, NULL)
     ON DUPLICATE KEY UPDATE
       event_type = VALUES(event_type),
       entity_type = VALUES(entity_type),
       entity_id = VALUES(entity_id),
       coalesced_outbox_ids_json = VALUES(coalesced_outbox_ids_json),
       attempt_count = GREATEST(attempt_count, VALUES(attempt_count)),
       status = 'done',
       last_error = NULL,
       last_http_status = VALUES(last_http_status),
       last_response_body = NULL,
       next_retry_at = NULL`,
    [
      record.consumerName,
      record.outboxId,
      record.eventType,
      record.entityType,
      record.entityId,
      JSON.stringify(record.coalescedOutboxIds || []),
      record.attemptCount ?? 0,
      record.lastHttpStatus ?? null,
    ],
  );
}

export async function readQuantumOutboxBatch(quantumConnection, lastOutboxId, batchSize) {
  const [rows] = await quantumConnection.execute(
    `SELECT
       id,
       event_type,
       entity_type,
       entity_id,
       payload_json,
       source_user,
       created_at,
       idempotency_key
     FROM quantum_event_outbox
     WHERE id > ?
       AND event_type IN (${SUPPORTED_QUANTUM_EVENT_TYPES.map(() => '?').join(', ')})
     ORDER BY id
     LIMIT ?`,
    [lastOutboxId, ...SUPPORTED_QUANTUM_EVENT_TYPES, batchSize],
  );

  return rows;
}

export function coalesceQuantumOutboxRows(rows) {
  const groupedRows = new Map();

  for (const row of rows) {
    const payload = parseQuantumPayload(row);
    const logicalEntity = extractLogicalEntity(row, payload);
    const groupKey = `${logicalEntity.groupType}:${logicalEntity.entityId}`;

    if (!groupedRows.has(groupKey)) {
      groupedRows.set(groupKey, {
        groupKey,
        groupType: logicalEntity.groupType,
        entityType: logicalEntity.entityType,
        entityId: logicalEntity.entityId,
        outboxIds: [],
        maxOutboxId: row.id,
        latestRow: row,
        latestPayload: payload,
      });
    }

    const group = groupedRows.get(groupKey);
    group.outboxIds.push(row.id);
    if (row.id >= group.maxOutboxId) {
      group.maxOutboxId = row.id;
      group.latestRow = row;
      group.latestPayload = payload;
    }
  }

  return Array.from(groupedRows.values())
    .sort((left, right) => left.maxOutboxId - right.maxOutboxId);
}

export function classifyQuantumPollerFailure(error) {
  const httpStatus = Number(error?.response?.status || 0) || null;
  const message = error?.message || 'Unknown poller failure';
  const code = error?.code || null;
  const responseBody = serializeResponseBody(error?.response?.data);

  if (error?.permanent) {
    return {
      classification: 'permanent',
      message,
      httpStatus,
      responseBody,
      code,
    };
  }

  if (httpStatus !== null) {
    return {
      classification: httpStatus >= 500 ? 'retryable' : 'permanent',
      message,
      httpStatus,
      responseBody,
      code,
    };
  }

  if (RETRYABLE_ERROR_CODES.has(code) || /timeout|temporar|lock wait/i.test(message)) {
    return {
      classification: 'retryable',
      message,
      httpStatus: null,
      responseBody,
      code,
    };
  }

  return {
    classification: 'permanent',
    message,
    httpStatus: null,
    responseBody,
    code,
  };
}

export async function runQuantumPollerOnce({
  quantumConnection,
  plasmaClient,
  logger = console,
  config = createQuantumPollerConfig(),
  snapshotGeneratedAt = new Date(),
  buildRequestForGroup = buildAutomationRequestForGroup,
} = {}) {
  if (!quantumConnection?.execute) {
    throw new Error('quantumConnection.execute is required');
  }

  if (!plasmaClient?.post) {
    throw new Error('plasmaClient.post is required');
  }

  await ensureQuantumPollerCompatibility();

  const state = await getQuantumPollerState(config.consumerName);
  const rows = await readQuantumOutboxBatch(
    quantumConnection,
    Number(state.last_outbox_id || 0),
    config.batchSize,
  );

  if (!rows.length) {
    logger.info?.(`[quantum-poller] idle consumer=${config.consumerName} last_outbox_id=${state.last_outbox_id || 0}`);
    return {
      status: 'idle',
      fetchedRows: 0,
      processedGroups: 0,
      lastOutboxId: Number(state.last_outbox_id || 0),
    };
  }

  let groups;
  try {
    groups = coalesceQuantumOutboxRows(rows);
  } catch (error) {
    const failedRowId = Number(error?.outboxRowId || rows[0].id);
    const failedRow = rows.find((row) => Number(row.id) === failedRowId) || rows[0];
    const existingAttempt = await getQuantumPollerAttempt(config.consumerName, failedRowId);

    await transaction(async (connection) => {
      await upsertQuantumPollerAttempt({
        consumerName: config.consumerName,
        outboxId: failedRowId,
        eventType: error?.eventType || failedRow.event_type,
        entityType: error?.entityType || sanitizeNullableText(failedRow.entity_type) || 'unknown',
        entityId: error?.entityId || sanitizeNullableText(failedRow.entity_id) || 'unknown',
        coalescedOutboxIds: [failedRowId],
        attemptCount: Number(existingAttempt?.attempt_count || 0) + 1,
        status: 'dead_letter',
        lastError: error?.message || 'Failed to coalesce Quantum outbox rows',
        lastHttpStatus: null,
        lastResponseBody: null,
        nextRetryAt: null,
      }, connection);
    });

    logger.error?.(
      `[quantum-poller] dead_letter group=coalesce entity=${sanitizeNullableText(failedRow.entity_id) || 'unknown'} outbox=${failedRowId} error=${error?.message || 'Failed to coalesce Quantum outbox rows'}`,
    );

    return {
      status: 'dead_letter',
      fetchedRows: rows.length,
      processedGroups: 0,
      lastOutboxId: Number(state.last_outbox_id || 0),
      blockedGroup: null,
    };
  }

  let lastOutboxId = Number(state.last_outbox_id || 0);
  let processedGroups = 0;

  for (const group of groups) {
    const existingAttempt = await getQuantumPollerAttempt(config.consumerName, group.maxOutboxId);

    if (existingAttempt?.status === 'dead_letter') {
      logger.error?.(
        `[quantum-poller] dead-letter-block group=${group.groupType} entity=${group.entityId} outbox=${formatOutboxRange(group.outboxIds)}`,
      );

      return {
        status: 'dead_letter',
        fetchedRows: rows.length,
        processedGroups,
        lastOutboxId,
        blockedGroup: group,
      };
    }

    if (existingAttempt?.status === 'retry' && existingAttempt.next_retry_at) {
      const retryAt = new Date(existingAttempt.next_retry_at);
      const snapshotDate = snapshotGeneratedAt instanceof Date
        ? snapshotGeneratedAt
        : new Date(snapshotGeneratedAt);

      if (!Number.isNaN(retryAt.getTime()) && retryAt > snapshotDate) {
        logger.info?.(
          `[quantum-poller] retry-wait group=${group.groupType} entity=${group.entityId} outbox=${formatOutboxRange(group.outboxIds)} retry_at=${retryAt.toISOString()}`,
        );

        return {
          status: 'retry_wait',
          fetchedRows: rows.length,
          processedGroups,
          lastOutboxId,
          blockedGroup: group,
          nextRetryAt: retryAt.toISOString(),
        };
      }
    }

    if (existingAttempt?.status === 'done') {
      await transaction(async (connection) => {
        await updateQuantumPollerCheckpoint(config.consumerName, group.maxOutboxId, connection);
      });

      lastOutboxId = group.maxOutboxId;
      processedGroups += 1;
      continue;
    }

    try {
      const request = await buildRequestForGroup(quantumConnection, group, snapshotGeneratedAt);
      const response = await plasmaClient.post(request.path, request.payload);

      await transaction(async (connection) => {
        await markQuantumPollerAttemptDone({
          consumerName: config.consumerName,
          outboxId: group.maxOutboxId,
          eventType: group.latestRow.event_type,
          entityType: group.entityType,
          entityId: String(group.entityId),
          coalescedOutboxIds: group.outboxIds,
          attemptCount: Number(existingAttempt?.attempt_count || 0),
          lastHttpStatus: response?.status ?? null,
        }, connection);

        await updateQuantumPollerCheckpoint(config.consumerName, group.maxOutboxId, connection);
      });

      lastOutboxId = group.maxOutboxId;
      processedGroups += 1;

      logger.info?.(
        `[quantum-poller] synced group=${group.groupType} entity=${group.entityId} outbox=${formatOutboxRange(group.outboxIds)} plasma_status=${response?.status ?? 'n/a'}`,
      );
    } catch (error) {
      const failure = classifyQuantumPollerFailure(error);
      const nextAttemptCount = Number(existingAttempt?.attempt_count || 0) + 1;
      const isRetryable = failure.classification === 'retryable' && nextAttemptCount < config.maxRetries;
      const nextRetryAt = isRetryable
        ? new Date(new Date(snapshotGeneratedAt).getTime() + computeRetryDelayMs(nextAttemptCount, config.intervalMs))
        : null;
      const status = isRetryable ? 'retry' : 'dead_letter';

      await transaction(async (connection) => {
        await upsertQuantumPollerAttempt({
          consumerName: config.consumerName,
          outboxId: group.maxOutboxId,
          eventType: group.latestRow.event_type,
          entityType: group.entityType,
          entityId: String(group.entityId),
          coalescedOutboxIds: group.outboxIds,
          attemptCount: nextAttemptCount,
          status,
          lastError: failure.message,
          lastHttpStatus: failure.httpStatus,
          lastResponseBody: failure.responseBody,
          nextRetryAt: nextRetryAt ? nextRetryAt.toISOString().slice(0, 19).replace('T', ' ') : null,
        }, connection);
      });

      logger[status === 'retry' ? 'warn' : 'error']?.(
        `[quantum-poller] ${status} group=${group.groupType} entity=${group.entityId} outbox=${formatOutboxRange(group.outboxIds)} http_status=${failure.httpStatus ?? 'n/a'} error=${failure.message}`,
      );

      return {
        status,
        fetchedRows: rows.length,
        processedGroups,
        lastOutboxId,
        blockedGroup: group,
        nextRetryAt: nextRetryAt ? nextRetryAt.toISOString() : null,
      };
    }
  }

  return {
    status: 'ok',
    fetchedRows: rows.length,
    processedGroups,
    lastOutboxId,
  };
}
