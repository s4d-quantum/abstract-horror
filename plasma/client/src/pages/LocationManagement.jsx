import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    bulkMoveDevices,
    getLocationManagementDevice,
    getLocationManagementLocations
} from '../api/admin';
import { getApiErrorMessage } from '../lib/errors';

export default function LocationManagement() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [reason, setReason] = useState(searchParams.get('reason') || '');
    const [operationDate, setOperationDate] = useState(new Date().toISOString().split('T')[0]);
    const [newLocation, setNewLocation] = useState('');
    const [locations, setLocations] = useState([]);
    const [devices, setDevices] = useState([]);
    const [scanImei, setScanImei] = useState('');
    const [error, setError] = useState('');
    const [scanning, setScanning] = useState(false);

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            const response = await getLocationManagementLocations();
            if (response.success) {
                setLocations(response.locations);
            }
        } catch (error) {
            console.error('Error fetching locations:', error);
        }
    };

    const handleScan = async (e) => {
        e.preventDefault();
        if (!scanImei.trim()) return;

        setScanning(true);
        setError('');

        try {
            const response = await getLocationManagementDevice(scanImei);

            if (response.success) {
                const device = response.device;

                // Check if already added
                if (devices.find(d => d.imei === device.imei)) {
                    setError('Device already scanned');
                } else {
                    setDevices([...devices, device]);
                }

                setScanImei('');
            }
        } catch (error) {
            setError(getApiErrorMessage(error, 'Device not found'));
        } finally {
            setScanning(false);
        }
    };

    const handleRemove = (imei) => {
        setDevices(devices.filter(d => d.imei !== imei));
    };

    const handleSubmit = async () => {
        if (devices.length === 0) {
            setError('Add at least one device to move');
            return;
        }

        if (!newLocation) {
            setError('Select a new location');
            return;
        }

        if (!reason) {
            setError('Reason is required');
            return;
        }

        try {
            const response = await bulkMoveDevices({
                devices: devices.map(d => ({ imei: d.imei })),
                new_location: newLocation,
                reason,
                operation_date: operationDate
            });

            if (response.success) {
                navigate(`/admin-ops`);
            }
        } catch (error) {
            setError(getApiErrorMessage(error, 'Failed to move devices'));
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Location Management</h1>

            {/* Operation Details */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Operation Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Date</label>
                        <input
                            type="date"
                            value={operationDate}
                            onChange={(e) => setOperationDate(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Reason</label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">Update if needed</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">New Location</label>
                        <select
                            value={newLocation}
                            onChange={(e) => setNewLocation(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                            required
                        >
                            <option value="">Select location</option>
                            {locations.map(loc => (
                                <option key={loc.code} value={loc.code}>{loc.code}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Scan Units */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Scan Units</h2>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleScan} className="mb-4">
                    <label className="block text-sm font-medium mb-2">Scan/Enter IMEI</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={scanImei}
                            onChange={(e) => setScanImei(e.target.value)}
                            placeholder="Scan IMEI and press Enter"
                            className="flex-1 px-3 py-2 border rounded-lg"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={scanning}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
                        >
                            {scanning ? 'Scanning...' : 'Add'}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Scanned units will appear in the list below</p>
                </form>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">IMEI</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Storage</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Current Location</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {devices.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-4 py-4 text-center text-gray-500">No devices added yet</td>
                                </tr>
                            ) : (
                                devices.map(device => (
                                    <tr key={device.imei}>
                                        <td className="px-4 py-2 text-sm">{device.imei}</td>
                                        <td className="px-4 py-2 text-sm">{device.manufacturer} {device.model}</td>
                                        <td className="px-4 py-2 text-sm">{device.grade}</td>
                                        <td className="px-4 py-2 text-sm">{device.color}</td>
                                        <td className="px-4 py-2 text-sm">{device.storage_gb}GB</td>
                                        <td className="px-4 py-2 text-sm">{device.current_location}</td>
                                        <td className="px-4 py-2 text-sm">
                                            <button
                                                onClick={() => handleRemove(device.imei)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
                <button
                    onClick={() => navigate('/admin-ops')}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                    Back to Admin Ops
                </button>
                <button
                    onClick={handleSubmit}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    disabled={devices.length === 0}
                >
                    Move Stock ({devices.length})
                </button>
            </div>
        </div>
    );
}
