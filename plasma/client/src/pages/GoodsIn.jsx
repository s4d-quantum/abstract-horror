import { useState } from 'react';
import { Search, Plus, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePurchaseOrders } from '../hooks/usePurchaseOrders';
import { useSuppliers } from '../hooks/useSuppliers';
import { Link } from 'react-router-dom';

export default function GoodsIn() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const queryParams = {
    page,
    limit: 50,
    search: search || undefined,
    status: statusFilter || undefined,
    supplier_id: supplierFilter || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined
  };

  const { data, isLoading } = usePurchaseOrders(queryParams);
  const { data: suppliersData } = useSuppliers({ limit: 200 });

  const orders = data?.orders || [];
  const pagination = data?.pagination || { page: 1, limit: queryParams.limit, total: 0, totalPages: 1, hasMore: false };
  const suppliers = suppliersData?.suppliers || [];

  const handleClearFilters = () => {
    setStatusFilter('');
    setSupplierFilter('');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setPage(1);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Goods In - Purchase Orders</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          <Link to="/goods-in/book-in" className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Book In Stock
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card mb-6">
        {/* Search Bar */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by PO Number or Supplier..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input pl-10 w-full"
            />
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="border-t pt-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="input"
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PARTIALLY_RECEIVED">Partially Received</option>
                  <option value="FULLY_RECEIVED">Fully Received</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Supplier Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier
                </label>
                <select
                  value={supplierFilter}
                  onChange={(e) => {
                    setSupplierFilter(e.target.value);
                    setPage(1);
                  }}
                  className="input"
                >
                  <option value="">All Suppliers</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="input"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="input"
                />
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={handleClearFilters}
                className="btn btn-secondary text-sm"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="card">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading purchase orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No purchase orders found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>PO Number</th>
                    <th>Supplier</th>
                    <th>Status</th>
                    <th>Expected</th>
                    <th>Received</th>
                    <th>Progress</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link
                          to={`/goods-in/${order.id}`}
                          className="font-mono text-sm font-semibold text-blue-600 hover:text-blue-800"
                        >
                          {order.poNumber}
                        </Link>
                      </td>
                      <td>{order.supplier.name}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="text-center">{order.expectedQty}</td>
                      <td className="text-center">{order.receivedQty}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${order.expectedQty > 0
                                  ? (order.receivedQty / order.expectedQty) * 100
                                  : 0}%`
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 whitespace-nowrap">
                            {order.expectedQty > 0
                              ? Math.round((order.receivedQty / order.expectedQty) * 100)
                              : 0}%
                          </span>
                        </div>
                      </td>
                      <td className="text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <Link
                          to={`/goods-in/${order.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.limit && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Showing {((page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} purchase orders
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn btn-secondary flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <span className="px-4 py-2 text-sm text-gray-700">
                    Page {page} of {pagination.totalPages || 1}
                  </span>

                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={!pagination.hasMore}
                    className="btn btn-secondary flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
