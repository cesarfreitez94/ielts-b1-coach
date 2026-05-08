import { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sublabel?: string;
}

export default function StatsCard({ icon: Icon, label, value, sublabel }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center space-x-3 mb-2">
        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-indigo-600" />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      {sublabel && <p className="text-sm text-gray-400">{sublabel}</p>}
    </div>
  );
}