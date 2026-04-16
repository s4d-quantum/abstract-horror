import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQcJobs } from '../hooks/useQcModule';

const STATUS_BADGE = {
  PENDING:     'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED:   'bg-green-100 text-green-800',
  CANCELLED:   'bg-red-100 text-red-700',
};

export default function QC() {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 25,
    search: '',
    status: '',
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, search: debouncedSearch, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [debouncedSearch]);

  const { data, isLoading } = useQcJobs({
    ...filters,
    search: filters.search || undefined,
    status: filters.status || undefined,
  });

  const jobs = data?.jobs || [];
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quality Control</h1>
          <p className="text-gray-600 mt-1">
            Inspect and grade devices before they enter stock or repair.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">QC Jobs</h2>
            <p className="text-sm text-gray-600 mt-1">
              Each job corresponds to a purchase order batch. Open a job to grade devices.
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={debouncedSearch}
              onChange={(e) => setDebouncedSearch(e.target.value)}
              className="input"
              placeholder="Search job, PO, supplier..."
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
              className="input"
            >
              <option value="">All statuses</option>
              {['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading QC jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No QC jobs found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Date</th>
                    <th>Purchase Order</th>
                    <th>Supplier</th>
                    <th>Location</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td>
                        <Link
                          to={`/qc/jobs/${job.id}`}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          {job.job_number}
                        </Link>
                      </td>
                      <td>{job.created_at ? new Date(job.created_at).toLocaleDateString() : '—'}</td>
                      <td>
                        <Link
                          to={`/goods-in/${job.purchase_order_id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {job.po_number}
                        </Link>
                      </td>
                      <td>{job.supplier_name}</td>
                      <td>{job.location_name || job.location_code || '—'}</td>
                      <td>
                        {job.completed_devices ?? 0} / {job.total_devices ?? 0}
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[job.status] || 'bg-gray-100 text-gray-700'}`}>
                          {job.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <Link
                          to={`/qc/jobs/${job.id}`}
                          className="btn btn-primary btn-sm"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-600">
                Page {pagination.page || 1} of {pagination.totalPages || 1}
                {' '}({pagination.total || 0} jobs)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setFilters((f) => ({ ...f, page: Math.max(f.page - 1, 1) }))}
                  disabled={(pagination.page || 1) <= 1}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                  disabled={(pagination.page || 1) >= (pagination.totalPages || 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
