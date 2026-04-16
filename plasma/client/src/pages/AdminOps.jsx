import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecentAdminOperations, verifyAdminPin } from '../api/admin';
import { getApiErrorMessage } from '../lib/errors';

export default function AdminOps() {
    const navigate = useNavigate();
    const [operations, setOperations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedOperation, setSelectedOperation] = useState(null);
    const [pin, setPin] = useState('');
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchRecentOperations();
    }, []);

    const fetchRecentOperations = async () => {
        try {
            if (!localStorage.getItem('accessToken')) {
                // No token, just show empty list
                setLoading(false);
                return;
            }

            const response = await getRecentAdminOperations(10);

            if (response.success) {
                setOperations(response.operations);
            }
        } catch (error) {
            // Silently handle errors - just means no operations to show
            // Could be auth failure or no operations exist yet
            if (error.response?.status !== 401) {
                console.error('Error fetching operations:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOperationClick = (operationName) => {
        setSelectedOperation(operationName);
        setPin('');
        setReason('');
        setError('');
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await verifyAdminPin({
                pin,
                operation: selectedOperation,
                reason: selectedOperation === 'Location Management' ? reason : null
            });

            if (response.success) {
                const { redirect, queryParams } = response;
                const query = queryParams && queryParams.reason ? `?reason=${encodeURIComponent(queryParams.reason)}` : '';
                navigate(`${redirect}${query}`);
            }
        } catch (error) {
            setError(getApiErrorMessage(error, 'Invalid PIN or error occurred'));
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Admin Operations</h1>

            {/* Warning Alert */}
            <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 rounded-lg mb-6">
                <p className="text-yellow-800">
                    These features are locked. You will be required to enter a PIN code and a reason for Location Management.
                </p>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Locked Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => handleOperationClick('Location Management')}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-4 px-6 rounded-lg transition-colors"
                    >
                        Location Management
                    </button>
                    <button
                        onClick={() => handleOperationClick('Color Check')}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-4 px-6 rounded-lg transition-colors"
                    >
                        Color Check
                    </button>
                    <button
                        onClick={() => handleOperationClick('Label Print')}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-4 px-6 rounded-lg transition-colors"
                    >
                        Label Print
                    </button>
                </div>
            </div>

            {/* Recent Operations Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold">Admin Operations Log</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operation</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {operations.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                        No adminoperations recorded yet
                                    </td>
                                </tr>
                            ) : (
                                operations.map((op) => (
                                    <tr key={op.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {new Date(op.performed_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {new Date(op.performed_at).toLocaleTimeString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{op.display_name || op.username}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{op.operation_type}</td>
                                        <td className="px-6 py-4 text-sm">{op.reason || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <button
                                                onClick={() => navigate(`/admin-ops/${op.id}`)}
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PIN Verification Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Unlock Admin Operation</h3>
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">PIN Code</label>
                                <input
                                    type="password"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                    autoFocus
                                />
                            </div>
                            {selectedOperation === 'Location Management' && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2">Reason</label>
                                    <input
                                        type="text"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Enter reason for location change"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            )}
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                >
                                    Unlock
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
