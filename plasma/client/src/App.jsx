import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import SupplierInventory from './pages/SupplierInventory';
import DeviceDetail from './pages/DeviceDetail';
import GoodsIn from './pages/GoodsIn';
import PurchaseOrderDetail from './pages/PurchaseOrderDetail';
import CreatePurchaseOrder from './pages/CreatePurchaseOrder';
import EditPurchaseOrder from './pages/EditPurchaseOrder';
import ReceiveDevices from './pages/ReceiveDevices';
import BookInStock from './pages/BookInStock';
import GoodsOut from './pages/GoodsOut';
import CreateSalesOrder from './pages/CreateSalesOrder';
import SalesOrderDetail from './pages/SalesOrderDetail';
import Backmarket from './pages/Backmarket';
import QC from './pages/QC';
import QCJobDetail from './pages/QCJobDetail';
import Repair from './pages/Repair';
import CreateRepair from './pages/CreateRepair';
import RepairJobDetail from './pages/RepairJobDetail';
import BulkRepairPage from './pages/BulkRepairPage';
import RepairRecordDetail from './pages/RepairRecordDetail';
import Parts from './pages/Parts';
import PartBaseDetail from './pages/PartBaseDetail';
import PartsGoodsInDetail from './pages/PartsGoodsInDetail';
import PartsModelDetail from './pages/PartsModelDetail';
import Level3 from './pages/Level3';
import Level3Completed from './pages/Level3Completed';
import Level3Detail from './pages/Level3Detail';
import Admin from './pages/Admin';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import AddCustomer from './pages/AddCustomer';
import Suppliers from './pages/Suppliers';
import SupplierDetail from './pages/SupplierDetail';
import AddSupplier from './pages/AddSupplier';
import AdminOps from './pages/AdminOps';
import LocationManagement from './pages/LocationManagement';
import ColorCheck from './pages/ColorCheck';
import PrintLabels from './pages/PrintLabels';
import ErrorBoundary from './components/ErrorBoundary';

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const withErrorBoundary = (element) => (
    <ErrorBoundary>
      {element}
    </ErrorBoundary>
  );

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="inventory/supplier/:supplierId" element={<SupplierInventory />} />
        <Route path="inventory/:id" element={<DeviceDetail />} />
        <Route path="goods-in" element={<GoodsIn />} />
        <Route path="goods-in/book-in" element={<BookInStock />} />
        <Route path="goods-in/create" element={<CreatePurchaseOrder />} />
        <Route path="goods-in/:id" element={<PurchaseOrderDetail />} />
        <Route path="goods-in/:id/edit" element={<EditPurchaseOrder />} />
        <Route path="goods-in/:id/receive" element={<ReceiveDevices />} />
        <Route path="goods-out" element={<GoodsOut />} />
        <Route path="goods-out/create" element={<CreateSalesOrder />} />
        <Route path="goods-out/:id" element={<SalesOrderDetail />} />
        <Route path="backmarket" element={<Backmarket />} />
        <Route path="backmarket/:id" element={<SalesOrderDetail />} />
        <Route path="qc" element={withErrorBoundary(<QC />)} />
        <Route path="qc/jobs/:id" element={withErrorBoundary(<QCJobDetail />)} />
        <Route path="repair" element={withErrorBoundary(<Repair />)} />
        <Route path="repair/create" element={<CreateRepair />} />
        <Route path="repair/jobs/:id" element={withErrorBoundary(<RepairJobDetail />)} />
        <Route path="repair/jobs/:id/bulk-repair" element={<BulkRepairPage />} />
        <Route path="repair/records/:id" element={<RepairRecordDetail />} />
        <Route path="parts" element={<Parts />} />
        <Route path="parts/bases/:id" element={<PartBaseDetail />} />
        <Route path="parts/models/:id" element={<PartsModelDetail />} />
        <Route path="parts/goods-in/detail" element={<PartsGoodsInDetail />} />
        <Route path="level3" element={<Level3 />} />
        <Route path="level3/completed" element={<Level3Completed />} />
        <Route path="level3/:id" element={<Level3Detail />} />
        <Route path="admin" element={<Admin />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/new" element={<AddCustomer />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="suppliers/new" element={<AddSupplier />} />
        <Route path="suppliers/:id" element={<SupplierDetail />} />
        <Route path="admin-ops" element={<AdminOps />} />
        <Route path="admin-ops/location-management" element={<LocationManagement />} />
        <Route path="admin-ops/color-check" element={<ColorCheck />} />
        <Route path="admin-ops/print-labels" element={<PrintLabels />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" />
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
