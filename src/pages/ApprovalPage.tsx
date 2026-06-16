import { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import PageHeader from '@/components/layout/PageHeader';
import ApprovalCard from '@/components/approval/ApprovalCard';
import ApprovalDetailModal from '@/components/approval/ApprovalDetailModal';
import type { Booking } from '@/types';

type TabType = 'pending' | 'approved' | 'rejected';

export default function ApprovalPage() {
  const bookings = useAppStore((state) => state.bookings);
  const updateTimeouts = useAppStore((state) => state.updateTimeouts);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      updateTimeouts();
    }, 10000);
    return () => clearInterval(timer);
  }, [updateTimeouts]);

  const filteredBookings = useMemo(() => {
    let filtered = bookings;
    if (activeTab === 'pending') {
      filtered = bookings.filter((b) => b.status === 'pending');
    } else if (activeTab === 'approved') {
      filtered = bookings.filter((b) => b.status === 'approved');
    } else if (activeTab === 'rejected') {
      filtered = bookings.filter((b) => b.status === 'rejected' || b.status === 'cancelled');
    }
    return [...filtered].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [bookings, activeTab]);

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'pending', label: '待审批', count: bookings.filter((b) => b.status === 'pending').length },
    { key: 'approved', label: '已通过', count: bookings.filter((b) => b.status === 'approved').length },
    { key: 'rejected', label: '已驳回', count: bookings.filter((b) => b.status === 'rejected' || b.status === 'cancelled').length },
  ];

  const handleApprove = (booking: Booking) => {
    const currentNode = booking.approvalNodes.find((n) => n.status === 'pending');
    if (currentNode) {
      useAppStore.getState().approveBooking(booking.id, currentNode.id, '审批通过');
    }
  };

  const handleReject = (booking: Booking) => {
    setSelectedBooking(booking);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <PageHeader title="审批中心" />

      <div className="bg-white border-b border-gray-100">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-sm font-medium relative transition-colors ${
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

      <div className="p-4 space-y-3">
        {filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-gray-400">暂无{tabs.find((t) => t.key === activeTab)?.label}记录</p>
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <ApprovalCard
              key={booking.id}
              booking={booking}
              onClick={() => setSelectedBooking(booking)}
              showActions={activeTab === 'pending'}
              onApprove={() => handleApprove(booking)}
              onReject={() => handleReject(booking)}
            />
          ))
        )}
      </div>

      <ApprovalDetailModal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        booking={selectedBooking}
      />
    </div>
  );
}
