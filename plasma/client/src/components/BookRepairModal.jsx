import { useState, useRef, useEffect } from 'react';
import { devicesApi } from '../api/devices';
import { useBookRepair, useAvailableL3Locations } from '../hooks/useLevel3';
import toast from 'react-hot-toast';
import { getApiErrorCode, getApiErrorMessage } from '../lib/errors';

export default function BookRepairModal({ isOpen, onClose, onSuccess }) {
  const [imei, setImei] = useState('');
  const [scanning, setScanning] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [faultDescription, setFaultDescription] = useState('');

  const imeiInputRef = useRef(null);
  const errorBeepRef = useRef(new Audio('/sounds/error-beep.mp3'));
  const duplicateBeepRef = useRef(new Audio('/sounds/duplicate-beep.mp3'));

  const bookRepairMutation = useBookRepair();
  const { data: locationsData, refetch: refetchLocations } = useAvailableL3Locations();

  // Helper to play sound
  const playSound = (audioRef) => {
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(err => console.log('Audio play failed:', err));
  };

  // Auto-focus IMEI input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => imeiInputRef.current?.focus(), 100);
      refetchLocations(); // Refresh locations when modal opens
    }
  }, [isOpen, refetchLocations]);

  // Handle IMEI scan
  const handleScanDevice = async () => {
    if (!imei || imei.length !== 15) {
      toast.error('IMEI must be 15 digits');
      playSound(errorBeepRef);
      return;
    }

    setScanning(true);
    setDeviceInfo(null);

    try {
      console.log('Searching for IMEI:', imei);
      const response = await devicesApi.searchByImei(imei);
      console.log('Device search response:', response);

      if (response.success && response.device) {
        const device = response.device;
        console.log('Device found:', device);

        // Check if device is sold or unsuitable for repair
        if (device.status === 'SHIPPED' || device.status === 'SOLD') {
          console.log('Device has invalid status:', device.status);
          toast(`Device cannot be repaired - already ${device.status.toLowerCase()}`, { icon: '⚠️' });
          playSound(errorBeepRef);
          setScanning(false);
          return;
        }

        setDeviceInfo(device);
        toast.success(`Device found: ${device.manufacturer} ${device.model_name || device.model_number}`);
      } else {
        console.log('Device not found in response');
        toast.error('Device not found');
        playSound(errorBeepRef);
      }
    } catch (err) {
      console.error('Error during device search:', err);
      const errorMessage = getApiErrorMessage(err, 'Error looking up device');
      toast.error(errorMessage);
      playSound(errorBeepRef);
    } finally {
      setScanning(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!deviceInfo) {
      toast.error('Please scan a device first');
      return;
    }

    if (!selectedLocation) {
      toast.error('Please select a location');
      return;
    }

    if (!faultDescription || faultDescription.length < 5) {
      toast.error('Fault description must be at least 5 characters');
      return;
    }

    try {
      await bookRepairMutation.mutateAsync({
        imei: deviceInfo.imei,
        location_code: selectedLocation,
        fault_description: faultDescription
      });

      toast.success('Repair booked successfully');
      handleClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      const errorMessage = getApiErrorMessage(err, 'Failed to book repair');
      const errorCode = getApiErrorCode(err);

      if (errorCode === 'DUPLICATE_REPAIR') {
        playSound(duplicateBeepRef);
      } else if (errorCode === 'LOCATION_OCCUPIED') {
        playSound(errorBeepRef);
        refetchLocations(); // Refresh locations if one is now occupied
      } else {
        playSound(errorBeepRef);
      }

      toast.error(errorMessage);
    }
  };

  // Handle modal close
  const handleClose = () => {
    setImei('');
    setDeviceInfo(null);
    setSelectedLocation('');
    setFaultDescription('');
    setScanning(false);
    onClose();
  };

  // Handle Enter key on IMEI input
  const handleImeiKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScanDevice();
    }
  };

  if (!isOpen) return null;

  const locations = locationsData?.locations || [];
  const isFormValid = deviceInfo && selectedLocation && faultDescription.length >= 5;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Book Level 3 Repair</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={bookRepairMutation.isPending}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {/* IMEI Input Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Device IMEI
            </label>
            <div className="flex gap-2">
              <input
                ref={imeiInputRef}
                type="text"
                value={imei}
                onChange={(e) => setImei(e.target.value.replace(/\D/g, ''))}
                onKeyPress={handleImeiKeyPress}
                maxLength={15}
                placeholder="Scan or enter 15-digit IMEI"
                className="input flex-1 font-mono"
                disabled={scanning || !!deviceInfo}
              />
              {!deviceInfo && (
                <button
                  type="button"
                  onClick={handleScanDevice}
                  disabled={scanning || imei.length !== 15}
                  className="btn btn-primary"
                >
                  {scanning ? 'Scanning...' : 'Scan Device'}
                </button>
              )}
              {deviceInfo && (
                <button
                  type="button"
                  onClick={() => {
                    setDeviceInfo(null);
                    setImei('');
                    setSelectedLocation('');
                    setFaultDescription('');
                    setTimeout(() => imeiInputRef.current?.focus(), 0);
                  }}
                  className="btn btn-secondary"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Device Info Display */}
          {deviceInfo && (
            <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-3">Device Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Manufacturer:</span>
                  <span className="ml-2 font-medium">{deviceInfo.manufacturer}</span>
                </div>
                <div>
                  <span className="text-gray-600">Model:</span>
                  <span className="ml-2 font-medium">{deviceInfo.model_name || deviceInfo.model_number}</span>
                </div>
                <div>
                  <span className="text-gray-600">Storage:</span>
                  <span className="ml-2 font-medium">{deviceInfo.storage_gb ? `${deviceInfo.storage_gb}GB` : '-'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Color:</span>
                  <span className="ml-2 font-medium">{deviceInfo.color || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Grade:</span>
                  <span className="ml-2 font-medium">{deviceInfo.grade || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Current Location:</span>
                  <span className="ml-2 font-medium">{deviceInfo.location || '-'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Location Dropdown */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select L3 Repair Bay
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              disabled={!deviceInfo}
              className="input w-full"
            >
              <option value="">-- Select Location --</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.code}>
                  {loc.code} - {loc.name}
                </option>
              ))}
            </select>
            {locations.length === 0 && deviceInfo && (
              <p className="text-sm text-orange-600 mt-1">
                No available locations. All repair bays are currently occupied.
              </p>
            )}
          </div>

          {/* Fault Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fault Description
            </label>
            <textarea
              value={faultDescription}
              onChange={(e) => setFaultDescription(e.target.value)}
              disabled={!deviceInfo}
              rows={4}
              placeholder="Describe the fault in detail..."
              className="input w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum 5 characters ({faultDescription.length}/5)
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={bookRepairMutation.isPending}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || bookRepairMutation.isPending}
            className="btn btn-primary"
          >
            {bookRepairMutation.isPending ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
