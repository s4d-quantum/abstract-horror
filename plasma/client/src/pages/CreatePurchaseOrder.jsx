import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreatePurchaseOrder } from '../hooks/usePurchaseOrders';
import { useFilterOptions } from '../hooks/useDevices';
import { lookupTacModel } from '../api/tac';
import SearchableSelect from '../components/SearchableSelect';
import { createPurchaseOrderSchema } from '../schemas/purchaseOrder';
import { getApiErrorMessage } from '../lib/errors';

export default function CreatePurchaseOrder() {
  const navigate = useNavigate();
  const createMutation = useCreatePurchaseOrder();
  const { data: filterOptions } = useFilterOptions();

  const options = filterOptions?.options || {};

  const [formData, setFormData] = useState({
    supplier_id: '',
    supplier_ref: '',
    notes: '',
    status: 'DRAFT'
  });

  const [lines, setLines] = useState([
    {
      id: Date.now(),
      manufacturer_id: '',
      model_id: '',
      storage_gb: '',
      color: '',
      expected_quantity: 1,
      availableColors: [],
      availableStorages: [],
      tacLoading: false
    }
  ]);

  const addLine = () => {
    setLines(prevLines => [
      ...prevLines,
      {
        id: Date.now(),
        manufacturer_id: '',
        model_id: '',
        storage_gb: '',
        color: '',
        expected_quantity: 1,
        availableColors: [],
        availableStorages: [],
        tacLoading: false
      }
    ]);
  };

  const removeLine = (id) => {
    if (lines.length > 1) {
      setLines(prevLines => prevLines.filter(l => l.id !== id));
    }
  };

  const updateLine = (id, updates) => {
    setLines(prevLines => prevLines.map(l =>
      l.id === id ? { ...l, ...updates } : l
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      supplier_id: parseInt(formData.supplier_id) || 0,
      supplier_ref: formData.supplier_ref || null,
      notes: formData.notes || null,
      status: formData.status,
      lines: lines.map(l => ({
        manufacturer_id: parseInt(l.manufacturer_id) || 0,
        model_id: parseInt(l.model_id) || 0,
        storage_gb: l.storage_gb ? parseInt(l.storage_gb) : null,
        color: l.color || null,
        expected_quantity: parseInt(l.expected_quantity) || 0
      }))
    };

    const validation = createPurchaseOrderSchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    try {
      const result = await createMutation.mutateAsync(validation.data);
      toast.success(`Purchase order ${result.po_number} created successfully`);
      navigate(`/goods-in/${result.id}`);
    } catch (error) {
      toast.error(`Error creating purchase order: ${getApiErrorMessage(error, 'Unknown error')}`);
    }
  };

  // Get models filtered by manufacturer
  const getModelsForManufacturer = (manufacturerId) => {
    if (!manufacturerId || !options.models) return [];
    return options.models.filter(m => m.manufacturer_id === parseInt(manufacturerId));
  };

  // Fetch TAC data for a model to get available colors/storage
  const fetchTacDataForModel = async (lineId, modelId, manufacturerId) => {
    if (!modelId || !manufacturerId) return;

    // Set loading state
    updateLine(lineId, { tacLoading: true });

    try {
      // We need to fetch from the backend to get TAC codes for this manufacturer/model combo
      // For now, we'll try common TAC patterns or get the first TAC that matches
      // Since we don't have direct TAC access, we'll need to query the tac_lookup table
      // Let's create a new API endpoint for this

      const data = await lookupTacModel(modelId);

      if (data.success && data.data) {
        updateLine(lineId, {
          availableColors: data.data.colors || [],
          availableStorages: data.data.storages || [],
          tacLoading: false,
          color: '',
          storage_gb: ''
        });
      } else {
        updateLine(lineId, {
          availableColors: [],
          availableStorages: [],
          tacLoading: false
        });
      }
    } catch (error) {
      console.error('Error fetching TAC data:', error);
      updateLine(lineId, {
        availableColors: [],
        availableStorages: [],
        tacLoading: false
      });
    }
  };

  const handleModelChange = (lineId, modelId) => {
    const line = lines.find(l => l.id === lineId);
    updateLine(lineId, { model_id: modelId });
    if (modelId && line) {
      fetchTacDataForModel(lineId, modelId, line.manufacturer_id);
    } else {
      updateLine(lineId, {
        availableColors: [],
        availableStorages: [],
        color: '',
        storage_gb: ''
      });
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/goods-in"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Purchase Orders
        </Link>

        <h1 className="text-2xl font-bold text-gray-900">
          Create Purchase Order
        </h1>
        <p className="text-gray-600 mt-1">
          Create a new purchase order for incoming devices
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* PO Details */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Purchase Order Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Supplier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier *
              </label>
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="input"
                required
              >
                <option value="">Select Supplier</option>
                {options.suppliers?.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier Reference
              </label>
              <input
                type="text"
                value={formData.supplier_ref}
                onChange={(e) => setFormData({ ...formData, supplier_ref: e.target.value })}
                placeholder="e.g., Supplier's PO number"
                className="input"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Initial Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input"
              >
                <option value="DRAFT">Draft</option>
                <option value="CONFIRMED">Confirmed</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Draft orders can be edited, confirmed orders can receive devices
              </p>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="input"
                placeholder="Any additional notes about this order..."
              />
            </div>
          </div>
        </div>

        {/* Expected Items */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Expected Items
            </h2>
            <button
              type="button"
              onClick={addLine}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Line
            </button>
          </div>

          <div className="space-y-4">
            {lines.map((line, index) => (
              <div key={line.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Line {index + 1}</h3>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Manufacturer */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manufacturer *
                    </label>
                    <select
                      value={line.manufacturer_id}
                      onChange={(e) => {
                        updateLine(line.id, { manufacturer_id: e.target.value, model_id: '' });
                      }}
                      className="input"
                      required
                    >
                      <option value="">Select</option>
                      {options.manufacturers?.map(mfr => (
                        <option key={mfr.id} value={mfr.id}>{mfr.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Model */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model *
                    </label>
                    <SearchableSelect
                      options={getModelsForManufacturer(line.manufacturer_id)}
                      value={line.model_id}
                      onChange={(value) => handleModelChange(line.id, value)}
                      placeholder="Select model"
                      disabled={!line.manufacturer_id}
                      getOptionLabel={(model) => model.model_name || model.model_number}
                      getOptionValue={(model) => model.id}
                    />
                    {line.tacLoading && (
                      <p className="text-xs text-blue-600 mt-1">Loading color/storage options...</p>
                    )}
                  </div>

                  {/* Storage */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Storage (GB)
                    </label>
                    <select
                      value={line.storage_gb}
                      onChange={(e) => updateLine(line.id, { storage_gb: e.target.value })}
                      className="input"
                      disabled={!line.model_id || line.availableStorages.length === 0}
                    >
                      <option value="">Select</option>
                      {line.availableStorages.map(storage => (
                        <option key={storage} value={storage}>{storage}GB</option>
                      ))}
                    </select>
                    {line.model_id && line.availableStorages.length === 0 && !line.tacLoading && (
                      <p className="text-xs text-gray-500 mt-1">No storage options available for this model</p>
                    )}
                  </div>

                  {/* Color */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <select
                      value={line.color}
                      onChange={(e) => updateLine(line.id, { color: e.target.value })}
                      className="input"
                      disabled={!line.model_id || line.availableColors.length === 0}
                    >
                      <option value="">Select</option>
                      {line.availableColors.map(color => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>
                    {line.model_id && line.availableColors.length === 0 && !line.tacLoading && (
                      <p className="text-xs text-gray-500 mt-1">No color options available for this model</p>
                    )}
                  </div>

                  {/* Expected Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      value={line.expected_quantity}
                      onChange={(e) => updateLine(line.id, { expected_quantity: e.target.value })}
                      min="1"
                      className="input"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total Expected */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Total Expected Devices:
              </span>
              <span className="text-lg font-bold text-gray-900">
                {lines.reduce((sum, line) => sum + parseInt(line.expected_quantity || 0), 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            to="/goods-in"
            className="btn btn-secondary"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn btn-primary"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Purchase Order'}
          </button>
        </div>
      </form>
    </div>
  );
}
