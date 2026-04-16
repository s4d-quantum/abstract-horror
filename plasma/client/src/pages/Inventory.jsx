import { useState } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDevices, useFilterOptions } from '../hooks/useDevices';
import { Link } from 'react-router-dom';

export default function Inventory() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    manufacturer_id: '',
    supplier_id: '',
    location_id: '',
    grade: '',
    color: '',
    storage_gb: ''
  });

  const [showFilters, setShowFilters] = useState(false);

  const queryParams = {
    page,
    limit: 50,
    search: search || undefined,
    ...Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '')
    )
  };

  const { data, isLoading } = useDevices(queryParams);
  const { data: filterOptions } = useFilterOptions();

  const devices = data?.devices || [];
  const pagination = data?.pagination || {};
  const options = filterOptions?.options || {};

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filtering
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      manufacturer_id: '',
      supplier_id: '',
      location_id: '',
      grade: '',
      color: '',
      storage_gb: ''
    });
    setSearch('');
    setPage(1);
  };

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn btn-secondary flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card mb-6">
        {/* Search Bar */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by IMEI or Model..."
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
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="input"
                >
                  <option value="">All Statuses</option>
                  {options.statuses?.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* Manufacturer Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manufacturer
                </label>
                <select
                  value={filters.manufacturer_id}
                  onChange={(e) => handleFilterChange('manufacturer_id', e.target.value)}
                  className="input"
                >
                  <option value="">All Manufacturers</option>
                  {options.manufacturers?.map(mfr => (
                    <option key={mfr.id} value={mfr.id}>{mfr.name}</option>
                  ))}
                </select>
              </div>

              {/* Supplier Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier
                </label>
                <select
                  value={filters.supplier_id}
                  onChange={(e) => handleFilterChange('supplier_id', e.target.value)}
                  className="input"
                >
                  <option value="">All Suppliers</option>
                  {options.suppliers?.map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                  ))}
                </select>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <select
                  value={filters.location_id}
                  onChange={(e) => handleFilterChange('location_id', e.target.value)}
                  className="input"
                >
                  <option value="">All Locations</option>
                  {options.locations?.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.code}</option>
                  ))}
                </select>
              </div>

              {/* Grade Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grade
                </label>
                <select
                  value={filters.grade}
                  onChange={(e) => handleFilterChange('grade', e.target.value)}
                  className="input"
                >
                  <option value="">All Grades</option>
                  {options.grades?.map(grade => (
                    <option key={grade} value={grade}>Grade {grade}</option>
                  ))}
                </select>
              </div>

              {/* Storage Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Storage
                </label>
                <select
                  value={filters.storage_gb}
                  onChange={(e) => handleFilterChange('storage_gb', e.target.value)}
                  className="input"
                >
                  <option value="">All Storage</option>
                  {options.storageOptions?.map(storage => (
                    <option key={storage} value={storage}>{storage}GB</option>
                  ))}
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
            <p className="text-gray-500">Loading devices...</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No devices found</p>
          </div>
        ) : (
          <>
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
                    <th>Location</th>
                    <th>Supplier</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device) => (
                    <tr key={device.id}>
                      <td className="font-mono text-sm">
                        <Link
                          to={`/inventory/${device.id}`}
                          className="text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          {device.imei}
                        </Link>
                      </td>
                      <td>{device.manufacturer}</td>
                      <td>
                        {device.modelName || device.modelNumber}
                      </td>
                      <td>{device.storage ? `${device.storage}GB` : '-'}</td>
                      <td>{device.color || '-'}</td>
                      <td>
                        {device.grade ? (
                          <span className="font-semibold">Grade {device.grade}</span>
                        ) : '-'}
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(device.status)}`}>
                          {device.status}
                        </span>
                      </td>
                      <td>{device.location || '-'}</td>
                      <td className="text-sm">
                        {device.supplier && device.supplierId ? (
                          <Link
                            to={`/inventory/supplier/${device.supplierId}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {device.supplier}
                          </Link>
                        ) : (
                          <span className="text-gray-600">{device.supplier || '-'}</span>
                        )}
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
                {pagination.total} devices
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
