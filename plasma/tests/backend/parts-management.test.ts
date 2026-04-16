import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../server/src/app.js';
import { getAuthHeader } from './utils/auth';
import { seedCoreFixtures } from './utils/fixtures';
import { getTestDbPool } from './utils/test-db';

async function getServicePackCategoryId() {
  const pool = await getTestDbPool();
  const [rows] = await pool.query("SELECT id FROM part_categories WHERE name = 'Service Pack' LIMIT 1");
  return rows[0].id as number;
}

describe('Parts management module', () => {
  let authHeader: string;

  beforeEach(async () => {
    await seedCoreFixtures();
    authHeader = getAuthHeader();
  });

  it('lists model part entries and supports edit/delete flows for active mappings', async () => {
    const categoryId = await getServicePackCategoryId();

    const createBase = await request(app)
      .post('/api/parts/bases')
      .set('Authorization', authHeader)
      .send({
        base_code: 'SERVICEPACK-APPLE-A2890',
        name: 'iPhone 15 Pro service pack',
        category_id: categoryId,
        manufacturer_id: 1,
        changes_device_color: true,
      });

    expect(createBase.status).toBe(201);
    const baseId = createBase.body.baseId;

    const createVariant = await request(app)
      .post('/api/parts/variants')
      .set('Authorization', authHeader)
      .send({
        part_base_id: baseId,
        category_id: categoryId,
        sku: 'IP15PRO-SP-BLK',
        name: 'iPhone 15 Pro black service pack',
        color: 'Black',
      });

    expect(createVariant.status).toBe(201);
    const variantId = createVariant.body.variantId;

    const createCompatibility = await request(app)
      .post('/api/parts/compatibility')
      .set('Authorization', authHeader)
      .send({
        part_base_id: baseId,
        model_id: 1,
        notes: 'Initial rule',
      });

    expect(createCompatibility.status).toBe(201);
    const compatibilityId = createCompatibility.body.compatibilityId;

    const modelListResponse = await request(app)
      .get('/api/parts/models')
      .set('Authorization', authHeader)
      .query({ search: 'iPhone 15 Pro' });

    expect(modelListResponse.status).toBe(200);
    expect(modelListResponse.body.models).toHaveLength(1);
    expect(modelListResponse.body.models[0].part_entry_count).toBe(1);

    const modelDetailResponse = await request(app)
      .get('/api/parts/models/1')
      .set('Authorization', authHeader);

    expect(modelDetailResponse.status).toBe(200);
    expect(modelDetailResponse.body.compatibility).toHaveLength(1);
    expect(modelDetailResponse.body.variants).toHaveLength(1);

    const updateCompatibility = await request(app)
      .patch(`/api/parts/compatibility/${compatibilityId}`)
      .set('Authorization', authHeader)
      .send({
        part_base_id: baseId,
        model_id: 1,
        notes: 'Updated compatibility note',
      });

    expect(updateCompatibility.status).toBe(200);

    const updateVariant = await request(app)
      .patch(`/api/parts/variants/${variantId}`)
      .set('Authorization', authHeader)
      .send({
        part_base_id: baseId,
        category_id: categoryId,
        sku: 'IP15PRO-SP-WHT',
        name: 'iPhone 15 Pro white service pack',
        color: 'White',
      });

    expect(updateVariant.status).toBe(200);

    const deleteVariant = await request(app)
      .delete(`/api/parts/variants/${variantId}`)
      .set('Authorization', authHeader);

    expect(deleteVariant.status).toBe(200);

    const detailAfterVariantDelete = await request(app)
      .get('/api/parts/models/1')
      .set('Authorization', authHeader);

    expect(detailAfterVariantDelete.status).toBe(200);
    expect(detailAfterVariantDelete.body.variants).toHaveLength(0);

    const deleteBase = await request(app)
      .delete(`/api/parts/bases/${baseId}`)
      .set('Authorization', authHeader);

    expect(deleteBase.status).toBe(200);

    const detailAfterBaseDelete = await request(app)
      .get('/api/parts/models/1')
      .set('Authorization', authHeader);

    expect(detailAfterBaseDelete.status).toBe(200);
    expect(detailAfterBaseDelete.body.compatibility).toHaveLength(0);
  });
});
