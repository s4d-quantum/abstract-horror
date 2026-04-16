import { Link } from 'react-router-dom';

const TABS = [
  { key: 'management', label: 'Parts Management' },
  { key: 'add', label: 'New Base' },
  { key: 'goods-in', label: 'Parts Goods In' },
  { key: 'bulk-goods-in', label: 'Bulk Goods In' },
  { key: 'goods-out', label: 'Parts Goods Out' },
  { key: 'faulty', label: 'Faulty Parts' },
];

export default function PartsSectionNav({ activeTab = 'management' }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          to={`/parts?tab=${tab.key}`}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === tab.key
              ? 'bg-primary text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
