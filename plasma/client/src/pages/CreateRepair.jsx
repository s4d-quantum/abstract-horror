import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usePurchaseOrders } from '../hooks/usePurchaseOrders';
import { useSalesOrders } from '../hooks/useSalesOrders';
import { useCreateRepairJob } from '../hooks/useRepairModule';
import { createRepairJobSchema } from '../schemas/repair';
import SearchableSelect from '../components/SearchableSelect';
import { getApiErrorMessage } from '../lib/errors';

export default function CreateRepair() {
  const navigate = useNavigate();

  const [jobForm, setJobForm] = useState({
    purchase_order_id: '',
    priority: 'NORMAL',
    target_sales_order_id: '',
    notes: '',
  });

  const { data: purchaseOrdersData } = usePurchaseOrders({ limit: 500 });
  const { data: salesOrdersData } = useSalesOrders({ limit: 500 });
  const createJobMutation = useCreateRepairJob();

  const purchaseOrders = purchaseOrdersData?.orders || [];
  const salesOrders = salesOrdersData?.orders || [];

  // Format PO options for SearchableSelect
  const poOptions = purchaseOrders.map((order) => ({
    id: order.id,
    label: `${order.poNumber || order.po_number} - ${order.supplier?.name || order.supplier_name || 'Unknown'}`,
  }));

  const soOptions = salesOrders.map((order) => ({
    id: order.id,
    label: `${order.soNumber || order.so_number} - ${order.status}`,
  }));

  const handleCreateJob = async (event) => {
    event.preventDefault();

    const payload = {
      purchase_order_id: parseInt(jobForm.purchase_order_id, 10) || 0,
      priority: jobForm.priority,
      target_sales_order_id: jobForm.target_sales_order_id
        ? parseInt(jobForm.target_sales_order_id, 10)
        : null,
      notes: jobForm.notes || null,
    };

    const validation = createRepairJobSchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    try {
      const result = await createJobMutation.mutateAsync(validation.data);
      toast.success(`Repair job ${result.jobNumber} created`);
      navigate('/repair');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create repair job'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Repair Job</h1>
          <p className="text-gray-600 mt-1">
            Create a new IMEI repair job from a purchase order.
          </p>
        </div>
        <Link to="/repair" className="btn btn-secondary">
          Back to Repair
        </Link>
      </div>

      <div className="card max-w-2xl">
        <form onSubmit={handleCreateJob} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Order</label>
            <SearchableSelect
              options={poOptions}
              value={jobForm.purchase_order_id}
              onChange={(value) => setJobForm({ ...jobForm, purchase_order_id: value })}
              placeholder="Select PO..."
              getOptionLabel={(option) => option.label}
              getOptionValue={(option) => option.id}
            />
            <p className="text-xs text-gray-500 mt-1">
              Type to search by PO number or supplier name
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={jobForm.priority}
              onChange={(event) => setJobForm({ ...jobForm, priority: event.target.value })}
              className="input"
            >
              {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Sales Order</label>
            <SearchableSelect
              options={soOptions}
              value={jobForm.target_sales_order_id}
              onChange={(value) => setJobForm({ ...jobForm, target_sales_order_id: value })}
              placeholder="None"
              getOptionLabel={(option) => option.label}
              getOptionValue={(option) => option.id}
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional: Link this repair job to a sales order
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={4}
              value={jobForm.notes}
              onChange={(event) => setJobForm({ ...jobForm, notes: event.target.value })}
              className="input w-full"
            />
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={createJobMutation.isPending}>
            {createJobMutation.isPending ? 'Creating...' : 'Create Repair Job'}
          </button>
        </form>
      </div>
    </div>
  );
}
