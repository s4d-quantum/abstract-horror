import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Package,
  PackageOpen,
  ShoppingCart,
  ShoppingBag,
  ClipboardCheck,
  Wrench,
  Hammer,
  Shield,
  Users,
  Building2,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Inventory', path: '/inventory', icon: Package },
  { name: 'Goods In', path: '/goods-in', icon: PackageOpen },
  { name: 'Goods Out', path: '/goods-out', icon: ShoppingCart },
  { name: 'Backmarket', path: '/backmarket', icon: ShoppingBag },
  { name: 'QC', path: '/qc', icon: ClipboardCheck },
  { name: 'Repair', path: '/repair', icon: Wrench },
  { name: 'Parts', path: '/parts', icon: Boxes },
  { name: 'Level 3', path: '/level3', icon: Hammer },
  { name: 'Admin Ops', path: '/admin-ops', icon: Shield },
  { name: 'Customers', path: '/customers', icon: Users },
  { name: 'Suppliers', path: '/suppliers', icon: Building2 },
];

export default function Sidebar() {
  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">Quant Inventory</h1>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-sm transition-colors ${isActive
                ? 'bg-primary text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.name}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
