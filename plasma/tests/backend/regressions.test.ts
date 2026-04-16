import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../server/src/app.js';
import { getAuthHeader } from './utils/auth';
import { seedCoreFixtures, seedInStockDevice } from './utils/fixtures';
import { getTestDbPool } from './utils/test-db';

describe('Regression protection', () => {
  let authHeader: string;

  beforeEach(async () => {
    await seedCoreFixtures();
    authHeader = getAuthHeader();
  });

  it('POST /api/purchase-orders succeeds with valid payload', async () => {
    const response = await request(app)
      .post('/api/purchase-orders')
      .set('Authorization', authHeader)
      .send({
        supplier_id: 1,
        supplier_ref: 'SUP-REF-001',
        notes: 'Regression test PO',
        status: 'DRAFT',
        lines: [
          {
            manufacturer_id: 1,
            model_id: 1,
            storage_gb: 128,
            color: 'Black',
            expected_quantity: 2,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.id).toBeTypeOf('number');
  });

  it('POST /api/sales-orders succeeds with valid payload', async () => {
    const response = await request(app)
      .post('/api/sales-orders')
      .set('Authorization', authHeader)
      .send({
        customer_id: 1,
        order_type: 'B2B',
        customer_ref: 'CUST-REF-001',
        po_ref: 'PO-REF-001',
        notes: 'Regression test SO',
        lines: [
          {
            supplier_id: 1,
            manufacturer_id: 1,
            model_id: 1,
            storage_gb: 128,
            color: 'Black',
            grade: 'A',
            requested_quantity: 1,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.id).toBeTypeOf('number');
  });

  it('classifies CST-78 Backmarket orders into the Backmarket list even when the customer flag is false', async () => {
    const pool = await getTestDbPool();

    await pool.query(
      `INSERT INTO customers (id, customer_code, name, is_backmarket, is_active)
       VALUES (2, 'CST-78', 'BackMarket Consumer', FALSE, TRUE)`,
    );

    const createResponse = await request(app)
      .post('/api/sales-orders')
      .set('Authorization', authHeader)
      .send({
        customer_id: 2,
        order_type: 'B2B',
        backmarket_order_id: 'BM-TEST-001',
        notes: 'Backmarket classification regression test',
      });

    expect(createResponse.status).toBe(201);

    const salesOrderId = createResponse.body.id;
    const [rows] = await pool.query(
      'SELECT order_type FROM sales_orders WHERE id = ?',
      [salesOrderId],
    );

    expect(rows[0].order_type).toBe('BACKMARKET');

    const backmarketResponse = await request(app)
      .get('/api/sales-orders?is_backmarket=true')
      .set('Authorization', authHeader);

    expect(backmarketResponse.status).toBe(200);
    expect(backmarketResponse.body.orders.some((order: { id: number }) => order.id === salesOrderId)).toBe(true);

    const goodsOutResponse = await request(app)
      .get('/api/sales-orders?is_backmarket=false')
      .set('Authorization', authHeader);

    expect(goodsOutResponse.status).toBe(200);
    expect(goodsOutResponse.body.orders.some((order: { id: number }) => order.id === salesOrderId)).toBe(false);
  });

  it('GET /api/sales-orders/:id/devices still returns reserved devices when legacy mapping tables are absent', async () => {
    const pool = await getTestDbPool();
    await seedInStockDevice({ imei: '999988887777666' });

    const createResponse = await request(app)
      .post('/api/sales-orders')
      .set('Authorization', authHeader)
      .send({
        customer_id: 1,
        order_type: 'B2B',
        notes: 'Legacy fallback regression test',
      });

    expect(createResponse.status).toBe(201);

    const salesOrderId = createResponse.body.id;
    const confirmResponse = await request(app)
      .post(`/api/sales-orders/${salesOrderId}/confirm`)
      .set('Authorization', authHeader);

    expect(confirmResponse.status).toBe(200);

    await pool.query(
      'UPDATE devices SET reserved_for_so_id = ? WHERE imei = ?',
      [salesOrderId, '999988887777666'],
    );

    const response = await request(app)
      .get(`/api/sales-orders/${salesOrderId}/devices`)
      .set('Authorization', authHeader);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.devices).toHaveLength(1);
    expect(response.body.devices[0].imei).toBe('999988887777666');
  });

  it('sales order status transitions stay gated after confirmation', async () => {
    const createResponse = await request(app)
      .post('/api/sales-orders')
      .set('Authorization', authHeader)
      .send({
        customer_id: 1,
        order_type: 'B2B',
        notes: 'Status gate regression test',
      });

    expect(createResponse.status).toBe(201);

    const salesOrderId = createResponse.body.id;

    const confirmResponse = await request(app)
      .post(`/api/sales-orders/${salesOrderId}/confirm`)
      .set('Authorization', authHeader);

    expect(confirmResponse.status).toBe(200);

    const updateResponse = await request(app)
      .patch(`/api/sales-orders/${salesOrderId}`)
      .set('Authorization', authHeader)
      .send({ notes: 'Should be rejected once confirmed' });

    expect(updateResponse.status).toBe(400);
    expect(updateResponse.body.error?.code).toBe('INVALID_STATUS');

    const reconfirmResponse = await request(app)
      .post(`/api/sales-orders/${salesOrderId}/confirm`)
      .set('Authorization', authHeader);

    expect(reconfirmResponse.status).toBe(400);
    expect(reconfirmResponse.body.error?.code).toBe('INVALID_STATUS');
  });

  it('GET /api/devices/:id enforces id validation', async () => {
    const response = await request(app)
      .get('/api/devices/not-an-id')
      .set('Authorization', authHeader);

    expect(response.status).toBe(400);
  });

  it('PATCH /api/devices grade validation rejects invalid grade', async () => {
    const response = await request(app)
      .patch('/api/devices/1')
      .set('Authorization', authHeader)
      .send({ grade: 'Z' });

    expect(response.status).toBe(400);
  });

  it('POST /api/customers validation rejects invalid email format', async () => {
    const response = await request(app)
      .post('/api/customers')
      .set('Authorization', authHeader)
      .send({
        name: 'Acme Phones',
        email: 'not-an-email',
      });

    expect(response.status).toBe(400);
  });
});
