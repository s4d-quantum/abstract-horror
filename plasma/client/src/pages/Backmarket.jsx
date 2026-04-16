import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Package, TruckIcon, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSalesOrders } from '../hooks/useSalesOrders';

export default function Backmarket() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch ONLY BackMarket orders (customers with is_backmarket = 1)
  const { data, isLoading } = useSalesOrders({
    page,
    search,
    status: statusFilter,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    is_backmarket: true,
    limit: 50,
    include_summary: true
  });

  const orders = data?.orders || [];
  const pagination = data?.pagination || { page: 1, limit: 50, total: 0, totalPages: 1, hasMore: false };
  const summary = data?.summary || { totalOrders: 0, processing: 0, shipped: 0, totalDevices: 0 };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      DRAFT: 'badge-gray',
      CONFIRMED: 'badge-info',
      PROCESSING: 'badge-warning',
      PARTIALLY_SHIPPED: 'badge-warning',
      SHIPPED: 'badge-success',
      DELIVERED: 'badge-success',
      CANCELLED: 'badge-danger'
    };
    return statusMap[status] || 'badge-gray';
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">BackMarket Orders</h1>
          <p className="text-gray-600 mt-1">Manage BackMarket customer orders</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Package className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Processing</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.processing}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <TruckIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Shipped</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.shipped}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Devices</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.totalDevices}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by SO number, BM order ID, or reference..."
                className="input pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
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
              <option value="PROCESSING">Processing</option>
              <option value="PARTIALLY_SHIPPED">Partially Shipped</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Date From */}
          <div>
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {/* Date To */}
          <div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="input"
              placeholder="Date To"
            />
          </div>
        </div>
      </div>

      {/* BackMarket Orders List */}
      <div className="card">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading BackMarket orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No BackMarket orders found</p>
            <p className="text-gray-400 text-sm">
              {search || statusFilter
                ? 'Try adjusting your filters'
                : 'BackMarket orders will appear here'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>SO Number</th>
                    <th>BM Order ID</th>
                    <th>Status</th>
                    <th className="text-center">Lines</th>
                    <th className="text-center">Requested</th>
                    <th className="text-center">Picked</th>
                    <th>Progress</th>
                    <th>Tracking</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link
                          to={`/backmarket/${order.id}`}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          {order.soNumber}
                        </Link>
                      </td>
                      <td className="font-mono text-sm">
                        {order.backmarketOrderId || '-'}
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="text-center">{order.lineCount}</td>
                      <td className="text-center">{order.totalRequested}</td>
                      <td className="text-center">
                        <span className={order.totalPicked > 0 ? 'font-semibold text-green-600' : ''}>
                          {order.totalPicked}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[80px]">
                            <div
                              className={`h-2 rounded-full ${order.totalPicked >= order.totalRequested
                                ? 'bg-green-600'
                                : 'bg-blue-600'
                                }`}
                              style={{
                                width: `${order.totalRequested > 0
                                  ? (order.totalPicked / order.totalRequested) * 100
                                  : 0}%`
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 whitespace-nowrap">
                            {order.totalRequested > 0
                              ? Math.round((order.totalPicked / order.totalRequested) * 100)
                              : 0}%
                          </span>
                        </div>
                      </td>
                      <td className="text-sm text-gray-600">
                        {order.trackingNumber || '-'}
                      </td>
                      <td className="text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <Link
                          to={`/backmarket/${order.id}`}
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

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600">
                {pagination.total > 0 ? (
                  <>
                    Showing {((page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} BackMarket orders
                  </>
                ) : (
                  <>No BackMarket orders found</>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  disabled={page === 1}
                  className="btn btn-secondary flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <span className="px-4 py-2 text-sm text-gray-700">
                  Page {page} of {pagination.totalPages}
                </span>

                <button
                  onClick={() => setPage((currentPage) => currentPage + 1)}
                  disabled={!pagination.hasMore}
                  className="btn btn-secondary flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
