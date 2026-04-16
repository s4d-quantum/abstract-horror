import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useBulkParts,
  useBulkRepair,
  useRepairJob,
} from '../hooks/useRepairModule';
import { bulkRepairSchema } from '../schemas/repair';

const OPEN_RECORD_STATUSES = ['PENDING', 'IN_PROGRESS'];

function getModelKey(record) {
  return `${record.manufacturer_id}:${record.model_id}`;
}

function getModelLabel(record) {
  return [record.manufacturer_name, record.model_name || record.model_number].filter(Boolean).join(' ');
}

function getPartKey(part) {
  return `${part.part_id}:${part.part_lot_id}`;
}

function normalizeColor(value) {
  return String(value || '').trim().toLowerCase();
}

function getSelectedFinishColor(device, selectedParts) {
  const colorChangingPart = selectedParts.find(
    (part) => part.changes_device_color && normalizeColor(part.variant_color),
  );

  return colorChangingPart?.variant_color || device.color || '-';
}

export default function BulkRepairPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const { data: jobData, isLoading: jobLoading, error } = useRepairJob(id);
  const bulkRepairMutation = useBulkRepair();

  const [scanValue, setScanValue] = useState('');
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [selectedPartKeys, setSelectedPartKeys] = useState([]);
  const [scanError, setScanError] = useState(null);
  const [deviceFilter, setDeviceFilter] = useState('');
  const [devicePage, setDevicePage] = useState(0);

  const DEVICES_PER_PAGE = 5;

  const job = jobData?.job;
  const records = jobData?.records || [];
  const openRecords = useMemo(
    () => records.filter((record) => OPEN_RECORD_STATUSES.includes(record.status)),
    [records],
  );

  const filteredRecords = useMemo(() => {
    if (!deviceFilter.trim()) return openRecords;
    const q = deviceFilter.trim().toLowerCase();
    return openRecords.filter((record) =>
      record.imei.toLowerCase().includes(q)
      || (record.model_name || '').toLowerCase().includes(q)
      || (record.model_number || '').toLowerCase().includes(q),
    );
  }, [openRecords, deviceFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / DEVICES_PER_PAGE));
  const paginatedRecords = filteredRecords.slice(
    devicePage * DEVICES_PER_PAGE,
    devicePage * DEVICES_PER_PAGE + DEVICES_PER_PAGE,
  );

  useEffect(() => {
    setDevicePage(0);
  }, [deviceFilter]);

  const selectedDeviceIds = selectedDevices.map((device) => device.device_id);
  const { data: bulkPartsData, isLoading: partsLoading } = useBulkParts(
    id,
    selectedDeviceIds.length > 0 ? selectedDeviceIds : null,
  );

  const compatibleParts = bulkPartsData?.parts || [];
  const selectedModelKey = selectedDevices[0] ? getModelKey(selectedDevices[0]) : null;
  const selectedModelLabel = selectedDevices[0] ? getModelLabel(selectedDevices[0]) : null;
  const selectedParts = compatibleParts.filter((part) => selectedPartKeys.includes(getPartKey(part)));
  const changingColorParts = selectedParts.filter(
    (part) => part.changes_device_color && normalizeColor(part.variant_color),
  );
  const selectedColorOptions = Array.from(
    new Set(changingColorParts.map((part) => normalizeColor(part.variant_color))),
  );
  const hasColorConflict = selectedColorOptions.length > 1;

  const focusScanner = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    focusScanner();
  }, [focusScanner]);

  useEffect(() => {
    const selectableKeys = new Set(
      compatibleParts
        .filter((part) => part.can_allocate_to_all)
        .map((part) => getPartKey(part)),
    );

    setSelectedPartKeys((prev) => prev.filter((key) => selectableKeys.has(key)));
  }, [compatibleParts]);

  const playErrorBeep = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = 440;
      oscillator.type = 'square';
      gainNode.gain.value = 0.3;
      oscillator.start();

      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 200);
    } catch {
      // Audio output is not always available.
    }
  }, []);

  const pushScanError = useCallback((message) => {
    setScanError(message);
    playErrorBeep();
    focusScanner();
  }, [focusScanner, playErrorBeep]);

  const addDevice = useCallback((record) => {
    if (!record) {
      return false;
    }

    if (!OPEN_RECORD_STATUSES.includes(record.status)) {
      pushScanError(`IMEI ${record.imei} does not have an open repair record`);
      return false;
    }

    if (selectedDevices.some((device) => device.device_id === record.device_id)) {
      pushScanError(`IMEI ${record.imei} has already been added`);
      return false;
    }

    const recordModelKey = getModelKey(record);
    if (selectedModelKey && selectedModelKey !== recordModelKey) {
      pushScanError(
        `${getModelLabel(record)} does not match ${selectedModelLabel}. Bulk repair only supports one manufacturer/model at a time.`,
      );
      return false;
    }

    setSelectedDevices((prev) => [...prev, record]);
    setScanError(null);
    focusScanner();
    return true;
  }, [focusScanner, pushScanError, selectedDevices, selectedModelKey, selectedModelLabel]);

  const handleScannerInput = (event) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();

    const imei = scanValue.trim();
    setScanValue('');

    if (!imei || imei.length !== 15) {
      pushScanError('Invalid IMEI format');
      return;
    }

    const record = records.find((item) => item.imei === imei);
    if (!record) {
      pushScanError(`IMEI ${imei} is not in this repair job`);
      return;
    }

    addDevice(record);
  };

  const removeDevice = (deviceId) => {
    setSelectedDevices((prev) => prev.filter((device) => device.device_id !== deviceId));
    setScanError(null);
    focusScanner();
  };

  const togglePart = (part) => {
    if (!part.can_allocate_to_all) {
      return;
    }

    const partKey = getPartKey(part);
    setSelectedPartKeys((prev) => (
      prev.includes(partKey)
        ? prev.filter((key) => key !== partKey)
        : [...prev, partKey]
    ));
  };

  const clearSelection = () => {
    setSelectedDevices([]);
    setSelectedPartKeys([]);
    setScanError(null);
    setScanValue('');
    focusScanner();
  };

  const handleCompleteBulkRepair = async () => {
    if (selectedDevices.length === 0) {
      toast.error('Add at least one device to bulk repair');
      return;
    }

    if (selectedPartKeys.length === 0) {
      toast.error('Select at least one part lot to allocate');
      return;
    }

    if (hasColorConflict) {
      toast.error('Selected color-changing parts do not agree on the final handset color');
      return;
    }

    const selectedAllocations = selectedPartKeys.map((partKey) => (
      compatibleParts.find((part) => getPartKey(part) === partKey)
    )).filter(Boolean);

    const insufficientPart = selectedAllocations.find((part) => !part.can_allocate_to_all);
    if (insufficientPart) {
      toast.error(`${insufficientPart.sku} does not have enough stock for all selected devices`);
      return;
    }

    const payload = {
      device_ids: selectedDevices.map((device) => device.device_id),
      part_allocations: selectedAllocations.map((part) => ({
        part_id: part.part_id,
        part_lot_id: part.part_lot_id,
      })),
    };

    const validation = bulkRepairSchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    try {
      await bulkRepairMutation.mutateAsync({ jobId: id, data: validation.data });
      toast.success(`Bulk repair completed for ${selectedDevices.length} device(s)`);
      navigate(`/repair/jobs/${id}`);
    } catch (mutationError) {
      toast.error(mutationError.response?.data?.error?.message || mutationError.message);
    }
  };

  if (jobLoading) {
    return <div className="text-center py-12 text-gray-500">Loading repair job...</div>;
  }

  if (error || !job) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Failed to load repair job.</p>
        <Link to="/repair" className="text-blue-600 hover:text-blue-800">
          Back to Repair Module
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link to={`/repair/jobs/${id}`} className="text-blue-600 hover:text-blue-800 text-sm">
            ← Back to {job.job_number}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Bulk Repair</h1>
          <p className="text-gray-600 mt-1">
            Scan IMEIs or add open devices from this job, then fit the same parts to all selected units.
          </p>
        </div>

        {selectedDevices.length > 0 && (
          <button type="button" onClick={clearSelection} className="btn btn-secondary">
            Clear Selection
          </button>
        )}
      </div>

      <div className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Scan IMEIs</h2>
          <p className="text-sm text-gray-500 mt-1">
            Devices must be in this repair job and share the same manufacturer and model.
          </p>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={scanValue}
          onChange={(event) => { setScanValue(event.target.value); setScanError(null); }}
          onKeyDown={handleScannerInput}
          className="input w-full font-mono"
          placeholder="Scan or type IMEI and press Enter"
          autoFocus
        />

        {scanError ? (
          <p className="text-sm text-red-600">{scanError}</p>
        ) : (
          <p className="text-sm text-gray-500">
            {openRecords.length} open device(s) available in this job.
          </p>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Open Devices in Job</h2>
            <p className="text-sm text-gray-500 mt-1">
              Add devices manually when they are not being scanned.
            </p>
          </div>
          <span className="text-sm text-gray-500">
            {selectedDevices.length}/{openRecords.length} selected
          </span>
        </div>

        <input
          type="text"
          value={deviceFilter}
          onChange={(event) => setDeviceFilter(event.target.value)}
          className="input w-full mb-4"
          placeholder="Filter by IMEI or model"
        />

        {openRecords.length === 0 ? (
          <p className="text-gray-500 py-6 text-center">This repair job has no open repair records available for bulk repair.</p>
        ) : filteredRecords.length === 0 ? (
          <p className="text-gray-500 py-6 text-center">No devices match your filter.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>IMEI</th>
                    <th>Manufacturer</th>
                    <th>Model</th>
                    <th>Color</th>
                    <th>Storage</th>
                    <th>Fault</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((record) => {
                    const alreadySelected = selectedDevices.some((device) => device.device_id === record.device_id);
                    const modelMismatch = Boolean(selectedModelKey && selectedModelKey !== getModelKey(record));

                    return (
                      <tr key={record.id} className={alreadySelected ? 'bg-blue-50' : ''}>
                        <td className="font-mono text-sm">{record.imei}</td>
                        <td>{record.manufacturer_name}</td>
                        <td>{record.model_name || record.model_number}</td>
                        <td>{record.color || '-'}</td>
                        <td>{record.storage_gb ? `${record.storage_gb}GB` : '-'}</td>
                        <td className="max-w-xs truncate" title={record.fault_description || '-'}>
                          {record.fault_description || '-'}
                        </td>
                        <td>
                          <span className={`badge ${record.status === 'IN_PROGRESS' ? 'badge-warning' : 'badge-gray'}`}>
                            {record.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => addDevice(record)}
                            disabled={alreadySelected || modelMismatch}
                            className="btn btn-sm btn-secondary"
                          >
                            {alreadySelected ? 'Added' : modelMismatch ? 'Wrong Model' : 'Add'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-sm text-gray-500">
                  Showing {devicePage * DEVICES_PER_PAGE + 1}
                  –{Math.min((devicePage + 1) * DEVICES_PER_PAGE, filteredRecords.length)}
                  {' '}of {filteredRecords.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDevicePage((p) => Math.max(0, p - 1))}
                    disabled={devicePage === 0}
                    className="btn btn-sm btn-secondary"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500">
                    Page {devicePage + 1} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDevicePage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={devicePage >= totalPages - 1}
                    className="btn btn-sm btn-secondary"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedDevices.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card">
              <p className="text-xs uppercase tracking-wide text-gray-500">Selected Model</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{selectedModelLabel}</p>
            </div>
            <div className="card">
              <p className="text-xs uppercase tracking-wide text-gray-500">Selected Devices</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{selectedDevices.length}</p>
            </div>
            <div className="card">
              <p className="text-xs uppercase tracking-wide text-gray-500">Selected Part Lots</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{selectedPartKeys.length}</p>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Selected Devices</h2>
                <p className="text-sm text-gray-500 mt-1">
                  These units will all receive the same selected parts.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>IMEI</th>
                    <th>Manufacturer</th>
                    <th>Model</th>
                    <th>Current Color</th>
                    <th>Finish Color</th>
                    <th>Storage</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDevices.map((device) => (
                    <tr key={device.device_id}>
                      <td className="font-mono text-sm">{device.imei}</td>
                      <td>{device.manufacturer_name}</td>
                      <td>{device.model_name || device.model_number}</td>
                      <td>{device.color || '-'}</td>
                      <td>{getSelectedFinishColor(device, selectedParts)}</td>
                      <td>{device.storage_gb ? `${device.storage_gb}GB` : '-'}</td>
                      <td>
                        <span className={`badge ${device.status === 'IN_PROGRESS' ? 'badge-warning' : 'badge-gray'}`}>
                          {device.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => removeDevice(device.device_id)}
                          className="btn btn-sm btn-secondary"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Compatible Parts</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Each selected part lot is allocated once per selected device.
                </p>
              </div>
              <span className="text-sm text-gray-500">
                Need {selectedDevices.length} per selected lot
              </span>
            </div>

            {hasColorConflict && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Selected color-changing parts do not agree on the final handset color. Use matching service-pack colors before completing bulk repair.
              </div>
            )}

            {partsLoading ? (
              <div className="text-center py-6 text-gray-500">Loading compatible parts...</div>
            ) : compatibleParts.length === 0 ? (
              <p className="text-gray-500 py-6 text-center">No shared in-stock parts were found for the selected devices.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Select</th>
                      <th>Base</th>
                      <th>SKU</th>
                      <th>Color Impact</th>
                      <th>Lot</th>
                      <th>Supplier</th>
                      <th>Available</th>
                      <th>Needed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compatibleParts.map((part) => {
                      const partKey = getPartKey(part);
                      const isSelected = selectedPartKeys.includes(partKey);

                      return (
                        <tr key={partKey} className={isSelected ? 'bg-blue-50' : ''}>
                          <td>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => togglePart(part)}
                              disabled={!part.can_allocate_to_all}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td>
                            <div className="font-medium">{part.base_name}</div>
                            <div className="text-xs text-gray-500">{part.base_code}</div>
                          </td>
                          <td className="font-mono text-sm">{part.sku}</td>
                          <td>
                            {part.changes_device_color && part.variant_color
                              ? `Changes handset to ${part.variant_color}`
                              : part.variant_color || '-'}
                          </td>
                          <td>{part.lot_ref || `Lot ${part.part_lot_id}`}</td>
                          <td>{part.supplier_name || '-'}</td>
                          <td>{part.available_quantity}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <span>{part.required_quantity}</span>
                              <span className={`badge ${part.can_allocate_to_all ? 'badge-success' : 'badge-danger'}`}>
                                {part.can_allocate_to_all ? 'Enough' : 'Short'}
                              </span>
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

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(`/repair/jobs/${id}`)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCompleteBulkRepair}
              disabled={
                bulkRepairMutation.isPending
                || selectedDevices.length === 0
                || selectedPartKeys.length === 0
                || hasColorConflict
              }
              className="btn bg-green-600 hover:bg-green-700 text-white"
            >
              {bulkRepairMutation.isPending
                ? 'Processing...'
                : `Complete Bulk Repair (${selectedDevices.length} devices)`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
