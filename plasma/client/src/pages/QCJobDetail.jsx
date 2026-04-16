import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQcJob, useSaveQcResults, useCompleteQcJob } from '../hooks/useQcModule';
import { FUNCTIONAL_RESULTS, COSMETIC_RESULTS, GRADES } from '../schemas/qc';

const STATUS_BADGE = {
  PENDING:     'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED:   'bg-green-100 text-green-800',
  CANCELLED:   'bg-red-100 text-red-700',
};

export default function QCJobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQcJob(id);
  const saveResults = useSaveQcResults();
  const completeJob = useCompleteQcJob();

  // Map of device_id → edited row (only dirty rows are kept here)
  const [editedRows, setEditedRows] = useState({});
  const [textFilter, setTextFilter] = useState('');

  if (isLoading) return <div className="p-6 text-gray-500">Loading QC job...</div>;
  if (isError) return <div className="p-6 text-red-600">Failed to load QC job.</div>;

  const job = data?.job;
  const results = data?.results || [];

  if (!job) return <div className="p-6 text-gray-500">Job not found.</div>;

  const isClosed = job.status === 'COMPLETED' || job.status === 'CANCELLED';

  // Merge server state with local edits for display
  const mergedResults = results.map((r) => ({
    ...r,
    ...(editedRows[r.device_id] || {}),
  }));

  const filteredResults = textFilter
    ? mergedResults.filter(
        (r) =>
          r.imei?.includes(textFilter) ||
          r.model_name?.toLowerCase().includes(textFilter.toLowerCase()) ||
          r.color?.toLowerCase().includes(textFilter.toLowerCase()),
      )
    : mergedResults;

  const handleCellChange = (deviceId, field, value) => {
    if (isClosed) return;
    setEditedRows((prev) => {
      const base = results.find((r) => r.device_id === deviceId) || {};
      return {
        ...prev,
        [deviceId]: {
          ...base,
          ...(prev[deviceId] || {}),
          device_id: deviceId,
          [field]: value,
        },
      };
    });
  };

  const dirtyCount = Object.keys(editedRows).length;

  const handleSave = () => {
    if (dirtyCount === 0) {
      toast('No changes to save');
      return;
    }
    const rows = Object.values(editedRows);
    saveResults.mutate(
      { id, data: { results: rows } },
      {
        onSuccess: () => setEditedRows({}),
      },
    );
  };

  const handleComplete = () => {
    if (dirtyCount > 0) {
      toast.error('Save your changes before completing the job');
      return;
    }
    // Local validation: all devices must have functional_result
    const missing = mergedResults.filter((r) => !r.functional_result);
    if (missing.length > 0) {
      const imeis = missing.map((r) => r.imei).join(', ');
      toast.error(`Missing functional result for: ${imeis}`);
      return;
    }
    completeJob.mutate(id, {
      onSuccess: () => navigate('/qc'),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link to="/qc" className="text-gray-500 hover:text-gray-700 text-sm">
              ← QC Jobs
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{job.job_number}</h1>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_BADGE[job.status] || 'bg-gray-100 text-gray-700'}`}>
          {job.status.replace('_', ' ')}
        </span>
      </div>

      {/* Job info card */}
      <div className="card">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Purchase Order</p>
            <p className="font-medium">{job.po_number}</p>
          </div>
          <div>
            <p className="text-gray-500">Supplier</p>
            <p className="font-medium">{job.supplier_name}</p>
          </div>
          <div>
            <p className="text-gray-500">Date</p>
            <p className="font-medium">{new Date(job.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-gray-500">Progress</p>
            <p className="font-medium">
              {job.completed_devices ?? 0} / {job.total_devices ?? 0} tested
              {job.passed_devices != null && job.failed_devices != null && (
                <span className="text-gray-400 ml-1">
                  ({job.passed_devices} pass, {job.failed_devices} fail)
                </span>
              )}
            </p>
          </div>
        </div>
        {job.requires_repair && (
          <p className="mt-3 text-sm text-blue-700 bg-blue-50 rounded px-3 py-2">
            This PO requires repair — pass/unable/N/A devices will be queued for repair on completion.
          </p>
        )}
      </div>

      {/* Devices table */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Devices</h2>
            <p className="text-sm text-gray-500">{results.length} devices in this job</p>
          </div>
          <input
            type="text"
            value={textFilter}
            onChange={(e) => setTextFilter(e.target.value)}
            className="input md:w-64"
            placeholder="Filter by IMEI, model or colour..."
          />
        </div>

        {filteredResults.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No devices match the filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th>IMEI</th>
                  <th>Manufacturer</th>
                  <th>Model</th>
                  <th>Colour</th>
                  <th>Storage</th>
                  <th>Grade</th>
                  <th>Functional</th>
                  <th>Cosmetic</th>
                  <th>Non UK?</th>
                  <th>Comments</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((row) => (
                  <tr key={row.device_id} className={editedRows[row.device_id] ? 'bg-yellow-50' : ''}>
                    <td className="font-mono text-xs">
                      <Link
                        to={`/inventory/${row.device_id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {row.imei}
                      </Link>
                    </td>
                    <td>{row.manufacturer_name}</td>
                    <td>{row.model_name}</td>
                    <td>
                      <input
                        type="text"
                        className="input input-sm w-28"
                        value={row.color_verified ?? row.color ?? ''}
                        disabled={isClosed}
                        onChange={(e) => handleCellChange(row.device_id, 'color_verified', e.target.value)}
                        placeholder={row.color || '—'}
                        title="Override colour (leave blank to keep current)"
                      />
                    </td>
                    <td>{row.storage_gb ? `${row.storage_gb}GB` : '—'}</td>
                    <td>
                      <select
                        className="input input-sm w-20"
                        value={row.grade_assigned ?? row.grade ?? ''}
                        disabled={isClosed}
                        onChange={(e) => handleCellChange(row.device_id, 'grade_assigned', e.target.value || null)}
                      >
                        <option value="">—</option>
                        {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </td>
                    <td>
                      <select
                        className={`input input-sm w-28 ${!row.functional_result ? 'border-orange-300' : ''}`}
                        value={row.functional_result ?? ''}
                        disabled={isClosed}
                        onChange={(e) => handleCellChange(row.device_id, 'functional_result', e.target.value || null)}
                      >
                        <option value="">—</option>
                        {FUNCTIONAL_RESULTS.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </td>
                    <td>
                      <select
                        className="input input-sm w-24"
                        value={row.cosmetic_result ?? ''}
                        disabled={isClosed}
                        onChange={(e) => handleCellChange(row.device_id, 'cosmetic_result', e.target.value || null)}
                      >
                        <option value="">—</option>
                        {COSMETIC_RESULTS.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={row.non_uk ?? false}
                        disabled={isClosed}
                        onChange={(e) => handleCellChange(row.device_id, 'non_uk', e.target.checked)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="input input-sm w-40"
                        value={row.comments ?? ''}
                        disabled={isClosed}
                        onChange={(e) => handleCellChange(row.device_id, 'comments', e.target.value || null)}
                        placeholder="Comments..."
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Action buttons */}
        {!isClosed && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              {dirtyCount > 0
                ? <span className="text-yellow-700">{dirtyCount} unsaved {dirtyCount === 1 ? 'change' : 'changes'}</span>
                : 'All changes saved'}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSave}
                disabled={saveResults.isPending || dirtyCount === 0}
              >
                {saveResults.isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                className="btn bg-green-600 hover:bg-green-700 text-white"
                onClick={handleComplete}
                disabled={completeJob.isPending}
              >
                {completeJob.isPending ? 'Completing...' : 'Complete QC Job'}
              </button>
            </div>
          </div>
        )}

        {isClosed && (
          <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
            This QC job is {job.status.toLowerCase().replace('_', ' ')} and cannot be edited.
          </div>
        )}
      </div>
    </div>
  );
}
