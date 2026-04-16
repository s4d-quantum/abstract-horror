import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Package, MapPin, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useDevice, useDeviceHistory } from '../hooks/useDevices';

export default function DeviceDetail() {
    const { id } = useParams();
    const { data, isLoading } = useDevice(id);
    const { data: historyData } = useDeviceHistory(id);

    const device = data?.device;
    const history = historyData?.history || [];

    const getStatusBadgeClass = (status) => {
        const statusMap = {
            IN_STOCK: 'badge-success',
            AWAITING_QC: 'badge-warning',
            IN_QC: 'badge-warning',
            AWAITING_REPAIR: 'badge-danger',
            IN_REPAIR: 'badge-danger',
            IN_LEVEL3: 'badge-info',
            SHIPPED: 'badge-gray',
            RETURNED: 'badge-warning',
            SCRAPPED: 'badge-gray'
        };
        return statusMap[status] || 'badge-gray';
    };

    if (isLoading) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Loading device...</p>
            </div>
        );
    }

    if (!device) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Device not found</p>
                <Link to="/inventory" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
                    Back to Inventory
                </Link>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <Link
                    to="/inventory"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Inventory
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Device Details</h1>
                        <p className="text-gray-600 mt-1">
                            IMEI: <span className="font-mono font-semibold">{device.imei}</span>
                        </p>
                    </div>
                    <div>
                        <span className={`badge ${getStatusBadgeClass(device.status)}`}>
                            {device.status}
                        </span>
                    </div>
                </div>
            </div>

            {/* Device Information Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Basic Information */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                        <Package className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                    </div>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Manufacturer</p>
                                <p className="font-medium text-gray-900">{device.manufacturer.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">TAC Code</p>
                                <p className="font-mono text-sm font-medium text-gray-900">{device.tacCode}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Model Number</p>
                                <p className="font-mono text-sm font-medium text-gray-900">{device.model.number}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Model Name</p>
                                <p className="font-medium text-gray-900">{device.model.name || '-'}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Storage</p>
                                <p className="font-medium text-gray-900">
                                    {device.storage ? `${device.storage}GB` : '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Color</p>
                                <p className="font-medium text-gray-900">{device.color || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Grade</p>
                                <p className="font-medium text-gray-900">
                                    {device.grade ? `Grade ${device.grade}` : '-'}
                                </p>
                            </div>
                        </div>
                        {device.oemColor && (
                            <div>
                                <p className="text-sm text-gray-500">OEM Color Code</p>
                                <p className="font-mono text-sm font-medium text-gray-900">{device.oemColor}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Location & Origin */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                        <MapPin className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Location & Origin</h2>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm text-gray-500">Current Location</p>
                            <p className="font-medium text-gray-900">
                                {device.location ? (
                                    <>
                                        <span className="font-mono">{device.location.code}</span>
                                        {device.location.name && ` - ${device.location.name}`}
                                    </>
                                ) : (
                                    '-'
                                )}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Supplier</p>
                            <p className="font-medium text-gray-900">
                                {device.supplier ? (
                                    <>
                                        <span className="font-mono text-sm">{device.supplier.code}</span>{' '}
                                        - {device.supplier.name}
                                    </>
                                ) : (
                                    '-'
                                )}
                            </p>
                        </div>
                        {device.purchaseOrderId && (
                            <div>
                                <p className="text-sm text-gray-500">Purchase Order</p>
                                <Link
                                    to={`/goods-in/${device.purchaseOrderId}`}
                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    View PO Details
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* QC & Repair Status */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                        <CheckCircle className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">QC & Repair Status</h2>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">QC Required</span>
                            {device.qcRequired ? (
                                <span className="text-orange-600 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    Required
                                </span>
                            ) : (
                                <span className="text-gray-500">Not Required</span>
                            )}
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">QC Completed</span>
                            {device.qcCompleted ? (
                                <span className="text-green-600 flex items-center gap-1">
                                    <CheckCircle className="w-4 h-4" />
                                    Completed
                                </span>
                            ) : (
                                <span className="text-gray-500 flex items-center gap-1">
                                    <XCircle className="w-4 h-4" />
                                    Not Completed
                                </span>
                            )}
                        </div>
                        {device.qcCompletedAt && (
                            <div>
                                <p className="text-sm text-gray-500">QC Completed At</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {new Date(device.qcCompletedAt).toLocaleString()}
                                </p>
                            </div>
                        )}
                        <div className="border-t pt-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">Repair Required</span>
                                {device.repairRequired ? (
                                    <span className="text-orange-600 flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" />
                                        Required
                                    </span>
                                ) : (
                                    <span className="text-gray-500">Not Required</span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Repair Completed</span>
                            {device.repairCompleted ? (
                                <span className="text-green-600 flex items-center gap-1">
                                    <CheckCircle className="w-4 h-4" />
                                    Completed
                                </span>
                            ) : (
                                <span className="text-gray-500 flex items-center gap-1">
                                    <XCircle className="w-4 h-4" />
                                    Not Completed
                                </span>
                            )}
                        </div>
                        {device.repairCompletedAt && (
                            <div>
                                <p className="text-sm text-gray-500">Repair Completed At</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {new Date(device.repairCompletedAt).toLocaleString()}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Timestamps */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Timestamps</h2>
                    </div>
                    <div className="space-y-3">
                        {device.receivedAt && (
                            <div>
                                <p className="text-sm text-gray-500">Received At</p>
                                <p className="font-medium text-gray-900">
                                    {new Date(device.receivedAt).toLocaleString()}
                                </p>
                            </div>
                        )}
                        <div>
                            <p className="text-sm text-gray-500">Created At</p>
                            <p className="font-medium text-gray-900">
                                {new Date(device.createdAt).toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Last Updated</p>
                            <p className="font-medium text-gray-900">
                                {new Date(device.updatedAt).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Device History Table */}
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Device History</h2>
                {history.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                        <p className="text-gray-500">
                            No history available yet. History tracking will be implemented soon.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Event Type</th>
                                    <th>Field Changed</th>
                                    <th>Old Value</th>
                                    <th>New Value</th>
                                    <th>User</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((entry) => (
                                    <tr key={entry.id}>
                                        <td className="text-sm text-gray-600">
                                            {new Date(entry.createdAt).toLocaleString()}
                                        </td>
                                        <td>
                                            <span className="badge badge-info">{entry.eventType}</span>
                                        </td>
                                        <td className="text-sm">{entry.fieldChanged || '-'}</td>
                                        <td className="text-sm text-gray-600">{entry.oldValue || '-'}</td>
                                        <td className="text-sm text-gray-600">{entry.newValue || '-'}</td>
                                        <td className="text-sm">{entry.userName || 'System'}</td>
                                        <td className="text-sm text-gray-600">{entry.notes || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
