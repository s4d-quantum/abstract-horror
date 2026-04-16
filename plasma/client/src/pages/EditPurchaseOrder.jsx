import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePurchaseOrder, useUpdatePurchaseOrder } from '../hooks/usePurchaseOrders';
import { useFilterOptions } from '../hooks/useDevices';
import { getApiErrorMessage } from '../lib/errors';

export default function EditPurchaseOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = usePurchaseOrder(id);
  const updateMutation = useUpdatePurchaseOrder();
  const { data: filterOptions } = useFilterOptions();

  const order = data?.order;
  const options = filterOptions?.options || {};

  const [formData, setFormData] = useState({
    supplier_ref: '',
    notes: ''
  });

  const [lines, setLines] = useState([]);

  // Populate form when order data loads
  useEffect(() => {
    if (order) {
      setFormData({
        supplier_ref: order.supplierRef || '',
        notes: order.notes || ''
      });

      // Convert order lines to editable format
      if (order.lines && order.lines.length > 0) {
        setLines(order.lines.map(line => ({
          id: line.id,
          manufacturer_id: line.manufacturer.id.toString(),
          model_id: line.model.id.toString(),
          storage_gb: line.storage || '',
          color: line.color || '',
          expected_quantity: line.expectedQty
        })));
      } else {
        // If no lines, add one empty line
        setLines([{
          id: Date.now(),
          manufacturer_id: '',
          model_id: '',
          storage_gb: '',
          color: '',
          expected_quantity: 1
        }]);
      }
    }
  }, [order]);

  const addLine = () => {
    setLines(prevLines => [
      ...prevLines,
      {
        id: Date.now(),
        manufacturer_id: '',
        model_id: '',
        storage_gb: '',
        color: '',
        expected_quantity: 1
      }
    ]);
  };

  const removeLine = (lineId) => {
    if (lines.length > 1) {
      setLines(prevLines => prevLines.filter(l => l.id !== lineId));
    }
  };

  const updateLine = (lineId, updates) => {
    setLines(prevLines => prevLines.map(l =>
      l.id === lineId ? { ...l, ...updates } : l
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation for lines
    for (const line of lines) {
      if (!line.manufacturer_id || !line.model_id) {
        toast.error('Please fill in Manufacturer and Model for all lines');
        return;
      }
      if (line.expected_quantity < 1) {
        toast.error('Expected quantity must be at least 1');
        return;
      }
    }

    try {
      const updateData = {
        supplier_ref: formData.supplier_ref || null,
        notes: formData.notes || null
      };

      await updateMutation.mutateAsync({ id, data: updateData });
      toast.success('Purchase order updated successfully');
      navigate(`/goods-in/${id}`);
    } catch (error) {
      toast.error(`Error updating purchase order: ${getApiErrorMessage(error, 'Unknown error')}`);
    }
  };

  // Get models filtered by manufacturer
  const getModelsForManufacturer = (manufacturerId) => {
    if (!manufacturerId || !options.models) return [];
    return options.models.filter(m => m.manufacturer_id === parseInt(manufacturerId));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading...</p>
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

  if (order.status !== 'DRAFT') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Only draft purchase orders can be edited</p>
        <Link to={`/goods-in/${id}`} className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          Back to Purchase Order
        </Link>
      </div>
    );
  }

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
          Edit Purchase Order {order.poNumber}
        </h1>
        <p className="text-gray-600 mt-1">
          Supplier: {order.supplier.name}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* PO Details */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Purchase Order Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PO Number (readonly) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PO Number
              </label>
              <input
                type="text"
                value={order.poNumber}
                disabled
                className="input bg-gray-100"
              />
            </div>

            {/* Supplier (readonly) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier
              </label>
              <input
                type="text"
                value={order.supplier.name}
                disabled
                className="input bg-gray-100"
              />
            </div>

            {/* Supplier Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier Reference
              </label>
              <input
                type="text"
                value={formData.supplier_ref}
                onChange={(e) => setFormData({ ...formData, supplier_ref: e.target.value })}
                placeholder="e.g., Supplier's PO number"
                className="input"
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="input"
                placeholder="Any additional notes about this order..."
              />
            </div>
          </div>
        </div>

        {/* Expected Items - Display Only (cannot edit lines once created) */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Expected Items
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Note: Order lines cannot be modified once the purchase order is created.
            You can only update the supplier reference and notes above.
          </p>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Manufacturer</th>
                  <th>Model</th>
                  <th>Storage</th>
                  <th>Color</th>
                  <th className="text-center">Expected Qty</th>
                  <th className="text-center">Received Qty</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id}>
                    <td>
                      {options.manufacturers?.find(m => m.id === parseInt(line.manufacturer_id))?.name || '-'}
                    </td>
                    <td>
                      {options.models?.find(m => m.id === parseInt(line.model_id))?.model_name ||
                       options.models?.find(m => m.id === parseInt(line.model_id))?.model_number || '-'}
                    </td>
                    <td>{line.storage_gb ? `${line.storage_gb}GB` : 'Any'}</td>
                    <td>{line.color || 'Any'}</td>
                    <td className="text-center">{line.expected_quantity}</td>
                    <td className="text-center">
                      {order.lines?.find(ol => ol.id === line.id)?.receivedQty || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total Expected */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Total Expected Devices:
              </span>
              <span className="text-lg font-bold text-gray-900">
                {lines.reduce((sum, line) => sum + parseInt(line.expected_quantity || 0), 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            to={`/goods-in/${id}`}
            className="btn btn-secondary"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="btn btn-primary"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
