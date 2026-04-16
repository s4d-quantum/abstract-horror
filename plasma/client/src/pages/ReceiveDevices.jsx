import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { usePurchaseOrder, useReceiveDevices } from '../hooks/usePurchaseOrders';
import { useFilterOptions } from '../hooks/useDevices';
import { lookupTac } from '../api/tac';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../lib/errors';

export default function ReceiveDevices() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = usePurchaseOrder(id);
  const { data: filterOptions } = useFilterOptions();
  const receiveMutation = useReceiveDevices();

  const order = data?.order;
  const options = filterOptions?.options || {};

  const [scannedDevices, setScannedDevices] = useState([]);
  const [currentImei, setCurrentImei] = useState('');
  const [scanning, setScanning] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [scanError, setScanError] = useState(null);

  const imeiInputRef = useRef(null);

  // Auto-focus IMEI input when location is selected
  useEffect(() => {
    if (selectedLocation && imeiInputRef.current) {
      imeiInputRef.current.focus();
    }
  }, [selectedLocation]);

  const updateScannedDevice = (deviceId, updates) => {
    setScannedDevices(prev => prev.map(d =>
      d.id === deviceId ? { ...d, ...updates } : d
    ));
  };

  const removeScannedDevice = (deviceId) => {
    setScannedDevices(prev => prev.filter(d => d.id !== deviceId));
    toast.success('Device removed from scan list');
  };

  const clearAllScanned = () => {
    if (window.confirm('Remove all scanned devices? This cannot be undone.')) {
      setScannedDevices([]);
      toast.success('All scanned devices cleared');
    }
  };

  const handleScanDevice = async () => {
    const imei = currentImei.trim();

    // Validation
    if (!imei) return;

    if (imei.length !== 15 || !/^\d{15}$/.test(imei)) {
      setScanError('IMEI must be exactly 15 digits');
      toast.error('Invalid IMEI format');
      return;
    }

    // Check for duplicates
    if (scannedDevices.some(d => d.imei === imei)) {
      setScanError('This device has already been scanned');
      toast('Device already in scan list', { icon: '⚠️' });
      setCurrentImei('');
      imeiInputRef.current?.focus();
      return;
    }

    setScanError(null);
    setScanning(true);

    try {
      const tacCode = imei.substring(0, 8);
      const response = await lookupTac(tacCode);

      if (response.success && response.data) {
        const { manufacturer, model, colors, storages, manufacturerId, modelId } = response.data;

        let defaultColor = '';
        let defaultStorage = '';
        let matchedLineId = '';

        // Try to automatically match to a PO line
        if (order.lines && manufacturerId && modelId) {
          console.log('Matching device:', { manufacturerId, modelId, manufacturer, model });
          console.log('Order lines:', order.lines.map(l => ({
            id: l.id,
            manufacturer_id: l.manufacturer.id,
            model_id: l.model.id,
            manufacturer: l.manufacturer.name,
            model: l.model.name || l.model.number
          })));

          const matchingLines = order.lines.filter(line =>
            line.manufacturer.id === manufacturerId &&
            line.model.id === modelId
          );

          console.log('Matching lines found:', matchingLines.length);

          if (matchingLines.length === 1) {
            // Exact match
            const matchedLine = matchingLines[0];
            matchedLineId = matchedLine.id;
            console.log('Matched to line:', matchedLineId);

            if (matchedLine.storage && storages.includes(matchedLine.storage)) {
              defaultStorage = matchedLine.storage;
            }
            if (matchedLine.color && colors.includes(matchedLine.color)) {
              defaultColor = matchedLine.color;
            }
          } else if (matchingLines.length > 1) {
            // Multiple matches - try to narrow down
            if (storages.length === 1) {
              const storageMatch = matchingLines.filter(line => line.storage === storages[0]);
              if (storageMatch.length === 1) {
                matchedLineId = storageMatch[0].id;
                defaultStorage = storages[0];
                if (storageMatch[0].color && colors.includes(storageMatch[0].color)) {
                  defaultColor = storageMatch[0].color;
                }
              } else if (storageMatch.length > 1 && colors.length === 1) {
                const colorMatch = storageMatch.filter(line => line.color === colors[0]);
                if (colorMatch.length === 1) {
                  matchedLineId = colorMatch[0].id;
                  defaultStorage = storages[0];
                  defaultColor = colors[0];
                }
              }
            } else if (colors.length === 1) {
              const colorMatch = matchingLines.filter(line => line.color === colors[0]);
              if (colorMatch.length === 1) {
                matchedLineId = colorMatch[0].id;
                defaultColor = colors[0];
                if (colorMatch[0].storage && storages.includes(colorMatch[0].storage)) {
                  defaultStorage = colorMatch[0].storage;
                }
              }
            }
          }
        }

        // Set defaults: if only one option, auto-select it
        if (!defaultStorage && storages.length === 1) {
          defaultStorage = storages[0];
        }
        if (!defaultColor && colors.length === 1) {
          defaultColor = colors[0];
        }

        // Check if device matches an order line
        if (!matchedLineId && order.lines && order.lines.length > 0) {
          // Device doesn't match any order line
          const confirm = window.confirm(
            `⚠️ WARNING: ${manufacturer} ${model} does NOT match any expected items in this order.\n\n` +
            `Expected items are:\n${order.lines.map(l => `• ${l.manufacturer.name} ${l.model.name || l.model.number}`).join('\n')}\n\n` +
            `Do you want to add it anyway?`
          );

          if (!confirm) {
            setCurrentImei('');
            setScanning(false);
            imeiInputRef.current?.focus();
            return;
          }
        }

        // Add device to scanned list
        const newDevice = {
          id: Date.now(),
          imei,
          manufacturer_id: manufacturerId,
          model_id: modelId,
          manufacturer_name: manufacturer,
          model_name: model,
          storage_gb: defaultStorage,
          color: defaultColor,
          grade: '',
          line_id: matchedLineId,
          tacLookupColors: colors,
          tacLookupStorages: storages
        };

        setScannedDevices(prev => [...prev, newDevice]);

        if (matchedLineId) {
          toast.success(`✓ ${manufacturer} ${model} matched and added`);
        } else {
          toast(`⚠ ${manufacturer} ${model} added (no match)`, { icon: '⚠️' });
        }

        // Clear input and refocus
        setCurrentImei('');
        setScanning(false);
        imeiInputRef.current?.focus();
      } else {
        setScanError('Device not found in TAC database');
        toast.error('Device not found in database');
        setScanning(false);
      }
    } catch (error) {
      console.error('Error scanning device:', error);
      setScanError(getApiErrorMessage(error, 'Failed to lookup device'));
      toast.error('Failed to lookup device');
      setScanning(false);
    }
  };

  const handleSaveAndClose = async () => {
    if (scannedDevices.length === 0) {
      toast('No devices to save', { icon: '⚠️' });
      return;
    }

    // Validate all devices have required fields
    const invalidDevices = scannedDevices.filter(d => !d.storage_gb || !d.color);
    if (invalidDevices.length > 0) {
      toast.error('Some devices are missing storage or color. Please fill in all fields.');
      return;
    }

    try {
      const devicesToReceive = scannedDevices.map(d => ({
        imei: d.imei,
        manufacturer_id: parseInt(d.manufacturer_id),
        model_id: parseInt(d.model_id),
        storage_gb: parseInt(d.storage_gb),
        color: d.color,
        grade: d.grade || null,
        line_id: d.line_id || null,
        supplier_id: order.supplier.id
      }));

      await receiveMutation.mutateAsync({
        id: order.id,
        data: {
          devices: devicesToReceive,
          location_id: parseInt(selectedLocation)
        }
      });

      // Wait for query invalidation to complete
      await queryClient.invalidateQueries(['purchase-orders', id]);
      await queryClient.refetchQueries(['purchase-orders', id]);

      toast.success(`Successfully received ${scannedDevices.length} device(s)`);

      // Navigate after a short delay to show toast
      setTimeout(() => {
        navigate(`/goods-in/${order.id}`);
      }, 500);
    } catch (error) {
      toast.error(`Error receiving devices: ${getApiErrorMessage(error, 'Unknown error')}`);
    }
  };

  if (!order) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // Calculate just scanned counts per line
  const getJustScannedCount = (lineId) => {
    return scannedDevices.filter(d => d.line_id === lineId).length;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/goods-in/${id}`}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Purchase Order
        </Link>

        <h1 className="text-2xl font-bold text-gray-900">
          Receive Devices - PO {order.poNumber}
        </h1>
        <p className="text-gray-600 mt-1">
          Supplier: {order.supplier.name}
        </p>
      </div>

      {/* Summary */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Expected Quantity</p>
            <p className="text-2xl font-bold text-gray-900">{order.expectedQty}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Already Received</p>
            <p className="text-2xl font-bold text-gray-900">{order.receivedQty}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Just Scanned</p>
            <p className="text-2xl font-bold text-blue-600">{scannedDevices.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Remaining</p>
            <p className="text-2xl font-bold text-gray-900">
              {order.expectedQty - order.receivedQty - scannedDevices.length}
            </p>
          </div>
        </div>
      </div>

      {/* Expected Items */}
      {order.lines && order.lines.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Expected Items</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Device</th>
                  <th className="text-center">Expected</th>
                  <th className="text-center">Already Received</th>
                  <th className="text-center">Just Scanned</th>
                  <th className="text-center">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line) => {
                  const justScanned = getJustScannedCount(line.id);
                  const remaining = line.expectedQty - line.receivedQty - justScanned;

                  return (
                    <tr key={line.id}>
                      <td>
                        {line.manufacturer.name} {line.model.name || line.model.number}
                        {line.storage ? ` ${line.storage}GB` : ''}
                        {line.color ? ` ${line.color}` : ''}
                      </td>
                      <td className="text-center">{line.expectedQty}</td>
                      <td className="text-center">{line.receivedQty}</td>
                      <td className="text-center">
                        <span className="font-bold text-blue-600">{justScanned}</span>
                      </td>
                      <td className="text-center">
                        <span className={remaining === 0 ? 'text-green-600 font-semibold' : 'text-gray-600'}>
                          {remaining}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scanning Section */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Scan Devices</h2>

        {/* Location selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Receiving Location *
          </label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="input max-w-md"
            required
          >
            <option value="">Select Location</option>
            {options.locations?.map(loc => (
              <option key={loc.id} value={loc.id}>
                {loc.code} - {loc.name}
              </option>
            ))}
          </select>
        </div>

        {/* IMEI Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scan IMEI
          </label>
          <div className="flex gap-2 max-w-md">
            <input
              ref={imeiInputRef}
              type="text"
              value={currentImei}
              onChange={(e) => {
                setCurrentImei(e.target.value);
                setScanError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleScanDevice();
                }
              }}
              placeholder="Scan or enter 15-digit IMEI..."
              maxLength={15}
              className="input flex-1 font-mono text-lg"
              disabled={!selectedLocation || scanning}
              autoFocus={!!selectedLocation}
            />
            <button
              onClick={handleScanDevice}
              disabled={!selectedLocation || !currentImei || scanning}
              className="btn btn-primary"
            >
              {scanning ? 'Looking up...' : 'Add'}
            </button>
          </div>
          {scanError && (
            <p className="text-xs text-red-600 mt-1">{scanError}</p>
          )}
          {!selectedLocation && (
            <p className="text-xs text-gray-500 mt-1">Please select a location first</p>
          )}
        </div>
      </div>

      {/* Scanned Devices Table */}
      {scannedDevices.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Scanned Devices ({scannedDevices.length})
            </h2>
            <button
              onClick={clearAllScanned}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Clear All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>IMEI</th>
                  <th>Manufacturer</th>
                  <th>Model</th>
                  <th>Storage</th>
                  <th>Color</th>
                  <th>Grade</th>
                  <th>Match</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scannedDevices.map((device) => (
                  <tr key={device.id}>
                    <td className="font-mono text-sm">{device.imei}</td>
                    <td>{device.manufacturer_name}</td>
                    <td>{device.model_name}</td>
                    <td>
                      <select
                        value={device.storage_gb}
                        onChange={(e) => updateScannedDevice(device.id, { storage_gb: e.target.value })}
                        className={`input input-sm ${!device.storage_gb ? 'border-red-300' : ''}`}
                      >
                        <option value="">Select</option>
                        {device.tacLookupStorages.map(storage => (
                          <option key={storage} value={storage}>{storage}GB</option>
                        ))}
                      </select>
                      {!device.storage_gb && (
                        <span className="text-xs text-red-600">Required</span>
                      )}
                    </td>
                    <td>
                      <select
                        value={device.color}
                        onChange={(e) => updateScannedDevice(device.id, { color: e.target.value })}
                        className={`input input-sm ${!device.color ? 'border-red-300' : ''}`}
                      >
                        <option value="">Select</option>
                        {device.tacLookupColors.map(color => (
                          <option key={color} value={color}>{color}</option>
                        ))}
                      </select>
                      {!device.color && (
                        <span className="text-xs text-red-600">Required</span>
                      )}
                    </td>
                    <td>
                      <select
                        value={device.grade}
                        onChange={(e) => updateScannedDevice(device.id, { grade: e.target.value })}
                        className="input input-sm"
                      >
                        <option value="">Select</option>
                        {options.grades?.map(grade => (
                          <option key={grade} value={grade}>Grade {grade}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {device.line_id ? (
                        <span className="text-xs text-green-600 font-semibold">✓ Matched</span>
                      ) : (
                        <span className="text-xs text-yellow-600">⚠ Manual</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => removeScannedDevice(device.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Remove from list"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <Link
          to={`/goods-in/${id}`}
          className="btn btn-secondary"
        >
          Cancel
        </Link>
        <button
          onClick={handleSaveAndClose}
          disabled={scannedDevices.length === 0 || !selectedLocation || receiveMutation.isPending}
          className="btn btn-primary"
        >
          {receiveMutation.isPending
            ? 'Saving...'
            : `Save & Close (${scannedDevices.length} device${scannedDevices.length !== 1 ? 's' : ''})`}
        </button>
      </div>
    </div>
  );
}
