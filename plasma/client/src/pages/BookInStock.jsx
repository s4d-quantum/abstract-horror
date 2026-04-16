import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBookInStock } from '../hooks/usePurchaseOrders';
import { useSuppliers } from '../hooks/useSuppliers';
import { useFilterOptions } from '../hooks/useDevices';
import { lookupTac } from '../api/tac';
import { bookInStockSchema } from '../schemas/goodsIn';

export default function BookInStock() {
  const navigate = useNavigate();

  // Fetch suppliers and locations
  const { data: suppliersData } = useSuppliers();
  const { data: filterOptions } = useFilterOptions();

  const suppliers = suppliersData?.suppliers || [];
  const locations = filterOptions?.options?.locations || [];

  // Form state
  const [supplierId, setSupplierId] = useState('');
  const [requiresQC, setRequiresQC] = useState(true);  // Default true
  const [requiresRepair, setRequiresRepair] = useState(false);
  const [faultDescription, setFaultDescription] = useState('');
  const [poRef, setPoRef] = useState('');
  const [notes, setNotes] = useState('');

  // Scanning state
  const [currentImei, setCurrentImei] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scannedDevices, setScannedDevices] = useState([]);
  const [errorDevices, setErrorDevices] = useState([]); // Track devices with errors

  // Cascade defaults - values propagate to next scanned device
  const [cascadeStorage, setCascadeStorage] = useState('');
  const [cascadeColor, setCascadeColor] = useState('');
  const [cascadeGrade, setCascadeGrade] = useState('');
  const [cascadeLocation, setCascadeLocation] = useState('');

  const imeiInputRef = useRef(null);
  const bookInMutation = useBookInStock();

  // Audio refs for sounds
  const duplicateBeepRef = useRef(new Audio('/sounds/duplicate-beep.mp3'));
  const errorBeepRef = useRef(new Audio('/sounds/error-beep.mp3'));

  // Helper to play sound
  const playSound = (audioRef) => {
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(err => console.log('Audio play failed:', err));
  };

  // Handle IMEI scan
  const handleScanImei = async () => {
    if (!currentImei || currentImei.length !== 15) {
      toast.error('IMEI must be 15 digits');
      playSound(errorBeepRef);
      return;
    }

    if (!supplierId) {
      toast.error('Please select a supplier first');
      playSound(errorBeepRef);
      return;
    }

    // Check for duplicates
    if (scannedDevices.some(d => d.imei === currentImei)) {
      toast('IMEI already scanned', { icon: '⚠️' });
      playSound(duplicateBeepRef);
      setCurrentImei('');
      imeiInputRef.current?.focus();
      return;
    }

    setScanning(true);

    try {
      const tacCode = currentImei.substring(0, 8);
      const response = await lookupTac(tacCode);

      if (response.success) {
        const { manufacturer, model, colors, storages, manufacturerId, modelId } = response.data;

        // Use cascade values if set, otherwise auto-select if only one option
        let defaultStorage = cascadeStorage;
        let defaultColor = cascadeColor;
        let defaultGrade = cascadeGrade;
        let defaultLocation = cascadeLocation;

        // If cascade not set and only one option, auto-select
        if (!defaultStorage && storages.length === 1) {
          defaultStorage = storages[0];
        }
        if (!defaultColor && colors.length === 1) {
          defaultColor = colors[0];
        }

        const newDevice = {
          id: Date.now(),
          imei: currentImei,
          manufacturer_id: manufacturerId,
          model_id: modelId,
          manufacturer_name: manufacturer,
          model_name: model,
          storage_gb: defaultStorage,
          color: defaultColor,
          grade: defaultGrade,
          location_id: defaultLocation,
          tacLookupStorages: storages,
          tacLookupColors: colors
        };

        setScannedDevices(prev => [...prev, newDevice]);
        toast.success(`✓ ${manufacturer} ${model} added`);

        // Clear and refocus with slight delay to ensure state updates complete
        setTimeout(() => {
          setCurrentImei('');
          imeiInputRef.current?.focus();
        }, 0);
      } else {
        toast.error('Device not found in TAC database');
        playSound(errorBeepRef);
      }
    } catch (err) {
      toast.error('Error looking up device: ' + err.message);
      playSound(errorBeepRef);
    } finally {
      setScanning(false);
    }
  };

  // Update device in scanned list
  const updateDevice = (deviceId, updates) => {
    setScannedDevices(prev =>
      prev.map(d => d.id === deviceId ? { ...d, ...updates } : d)
    );

    // Update cascade values when any field changes
    if (updates.storage_gb !== undefined) {
      setCascadeStorage(updates.storage_gb);
    }
    if (updates.color !== undefined) {
      setCascadeColor(updates.color);
    }
    if (updates.grade !== undefined) {
      setCascadeGrade(updates.grade);
    }
    if (updates.location_id !== undefined) {
      setCascadeLocation(updates.location_id);
    }
  };

  // Remove device from scanned list
  const removeDevice = (deviceId) => {
    const device = scannedDevices.find(d => d.id === deviceId);
    setScannedDevices(prev => prev.filter(d => d.id !== deviceId));
    // Clear error state for this device
    if (device && errorDevices.includes(device.imei)) {
      setErrorDevices(prev => prev.filter(imei => imei !== device.imei));
    }
  };

  // Clear all scanned devices
  const clearAllScanned = () => {
    if (window.confirm('Clear all scanned devices?')) {
      setScannedDevices([]);
      setErrorDevices([]);
    }
  };

  // Handle booking complete
  const handleBookingComplete = async () => {
    const payload = {
      supplier_id: parseInt(supplierId) || 0,
      supplier_ref: poRef || null,
      requires_qc: requiresQC,
      requires_repair: requiresRepair,
      fault_description: requiresRepair && faultDescription ? faultDescription : null,
      notes: notes || null,
      devices: scannedDevices.map(d => ({
        imei: d.imei,
        manufacturer_id: d.manufacturer_id,
        model_id: d.model_id,
        storage_gb: d.storage_gb ? parseInt(d.storage_gb) : null,
        color: d.color || '',
        grade: d.grade || null,
        location_id: d.location_id ? parseInt(d.location_id) : 0
      }))
    };

    const validation = bookInStockSchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    try {
      await bookInMutation.mutateAsync(validation.data);

      toast.success(`Successfully booked in ${scannedDevices.length} device(s)!`);

      // Navigate to goods-in list after short delay
      setTimeout(() => {
        navigate('/goods-in');
      }, 1000);

    } catch (err) {
      // Extract error details
      const errorMessage = err.response?.data?.error?.message || err.response?.data?.error || err.message;

      // Check if it's a duplicate IMEI error
      if (errorMessage && errorMessage.includes('Duplicate entry') && errorMessage.includes('uk_imei_instock')) {
        // Extract IMEI from error message like "Duplicate entry '352539591949822-AWAITING_QC' for key 'uk_imei_instock'"
        const imeiMatch = errorMessage.match(/'(\d{15})-/);
        if (imeiMatch) {
          const duplicateImei = imeiMatch[1];
          setErrorDevices([duplicateImei]);
          toast.error(`IMEI ${duplicateImei} already exists in stock. Please remove it from the list.`);
          playSound(errorBeepRef);
        } else {
          toast.error('Duplicate IMEI detected in database. Please check your devices.');
          playSound(errorBeepRef);
        }
      } else {
        toast.error('Error booking in stock: ' + errorMessage);
        playSound(errorBeepRef);
      }
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/goods-in"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Purchase Orders
        </Link>

        <h1 className="text-2xl font-bold text-gray-900">Book In Stock</h1>
        <p className="text-gray-600 mt-1">Scan devices as they arrive and create purchase order</p>
      </div>

      {/* PO Details Form */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Purchase Order Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier *
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="input w-full"
              required
            >
              <option value="">Select supplier...</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PO Ref (Optional)
            </label>
            <input
              type="text"
              value={poRef}
              onChange={(e) => setPoRef(e.target.value)}
              className="input w-full"
              placeholder="External reference..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="requires_qc"
              checked={requiresQC}
              onChange={(e) => setRequiresQC(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="requires_qc" className="text-sm text-gray-700 cursor-pointer">
              Requires QC?
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="requires_repair"
              checked={requiresRepair}
              onChange={(e) => setRequiresRepair(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="requires_repair" className="text-sm text-gray-700 cursor-pointer">
              Requires Repair?
            </label>
          </div>
        </div>

        {requiresRepair && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fault Description (Optional)
            </label>
            <textarea
              value={faultDescription}
              onChange={(e) => setFaultDescription(e.target.value)}
              className="input w-full"
              rows="2"
              placeholder="Describe the known fault for repair job..."
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be used as the initial fault description for the auto-created repair job.
            </p>
          </div>
        )}

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input w-full"
            rows="3"
            placeholder="Any additional notes..."
          />
        </div>
      </div>

      {/* Scanning Section */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Scan Devices</h2>

        <div className="flex gap-2">
          <input
            ref={imeiInputRef}
            type="text"
            value={currentImei}
            onChange={(e) => setCurrentImei(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !scanning && handleScanImei()}
            placeholder="Scan or enter IMEI (15 digits)..."
            maxLength={15}
            className="input flex-1 font-mono text-lg"
            disabled={!supplierId || scanning}
            autoFocus
          />
          <button
            onClick={handleScanImei}
            disabled={!supplierId || !currentImei || scanning}
            className="btn btn-primary"
          >
            {scanning ? 'Scanning...' : 'Add Device'}
          </button>
        </div>

        {!supplierId && (
          <p className="text-sm text-yellow-600 mt-2">
            Please select a supplier before scanning
          </p>
        )}
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
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IMEI</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manufacturer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Storage *</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Color *</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location *</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {scannedDevices.map(device => {
                  const hasError = errorDevices.includes(device.imei);
                  return (
                  <tr key={device.id} className={hasError ? 'bg-red-50' : ''}>
                    <td className={`px-4 py-3 text-sm font-mono ${hasError ? 'text-red-700 font-semibold' : 'text-gray-900'}`}>
                      {device.imei}
                      {hasError && <span className="ml-2 text-xs text-red-600">⚠ Already in stock</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{device.manufacturer_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{device.model_name}</td>
                    <td className="px-4 py-3">
                      <select
                        value={device.storage_gb}
                        onChange={(e) => updateDevice(device.id, { storage_gb: e.target.value })}
                        className={`input input-sm ${!device.storage_gb ? 'border-red-500' : ''}`}
                      >
                        <option value="">Select...</option>
                        {device.tacLookupStorages.map(s => (
                          <option key={s} value={s}>{s}GB</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={device.color}
                        onChange={(e) => updateDevice(device.id, { color: e.target.value })}
                        className={`input input-sm ${!device.color ? 'border-red-500' : ''}`}
                      >
                        <option value="">Select...</option>
                        {device.tacLookupColors.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={device.grade}
                        onChange={(e) => updateDevice(device.id, { grade: e.target.value })}
                        className="input input-sm"
                      >
                        <option value="">Select...</option>
                        {['A', 'B', 'C', 'D', 'E', 'F'].map(g => (
                          <option key={g} value={g}>Grade {g}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={device.location_id}
                        onChange={(e) => updateDevice(device.id, { location_id: e.target.value })}
                        className={`input input-sm ${!device.location_id ? 'border-red-500' : ''}`}
                      >
                        <option value="">Select...</option>
                        {locations.map(loc => (
                          <option key={loc.id} value={loc.id}>{loc.code}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => removeDevice(device.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Remove device"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Link to="/goods-in" className="btn btn-secondary">
          Cancel
        </Link>
        <button
          onClick={handleBookingComplete}
          disabled={!supplierId || scannedDevices.length === 0 || bookInMutation.isPending}
          className="btn btn-primary"
        >
          {bookInMutation.isPending
            ? 'Processing...'
            : `Booking Complete (${scannedDevices.length} devices)`}
        </button>
      </div>
    </div>
  );
}
