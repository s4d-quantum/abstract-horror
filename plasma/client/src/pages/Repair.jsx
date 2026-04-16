import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useRepairJobs } from '../hooks/useRepairModule';

const STATUS_BADGE = {
  PENDING:     'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED:   'bg-green-100 text-green-800',
  CANCELLED:   'bg-red-100 text-red-700',
};

export default function Repair() {
  const [jobFilters, setJobFilters] = useState({
    page: 1,
    limit: 25,
    search: '',
    status: '',
  });

  // Debounced search state
  const [debouncedSearch, setDebouncedSearch] = useState(jobFilters.search);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setJobFilters((current) => ({
        ...current,
        search: debouncedSearch,
        page: 1,
      }));
    }, 300);

    return () => clearTimeout(timer);
  }, [debouncedSearch]);

  // Sync debouncedSearch when jobFilters.search changes externally (e.g., filter reset)
  useEffect(() => {
    setDebouncedSearch(jobFilters.search);
  }, [jobFilters.search]);

  const handleSearchChange = (value) => {
    setDebouncedSearch(value);
  };

  const { data: jobsData, isLoading: jobsLoading } = useRepairJobs({
    ...jobFilters,
    search: jobFilters.search || undefined,
    status: jobFilters.status || undefined,
  });

  const jobs = jobsData?.jobs || [];
  const pagination = jobsData?.pagination || {};

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repair</h1>
          <p className="text-gray-600 mt-1">
            Manage IMEI repair jobs and batch devices into standard repair workflow.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/repair/create" className="btn btn-primary">
            Create Repair
          </Link>
          <Link to="/parts" className="btn btn-secondary">
            Open Parts
          </Link>
        </div>
      </div>

      <div>
        <div className="card">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">IMEI Repair Jobs</h2>
              <p className="text-sm text-gray-600 mt-1">
                Search jobs, monitor progress, and open a batch to work at device level.
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                value={debouncedSearch}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="input"
                placeholder="Search job, PO, supplier..."
              />
              <select
                value={jobFilters.status}
                onChange={(event) => setJobFilters((current) => ({
                  ...current,
                  status: event.target.value,
                  page: 1,
                }))}
                className="input"
              >
                <option value="">All statuses</option>
                {['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {jobsLoading ? (
            <div className="text-center py-12 text-gray-500">Loading repair jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No repair jobs found.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>Date</th>
                      <th>PO</th>
                      <th>Supplier</th>
                      <th>Qty</th>
                      <th>Completed</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id}>
                        <td>
                          <Link
                            to={`/repair/jobs/${job.id}`}
                            className="font-medium text-blue-600 hover:text-blue-800"
                          >
                            {job.job_number}
                          </Link>
                        </td>
                        <td>{job.created_at ? new Date(job.created_at).toLocaleDateString() : '-'}</td>
                        <td>
                          <Link
                            to={`/goods-in/${job.purchase_order_id}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {job.po_number}
                          </Link>
                        </td>
                        <td>{job.supplier_name}</td>
                        <td>{job.total_devices}</td>
                        <td>{job.completed_devices}</td>
                        <td>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[job.status] || 'bg-gray-100 text-gray-700'}`}>
                            {job.status}
                          </span>
                        </td>
                        <td>
                          <Link to={`/repair/jobs/${job.id}`} className="btn btn-primary btn-sm">
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
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setJobFilters((current) => ({ ...current, page: Math.max(current.page - 1, 1) }))}
                    disabled={(pagination.page || 1) <= 1}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setJobFilters((current) => ({ ...current, page: current.page + 1 }))}
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
    </div>
  );
}
