import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../server/src/app.js';
import { getAuthHeader } from './utils/auth';
import { seedCoreFixtures } from './utils/fixtures';
import { getTestDbPool } from './utils/test-db';

// ─── Test helpers ─────────────────────────────────────────────────────────────

async function createPurchaseOrder({
  supplierId = 1,
  createdBy = 1,
  requiresQc = true,
  requiresRepair = false,
}: {
  supplierId?: number;
  createdBy?: number;
  requiresQc?: boolean;
  requiresRepair?: boolean;
} = {}) {
  const pool = await getTestDbPool();
  const result: any = (await pool.query(
    `INSERT INTO purchase_orders (
      po_number, supplier_id, status,
      expected_quantity, received_quantity,
      requires_qc, requires_repair, created_by, confirmed_at
    ) VALUES (?, ?, 'FULLY_RECEIVED', 0, 0, ?, ?, ?, NOW())`,
    [`PO-QC-${Date.now()}`, supplierId, requiresQc, requiresRepair, createdBy],
  ))[0] as any;
  return result['insertId'] as number;
}

async function createDevice({
  imei,
  purchaseOrderId,
  supplierId = 1,
  locationId = 1,
  status = 'AWAITING_QC',
  qcRequired = true,
}: {
  imei: string;
  purchaseOrderId: number;
  supplierId?: number;
  locationId?: number;
  status?: string;
  qcRequired?: boolean;
}) {
  const pool = await getTestDbPool();
  const result: any = (await pool.query(
    `INSERT INTO devices (
      imei, tac_code, manufacturer_id, model_id,
      storage_gb, color, grade, status,
      location_id, purchase_order_id, supplier_id,
      qc_required, repair_required, received_at
    ) VALUES (?, ?, 1, 1, 128, 'Black', 'A', ?, ?, ?, ?, ?, FALSE, NOW())`,
    [imei, imei.slice(0, 8), status, locationId, purchaseOrderId, supplierId, qcRequired],
  ))[0] as any;
  return result['insertId'] as number;
}

async function createQcJobForPo(purchaseOrderId: number, deviceIds: number[]) {
  // Directly insert the QC job and result rows (mirrors createAutoJobForDevices)
  const pool = await getTestDbPool();
  const jobResult: any = (await pool.query(
    `INSERT INTO qc_jobs (job_number, purchase_order_id, status, total_devices, created_by)
     VALUES (?, ?, 'PENDING', ?, 1)`,
    [`QC-T-${Date.now()}`, purchaseOrderId, deviceIds.length],
  ))[0] as any;
  const jobId = jobResult['insertId'] as number;

  for (const deviceId of deviceIds) {
    await pool.query(
      `INSERT INTO qc_results (qc_job_id, device_id) VALUES (?, ?)`,
      [jobId, deviceId],
    );
  }
  return jobId;
}

async function seedUser({
  id,
  username,
  displayName,
  role,
}: {
  id: number;
  username: string;
  displayName: string;
  role: string;
}) {
  const pool = await getTestDbPool();
  await pool.query(
    `INSERT INTO users (id, username, display_name, password_hash, role, is_active)
     VALUES (?, ?, ?, 'test-password-hash', ?, TRUE)`,
    [id, username, displayName, role],
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('QC module workflow', () => {
  let authHeader: string;

  beforeEach(async () => {
    await seedCoreFixtures();
    authHeader = getAuthHeader();
  });

  // ── Book-in integration ──────────────────────────────────────────────────

  it('book-in with requires_qc=true auto-creates a QC job and sets device to AWAITING_QC', async () => {
    const response = await request(app)
      .post('/api/purchase-orders/book-in')
      .set('Authorization', authHeader)
      .send({
        supplier_id: 1,
        requires_qc: true,
        requires_repair: false,
        devices: [{
          imei: '400000000000001',
          manufacturer_id: 1,
          model_id: 1,
          storage_gb: 128,
          color: 'Black',
          grade: 'A',
          location_id: 1,
        }],
      });

    expect(response.status).toBe(201);

    // QC job should exist
    const qcJobs = await request(app)
      .get('/api/qc/jobs')
      .set('Authorization', authHeader);

    expect(qcJobs.status).toBe(200);
    expect(qcJobs.body.jobs).toHaveLength(1);
    expect(qcJobs.body.jobs[0].po_number).toBe(response.body.result.po_number);

    // Repair job should NOT exist
    const repairJobs = await request(app)
      .get('/api/repair/jobs')
      .set('Authorization', authHeader);

    expect(repairJobs.body.jobs).toHaveLength(0);
  });

  it('book-in with both requires_qc=true AND requires_repair=true creates QC job only, device is AWAITING_QC', async () => {
    const response = await request(app)
      .post('/api/purchase-orders/book-in')
      .set('Authorization', authHeader)
      .send({
        supplier_id: 1,
        requires_qc: true,
        requires_repair: true,
        devices: [{
          imei: '400000000000002',
          manufacturer_id: 1,
          model_id: 1,
          storage_gb: 128,
          color: 'Black',
          grade: 'A',
          location_id: 1,
        }],
      });

    expect(response.status).toBe(201);

    // QC job created, NOT repair job
    const qcJobs = await request(app)
      .get('/api/qc/jobs')
      .set('Authorization', authHeader);
    expect(qcJobs.body.jobs).toHaveLength(1);

    const repairJobs = await request(app)
      .get('/api/repair/jobs')
      .set('Authorization', authHeader);
    expect(repairJobs.body.jobs).toHaveLength(0);

    // Device must be AWAITING_QC (not AWAITING_REPAIR)
    const pool = await getTestDbPool();
    const [devices] = await pool.query(
      `SELECT status FROM devices WHERE imei = '400000000000002'`,
    );
    expect(devices[0].status).toBe('AWAITING_QC');
  });

  it('book-in with requires_qc=false and requires_repair=true creates repair job, device is AWAITING_REPAIR', async () => {
    const response = await request(app)
      .post('/api/purchase-orders/book-in')
      .set('Authorization', authHeader)
      .send({
        supplier_id: 1,
        requires_qc: false,
        requires_repair: true,
        devices: [{
          imei: '400000000000003',
          manufacturer_id: 1,
          model_id: 1,
          storage_gb: 128,
          color: 'Black',
          grade: 'A',
          location_id: 1,
        }],
      });

    expect(response.status).toBe(201);

    const qcJobs = await request(app).get('/api/qc/jobs').set('Authorization', authHeader);
    expect(qcJobs.body.jobs).toHaveLength(0);

    const repairJobs = await request(app).get('/api/repair/jobs').set('Authorization', authHeader);
    expect(repairJobs.body.jobs).toHaveLength(1);

    const pool = await getTestDbPool();
    const [devices] = await pool.query(
      `SELECT status FROM devices WHERE imei = '400000000000003'`,
    );
    expect(devices[0].status).toBe('AWAITING_REPAIR');
  });

  // ── Save results ─────────────────────────────────────────────────────────

  it('saving results promotes the job from PENDING to IN_PROGRESS', async () => {
    const purchaseOrderId = await createPurchaseOrder();
    const deviceId = await createDevice({ imei: '500000000000001', purchaseOrderId });
    const jobId = await createQcJobForPo(purchaseOrderId, [deviceId]);

    const save = await request(app)
      .post(`/api/qc/jobs/${jobId}/results`)
      .set('Authorization', authHeader)
      .send({
        results: [{ device_id: deviceId, functional_result: 'PASS', cosmetic_result: 'PASS', grade_assigned: 'A' }],
      });

    expect(save.status).toBe(200);

    const jobDetail = await request(app)
      .get(`/api/qc/jobs/${jobId}`)
      .set('Authorization', authHeader);

    expect(jobDetail.body.job.status).toBe('IN_PROGRESS');
  });

  it('manual QC job creation is blocked when no devices are awaiting QC', async () => {
    const purchaseOrderId = await createPurchaseOrder();

    const response = await request(app)
      .post('/api/qc/jobs')
      .set('Authorization', authHeader)
      .send({ purchase_order_id: purchaseOrderId });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('NO_QC_ELIGIBLE_DEVICES');
  });

  it('manual QC job creation rejects duplicate open jobs for the same devices', async () => {
    const purchaseOrderId = await createPurchaseOrder();
    await createDevice({ imei: '500000000000010', purchaseOrderId });

    const firstCreate = await request(app)
      .post('/api/qc/jobs')
      .set('Authorization', authHeader)
      .send({ purchase_order_id: purchaseOrderId });

    expect(firstCreate.status).toBe(201);

    const secondCreate = await request(app)
      .post('/api/qc/jobs')
      .set('Authorization', authHeader)
      .send({ purchase_order_id: purchaseOrderId });

    expect(secondCreate.status).toBe(409);
    expect(secondCreate.body.error.code).toBe('QC_JOB_ALREADY_EXISTS');
  });

  it('saving results rejects devices that are not part of the QC job', async () => {
    const purchaseOrderOneId = await createPurchaseOrder();
    const purchaseOrderTwoId = await createPurchaseOrder();
    const jobDeviceId = await createDevice({ imei: '500000000000011', purchaseOrderId: purchaseOrderOneId });
    const foreignDeviceId = await createDevice({ imei: '500000000000012', purchaseOrderId: purchaseOrderTwoId });
    const jobId = await createQcJobForPo(purchaseOrderOneId, [jobDeviceId]);

    const response = await request(app)
      .post(`/api/qc/jobs/${jobId}/results`)
      .set('Authorization', authHeader)
      .send({
        results: [
          { device_id: foreignDeviceId, functional_result: 'PASS', cosmetic_result: 'PASS' },
        ],
      });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('DEVICE_NOT_IN_QC_JOB');
  });

  it('PATCH /api/qc/jobs/:id does not allow direct completion status changes', async () => {
    const purchaseOrderId = await createPurchaseOrder();
    const deviceId = await createDevice({ imei: '500000000000013', purchaseOrderId });
    const jobId = await createQcJobForPo(purchaseOrderId, [deviceId]);

    const response = await request(app)
      .patch(`/api/qc/jobs/${jobId}`)
      .set('Authorization', authHeader)
      .send({ status: 'COMPLETED' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('completing with a missing functional_result returns 422', async () => {
    const purchaseOrderId = await createPurchaseOrder();
    const deviceId = await createDevice({ imei: '500000000000002', purchaseOrderId });
    const jobId = await createQcJobForPo(purchaseOrderId, [deviceId]);

    const complete = await request(app)
      .post(`/api/qc/jobs/${jobId}/complete`)
      .set('Authorization', authHeader);

    expect(complete.status).toBe(422);
    expect(complete.body.error.code).toBe('INCOMPLETE_RESULTS');
  });

  // ── Complete job — no repair required ─────────────────────────────────

  it('completing a job with all PASS devices (no repair) sets devices to IN_STOCK', async () => {
    const purchaseOrderId = await createPurchaseOrder({ requiresQc: true, requiresRepair: false });
    const d1 = await createDevice({ imei: '600000000000001', purchaseOrderId });
    const d2 = await createDevice({ imei: '600000000000002', purchaseOrderId });
    const jobId = await createQcJobForPo(purchaseOrderId, [d1, d2]);

    await request(app)
      .post(`/api/qc/jobs/${jobId}/results`)
      .set('Authorization', authHeader)
      .send({
        results: [
          { device_id: d1, functional_result: 'PASS', cosmetic_result: 'PASS', grade_assigned: 'A' },
          { device_id: d2, functional_result: 'PASS', cosmetic_result: 'PASS', grade_assigned: 'B' },
        ],
      });

    const complete = await request(app)
      .post(`/api/qc/jobs/${jobId}/complete`)
      .set('Authorization', authHeader);

    expect(complete.status).toBe(200);

    const pool = await getTestDbPool();
    const [devices] = await pool.query(
      `SELECT imei, status, qc_completed FROM devices WHERE id IN (?, ?)`,
      [d1, d2],
    );
    for (const d of devices as any[]) {
      expect(d.status).toBe('IN_STOCK');
      expect(d.qc_completed).toBe(1);
    }

    const jobDetail = await request(app)
      .get(`/api/qc/jobs/${jobId}`)
      .set('Authorization', authHeader);
    expect(jobDetail.body.job.status).toBe('COMPLETED');
  });

  // ── Complete job — repair required after QC ───────────────────────────

  it('completing a job with PO.requires_repair=true queues PASS/UNABLE/NA devices for repair and creates repair job', async () => {
    const purchaseOrderId = await createPurchaseOrder({ requiresQc: true, requiresRepair: true });
    const dPass = await createDevice({ imei: '700000000000001', purchaseOrderId });
    const dUnable = await createDevice({ imei: '700000000000002', purchaseOrderId });
    const dFail = await createDevice({ imei: '700000000000003', purchaseOrderId });
    const jobId = await createQcJobForPo(purchaseOrderId, [dPass, dUnable, dFail]);

    await request(app)
      .post(`/api/qc/jobs/${jobId}/results`)
      .set('Authorization', authHeader)
      .send({
        results: [
          { device_id: dPass, functional_result: 'PASS', cosmetic_result: 'PASS' },
          { device_id: dUnable, functional_result: 'UNABLE', cosmetic_result: 'NA' },
          { device_id: dFail, functional_result: 'FAIL', cosmetic_result: 'FAIL' },
        ],
      });

    const complete = await request(app)
      .post(`/api/qc/jobs/${jobId}/complete`)
      .set('Authorization', authHeader);

    expect(complete.status).toBe(200);

    const pool = await getTestDbPool();
    const [devices] = await pool.query(
      `SELECT imei, status, qc_completed FROM devices WHERE id IN (?, ?, ?)`,
      [dPass, dUnable, dFail],
    );
    const devMap: Record<string, any> = {};
    for (const d of devices as any[]) devMap[d.imei] = d;

    expect(devMap['700000000000001'].status).toBe('AWAITING_REPAIR');
    expect(devMap['700000000000002'].status).toBe('AWAITING_REPAIR');
    expect(devMap['700000000000003'].status).toBe('IN_STOCK'); // FAIL → back to stock

    // Repair job should have been auto-created with 2 devices
    const repairJobs = await request(app)
      .get('/api/repair/jobs')
      .set('Authorization', authHeader);

    expect(repairJobs.body.jobs).toHaveLength(1);
    expect(repairJobs.body.jobs[0].total_devices).toBe(2);
  });

  // ── Complete job — FAIL devices ────────────────────────────────────────

  it('FAIL functional devices go to IN_STOCK with overall_pass=FALSE', async () => {
    const purchaseOrderId = await createPurchaseOrder({ requiresQc: true, requiresRepair: false });
    const dFail = await createDevice({ imei: '800000000000001', purchaseOrderId });
    const jobId = await createQcJobForPo(purchaseOrderId, [dFail]);

    await request(app)
      .post(`/api/qc/jobs/${jobId}/results`)
      .set('Authorization', authHeader)
      .send({
        results: [{ device_id: dFail, functional_result: 'FAIL', cosmetic_result: 'FAIL' }],
      });

    await request(app)
      .post(`/api/qc/jobs/${jobId}/complete`)
      .set('Authorization', authHeader);

    const pool = await getTestDbPool();
    const [qrRows] = await pool.query(
      `SELECT overall_pass FROM qc_results WHERE device_id = ?`,
      [dFail],
    );
    const [devRows] = await pool.query(
      `SELECT status FROM devices WHERE id = ?`,
      [dFail],
    );

    expect((qrRows as any[])[0].overall_pass).toBe(0);  // FALSE
    expect((devRows as any[])[0].status).toBe('IN_STOCK');
  });

  it('completion preserves the tester attribution from the save step', async () => {
    const purchaseOrderId = await createPurchaseOrder({ requiresQc: true, requiresRepair: false });
    const deviceId = await createDevice({ imei: '900000000000001', purchaseOrderId });
    const jobId = await createQcJobForPo(purchaseOrderId, [deviceId]);

    await seedUser({
      id: 2,
      username: 'qc_user',
      displayName: 'QC User',
      role: 'QC',
    });

    const qcAuthHeader = getAuthHeader({ id: 2, username: 'qc_user', role: 'QC' });

    const save = await request(app)
      .post(`/api/qc/jobs/${jobId}/results`)
      .set('Authorization', qcAuthHeader)
      .send({
        results: [{ device_id: deviceId, functional_result: 'PASS', cosmetic_result: 'PASS', grade_assigned: 'A' }],
      });

    expect(save.status).toBe(200);

    const complete = await request(app)
      .post(`/api/qc/jobs/${jobId}/complete`)
      .set('Authorization', authHeader);

    expect(complete.status).toBe(200);

    const pool = await getTestDbPool();
    const [rows] = await pool.query(
      `SELECT tested_by, tested_at FROM qc_results WHERE device_id = ?`,
      [deviceId],
    );

    expect((rows as any[])[0].tested_by).toBe(2);
    expect((rows as any[])[0].tested_at).toBeTruthy();
  });
});
