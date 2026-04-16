import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useRepairJob,
  useRepairMeta,
  useUpdateRepairJob,
} from '../hooks/useRepairModule';

export default function RepairJobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useRepairJob(id);
  const { data: metaData } = useRepairMeta();
  const updateJobMutation = useUpdateRepairJob();

  const [jobForm, setJobForm] = useState({
    priority: 'NORMAL',
    target_sales_order_id: '',
    notes: '',
  });

  const job = data?.job;
  const records = data?.records || [];
  const salesOrders = metaData?.salesOrders || [];

  useEffect(() => {
    if (job) {
      setJobForm({
        priority: job.priority || 'NORMAL',
        target_sales_order_id: job.target_sales_order_id ? String(job.target_sales_order_id) : '',
        notes: job.notes || '',
      });
    }
  }, [job]);

  const handleSaveJob = async () => {
    try {
      await updateJobMutation.mutateAsync({
        id,
        data: {
          priority: jobForm.priority,
          target_sales_order_id: jobForm.target_sales_order_id
            ? parseInt(jobForm.target_sales_order_id, 10)
            : null,
          notes: jobForm.notes || null,
        },
      });
      toast.success('Repair job saved');
    } catch (mutationError) {
      toast.error(mutationError.response?.data?.error?.message || mutationError.message);
    }
  };

  const handleCompleteJob = async () => {
    try {
      await updateJobMutation.mutateAsync({
        id,
        data: {
          status: 'COMPLETED',
          priority: jobForm.priority,
          target_sales_order_id: jobForm.target_sales_order_id
            ? parseInt(jobForm.target_sales_order_id, 10)
            : null,
          notes: jobForm.notes || null,
        },
      });
      toast.success('Repair job completed');
      navigate('/repair');
    } catch (mutationError) {
      toast.error(mutationError.response?.data?.error?.message || mutationError.message);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading repair job...</div>;
  }

  if (error || !job) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Failed to load repair job.</p>
        <Link to="/repair" className="text-blue-600 hover:text-blue-800">
          Back to Repair Module
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link to="/repair" className="text-blue-600 hover:text-blue-800 text-sm">
            ← Back to Repair Module
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{job.job_number}</h1>
          <p className="text-gray-600 mt-1">
            {job.po_number} · {job.supplier_name}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {job.status !== 'COMPLETED' && job.status !== 'CANCELLED' && (
            <button
              type="button"
              onClick={() => navigate(`/repair/jobs/${id}/bulk-repair`)}
              className="btn bg-purple-600 hover:bg-purple-700 text-white"
            >
              Bulk Repair
            </button>
          )}
          <div className="text-right">
            <span className={`badge ${
              job.status === 'COMPLETED'
                ? 'badge-success'
                : job.status === 'IN_PROGRESS'
                  ? 'badge-warning'
                  : job.status === 'CANCELLED'
                    ? 'badge-danger'
                    : 'badge-gray'
            }`}>
              {job.status.replace(/_/g, ' ')}
            </span>
            <p className="text-sm text-gray-500 mt-2">
              {job.completed_devices}/{job.total_devices} devices closed
            </p>
          </div>
        </div>
      </div>

      {/* Job Devices Table */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Devices</h2>
        {records.length === 0 ? (
          <p className="text-gray-500 py-6 text-center">No devices are attached to this job yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>IMEI</th>
                  <th>Manufacturer</th>
                  <th>Model</th>
                  <th>Color</th>
                  <th>Storage</th>
                  <th>Grade</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <Link
                        to={`/repair/records/${record.id}`}
                        className="font-mono text-sm text-blue-600 hover:text-blue-800"
                      >
                        {record.imei}
                      </Link>
                    </td>
                    <td>{record.manufacturer_name}</td>
                    <td>{record.model_name || record.model_number}</td>
                    <td>{record.color || '-'}</td>
                    <td>{record.storage_gb ? `${record.storage_gb}GB` : '-'}</td>
                    <td>{record.grade || '-'}</td>
                    <td>
                      <span className={`badge ${
                        record.status === 'COMPLETED'
                          ? 'badge-success'
                          : record.status === 'IN_PROGRESS'
                            ? 'badge-warning'
                            : record.status === 'BER'
                              ? 'badge-danger'
                              : record.status === 'ESCALATED_L3'
                                ? 'badge-info'
                                : 'badge-gray'
                      }`}>
                        {record.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => navigate(`/repair/records/${record.id}`)}
                        className="btn btn-sm btn-secondary"
                      >
                        Open Device
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settings and Actions */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={jobForm.priority}
              onChange={(event) => setJobForm((current) => ({ ...current, priority: event.target.value }))}
              className="input"
              disabled={job.status === 'COMPLETED' || job.status === 'CANCELLED'}
            >
              {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Sales Order</label>
            <select
              value={jobForm.target_sales_order_id}
              onChange={(event) => setJobForm((current) => ({ ...current, target_sales_order_id: event.target.value }))}
              className="input"
              disabled={job.status === 'COMPLETED' || job.status === 'CANCELLED'}
            >
              <option value="">None</option>
              {salesOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.so_number || order.soNumber}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          rows={2}
          value={jobForm.notes}
          onChange={(event) => setJobForm((current) => ({ ...current, notes: event.target.value }))}
          className="input w-full mb-4"
          disabled={job.status === 'COMPLETED' || job.status === 'CANCELLED'}
        />
        {job.status !== 'COMPLETED' && job.status !== 'CANCELLED' && (
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleSaveJob}
              disabled={updateJobMutation.isPending}
              className="btn bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              {updateJobMutation.isPending ? 'Saving...' : 'Save Job'}
            </button>
            <button
              type="button"
              onClick={handleCompleteJob}
              disabled={updateJobMutation.isPending}
              className="btn bg-green-600 hover:bg-green-700 text-white"
            >
              {updateJobMutation.isPending ? 'Completing...' : 'Complete Job'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
