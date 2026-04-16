import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../server/src/app.js';
import { getAuthHeader } from './utils/auth';
import { seedCoreFixtures } from './utils/fixtures';
import { getTestDbPool } from './utils/test-db';

async function getFirstPartCategoryId() {
  const pool = await getTestDbPool();
  const [rows] = await pool.query('SELECT id FROM part_categories ORDER BY id LIMIT 1');
  return rows[0].id as number;
}

async function createPurchaseOrder({
  supplierId = 1,
  createdBy = 1,
  requiresRepair = true,
}: {
  supplierId?: number;
  createdBy?: number;
  requiresRepair?: boolean;
} = {}) {
  const pool = await getTestDbPool();
  const result: any = (await pool.query(
    `INSERT INTO purchase_orders (
      po_number,
      supplier_id,
      status,
      expected_quantity,
      received_quantity,
      requires_qc,
      requires_repair,
      created_by,
      confirmed_at
    ) VALUES (?, ?, 'FULLY_RECEIVED', 0, 0, FALSE, ?, ?, NOW())`,
    [`PO-T-${Date.now()}`, supplierId, requiresRepair, createdBy],
  ))[0];

  return result['insertId'] as number;
}

async function createDevice({
  imei,
  purchaseOrderId,
  supplierId = 1,
  locationId = 1,
  status = 'AWAITING_REPAIR',
  repairRequired = true,
  modelId = 1,
}: {
  imei: string;
  purchaseOrderId: number;
  supplierId?: number;
  locationId?: number;
  status?: string;
  repairRequired?: boolean;
  modelId?: number;
}) {
  const pool = await getTestDbPool();
  const result: any = (await pool.query(
    `INSERT INTO devices (
      imei,
      tac_code,
      manufacturer_id,
      model_id,
      storage_gb,
      color,
      grade,
      status,
      location_id,
      purchase_order_id,
      supplier_id,
      qc_required,
      repair_required,
      received_at
    ) VALUES (?, ?, 1, ?, 128, 'Black', 'A', ?, ?, ?, ?, FALSE, ?, NOW())`,
    [imei, imei.slice(0, 8), modelId, status, locationId, purchaseOrderId, supplierId, repairRequired],
  ))[0];

  return result['insertId'] as number;
}

describe('Repair and parts module', () => {
  let authHeader: string;

  beforeEach(async () => {
    await seedCoreFixtures();
    authHeader = getAuthHeader();
  });

  it('creates multiple repair jobs for one PO and blocks the same device joining two open jobs', async () => {
    const purchaseOrderId = await createPurchaseOrder();
    const deviceOneId = await createDevice({
      imei: '111111110000001',
      purchaseOrderId,
    });
    const deviceTwoId = await createDevice({
      imei: '111111110000002',
      purchaseOrderId,
    });

    const createJobOne = await request(app)
      .post('/api/repair/jobs')
      .set('Authorization', authHeader)
      .send({
        purchase_order_id: purchaseOrderId,
        priority: 'HIGH',
        notes: 'First split',
      });

    expect(createJobOne.status).toBe(201);
    const firstJobId = createJobOne.body.jobId;

    const addDeviceOne = await request(app)
      .post(`/api/repair/jobs/${firstJobId}/devices`)
      .set('Authorization', authHeader)
      .send({
        device_ids: [deviceOneId],
        fault_description: 'Screen damage on urgent unit',
      });

    expect(addDeviceOne.status).toBe(200);

    const createJobTwo = await request(app)
      .post('/api/repair/jobs')
      .set('Authorization', authHeader)
      .send({
        purchase_order_id: purchaseOrderId,
        priority: 'URGENT',
        notes: 'Second split',
      });

    expect(createJobTwo.status).toBe(201);
    const secondJobId = createJobTwo.body.jobId;

    const addDeviceTwo = await request(app)
      .post(`/api/repair/jobs/${secondJobId}/devices`)
      .set('Authorization', authHeader)
      .send({
        device_ids: [deviceTwoId],
        fault_description: 'Battery replacement for urgent order',
      });

    expect(addDeviceTwo.status).toBe(200);

    const duplicateAdd = await request(app)
      .post(`/api/repair/jobs/${secondJobId}/devices`)
      .set('Authorization', authHeader)
      .send({
        device_ids: [deviceOneId],
        fault_description: 'Duplicate assignment attempt',
      });

    expect(duplicateAdd.status).toBe(409);
    expect(duplicateAdd.body.error.message).toContain('open repair record');
  });

  it('auto-creates a repair job during book in when requires_repair is true', async () => {
    const response = await request(app)
      .post('/api/purchase-orders/book-in')
      .set('Authorization', authHeader)
      .send({
        supplier_id: 1,
        supplier_ref: 'AUTO-REP-001',
        requires_qc: false,
        requires_repair: true,
        notes: 'Auto job creation test',
        devices: [
          {
            imei: '222222220000001',
            manufacturer_id: 1,
            model_id: 1,
            storage_gb: 128,
            color: 'Black',
            grade: 'A',
            location_id: 1,
          },
        ],
      });

    expect(response.status).toBe(201);

    const jobsResponse = await request(app)
      .get('/api/repair/jobs')
      .set('Authorization', authHeader);

    expect(jobsResponse.status).toBe(200);
    expect(jobsResponse.body.jobs).toHaveLength(1);
    expect(jobsResponse.body.jobs[0].po_number).toBe(response.body.result.po_number);

    const jobDetailResponse = await request(app)
      .get(`/api/repair/jobs/${jobsResponse.body.jobs[0].id}`)
      .set('Authorization', authHeader);

    expect(jobDetailResponse.status).toBe(200);
    expect(jobDetailResponse.body.records).toHaveLength(1);
    expect(jobDetailResponse.body.records[0].device_status).toBe('AWAITING_REPAIR');
  });

  it('reserves, fits, faults, and reports parts correctly', async () => {
    const purchaseOrderId = await createPurchaseOrder();
    const deviceId = await createDevice({
      imei: '333333330000001',
      purchaseOrderId,
    });

    const createJob = await request(app)
      .post('/api/repair/jobs')
      .set('Authorization', authHeader)
      .send({
        purchase_order_id: purchaseOrderId,
        priority: 'NORMAL',
      });

    const jobId = createJob.body.jobId;

    await request(app)
      .post(`/api/repair/jobs/${jobId}/devices`)
      .set('Authorization', authHeader)
      .send({
        device_ids: [deviceId],
        fault_description: 'Chassis damaged',
      });

    const jobDetail = await request(app)
      .get(`/api/repair/jobs/${jobId}`)
      .set('Authorization', authHeader);

    const recordId = jobDetail.body.records[0].id;
    const categoryId = await getFirstPartCategoryId();

    const createBase = await request(app)
      .post('/api/parts/bases')
      .set('Authorization', authHeader)
      .send({
        base_code: 'CHASSIS-APPLE-A2890-FULL',
        name: 'iPhone 15 Pro full chassis',
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
        sku: 'CH-15PRO-BLUE',
        name: 'iPhone 15 Pro blue chassis',
        color: 'Blue',
        quality_tier: 'OEM',
      });

    expect(createVariant.status).toBe(201);
    const variantId = createVariant.body.variantId;

    await request(app)
      .post('/api/parts/compatibility')
      .set('Authorization', authHeader)
      .send({
        part_base_id: baseId,
        model_id: 1,
        storage_gb: 0,
      });

    const goodsIn = await request(app)
      .post('/api/parts/goods-in')
      .set('Authorization', authHeader)
      .send({
        part_id: variantId,
        supplier_id: 1,
        lot_ref: 'LOT-CHASSIS-001',
        unit_cost: 32.5,
        quantity: 3,
      });

    expect(goodsIn.status).toBe(201);
    const lotId = goodsIn.body.lotId;

    const reserve = await request(app)
      .post(`/api/repair/records/${recordId}/parts/reserve`)
      .set('Authorization', authHeader)
      .send({
        part_id: variantId,
        part_lot_id: lotId,
        quantity: 1,
      });

    expect(reserve.status).toBe(201);

    const reserveTooMuch = await request(app)
      .post(`/api/repair/records/${recordId}/parts/reserve`)
      .set('Authorization', authHeader)
      .send({
        part_id: variantId,
        part_lot_id: lotId,
        quantity: 5,
      });

    expect(reserveTooMuch.status).toBe(409);

    const recordAfterReserve = await request(app)
      .get(`/api/repair/records/${recordId}`)
      .set('Authorization', authHeader);

    expect(recordAfterReserve.body.record.status).toBe('IN_PROGRESS');
    expect(recordAfterReserve.body.record.device_status).toBe('IN_REPAIR');

    const reservedAllocation = recordAfterReserve.body.allocations.find((allocation: any) => allocation.status === 'RESERVED');
    expect(reservedAllocation).toBeTruthy();

    const fitReserved = await request(app)
      .post(`/api/repair/records/${recordId}/parts/fit`)
      .set('Authorization', authHeader)
      .send({
        repair_part_id: reservedAllocation.id,
      });

    expect(fitReserved.status).toBe(200);

    const recordAfterFit = await request(app)
      .get(`/api/repair/records/${recordId}`)
      .set('Authorization', authHeader);

    expect(recordAfterFit.body.record.device_status).toBe('IN_REPAIR');
    expect(recordAfterFit.body.record.color).toBe('Blue');

    const fittedAllocation = recordAfterFit.body.allocations.find((allocation: any) => allocation.status === 'FITTED');
    expect(fittedAllocation).toBeTruthy();

    const removeFaulty = await request(app)
      .post(`/api/repair/records/${recordId}/parts/remove`)
      .set('Authorization', authHeader)
      .send({
        repair_part_id: fittedAllocation.id,
        disposition: 'FAULTY',
        quantity: 1,
        fault_reason: 'Replacement chassis proved faulty',
      });

    expect(removeFaulty.status).toBe(200);
    expect(removeFaulty.body.faultReportId).toBeTypeOf('number');

    const faultyResponse = await request(app)
      .get('/api/parts/faulty')
      .set('Authorization', authHeader);

    expect(faultyResponse.status).toBe(200);
    expect(faultyResponse.body.data).toHaveLength(1);
    expect(faultyResponse.body.data[0].reason).toContain('Replacement chassis');
  });

  it('completes and escalates repair records with correct device state changes', async () => {
    const purchaseOrderId = await createPurchaseOrder();
    const completedDeviceId = await createDevice({
      imei: '444444440000001',
      purchaseOrderId,
    });
    const escalatedDeviceId = await createDevice({
      imei: '444444440000002',
      purchaseOrderId,
    });

    const createCompleteJob = await request(app)
      .post('/api/repair/jobs')
      .set('Authorization', authHeader)
      .send({ purchase_order_id: purchaseOrderId, priority: 'HIGH' });

    const completeJobId = createCompleteJob.body.jobId;

    await request(app)
      .post(`/api/repair/jobs/${completeJobId}/devices`)
      .set('Authorization', authHeader)
      .send({
        device_ids: [completedDeviceId],
        fault_description: 'Camera replacement',
      });

    const completeJobDetail = await request(app)
      .get(`/api/repair/jobs/${completeJobId}`)
      .set('Authorization', authHeader);

    const completeRecordId = completeJobDetail.body.records[0].id;

    const completeResponse = await request(app)
      .patch(`/api/repair/records/${completeRecordId}`)
      .set('Authorization', authHeader)
      .send({
        status: 'COMPLETED',
        outcome: 'Camera replaced',
      });

    expect(completeResponse.status).toBe(200);

    const pool = await getTestDbPool();
    const [completedDeviceRows] = await pool.query(
      'SELECT status, repair_required, repair_completed FROM devices WHERE id = ?',
      [completedDeviceId],
    );
    expect(completedDeviceRows[0].status).toBe('IN_STOCK');
    expect(completedDeviceRows[0].repair_required).toBe(0);
    expect(completedDeviceRows[0].repair_completed).toBe(1);

    const [historyRows] = await pool.query(
      "SELECT COUNT(*) AS count FROM device_history WHERE device_id = ? AND event_type = 'REPAIR_COMPLETE'",
      [completedDeviceId],
    );
    expect(historyRows[0].count).toBe(1);

    const createEscalationJob = await request(app)
      .post('/api/repair/jobs')
      .set('Authorization', authHeader)
      .send({ purchase_order_id: purchaseOrderId, priority: 'URGENT' });

    const escalationJobId = createEscalationJob.body.jobId;

    await request(app)
      .post(`/api/repair/jobs/${escalationJobId}/devices`)
      .set('Authorization', authHeader)
      .send({
        device_ids: [escalatedDeviceId],
        fault_description: 'Board issue needs L3',
      });

    const escalationJobDetail = await request(app)
      .get(`/api/repair/jobs/${escalationJobId}`)
      .set('Authorization', authHeader);

    const escalationRecordId = escalationJobDetail.body.records[0].id;

    const escalateResponse = await request(app)
      .post(`/api/repair/records/${escalationRecordId}/escalate-l3`)
      .set('Authorization', authHeader);

    expect(escalateResponse.status).toBe(200);
    expect(escalateResponse.body.level3RepairId).toBeTypeOf('number');

    const [escalatedDeviceRows] = await pool.query(
      'SELECT status FROM devices WHERE id = ?',
      [escalatedDeviceId],
    );
    expect(escalatedDeviceRows[0].status).toBe('IN_LEVEL3');

    const [level3Rows] = await pool.query(
      'SELECT COUNT(*) AS count FROM level3_repairs WHERE device_id = ?',
      [escalatedDeviceId],
    );
    expect(level3Rows[0].count).toBe(1);
  });

  it('bulk repairs multiple devices with compatible parts', async () => {
    const purchaseOrderId = await createPurchaseOrder();
    const deviceOneId = await createDevice({
      imei: '555555550000001',
      purchaseOrderId,
    });
    const deviceTwoId = await createDevice({
      imei: '555555550000002',
      purchaseOrderId,
    });

    const createJob = await request(app)
      .post('/api/repair/jobs')
      .set('Authorization', authHeader)
      .send({
        purchase_order_id: purchaseOrderId,
        priority: 'NORMAL',
      });

    const jobId = createJob.body.jobId;

    await request(app)
      .post(`/api/repair/jobs/${jobId}/devices`)
      .set('Authorization', authHeader)
      .send({
        device_ids: [deviceOneId, deviceTwoId],
        fault_description: 'Screen replacement needed',
      });

    const jobDetail = await request(app)
      .get(`/api/repair/jobs/${jobId}`)
      .set('Authorization', authHeader);

    const recordOneId = jobDetail.body.records[0].id;
    const recordTwoId = jobDetail.body.records[1].id;
    const categoryId = await getFirstPartCategoryId();

    const createBase = await request(app)
      .post('/api/parts/bases')
      .set('Authorization', authHeader)
      .send({
        base_code: 'SCREEN-APPLE-A2890',
        name: 'iPhone 15 Pro screen',
        category_id: categoryId,
        manufacturer_id: 1,
        changes_device_color: false,
      });

    expect(createBase.status).toBe(201);
    const baseId = createBase.body.baseId;

    const createVariant = await request(app)
      .post('/api/parts/variants')
      .set('Authorization', authHeader)
      .send({
        part_base_id: baseId,
        category_id: categoryId,
        sku: 'SCR-15PRO-BLK',
        name: 'iPhone 15 Pro black screen',
        color: 'Black',
        quality_tier: 'OEM',
      });

    expect(createVariant.status).toBe(201);
    const variantId = createVariant.body.variantId;

    await request(app)
      .post('/api/parts/compatibility')
      .set('Authorization', authHeader)
      .send({
        part_base_id: baseId,
        model_id: 1,
      });

    const goodsIn = await request(app)
      .post('/api/parts/goods-in')
      .set('Authorization', authHeader)
      .send({
        part_id: variantId,
        supplier_id: 1,
        lot_ref: 'LOT-SCREEN-001',
        quantity: 5,
      });

    expect(goodsIn.status).toBe(201);
    const lotId = goodsIn.body.lotId;

    const bulkParts = await request(app)
      .get(`/api/repair/jobs/${jobId}/bulk-parts`)
      .query({ device_ids: `${deviceOneId},${deviceTwoId}` })
      .set('Authorization', authHeader);

    expect(bulkParts.status).toBe(200);
    expect(bulkParts.body.parts).toHaveLength(1);
    expect(bulkParts.body.parts[0].part_id).toBe(variantId);

    const bulkRepair = await request(app)
      .post(`/api/repair/jobs/${jobId}/bulk-repair`)
      .set('Authorization', authHeader)
      .send({
        device_ids: [deviceOneId, deviceTwoId],
        part_allocations: [{ part_id: variantId, part_lot_id: lotId }],
      });

    expect(bulkRepair.status).toBe(200);
    expect(bulkRepair.body.completedCount).toBe(2);

    const pool = await getTestDbPool();
    const [deviceRows] = await pool.query(
      'SELECT id, status, repair_required, repair_completed FROM devices WHERE id IN (?, ?) ORDER BY id',
      [deviceOneId, deviceTwoId],
    );
    expect(deviceRows[0].status).toBe('IN_STOCK');
    expect(deviceRows[0].repair_required).toBe(0);
    expect(deviceRows[0].repair_completed).toBe(1);
    expect(deviceRows[1].status).toBe('IN_STOCK');
    expect(deviceRows[1].repair_required).toBe(0);
    expect(deviceRows[1].repair_completed).toBe(1);

    const [recordRows] = await pool.query(
      'SELECT id, status FROM repair_records WHERE id IN (?, ?) ORDER BY id',
      [recordOneId, recordTwoId],
    );
    expect(recordRows[0].status).toBe('COMPLETED');
    expect(recordRows[1].status).toBe('COMPLETED');

    const [partRows] = await pool.query(
      'SELECT available_quantity, consumed_quantity FROM part_lots WHERE id = ?',
      [lotId],
    );
    expect(partRows[0].available_quantity).toBe(3);
    expect(partRows[0].consumed_quantity).toBe(2);
  });

  it('rejects bulk repair for devices attached to a different repair job', async () => {
    const purchaseOrderId = await createPurchaseOrder();
    const deviceOneId = await createDevice({
      imei: '565656560000001',
      purchaseOrderId,
    });
    const deviceTwoId = await createDevice({
      imei: '565656560000002',
      purchaseOrderId,
    });

    const createJobOne = await request(app)
      .post('/api/repair/jobs')
      .set('Authorization', authHeader)
      .send({
        purchase_order_id: purchaseOrderId,
        priority: 'NORMAL',
      });

    const createJobTwo = await request(app)
      .post('/api/repair/jobs')
      .set('Authorization', authHeader)
      .send({
        purchase_order_id: purchaseOrderId,
        priority: 'NORMAL',
      });

    const jobOneId = createJobOne.body.jobId;
    const jobTwoId = createJobTwo.body.jobId;

    await request(app)
      .post(`/api/repair/jobs/${jobOneId}/devices`)
      .set('Authorization', authHeader)
      .send({
        device_ids: [deviceOneId],
        fault_description: 'Screen replacement needed',
      });

    await request(app)
      .post(`/api/repair/jobs/${jobTwoId}/devices`)
      .set('Authorization', authHeader)
      .send({
        device_ids: [deviceTwoId],
        fault_description: 'Screen replacement needed',
      });

    const categoryId = await getFirstPartCategoryId();

    const createBase = await request(app)
      .post('/api/parts/bases')
      .set('Authorization', authHeader)
      .send({
        base_code: 'SCREEN-APPLE-A2890-JOB',
        name: 'iPhone 15 Pro screen job scoped',
        category_id: categoryId,
        manufacturer_id: 1,
        changes_device_color: false,
      });

    expect(createBase.status).toBe(201);
    const baseId = createBase.body.baseId;

    const createVariant = await request(app)
      .post('/api/parts/variants')
      .set('Authorization', authHeader)
      .send({
        part_base_id: baseId,
        category_id: categoryId,
        sku: 'SCR-15PRO-BLK-JOB',
        name: 'iPhone 15 Pro black screen job scoped',
        color: 'Black',
        quality_tier: 'OEM',
      });

    expect(createVariant.status).toBe(201);
    const variantId = createVariant.body.variantId;

    await request(app)
      .post('/api/parts/compatibility')
      .set('Authorization', authHeader)
      .send({
        part_base_id: baseId,
        model_id: 1,
      });

    const goodsIn = await request(app)
      .post('/api/parts/goods-in')
      .set('Authorization', authHeader)
      .send({
        part_id: variantId,
        supplier_id: 1,
        lot_ref: 'LOT-SCREEN-JOB-001',
        quantity: 2,
      });

    expect(goodsIn.status).toBe(201);
    const lotId = goodsIn.body.lotId;

    const bulkRepair = await request(app)
      .post(`/api/repair/jobs/${jobOneId}/bulk-repair`)
      .set('Authorization', authHeader)
      .send({
        device_ids: [deviceTwoId],
        part_allocations: [{ part_id: variantId, part_lot_id: lotId }],
      });

    expect(bulkRepair.status).toBe(404);
    expect(bulkRepair.body.error.code).toBe('DEVICE_NOT_IN_JOB');
  });

  it('rejects bulk repair with invalid device IDs', async () => {
    const purchaseOrderId = await createPurchaseOrder();
    const deviceId = await createDevice({
      imei: '666666660000001',
      purchaseOrderId,
    });

    const createJob = await request(app)
      .post('/api/repair/jobs')
      .set('Authorization', authHeader)
      .send({
        purchase_order_id: purchaseOrderId,
        priority: 'NORMAL',
      });

    const jobId = createJob.body.jobId;

    await request(app)
      .post(`/api/repair/jobs/${jobId}/devices`)
      .set('Authorization', authHeader)
      .send({
        device_ids: [deviceId],
        fault_description: 'Test device',
      });

    const bulkRepair = await request(app)
      .post(`/api/repair/jobs/${jobId}/bulk-repair`)
      .set('Authorization', authHeader)
      .send({
        device_ids: [999999],
        part_allocations: [{ part_id: 1, part_lot_id: 1 }],
      });

    expect(bulkRepair.status).toBe(404);
    expect(bulkRepair.body.error.code).toBe('DEVICE_NOT_FOUND');
  });

  it('rejects bulk repair with empty part allocations', async () => {
    const purchaseOrderId = await createPurchaseOrder();
    const deviceId = await createDevice({
      imei: '777777770000001',
      purchaseOrderId,
    });

    const createJob = await request(app)
      .post('/api/repair/jobs')
      .set('Authorization', authHeader)
      .send({
        purchase_order_id: purchaseOrderId,
        priority: 'NORMAL',
      });

    const jobId = createJob.body.jobId;

    await request(app)
      .post(`/api/repair/jobs/${jobId}/devices`)
      .set('Authorization', authHeader)
      .send({
        device_ids: [deviceId],
        fault_description: 'Test device',
      });

    const bulkRepair = await request(app)
      .post(`/api/repair/jobs/${jobId}/bulk-repair`)
      .set('Authorization', authHeader)
      .send({
        device_ids: [deviceId],
        part_allocations: [],
      });

    expect(bulkRepair.status).toBe(400);
  });

  it('rejects bulk repair with duplicate device IDs', async () => {
    const purchaseOrderId = await createPurchaseOrder();
    const deviceId = await createDevice({
      imei: '888888880000001',
      purchaseOrderId,
    });

    const createJob = await request(app)
      .post('/api/repair/jobs')
      .set('Authorization', authHeader)
      .send({
        purchase_order_id: purchaseOrderId,
        priority: 'NORMAL',
      });

    const jobId = createJob.body.jobId;

    await request(app)
      .post(`/api/repair/jobs/${jobId}/devices`)
      .set('Authorization', authHeader)
      .send({
        device_ids: [deviceId],
        fault_description: 'Test device',
      });

    const bulkRepair = await request(app)
      .post(`/api/repair/jobs/${jobId}/bulk-repair`)
      .set('Authorization', authHeader)
      .send({
        device_ids: [deviceId, deviceId],
        part_allocations: [{ part_id: 1, part_lot_id: 1 }],
      });

    expect(bulkRepair.status).toBe(400);
    expect(bulkRepair.body.error.code).toBe('VALIDATION_ERROR');
    const duplicateError = bulkRepair.body.error.details.find(
      (e: any) => e.msg.includes('Duplicate device IDs'),
    );
    expect(duplicateError).toBeTruthy();
  });

  it('preserves original fault description in bulk repair resolution notes', async () => {
    const purchaseOrderId = await createPurchaseOrder();
    const deviceId = await createDevice({
      imei: '999999990000001',
      purchaseOrderId,
    });

    const createJob = await request(app)
      .post('/api/repair/jobs')
      .set('Authorization', authHeader)
      .send({
        purchase_order_id: purchaseOrderId,
        priority: 'NORMAL',
      });

    const jobId = createJob.body.jobId;

    const faultDescription = 'Cracked screen needs full replacement';

    await request(app)
      .post(`/api/repair/jobs/${jobId}/devices`)
      .set('Authorization', authHeader)
      .send({
        device_ids: [deviceId],
        fault_description: faultDescription,
      });

    const jobDetail = await request(app)
      .get(`/api/repair/jobs/${jobId}`)
      .set('Authorization', authHeader);

    const recordId = jobDetail.body.records[0].id;
    const categoryId = await getFirstPartCategoryId();

    const createBase = await request(app)
      .post('/api/parts/bases')
      .set('Authorization', authHeader)
      .send({
        base_code: 'SCREEN-FAULT-TEST',
        name: 'Fault test screen',
        category_id: categoryId,
        manufacturer_id: 1,
        changes_device_color: false,
      });

    expect(createBase.status).toBe(201);
    const baseId = createBase.body.baseId;

    const createVariant = await request(app)
      .post('/api/parts/variants')
      .set('Authorization', authHeader)
      .send({
        part_base_id: baseId,
        category_id: categoryId,
        sku: 'SCR-FAULT-TEST',
        name: 'Fault test screen variant',
        color: 'Black',
        quality_tier: 'OEM',
      });

    expect(createVariant.status).toBe(201);
    const variantId = createVariant.body.variantId;

    await request(app)
      .post('/api/parts/compatibility')
      .set('Authorization', authHeader)
      .send({
        part_base_id: baseId,
        model_id: 1,
      });

    const goodsIn = await request(app)
      .post('/api/parts/goods-in')
      .set('Authorization', authHeader)
      .send({
        part_id: variantId,
        supplier_id: 1,
        lot_ref: 'LOT-FAULT-001',
        quantity: 1,
      });

    expect(goodsIn.status).toBe(201);
    const lotId = goodsIn.body.lotId;

    const bulkRepair = await request(app)
      .post(`/api/repair/jobs/${jobId}/bulk-repair`)
      .set('Authorization', authHeader)
      .send({
        device_ids: [deviceId],
        part_allocations: [{ part_id: variantId, part_lot_id: lotId }],
      });

    expect(bulkRepair.status).toBe(200);

    const pool = await getTestDbPool();
    const [recordRows] = await pool.query(
      'SELECT resolution_notes FROM repair_records WHERE id = ?',
      [recordId],
    );
    expect(recordRows[0].resolution_notes).toContain('Original fault:');
    expect(recordRows[0].resolution_notes).toContain(faultDescription);
  });

  it('rejects bulk repair exceeding maximum batch size', async () => {
    const bulkRepair = await request(app)
      .post('/api/repair/jobs/1/bulk-repair')
      .set('Authorization', authHeader)
      .send({
        device_ids: Array.from({ length: 51 }, (_, i) => i + 1),
        part_allocations: [{ part_id: 1, part_lot_id: 1 }],
      });

    expect(bulkRepair.status).toBe(400);
    expect(bulkRepair.body.error.code).toBe('VALIDATION_ERROR');
    const batchError = bulkRepair.body.error.details.find(
      (e: any) => e.msg.includes('between 1 and 50'),
    );
    expect(batchError).toBeTruthy();
  });

  it('rejects bulk repair when part stock is insufficient for all devices', async () => {
    const purchaseOrderId = await createPurchaseOrder();
    const deviceOneId = await createDevice({
      imei: '100000000000001',
      purchaseOrderId,
    });
    const deviceTwoId = await createDevice({
      imei: '100000000000002',
      purchaseOrderId,
    });

    const createJob = await request(app)
      .post('/api/repair/jobs')
      .set('Authorization', authHeader)
      .send({ purchase_order_id: purchaseOrderId, priority: 'NORMAL' });

    const jobId = createJob.body.jobId;

    await request(app)
      .post(`/api/repair/jobs/${jobId}/devices`)
      .set('Authorization', authHeader)
      .send({
        device_ids: [deviceOneId, deviceTwoId],
        fault_description: 'Screen cracked',
      });

    const categoryId = await getFirstPartCategoryId();

    const createBase = await request(app)
      .post('/api/parts/bases')
      .set('Authorization', authHeader)
      .send({
        base_code: 'SCREEN-STOCK-TEST',
        name: 'Stock shortage test screen',
        category_id: categoryId,
        manufacturer_id: 1,
        changes_device_color: false,
      });

    expect(createBase.status).toBe(201);
    const baseId = createBase.body.baseId;

    const createVariant = await request(app)
      .post('/api/parts/variants')
      .set('Authorization', authHeader)
      .send({
        part_base_id: baseId,
        category_id: categoryId,
        sku: 'SCR-STOCK-TEST',
        name: 'Stock shortage test screen variant',
        color: 'Black',
        quality_tier: 'OEM',
      });

    expect(createVariant.status).toBe(201);
    const variantId = createVariant.body.variantId;

    await request(app)
      .post('/api/parts/compatibility')
      .set('Authorization', authHeader)
      .send({ part_base_id: baseId, model_id: 1 });

    // Book in only 1 unit — not enough for 2 devices
    const goodsIn = await request(app)
      .post('/api/parts/goods-in')
      .set('Authorization', authHeader)
      .send({
        part_id: variantId,
        supplier_id: 1,
        lot_ref: 'LOT-STOCK-SHORT-001',
        quantity: 1,
      });

    expect(goodsIn.status).toBe(201);
    const lotId = goodsIn.body.lotId;

    const bulkRepair = await request(app)
      .post(`/api/repair/jobs/${jobId}/bulk-repair`)
      .set('Authorization', authHeader)
      .send({
        device_ids: [deviceOneId, deviceTwoId],
        part_allocations: [{ part_id: variantId, part_lot_id: lotId }],
      });

    expect(bulkRepair.status).toBe(409);
    expect(bulkRepair.body.error.code).toBe('INSUFFICIENT_PART_STOCK');
  });

  it('rejects bulk repair for devices with different models', async () => {
    const pool = await getTestDbPool();

    // Insert a second model so two devices can have different model_ids
    await pool.query(
      `INSERT INTO models (id, manufacturer_id, model_number, model_name)
       VALUES (2, 1, 'A3290', 'iPhone 16 Pro')`,
    );

    const purchaseOrderId = await createPurchaseOrder();
    const deviceOneId = await createDevice({
      imei: '200000000000001',
      purchaseOrderId,
      modelId: 1,
    });
    const deviceTwoId = await createDevice({
      imei: '200000000000002',
      purchaseOrderId,
      modelId: 2,
    });

    const createJob = await request(app)
      .post('/api/repair/jobs')
      .set('Authorization', authHeader)
      .send({ purchase_order_id: purchaseOrderId, priority: 'NORMAL' });

    const jobId = createJob.body.jobId;

    await request(app)
      .post(`/api/repair/jobs/${jobId}/devices`)
      .set('Authorization', authHeader)
      .send({
        device_ids: [deviceOneId, deviceTwoId],
        fault_description: 'Screen replacement',
      });

    const bulkRepair = await request(app)
      .post(`/api/repair/jobs/${jobId}/bulk-repair`)
      .set('Authorization', authHeader)
      .send({
        device_ids: [deviceOneId, deviceTwoId],
        part_allocations: [{ part_id: 1, part_lot_id: 1 }],
      });

    expect(bulkRepair.status).toBe(400);
    expect(bulkRepair.body.error.code).toBe('MIXED_DEVICE_MODELS');
  });
});
