import { useState } from 'react';
import { Search, Plus, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCustomers } from '../hooks/useCustomers';
import { Link, useNavigate } from 'react-router-dom';

export default function Customers() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const queryParams = {
    page,
    limit: 50,
    search: search || undefined,
    status: statusFilter || undefined
  };

  const { data, isLoading } = useCustomers(queryParams);

  const customers = data?.customers || [];
  const pagination = data?.pagination || {};

  const handleClearFilters = () => {
    setStatusFilter('');
    setSearch('');
    setPage(1);
  };

  const getStatusBadgeClass = (isActive) => {
    return isActive ? 'badge-success' : 'badge-gray';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          <Link to="/customers/new" className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add New Customer
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
              placeholder="Search by customer code, name, or email..."
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
                  <option value="">All Customers</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
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
            <p className="text-gray-500">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No customers found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Customer Code</th>
                    <th>Name</th>
                    <th>Location</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => navigate(`/customers/${customer.id}`)}
                    >
                      <td>
                        <Link
                          to={`/customers/${customer.id}`}
                          className="font-mono text-sm font-semibold text-blue-600 hover:text-blue-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {customer.customerCode}
                        </Link>
                      </td>
                      <td className="font-medium">{customer.name}</td>
                      <td className="text-sm text-gray-600">
                        {[customer.city, customer.country]
                          .filter(Boolean)
                          .join(', ') || '-'}
                      </td>
                      <td className="text-sm text-gray-600">
                        {customer.phone || '-'}
                      </td>
                      <td className="text-sm text-gray-600">
                        {customer.email || '-'}
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(customer.isActive)}`}>
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/customers/${customer.id}`}
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
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600">
                Showing {((page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} customers
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
                  Page {page} of {pagination.totalPages}
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
          </>
        )}
      </div>
    </div>
  );
}
