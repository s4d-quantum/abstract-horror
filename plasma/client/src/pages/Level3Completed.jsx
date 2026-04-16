import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCompletedRepairs } from '../hooks/useLevel3';

export default function Level3Completed() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useCompletedRepairs({ page, limit: 50 });

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      COMPLETED: 'badge-success',
      BER: 'badge-danger',
      UNREPAIRABLE: 'badge-danger',
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
        <p className="text-gray-500">Loading completed repairs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error loading completed repairs: {error.message}</p>
      </div>
    );
  }

  const repairs = data?.repairs || [];
  const pagination = data?.pagination || {};

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Link
            to="/level3"
            className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block"
          >
            ← Back to Active Repairs
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Level 3 Completed Repairs</h1>
        </div>
      </div>

      {/* Repairs Table */}
      <div className="card">
        {repairs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No completed repairs found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Completed Date</th>
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
                      <td className="text-sm">{formatDate(repair.completed_at)}</td>
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
                          className="btn btn-sm btn-secondary"
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
    </div>
  );
}
