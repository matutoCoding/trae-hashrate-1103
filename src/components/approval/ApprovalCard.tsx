import { Clock, CheckCircle, XCircle, PawPrint, ChevronRight } from 'lucide-react';
import type { Booking } from '@/types';
import { getCurrentApprovalNode, getApprovalProgress } from '@/utils/approvalUtils';
import { getTimeoutStatus, getTimeoutStatusText, getTimeoutStatusColor, formatRemainingTime } from '@/utils/timeoutUtils';
import { formatDateTime } from '@/utils/dateUtils';

interface ApprovalCardProps {
  booking: Booking;
  onClick?: () => void;
  showActions?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}

export default function ApprovalCard({
  booking,
  onClick,
  showActions = false,
  onApprove,
  onReject,
}: ApprovalCardProps) {
  const currentNode = getCurrentApprovalNode(booking);
  const progress = getApprovalProgress(booking);
  const timeoutStatus = currentNode ? getTimeoutStatus(currentNode) : 'normal';
  const remainingTime = currentNode ? formatRemainingTime(getRemainingMinutes(currentNode)) : '';

  const getStatusIcon = () => {
    switch (booking.status) {
      case 'approved':
        return <CheckCircle className="text-green-500" size={18} />;
      case 'rejected':
        return <XCircle className="text-red-500" size={18} />;
      case 'cancelled':
        return <XCircle className="text-gray-400" size={18} />;
      default:
        return <Clock className="text-yellow-500" size={18} />;
    }
  };

  const getStatusText = () => {
    switch (booking.status) {
      case 'approved':
        return '已通过';
      case 'rejected':
        return '已驳回';
      case 'cancelled':
        return '已取消';
      default:
        return '审批中';
    }
  };

  function getRemainingMinutes(node: any): number {
    const startTime = new Date(node.startTime);
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000 / 60);
    return Math.max(0, node.timeoutDuration - elapsed);
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <PawPrint className="text-blue-600" size={20} />
          </div>
          <div>
            <div className="font-semibold text-gray-900">{booking.petName}</div>
            <div className="text-xs text-gray-500">
              {booking.ownerName} · {booking.petType}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {getStatusIcon()}
          <span
            className={`text-sm font-medium ${
              booking.status === 'approved'
                ? 'text-green-600'
                : booking.status === 'rejected'
                ? 'text-red-600'
                : booking.status === 'cancelled'
                ? 'text-gray-500'
                : 'text-yellow-600'
            }`}
          >
            {getStatusText()}
          </span>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">{booking.treatmentType}</span>
          <span className="text-gray-900 font-medium">
            {booking.date} {booking.startTime}-{booking.endTime}
          </span>
        </div>
        {currentNode && booking.status === 'pending' && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">当前节点：{currentNode.nodeName}</span>
            <span className={getTimeoutStatusColor(timeoutStatus)}>
              {timeoutStatus === 'normal'
                ? remainingTime
                : getTimeoutStatusText(timeoutStatus)}
            </span>
          </div>
        )}
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500">审批进度</span>
          <span className="text-gray-700">{progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>提交时间：{formatDateTime(booking.createdAt)}</span>
        <ChevronRight size={16} />
      </div>

      {showActions && booking.status === 'pending' && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReject?.();
            }}
            className="flex-1 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
          >
            驳回
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApprove?.();
            }}
            className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
          >
            通过
          </button>
        </div>
      )}
    </div>
  );
}
