import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import PartsSectionNav from '../components/parts/PartsSectionNav';
import SearchableSelect from '../components/SearchableSelect';
import {
  useCreatePartCompatibility,
  useCreatePartVariant,
  useDeletePartBase,
  useDeletePartCompatibility,
  useDeletePartVariant,
  usePartBaseDetail,
  usePartsMeta,
  useUpdatePartBase,
  useUpdatePartCompatibility,
  useUpdatePartVariant,
} from '../hooks/useParts';
import {
  createPartCompatibilitySchema,
  createPartVariantSchema,
  updatePartBaseSchema,
  updatePartCompatibilitySchema,
  updatePartVariantSchema,
} from '../schemas/parts';
import { categoryChangesDeviceColor } from '../utils/partCategories';

function buildBaseForm(base) {
  return {
    base_code: base?.base_code || '',
    name: base?.name || '',
    category_id: base?.category_id ? String(base.category_id) : '',
    manufacturer_id: base?.manufacturer_id ? String(base.manufacturer_id) : '',
    subtype: base?.subtype || '',
    changes_device_color: Boolean(base?.changes_device_color),
    notes: base?.notes || '',
  };
}

function buildCompatibilityForm(rule, fallbackModelId = '') {
  return {
    model_id: rule?.model_id ? String(rule.model_id) : String(fallbackModelId || ''),
    notes: rule?.notes || '',
  };
}

function buildVariantForm(variant, base) {
  return {
    category_id: variant?.category_id ? String(variant.category_id) : base?.category_id ? String(base.category_id) : '',
    sku: variant?.sku || '',
    name: variant?.name || '',
    color: variant?.color || '',
    supplier_part_ref: variant?.supplier_part_ref || '',
  };
}

function getModelLabel(model) {
  return model?.model_name || model?.model_number || 'Unknown model';
}

export default function PartBaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contextModelId = searchParams.get('model_id') || '';

  const { data, isLoading, error } = usePartBaseDetail(id);
  const { data: metaData } = usePartsMeta();

  const updateBaseMutation = useUpdatePartBase();
  const deleteBaseMutation = useDeletePartBase();
  const createCompatibilityMutation = useCreatePartCompatibility();
  const updateCompatibilityMutation = useUpdatePartCompatibility();
  const deleteCompatibilityMutation = useDeletePartCompatibility();
  const createVariantMutation = useCreatePartVariant();
  const updateVariantMutation = useUpdatePartVariant();
  const deleteVariantMutation = useDeletePartVariant();

  const base = data?.base || null;
  const compatibility = data?.compatibility || [];
  const variants = data?.variants || [];
  const categories = metaData?.categories || [];
  const manufacturers = metaData?.manufacturers || [];
  const models = metaData?.models || [];

  const [selectedCompatibilityId, setSelectedCompatibilityId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [hasHydratedCompatibility, setHasHydratedCompatibility] = useState(false);
  const [baseForm, setBaseForm] = useState(buildBaseForm(null));
  const [compatibilityForm, setCompatibilityForm] = useState(buildCompatibilityForm(null, contextModelId));
  const [variantForm, setVariantForm] = useState(buildVariantForm(null, null));

  const selectedCompatibility = compatibility.find((rule) => String(rule.id) === String(selectedCompatibilityId)) || null;
  const selectedVariant = variants.find((variant) => String(variant.id) === String(selectedVariantId)) || null;
  const contextRule = compatibility.find((rule) => String(rule.model_id) === String(contextModelId)) || null;
  const contextModel = models.find((model) => String(model.id) === String(contextModelId)) || null;

  const categoryName = categories.find((category) => String(category.id) === String(base?.category_id))?.name || '-';
  const manufacturerName = manufacturers.find((manufacturer) => String(manufacturer.id) === String(base?.manufacturer_id))?.name || 'Any manufacturer';
  const totalAvailableStock = variants.reduce((sum, variant) => sum + Number(variant.available_stock || 0), 0);
  const totalFaultyStock = variants.reduce((sum, variant) => sum + Number(variant.faulty_stock || 0), 0);
  const colourVariantCount = variants.filter((variant) => String(variant.color || '').trim().length > 0).length;

  const linkedModelIds = compatibility.map((rule) => String(rule.model_id));
  const availableModels = models.filter((model) => {
    if (selectedCompatibility && String(model.id) === String(selectedCompatibility.model_id)) {
      return true;
    }

    return !linkedModelIds.includes(String(model.id));
  });

  useEffect(() => {
    setHasHydratedCompatibility(false);
    setSelectedCompatibilityId('');
  }, [contextModelId, id]);

  useEffect(() => {
    if (!base) {
      return;
    }

    setBaseForm(buildBaseForm(base));
  }, [base]);

  useEffect(() => {
    if (!base) {
      return;
    }

    if (!hasHydratedCompatibility) {
      if (contextRule) {
        setSelectedCompatibilityId(String(contextRule.id));
        setCompatibilityForm(buildCompatibilityForm(contextRule, contextModelId));
      } else {
        setCompatibilityForm(buildCompatibilityForm(null, contextModelId));
      }
      setHasHydratedCompatibility(true);
      return;
    }

    if (selectedCompatibility) {
      setCompatibilityForm(buildCompatibilityForm(selectedCompatibility, contextModelId));
      return;
    }

    setCompatibilityForm(buildCompatibilityForm(null, contextModelId));
  }, [base, contextModelId, contextRule, hasHydratedCompatibility, selectedCompatibility]);

  useEffect(() => {
    if (!base) {
      return;
    }

    if (selectedVariant) {
      setVariantForm(buildVariantForm(selectedVariant, base));
      return;
    }

    setVariantForm(buildVariantForm(null, base));
  }, [base, selectedVariant]);

  const resetCompatibilityForm = () => {
    setSelectedCompatibilityId('');
    setCompatibilityForm(buildCompatibilityForm(null, contextModelId));
  };

  const resetVariantForm = () => {
    setSelectedVariantId('');
    setVariantForm(buildVariantForm(null, base));
  };

  const handleUpdateBase = async (event) => {
    event.preventDefault();
    if (!base) {
      toast.error('Part base not found');
      return;
    }

    const payload = {
      base_code: baseForm.base_code.trim(),
      name: baseForm.name.trim(),
      category_id: parseInt(baseForm.category_id, 10) || 0,
      manufacturer_id: baseForm.manufacturer_id ? parseInt(baseForm.manufacturer_id, 10) : null,
      subtype: baseForm.subtype ? baseForm.subtype.trim() : null,
      changes_device_color: baseForm.changes_device_color,
      notes: baseForm.notes ? baseForm.notes.trim() : null,
    };

    const validation = updatePartBaseSchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    try {
      await updateBaseMutation.mutateAsync({
        id: base.id,
        data: validation.data,
      });
      toast.success('Part base updated');
    } catch (mutationError) {
      toast.error(mutationError.response?.data?.error?.message || mutationError.message);
    }
  };

  const handleDeleteBase = async () => {
    if (!base) {
      toast.error('Part base not found');
      return;
    }

    if (!window.confirm('Delete this part base and hide all linked variants from active use?')) {
      return;
    }

    try {
      await deleteBaseMutation.mutateAsync(base.id);
      toast.success('Part base deleted');
      navigate(contextModelId ? `/parts/models/${contextModelId}` : '/parts?tab=management');
    } catch (mutationError) {
      toast.error(mutationError.response?.data?.error?.message || mutationError.message);
    }
  };

  const handleSubmitCompatibility = async (event) => {
    event.preventDefault();
    if (!base) {
      toast.error('Part base not found');
      return;
    }

    const payload = {
      part_base_id: base.id,
      model_id: parseInt(compatibilityForm.model_id, 10) || 0,
      notes: compatibilityForm.notes ? compatibilityForm.notes.trim() : null,
    };

    const validation = (selectedCompatibility ? updatePartCompatibilitySchema : createPartCompatibilitySchema).safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    try {
      if (selectedCompatibility) {
        await updateCompatibilityMutation.mutateAsync({
          id: selectedCompatibility.id,
          data: validation.data,
        });
        toast.success('Compatibility rule updated');
      } else {
        await createCompatibilityMutation.mutateAsync(validation.data);
        toast.success('Compatibility rule created');
      }
      resetCompatibilityForm();
    } catch (mutationError) {
      toast.error(mutationError.response?.data?.error?.message || mutationError.message);
    }
  };

  const handleDeleteCompatibility = async (rule = selectedCompatibility) => {
    if (!rule) {
      toast.error('Select a compatibility rule first');
      return;
    }

    if (!window.confirm('Delete this compatibility rule?')) {
      return;
    }

    try {
      await deleteCompatibilityMutation.mutateAsync(rule.id);
      toast.success('Compatibility rule deleted');
      if (String(selectedCompatibilityId) === String(rule.id)) {
        resetCompatibilityForm();
      }
    } catch (mutationError) {
      toast.error(mutationError.response?.data?.error?.message || mutationError.message);
    }
  };

  const handleSubmitVariant = async (event) => {
    event.preventDefault();
    if (!base) {
      toast.error('Part base not found');
      return;
    }

    const payload = {
      part_base_id: base.id,
      category_id: parseInt(variantForm.category_id || base.category_id, 10) || 0,
      sku: variantForm.sku.trim(),
      name: variantForm.name.trim(),
      color: variantForm.color ? variantForm.color.trim() : null,
      quality_tier: selectedVariant?.quality_tier || 'OTHER',
      supplier_part_ref: variantForm.supplier_part_ref ? variantForm.supplier_part_ref.trim() : null,
    };

    const validation = (selectedVariant ? updatePartVariantSchema : createPartVariantSchema).safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    try {
      if (selectedVariant) {
        await updateVariantMutation.mutateAsync({
          id: selectedVariant.id,
          data: validation.data,
        });
        toast.success('Part variant updated');
      } else {
        await createVariantMutation.mutateAsync(validation.data);
        toast.success('Part variant created');
      }
      resetVariantForm();
    } catch (mutationError) {
      toast.error(mutationError.response?.data?.error?.message || mutationError.message);
    }
  };

  const handleDeleteVariant = async (variant = selectedVariant) => {
    if (!variant) {
      toast.error('Select a part variant first');
      return;
    }

    if (!window.confirm('Delete this part variant from active use?')) {
      return;
    }

    try {
      await deleteVariantMutation.mutateAsync(variant.id);
      toast.success('Part variant deleted');
      if (String(selectedVariantId) === String(variant.id)) {
        resetVariantForm();
      }
    } catch (mutationError) {
      toast.error(mutationError.response?.data?.error?.message || mutationError.message);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading part base...</div>;
  }

  if (error || !base) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Failed to load part base.</p>
        <Link to={contextModelId ? `/parts/models/${contextModelId}` : '/parts?tab=management'} className="text-blue-600 hover:text-blue-800">
          Back to parts management
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div>
          <Link to={contextModelId ? `/parts/models/${contextModelId}` : '/parts?tab=management'} className="text-blue-600 hover:text-blue-800 text-sm">
            {contextModelId ? '← Back to Device Parts' : '← Back to Parts Management'}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            {base.base_code} · {base.name}
          </h1>
          <p className="text-gray-600 mt-1">
            {categoryName} · {manufacturerName} · {base.subtype || 'No subtype'}
          </p>
        </div>

        {contextModel ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <div className="font-medium">Opened from {getModelLabel(contextModel)}</div>
            <div className="mt-1">
              {contextRule ? 'This base is already linked to that device model.' : 'This base is not yet linked to that device model.'}
            </div>
          </div>
        ) : null}
      </div>

      <PartsSectionNav activeTab="management" />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Compatible Devices</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{compatibility.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Variants</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{variants.length}</p>
          <p className="text-xs text-gray-500 mt-2">{colourVariantCount} with a colour assigned</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Available Stock</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalAvailableStock}</p>
        </div>
        <div className={`card ${totalFaultyStock > 0 ? 'border-amber-300 bg-amber-50' : ''}`}>
          <p className="text-sm text-gray-500">Faulty / Quarantined</p>
          <p className={`text-2xl font-bold mt-1 ${totalFaultyStock > 0 ? 'text-amber-700' : 'text-gray-900'}`}>{totalFaultyStock}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Base Details</h2>
              <p className="text-sm text-gray-600 mt-1">Edit the core part-base record used by all linked device models.</p>
            </div>
          </div>

          <form onSubmit={handleUpdateBase} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Code</label>
              <input
                type="text"
                value={baseForm.base_code}
                onChange={(event) => setBaseForm({ ...baseForm, base_code: event.target.value.toUpperCase() })}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={baseForm.name}
                onChange={(event) => setBaseForm({ ...baseForm, name: event.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={baseForm.category_id}
                onChange={(event) => {
                  const selectedCategoryId = event.target.value;
                  setBaseForm({
                    ...baseForm,
                    category_id: selectedCategoryId,
                    changes_device_color: categoryChangesDeviceColor(selectedCategoryId, categories),
                  });
                }}
                className="input"
              >
                <option value="">Select category...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
              <select
                value={baseForm.manufacturer_id}
                onChange={(event) => setBaseForm({ ...baseForm, manufacturer_id: event.target.value })}
                className="input"
              >
                <option value="">Any manufacturer</option>
                {manufacturers.map((manufacturer) => (
                  <option key={manufacturer.id} value={manufacturer.id}>
                    {manufacturer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtype</label>
              <input
                type="text"
                value={baseForm.subtype}
                onChange={(event) => setBaseForm({ ...baseForm, subtype: event.target.value })}
                className="input"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                rows={4}
                value={baseForm.notes}
                onChange={(event) => setBaseForm({ ...baseForm, notes: event.target.value })}
                className="input w-full"
              />
            </div>

            <div className="md:col-span-2 flex gap-2 justify-end">
              <button type="button" className="btn btn-secondary" onClick={handleDeleteBase} disabled={deleteBaseMutation.isPending}>
                {deleteBaseMutation.isPending ? 'Deleting...' : 'Delete Base'}
              </button>
              <button type="submit" className="btn btn-primary" disabled={updateBaseMutation.isPending}>
                {updateBaseMutation.isPending ? 'Saving...' : 'Save Base'}
              </button>
            </div>
          </form>
        </div>

        <div className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Compatibility Rules</h2>
            <p className="text-sm text-gray-600 mt-1">Link this base to device models and maintain any internal notes for that match.</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {selectedCompatibility ? 'Edit Compatibility Rule' : 'Add Compatibility Rule'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">The part base is fixed here. Choose the device model you want to link.</p>
              </div>
              {selectedCompatibility ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={resetCompatibilityForm}>
                  New Rule
                </button>
              ) : null}
            </div>

            <form onSubmit={handleSubmitCompatibility} className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Device Model</label>
                <SearchableSelect
                  options={availableModels}
                  value={compatibilityForm.model_id}
                  onChange={(val) => setCompatibilityForm({ ...compatibilityForm, model_id: val })}
                  placeholder="Select model..."
                  getOptionLabel={(model) => `${getModelLabel(model)} (${model.model_number})`}
                  getOptionValue={(model) => String(model.id)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internal Note</label>
                <textarea
                  rows={3}
                  value={compatibilityForm.notes}
                  onChange={(event) => setCompatibilityForm({ ...compatibilityForm, notes: event.target.value })}
                  className="input w-full"
                  placeholder="Optional note about fitment, supplier caveats, or assembly differences"
                />
              </div>

              <div className="flex gap-2 justify-end">
                {selectedCompatibility ? (
                  <button type="button" className="btn btn-secondary" onClick={() => handleDeleteCompatibility()} disabled={deleteCompatibilityMutation.isPending}>
                    {deleteCompatibilityMutation.isPending ? 'Deleting...' : 'Delete Rule'}
                  </button>
                ) : null}
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    createCompatibilityMutation.isPending
                    || updateCompatibilityMutation.isPending
                    || (!selectedCompatibility && availableModels.length === 0)
                  }
                >
                  {createCompatibilityMutation.isPending || updateCompatibilityMutation.isPending
                    ? 'Saving...'
                    : selectedCompatibility ? 'Save Rule' : 'Add Rule'}
                </button>
              </div>
            </form>
          </div>

          {compatibility.length === 0 ? (
            <p className="text-gray-500">This base is not linked to any device models yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Model Code</th>
                    <th>Note</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {compatibility.map((rule) => (
                    <tr key={rule.id} className={selectedCompatibilityId === String(rule.id) ? 'bg-blue-50' : ''}>
                      <td>
                        <Link to={`/parts/models/${rule.model_id}`} className="font-medium text-blue-700 hover:text-blue-900">
                          {rule.manufacturer_name} {rule.model_name || rule.model_number}
                        </Link>
                      </td>
                      <td className="font-mono text-sm">{rule.model_number}</td>
                      <td>{rule.notes || '-'}</td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedCompatibilityId(String(rule.id))}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleDeleteCompatibility(rule)}
                            disabled={deleteCompatibilityMutation.isPending}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Color Variants</h2>
            <p className="text-sm text-gray-600 mt-1">Create and edit the live SKU variants that sit under this part base.</p>
          </div>
          {selectedVariant ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={resetVariantForm}>
              New Variant
            </button>
          ) : null}
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="font-semibold text-gray-900">
            {selectedVariant ? 'Edit Variant' : 'Add Variant'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">Use this area to manage the color and SKU variants available for this base.</p>

          <form onSubmit={handleSubmitVariant} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={variantForm.category_id}
                onChange={(event) => setVariantForm({ ...variantForm, category_id: event.target.value })}
                className="input"
              >
                <option value="">Select category...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input
                type="text"
                value={variantForm.sku}
                onChange={(event) => setVariantForm({ ...variantForm, sku: event.target.value.toUpperCase() })}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Variant Name</label>
              <input
                type="text"
                value={variantForm.name}
                onChange={(event) => setVariantForm({ ...variantForm, name: event.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="text"
                value={variantForm.color}
                onChange={(event) => setVariantForm({ ...variantForm, color: event.target.value })}
                className="input"
                placeholder="Black, Silver, Blue..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Part Ref</label>
              <input
                type="text"
                value={variantForm.supplier_part_ref}
                onChange={(event) => setVariantForm({ ...variantForm, supplier_part_ref: event.target.value })}
                className="input"
              />
            </div>

            <div className="md:col-span-2 flex gap-2 justify-end">
              {selectedVariant ? (
                <button type="button" className="btn btn-secondary" onClick={() => handleDeleteVariant()} disabled={deleteVariantMutation.isPending}>
                  {deleteVariantMutation.isPending ? 'Deleting...' : 'Delete Variant'}
                </button>
              ) : null}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={createVariantMutation.isPending || updateVariantMutation.isPending}
              >
                {createVariantMutation.isPending || updateVariantMutation.isPending
                  ? 'Saving...'
                  : selectedVariant ? 'Save Variant' : 'Add Variant'}
              </button>
            </div>
          </form>
        </div>

        {variants.length === 0 ? (
          <p className="text-gray-500">No active variants exist for this part base yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Color</th>
                  <th>Available</th>
                  <th>Faulty</th>
                  <th>Supplier Ref</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant) => (
                  <tr key={variant.id} className={selectedVariantId === String(variant.id) ? 'bg-blue-50' : ''}>
                    <td className="font-mono text-sm">{variant.sku}</td>
                    <td>{variant.name}</td>
                    <td>{variant.color || '-'}</td>
                    <td>{variant.available_stock}</td>
                    <td className={Number(variant.faulty_stock || 0) > 0 ? 'text-amber-700 font-medium' : ''}>{variant.faulty_stock || 0}</td>
                    <td>{variant.supplier_part_ref || '-'}</td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedVariantId(String(variant.id))}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDeleteVariant(variant)}
                          disabled={deleteVariantMutation.isPending}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <Link to={`/parts?tab=goods-in&part_base_id=${base.id}`} className="btn btn-secondary btn-sm">
            Book In Stock
          </Link>
          <Link to={`/parts?tab=goods-out&part_base_id=${base.id}`} className="btn btn-secondary btn-sm">
            Book Out Stock
          </Link>
        </div>
      </div>
    </div>
  );
}
