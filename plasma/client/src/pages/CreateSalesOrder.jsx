import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, X, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateSalesOrder } from '../hooks/useSalesOrders';
import { useFilterOptions } from '../hooks/useDevices';
import { getAvailableDevicesGrouped } from '../api/salesOrders';
import { createSalesOrderSchema } from '../schemas/salesOrder';
import { getApiErrorMessage } from '../lib/errors';

function isBackmarketCustomer(customer) {
  const normalizedName = String(customer?.name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

  return customer?.is_backmarket === true
    || customer?.is_backmarket === 1
    || customer?.customer_code === 'CST-78'
    || normalizedName === 'backmarket consumer';
}

export default function CreateSalesOrder() {
  const navigate = useNavigate();
  const createMutation = useCreateSalesOrder();
  const { data: filterOptions } = useFilterOptions();

  const options = filterOptions?.options || {};
  const customers = options.customers || [];

  const [formData, setFormData] = useState({
    customer_id: '',
    order_type: 'B2B',
    backmarket_order_id: '',
    customer_ref: '',
    po_ref: '',
    notes: ''
  });

  // Filters for available devices
  const [filters, setFilters] = useState({
    supplier_id: '',
    manufacturer_id: '',
    model_search: '',
    storage_gb: '',
    color: ''
  });

  const [availableDevices, setAvailableDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // Order lines (selected devices)
  const [orderLines, setOrderLines] = useState([]);
  const selectedCustomer = customers.find(customer => String(customer.id) === formData.customer_id);
  const inferredOrderType = isBackmarketCustomer(selectedCustomer) ? 'BACKMARKET' : 'B2B';

  // Fetch available devices when supplier changes or filters change
  useEffect(() => {
    if (filters.supplier_id) {
      fetchAvailableDevices();
    } else {
      setAvailableDevices([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.supplier_id, filters.manufacturer_id, filters.model_search, filters.storage_gb, filters.color, pagination.page]);

  useEffect(() => {
    setFormData(prev => {
      const nextBackmarketOrderId =
        inferredOrderType === 'BACKMARKET' ? prev.backmarket_order_id : '';

      if (prev.order_type === inferredOrderType && prev.backmarket_order_id === nextBackmarketOrderId) {
        return prev;
      }

      return {
        ...prev,
        order_type: inferredOrderType,
        backmarket_order_id: nextBackmarketOrderId
      };
    });
  }, [inferredOrderType]);

  const fetchAvailableDevices = async () => {
    setLoadingDevices(true);
    try {
      const response = await getAvailableDevicesGrouped({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });
      setAvailableDevices(response.groups || []);
      setPagination(response.pagination || pagination);
    } catch (error) {
      console.error('Error fetching available devices:', error);
      toast.error(`Error loading available devices: ${getApiErrorMessage(error, 'Unknown error')}`);
    } finally {
      setLoadingDevices(false);
    }
  };

  const addToOrder = (group, quantity) => {
    const requestedQty = parseInt(quantity);
    if (requestedQty < 1 || requestedQty > group.available_count) {
      toast.error(`Please enter a valid quantity between 1 and ${group.available_count}`);
      return;
    }

    const newLine = {
      id: Date.now(),
      supplier_id: group.supplier_id,
      supplier_name: group.supplier_name,
      manufacturer_id: group.manufacturer_id,
      manufacturer_name: group.manufacturer_name,
      model_id: group.model_id,
      model_name: group.model_name,
      model_number: group.model_number,
      storage_gb: group.storage_gb,
      color: group.color,
      grade: group.grade,
      requested_quantity: requestedQty,
      available_count: group.available_count
    };

    setOrderLines(prev => [...prev, newLine]);
  };

  const removeLine = (id) => {
    setOrderLines(prev => prev.filter(line => line.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      customer_id: parseInt(formData.customer_id) || 0,
      order_type: formData.order_type,
      backmarket_order_id: formData.backmarket_order_id || null,
      customer_ref: formData.customer_ref || null,
      po_ref: formData.po_ref || null,
      notes: formData.notes || null,
      lines: orderLines.map(l => ({
        supplier_id: l.supplier_id || null,
        manufacturer_id: l.manufacturer_id,
        model_id: l.model_id,
        storage_gb: l.storage_gb || null,
        color: l.color || null,
        grade: l.grade || null,
        requested_quantity: l.requested_quantity
      }))
    };

    const validation = createSalesOrderSchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    try {
      const result = await createMutation.mutateAsync(validation.data);
      toast.success(`Sales order ${result.so_number} created successfully`);
      navigate(`/goods-out/${result.id}`);
    } catch (error) {
      toast.error(`Error creating sales order: ${getApiErrorMessage(error, 'Unknown error')}`);
    }
  };

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

        <h1 className="text-2xl font-bold text-gray-900">
          Create Sales Order
        </h1>
        <p className="text-gray-600 mt-1">
          Create a new sales order for outgoing devices
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* SO Details */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Sales Order Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer *
              </label>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="input"
                required
              >
                <option value="">Select Customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Order Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order Type *
              </label>
              <input
                type="text"
                value={formData.order_type === 'BACKMARKET' ? 'Backmarket' : 'B2B'}
                className="input"
                readOnly
              />
            </div>

            {/* Backmarket Order ID */}
            {formData.order_type === 'BACKMARKET' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Backmarket Order ID
                </label>
                <input
                  type="text"
                  value={formData.backmarket_order_id}
                  onChange={(e) => setFormData({ ...formData, backmarket_order_id: e.target.value })}
                  placeholder="e.g., BM12345678"
                  className="input"
                />
              </div>
            )}

            {/* Customer Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Reference
              </label>
              <input
                type="text"
                value={formData.customer_ref}
                onChange={(e) => setFormData({ ...formData, customer_ref: e.target.value })}
                placeholder="Customer's reference number"
                className="input"
              />
            </div>

            {/* PO Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PO Reference
              </label>
              <input
                type="text"
                value={formData.po_ref}
                onChange={(e) => setFormData({ ...formData, po_ref: e.target.value })}
                placeholder="Purchase order reference"
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

        {/* Device Selection */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Select Devices from Supplier
          </h2>

          {/* Supplier Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier *
            </label>
            <select
              value={filters.supplier_id}
              onChange={(e) => {
                setFilters({ ...filters, supplier_id: e.target.value });
                setPagination({ ...pagination, page: 1 });
              }}
              className="input"
            >
              <option value="">Select Supplier</option>
              {options.suppliers?.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filters */}
          {filters.supplier_id && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 pb-4 border-b">
              {/* Manufacturer Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manufacturer
                </label>
                <select
                  value={filters.manufacturer_id}
                  onChange={(e) => {
                    setFilters({ ...filters, manufacturer_id: e.target.value });
                    setPagination({ ...pagination, page: 1 });
                  }}
                  className="input"
                >
                  <option value="">All</option>
                  {options.manufacturers?.map(mfr => (
                    <option key={mfr.id} value={mfr.id}>{mfr.name}</option>
                  ))}
                </select>
              </div>

              {/* Model Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model Search
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={filters.model_search}
                    onChange={(e) => {
                      setFilters({ ...filters, model_search: e.target.value });
                      setPagination({ ...pagination, page: 1 });
                    }}
                    placeholder="Search model..."
                    className="input pr-8"
                  />
                  <Search className="absolute right-2 top-2.5 w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Storage Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Storage
                </label>
                <select
                  value={filters.storage_gb}
                  onChange={(e) => {
                    setFilters({ ...filters, storage_gb: e.target.value });
                    setPagination({ ...pagination, page: 1 });
                  }}
                  className="input"
                >
                  <option value="">All</option>
                  {options.storageOptions?.map(storage => (
                    <option key={storage} value={storage}>{storage}GB</option>
                  ))}
                </select>
              </div>

              {/* Color Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <input
                  type="text"
                  value={filters.color}
                  onChange={(e) => {
                    setFilters({ ...filters, color: e.target.value });
                    setPagination({ ...pagination, page: 1 });
                  }}
                  placeholder="Filter by color..."
                  className="input"
                />
              </div>
            </div>
          )}

          {/* Available Devices Table */}
          {filters.supplier_id && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Available Devices</h3>
              {loadingDevices ? (
                <div className="text-center py-8 text-gray-500">Loading devices...</div>
              ) : availableDevices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No devices found matching filters</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manufacturer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Storage</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Available</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {availableDevices.map((group, index) => (
                        <DeviceGroupRow key={index} group={group} onAdd={addToOrder} />
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <div className="text-sm text-gray-700">
                        Page {pagination.page} of {pagination.totalPages} ({pagination.total} groups)
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                          disabled={pagination.page === 1}
                          className="btn btn-secondary btn-sm"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                          disabled={!pagination.hasMore}
                          className="btn btn-secondary btn-sm"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Order Lines */}
        {orderLines.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Order Lines ({orderLines.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manufacturer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Storage</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orderLines.map(line => (
                    <tr key={line.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{line.supplier_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{line.manufacturer_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{line.model_name || line.model_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{line.storage_gb ? `${line.storage_gb}GB` : '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{line.color || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{line.grade}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-center">{line.requested_quantity}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="mt-4 pt-4 border-t flex justify-end">
              <div className="text-right">
                <span className="text-sm font-medium text-gray-700">Total Devices: </span>
                <span className="text-lg font-bold text-gray-900">
                  {orderLines.reduce((sum, line) => sum + line.requested_quantity, 0)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            to="/goods-out"
            className="btn btn-secondary"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending || orderLines.length === 0}
            className="btn btn-primary"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Sales Order (Draft)'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Device Group Row Component
function DeviceGroupRow({ group, onAdd }) {
  const [quantity, setQuantity] = useState(1);

  const handleAdd = () => {
    onAdd(group, quantity);
    setQuantity(1);
  };

  return (
    <tr>
      <td className="px-4 py-3 text-sm text-gray-900">{group.manufacturer_name}</td>
      <td className="px-4 py-3 text-sm text-gray-900">
        {group.model_name || group.model_number}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900">
        {group.storage_gb ? `${group.storage_gb}GB` : '-'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900">{group.color || '-'}</td>
      <td className="px-4 py-3 text-sm text-gray-900">{group.grade}</td>
      <td className="px-4 py-3 text-sm text-center">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          {group.available_count}
        </span>
        {group.reserved_count > 0 && (
          <span className="ml-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            {group.reserved_count} reserved
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-center">
        <input
          type="number"
          min="1"
          max={group.available_count}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </td>
      <td className="px-4 py-3 text-center">
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </button>
      </td>
    </tr>
  );
}
