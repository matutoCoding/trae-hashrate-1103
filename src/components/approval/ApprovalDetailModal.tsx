import { useState } from 'react';
import { X, CheckCircle, XCircle, Clock, User, Scissors, MessageSquare } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import {
  getCurrentApprovalNode,
  getApprovalProgress,
  getApprovalStatusText,
  getNodeStatusText,
  getActionText,
} from '@/utils/approvalUtils';
import { getTimeoutStatus, getTimeoutStatusText, getTimeoutStatusColor, formatRemainingTime } from '@/utils/timeoutUtils';
import { formatDateTime } from '@/utils/dateUtils';
import type { Booking } from '@/types';

interface ApprovalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export default function ApprovalDetailModal({
  isOpen,
  onClose,
  booking,
}: ApprovalDetailModalProps) {
  const approveBooking = useAppStore((state) => state.approveBooking);
  const rejectBooking = useAppStore((state) => state.rejectBooking);
  const [comment, setComment] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !booking) return null;

  const currentNode = getCurrentApprovalNode(booking);
  const progress = getApprovalProgress(booking);
  const statusText = getApprovalStatusText(booking.status);

  const getRemainingMinutes = (node: any) => {
    const startTime = new Date(node.startTime);
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000 / 60);
    return Math.max(0, node.timeoutDuration - elapsed);
  };

  const handleApprove = () => {
    if (!currentNode) return;
    setIsSubmitting(true);
    setTimeout(() => {
      approveBooking(booking.id, currentNode.id, comment || undefined);
      setIsSubmitting(false);
      setComment('');
      onClose();
    }, 500);
  };

  const handleReject = () => {
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    if (!comment.trim()) {
      alert('请填写驳回理由');
      return;
    }
    if (!currentNode) return;
    setIsSubmitting(true);
    setTimeout(() => {
      rejectBooking(booking.id, currentNode.id, comment);
      setIsSubmitting(false);
      setComment('');
      setShowRejectInput(false);
      onClose();
    }, 500);
  };

  const getStatusIcon = () => {
    switch (booking.status) {
      case 'approved':
        return <CheckCircle className="text-green-500" size={24} />;
      case 'rejected':
        return <XCircle className="text-red-500" size={24} />;
      case 'cancelled':
        return <XCircle className="text-gray-400" size={24} />;
      default:
        return <Clock className="text-yellow-500" size={24} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-gray-900">审批详情</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <div className="text-lg font-semibold text-gray-900">{statusText}</div>
                <div className="text-sm text-gray-500">{progress}% 完成</div>
              </div>
            </div>
          </div>

          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <User size={16} className="text-gray-400" />
              <span className="text-gray-600">宠主：</span>
              <span className="text-gray-900 font-medium">{booking.ownerName}</span>
              <span className="text-gray-400">{booking.ownerPhone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Scissors size={16} className="text-gray-400" />
              <span className="text-gray-600">项目：</span>
              <span className="text-gray-900 font-medium">{booking.treatmentType}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock size={16} className="text-gray-400" />
              <span className="text-gray-600">时间：</span>
              <span className="text-gray-900 font-medium">
                {booking.date} {booking.startTime}-{booking.endTime}
              </span>
            </div>
          </div>

          {currentNode && (booking.status === 'pending' || currentNode.status === 'escalated') && (
            <div
              className={`p-4 rounded-xl border-2 ${
                getTimeoutStatus(currentNode) === 'timeout' ||
                getTimeoutStatus(currentNode) === 'escalated'
                  ? 'bg-red-50 border-red-200'
                  : getTimeoutStatus(currentNode) === 'warning'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">当前节点</span>
                <span className={getTimeoutStatusColor(getTimeoutStatus(currentNode))}>
                  {getTimeoutStatusText(getTimeoutStatus(currentNode))}
                </span>
              </div>
              <div className="text-lg font-semibold text-gray-900 mb-1">
                {currentNode.nodeName}
              </div>
              {currentNode.originalAssigneeName ? (
                <div className="text-sm text-gray-600">
                  <div>原处理人：{currentNode.originalAssigneeName}</div>
                  <div className="text-red-600">已升级至：{currentNode.assigneeName}</div>
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  处理人：{currentNode.assigneeName}
                </div>
              )}
              <div className="text-sm text-gray-600">
                {currentNode.timeoutDuration > 0 && (
                  <span>
                    限时 {currentNode.timeoutDuration} 分钟 · 
                    {formatRemainingTime(getRemainingMinutes(currentNode))}
                  </span>
                )}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-medium text-gray-900 mb-3">审批节点</h3>
            <div className="space-y-0">
              {booking.approvalNodes.map((node, index) => {
                const nodeTimeoutStatus = getTimeoutStatus(node);
                return (
                  <div key={node.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          node.status === 'approved'
                            ? 'bg-green-500'
                            : node.status === 'rejected'
                            ? 'bg-red-500'
                            : node.status === 'timeout' || nodeTimeoutStatus === 'timeout'
                            ? 'bg-orange-500'
                            : node.status === 'escalated' || nodeTimeoutStatus === 'escalated'
                            ? 'bg-red-500'
                            : 'bg-gray-300'
                        }`}
                      />
                      {index < booking.approvalNodes.length - 1 && (
                        <div className="w-px flex-1 bg-gray-200 my-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{node.nodeName}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            node.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : node.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : node.status === 'timeout' || nodeTimeoutStatus === 'timeout'
                              ? 'bg-orange-100 text-orange-700'
                              : node.status === 'escalated' || nodeTimeoutStatus === 'escalated'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {node.status === 'escalated' ? '已升级' : getNodeStatusText(node.status)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        处理人：{node.assigneeName}
                      </div>
                      {node.originalAssigneeName && (
                        <div className="text-sm text-red-600 mt-0.5">
                          原处理人：{node.originalAssigneeName}
                        </div>
                      )}
                      {node.comment && (
                        <div className="text-xs text-gray-600 mt-1 bg-gray-50 rounded px-2 py-1">
                          {node.comment}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-3">操作轨迹</h3>
            <div className="space-y-3">
              {booking.approvalRecords.map((record, index) => (
                <div key={record.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        record.action === 'approve'
                          ? 'bg-green-500'
                          : record.action === 'reject'
                          ? 'bg-red-500'
                          : record.action === 'submit'
                          ? 'bg-blue-500'
                          : record.action === 'escalate'
                          ? 'bg-orange-500'
                          : 'bg-gray-400'
                      }`}
                    />
                    {index < booking.approvalRecords.length - 1 && (
                      <div className="w-px flex-1 bg-gray-200" />
                    )}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {record.operatorName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDateTime(record.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-0.5">
                      {getActionText(record.action)}
                    </div>
                    {record.comment && (
                      <div className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                        <MessageSquare size={12} className="mt-0.5 flex-shrink-0" />
                        <span>{record.comment}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(booking.status === 'pending' || (currentNode && currentNode.status === 'escalated')) && currentNode && (
            <div className="pt-2">
              {showRejectInput && (
                <div className="mb-3">
                  <label className="block text-sm text-gray-600 mb-1">驳回理由</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="请输入驳回理由"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
                  />
                </div>
              )}

              {!showRejectInput && (
                <div className="mb-3">
                  <label className="block text-sm text-gray-600 mb-1">审批意见（可选）</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="请输入审批意见"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={isSubmitting}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                    showRejectInput
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'border border-red-200 text-red-600 hover:bg-red-50'
                  }`}
                >
                  {showRejectInput ? '确认驳回' : '驳回'}
                </button>
                {!showRejectInput && (
                  <button
                    onClick={handleApprove}
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    通过
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
