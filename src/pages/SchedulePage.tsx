import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import PageHeader from '@/components/layout/PageHeader';
import DateSelector from '@/components/schedule/DateSelector';
import TableCard from '@/components/schedule/TableCard';
import Timeline from '@/components/schedule/Timeline';
import BookingModal from '@/components/schedule/BookingModal';
import BookingDetailModal from '@/components/schedule/BookingDetailModal';
import { calculateOccupancyRate } from '@/utils/mergeUtils';
import { timeDiffMinutes } from '@/utils/dateUtils';
import type { Booking, TimeSlot } from '@/types';

export default function SchedulePage() {
  const {
    treatmentTables,
    selectedDate,
    selectedTableId,
    selectedSlots,
    setSelectedDate,
    setSelectedTableId,
    getTimeSlotsForTable,
    selectSlotRange,
    clearSlotSelection,
  } = useAppStore();

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const currentTable = useMemo(
    () => treatmentTables.find((t) => t.id === selectedTableId),
    [treatmentTables, selectedTableId]
  );

  const slots = useMemo(() => {
    if (!selectedTableId) return [];
    return getTimeSlotsForTable(selectedTableId, selectedDate);
  }, [selectedTableId, selectedDate, getTimeSlotsForTable]);

  const tableBookings = useMemo(() => {
    if (!selectedTableId) return [];
    return useAppStore.getState().bookings.filter(
      (b) =>
        b.tableId === selectedTableId &&
        b.date === selectedDate &&
        b.status !== 'cancelled' &&
        b.status !== 'rejected'
    );
  }, [selectedTableId, selectedDate, useAppStore.getState().bookings]);

  const handleSlotClick = (slot: TimeSlot) => {
    if (slot.status === 'booked') return;
    selectSlotRange(slot.id, slots);
  };

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
  };

  const getSelectedTimeRange = () => {
    if (selectedSlots.length === 0) return { start: '', end: '' };

    const selectedSlotsData = slots.filter((s) => selectedSlots.includes(s.id));
    const sorted = [...selectedSlotsData].sort((a, b) =>
      timeDiffMinutes(b.startTime, a.startTime)
    );

    return {
      start: sorted[0].startTime,
      end: sorted[sorted.length - 1].endTime,
    };
  };

  const selectedTimeRange = getSelectedTimeRange();

  const handleSubmitBooking = () => {
    if (selectedSlots.length === 0) {
      alert('请先选择时段');
      return;
    }
    setIsBookingModalOpen(true);
  };

  const bookings = useAppStore((state) => state.bookings);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <PageHeader title="牙科治疗台排期" />

      <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />

      <div className="p-4 space-y-4">
        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-2">治疗台</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {treatmentTables.map((table) => {
              const tableSlots = getTimeSlotsForTable(table.id, selectedDate);
              const tableBookingsList = bookings.filter(
                (b) =>
                  b.tableId === table.id &&
                  b.date === selectedDate &&
                  b.status !== 'cancelled' &&
                  b.status !== 'rejected'
              );
              const rate = calculateOccupancyRate(tableSlots, tableBookingsList);

              return (
                <TableCard
                  key={table.id}
                  table={table}
                  isSelected={table.id === selectedTableId}
                  onClick={() => setSelectedTableId(table.id)}
                  occupancyRate={rate}
                />
              );
            })}
          </div>
        </div>

        {selectedTableId && currentTable && (
          <div>
            <h2 className="text-sm font-medium text-gray-700 mb-2">
              {currentTable.name} - 时段排期
            </h2>
            <Timeline
              tableId={selectedTableId}
              date={selectedDate}
              onSlotClick={handleSlotClick}
              onBookingClick={handleBookingClick}
              selectedSlots={selectedSlots}
              allSlots={slots}
            />
          </div>
        )}

        {selectedTableId && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-medium text-gray-900 mb-3">今日预约列表</h3>
            {tableBookings.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">暂无预约</p>
            ) : (
              <div className="space-y-2">
                {tableBookings.map((booking) => (
                  <div
                    key={booking.id}
                    onClick={() => handleBookingClick(booking)}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-10 rounded-full ${
                          booking.status === 'approved'
                            ? 'bg-blue-500'
                            : booking.status === 'pending'
                            ? 'bg-yellow-400'
                            : 'bg-gray-400'
                        }`}
                      />
                      <div>
                        <div className="font-medium text-gray-900">
                          {booking.petName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {booking.ownerName} · {booking.treatmentType}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-700">
                        {booking.startTime} - {booking.endTime}
                      </div>
                      <div
                        className={`text-xs ${
                          booking.status === 'approved'
                            ? 'text-blue-500'
                            : booking.status === 'pending'
                            ? 'text-yellow-600'
                            : 'text-gray-400'
                        }`}
                      >
                        {booking.mergedSlotIds.length > 1 ? `${booking.mergedSlotIds.length}时段合并 · ` : ''}
                        {booking.status === 'approved'
                          ? '已确认'
                          : booking.status === 'pending'
                          ? '待审批'
                          : '已取消'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedSlots.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 z-30">
          <div className="max-w-lg mx-auto bg-white rounded-xl shadow-lg p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-sm text-gray-500">已选择</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {selectedSlots.length} 个时段
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-blue-600">
                  {selectedTimeRange.start} - {selectedTimeRange.end}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={clearSlotSelection}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                清空
              </button>
              <button
                onClick={handleSubmitBooking}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
              >
                <Plus size={18} />
                提交预约
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTableId && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          tableId={selectedTableId}
          tableName={currentTable?.name || ''}
          date={selectedDate}
          startTime={selectedTimeRange.start}
          endTime={selectedTimeRange.end}
          slotIds={selectedSlots}
          onSuccess={() => clearSlotSelection()}
        />
      )}

      <BookingDetailModal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        booking={selectedBooking}
      />
    </div>
  );
}
