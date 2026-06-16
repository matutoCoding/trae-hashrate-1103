import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { calculateOccupancyRate } from '@/utils/mergeUtils';
import type { TimeSlot, Booking } from '@/types';

interface TimelineProps {
  tableId: string;
  date: string;
  onSlotClick?: (slot: TimeSlot) => void;
  onBookingClick?: (booking: Booking) => void;
  selectedSlots?: string[];
  allSlots?: TimeSlot[];
}

export default function Timeline({
  tableId,
  date,
  onSlotClick,
  onBookingClick,
  selectedSlots = [],
  allSlots = [],
}: TimelineProps) {
  const getTimeSlotsForTable = useAppStore((state) => state.getTimeSlotsForTable);
  const bookings = useAppStore((state) => state.bookings);

  const slots = useMemo(() => {
    return getTimeSlotsForTable(tableId, date);
  }, [getTimeSlotsForTable, tableId, date]);

  const tableBookings = useMemo(() => {
    return bookings.filter(
      (b) =>
        b.tableId === tableId &&
        b.date === date &&
        b.status !== 'cancelled' &&
        b.status !== 'rejected'
    );
  }, [bookings, tableId, date]);

  const occupancyRate = useMemo(() => {
    return calculateOccupancyRate(slots, tableBookings);
  }, [slots, tableBookings]);

  const hours = Array.from({ length: 11 }, (_, i) => i + 8);

  const getMergedBlocks = () => {
    const blocks: {
      id: string;
      booking?: Booking;
      startIndex: number;
      endIndex: number;
      startTime: string;
      endTime: string;
      isSelected: boolean;
      isFree: boolean;
    }[] = [];

    let currentBookingId: string | null = null;
    let currentIsSelected: boolean | null = null;
    let currentBlock: (typeof blocks)[0] | null = null;

    slots.forEach((slot, index) => {
      const booking = slot.bookingId
        ? tableBookings.find((b) => b.id === slot.bookingId)
        : undefined;
      const bookingId = booking?.id || null;
      const isSelected = selectedSlots.includes(slot.id);
      const isFree = !booking;

      const sameBooking = bookingId !== null && bookingId === currentBookingId;
      const sameFreeSelected = isFree && currentIsSelected !== null && isSelected === currentIsSelected;

      if ((sameBooking || sameFreeSelected) && currentBlock) {
        currentBlock.endIndex = index;
        currentBlock.endTime = slot.endTime;
        if (isSelected) currentBlock.isSelected = true;
      } else {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        currentBlock = {
          id: booking ? `block-${booking.id}-${index}` : `free-${isSelected ? 'sel' : 'unsel'}-${index}`,
          booking,
          startIndex: index,
          endIndex: index,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isSelected,
          isFree,
        };
        currentBookingId = bookingId;
        currentIsSelected = isFree ? isSelected : null;
      }
    });

    if (currentBlock) {
      blocks.push(currentBlock);
    }

    return blocks;
  };

  const blocks = useMemo(() => getMergedBlocks(), [slots, tableBookings, selectedSlots]);

  const getBlockStyle = (block: ReturnType<typeof getMergedBlocks>[0]) => {
    const widthPercent = ((block.endIndex - block.startIndex + 1) / slots.length) * 100;
    const leftPercent = (block.startIndex / slots.length) * 100;

    return {
      width: `${widthPercent}%`,
      left: `${leftPercent}%`,
    };
  };

  const getStatusColor = (booking: Booking | undefined) => {
    if (!booking) return 'bg-green-100 border-green-300';
    switch (booking.status) {
      case 'approved':
        return 'bg-blue-500 border-blue-600 text-white';
      case 'pending':
        return 'bg-yellow-100 border-yellow-400 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 border-red-400 text-red-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-600';
    }
  };

  const handleBlockClick = (
    block: ReturnType<typeof getMergedBlocks>[0],
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    if (block.booking && onBookingClick) {
      onBookingClick(block.booking);
    } else if (!block.booking && onSlotClick) {
      const container = e.currentTarget.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickPercent = clickX / rect.width;

      const clickedIndex = Math.min(
        slots.length - 1,
        Math.max(0, Math.floor(clickPercent * slots.length))
      );

      const clickedSlot = slots[clickedIndex];
      if (!clickedSlot || clickedSlot.status === 'booked') return;

      onSlotClick(clickedSlot);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900">今日排期</h3>
          <p className="text-xs text-gray-500">占用率: {occupancyRate}%</p>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-100 border border-green-300"></span>
            空闲
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-400"></span>
            待审批
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-500"></span>
            已确认
          </span>
        </div>
      </div>

      <div className="relative">
        <div className="flex border-b border-gray-100">
          <div className="w-16 flex-shrink-0"></div>
          <div className="flex-1 relative h-8">
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute top-0 text-xs text-gray-400"
                style={{ left: `${((hour - 8) / 10) * 100}%` }}
              >
                {hour}:00
              </div>
            ))}
          </div>
        </div>

        <div className="relative h-20">
          <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-center px-2 border-r border-gray-100">
            <span className="text-xs text-gray-500">时段</span>
          </div>
          <div className="absolute left-16 right-0 top-0 bottom-0 relative">
            {hours.slice(1).map((hour) => (
              <div
                key={hour}
                className="absolute top-0 bottom-0 w-px bg-gray-100"
                style={{ left: `${((hour - 8) / 10) * 100}%` }}
              />
            ))}

            {blocks.map((block) => (
              <div
                key={block.id}
                className={`absolute top-2 bottom-2 rounded-md border-2 cursor-pointer transition-all hover:opacity-80 ${
                  block.booking
                    ? getStatusColor(block.booking)
                    : block.isSelected
                    ? 'bg-blue-200 border-blue-400'
                    : 'bg-green-50 border-green-200 hover:bg-green-100'
                }`}
                style={getBlockStyle(block)}
                onClick={(e) => handleBlockClick(block, e)}
              >
                {block.booking && block.endIndex - block.startIndex >= 1 && (
                  <div className="p-1 text-xs font-medium truncate">
                    <div className="truncate">{block.booking.petName}</div>
                    <div className="text-[10px] opacity-75 truncate">
                      {block.booking.treatmentType}
                    </div>
                  </div>
                )}
                {block.isFree && block.isSelected && block.endIndex - block.startIndex >= 0 && (
                  <div className="flex items-center justify-center h-full text-xs text-blue-600 font-medium">
                    {block.startTime}-{block.endTime}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
