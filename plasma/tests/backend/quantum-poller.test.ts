import { describe, expect, it, vi } from 'vitest';
import {
  buildMoveSyncRequest,
  buildPurchaseQcSyncRequest,
  buildPurchaseSyncRequest,
  buildSalesOrderSyncRequest,
} from '../../server/src/services/quantumSnapshotBuilder.service.js';
import {
  classifyQuantumPollerFailure,
  coalesceQuantumOutboxRows,
  createQuantumPollerConfig,
  ensureQuantumPollerSchema,
  getQuantumPollerAttempt,
  getQuantumPollerState,
  runQuantumPollerOnce,
} from '../../server/src/services/quantumPoller.service.js';
import { getTestDbPool } from './utils/test-db';

function createMockQuantumConnection(responses: any[]) {
  return {
    execute: vi.fn(async () => {
      const next = responses.shift();
      if (next instanceof Error) {
        throw next;
      }
      return next;
    }),
  };
}

function makeOutboxRow({
  id,
  eventType,
  payload,
  entityId = null,
  createdAt = '2026-04-20T10:00:00.000Z',
}: {
  id: number;
  eventType: string;
  payload: Record<string, any>;
  entityId?: string | null;
  createdAt?: string;
}) {
  return {
    id,
    event_type: eventType,
    entity_type: 'device',
    entity_id: entityId,
    payload_json: JSON.stringify(payload),
    source_user: '12',
    created_at: createdAt,
    idempotency_key: `idempotency-${id}`,
  };
}

function makeHttpError(status: number, message = `Request failed with status code ${status}`, data: any = {}) {
  const error: any = new Error(message);
  error.response = {
    status,
    data,
  };
  return error;
}

describe('Quantum poller schema', () => {
  it('ensures the poller checkpoint and attempt tables exist', async () => {
    const pool = await getTestDbPool();
    await ensureQuantumPollerSchema();

    const [stateColumns]: any = await pool.query('SHOW COLUMNS FROM quantum_poller_state');
    const [attemptColumns]: any = await pool.query('SHOW COLUMNS FROM quantum_poller_attempts');

    expect(stateColumns.map((column: any) => column.Field)).toContain('last_outbox_id');
    expect(attemptColumns.map((column: any) => column.Field)).toEqual(
      expect.arrayContaining(['outbox_id', 'attempt_count', 'status', 'next_retry_at']),
    );
  });
});

describe('Quantum poller coalescing', () => {
  it('coalesces purchases, QC, sales orders, and keeps only the newest move per IMEI', () => {
    const groups = coalesceQuantumOutboxRows([
      makeOutboxRow({
        id: 1,
        eventType: 'goods_in.device_booked',
        payload: { purchase_id: 9001, imei: '111111111111111' },
      }),
      makeOutboxRow({
        id: 2,
        eventType: 'goods_in.device_booked',
        payload: { purchase_id: 9001, imei: '222222222222222' },
      }),
      makeOutboxRow({
        id: 3,
        eventType: 'qc.updated',
        payload: { legacy_purchase_id: 9001, imei: '111111111111111' },
      }),
      makeOutboxRow({
        id: 4,
        eventType: 'sales_order.updated',
        payload: { legacy_order_id: 7001 },
      }),
      makeOutboxRow({
        id: 5,
        eventType: 'sales_order.device_reserved',
        payload: { legacy_order_id: 7001, imei: '333333333333333' },
      }),
      makeOutboxRow({
        id: 6,
        eventType: 'stock.device_moved',
        payload: { imei: '444444444444444', new_tray_id: 'TR002' },
        entityId: '444444444444444',
      }),
      makeOutboxRow({
        id: 7,
        eventType: 'stock.device_moved',
        payload: { imei: '444444444444444', new_tray_id: 'TR003' },
        entityId: '444444444444444',
      }),
    ]);

    expect(groups).toHaveLength(4);
    expect(groups.map((group) => [group.groupType, String(group.entityId), group.maxOutboxId])).toEqual([
      ['purchase', '9001', 2],
      ['qc', '9001', 3],
      ['sales_order', '7001', 5],
      ['move', '444444444444444', 7],
    ]);
    expect(groups[0].outboxIds).toEqual([1, 2]);
    expect(groups[2].outboxIds).toEqual([4, 5]);
    expect(groups[3].latestPayload.new_tray_id).toBe('TR003');
  });
});

describe('Quantum snapshot builders', () => {
  it('rebuilds a purchase sync payload from Quantum source rows', async () => {
    const quantumConnection = createMockQuantumConnection([
      [[{
        purchase_id: 8713,
        date: '2026-04-16',
        po_ref: '4324',
        qc_required: 0,
        repair_required: 0,
        report_comment: 'Fresh stock',
        supplier_code: 'SUP-167',
        supplier_name: 'Foxway',
        address_line1: 'Line 1',
        country: 'Estonia',
      }]],
      [[{
        item_imei: '355680653981035',
        tray_id: 'TR001',
        item_brand: 'CAT3',
        item_details: 'S921B/DS',
        item_gb: '256',
        item_color: 'Titanium Grey',
        item_grade: 1,
        created_at: '2026-04-16T15:42:16.000Z',
      }]],
    ]);

    const request = await buildPurchaseSyncRequest(quantumConnection as any, {
      groupType: 'purchase',
      entityType: 'purchase',
      entityId: '8713',
      maxOutboxId: 6,
      latestRow: makeOutboxRow({
        id: 6,
        eventType: 'goods_in.device_booked',
        payload: { purchase_id: 8713, imei: '355680653981035' },
      }),
      latestPayload: { purchase_id: 8713, imei: '355680653981035' },
      outboxIds: [6],
    });

    expect(request.path).toBe('/api/automation/purchases/8713/sync');
    expect(request.payload.purchase.supplier.supplier_code).toBe('SUP-167');
    expect(request.payload.purchase.devices).toEqual([
      expect.objectContaining({
        imei: '355680653981035',
        tray_id: 'TR001',
        item_brand: 'CAT3',
        item_details: 'S921B/DS',
      }),
    ]);
  });

  it('rebuilds a QC sync payload with all QC rows for the purchase', async () => {
    const quantumConnection = createMockQuantumConnection([
      [[
        {
          item_code: '351885210597083',
          item_imei: '351885210597083',
          item_comments: '-',
          item_cosmetic_passed: 1,
          item_functional_passed: 0,
          item_eu: 'EU-UK',
          item_grade: 1,
          item_color: 'Titanium Grey',
        },
        {
          item_code: '351885210600382',
          item_imei: '351885210600382',
          item_comments: 'Looks good',
          item_cosmetic_passed: 1,
          item_functional_passed: 1,
          item_eu: 'EU-UK',
          item_grade: 1,
          item_color: 'Titanium Grey',
        },
      ]],
    ]);

    const request = await buildPurchaseQcSyncRequest(quantumConnection as any, {
      groupType: 'qc',
      entityType: 'purchase',
      entityId: '8708',
      maxOutboxId: 12,
      latestRow: makeOutboxRow({
        id: 12,
        eventType: 'qc.updated',
        payload: { legacy_purchase_id: 8708, imei: '351885210600382' },
      }),
      latestPayload: { legacy_purchase_id: 8708, imei: '351885210600382' },
      outboxIds: [7, 8, 12],
    });

    expect(request.path).toBe('/api/automation/qc/purchases/8708/sync');
    expect(request.payload.purchase.devices).toHaveLength(2);
    expect(request.payload.purchase.devices[0]).toEqual(
      expect.objectContaining({
        imei: '351885210597083',
        item_functional_passed: 0,
      }),
    );
  });

  it('builds a requirement-only sales order payload with grouped lines and no devices', async () => {
    const quantumConnection = createMockQuantumConnection([
      [[
        {
          order_id: 16189,
          date: '2026-04-16T00:00:00.000Z',
          po_ref: 'PO-1',
          customer_ref: 'CUST-1',
          customer_code: 'CST-36',
          customer_name: 'Buy IT Ltd',
          supplier_id: 'SUP-167',
          supplier_code: 'SUP-167',
          supplier_name: 'Foxway',
          item_brand: 'CAT3',
          item_details: 'A546B/DS',
          item_color: 'Black',
          item_grade: '1',
          item_gb: '256',
          tray_id: 'TR010',
        },
        {
          order_id: 16189,
          date: '2026-04-16T00:00:00.000Z',
          po_ref: 'PO-1',
          customer_ref: 'CUST-1',
          customer_code: 'CST-36',
          customer_name: 'Buy IT Ltd',
          supplier_id: 'SUP-167',
          supplier_code: 'SUP-167',
          supplier_name: 'Foxway',
          item_brand: 'CAT3',
          item_details: 'A546B/DS',
          item_color: 'Black',
          item_grade: '1',
          item_gb: '256',
          tray_id: 'TR010',
        },
      ]],
    ]);

    const request = await buildSalesOrderSyncRequest(quantumConnection as any, {
      groupType: 'sales_order',
      entityType: 'sales_order',
      entityId: '16189',
      maxOutboxId: 22,
      latestRow: makeOutboxRow({
        id: 22,
        eventType: 'sales_order.updated',
        payload: { legacy_order_id: 16189 },
      }),
      latestPayload: { legacy_order_id: 16189 },
      outboxIds: [21, 22],
    });

    expect(request.path).toBe('/api/automation/sales-orders/16189/sync');
    expect(request.payload.sales_order.devices_authoritative).toBe(false);
    expect(request.payload.sales_order.devices).toEqual([]);
    expect(request.payload.sales_order.lines).toEqual([
      expect.objectContaining({
        supplier_code: 'SUP-167',
        tray_id: 'TR010',
        requested_quantity: 2,
      }),
    ]);
  });

  it('normalizes move payloads directly from the outbox and falls back to operation for reason', () => {
    const request = buildMoveSyncRequest({
      groupType: 'move',
      entityType: 'device',
      entityId: '351885210787106',
      maxOutboxId: 5,
      latestRow: makeOutboxRow({
        id: 5,
        eventType: 'stock.device_moved',
        payload: {
          imei: '351885210787106',
          old_tray_id: 'TR012',
          new_tray_id: 'TR004',
          operation: 'item_details_tray_update',
        },
      }),
      latestPayload: {
        imei: '351885210787106',
        old_tray_id: 'TR012',
        new_tray_id: 'TR004',
        operation: 'item_details_tray_update',
      },
      outboxIds: [5],
    });

    expect(request.path).toBe('/api/automation/devices/351885210787106/move');
    expect(request.payload).toEqual(
      expect.objectContaining({
        new_location: 'TR004',
        old_location: 'TR012',
        reason: 'item_details_tray_update',
      }),
    );
  });
});

describe('Quantum poller failure classification', () => {
  it('classifies network, 5xx, and lock wait failures as retryable', () => {
    const timeoutError: any = new Error('timeout exceeded');
    timeoutError.code = 'ECONNABORTED';
    const serverError = makeHttpError(503, 'Request failed with status code 503', { error: 'busy' });
    const lockWaitError: any = new Error('Lock wait timeout exceeded; try restarting transaction');
    lockWaitError.code = 'ER_LOCK_WAIT_TIMEOUT';

    expect(classifyQuantumPollerFailure(timeoutError).classification).toBe('retryable');
    expect(classifyQuantumPollerFailure(serverError).classification).toBe('retryable');
    expect(classifyQuantumPollerFailure(lockWaitError).classification).toBe('retryable');
  });

  it('classifies 4xx and malformed payload failures as permanent', () => {
    const validationError = makeHttpError(422, 'Request failed with status code 422', { error: 'invalid' });
    const malformedPayload: any = new Error('Outbox row 7 has malformed payload_json');
    malformedPayload.permanent = true;

    expect(classifyQuantumPollerFailure(validationError).classification).toBe('permanent');
    expect(classifyQuantumPollerFailure(malformedPayload).classification).toBe('permanent');
  });
});

describe('Quantum poller checkpoint semantics', () => {
  it('advances checkpoints only through successful groups and records retry attempts for the failed group', async () => {
    const quantumConnection = {
      execute: vi.fn(async () => [[
        makeOutboxRow({
          id: 1,
          eventType: 'goods_in.device_booked',
          payload: { purchase_id: 9001, imei: '111111111111111' },
        }),
        makeOutboxRow({
          id: 2,
          eventType: 'sales_order.updated',
          payload: { legacy_order_id: 7001 },
        }),
        makeOutboxRow({
          id: 3,
          eventType: 'stock.device_moved',
          payload: { imei: '222222222222222', new_tray_id: 'TR002' },
          entityId: '222222222222222',
        }),
      ]]),
    };
    const plasmaClient = {
      post: vi.fn()
        .mockResolvedValueOnce({ status: 200, data: { success: true } })
        .mockRejectedValueOnce(makeHttpError(503, 'Request failed with status code 503', { error: 'busy' })),
    };
    const buildRequestForGroup = vi.fn(async (_connection, group) => ({
      path: `/fake/${group.groupType}/${group.entityId}`,
      payload: { quantum_event_id: String(group.maxOutboxId) },
    }));
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const config = {
      ...createQuantumPollerConfig(),
      consumerName: 'quantum_to_plasma_test',
      batchSize: 50,
      intervalMs: 5000,
      maxRetries: 3,
    };

    const result = await runQuantumPollerOnce({
      quantumConnection: quantumConnection as any,
      plasmaClient: plasmaClient as any,
      logger,
      config,
      snapshotGeneratedAt: new Date('2026-04-20T12:00:00.000Z'),
      buildRequestForGroup,
    });

    expect(result.status).toBe('retry');
    expect(result.processedGroups).toBe(1);
    expect(result.lastOutboxId).toBe(1);
    expect(plasmaClient.post).toHaveBeenCalledTimes(2);

    const state = await getQuantumPollerState(config.consumerName);
    expect(Number(state.last_outbox_id)).toBe(1);

    const attempt = await getQuantumPollerAttempt(config.consumerName, 2);
    expect(attempt?.status).toBe('retry');
    expect(Number(attempt?.attempt_count)).toBe(1);

    const laterAttempt = await getQuantumPollerAttempt(config.consumerName, 3);
    expect(laterAttempt).toBeNull();
  });

  it('dead-letters malformed outbox payloads without advancing the checkpoint', async () => {
    const quantumConnection = {
      execute: vi.fn(async () => [[
        {
          id: 9,
          event_type: 'sales_order.updated',
          entity_type: 'device',
          entity_id: '351521280547019',
          payload_json: '{"legacy_order_id":',
          source_user: '12',
          created_at: '2026-04-20T10:00:00.000Z',
          idempotency_key: 'broken-9',
        },
      ]]),
    };
    const plasmaClient = {
      post: vi.fn(),
    };
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const config = {
      ...createQuantumPollerConfig(),
      consumerName: 'quantum_to_plasma_malformed_test',
    };

    const result = await runQuantumPollerOnce({
      quantumConnection: quantumConnection as any,
      plasmaClient: plasmaClient as any,
      logger,
      config,
      snapshotGeneratedAt: new Date('2026-04-20T12:00:00.000Z'),
    });

    expect(result.status).toBe('dead_letter');
    expect(result.lastOutboxId).toBe(0);
    expect(plasmaClient.post).not.toHaveBeenCalled();

    const state = await getQuantumPollerState(config.consumerName);
    expect(Number(state.last_outbox_id)).toBe(0);

    const attempt = await getQuantumPollerAttempt(config.consumerName, 9);
    expect(attempt?.status).toBe('dead_letter');
    expect(Number(attempt?.attempt_count)).toBe(1);
    expect(String(attempt?.last_error)).toContain('malformed payload_json');
  });
});
