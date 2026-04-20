import { transaction } from '../config/database.js';
import { asyncHandler } from '../middleware/validation.js';
import { ensureAutomationCompatibility } from '../services/automationSchema.service.js';
import {
  computePayloadHash,
  getAppliedQuantumEvent,
  recordAppliedQuantumEvent,
  withAutomationEventLock,
} from '../services/automationIdempotency.service.js';
import {
  moveLegacyDeviceSnapshot,
  syncLegacyPurchaseQcSnapshot,
  syncLegacyPurchaseSnapshot,
  syncLegacySalesOrderSnapshot,
} from '../services/automationSync.service.js';
import { successResponse } from '../utils/helpers.js';

async function runAutomationSync({
  req,
  routeName,
  legacyEntityType,
  legacyEntityId,
  applySync,
}) {
  await ensureAutomationCompatibility();

  const payloadHash = computePayloadHash(req.body);
  const result = await transaction(async (connection) => {
    return withAutomationEventLock(
      connection,
      req.body.quantum_event_id,
      req.body.idempotency_key,
      async () => {
        const existingEvent = await getAppliedQuantumEvent(
          connection,
          req.body.quantum_event_id,
          req.body.idempotency_key,
        );

        if (existingEvent) {
          return {
            duplicate: true,
            appliedEvent: existingEvent,
          };
        }

        const syncResult = await applySync(connection);
        await recordAppliedQuantumEvent(
          connection,
          {
            quantumEventId: req.body.quantum_event_id,
            idempotencyKey: req.body.idempotency_key,
            eventType: req.body.source_event_type,
            legacyEntityType,
            legacyEntityId,
            routeName,
            payloadHash,
          },
        );

        return {
          duplicate: false,
          syncResult,
        };
      },
    );
  });

  return {
    routeName,
    quantumEventId: req.body.quantum_event_id,
    duplicate: result.duplicate,
    result: result.syncResult || null,
    appliedEvent: result.appliedEvent || null,
  };
}

export const syncLegacyPurchase = asyncHandler(async (req, res) => {
  const response = await runAutomationSync({
    req,
    routeName: 'automation.purchase.sync',
    legacyEntityType: 'purchase',
    legacyEntityId: req.params.legacyPurchaseId,
    applySync: (connection) => syncLegacyPurchaseSnapshot(
      connection,
      req.body,
      req.user.id,
      req.params.legacyPurchaseId,
    ),
  });

  return successResponse(res, { sync: response }, 'Automation purchase sync applied');
});

export const syncLegacySalesOrder = asyncHandler(async (req, res) => {
  const response = await runAutomationSync({
    req,
    routeName: 'automation.sales-order.sync',
    legacyEntityType: 'sales_order',
    legacyEntityId: req.params.legacyOrderId,
    applySync: (connection) => syncLegacySalesOrderSnapshot(
      connection,
      req.body,
      req.user.id,
      req.params.legacyOrderId,
    ),
  });

  return successResponse(res, { sync: response }, 'Automation sales-order sync applied');
});

export const syncLegacyPurchaseQc = asyncHandler(async (req, res) => {
  const response = await runAutomationSync({
    req,
    routeName: 'automation.qc.sync',
    legacyEntityType: 'purchase',
    legacyEntityId: req.params.legacyPurchaseId,
    applySync: (connection) => syncLegacyPurchaseQcSnapshot(
      connection,
      req.body,
      req.user.id,
      req.params.legacyPurchaseId,
    ),
  });

  return successResponse(res, { sync: response }, 'Automation QC sync applied');
});

export const moveLegacyDevice = asyncHandler(async (req, res) => {
  const response = await runAutomationSync({
    req,
    routeName: 'automation.device.move',
    legacyEntityType: 'device',
    legacyEntityId: req.params.imei,
    applySync: (connection) => moveLegacyDeviceSnapshot(
      connection,
      req.body,
      req.user.id,
      req.params.imei,
    ),
  });

  return successResponse(res, { sync: response }, 'Automation stock move applied');
});
