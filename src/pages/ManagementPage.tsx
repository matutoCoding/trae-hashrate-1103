import { useState } from 'react';
import { Plus, Pencil, Trash2, Stethoscope, Wrench, XCircle, X, Check } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import PageHeader from '@/components/layout/PageHeader';
import type { TreatmentTable } from '@/types';

export default function ManagementPage() {
  const {
    treatmentTables,
    addTreatmentTable,
    updateTreatmentTable,
    deleteTreatmentTable,
  } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TreatmentTable | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as TreatmentTable['status'],
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingTable(null);
    setFormData({
      name: '',
      description: '',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (table: TreatmentTable) => {
    setEditingTable(table);
    setFormData({
      name: table.name,
      description: table.description,
      status: table.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('请输入治疗台名称');
      return;
    }

    if (editingTable) {
      updateTreatmentTable(editingTable.id, formData);
    } else {
      addTreatmentTable(formData);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteTreatmentTable(id);
    setDeleteConfirmId(null);
  };

  const getStatusConfig = (status: TreatmentTable['status']) => {
    switch (status) {
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <PageHeader
        title="治疗台管理"
        rightElement={
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            新增
          </button>
        }
      />

      <div className="p-4 space-y-3">
        {treatmentTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Stethoscope className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-400">暂无治疗台</p>
            <button
              onClick={handleAdd}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              立即添加
            </button>
          </div>
        ) : (
          treatmentTables.map((table) => {
            const statusConfig = getStatusConfig(table.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={table.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusConfig.bgColor}`}
                    >
                      <StatusIcon size={24} className={statusConfig.textColor} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{table.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{table.description}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-50">
                  <button
                    onClick={() => handleEdit(table)}
                    className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                  >
                    <Pencil size={14} />
                    编辑
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(table.id)}
                    className="flex-1 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                  >
                    <Trash2 size={14} />
                    删除
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl animate-slide-up">
            <div className="sticky top-0 bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingTable ? '编辑治疗台' : '新增治疗台'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  治疗台名称
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入治疗台名称"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  设备描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="请输入设备描述"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  设备状态
                </label>
                <div className="flex gap-2">
                  {(['active', 'maintenance', 'disabled'] as const).map((status) => {
                    const config = getStatusConfig(status);
                    const StatusIcon = config.icon;
                    return (
                      <button
                        key={status}
                        onClick={() => setFormData({ ...formData, status })}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium flex flex-col items-center gap-1 transition-all ${
                          formData.status === status
                            ? `${config.bgColor} ${config.textColor} ring-2 ring-offset-2 ring-current opacity-100`
                            : 'bg-gray-50 text-gray-400 opacity-60'
                        }`}
                      >
                        <StatusIcon size={18} />
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white p-4 border-t border-gray-100">
              <div className="flex gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                >
                  <Check size={18} />
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDeleteConfirmId(null)}
          />
          <div className="relative bg-white rounded-xl p-5 mx-4 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除？</h3>
            <p className="text-sm text-gray-500 mb-4">
              删除后无法恢复，确定要删除这个治疗台吗？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
