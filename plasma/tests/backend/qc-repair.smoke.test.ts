import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../server/src/app.js';
import { getAuthHeader } from './utils/auth';
import { seedCoreFixtures } from './utils/fixtures';

describe('QC and Repair smoke tests', () => {
  let authHeader: string;

  beforeEach(async () => {
    await seedCoreFixtures();
    authHeader = getAuthHeader();
  });

  it('imports the server app cleanly', () => {
    expect(app).toBeDefined();
  });

  it('GET /api/qc/jobs returns empty job list', async () => {
    const response = await request(app).get('/api/qc/jobs').set('Authorization', authHeader);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.jobs).toEqual([]);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.total).toBe(0);
  });

  it('GET /api/repair/meta returns repair module metadata', async () => {
    const response = await request(app).get('/api/repair/meta').set('Authorization', authHeader);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body).toMatchObject({
      purchaseOrders: expect.any(Array),
      salesOrders: expect.any(Array),
      jobPriorities: expect.any(Array),
      recordStatuses: expect.any(Array),
    });
  });
});
