import { Stethoscope, Wrench, XCircle } from 'lucide-react';
import type { TreatmentTable } from '@/types';

interface TableCardProps {
  table: TreatmentTable;
  isSelected: boolean;
  onClick: () => void;
  occupancyRate: number;
}

export default function TableCard({ table, isSelected, onClick, occupancyRate }: TableCardProps) {
  const getStatusConfig = () => {
    switch (table.status) {
      case 'active':
        return {
          label: '运行中',
          bgColor: 'bg-green-100',
          textColor: 'text-green-700',
          icon: Stethoscope,
        };
      case 'maintenance':
        return {
          label: '维护中',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-700',
          icon: Wrench,
        };
      case 'disabled':
        return {
          label: '停用',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-500',
          icon: XCircle,
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div
      onClick={table.status === 'active' ? onClick : undefined}
      className={`bg-white rounded-xl p-4 border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-blue-500 shadow-md shadow-blue-100'
          : table.status === 'active'
          ? 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
          : 'border-gray-100 opacity-60 cursor-not-allowed'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusConfig.bgColor}`}
          >
            <StatusIcon size={20} className={statusConfig.textColor} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{table.name}</h3>
            <p className="text-xs text-gray-500">{table.description}</p>
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}
        >
          {statusConfig.label}
        </span>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-500">今日占用率</span>
          <span className="font-medium text-gray-700">{occupancyRate}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              occupancyRate > 80
                ? 'bg-red-400'
                : occupancyRate > 50
                ? 'bg-yellow-400'
                : 'bg-green-400'
            }`}
            style={{ width: `${occupancyRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}
