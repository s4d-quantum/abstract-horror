import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../server/src/app.js';
import { seedCoreFixtures } from './utils/fixtures';
import { getTestDbPool } from './utils/test-db';

function automationHeaders() {
  return {
    'x-plasma-robot-key': process.env.PLASMA_AUTOMATION_KEY || 'test-automation-key',
  };
}

async function seedLegacyModelMapping({
  legacyBrand = 'CAT1',
  legacyDetails = 'A2890',
  manufacturerId = 1,
  modelId = 1,
}: {
  legacyBrand?: string;
  legacyDetails?: string;
  manufacturerId?: number;
  modelId?: number;
} = {}) {
  const pool = await getTestDbPool();
  await pool.query(
    `INSERT INTO legacy_sales_brand_map (legacy_item_brand, manufacturer_id)
     VALUES (?, ?)`,
    [legacyBrand, manufacturerId],
  );
  await pool.query(
    `INSERT INTO legacy_sales_model_map (legacy_item_brand, legacy_item_details, manufacturer_id, model_id)
     VALUES (?, ?, ?, ?)`,
    [legacyBrand, legacyDetails, manufacturerId, modelId],
  );
}

function buildPurchasePayload(overrides: Record<string, any> = {}) {
  return {
    quantum_event_id: '1001',
    idempotency_key: 'purchase-sync-1001',
    source_event_type: 'goods_in.device_booked',
    source_created_at: '2026-04-17T10:00:00.000Z',
    source_user: '42',
    snapshot_generated_at: '2026-04-17T10:00:01.000Z',
    purchase: {
      purchase_date: '2026-04-17T10:00:00.000Z',
      po_ref: 'PO-LEGACY-42',
      requires_qc: true,
      requires_repair: false,
      supplier: {
        supplier_code: 'SUP-LEG-001',
        name: 'Legacy Supplier',
        country: 'United Kingdom',
      },
      devices: [
        {
          imei: '400000000000111',
          tray_id: 'TR001',
          item_brand: 'CAT1',
          item_details: 'A2890',
          item_gb: '128',
          item_color: 'Black',
          item_grade: '1',
        },
      ],
    },
    ...overrides,
  };
}

function buildSalesOrderPayload(overrides: Record<string, any> = {}) {
  return {
    quantum_event_id: '2001',
    idempotency_key: 'sales-order-sync-2001',
    source_event_type: 'sales_order.device_reserved',
    source_created_at: '2026-04-17T11:00:00.000Z',
    source_user: '99',
    snapshot_generated_at: '2026-04-17T11:00:01.000Z',
    sales_order: {
      order_date: '2026-04-17T11:00:00.000Z',
      customer_ref: 'CREF-42',
      po_ref: 'PO-OUT-42',
      devices_authoritative: true,
      customer: {
        customer_code: 'CST-LEG-001',
        name: 'Legacy Customer',
        is_backmarket: false,
      },
      devices: [
        {
          imei: '400000000000222',
          supplier_code: 'SUP-LEG-002',
          tray_id: 'TR001',
          item_brand: 'CAT1',
          item_details: 'A2890',
          item_gb: '128',
          item_color: 'Black',
          item_grade: '1',
          supplier: {
            supplier_code: 'SUP-LEG-002',
            name: 'Sales Supplier',
            country: 'United Kingdom',
          },
        },
      ],
    },
    ...overrides,
  };
}

function buildSalesOrderRequirementPayload(overrides: Record<string, any> = {}) {
  return {
    quantum_event_id: '2101',
    idempotency_key: 'sales-order-sync-2101',
    source_event_type: 'sales_order.updated',
    source_created_at: '2026-04-17T11:30:00.000Z',
    source_user: '99',
    snapshot_generated_at: '2026-04-17T11:30:01.000Z',
    sales_order: {
      order_date: '2026-04-17T11:30:00.000Z',
      customer_ref: 'REQ-CREF-42',
      po_ref: 'REQ-PO-42',
      devices_authoritative: false,
      customer: {
        customer_code: 'CST-LEG-001',
        name: 'Legacy Customer',
        is_backmarket: false,
      },
      lines: [
        {
          supplier_code: 'SUP-LEG-002',
          tray_id: 'TR001',
          item_brand: 'CAT1',
          item_details: 'A2890',
          item_gb: '128',
          item_color: 'Black',
          item_grade: '1',
          requested_quantity: 2,
          supplier: {
            supplier_code: 'SUP-LEG-002',
            name: 'Sales Supplier',
            country: 'United Kingdom',
          },
        },
      ],
      devices: [],
    },
    ...overrides,
  };
}

function buildQcPayload(overrides: Record<string, any> = {}) {
  return {
    quantum_event_id: '3001',
    idempotency_key: 'qc-sync-3001',
    source_event_type: 'qc.updated',
    source_created_at: '2026-04-17T12:00:00.000Z',
    source_user: '13',
    snapshot_generated_at: '2026-04-17T12:00:01.000Z',
    purchase: {
      devices: [
        {
          imei: '400000000000333',
          item_grade: '1',
          item_color: 'Black',
          item_comments: 'Looks good',
          item_functional_passed: 1,
          item_cosmetic_passed: 1,
          item_eu: 'EU-UK',
        },
      ],
    },
    ...overrides,
  };
}

describe('Automation sync routes', () => {
  beforeEach(async () => {
    await seedCoreFixtures();
    await seedLegacyModelMapping();
  });

  it('rejects automation requests without the robot key and accepts them without JWT when the key is present', async () => {
    const unauthorized = await request(app)
      .post('/api/automation/purchases/9001/sync')
      .send(buildPurchasePayload());

    expect(unauthorized.status).toBe(401);
    expect(unauthorized.body.error.code).toBe('AUTOMATION_UNAUTHORIZED');

    const authorized = await request(app)
      .post('/api/automation/purchases/9001/sync')
      .set(automationHeaders())
      .send(buildPurchasePayload());

    expect(authorized.status).toBe(200);
    expect(authorized.body.sync.duplicate).toBe(false);

    const pool = await getTestDbPool();
    const [[robotUser]]: any = await pool.query(
      `SELECT id, username, role
       FROM users
       WHERE username = 'automation_robot'`,
    );
    expect(robotUser.username).toBe('automation_robot');
    expect(robotUser.role).toBe('ADMIN');

    const [[purchaseOrder]]: any = await pool.query(
      `SELECT po_number, created_by
       FROM purchase_orders
       WHERE po_number = 'LEG-9001'`,
    );
    expect(purchaseOrder.created_by).toBe(robotUser.id);
  });

  it('creates a legacy-backed purchase order, auto-creates a supplier, creates a QC job, and deduplicates replays', async () => {
    const payload = buildPurchasePayload({
      quantum_event_id: '1002',
      idempotency_key: 'purchase-sync-1002',
    });

    const first = await request(app)
      .post('/api/automation/purchases/9002/sync')
      .set(automationHeaders())
      .send(payload);

    expect(first.status).toBe(200);
    expect(first.body.sync.result.poNumber).toBe('LEG-9002');

    const second = await request(app)
      .post('/api/automation/purchases/9002/sync')
      .set(automationHeaders())
      .send(payload);

    expect(second.status).toBe(200);
    expect(second.body.sync.duplicate).toBe(true);

    const pool = await getTestDbPool();
    const [[supplier]]: any = await pool.query(
      `SELECT supplier_code, name
       FROM suppliers
       WHERE supplier_code = 'SUP-LEG-001'`,
    );
    expect(supplier.name).toBe('Legacy Supplier');

    const [[purchaseOrder]]: any = await pool.query(
      `SELECT id, po_number, status
       FROM purchase_orders
       WHERE po_number = 'LEG-9002'`,
    );
    expect(purchaseOrder.status).toBe('FULLY_RECEIVED');

    const [[mapping]]: any = await pool.query(
      `SELECT legacy_purchase_id, purchase_order_id
       FROM legacy_purchase_order_map
       WHERE legacy_purchase_id = 9002`,
    );
    expect(mapping.purchase_order_id).toBe(purchaseOrder.id);

    const [[device]]: any = await pool.query(
      `SELECT imei, status, purchase_order_id
       FROM devices
       WHERE imei = '400000000000111'`,
    );
    expect(device.status).toBe('AWAITING_QC');
    expect(device.purchase_order_id).toBe(purchaseOrder.id);

    const [[qcJob]]: any = await pool.query(
      `SELECT purchase_order_id
       FROM qc_jobs
       WHERE purchase_order_id = ?`,
      [purchaseOrder.id],
    );
    expect(qcJob.purchase_order_id).toBe(purchaseOrder.id);

    const [[appliedCount]]: any = await pool.query(
      `SELECT COUNT(*) AS total
       FROM applied_quantum_events
       WHERE quantum_event_id = 1002`,
    );
    expect(appliedCount.total).toBe(1);
  });

  it('fails cleanly when a purchase device cannot be mapped to a Plasma model', async () => {
    const response = await request(app)
      .post('/api/automation/purchases/9003/sync')
      .set(automationHeaders())
      .send(buildPurchasePayload({
        quantum_event_id: '1003',
        idempotency_key: 'purchase-sync-1003',
        purchase: {
          ...buildPurchasePayload().purchase,
          devices: [
            {
              imei: '400000000000112',
              tray_id: 'TR001',
              item_brand: 'CAT9',
              item_details: 'UNKNOWN-MODEL',
              item_gb: '128',
              item_color: 'Black',
              item_grade: '1',
            },
          ],
        },
      }));

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('AUTOMATION_BRAND_MAPPING_NOT_FOUND');

    const pool = await getTestDbPool();
    const [[purchaseCount]]: any = await pool.query(
      `SELECT COUNT(*) AS total FROM purchase_orders WHERE po_number = 'LEG-9003'`,
    );
    const [[eventCount]]: any = await pool.query(
      `SELECT COUNT(*) AS total FROM applied_quantum_events WHERE quantum_event_id = 1003`,
    );

    expect(purchaseCount.total).toBe(0);
    expect(eventCount.total).toBe(0);
  });

  it('resolves models from legacy_brand_map plus Plasma model_number when no exact legacy model row exists', async () => {
    const pool = await getTestDbPool();

    await pool.query(`DELETE FROM legacy_sales_model_map WHERE legacy_item_brand = 'CAT3'`);
    await pool.query(`DELETE FROM legacy_sales_brand_map WHERE legacy_item_brand = 'CAT3'`);

    await pool.query(
      `INSERT INTO manufacturers (id, code, name)
       VALUES (2, 'SAMSUNG', 'Samsung')`,
    );
    await pool.query(
      `INSERT INTO models (id, manufacturer_id, model_number, model_name)
       VALUES (2, 2, 'SM-S908B/DS', 'Galaxy S22 Ultra')`,
    );
    await pool.query(
      `INSERT INTO legacy_brand_map (legacy_item_brand, manufacturer_name)
       VALUES ('CAT3', 'Samsung')`,
    );

    const response = await request(app)
      .post('/api/automation/purchases/9004/sync')
      .set(automationHeaders())
      .send(buildPurchasePayload({
        quantum_event_id: '1004',
        idempotency_key: 'purchase-sync-1004',
        purchase: {
          ...buildPurchasePayload().purchase,
          devices: [
            {
              imei: '400000000000113',
              tray_id: 'TR001',
              item_brand: 'CAT3',
              item_details: 'S908B/DS',
              item_gb: '512',
              item_color: 'Phantom Black',
              item_grade: '1',
            },
          ],
        },
      }));

    expect(response.status).toBe(200);

    const [[device]]: any = await pool.query(
      `SELECT manufacturer_id, model_id
       FROM devices
       WHERE imei = '400000000000113'`,
    );
    expect(device.manufacturer_id).toBe(2);
    expect(device.model_id).toBe(2);
  });

  it('creates and updates a legacy-backed sales order with exact reservations and auto-creates the customer', async () => {
    await request(app)
      .post('/api/automation/purchases/9010/sync')
      .set(automationHeaders())
      .send(buildPurchasePayload({
        quantum_event_id: '1010',
        idempotency_key: 'purchase-sync-1010',
        purchase: {
          ...buildPurchasePayload().purchase,
          requires_qc: false,
          supplier: {
            supplier_code: 'SUP-LEG-002',
            name: 'Sales Supplier',
            country: 'United Kingdom',
          },
          devices: [
            {
              imei: '400000000000222',
              tray_id: 'TR001',
              item_brand: 'CAT1',
              item_details: 'A2890',
              item_gb: '128',
              item_color: 'Black',
              item_grade: '1',
            },
          ],
        },
      }));

    const createResponse = await request(app)
      .post('/api/automation/sales-orders/9101/sync')
      .set(automationHeaders())
      .send(buildSalesOrderPayload());

    expect(createResponse.status).toBe(200);
    expect(createResponse.body.sync.result.soNumber).toBe('LEG-SO-9101');

    const updateResponse = await request(app)
      .post('/api/automation/sales-orders/9101/sync')
      .set(automationHeaders())
      .send(buildSalesOrderPayload({
        quantum_event_id: '2002',
        idempotency_key: 'sales-order-sync-2002',
        source_event_type: 'sales_order.updated',
        sales_order: {
          ...buildSalesOrderPayload().sales_order,
          customer_ref: 'UPDATED-CREF',
        },
      }));

    expect(updateResponse.status).toBe(200);

    const pool = await getTestDbPool();
    const [[customer]]: any = await pool.query(
      `SELECT customer_code, name
       FROM customers
       WHERE customer_code = 'CST-LEG-001'`,
    );
    expect(customer.name).toBe('Legacy Customer');

    const [[salesOrder]]: any = await pool.query(
      `SELECT id, so_number, status, customer_ref
       FROM sales_orders
       WHERE so_number = 'LEG-SO-9101'`,
    );
    expect(salesOrder.status).toBe('CONFIRMED');
    expect(salesOrder.customer_ref).toBe('UPDATED-CREF');

    const [[line]]: any = await pool.query(
      `SELECT requested_quantity
       FROM sales_order_lines
       WHERE sales_order_id = ?`,
      [salesOrder.id],
    );
    expect(line.requested_quantity).toBe(1);

    const [[device]]: any = await pool.query(
      `SELECT reserved_for_so_id
       FROM devices
       WHERE imei = '400000000000222'`,
    );
    expect(device.reserved_for_so_id).toBe(salesOrder.id);

    const [[legacyMap]]: any = await pool.query(
      `SELECT legacy_sales_order_id
       FROM legacy_device_reserved_sales_order_map
       WHERE device_id = (
         SELECT id FROM devices WHERE imei = '400000000000222'
       )`,
    );
    expect(legacyMap.legacy_sales_order_id).toBe(9101);
  });

  it('syncs requirement-only sales orders without reserving devices and clears stale reservations for that legacy order', async () => {
    await request(app)
      .post('/api/automation/purchases/9011/sync')
      .set(automationHeaders())
      .send(buildPurchasePayload({
        quantum_event_id: '1011',
        idempotency_key: 'purchase-sync-1011',
        purchase: {
          ...buildPurchasePayload().purchase,
          requires_qc: false,
          supplier: {
            supplier_code: 'SUP-LEG-002',
            name: 'Sales Supplier',
            country: 'United Kingdom',
          },
          devices: [
            {
              imei: '400000000000223',
              tray_id: 'TR001',
              item_brand: 'CAT1',
              item_details: 'A2890',
              item_gb: '128',
              item_color: 'Black',
              item_grade: '1',
            },
          ],
        },
      }));

    const initialAuthoritative = await request(app)
      .post('/api/automation/sales-orders/9103/sync')
      .set(automationHeaders())
      .send(buildSalesOrderPayload({
        quantum_event_id: '2004',
        idempotency_key: 'sales-order-sync-2004',
        sales_order: {
          ...buildSalesOrderPayload().sales_order,
          devices: [
            {
              imei: '400000000000223',
              supplier_code: 'SUP-LEG-002',
              tray_id: 'TR001',
              item_brand: 'CAT1',
              item_details: 'A2890',
              item_gb: '128',
              item_color: 'Black',
              item_grade: '1',
              supplier: {
                supplier_code: 'SUP-LEG-002',
                name: 'Sales Supplier',
                country: 'United Kingdom',
              },
            },
          ],
        },
      }));

    expect(initialAuthoritative.status).toBe(200);
    expect(initialAuthoritative.body.sync.result.devicesAuthoritative).toBe(true);

    const requirementSync = await request(app)
      .post('/api/automation/sales-orders/9103/sync')
      .set(automationHeaders())
      .send(buildSalesOrderRequirementPayload({
        quantum_event_id: '2102',
        idempotency_key: 'sales-order-sync-2102',
      }));

    expect(requirementSync.status).toBe(200);
    expect(requirementSync.body.sync.result.devicesAuthoritative).toBe(false);
    expect(requirementSync.body.sync.result.reservedDeviceCount).toBe(0);

    const pool = await getTestDbPool();
    const [[salesOrder]]: any = await pool.query(
      `SELECT id, customer_ref
       FROM sales_orders
       WHERE so_number = 'LEG-SO-9103'`,
    );
    expect(salesOrder.customer_ref).toBe('REQ-CREF-42');

    const [[line]]: any = await pool.query(
      `SELECT requested_quantity
       FROM sales_order_lines
       WHERE sales_order_id = ?`,
      [salesOrder.id],
    );
    expect(line.requested_quantity).toBe(2);

    const [[device]]: any = await pool.query(
      `SELECT reserved_for_so_id
       FROM devices
       WHERE imei = '400000000000223'`,
    );
    expect(device.reserved_for_so_id).toBeNull();

    const [[legacyMapCount]]: any = await pool.query(
      `SELECT COUNT(*) AS total
       FROM legacy_device_reserved_sales_order_map
       WHERE legacy_sales_order_id = 9103`,
    );
    expect(legacyMapCount.total).toBe(0);
  });

  it('rolls back a sales-order sync when a reserved device is missing from Plasma', async () => {
    const response = await request(app)
      .post('/api/automation/sales-orders/9102/sync')
      .set(automationHeaders())
      .send(buildSalesOrderPayload({
        quantum_event_id: '2003',
        idempotency_key: 'sales-order-sync-2003',
        sales_order: {
          ...buildSalesOrderPayload().sales_order,
          devices_authoritative: true,
          devices: [
            {
              imei: '499999999999999',
              supplier_code: 'SUP-LEG-002',
              tray_id: 'TR001',
              item_brand: 'CAT1',
              item_details: 'A2890',
              item_gb: '128',
              item_color: 'Black',
              item_grade: '1',
              supplier: {
                supplier_code: 'SUP-LEG-002',
                name: 'Sales Supplier',
                country: 'United Kingdom',
              },
            },
          ],
        },
      }));

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('AUTOMATION_RESERVED_DEVICE_NOT_FOUND');

    const pool = await getTestDbPool();
    const [[salesOrderCount]]: any = await pool.query(
      `SELECT COUNT(*) AS total FROM sales_orders WHERE so_number = 'LEG-SO-9102'`,
    );
    expect(salesOrderCount.total).toBe(0);
  });

  it('updates QC results on partial syncs and completes the QC job on terminal snapshots', async () => {
    await request(app)
      .post('/api/automation/purchases/9201/sync')
      .set(automationHeaders())
      .send(buildPurchasePayload({
        quantum_event_id: '1020',
        idempotency_key: 'purchase-sync-1020',
        purchase: {
          ...buildPurchasePayload().purchase,
          devices: [
            {
              imei: '400000000000333',
              tray_id: 'TR001',
              item_brand: 'CAT1',
              item_details: 'A2890',
              item_gb: '128',
              item_color: 'Black',
              item_grade: '1',
            },
          ],
        },
      }));

    const partial = await request(app)
      .post('/api/automation/qc/purchases/9201/sync')
      .set(automationHeaders())
      .send(buildQcPayload());

    expect(partial.status).toBe(200);
    expect(partial.body.sync.result.completed).toBe(false);

    const completed = await request(app)
      .post('/api/automation/qc/purchases/9201/sync')
      .set(automationHeaders())
      .send(buildQcPayload({
        quantum_event_id: '3002',
        idempotency_key: 'qc-sync-3002',
        source_event_type: 'qc.device_passed',
      }));

    expect(completed.status).toBe(200);
    expect(completed.body.sync.result.completed).toBe(true);

    const pool = await getTestDbPool();
    const [[qcJob]]: any = await pool.query(
      `SELECT status
       FROM qc_jobs
       WHERE purchase_order_id = (
         SELECT purchase_order_id FROM devices WHERE imei = '400000000000333'
       )`,
    );
    expect(qcJob.status).toBe('COMPLETED');

    const [[device]]: any = await pool.query(
      `SELECT status, qc_completed, grade, color
       FROM devices
       WHERE imei = '400000000000333'`,
    );
    expect(device.status).toBe('IN_STOCK');
    expect(device.qc_completed).toBe(1);
    expect(device.grade).toBe('A');
    expect(device.color).toBe('Black');
  });

  it('queues repair after QC completion when the purchase requires repair', async () => {
    await request(app)
      .post('/api/automation/purchases/9202/sync')
      .set(automationHeaders())
      .send(buildPurchasePayload({
        quantum_event_id: '1021',
        idempotency_key: 'purchase-sync-1021',
        purchase: {
          ...buildPurchasePayload().purchase,
          requires_qc: true,
          requires_repair: true,
          devices: [
            {
              imei: '400000000000334',
              tray_id: 'TR001',
              item_brand: 'CAT1',
              item_details: 'A2890',
              item_gb: '128',
              item_color: 'Black',
              item_grade: '1',
            },
          ],
        },
      }));

    const completed = await request(app)
      .post('/api/automation/qc/purchases/9202/sync')
      .set(automationHeaders())
      .send(buildQcPayload({
        quantum_event_id: '3003',
        idempotency_key: 'qc-sync-3003',
        source_event_type: 'qc.device_passed',
        purchase: {
          devices: [
            {
              imei: '400000000000334',
              item_grade: '1',
              item_color: 'Black',
              item_comments: 'Repair queue',
              item_functional_passed: 1,
              item_cosmetic_passed: 1,
              item_eu: 'EU-UK',
            },
          ],
        },
      }));

    expect(completed.status).toBe(200);

    const pool = await getTestDbPool();
    const [[device]]: any = await pool.query(
      `SELECT status
       FROM devices
       WHERE imei = '400000000000334'`,
    );
    expect(device.status).toBe('AWAITING_REPAIR');

    const [[repairJob]]: any = await pool.query(
      `SELECT COUNT(*) AS total
       FROM repair_jobs`,
    );
    expect(repairJob.total).toBe(1);
  });

  it('moves stock through the automation route and rejects invalid/no-op moves', async () => {
    await request(app)
      .post('/api/automation/purchases/9301/sync')
      .set(automationHeaders())
      .send(buildPurchasePayload({
        quantum_event_id: '1030',
        idempotency_key: 'purchase-sync-1030',
        purchase: {
          ...buildPurchasePayload().purchase,
          requires_qc: false,
          devices: [
            {
              imei: '400000000000444',
              tray_id: 'TR001',
              item_brand: 'CAT1',
              item_details: 'A2890',
              item_gb: '128',
              item_color: 'Black',
              item_grade: '1',
            },
          ],
        },
      }));

    const moved = await request(app)
      .post('/api/automation/devices/400000000000444/move')
      .set(automationHeaders())
      .send({
        quantum_event_id: '4001',
        idempotency_key: 'move-sync-4001',
        source_event_type: 'stock.device_moved',
        source_created_at: '2026-04-17T13:00:00.000Z',
        source_user: '11',
        snapshot_generated_at: '2026-04-17T13:00:01.000Z',
        new_location: 'TR002',
        old_location: 'TR001',
        reason: 'Cycle count correction',
        operation_date: '2026-04-17',
        admin_op_id: '55',
      });

    expect(moved.status).toBe(200);
    expect(moved.body.sync.result.newLocation).toBe('TR002');

    const sameLocation = await request(app)
      .post('/api/automation/devices/400000000000444/move')
      .set(automationHeaders())
      .send({
        quantum_event_id: '4002',
        idempotency_key: 'move-sync-4002',
        source_event_type: 'stock.device_moved',
        source_created_at: '2026-04-17T13:05:00.000Z',
        source_user: '11',
        snapshot_generated_at: '2026-04-17T13:05:01.000Z',
        new_location: 'TR002',
        old_location: 'TR002',
        reason: 'No-op move',
        operation_date: '2026-04-17',
      });

    expect(sameLocation.status).toBe(409);
    expect(sameLocation.body.error.code).toBe('MOVE_ALREADY_IN_LOCATION');

    const badLocation = await request(app)
      .post('/api/automation/devices/400000000000444/move')
      .set(automationHeaders())
      .send({
        quantum_event_id: '4003',
        idempotency_key: 'move-sync-4003',
        source_event_type: 'stock.device_moved',
        source_created_at: '2026-04-17T13:10:00.000Z',
        source_user: '11',
        snapshot_generated_at: '2026-04-17T13:10:01.000Z',
        new_location: 'UNKNOWN',
        old_location: 'TR002',
        reason: 'Bad move',
        operation_date: '2026-04-17',
      });

    expect(badLocation.status).toBe(400);
    expect(badLocation.body.error.code).toBe('MOVE_LOCATION_NOT_FOUND');

    const pool = await getTestDbPool();
    const [[device]]: any = await pool.query(
      `SELECT location_id
       FROM devices
       WHERE imei = '400000000000444'`,
    );
    expect(device.location_id).toBe(2);

    const [[historyCount]]: any = await pool.query(
      `SELECT COUNT(*) AS total
       FROM device_history
       WHERE imei = '400000000000444'
         AND event_type = 'LOCATION_CHANGE'`,
    );
    expect(historyCount.total).toBe(1);
  });
});
