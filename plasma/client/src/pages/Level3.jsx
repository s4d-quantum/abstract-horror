import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useActiveRepairs } from '../hooks/useLevel3';
import BookRepairModal from '../components/BookRepairModal';

export default function Level3() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showBookModal, setShowBookModal] = useState(false);

  const { data, isLoading, error } = useActiveRepairs({
    page,
    limit: 50,
    status: statusFilter || undefined
  });

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      BOOKED_IN: 'badge-info',
      IN_PROGRESS: 'badge-warning',
      AWAITING_PARTS: 'badge-warning',
      ON_HOLD: 'badge-gray',
    };
    return statusMap[status] || 'badge-gray';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading repairs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error loading repairs: {error.message}</p>
      </div>
    );
  }

  const repairs = data?.repairs || [];
  const pagination = data?.pagination || {};

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Level 3 Repairs</h1>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/level3/completed')}
            className="btn btn-secondary"
          >
            View Completed Jobs
          </button>
          <button
            onClick={() => setShowBookModal(true)}
            className="btn btn-primary"
          >
            Book Repair
          </button>
        </div>
      </div>

      {/* Status Filter */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <option value="BOOKED_IN">Booked In</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="AWAITING_PARTS">Awaiting Parts</option>
              <option value="ON_HOLD">On Hold</option>
            </select>
          </div>
        </div>
      </div>

      {/* Repairs Table */}
      <div className="card">
        {repairs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No active repairs found</p>
            <button
              onClick={() => setShowBookModal(true)}
              className="btn btn-primary mt-4"
            >
              Book First Repair
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Tray/Location</th>
                    <th>Manufacturer</th>
                    <th>Model</th>
                    <th>IMEI</th>
                    <th>Fault</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {repairs.map((repair) => (
                    <tr key={repair.id}>
                      <td className="text-sm">{formatDate(repair.booked_in_at)}</td>
                      <td className="text-sm font-semibold">{repair.location_code}</td>
                      <td className="text-sm">{repair.manufacturer}</td>
                      <td className="text-sm">{repair.model_name || repair.model_number}</td>
                      <td className="text-sm font-mono">{repair.imei}</td>
                      <td className="text-sm" title={repair.fault_description}>
                        {truncateText(repair.fault_description)}
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(repair.status)}`}>
                          {repair.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <Link
                          to={`/level3/${repair.id}`}
                          className="btn btn-sm btn-primary"
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
            {pagination.totalPages > 1 && (
              <div className="mt-4 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total repairs)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="btn btn-sm btn-secondary"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= pagination.totalPages}
                    className="btn btn-sm btn-secondary"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Book Repair Modal */}
      <BookRepairModal
        isOpen={showBookModal}
        onClose={() => setShowBookModal(false)}
        onSuccess={() => {
          setShowBookModal(false);
          // Refresh will happen automatically via React Query
        }}
      />
    </div>
  );
}
