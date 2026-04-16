import { Link, useSearchParams } from 'react-router-dom';
import { useGoodsInDetail } from '../hooks/useParts';

export default function PartsGoodsInDetail() {
  const [searchParams] = useSearchParams();
  const lotRef = searchParams.get('lot_ref') || '';
  const lotId = searchParams.get('lot_id') || '';

  const { data, isLoading, isError } = useGoodsInDetail(
    { lot_ref: lotRef || undefined, lot_id: lotId || undefined },
    { enabled: !!(lotRef || lotId) },
  );

  const lots = data?.lots || [];
  const first = lots[0];

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (isError) return <div className="p-6 text-red-600">Failed to load goods-in detail.</div>;
  if (!first) return <div className="p-6 text-gray-500">No records found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/parts?tab=goods-in" className="btn btn-secondary btn-sm">
          &larr; Back to Goods In
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Goods In Detail</h1>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Info</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Lot Ref</dt>
            <dd className="mt-1 font-mono text-sm text-gray-900">{first.lot_ref || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Supplier</dt>
            <dd className="mt-1 text-sm text-gray-900">{first.supplier_name || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Date Received</dt>
            <dd className="mt-1 text-sm text-gray-900">{new Date(first.received_at).toLocaleString()}</dd>
          </div>
        </dl>
        {first.notes && (
          <p className="mt-4 text-sm text-gray-600">{first.notes}</p>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Parts Booked In</h2>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Part</th>
                <th>SKU</th>
                <th>Color</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => (
                <tr key={lot.lot_id}>
                  <td>
                    <div className="font-medium">{lot.base_name || lot.variant_name}</div>
                    {lot.base_name && lot.variant_name !== lot.base_name && (
                      <div className="text-xs text-gray-500">{lot.variant_name}</div>
                    )}
                  </td>
                  <td className="font-mono text-sm">{lot.sku}</td>
                  <td>{lot.color || '-'}</td>
                  <td>{lot.received_quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
