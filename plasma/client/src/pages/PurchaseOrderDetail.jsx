import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  usePurchaseOrder,
  useConfirmPurchaseOrder,
  useCancelPurchaseOrder,
  useReceivedDevices
} from '../hooks/usePurchaseOrders';
import { getApiErrorMessage } from '../lib/errors';

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  const { data, isLoading } = usePurchaseOrder(id);
  const { data: devicesData } = useReceivedDevices(id);
  const confirmMutation = useConfirmPurchaseOrder();
  const cancelMutation = useCancelPurchaseOrder();

  const order = data?.order;
  const devices = devicesData?.devices || [];

  const handleConfirm = async () => {
    if (window.confirm('Are you sure you want to confirm this purchase order?')) {
      try {
        await confirmMutation.mutateAsync(id);
        toast.success('Purchase order confirmed successfully');
      } catch (error) {
        toast.error(`Error confirming purchase order: ${getApiErrorMessage(error, 'Unknown error')}`);
      }
    }
  };

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this purchase order? This cannot be undone.')) {
      try {
        await cancelMutation.mutateAsync(id);
        toast.success('Purchase order cancelled');
        navigate('/goods-in');
      } catch (error) {
        toast.error(`Error cancelling purchase order: ${getApiErrorMessage(error, 'Unknown error')}`);
      }
    }
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      DRAFT: 'badge-gray',
      CONFIRMED: 'badge-info',
      PARTIALLY_RECEIVED: 'badge-warning',
      FULLY_RECEIVED: 'badge-success',
      CANCELLED: 'badge-danger'
    };
    return statusMap[status] || 'badge-gray';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading purchase order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Purchase order not found</p>
        <Link to="/goods-in" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          Back to Purchase Orders
        </Link>
      </div>
    );
  }

  const canEdit = order.status === 'DRAFT';
  const canConfirm = order.status === 'DRAFT';
  const canCancel = ['DRAFT', 'CONFIRMED'].includes(order.status);
  const canReceive = ['CONFIRMED', 'PARTIALLY_RECEIVED'].includes(order.status);

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

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Purchase Order {order.poNumber}
            </h1>
            <p className="text-gray-600 mt-1">
              Supplier: {order.supplier.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`badge ${getStatusBadgeClass(order.status)} text-base px-3 py-1`}>
              {order.status}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Expected</p>
              <p className="text-2xl font-bold text-gray-900">{order.expectedQty}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Received</p>
              <p className="text-2xl font-bold text-gray-900">{order.receivedQty}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Remaining</p>
              <p className="text-2xl font-bold text-gray-900">
                {order.expectedQty - order.receivedQty}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {order.expectedQty > 0
                  ? Math.round((order.receivedQty / order.expectedQty) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
        <div className="flex gap-3">
          {canEdit && (
            <Link
              to={`/goods-in/${id}/edit`}
              className="btn btn-secondary"
            >
              Edit Purchase Order
            </Link>
          )}
          {canConfirm && (
            <button
              onClick={handleConfirm}
              disabled={confirmMutation.isPending}
              className="btn btn-primary"
            >
              Confirm Purchase Order
            </button>
          )}
          {canReceive && (
            <Link
              to={`/goods-in/${id}/receive`}
              className="btn btn-primary"
            >
              Receive Devices
            </Link>
          )}
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="btn btn-danger"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {/* Order Details */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">PO Number</p>
            <p className="font-medium text-gray-900">{order.poNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Supplier Reference</p>
            <p className="font-medium text-gray-900">{order.supplierRef || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Created By</p>
            <p className="font-medium text-gray-900">{order.createdBy}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Created At</p>
            <p className="font-medium text-gray-900">
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          {order.confirmedAt && (
            <div>
              <p className="text-sm text-gray-600">Confirmed At</p>
              <p className="font-medium text-gray-900">
                {new Date(order.confirmedAt).toLocaleString()}
              </p>
            </div>
          )}
          {order.notes && (
            <div className="md:col-span-2">
              <p className="text-sm text-gray-600">Notes</p>
              <p className="font-medium text-gray-900">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Lines */}
      {order.lines && order.lines.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Expected Items</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Manufacturer</th>
                  <th>Model</th>
                  <th>Storage</th>
                  <th>Color</th>
                  <th className="text-center">Expected</th>
                  <th className="text-center">Received</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.manufacturer.name}</td>
                    <td>{line.model.name || line.model.number}</td>
                    <td>{line.storage ? `${line.storage}GB` : '-'}</td>
                    <td>{line.color || '-'}</td>
                    <td className="text-center">{line.expectedQty}</td>
                    <td className="text-center">{line.receivedQty}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${line.expectedQty > 0
                                ? (line.receivedQty / line.expectedQty) * 100
                                : 0}%`
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 whitespace-nowrap">
                          {line.expectedQty > 0
                            ? Math.round((line.receivedQty / line.expectedQty) * 100)
                            : 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Received Devices */}
      {devices.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Received Devices ({devices.length})
          </h2>
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
                  <th>Status</th>
                  <th>Received At</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.id}>
                    <td className="font-mono text-sm">{device.imei}</td>
                    <td>{device.manufacturer}</td>
                    <td>{device.modelName || device.modelNumber}</td>
                    <td>{device.storage ? `${device.storage}GB` : '-'}</td>
                    <td>{device.color || '-'}</td>
                    <td>
                      {device.grade ? (
                        <span className="font-semibold">Grade {device.grade}</span>
                      ) : '-'}
                    </td>
                    <td>
                      <span className="badge badge-warning">{device.status}</span>
                    </td>
                    <td className="text-sm text-gray-600">
                      {new Date(device.receivedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
