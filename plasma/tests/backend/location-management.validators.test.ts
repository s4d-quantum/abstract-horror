import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../server/src/app.js';
import { getAuthHeader } from './utils/auth';
import { seedCoreFixtures, seedInStockDevice } from './utils/fixtures';

describe('Location Management validators', () => {
  let authHeader: string;

  beforeEach(async () => {
    await seedCoreFixtures();
    authHeader = getAuthHeader();
  });

  it('returns 400 when IMEI in route param is too short', async () => {
    const response = await request(app)
      .get('/api/admin/location-management/device/12345')
      .set('Authorization', authHeader);

    expect(response.status).toBe(400);
  });

  it('accepts a valid IMEI route param', async () => {
    await seedInStockDevice({ imei: '111122223333444' });

    const response = await request(app)
      .get('/api/admin/location-management/device/111122223333444')
      .set('Authorization', authHeader);

    expect([200, 404]).toContain(response.status);
  });

  it('returns 400 for bulk-move with empty devices array', async () => {
    const response = await request(app)
      .post('/api/admin/location-management/bulk-move')
      .set('Authorization', authHeader)
      .send({
        devices: [],
        new_location: 'TR002',
        reason: 'Cycle count correction',
      });

    expect(response.status).toBe(400);
  });

  it('returns 400 for bulk-move missing new_location', async () => {
    const response = await request(app)
      .post('/api/admin/location-management/bulk-move')
      .set('Authorization', authHeader)
      .send({
        devices: [{ imei: '111122223333444' }],
        reason: 'Cycle count correction',
      });

    expect(response.status).toBe(400);
  });

  it('returns 400 for bulk-move missing reason', async () => {
    const response = await request(app)
      .post('/api/admin/location-management/bulk-move')
      .set('Authorization', authHeader)
      .send({
        devices: [{ imei: '111122223333444' }],
        new_location: 'TR002',
      });

    expect(response.status).toBe(400);
  });

  it('returns 400 for wrong operation_date format', async () => {
    const response = await request(app)
      .post('/api/admin/location-management/bulk-move')
      .set('Authorization', authHeader)
      .send({
        devices: [{ imei: '111122223333444' }],
        new_location: 'TR002',
        reason: 'Cycle count correction',
        operation_date: '26/02/2026',
      });

    expect(response.status).toBe(400);
  });

  it('passes validation with correct operation_date format', async () => {
    await seedInStockDevice({ imei: '111122223333444' });

    const response = await request(app)
      .post('/api/admin/location-management/bulk-move')
      .set('Authorization', authHeader)
      .send({
        devices: [{ imei: '111122223333444' }],
        new_location: 'TR002',
        reason: 'Cycle count correction',
        operation_date: '2026-02-27',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('passes validation when optional operation_date is omitted', async () => {
    await seedInStockDevice({ imei: '555566667777888' });

    const response = await request(app)
      .post('/api/admin/location-management/bulk-move')
      .set('Authorization', authHeader)
      .send({
        devices: [{ imei: '555566667777888' }],
        new_location: 'TR002',
        reason: 'Cycle count correction',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('returns 400 when device IMEI length is invalid in bulk payload', async () => {
    const response = await request(app)
      .post('/api/admin/location-management/bulk-move')
      .set('Authorization', authHeader)
      .send({
        devices: [{ imei: '123' }],
        new_location: 'TR002',
        reason: 'Cycle count correction',
      });

    expect(response.status).toBe(400);
  });
});
