import {
  Package,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  ClipboardCheck,
  Wrench
} from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';
import {
  useDashboardMetrics,
  useRecentPurchaseOrders,
  useRecentSalesOrders
} from '../hooks/useDashboard';

export default function Dashboard() {
  const { data: metricsData, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: posData, isLoading: posLoading } = useRecentPurchaseOrders();
  const { data: sosData, isLoading: sosLoading } = useRecentSalesOrders();

  const metrics = metricsData?.metrics || {};
  const recentPOs = posData?.orders || [];
  const recentSOs = sosData?.orders || [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total In Stock"
          value={metricsLoading ? '...' : metrics.totalInStock}
          icon={Package}
          color="blue"
        />
        <MetricCard
          title="Unprocessed Orders"
          value={metricsLoading ? '...' : metrics.unprocessedOrders}
          icon={ShoppingCart}
          color="yellow"
        />
        <MetricCard
          title="Awaiting QC"
          value={metricsLoading ? '...' : metrics.awaitingQC}
          icon={ClipboardCheck}
          color="purple"
        />
        <MetricCard
          title="Awaiting Repair"
          value={metricsLoading ? '...' : metrics.awaitingRepair}
          icon={Wrench}
          color="red"
        />
      </div>

      {/* 7-Day Activity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="Booked In (7 days)"
          value={metricsLoading ? '...' : metrics.bookedIn7Days}
          icon={TrendingUp}
          color="green"
        />
        <MetricCard
          title="Booked Out (7 days)"
          value={metricsLoading ? '...' : metrics.bookedOut7Days}
          icon={TrendingDown}
          color="blue"
        />
        <MetricCard
          title="Returns (7 days)"
          value={metricsLoading ? '...' : metrics.returns7Days}
          icon={RotateCcw}
          color="gray"
        />
      </div>

      {/* Recent Orders Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Purchase Orders */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Purchase Orders
          </h2>
          {posLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : recentPOs.length === 0 ? (
            <p className="text-gray-500">No purchase orders yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                      PO Number
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                      Supplier
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                      Qty
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentPOs.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 text-sm font-medium text-gray-900">
                        {po.poNumber}
                      </td>
                      <td className="py-2 px-3 text-sm text-gray-600">
                        {po.supplier}
                      </td>
                      <td className="py-2 px-3 text-sm">
                        <span className={`badge ${
                          po.status === 'FULLY_RECEIVED' ? 'badge-success' :
                          po.status === 'CONFIRMED' ? 'badge-info' :
                          'badge-warning'
                        }`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-sm text-gray-600 text-right">
                        {po.receivedQty}/{po.expectedQty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Sales Orders */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Sales Orders
          </h2>
          {sosLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : recentSOs.length === 0 ? (
            <p className="text-gray-500">No sales orders yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                      SO Number
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                      Customer
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentSOs.map((so) => (
                    <tr key={so.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 text-sm font-medium text-gray-900">
                        {so.soNumber}
                      </td>
                      <td className="py-2 px-3 text-sm text-gray-600">
                        {so.customer}
                      </td>
                      <td className="py-2 px-3 text-sm">
                        <span className={`badge ${
                          so.orderType === 'BACKMARKET' ? 'badge-info' : 'badge-gray'
                        }`}>
                          {so.orderType}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-sm">
                        <span className={`badge ${
                          so.status === 'SHIPPED' ? 'badge-success' :
                          so.status === 'PROCESSING' ? 'badge-warning' :
                          'badge-gray'
                        }`}>
                          {so.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
