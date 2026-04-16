import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../server/src/app.js';
import { getAuthHeader } from './utils/auth';
import { seedCoreFixtures } from './utils/fixtures';

describe('Order query validators', () => {
  let authHeader: string;

  beforeEach(async () => {
    await seedCoreFixtures();
    authHeader = getAuthHeader();
  });

  it('rejects invalid sales order page values', async () => {
    const response = await request(app)
      .get('/api/sales-orders?page=0')
      .set('Authorization', authHeader);

    expect(response.status).toBe(400);
    expect(response.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid sales order status filters', async () => {
    const response = await request(app)
      .get('/api/sales-orders?status=NOT_A_STATUS')
      .set('Authorization', authHeader);

    expect(response.status).toBe(400);
    expect(response.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('rejects purchase order limits above the allowed maximum', async () => {
    const response = await request(app)
      .get('/api/purchase-orders?limit=500')
      .set('Authorization', authHeader);

    expect(response.status).toBe(400);
    expect(response.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('rejects malformed purchase order date filters', async () => {
    const response = await request(app)
      .get('/api/purchase-orders?date_from=not-a-date')
      .set('Authorization', authHeader);

    expect(response.status).toBe(400);
    expect(response.body.error?.code).toBe('VALIDATION_ERROR');
  });
});
