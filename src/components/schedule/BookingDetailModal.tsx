import { useState } from 'react';
import { X, PawPrint, User, Clock, Scissors, AlertCircle, CheckCircle, XCircle, Clock3 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getApprovalProgress, getApprovalStatusText } from '@/utils/approvalUtils';
import { formatDateTime } from '@/utils/dateUtils';
import type { Booking } from '@/types';

interface BookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export default function BookingDetailModal({
  isOpen,
  onClose,
  booking,
}: BookingDetailModalProps) {
  const cancelBooking = useAppStore((state) => state.cancelBooking);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelType, setCancelType] = useState<'all' | 'first' | 'last'>('all');

  if (!isOpen || !booking) return null;

  const progress = getApprovalProgress(booking);
  const statusText = getApprovalStatusText(booking.status);

  const getStatusIcon = () => {
    switch (booking.status) {
      case 'approved':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'pending':
        return <Clock3 className="text-yellow-500" size={20} />;
      case 'rejected':
        return <XCircle className="text-red-500" size={20} />;
      case 'cancelled':
        return <XCircle className="text-gray-500" size={20} />;
    }
  };

  const handleCancel = () => {
    let cancelStart = booking.startTime;
    let cancelEnd = booking.endTime;

    const slots = booking.mergedSlotIds;
    const slotCount = slots.length;

    if (cancelType === 'first' && slotCount > 1) {
      cancelEnd = add30Minutes(booking.startTime);
    } else if (cancelType === 'last' && slotCount > 1) {
      cancelStart = subtract30Minutes(booking.endTime);
    }

    cancelBooking(booking.id, cancelStart, cancelEnd);
    setShowCancelConfirm(false);
    onClose();
    alert('预约已取消，占用区间已拆分');
  };

  const add30Minutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + 30;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };

  const subtract30Minutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m - 30;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };

  const slotCount = booking.mergedSlotIds.length;
  const canPartialCancel = slotCount > 1 && booking.status !== 'cancelled';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">预约详情</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-lg font-semibold text-gray-900">{statusText}</span>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">审批进度</div>
              <div className="text-lg font-semibold text-blue-600">{progress}%</div>
            </div>
          </div>

          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <PawPrint className="text-blue-600" size={20} />
              </div>
              <div>
                <div className="font-medium text-gray-900">{booking.petName}</div>
                <div className="text-sm text-gray-500">{booking.petType} · {booking.treatmentType}</div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 space-y-2">
              <div className="flex items-center text-sm">
                <User size={16} className="text-gray-400 mr-2" />
                <span className="text-gray-600">宠主：</span>
                <span className="text-gray-900 ml-1">{booking.ownerName}</span>
                <span className="text-gray-400 ml-2">{booking.ownerPhone}</span>
              </div>
              <div className="flex items-center text-sm">
                <Clock size={16} className="text-gray-400 mr-2" />
                <span className="text-gray-600">时间：</span>
                <span className="text-gray-900 ml-1">
                  {booking.date} {booking.startTime}-{booking.endTime}
                </span>
              </div>
              <div className="flex items-center text-sm">
                <Scissors size={16} className="text-gray-400 mr-2" />
                <span className="text-gray-600">时段数：</span>
                <span className="text-gray-900 ml-1">{slotCount} 个时段</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-2">审批轨迹</h3>
            <div className="space-y-3">
              {booking.approvalRecords.map((record, index) => (
                <div key={record.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        record.action === 'approve'
                          ? 'bg-green-500'
                          : record.action === 'reject'
                          ? 'bg-red-500'
                          : record.action === 'submit'
                          ? 'bg-blue-500'
                          : 'bg-yellow-500'
                      }`}
                    />
                    {index < booking.approvalRecords.length - 1 && (
                      <div className="w-px flex-1 bg-gray-200 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {record.operatorName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDateTime(record.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-0.5">
                      {record.action === 'submit' && '提交了预约申请'}
                      {record.action === 'approve' && '审批通过'}
                      {record.action === 'reject' && '审批驳回'}
                      {record.action === 'timeout' && '审批超时'}
                      {record.action === 'escalate' && '升级催办'}
                      {record.action === 'cancel' && '取消预约'}
                    </div>
                    {record.comment && (
                      <div className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1">
                        {record.comment}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {booking.status !== 'cancelled' && booking.status !== 'rejected' && (
            <div className="pt-2">
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="w-full py-3 border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
              >
                取消预约
              </button>
            </div>
          )}
        </div>

        {showCancelConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-xl p-5 mx-4 max-w-sm w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="text-red-500" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">确认取消预约？</h3>
                  <p className="text-sm text-gray-500">取消后将释放占用的时段</p>
                </div>
              </div>

              {canPartialCancel && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">选择取消方式：</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="cancelType"
                        checked={cancelType === 'all'}
                        onChange={() => setCancelType('all')}
                        className="text-blue-600"
                      />
                      <span className="text-sm">取消全部时段</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="cancelType"
                        checked={cancelType === 'first'}
                        onChange={() => setCancelType('first')}
                        className="text-blue-600"
                      />
                      <span className="text-sm">取消第一个时段（演示段首拆分）</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="cancelType"
                        checked={cancelType === 'last'}
                        onChange={() => setCancelType('last')}
                        className="text-blue-600"
                      />
                      <span className="text-sm">取消最后一个时段（演示段尾拆分）</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  再想想
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                >
                  确认取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
