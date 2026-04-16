import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useRepair, useUpdateRepair } from '../hooks/useLevel3';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../lib/errors';

export default function Level3Detail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error: fetchError } = useRepair(id);
  const updateRepairMutation = useUpdateRepair();

  const [status, setStatus] = useState('');
  const [engineerComments, setEngineerComments] = useState('');

  const repair = data?.repair;

  // Initialize form fields when data loads
  useEffect(() => {
    if (repair) {
      setStatus(repair.status);
      setEngineerComments(repair.engineer_comments || '');
    }
  }, [repair]);

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      BOOKED_IN: 'badge-info',
      IN_PROGRESS: 'badge-warning',
      AWAITING_PARTS: 'badge-warning',
      ON_HOLD: 'badge-gray',
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

  const handleSave = async () => {
    if (!status) {
      toast.error('Please select a status');
      return;
    }

    try {
      await updateRepairMutation.mutateAsync({
        id,
        data: {
          status,
          engineer_comments: engineerComments
        }
      });

      toast.success('Repair updated successfully');
      navigate('/level3');
    } catch (err) {
      const errorMessage = getApiErrorMessage(err, 'Failed to update repair');
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading repair details...</p>
      </div>
    );
  }

  if (fetchError || !repair) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error loading repair details</p>
        <Link to="/level3" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          Back to Active Repairs
        </Link>
      </div>
    );
  }

  const closedStatuses = ['COMPLETED', 'BER', 'UNREPAIRABLE'];
  const isClosed = closedStatuses.includes(repair.status);
  const statusOptions = ['BOOKED_IN', 'IN_PROGRESS', 'AWAITING_PARTS', 'ON_HOLD', 'COMPLETED', 'BER', 'UNREPAIRABLE'];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/level3"
          className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block"
        >
          ← Back to Active Repairs
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Level 3 Repair Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Information Card */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Device Information</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">IMEI:</span>
              <span className="font-mono font-semibold">{repair.imei}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Manufacturer:</span>
              <span className="font-medium">{repair.manufacturer}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Model:</span>
              <span className="font-medium">{repair.model_name || repair.model_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Storage:</span>
              <span className="font-medium">{repair.storage_gb ? `${repair.storage_gb}GB` : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Color:</span>
              <span className="font-medium">{repair.color || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Grade:</span>
              <span className="font-medium">{repair.grade || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Current Location:</span>
              <span className="font-medium">{repair.current_location || '-'}</span>
            </div>
          </div>
        </div>

        {/* Repair Information Card */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Repair Information</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Repair Bay:</span>
              <span className="badge badge-info">{repair.location_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Booked In:</span>
              <span className="font-medium">{formatDate(repair.booked_in_at)}</span>
            </div>
            {repair.completed_at && (
              <div className="flex justify-between">
                <span className="text-gray-600">Completed:</span>
                <span className="font-medium">{formatDate(repair.completed_at)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Booked By:</span>
              <span className="font-medium">{repair.booked_by_name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Current Status:</span>
              <span className={`badge ${getStatusBadgeClass(repair.status)}`}>
                {repair.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fault Description */}
      <div className="card mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Fault Description</h2>
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <p className="text-gray-800 whitespace-pre-wrap">{repair.fault_description}</p>
        </div>
      </div>

      {/* Edit Form */}
      <div className="card mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Update Repair Status</h2>

        {isClosed && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              This repair is closed and cannot be modified. Status: {repair.status}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Status Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isClosed || updateRepairMutation.isPending}
              className="input w-full"
            >
              {statusOptions.map((statusOption) => (
                <option key={statusOption} value={statusOption}>
                  {statusOption.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            {closedStatuses.includes(status) && status !== repair.status && (
              <p className="text-sm text-orange-600 mt-1">
                {status === 'COMPLETED' && 'Device will be moved to L3_COMPLETE location'}
                {(status === 'BER' || status === 'UNREPAIRABLE') && 'Device will be moved to L3_FAILS location'}
              </p>
            )}
          </div>

          {/* Engineer Comments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Engineer Comments
            </label>
            <textarea
              value={engineerComments}
              onChange={(e) => setEngineerComments(e.target.value)}
              disabled={isClosed || updateRepairMutation.isPending}
              rows={6}
              placeholder="Add comments about the repair work..."
              className="input w-full"
            />
          </div>
        </div>

        {/* Action Buttons */}
        {!isClosed && (
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/level3')}
              disabled={updateRepairMutation.isPending}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={updateRepairMutation.isPending || !status}
              className="btn btn-primary"
            >
              {updateRepairMutation.isPending ? 'Saving...' : 'Save & Close'}
            </button>
          </div>
        )}

        {isClosed && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/level3')}
              className="btn btn-secondary"
            >
              Back to List
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
