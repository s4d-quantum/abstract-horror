import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useEscalateRepairRecord,
  useFitRepairPart,
  useRemoveRepairPart,
  useRepairRecord,
  useReserveRepairPart,
  useUpdateRepairRecord,
} from '../hooks/useRepairModule';
import {
  fitDirectPartSchema,
  fitReservedPartSchema,
  removeRepairPartSchema,
  reserveRepairPartSchema,
  updateRepairRecordSchema,
} from '../schemas/repair';

const CLOSED_STATUSES = ['COMPLETED', 'BER', 'ESCALATED_L3'];
const ACTIVE_ALLOCATION_STATUSES = ['RESERVED', 'FITTED'];

function normalizeColor(value) {
  return String(value || '').trim().toLowerCase();
}

function hasColor(value) {
  return normalizeColor(value).length > 0;
}

function formatColor(value) {
  return hasColor(value) ? value : 'unspecified';
}

function isServicePackPart(part) {
  const searchableText = [
    part?.base_code,
    part?.base_name,
    part?.variant_name,
    part?.category_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    Boolean(part?.changes_device_color) ||
    /service\s*pack|screen\s*(and|&|\/)?\s*frame|frame\s*assembly|full\s*chassis|chassis|housing/.test(searchableText)
  );
}

function getActiveAllocations(allocations = []) {
  return allocations.filter((allocation) => ACTIVE_ALLOCATION_STATUSES.includes(allocation.status));
}

function getServicePackAllocation(allocations = []) {
  const servicePackAllocations = getActiveAllocations(allocations).filter(
    (allocation) => isServicePackPart(allocation) && hasColor(allocation.variant_color),
  );

  if (servicePackAllocations.length === 0) {
    return null;
  }

  return servicePackAllocations.sort((left, right) => {
    if (left.status === right.status) {
      return right.id - left.id;
    }
    return left.status === 'FITTED' ? -1 : 1;
  })[0];
}

function getExpectedFinishColor(record, allocations = []) {
  const servicePackAllocation = getServicePackAllocation(allocations);
  return servicePackAllocation?.variant_color || record?.color || null;
}

function getColorWarnings(record, allocations = []) {
  const activeColoredAllocations = getActiveAllocations(allocations).filter((allocation) => hasColor(allocation.variant_color));
  const warnings = [];
  const pushWarning = (warning) => {
    if (!warnings.includes(warning)) {
      warnings.push(warning);
    }
  };

  const servicePackAllocation = getServicePackAllocation(activeColoredAllocations);
  if (servicePackAllocation) {
    activeColoredAllocations.forEach((allocation) => {
      if (allocation.id === servicePackAllocation.id) {
        return;
      }

      if (normalizeColor(allocation.variant_color) !== normalizeColor(servicePackAllocation.variant_color)) {
        pushWarning(
          `${allocation.base_name || allocation.variant_name} is ${formatColor(allocation.variant_color)}, but the service pack colour is ${formatColor(servicePackAllocation.variant_color)}.`,
        );
      }
    });

    return warnings;
  }

  if (!hasColor(record?.color)) {
    return warnings;
  }

  activeColoredAllocations.forEach((allocation) => {
    if (normalizeColor(allocation.variant_color) !== normalizeColor(record.color)) {
      pushWarning(
        `${allocation.base_name || allocation.variant_name} is ${formatColor(allocation.variant_color)}, but the handset is currently ${formatColor(record.color)}.`,
      );
    }
  });

  return warnings;
}

function getSelectionColorWarning(record, allocations = [], selectedPart, excludeAllocationId = null) {
  if (!hasColor(selectedPart?.variant_color)) {
    return null;
  }

  const otherAllocations = getActiveAllocations(allocations).filter((allocation) => allocation.id !== excludeAllocationId);
  const selectedColor = selectedPart.variant_color;

  if (isServicePackPart(selectedPart)) {
    const messages = [];

    if (hasColor(record?.color) && normalizeColor(record.color) !== normalizeColor(selectedColor)) {
      messages.push(`This service pack will change the device colour from ${formatColor(record.color)} to ${formatColor(selectedColor)}.`);
    }

    otherAllocations.forEach((allocation) => {
      if (!hasColor(allocation.variant_color)) {
        return;
      }

      if (normalizeColor(allocation.variant_color) !== normalizeColor(selectedColor)) {
        messages.push(
          `${allocation.base_name || allocation.variant_name} is ${formatColor(allocation.variant_color)} and will not match ${formatColor(selectedColor)}.`,
        );
      }
    });

    return messages.length > 0 ? messages.join('\n') : null;
  }

  const servicePackAllocation = getServicePackAllocation(otherAllocations);
  const referenceColor = servicePackAllocation?.variant_color || record?.color;

  if (hasColor(referenceColor) && normalizeColor(referenceColor) !== normalizeColor(selectedColor)) {
    const referenceLabel = servicePackAllocation ? 'service pack colour' : 'current device colour';
    return `Selected part colour ${formatColor(selectedColor)} does not match the ${referenceLabel} ${formatColor(referenceColor)}.`;
  }

  return null;
}

function confirmColorWarning(message) {
  if (!message) {
    return true;
  }

  return window.confirm(`${message}\n\nContinue anyway?`);
}

export default function RepairRecordDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useRepairRecord(id);


  const updateRecordMutation = useUpdateRepairRecord();
  const reservePartMutation = useReserveRepairPart();
  const fitPartMutation = useFitRepairPart();
  const removePartMutation = useRemoveRepairPart();
  const escalateMutation = useEscalateRepairRecord();

  const [actionComment, setActionComment] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState('');

  const record = data?.record;
  const allocations = data?.allocations || [];
  const compatibleParts = data?.compatibleParts || [];
  const activeServicePackAllocation = getServicePackAllocation(allocations);
  const expectedFinishColor = getExpectedFinishColor(record, allocations);
  const colorWarnings = record ? getColorWarnings(record, allocations) : [];

  useEffect(() => {
    if (record) {
      setActionComment(record.engineer_comments || '');
      setSelectedOutcome(record.outcome || '');
    }
  }, [record]);

  const isClosed = record ? CLOSED_STATUSES.includes(record.status) : false;

  const saveRecord = async ({ status, successMessage }) => {
    const payload = {
      status,
      engineer_comments: actionComment || null,
      ...(status === 'COMPLETED' || status === 'BER' ? {
        outcome: selectedOutcome || null,
      } : {}),
    };

    const validation = updateRepairRecordSchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return false;
    }

    try {
      await updateRecordMutation.mutateAsync({ id, data: validation.data });
      if (successMessage) {
        toast.success(successMessage);
      }
      return true;
    } catch (mutationError) {
      toast.error(mutationError.response?.data?.error?.message || mutationError.message);
      return false;
    }
  };

  const handleSaveAndExit = async () => {
    const saved = await saveRecord({
      status: 'IN_PROGRESS',
      successMessage: 'Progress saved',
    });

    if (!saved) {
      return;
    }

    navigate(`/repair/jobs/${record.repair_job_id}`);
  };

  const handleCompleteRepair = async () => {
    const saved = await saveRecord({
      status: 'COMPLETED',
      successMessage: 'Repair completed',
    });

    if (!saved) {
      return;
    }

    navigate(`/repair/jobs/${record.repair_job_id}`);
  };

  const handleReservePart = async (part) => {
    const colorWarning = getSelectionColorWarning(record, allocations, part);
    if (!confirmColorWarning(colorWarning)) {
      return;
    }

    const payload = {
      part_id: part.part_id,
      part_lot_id: part.part_lot_id,
      quantity: 1,
      notes: null,
    };

    const validation = reserveRepairPartSchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    try {
      await reservePartMutation.mutateAsync({ id, data: validation.data });
      toast.success('Part reserved');
    } catch (mutationError) {
      toast.error(mutationError.response?.data?.error?.message || mutationError.message);
    }
  };

  const handleFitDirect = async (part) => {
    const colorWarning = getSelectionColorWarning(record, allocations, part);
    if (!confirmColorWarning(colorWarning)) {
      return;
    }

    const payload = {
      part_id: part.part_id,
      part_lot_id: part.part_lot_id,
      quantity: 1,
      direct_from_available: true,
      notes: null,
    };

    const validation = fitDirectPartSchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    try {
      await fitPartMutation.mutateAsync({ id, data: validation.data });
      toast.success('Part fitted directly');
    } catch (mutationError) {
      toast.error(mutationError.response?.data?.error?.message || mutationError.message);
    }
  };

  const handleFitReserved = async (allocationId) => {
    const allocation = allocations.find((item) => item.id === allocationId);
    const colorWarning = allocation
      ? getSelectionColorWarning(record, allocations, allocation, allocationId)
      : null;

    if (!confirmColorWarning(colorWarning)) {
      return;
    }

    const payload = {
      repair_part_id: allocationId,
      notes: null,
    };

    const validation = fitReservedPartSchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    try {
      await fitPartMutation.mutateAsync({ id, data: validation.data });
      toast.success('Reserved part fitted');
    } catch (mutationError) {
      toast.error(mutationError.response?.data?.error?.message || mutationError.message);
    }
  };

  const handleRemovePart = async (allocationId) => {
    const payload = {
      repair_part_id: allocationId,
      disposition: 'RESTOCK',
      notes: null,
    };

    const validation = removeRepairPartSchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    try {
      await removePartMutation.mutateAsync({ id, data: validation.data });
      toast.success('Part removed');
    } catch (mutationError) {
      toast.error(mutationError.response?.data?.error?.message || mutationError.message);
    }
  };

  const handleEscalate = async () => {
    const saved = await saveRecord({ status: 'IN_PROGRESS' });
    if (!saved) {
      return;
    }

    try {
      await escalateMutation.mutateAsync(id);
      toast.success('Repair record escalated to Level 3');
      navigate('/level3');
    } catch (mutationError) {
      toast.error(mutationError.response?.data?.error?.message || mutationError.message);
    }
  };

  const isFinalActionLoading = updateRecordMutation.isPending || escalateMutation.isPending;
  const isAnyMutationPending =
    isFinalActionLoading ||
    reservePartMutation.isPending ||
    fitPartMutation.isPending ||
    removePartMutation.isPending;

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading repair record...</div>;
  }

  if (error || !record) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Failed to load repair record.</p>
        <Link to="/repair" className="text-blue-600 hover:text-blue-800">
          Back to Repair Module
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to={`/repair/jobs/${record.repair_job_id}`} className="text-blue-600 hover:text-blue-800 text-sm">
            ← Back to {record.job_number}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Repair Device</h1>
          <p className="text-gray-600 mt-1">
            {record.manufacturer_name} {record.model_name || record.model_number} · IMEI{' '}
            <span className="font-mono">{record.imei}</span>
          </p>
          <p className="text-gray-600 mt-1">{record.fault_description || '-'}</p>
        </div>
        <span className={`badge ${
          record.status === 'COMPLETED'
            ? 'badge-success'
            : record.status === 'IN_PROGRESS'
              ? 'badge-warning'
              : record.status === 'BER'
                ? 'badge-danger'
                : record.status === 'ESCALATED_L3'
                  ? 'badge-info'
                  : 'badge-gray'
        }`}>
          {record.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="card">
        <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/60 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Device & Job Context</h2>
              <p className="text-xs text-slate-500 mt-1">Key handset and workflow details for this repair.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                {record.po_number || '-'}
              </span>
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100/70 px-3 py-1 text-xs font-medium text-blue-800">
                {record.location_code || 'No location'}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Supplier</p>
              <p className="text-sm font-medium text-slate-900 mt-1 truncate">{record.supplier_name || '-'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Color</p>
              <p className="text-sm font-medium text-slate-900 mt-1">{record.color || '-'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Storage</p>
              <p className="text-sm font-medium text-slate-900 mt-1">{record.storage_gb ? `${record.storage_gb}GB` : '-'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Grade</p>
              <p className="text-sm font-medium text-slate-900 mt-1">{record.grade || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={`rounded-lg border px-4 py-3 ${
        colorWarnings.length > 0 ? 'border-amber-300 bg-amber-50' : 'border-blue-200 bg-blue-50'
      }`}>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium text-gray-900">
            Expected finished colour: {formatColor(expectedFinishColor)}
          </span>
          {activeServicePackAllocation && (
            <span className="text-gray-600">
              driven by {activeServicePackAllocation.base_name || activeServicePackAllocation.variant_name}
            </span>
          )}
        </div>
        {colorWarnings.length > 0 ? (
          <div className="mt-3 space-y-1 text-sm text-amber-800">
            {colorWarnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-blue-800">
            No colour mismatch warnings on the currently reserved or fitted parts.
          </p>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Compatible Available Parts</h2>
        {compatibleParts.length === 0 ? (
          <p className="text-gray-500">No compatible in-stock parts were found for this device.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Base</th>
                  <th>SKU</th>
                  <th>Color</th>
                  <th>Lot</th>
                  <th>Supplier</th>
                  <th>Available</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {compatibleParts.map((part) => {
                  const quantityKey = `${part.part_id}:${part.part_lot_id}`;
                  const rowWarning = getSelectionColorWarning(record, allocations, part);
                  return (
                    <tr key={quantityKey}>
                      <td>
                        <div className="font-medium">{part.base_name}</div>
                        <div className="text-xs text-gray-500">{part.base_code}</div>
                        {isServicePackPart(part) && (
                          <div className="text-xs text-blue-700 mt-1">Service Pack</div>
                        )}
                      </td>
                      <td className="font-mono text-sm">{part.sku}</td>
                      <td>
                        <div>{part.variant_color || '-'}</div>
                        {rowWarning && (
                          <div className="text-xs text-amber-700 mt-1">{rowWarning}</div>
                        )}
                      </td>
                      <td>{part.lot_ref || `Lot ${part.part_lot_id}`}</td>
                      <td>{part.supplier_name || '-'}</td>
                      <td>{part.available_quantity}</td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleReservePart(part)}
                            disabled={isClosed || reservePartMutation.isPending}
                          >
                            Reserve
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleFitDirect(part)}
                            disabled={isClosed || fitPartMutation.isPending}
                          >
                            Fit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Allocations</h2>
        {allocations.length === 0 ? (
          <p className="text-gray-500">No parts allocated to this repair record.</p>
        ) : (
          <div className="space-y-4">
            {allocations.map((allocation) => (
              <div key={allocation.id} className="rounded-lg border border-gray-200 px-3 py-2">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium truncate">{allocation.base_name || allocation.variant_name}</p>
                      {isServicePackPart(allocation) && (
                        <span className="badge badge-info">Service Pack</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {allocation.sku} · {allocation.variant_color || 'No color'} · Lot {allocation.lot_ref || allocation.part_lot_id} · Qty {allocation.quantity}
                    </p>
                    {getSelectionColorWarning(record, allocations, allocation, allocation.id) && (
                      <p className="text-xs text-amber-700 mt-1">
                        {getSelectionColorWarning(record, allocations, allocation, allocation.id)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <span className={`badge ${
                      allocation.status === 'FITTED'
                        ? 'badge-success'
                        : allocation.status === 'RESERVED'
                          ? 'badge-warning'
                          : allocation.status === 'REMOVED_FAULTY'
                            ? 'badge-danger'
                            : 'badge-gray'
                    }`}>
                      {allocation.status.replace(/_/g, ' ')}
                    </span>

                    {!isClosed && allocation.status === 'RESERVED' && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleFitReserved(allocation.id)}
                        disabled={fitPartMutation.isPending}
                      >
                        Fit
                      </button>
                    )}

                    {!isClosed && ['RESERVED', 'FITTED'].includes(allocation.status) && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm px-2 py-1 text-xs"
                        onClick={() => handleRemovePart(allocation.id)}
                        disabled={removePartMutation.isPending}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Repair Actions</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
            <textarea
              rows={4}
              value={actionComment}
              onChange={(event) => setActionComment(event.target.value)}
              className="input w-full"
              placeholder="Add repair notes before closing this page..."
              disabled={isClosed || isAnyMutationPending}
            />
          </div>

          {!isClosed && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
              <select
                value={selectedOutcome}
                onChange={(event) => setSelectedOutcome(event.target.value)}
                className="input w-full"
                disabled={isAnyMutationPending}
              >
                <option value="">Select outcome...</option>
                <option value="Repaired">Repaired</option>
                <option value="Part Replaced">Part Replaced</option>
                <option value="Screen Replaced">Screen Replaced</option>
                <option value="Battery Replaced">Battery Replaced</option>
                <option value="Logic Board Repair">Logic Board Repair</option>
                <option value="Software Issue">Software Issue</option>
                <option value="Not Repairable">Not Repairable</option>
              </select>
            </div>
          )}

          {isClosed ? (
            <p className="text-sm text-gray-500">
              This repair record is closed and cannot be edited.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                className="btn bg-red-600 hover:bg-red-700 text-white"
                onClick={handleEscalate}
                disabled={isFinalActionLoading}
              >
                {escalateMutation.isPending ? 'Escalating...' : 'Escalate to Level 3'}
              </button>
              <button
                type="button"
                className="btn bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                onClick={handleSaveAndExit}
                disabled={isFinalActionLoading}
              >
                {updateRecordMutation.isPending ? 'Saving...' : 'Save & Exit'}
              </button>
              <button
                type="button"
                className="btn bg-green-600 hover:bg-green-700 text-white"
                onClick={handleCompleteRepair}
                disabled={isFinalActionLoading}
              >
                {updateRecordMutation.isPending ? 'Saving...' : 'Complete Repair'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
