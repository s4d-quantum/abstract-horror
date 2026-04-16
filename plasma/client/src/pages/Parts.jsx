import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import PartsSectionNav from '../components/parts/PartsSectionNav';
import SearchableSelect from '../components/SearchableSelect';
import {
  useCreatePartBase,
  useFaultReports,
  useGoodsInHistory,
  usePartBulkGoodsIn,
  usePartGoodsIn,
  usePartGoodsOut,
  usePartModels,
  usePartsMeta,
  usePartVariantSearch,
  useUpdateFaultReport,
} from '../hooks/useParts';
import {
  createPartBaseSchema,
  partGoodsInSchema,
  partGoodsOutSchema,
  updateFaultReportSchema,
} from '../schemas/parts';
import { categoryChangesDeviceColor } from '../utils/partCategories';
import { getApiErrorMessage } from '../lib/errors';

function generateLotRef() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `LOT-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

const TABS = ['management', 'add', 'goods-in', 'bulk-goods-in', 'goods-out', 'faulty'];

function getActiveTab(tab) {
  return TABS.includes(tab) ? tab : 'management';
}

function getSamsungManufacturerId(manufacturers = []) {
  const samsung = manufacturers.find((manufacturer) => {
    const code = String(manufacturer.code || '').trim().toUpperCase();
    const name = String(manufacturer.name || '').trim().toUpperCase();
    return code === 'SAMSUNG' || name === 'SAMSUNG';
  });

  return samsung ? String(samsung.id) : '';
}

export default function Parts() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = getActiveTab(searchParams.get('tab'));
  const preselectedModelId = searchParams.get('model_id') || '';
  const contextPartBaseId = searchParams.get('part_base_id') || '';

  const [modelFilters, setModelFilters] = useState({
    page: 1,
    limit: 25,
    search: '',
    manufacturer_id: '',
  });

  const [partBaseForm, setPartBaseForm] = useState({
    base_code: '',
    name: '',
    category_id: '',
    manufacturer_id: '',
    subtype: '',
    changes_device_color: false,
    notes: '',
  });

  const [goodsInForm, setGoodsInForm] = useState({
    part_id: '',
    supplier_id: '',
    supplier_ref: '',
    lot_ref: generateLotRef(),
    quantity: 1,
    notes: '',
  });

  const [goodsOutForm, setGoodsOutForm] = useState({
    part_id: '',
    part_lot_id: '',
    quantity: 1,
    reason: '',
    is_faulty: false,
    fault_reason: '',
    notes: '',
  });

  const [bulkItems, setBulkItems] = useState([
    { part_id: '', quantity: 1, notes: '' },
  ]);
  const [bulkSupplierId, setBulkSupplierId] = useState('');
  const [bulkLotRef, setBulkLotRef] = useState(generateLotRef());
  const [bulkNotes, setBulkNotes] = useState('');

  const [faultUpdates, setFaultUpdates] = useState({});
  const [variantSearch, setVariantSearch] = useState('');
  const [faultFilters, setFaultFilters] = useState({
    page: 1,
    limit: 25,
    status: '',
    search: '',
  });
  const [hasAppliedSamsungDefault, setHasAppliedSamsungDefault] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({ page: 1, limit: 10 });

  const { data: partsMetaData } = usePartsMeta();
  const { data: partModelsData, isLoading: modelsLoading } = usePartModels({
    ...modelFilters,
    search: modelFilters.search || undefined,
    manufacturer_id: modelFilters.manufacturer_id || undefined,
  });
  const { data: partVariantsData } = usePartVariantSearch(variantSearch, {
    enabled: ['goods-in', 'goods-out'].includes(activeTab),
  });
  const { data: faultReportsData } = useFaultReports({
    ...faultFilters,
    status: faultFilters.status || undefined,
    search: faultFilters.search || undefined,
  }, {
    enabled: activeTab === 'faulty',
  });
  const { data: goodsInHistoryData } = useGoodsInHistory(historyFilters, {
    enabled: activeTab === 'goods-in',
  });

  const createPartBaseMutation = useCreatePartBase();
  const partGoodsInMutation = usePartGoodsIn();
  const partBulkGoodsInMutation = usePartBulkGoodsIn();
  const partGoodsOutMutation = usePartGoodsOut();
  const updateFaultReportMutation = useUpdateFaultReport();

  const categories = partsMetaData?.categories || [];
  const suppliers = partsMetaData?.suppliers || [];
  const manufacturers = partsMetaData?.manufacturers || [];
  const samsungManufacturerId = getSamsungManufacturerId(manufacturers);
  const partVariants = partVariantsData?.variants || [];
  const partLots = partVariantsData?.lots || [];
  const faultReports = faultReportsData?.data || [];
  const faultPagination = faultReportsData?.pagination || {};
  const modelRows = partModelsData?.models || [];
  const modelPagination = partModelsData?.pagination || {};
  const goodsInHistory = goodsInHistoryData?.data || [];
  const goodsInHistoryPagination = goodsInHistoryData?.pagination || {};

  useEffect(() => {
    setFaultUpdates((prev) => {
      const next = {};
      faultReports.forEach((report) => {
        next[report.id] = prev[report.id] || {
          status: report.status,
          notes: report.notes || '',
        };
      });
      return next;
    });
  }, [faultReports]);

  useEffect(() => {
    if (hasAppliedSamsungDefault || !samsungManufacturerId || partBaseForm.manufacturer_id) {
      return;
    }

    setPartBaseForm((current) => ({
      ...current,
      manufacturer_id: samsungManufacturerId,
    }));
    setModelFilters((current) => ({
      ...current,
      manufacturer_id: current.manufacturer_id || samsungManufacturerId,
    }));
    setHasAppliedSamsungDefault(true);
  }, [hasAppliedSamsungDefault, partBaseForm.manufacturer_id, samsungManufacturerId]);

  const selectedLots = partLots.filter((lot) => String(lot.part_id) === String(goodsOutForm.part_id));

  const handleCreatePartBase = async (event) => {
    event.preventDefault();
    const payload = {
      base_code: partBaseForm.base_code.trim(),
      name: partBaseForm.name.trim(),
      category_id: parseInt(partBaseForm.category_id, 10) || 0,
      manufacturer_id: partBaseForm.manufacturer_id ? parseInt(partBaseForm.manufacturer_id, 10) : null,
      subtype: partBaseForm.subtype || null,
      changes_device_color: partBaseForm.changes_device_color,
      notes: partBaseForm.notes || null,
    };

    const validation = createPartBaseSchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    try {
      const result = await createPartBaseMutation.mutateAsync(validation.data);
      toast.success('Part base created');
      const newBaseId = result?.baseId || result?.base?.id;
      if (newBaseId) {
        navigate(`/parts/bases/${newBaseId}${preselectedModelId ? `?model_id=${preselectedModelId}` : ''}`);
      } else {
        setPartBaseForm({
          base_code: '',
          name: '',
          category_id: '',
          manufacturer_id: samsungManufacturerId,
          subtype: '',
          changes_device_color: false,
          notes: '',
        });
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create part base'));
    }
  };

  const handleGoodsIn = async (event) => {
    event.preventDefault();
    const payload = {
      part_id: parseInt(goodsInForm.part_id, 10) || 0,
      supplier_id: goodsInForm.supplier_id ? parseInt(goodsInForm.supplier_id, 10) : null,
      supplier_ref: goodsInForm.supplier_ref || null,
      lot_ref: goodsInForm.lot_ref || null,
      quantity: parseInt(goodsInForm.quantity, 10) || 0,
      notes: goodsInForm.notes || null,
    };

    const validation = partGoodsInSchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    try {
      await partGoodsInMutation.mutateAsync(validation.data);
      toast.success('Parts booked into stock');
      setGoodsInForm({
        part_id: '',
        supplier_id: '',
        supplier_ref: '',
        lot_ref: generateLotRef(),
        quantity: 1,
        notes: '',
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to book parts into stock'));
    }
  };

  const handleBulkGoodsIn = async (event) => {
    event.preventDefault();

    const validItems = bulkItems.filter((item) => item.part_id && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Add at least one valid item');
      return;
    }

    const payload = {
      supplier_id: bulkSupplierId ? parseInt(bulkSupplierId, 10) : null,
      lot_ref: bulkLotRef || null,
      notes: bulkNotes || null,
      items: validItems.map((item) => ({
        part_id: parseInt(item.part_id, 10),
        quantity: parseInt(item.quantity, 10),
        notes: item.notes || null,
      })),
    };

    try {
      const result = await partBulkGoodsInMutation.mutateAsync(payload);
      toast.success(result.message || 'Bulk goods in completed');
      setBulkItems([{ part_id: '', quantity: 1, notes: '' }]);
      setBulkSupplierId('');
      setBulkLotRef(generateLotRef());
      setBulkNotes('');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Bulk goods in failed'));
    }
  };

  const addBulkItem = () => {
    setBulkItems((prev) => [...prev, { part_id: '', quantity: 1, notes: '' }]);
  };

  const removeBulkItem = (index) => {
    setBulkItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateBulkItem = (index, field, value) => {
    setBulkItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleGoodsOut = async (event) => {
    event.preventDefault();
    const payload = {
      part_id: parseInt(goodsOutForm.part_id, 10) || 0,
      part_lot_id: parseInt(goodsOutForm.part_lot_id, 10) || 0,
      quantity: parseInt(goodsOutForm.quantity, 10) || 0,
      reason: goodsOutForm.is_faulty ? 'Faulty' : goodsOutForm.reason.trim(),
      is_faulty: goodsOutForm.is_faulty,
      fault_reason: goodsOutForm.fault_reason || null,
      notes: goodsOutForm.notes || null,
    };

    const validation = partGoodsOutSchema.safeParse(payload);
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    try {
      const result = await partGoodsOutMutation.mutateAsync(validation.data);
      toast.success(result.faultReportId ? 'Faulty parts booked out and quarantined' : 'Parts booked out');
      setGoodsOutForm({
        part_id: '',
        part_lot_id: '',
        quantity: 1,
        reason: '',
        is_faulty: false,
        fault_reason: '',
        notes: '',
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to book parts out'));
    }
  };

  const handleFaultUpdate = async (faultReportId) => {
    const draft = faultUpdates[faultReportId];
    const validation = updateFaultReportSchema.safeParse({
      status: draft.status,
      notes: draft.notes || null,
    });

    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    if (draft.status === 'WRITTEN_OFF' && !window.confirm('Write off this fault report? This cannot be undone.')) {
      return;
    }

    try {
      await updateFaultReportMutation.mutateAsync({
        id: faultReportId,
        data: validation.data,
      });
      toast.success('Fault report updated');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update fault report'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parts</h1>
          <p className="text-gray-600 mt-1">
            Manage compatible parts by device model, then handle goods in, goods out, and faulty stock from the same module.
          </p>
        </div>
      </div>

      <PartsSectionNav activeTab={activeTab} />

      {activeTab === 'management' && (
        <div className="card">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Parts Management</h2>
              <p className="text-sm text-gray-600 mt-1">
                Search device models, link compatible bases on the device page, then open each base to manage rules and variants.
              </p>
            </div>
            <Link to="/parts?tab=add" className="btn btn-primary">
              Add Part
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={modelFilters.search}
                onChange={(event) => setModelFilters((current) => ({ ...current, search: event.target.value, page: 1 }))}
                className="input"
                placeholder="Search manufacturer, model name, or model code..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
              <select
                value={modelFilters.manufacturer_id}
                onChange={(event) => setModelFilters((current) => ({ ...current, manufacturer_id: event.target.value, page: 1 }))}
                className="input"
              >
                <option value="">All manufacturers</option>
                {manufacturers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rows</label>
              <select
                value={modelFilters.limit}
                onChange={(event) => setModelFilters((current) => ({
                  ...current,
                  limit: parseInt(event.target.value, 10),
                  page: 1,
                }))}
                className="input"
              >
                {[25, 50, 100].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {modelsLoading ? (
            <div className="text-center py-12 text-gray-500">Loading device models...</div>
          ) : modelRows.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No matching device models found.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Manufacturer</th>
                      <th>Model</th>
                      <th>Model Code</th>
                      <th>Parts</th>
                      <th>Rules</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelRows.map((model) => (
                      <tr key={model.id}>
                        <td>{model.manufacturer_name}</td>
                        <td>{model.model_name || '-'}</td>
                        <td className="font-mono text-sm">{model.model_number}</td>
                        <td>{model.part_entry_count}</td>
                        <td>{model.compatibility_rule_count}</td>
                        <td>
                          <Link to={`/parts/models/${model.id}`} className="btn btn-secondary btn-sm">
                            Open Device Parts
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-600">
                  Page {modelPagination.page || 1} of {modelPagination.totalPages || 1}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setModelFilters((current) => ({ ...current, page: Math.max(current.page - 1, 1) }))}
                    disabled={(modelPagination.page || 1) <= 1}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setModelFilters((current) => ({ ...current, page: current.page + 1 }))}
                    disabled={(modelPagination.page || 1) >= (modelPagination.totalPages || 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'add' && (
        <div className="max-w-2xl">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Create Part Base</h2>
            <p className="text-sm text-gray-600 mb-4">
              After creating the base you will be redirected to its detail page where you can add compatibility rules and colour variants.
            </p>
            <form onSubmit={handleCreatePartBase} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Code</label>
                <input
                  type="text"
                  value={partBaseForm.base_code}
                  onChange={(event) => setPartBaseForm({ ...partBaseForm, base_code: event.target.value.toUpperCase() })}
                  className="input"
                  placeholder="SERVICEPACK-SAMSUNG-SMG998B"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={partBaseForm.name}
                  onChange={(event) => setPartBaseForm({ ...partBaseForm, name: event.target.value })}
                  className="input"
                  placeholder="Galaxy S21 Ultra service pack"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={partBaseForm.category_id}
                  onChange={(event) => {
                    const selectedCategoryId = event.target.value;
                    setPartBaseForm({
                      ...partBaseForm,
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
                  value={partBaseForm.manufacturer_id}
                  onChange={(event) => setPartBaseForm({ ...partBaseForm, manufacturer_id: event.target.value })}
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
                  value={partBaseForm.subtype}
                  onChange={(event) => setPartBaseForm({ ...partBaseForm, subtype: event.target.value })}
                  className="input"
                  placeholder="Rear glass, camera glass, service pack..."
                />
              </div>



              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={partBaseForm.notes}
                  onChange={(event) => setPartBaseForm({ ...partBaseForm, notes: event.target.value })}
                  className="input w-full"
                />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button type="submit" className="btn btn-primary" disabled={createPartBaseMutation.isPending}>
                  {createPartBaseMutation.isPending ? 'Saving...' : 'Create Part Base'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'goods-in' && (
        <>
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Parts Goods In</h2>
          <p className="text-sm text-gray-600 mb-4">
            Book supplier lots into stock. If the base or variant does not exist yet, create it first in Add Part.
          </p>
          <form onSubmit={handleGoodsIn} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="md:col-span-2 xl:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Part Variant</label>
              <SearchableSelect
                options={partVariants}
                value={goodsInForm.part_id ? Number(goodsInForm.part_id) : null}
                onChange={(val) => {
                  const variant = partVariants.find((v) => v.id === val);
                  setGoodsInForm({
                    ...goodsInForm,
                    part_id: val ? String(val) : '',
                    supplier_ref: variant?.supplier_part_ref || goodsInForm.supplier_ref,
                  });
                }}
                placeholder="Search part variant..."
                getOptionLabel={(v) => `${v.sku} — ${v.base_name || v.name} (${v.color || 'No color'})`}
                getOptionValue={(v) => v.id}
                onSearch={setVariantSearch}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <select
                value={goodsInForm.supplier_id}
                onChange={(event) => setGoodsInForm({ ...goodsInForm, supplier_id: event.target.value })}
                className="input"
              >
                <option value="">None</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={goodsInForm.quantity}
                onChange={(event) => setGoodsInForm({ ...goodsInForm, quantity: event.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Ref</label>
              <input
                type="text"
                value={goodsInForm.supplier_ref}
                onChange={(event) => setGoodsInForm({ ...goodsInForm, supplier_ref: event.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lot Ref</label>
              <input
                type="text"
                value={goodsInForm.lot_ref}
                onChange={(event) => setGoodsInForm({ ...goodsInForm, lot_ref: event.target.value })}
                className="input"
              />
            </div>

            <div className="md:col-span-2 xl:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={goodsInForm.notes}
                onChange={(event) => setGoodsInForm({ ...goodsInForm, notes: event.target.value })}
                className="input w-full"
                rows={3}
              />
            </div>

            <div className="md:col-span-2 xl:col-span-3 flex justify-end">
              <button type="submit" className="btn btn-primary" disabled={partGoodsInMutation.isPending}>
                {partGoodsInMutation.isPending ? 'Booking In...' : 'Book In Stock'}
              </button>
            </div>
          </form>
        </div>

        <div className="card mt-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Recent Goods In</h3>
          {goodsInHistory.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No goods-in records found.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Supplier</th>
                      <th>Lot Ref</th>
                      <th>Parts</th>
                      <th>Qty</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {goodsInHistory.map((row) => {
                      const detailParams = row.lot_ref
                        ? `lot_ref=${encodeURIComponent(row.lot_ref)}`
                        : `lot_id=${row.first_lot_id}`;
                      return (
                        <tr key={row.lot_ref || row.first_lot_id}>
                          <td className="text-sm">{new Date(row.order_date).toLocaleString()}</td>
                          <td>{row.supplier_name || '-'}</td>
                          <td className="font-mono text-sm">{row.lot_ref || '-'}</td>
                          <td>{row.part_count}</td>
                          <td>{row.total_quantity}</td>
                          <td>
                            <Link
                              to={`/parts/goods-in/detail?${detailParams}`}
                              className="btn btn-secondary btn-sm"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-600">
                  Page {goodsInHistoryPagination.page || 1} of {goodsInHistoryPagination.totalPages || 1}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setHistoryFilters((f) => ({ ...f, page: Math.max(f.page - 1, 1) }))}
                    disabled={(goodsInHistoryPagination.page || 1) <= 1}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setHistoryFilters((f) => ({ ...f, page: f.page + 1 }))}
                    disabled={(goodsInHistoryPagination.page || 1) >= (goodsInHistoryPagination.totalPages || 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        </>
      )}

      {activeTab === 'bulk-goods-in' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bulk Goods In</h2>
          <p className="text-sm text-gray-600 mb-4">
            Book multiple part variants into stock in a single transaction. All items share the same supplier.
          </p>
          <form onSubmit={handleBulkGoodsIn}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select
                  value={bulkSupplierId}
                  onChange={(event) => setBulkSupplierId(event.target.value)}
                  className="input"
                >
                  <option value="">None</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lot Ref</label>
                <input
                  type="text"
                  value={bulkLotRef}
                  onChange={(event) => setBulkLotRef(event.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={bulkNotes}
                  onChange={(event) => setBulkNotes(event.target.value)}
                  className="input"
                  placeholder="Optional notes for all items..."
                />
              </div>
            </div>

            <div className="overflow-x-auto mb-4">
              <table className="table">
                <thead>
                  <tr>
                    <th>Part Variant</th>
                    <th>Quantity</th>
                    <th>Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {bulkItems.map((item, index) => (
                    <tr key={index}>
                      <td className="w-64">
                        <SearchableSelect
                          options={partVariants}
                          value={item.part_id ? Number(item.part_id) : null}
                          onChange={(val) => updateBulkItem(index, 'part_id', val ? String(val) : '')}
                          placeholder="Search variant..."
                          getOptionLabel={(v) => `${v.sku} — ${v.base_name || v.name}`}
                          getOptionValue={(v) => v.id}
                          onSearch={setVariantSearch}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(event) => updateBulkItem(index, 'quantity', event.target.value)}
                          className="input w-24"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(event) => updateBulkItem(index, 'notes', event.target.value)}
                          className="input w-40"
                        />
                      </td>
                      <td>
                        {bulkItems.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => removeBulkItem(index)}
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between">
              <button type="button" className="btn btn-secondary" onClick={addBulkItem}>
                Add Row
              </button>
              <button type="submit" className="btn btn-primary" disabled={partBulkGoodsInMutation.isPending}>
                {partBulkGoodsInMutation.isPending ? 'Booking In...' : 'Book In All'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'goods-out' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Parts Goods Out</h2>
          <form onSubmit={handleGoodsOut} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Part Variant</label>
              <SearchableSelect
                options={partVariants}
                value={goodsOutForm.part_id ? Number(goodsOutForm.part_id) : null}
                onChange={(val) => setGoodsOutForm({ ...goodsOutForm, part_id: val ? String(val) : '', part_lot_id: '' })}
                placeholder="Search part variant..."
                getOptionLabel={(v) => `${v.sku} — ${v.base_name || v.name} (${v.color || 'No color'})`}
                getOptionValue={(v) => v.id}
                onSearch={setVariantSearch}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lot</label>
              <SearchableSelect
                options={selectedLots}
                value={goodsOutForm.part_lot_id ? Number(goodsOutForm.part_lot_id) : null}
                onChange={(val) => setGoodsOutForm({ ...goodsOutForm, part_lot_id: val ? String(val) : '' })}
                placeholder="Select lot..."
                getOptionLabel={(lot) => `${lot.lot_ref || `Lot #${lot.id}`} — Avail: ${lot.available_quantity}`}
                getOptionValue={(lot) => lot.id}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={goodsOutForm.quantity}
                onChange={(event) => setGoodsOutForm({ ...goodsOutForm, quantity: event.target.value })}
                className="input"
              />
            </div>

            {!goodsOutForm.is_faulty && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <input
                  type="text"
                  value={goodsOutForm.reason}
                  onChange={(event) => setGoodsOutForm({ ...goodsOutForm, reason: event.target.value })}
                  className="input"
                  placeholder="Sale, adjustment, scrap, sample..."
                />
              </div>
            )}

            <label className="flex items-center gap-3 pt-7">
              <input
                type="checkbox"
                checked={goodsOutForm.is_faulty}
                onChange={(event) => setGoodsOutForm({ ...goodsOutForm, is_faulty: event.target.checked })}
              />
              <span className="text-sm text-gray-700">Faulty Part</span>
            </label>

            {goodsOutForm.is_faulty && (
              <div className="md:col-span-2 xl:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Fault Reason <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={goodsOutForm.fault_reason}
                  onChange={(event) => setGoodsOutForm({ ...goodsOutForm, fault_reason: event.target.value })}
                  placeholder="Required — describe the fault"
                  className="input"
                />
              </div>
            )}

            <div className="md:col-span-2 xl:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                rows={3}
                value={goodsOutForm.notes}
                onChange={(event) => setGoodsOutForm({ ...goodsOutForm, notes: event.target.value })}
                className="input w-full"
              />
            </div>

            <div className="md:col-span-2 xl:col-span-3 flex justify-end">
              <button type="submit" className="btn btn-primary" disabled={partGoodsOutMutation.isPending}>
                {partGoodsOutMutation.isPending ? 'Booking Out...' : 'Book Out Part'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'faulty' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Faulty Parts</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={faultFilters.search}
                onChange={(event) => setFaultFilters((current) => ({ ...current, search: event.target.value, page: 1 }))}
                className="input"
                placeholder="Search part, SKU, or reason..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={faultFilters.status}
                onChange={(event) => setFaultFilters((current) => ({ ...current, status: event.target.value, page: 1 }))}
                className="input"
              >
                <option value="">All statuses</option>
                {['OPEN', 'RMA_REQUESTED', 'RETURNED', 'CREDIT_RECEIVED', 'WRITTEN_OFF'].map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rows</label>
              <select
                value={faultFilters.limit}
                onChange={(event) => setFaultFilters((current) => ({
                  ...current,
                  limit: parseInt(event.target.value, 10),
                  page: 1,
                }))}
                className="input"
              >
                {[25, 50, 100].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
          </div>

          {faultReports.length === 0 ? (
            <p className="text-gray-500 py-6 text-center">No faulty part reports recorded.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Part</th>
                      <th>Lot</th>
                      <th>Supplier</th>
                      <th>Qty</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faultReports.map((report) => (
                      <tr key={report.id}>
                        <td>
                          <div className="font-medium">{report.base_name || report.variant_name}</div>
                          <div className="text-xs text-gray-500">{report.sku}</div>
                        </td>
                        <td>{report.lot_ref || '-'}</td>
                        <td>{report.supplier_name || '-'}</td>
                        <td>{report.quantity}</td>
                        <td>{report.reason}</td>
                        <td>
                          <select
                            value={faultUpdates[report.id]?.status || report.status}
                            onChange={(event) => setFaultUpdates({
                              ...faultUpdates,
                              [report.id]: {
                                ...(faultUpdates[report.id] || {}),
                                status: event.target.value,
                              },
                            })}
                            className="input"
                          >
                            {['OPEN', 'RMA_REQUESTED', 'RETURNED', 'CREDIT_RECEIVED', 'WRITTEN_OFF'].map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <textarea
                            rows={2}
                            value={faultUpdates[report.id]?.notes || ''}
                            onChange={(event) => setFaultUpdates({
                              ...faultUpdates,
                              [report.id]: {
                                ...(faultUpdates[report.id] || {}),
                                notes: event.target.value,
                              },
                            })}
                            className="input w-64"
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleFaultUpdate(report.id)}
                            disabled={updateFaultReportMutation.isPending}
                          >
                            Save
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-600">
                  Page {faultPagination.page || 1} of {faultPagination.totalPages || 1}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setFaultFilters((current) => ({ ...current, page: Math.max(current.page - 1, 1) }))}
                    disabled={(faultPagination.page || 1) <= 1}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setFaultFilters((current) => ({ ...current, page: current.page + 1 }))}
                    disabled={(faultPagination.page || 1) >= (faultPagination.totalPages || 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}
