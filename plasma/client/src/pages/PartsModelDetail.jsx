import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import PartsSectionNav from '../components/parts/PartsSectionNav';
import { useCreatePartCompatibility, usePartBases, usePartModelDetail } from '../hooks/useParts';
import { createPartCompatibilitySchema } from '../schemas/parts';

function buildBaseRows(compatibility, variants) {
  return compatibility.map((rule) => {
    const ruleVariants = variants.filter((variant) => String(variant.part_base_id) === String(rule.part_base_id));
    const availableStock = ruleVariants.reduce((sum, variant) => sum + Number(variant.available_stock || 0), 0);
    const faultyStock = ruleVariants.reduce((sum, variant) => sum + Number(variant.faulty_stock || 0), 0);
    const colours = Array.from(
      new Set(
        ruleVariants
          .map((variant) => String(variant.color || '').trim())
          .filter(Boolean),
      ),
    );

    return {
      ...rule,
      available_stock: availableStock,
      faulty_stock: faultyStock,
      variant_count: ruleVariants.length,
      colour_count: colours.length,
      colours,
    };
  });
}

export default function PartsModelDetail() {
  const { id } = useParams();

  const { data, isLoading, error } = usePartModelDetail(id);
  const { data: partBasesData } = usePartBases();
  const createCompatibilityMutation = useCreatePartCompatibility();

  const model = data?.model || null;
  const compatibility = data?.compatibility || [];
  const variants = data?.variants || [];
  const partBases = partBasesData?.bases || [];

  const [compatibilityForm, setCompatibilityForm] = useState({
    part_base_id: '',
    notes: '',
  });

  const baseRows = buildBaseRows(compatibility, variants);
  const linkedBaseIds = compatibility.map((rule) => String(rule.part_base_id));
  const availableBases = partBases.filter((base) => !linkedBaseIds.includes(String(base.id)));
  const totalAvailableStock = variants.reduce((sum, variant) => sum + Number(variant.available_stock || 0), 0);
  const totalFaultyStock = variants.reduce((sum, variant) => sum + Number(variant.faulty_stock || 0), 0);

  const handleCreateCompatibility = async (event) => {
    event.preventDefault();

    const payload = {
      part_base_id: parseInt(compatibilityForm.part_base_id, 10) || 0,
      model_id: parseInt(id, 10) || 0,
      storage_gb: 0,
      notes: compatibilityForm.notes ? compatibilityForm.notes.trim() : null,
    };

    const validation = createPartCompatibilitySchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    try {
      await createCompatibilityMutation.mutateAsync(validation.data);
      toast.success('Compatibility rule created');
      setCompatibilityForm({
        part_base_id: '',
        notes: '',
      });
    } catch (mutationError) {
      toast.error(mutationError.response?.data?.error?.message || mutationError.message);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading parts model...</div>;
  }

  if (error || !model) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Failed to load parts device page.</p>
        <Link to="/parts?tab=management" className="text-blue-600 hover:text-blue-800">
          Back to Parts Management
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div>
          <Link to="/parts?tab=management" className="text-blue-600 hover:text-blue-800 text-sm">
            ← Back to Parts Management
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            {model.manufacturer_name} {model.model_name || model.model_number}
          </h1>
          <p className="text-gray-600 mt-1">Model code {model.model_number}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
          <div className="font-medium text-gray-900">Device-specific parts view</div>
          <div className="mt-1">Link a compatible part base here, then open that part to manage rules, variants, and notes.</div>
        </div>
      </div>

      <PartsSectionNav activeTab="management" />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Compatible Bases</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{baseRows.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Active Variants</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{variants.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Available Stock</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalAvailableStock}</p>
          {totalFaultyStock > 0 && (
            <p className="text-xs text-amber-700 font-medium mt-2">{totalFaultyStock} faulty / quarantined</p>
          )}
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Need a new base?</p>
          <Link to={`/parts?tab=add&model_id=${model.id}`} className="btn btn-primary btn-sm mt-3">
            Add Part For This Device
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] gap-6">
        <div className="card">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Compatible Part Bases</h2>
              <p className="text-sm text-gray-600 mt-1">Click a base name or use Manage to open the dedicated part page.</p>
            </div>
          </div>

          {baseRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
              No part bases are linked to this device yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Part Base</th>
                    <th>Category</th>
                    <th>Variants</th>
                    <th>Available</th>
                    <th>Faulty</th>
                    <th>Colours</th>
                    <th>Service Pack</th>
                    <th>Rule Note</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {baseRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link
                          to={`/parts/bases/${row.part_base_id}?model_id=${model.id}`}
                          className="font-medium text-blue-700 hover:text-blue-900"
                        >
                          {row.base_name}
                        </Link>
                        <div className="text-xs text-gray-500 font-mono mt-1">{row.base_code}</div>
                        <div className="text-xs text-gray-500 mt-1">{row.subtype || 'No subtype'}</div>
                      </td>
                      <td>{row.category_name}</td>
                      <td>{row.variant_count}</td>
                      <td>{row.available_stock}</td>
                      <td className={row.faulty_stock > 0 ? 'text-amber-700 font-medium' : ''}>{row.faulty_stock}</td>
                      <td>{row.colour_count ? row.colours.join(', ') : '-'}</td>
                      <td>{row.changes_device_color ? 'Yes' : 'No'}</td>
                      <td>{row.notes || '-'}</td>
                      <td>
                        <Link to={`/parts/bases/${row.part_base_id}?model_id=${model.id}`} className="btn btn-secondary btn-sm">
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Add Compatibility Rule</h2>
              <p className="text-sm text-gray-600 mt-1">Link an existing part base to this exact device model.</p>
            </div>
          </div>

          {availableBases.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Every active base is already linked here, or there are no active bases available yet.
              </p>
              <Link to={`/parts?tab=add&model_id=${model.id}`} className="btn btn-primary">
                Create A New Base
              </Link>
            </div>
          ) : (
            <form onSubmit={handleCreateCompatibility} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Part Base</label>
                <select
                  value={compatibilityForm.part_base_id}
                  onChange={(event) => setCompatibilityForm({ ...compatibilityForm, part_base_id: event.target.value })}
                  className="input"
                >
                  <option value="">Select base...</option>
                  {availableBases.map((base) => (
                    <option key={base.id} value={base.id}>
                      {base.base_code} - {base.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Device</label>
                <input
                  type="text"
                  value={`${model.manufacturer_name} ${model.model_name || model.model_number} (${model.model_number})`}
                  className="input"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internal Note</label>
                <textarea
                  rows={4}
                  value={compatibilityForm.notes}
                  onChange={(event) => setCompatibilityForm({ ...compatibilityForm, notes: event.target.value })}
                  className="input w-full"
                  placeholder="Optional note about fitment, service pack differences, or assembly guidance"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Link to={`/parts?tab=add&model_id=${model.id}`} className="text-sm text-blue-600 hover:text-blue-800">
                  Need to create a new base first?
                </Link>
                <button type="submit" className="btn btn-primary" disabled={createCompatibilityMutation.isPending}>
                  {createCompatibilityMutation.isPending ? 'Saving...' : 'Add Rule'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
