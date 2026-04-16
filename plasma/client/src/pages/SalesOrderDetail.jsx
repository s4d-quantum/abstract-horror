import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, CheckCircle, XCircle, AlertTriangle, MapPin, Loader, Trash2, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSalesOrder, usePickedDevices, usePickDevices, useConfirmSalesOrder, useCancelSalesOrder, useShipSalesOrder } from '../hooks/useSalesOrders';
import { devicesApi } from '../api/devices';
import * as backmarketApi from '../api/backmarket.api.js';
import { getApiErrorMessage } from '../lib/errors';

export default function SalesOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: orderData, isLoading, refetch: refetchOrder } = useSalesOrder(id);
  const { data: pickedDevicesData, refetch: refetchPickedDevices } = usePickedDevices(id);
  const pickDevicesMutation = usePickDevices();
  const confirmMutation = useConfirmSalesOrder();
  const cancelMutation = useCancelSalesOrder();
  const shipMutation = useShipSalesOrder();

  const [imeiInput, setImeiInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState(null);
  const [showExpectedModal, setShowExpectedModal] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [bookingShipment, setBookingShipment] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const inputRef = useRef(null);

  // Audio elements
  const errorSound = useRef(new Audio('/sounds/error-beep.mp3'));
  const duplicateSound = useRef(new Audio('/sounds/duplicate-beep.mp3'));
  const outOfStockSound = useRef(new Audio('/sounds/outofstock-beep.mp3'));

  const order = orderData?.order;
  const pickedDevices = pickedDevicesData?.devices || [];
  const pickedDevicesByLineId = useMemo(() => pickedDevices.reduce((groups, device) => {
    if (!device.salesOrderLineId) {
      return groups;
    }

    const lineId = String(device.salesOrderLineId);
    if (!groups[lineId]) {
      groups[lineId] = [];
    }

    groups[lineId].push(device);
    return groups;
  }, {}), [pickedDevices]);
  const unassignedDevices = pickedDevices.filter((device) => !device.salesOrderLineId);

  // Auto-focus input on mount and after scan
  useEffect(() => {
    inputRef.current?.focus();
  }, [lastScanResult]);

  const playSound = (type) => {
    try {
      if (type === 'error') errorSound.current.play();
      else if (type === 'duplicate') duplicateSound.current.play();
      else if (type === 'outofstock') outOfStockSound.current.play();
    } catch (err) {
      console.error('Error playing sound:', err);
    }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!imeiInput.trim() || scanning) return;

    setScanning(true);
    setLastScanResult(null);

    try {
      // Search for device by IMEI
      const deviceResponse = await devicesApi.searchByImei(imeiInput.trim());
      const device = deviceResponse.device;

      if (!device) {
        playSound('error');
        setLastScanResult({
          success: false,
          message: `Device with IMEI ${imeiInput} not found`
        });
        setImeiInput('');
        setScanning(false);
        return;
      }

      // Check if device already picked for this order
      const alreadyPicked = pickedDevices.some(d => d.imei === device.imei);
      if (alreadyPicked) {
        playSound('duplicate');
        setLastScanResult({
          success: false,
          message: `Device ${device.imei} already picked for this order`
        });
        setImeiInput('');
        setScanning(false);
        return;
      }

      // Check if device matches order line criteria
      const matchingLine = order.lines.find(line => {
        return (
          device.supplier_id === line.supplier.id &&
          device.manufacturer_id === line.manufacturer.id &&
          device.model_id === line.model.id &&
          (!line.storage || device.storage_gb === line.storage) &&
          (!line.color || device.color === line.color) &&
          (!line.grade || device.grade === line.grade)
        );
      });

      if (!matchingLine) {
        playSound('error');
        setLastScanResult({
          success: false,
          message: `Device does not match any order line criteria`
        });
        setImeiInput('');
        setScanning(false);
        return;
      }

      // Check if line is already fulfilled
      if (matchingLine.pickedQty >= matchingLine.requestedQty) {
        playSound('outofstock');
        setLastScanResult({
          success: false,
          message: `Line already fulfilled (${matchingLine.pickedQty}/${matchingLine.requestedQty})`
        });
        setImeiInput('');
        setScanning(false);
        return;
      }

      // Pick the device
      await pickDevicesMutation.mutateAsync({
        id: order.id,
        devices: [{
          device_id: device.id,
          sales_order_line_id: matchingLine.id
        }]
      });

      setLastScanResult({
        success: true,
        message: `✓ ${device.manufacturer} ${device.model_name || device.model_number} added`,
        device
      });

      refetchPickedDevices();
      refetchOrder();
      setImeiInput('');
    } catch (error) {
      playSound('error');
      setLastScanResult({
        success: false,
        message: getApiErrorMessage(error, 'Error scanning device')
      });
      setImeiInput('');
    } finally {
      setScanning(false);
    }
  };

  const handleConfirm = async () => {
    if (!window.confirm('Confirm this sales order? Devices will be reserved.')) return;

    try {
      await confirmMutation.mutateAsync(id);
      toast.success('Sales order confirmed successfully');
      refetchOrder();
    } catch (error) {
      toast.error(`Error confirming order: ${getApiErrorMessage(error, 'Unknown error')}`);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this sales order? All reservations will be released.')) return;

    try {
      await cancelMutation.mutateAsync(id);
      toast.success('Sales order cancelled');
      navigate('/goods-out');
    } catch (error) {
      toast.error(`Error cancelling order: ${getApiErrorMessage(error, 'Unknown error')}`);
    }
  };

  const handleCompleteOrder = () => {
    if (order.totalPicked < order.totalRequested) {
      toast.error(`Cannot complete order: Only ${order.totalPicked} of ${order.totalRequested} devices have been picked.`);
      return;
    }
    setShowShipModal(true);
  };

  const handleSaveAndExit = () => {
    navigate('/goods-out');
  };

  const handleBookBackmarketShipment = async () => {
    if (!window.confirm('Book BackMarket shipment? This will automatically: fetch order details, book DPD shipment, print labels, and update BackMarket.')) return;

    setBookingShipment(true);
    setBookingResult(null);

    try {
      const result = await backmarketApi.bookBackmarketShipment(id);
      setBookingResult({
        success: true,
        message: 'BackMarket shipment booked successfully!',
        data: result.data
      });
      refetchOrder();
      setTimeout(() => {
        navigate('/backmarket');
      }, 3000);
    } catch (error) {
      setBookingResult({
        success: false,
        message: getApiErrorMessage(error, 'Failed to book shipment')
      });
    } finally {
      setBookingShipment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Sales order not found</p>
        <Link to="/goods-out" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          Back to Sales Orders
        </Link>
      </div>
    );
  }

  const isDraft = order.status === 'DRAFT';
  const isConfirmed = order.status === 'CONFIRMED';
  const isProcessing = order.status === 'PROCESSING';
  const canPick = isConfirmed || isProcessing;
  const allPicked = order.totalPicked >= order.totalRequested;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/goods-out"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sales Orders
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Sales Order {order.soNumber}
            </h1>
            <p className="text-gray-600 mt-1">
              {order.customer.name} • {order.orderType}
            </p>
          </div>
          <div className="flex gap-2">
            {isDraft && (
              <>
                <button
                  onClick={handleConfirm}
                  disabled={confirmMutation.isPending}
                  className="btn btn-primary"
                >
                  {confirmMutation.isPending ? 'Confirming...' : 'Confirm Order'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                  className="btn btn-secondary"
                >
                  Cancel Order
                </button>
              </>
            )}
            {(isConfirmed || isProcessing) && (
              <>
                <button
                  onClick={() => setShowExpectedModal(true)}
                  className="btn btn-secondary"
                >
                  <Package className="w-4 h-4 mr-2" />
                  View Expected Devices
                </button>
                <button
                  onClick={handleSaveAndExit}
                  className="btn btn-secondary"
                >
                  Save & Exit
                </button>
                {order.backmarketOrderId && (
                  <>
                    <button
                      onClick={handleBookBackmarketShipment}
                      disabled={bookingShipment || !allPicked}
                      className={`btn btn-primary flex items-center gap-2 ${!allPicked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={!allPicked ? `${order.totalPicked} of ${order.totalRequested} devices picked` : 'Book shipment automatically'}
                    >
                      {bookingShipment ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Booking...
                        </>
                      ) : (
                        <>
                          <Truck className="w-4 h-4" />
                          Book Shipment
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCompleteOrder}
                      disabled={!allPicked}
                      className={`btn ${allPicked ? 'btn-secondary' : 'btn-secondary opacity-50 cursor-not-allowed'}`}
                      title={!allPicked ? `${order.totalPicked} of ${order.totalRequested} devices picked` : 'Manually complete order and mark as shipped'}
                    >
                      Manual Shipment
                    </button>
                  </>
                )}
                {!order.backmarketOrderId && (
                  <button
                    onClick={handleCompleteOrder}
                    disabled={!allPicked}
                    className={`btn ${allPicked ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'}`}
                    title={!allPicked ? `${order.totalPicked} of ${order.totalRequested} devices picked` : 'Complete order and mark as shipped'}
                  >
                    Complete Order
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Order Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
          <StatusBadge status={order.status} />
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Progress</h3>
          <p className="text-2xl font-bold text-gray-900">
            {order.totalPicked} / {order.totalRequested}
          </p>
          {allPicked && <p className="text-sm text-green-600 font-medium">✓ All devices picked</p>}
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Created</h3>
          <p className="text-sm text-gray-900">
            {new Date(order.createdAt).toLocaleDateString()} by {order.createdBy}
          </p>
        </div>
      </div>

      {/* Scanning Interface */}
      {canPick && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Scan Devices
          </h2>

          <form onSubmit={handleScan} className="mb-4">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={imeiInput}
                onChange={(e) => setImeiInput(e.target.value)}
                placeholder="Scan or enter IMEI..."
                className="input flex-1"
                disabled={scanning}
                autoFocus
              />
              <button
                type="submit"
                disabled={scanning || !imeiInput.trim()}
                className="btn btn-primary"
              >
                {scanning ? 'Scanning...' : 'Scan'}
              </button>
            </div>
          </form>

          {/* Last Scan Result */}
          {lastScanResult && (
            <div
              className={`p-4 rounded-md flex items-start gap-2 ${lastScanResult.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
                }`}
            >
              {lastScanResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p
                  className={`font-medium ${lastScanResult.success ? 'text-green-900' : 'text-red-900'
                    }`}
                >
                  {lastScanResult.message}
                </p>
                {lastScanResult.device && (
                  <p className="text-sm text-green-700 mt-1">
                    IMEI: {lastScanResult.device.imei} • {lastScanResult.device.storage_gb}GB {lastScanResult.device.color} {lastScanResult.device.grade}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Picked Devices */}
      {pickedDevices.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Picked Devices ({pickedDevices.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IMEI</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Spec</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Picked By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pickedDevices.map(device => (
                  <tr key={device.id}>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{device.imei}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {device.manufacturer} {device.modelName || device.modelNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {device.storage}GB {device.color} {device.grade}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{device.pickedBy}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(device.scannedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Lines */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Order Lines
        </h2>
        <div className="space-y-4">
          {order.lines.map((line, index) => {
            const linePickedDevices = pickedDevicesByLineId[String(line.id)] || [];

            return (
              <div key={line.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Line {index + 1}: {line.manufacturer.name} {line.model.name || line.model.number}
                    </h3>
                    {line.supplier && (
                      <p className="text-sm text-gray-600 mt-0.5">
                        Supplier: <span className="font-medium text-gray-700">{line.supplier.name}</span>
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {line.pickedQty} / {line.requestedQty}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600 mb-2">
                  <div>Storage: {line.storage ? `${line.storage}GB` : 'Any'}</div>
                  <div>Color: {line.color || 'Any'}</div>
                  <div>Grade: {line.grade || 'Any'}</div>
                </div>
                {linePickedDevices.length > 0 && (
                  <div className="mb-2 rounded-md border border-green-200 bg-green-50 px-3 py-2">
                    <p className="text-sm font-medium text-green-900">
                      Picked IMEI{linePickedDevices.length > 1 ? 's' : ''}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      {linePickedDevices.map((device) => (
                        <Link
                          key={device.id}
                          to={`/inventory/${device.deviceId}`}
                          className="font-mono text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {device.imei}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {/* Available Locations */}
                {line.available_locations && line.available_locations.length > 0 && (
                  <div className="flex items-start gap-2 text-sm mb-2 bg-blue-50 p-2 rounded">
                    <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-blue-900">Available at: </span>
                      <span className="text-blue-700">
                        {line.available_locations.map((loc, idx) => (
                          <span key={loc.code}>
                            {loc.code} x{loc.quantity}
                            {idx < line.available_locations.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>
                )}
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${line.pickedQty >= line.requestedQty ? 'bg-green-600' : 'bg-blue-600'
                      }`}
                    style={{ width: `${Math.min((line.pickedQty / line.requestedQty) * 100, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
          {unassignedDevices.length > 0 && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2">
              <p className="text-sm font-medium text-yellow-900">
                Unassigned Devices ({unassignedDevices.length})
              </p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {unassignedDevices.map((device) => (
                  <Link
                    key={device.id}
                    to={`/inventory/${device.deviceId}`}
                    className="font-mono text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {device.imei}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expected Devices Modal */}
      {showExpectedModal && (
        <ExpectedDevicesModal
          order={order}
          onClose={() => setShowExpectedModal(false)}
        />
      )}

      {/* Ship Modal */}
      {showShipModal && (
        <ShipModal
          order={order}
          onClose={() => setShowShipModal(false)}
          onShip={async (data) => {
            try {
              await shipMutation.mutateAsync({ id: order.id, data });
              toast.success('Order completed and marked as shipped!');
              navigate('/goods-out');
            } catch (error) {
              toast.error(`Error shipping order: ${getApiErrorMessage(error, 'Unknown error')}`);
            }
          }}
        />
      )}

      {/* BackMarket Booking Result Modal */}
      {bookingResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-start gap-3">
              {bookingResult.success ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h3 className={`font-semibold text-lg ${bookingResult.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                  {bookingResult.success ? 'Shipment Booked!' : 'Booking Failed'}
                </h3>
                <p className="text-gray-700 mt-2">{bookingResult.message}</p>
                {bookingResult.success && bookingResult.data && (
                  <div className="mt-4 text-sm space-y-1">
                    <p><strong>Tracking:</strong> {bookingResult.data.trackingNumber}</p>
                    <p><strong>Consignment:</strong> {bookingResult.data.consignmentNumber}</p>
                    <p><strong>IMEI:</strong> {bookingResult.data.imei}</p>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setBookingResult(null)}
              className="btn btn-primary w-full mt-6"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    DRAFT: 'bg-gray-100 text-gray-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    PROCESSING: 'bg-yellow-100 text-yellow-800',
    SHIPPED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${colors[status] || colors.DRAFT}`}>
      {status}
    </span>
  );
}

function ExpectedDevicesModal({ order, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Expected Devices & Locations</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {order.lines.map((line, index) => (
              <div key={line.id} className="border border-gray-200 rounded-lg p-4">
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900">
                    Line {index + 1}: {line.manufacturer.name} {line.model.name || line.model.number}
                  </h3>
                  {line.supplier && (
                    <p className="text-sm text-gray-600 mt-1">
                      Supplier: <span className="font-medium text-gray-700">{line.supplier.name}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-3">
                  <div className="text-gray-600">
                    <span className="font-medium">Storage:</span> {line.storage ? `${line.storage}GB` : 'Any'}
                  </div>
                  <div className="text-gray-600">
                    <span className="font-medium">Color:</span> {line.color || 'Any'}
                  </div>
                  <div className="text-gray-600">
                    <span className="font-medium">Grade:</span> {line.grade || 'Any'}
                  </div>
                  <div className="text-gray-600">
                    <span className="font-medium">Quantity:</span> {line.requestedQty}
                  </div>
                </div>

                {line.available_locations && line.available_locations.length > 0 && (
                  <div className="flex items-start gap-2 text-sm text-blue-700 bg-blue-50 p-3 rounded mb-3">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Available Locations:</span>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {line.available_locations.map(loc => (
                          <span key={loc.code} className="inline-block bg-white px-2 py-1 rounded border border-blue-200 font-medium">
                            {loc.code} <span className="text-blue-600">×{loc.quantity}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Progress:</span>
                    <span className="font-medium text-gray-900">
                      {line.pickedQty} / {line.requestedQty}
                      {line.pickedQty >= line.requestedQty && (
                        <CheckCircle className="inline w-4 h-4 ml-1 text-green-600" />
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t">
          <button onClick={onClose} className="btn btn-primary w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ShipModal({ order, onClose, onShip }) {
  const [courier, setCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!courier || !trackingNumber) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await onShip({ courier, tracking_number: trackingNumber });
      onClose();
    } catch (error) {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Complete Order - Shipping Details</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Courier
              </label>
              <input
                type="text"
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                className="input w-full"
                placeholder="e.g., DHL, FedEx, UPS"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tracking Number
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="input w-full"
                placeholder="Enter tracking number"
                required
              />
            </div>

            <div className="bg-blue-50 p-3 rounded">
              <p className="text-sm text-blue-900">
                <strong>Order Summary:</strong> {order.totalPicked} devices will be marked as shipped.
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Completing...' : 'Complete & Ship'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
