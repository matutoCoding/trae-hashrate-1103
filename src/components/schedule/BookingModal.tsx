import { useState } from 'react';
import { X, PawPrint, User, Phone, Scissors } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
  tableName: string;
  date: string;
  startTime: string;
  endTime: string;
  slotIds: string[];
  onSuccess?: () => void;
}

export default function BookingModal({
  isOpen,
  onClose,
  tableId,
  tableName,
  date,
  startTime,
  endTime,
  slotIds,
  onSuccess,
}: BookingModalProps) {
  const createBooking = useAppStore((state) => state.createBooking);
  const [formData, setFormData] = useState({
    ownerName: '',
    ownerPhone: '',
    petName: '',
    petType: '犬',
    treatmentType: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!formData.ownerName || !formData.ownerPhone || !formData.petName || !formData.treatmentType) {
      alert('请填写完整信息');
      return;
    }

    setIsSubmitting(true);
    
    setTimeout(() => {
      createBooking(
        tableId,
        formData.ownerName,
        formData.ownerPhone,
        formData.petName,
        formData.petType,
        formData.treatmentType,
        startTime,
        endTime,
        date,
        slotIds
      );
      setIsSubmitting(false);
      setFormData({
        ownerName: '',
        ownerPhone: '',
        petName: '',
        petType: '犬',
        treatmentType: '',
      });
      onClose();
      onSuccess?.();
      alert('预约提交成功，等待审批');
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">提交预约</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-sm text-blue-800">
              <span className="font-medium">{tableName}</span>
              <span className="mx-2">·</span>
              <span>{date}</span>
            </div>
            <div className="text-lg font-semibold text-blue-900 mt-1">
              {startTime} - {endTime}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">宠主信息</h3>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                <User size={14} className="inline mr-1" />
                宠主姓名
              </label>
              <input
                type="text"
                value={formData.ownerName}
                onChange={(e) =>
                  setFormData({ ...formData, ownerName: e.target.value })
                }
                placeholder="请输入宠主姓名"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                <Phone size={14} className="inline mr-1" />
                联系电话
              </label>
              <input
                type="tel"
                value={formData.ownerPhone}
                onChange={(e) =>
                  setFormData({ ...formData, ownerPhone: e.target.value })
                }
                placeholder="请输入联系电话"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">宠物信息</h3>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                <PawPrint size={14} className="inline mr-1" />
                宠物名字
              </label>
              <input
                type="text"
                value={formData.petName}
                onChange={(e) =>
                  setFormData({ ...formData, petName: e.target.value })
                }
                placeholder="请输入宠物名字"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">宠物类型</label>
              <div className="flex gap-2">
                {['犬', '猫', '其他'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFormData({ ...formData, petType: type })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.petType === type
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">治疗项目</h3>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                <Scissors size={14} className="inline mr-1" />
                治疗类型
              </label>
              <select
                value={formData.treatmentType}
                onChange={(e) =>
                  setFormData({ ...formData, treatmentType: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="">请选择治疗项目</option>
                <option value="超声波洁牙">超声波洁牙</option>
                <option value="常规洁牙">常规洁牙</option>
                <option value="牙齿检查">牙齿检查</option>
                <option value="拔牙手术">拔牙手术</option>
                <option value="牙齿美容">牙齿美容</option>
                <option value="术后复查">术后复查</option>
              </select>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white p-4 border-t border-gray-100">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '提交中...' : '提交预约'}
          </button>
        </div>
      </div>
    </div>
  );
}
