import { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  TrendingUp,
  User,
  Bell,
  ArrowUp,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import PageHeader from '@/components/layout/PageHeader';
import ApprovalDetailModal from '@/components/approval/ApprovalDetailModal';
import { getTimeoutStats, getTimeoutStatus, formatRemainingTime, calculateElapsedMinutes, getStuckBookingsForAssignee } from '@/utils/timeoutUtils';
import { getCurrentApprovalNode, getStuckTimeoutNode } from '@/utils/approvalUtils';
import { formatDateTime, formatDuration } from '@/utils/dateUtils';
import type { Booking } from '@/types';

type TabType = 'warning' | 'timeout' | 'records' | 'ranking';

export default function TimeoutPage() {
  const bookings = useAppStore((state) => state.bookings);
  const timeoutRecords = useAppStore((state) => state.timeoutRecords);
  const updateTimeouts = useAppStore((state) => state.updateTimeouts);
  const remindBooking = useAppStore((state) => state.remindBooking);
  const escalateBooking = useAppStore((state) => state.escalateBooking);
  const [activeTab, setActiveTab] = useState<TabType>('warning');
  const [toast, setToast] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [expandedAssignee, setExpandedAssignee] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      updateTimeouts();
      setTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, [updateTimeouts]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const stats = useMemo(() => getTimeoutStats(bookings), [bookings]);

  const warningBookings = useMemo(() => {
    return bookings.filter(
      (b) =>
        b.status !== 'cancelled' &&
        b.status !== 'rejected' &&
        b.approvalNodes.some((n) => {
          const status = getTimeoutStatus(n);
          return status === 'warning';
        })
    );
  }, [bookings]);

  const timeoutBookings = useMemo(() => {
    return bookings.filter(
      (b) =>
        b.status !== 'cancelled' &&
        b.status !== 'rejected' &&
        b.approvalNodes.some((n) => {
          const status = getTimeoutStatus(n);
          return status === 'timeout' || status === 'escalated';
        })
    );
  }, [bookings]);

  const tabs = [
    { key: 'warning' as TabType, label: '即将超时', count: stats.totalWarning },
    { key: 'timeout' as TabType, label: '已超时', count: stats.totalTimeout },
    { key: 'records' as TabType, label: '催办记录', count: timeoutRecords.length },
    { key: 'ranking' as TabType, label: '责任统计', count: stats.assigneeRanking.length },
  ];

  const handleOpenDetail = (booking: Booking, e: React.MouseEvent) => {
    e.stopPropagation();
    const freshBooking = bookings.find(b => b.id === booking.id);
    setDetailBooking(freshBooking || booking);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setDetailBooking(null);
  };

  const handleRemind = (bookingId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    remindBooking(bookingId);
    setToast('催办通知已发送');
  };

  const handleEscalate = (bookingId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    escalateBooking(bookingId);
    setToast('已升级至管理员处理');
  };

  const getStuckDisplayInfo = (booking: Booking) => {
    const stuckNode = getStuckTimeoutNode(booking);
    if (!stuckNode) return null;

    const status = getTimeoutStatus(stuckNode);
    const elapsed = calculateElapsedMinutes(stuckNode);
    const realAssigneeName = stuckNode.originalAssigneeName || stuckNode.assigneeName;

    return { stuckNode, status, elapsed, realAssigneeName };
  };

  const renderWarningList = () => (
    <div className="space-y-3">
      {warningBookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-green-400" />
          </div>
          <p className="text-gray-400">暂无即将超时的审批</p>
        </div>
      ) : (
        warningBookings.map((booking) => {
          const currentNode = getCurrentApprovalNode(booking);
          if (!currentNode) return null;
          const remaining = formatRemainingTime(
            Math.max(0, currentNode.timeoutDuration - calculateElapsedMinutes(currentNode))
          );

          return (
            <div
              key={booking.id}
              onClick={(e) => handleOpenDetail(booking, e)}
              className="bg-white rounded-xl p-4 shadow-sm border border-yellow-100 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-gray-900">{booking.petName}</div>
                  <div className="text-sm text-gray-500">
                    {booking.ownerName} · {booking.treatmentType}
                  </div>
                </div>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                  即将超时
                </span>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-yellow-800">{currentNode.nodeName}</span>
                  <span className="text-yellow-600 font-medium">{remaining}</span>
                </div>
                <div className="text-xs text-yellow-600">
                  责任人：{currentNode.assigneeName}
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={(e) => handleRemind(booking.id, e)}
                  className="px-4 py-1.5 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-1"
                >
                  <Bell size={14} />
                  催办
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderTimeoutList = () => (
    <div className="space-y-3">
      {timeoutBookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-green-400" />
          </div>
          <p className="text-gray-400">暂无超时审批</p>
        </div>
      ) : (
        timeoutBookings.map((booking) => {
          const info = getStuckDisplayInfo(booking);
          if (!info) return null;
          const { stuckNode, status, elapsed, realAssigneeName } = info;

          return (
            <div
              key={booking.id}
              onClick={(e) => handleOpenDetail(booking, e)}
              className={`bg-white rounded-xl p-4 shadow-sm border cursor-pointer hover:shadow-md transition-shadow ${
                status === 'escalated' ? 'border-red-200' : 'border-orange-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-gray-900">{booking.petName}</div>
                  <div className="text-sm text-gray-500">
                    {booking.ownerName} · {booking.treatmentType}
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    status === 'escalated'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {status === 'escalated' ? '已升级' : '已超时'}
                </span>
              </div>
              <div
                className={`rounded-lg p-3 mb-3 ${
                  status === 'escalated' ? 'bg-red-50' : 'bg-orange-50'
                }`}
              >
                <div className="flex items-center justify-between text-sm mb-1">
                  <span
                    className={status === 'escalated' ? 'text-red-800' : 'text-orange-800'}
                  >
                    {stuckNode.nodeName}
                  </span>
                  <span
                    className={`font-medium ${
                      status === 'escalated' ? 'text-red-600' : 'text-orange-600'
                    }`}
                  >
                    已超时 {formatDuration(Math.max(0, elapsed - stuckNode.timeoutDuration))}
                  </span>
                </div>
                <div className={`text-xs ${status === 'escalated' ? 'text-red-600' : 'text-orange-600'}`}>
                  卡住责任人：{realAssigneeName}
                  {stuckNode.originalAssigneeName && (
                    <span className="ml-1">(已升级至 {stuckNode.assigneeName})</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={(e) => handleRemind(booking.id, e)}
                  className="px-4 py-1.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                >
                  <Bell size={14} />
                  催办
                </button>
                <button
                  onClick={(e) => handleEscalate(booking.id, e)}
                  className={`px-4 py-1.5 text-white text-sm rounded-lg transition-colors flex items-center gap-1 ${
                    status === 'escalated'
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-orange-500 hover:bg-orange-600'
                  }`}
                >
                  <TrendingUp size={14} />
                  升级
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderRecords = () => (
    <div className="space-y-3">
      {timeoutRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-400">暂无催办记录</p>
        </div>
      ) : (
        [...timeoutRecords]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((record) => (
          <div
            key={record.id}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-medium text-gray-900">{record.nodeName}</div>
                <div className="text-sm text-gray-500">
                  责任人：{record.assigneeName}
                </div>
              </div>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  record.isEscalated
                    ? 'bg-red-100 text-red-700'
                    : 'bg-orange-100 text-orange-700'
                }`}
              >
                {record.isEscalated ? '升级催办' : '催办'}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              {formatDateTime(record.createdAt)}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-50 text-xs text-gray-500">
              超时 {formatDuration(record.timeoutDuration)} · 已催办 {record.reminderCount} 次
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderRanking = () => {
    const getAssigneeStuckBookings = (assigneeId: string) => {
      return getStuckBookingsForAssignee(assigneeId, bookings);
    };

    const getStuckInfo = (booking: Booking) => {
      const stuckNode = booking.approvalNodes.find(node => {
        const status = getTimeoutStatus(node);
        if (status !== 'timeout' && status !== 'escalated') return false;
        const nodeAssigneeId = node.originalAssignee || node.assignee;
        return expandedAssignee === nodeAssigneeId;
      });
      if (!stuckNode) return null;
      return {
        stuckNode,
        status: getTimeoutStatus(stuckNode),
        elapsed: calculateElapsedMinutes(stuckNode),
        isEscalated: stuckNode.status === 'escalated' || getTimeoutStatus(stuckNode) === 'escalated',
      };
    };

    const toggleExpand = (assigneeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setExpandedAssignee(expandedAssignee === assigneeId ? null : assigneeId);
    };

    return (
    <div className="space-y-3">
      {stats.assigneeRanking.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-400">暂无超时责任统计</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {stats.assigneeRanking.map((item, index) => {
            const isExpanded = expandedAssignee === item.id;
            const stuckBookings = getAssigneeStuckBookings(item.id);
            
            return (
              <div key={item.id}>
                <div
                  onClick={(e) => toggleExpand(item.id, e)}
                  className={`flex items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    index !== stats.assigneeRanking.length - 1 || isExpanded ? 'border-b border-gray-50' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${
                      index === 0
                        ? 'bg-yellow-100 text-yellow-600'
                        : index === 1
                        ? 'bg-gray-100 text-gray-600'
                        : index === 2
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-gray-50 text-gray-500'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">
                      {item.count} 次超时 · 累计 {formatDuration(item.totalMinutes)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{stuckBookings.length} 条卡单</span>
                    {isExpanded ? (
                      <ChevronDown size={18} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={18} className="text-gray-400" />
                    )}
                  </div>
                </div>
                
                {isExpanded && stuckBookings.length > 0 && (
                  <div className="bg-gray-50 border-b border-gray-100">
                    {stuckBookings.map((booking, bIndex) => {
                      const info = getStuckInfo(booking);
                      if (!info) return null;
                      const { stuckNode, status, elapsed, isEscalated } = info;
                      
                      return (
                        <div
                          key={booking.id}
                          onClick={(e) => handleOpenDetail(booking, e)}
                          className={`flex items-start p-3 pl-15 cursor-pointer hover:bg-gray-100 transition-colors ${
                            bIndex !== stuckBookings.length - 1 ? 'border-b border-gray-100' : ''
                          }`}
                        >
                          <div className="flex-1 ml-11">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm text-gray-900">
                                {booking.petName} · {booking.treatmentType}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  isEscalated
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-orange-100 text-orange-700'
                                }`}
                              >
                                {isEscalated ? '已升级' : '已超时'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mb-1">
                              卡住节点：{stuckNode.nodeName}
                            </div>
                            <div className="text-xs text-gray-500">
                              超时时间：{formatDuration(elapsed - stuckNode.timeoutDuration)}
                            </div>
                            {isEscalated && (
                              <div className="text-xs text-red-600 mt-1">
                                已升级至管理员处理
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <PageHeader title="超时监控" />

      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg animate-slide-down">
          {toast}
        </div>
      )}

      <div className="p-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl p-4 text-white">
            <div className="text-2xl font-bold">{stats.totalWarning}</div>
            <div className="text-xs opacity-90">即将超时</div>
          </div>
          <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl p-4 text-white">
            <div className="text-2xl font-bold">{stats.totalTimeout}</div>
            <div className="text-xs opacity-90">已超时</div>
          </div>
          <div className="bg-gradient-to-br from-red-400 to-red-500 rounded-xl p-4 text-white">
            <div className="text-2xl font-bold">{stats.totalEscalated}</div>
            <div className="text-xs opacity-90">已升级</div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium relative transition-colors ${
                activeTab === tab.key ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span
                className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === tab.key
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {tab.count}
              </span>
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'warning' && renderWarningList()}
        {activeTab === 'timeout' && renderTimeoutList()}
        {activeTab === 'records' && renderRecords()}
        {activeTab === 'ranking' && renderRanking()}
      </div>

      <ApprovalDetailModal
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        booking={detailBooking}
      />
    </div>
  );
}
