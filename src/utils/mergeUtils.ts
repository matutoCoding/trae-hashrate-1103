import type { Booking, TimeSlot, MergeResult, SplitResult } from '@/types';
import { timeDiffMinutes } from './dateUtils';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function sortBookingsByTime(bookings: Booking[]): Booking[] {
  return [...bookings].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return timeDiffMinutes(b.startTime, a.startTime);
  });
}

function isSameOwner(b1: Booking, b2: Booking): boolean {
  return b1.ownerName === b2.ownerName && b1.ownerPhone === b2.ownerPhone;
}

function areAdjacent(b1: Booking, b2: Booking): boolean {
  return b1.endTime === b2.startTime || b2.endTime === b1.startTime;
}

export function checkCanMerge(
  booking1: Booking,
  booking2: Booking
): boolean {
  if (!isSameOwner(booking1, booking2)) return false;
  if (booking1.tableId !== booking2.tableId) return false;
  if (booking1.date !== booking2.date) return false;
  if (booking1.status === 'cancelled' || booking2.status === 'cancelled') return false;
  if (booking1.status === 'rejected' || booking2.status === 'rejected') return false;
  return areAdjacent(booking1, booking2);
}

export function mergeBookings(
  bookings: Booking[],
  newBooking: Booking
): MergeResult {
  const sameOwnerBookings = bookings.filter(
    (b) =>
      isSameOwner(b, newBooking) &&
      b.tableId === newBooking.tableId &&
      b.date === newBooking.date &&
      b.id !== newBooking.id &&
      b.status !== 'cancelled' &&
      b.status !== 'rejected'
  );

  let currentBooking = { ...newBooking };
  const mergedIds: string[] = [newBooking.id];
  const affectedSlotIds = [...newBooking.mergedSlotIds];

  const sortedBookings = sortBookingsByTime(sameOwnerBookings);

  let changed = true;
  while (changed) {
    changed = false;
    for (const booking of sortedBookings) {
      if (mergedIds.includes(booking.id)) continue;

      if (checkCanMerge(currentBooking, booking)) {
        const earlier =
          timeDiffMinutes(currentBooking.startTime, booking.startTime) > 0
            ? currentBooking
            : booking;
        const later = earlier === currentBooking ? booking : currentBooking;

        currentBooking = {
          ...currentBooking,
          id: currentBooking.id,
          startTime: earlier.startTime,
          endTime: later.endTime,
          mergedSlotIds: [...earlier.mergedSlotIds, ...later.mergedSlotIds],
        };

        mergedIds.push(booking.id);
        affectedSlotIds.push(...booking.mergedSlotIds);
        changed = true;
        break;
      }
    }
  }

  const remainingBookings = bookings.filter(
    (b) => !mergedIds.includes(b.id) && b.id !== newBooking.id
  );

  return {
    mergedBookings: [...remainingBookings, currentBooking],
    affectedSlotIds,
  };
}

export function splitBooking(
  booking: Booking,
  cancelStart: string,
  cancelEnd: string,
  allSlots: TimeSlot[]
): SplitResult {
  const bookingSlots = allSlots
    .filter((slot) => booking.mergedSlotIds.includes(slot.id))
    .sort((a, b) => timeDiffMinutes(b.startTime, a.startTime));

  const slotsToCancel = bookingSlots.filter((slot) => {
    const slotStart = slot.startTime;
    const slotEnd = slot.endTime;
    return !(
      timeDiffMinutes(cancelEnd, slotStart) <= 0 ||
      timeDiffMinutes(slotEnd, cancelStart) <= 0
    );
  });

  const cancelIds = slotsToCancel.map((s) => s.id);

  if (cancelIds.length === 0) {
    return { splitBookings: [booking] };
  }

  if (cancelIds.length === bookingSlots.length) {
    return {
      splitBookings: [],
      removedBookingId: booking.id,
    };
  }

  const keptSlots = bookingSlots.filter((s) => !cancelIds.includes(s.id));

  const segments: TimeSlot[][] = [];
  let currentSegment: TimeSlot[] = [];

  for (let i = 0; i < keptSlots.length; i++) {
    if (i === 0) {
      currentSegment.push(keptSlots[i]);
    } else {
      const prevSlot = keptSlots[i - 1];
      const currSlot = keptSlots[i];
      if (prevSlot.endTime === currSlot.startTime) {
        currentSegment.push(currSlot);
      } else {
        segments.push(currentSegment);
        currentSegment = [currSlot];
      }
    }
  }
  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  const splitBookings: Booking[] = segments.map((segment, index) => {
    const firstSlot = segment[0];
    const lastSlot = segment[segment.length - 1];

    return {
      ...booking,
      id: index === 0 ? booking.id : generateId(),
      startTime: firstSlot.startTime,
      endTime: lastSlot.endTime,
      mergedSlotIds: segment.map((s) => s.id),
      status: booking.status,
    };
  });

  return {
    splitBookings,
    removedBookingId: splitBookings.length === 0 ? booking.id : undefined,
  };
}

export function calculateOccupancyRate(
  slots: TimeSlot[],
  bookings: Booking[]
): number {
  const bookedSlots = slots.filter((slot) =>
    bookings.some(
      (b) =>
        b.mergedSlotIds.includes(slot.id) &&
        b.status !== 'cancelled' &&
        b.status !== 'rejected'
    )
  );

  if (slots.length === 0) return 0;
  return Math.round((bookedSlots.length / slots.length) * 100);
}

export function getBookingsForSlot(
  slotId: string,
  bookings: Booking[]
): Booking | undefined {
  return bookings.find(
    (b) =>
      b.mergedSlotIds.includes(slotId) &&
      b.status !== 'cancelled' &&
      b.status !== 'rejected'
  );
}

export function mergeAllBookings(bookings: Booking[]): Booking[] {
  const activeBookings = bookings.filter(
    (b) => b.status !== 'cancelled' && b.status !== 'rejected'
  );

  const otherBookings = bookings.filter(
    (b) => b.status === 'cancelled' || b.status === 'rejected'
  );

  const groups: Record<string, Booking[]> = {};

  activeBookings.forEach((booking) => {
    const key = `${booking.ownerName}|${booking.ownerPhone}|${booking.tableId}|${booking.date}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(booking);
  });

  const mergedResults: Booking[] = [];

  Object.values(groups).forEach((group) => {
    if (group.length <= 1) {
      mergedResults.push(...group);
      return;
    }

    const sorted = sortBookingsByTime(group);
    const remaining = [...sorted];
    const finalMerged: Booking[] = [];

    while (remaining.length > 0) {
      let current = { ...remaining.shift()! };
      const currentMergedIds = [current.id];
      let changed = true;

      while (changed) {
        changed = false;
        for (let i = 0; i < remaining.length; i++) {
          const other = remaining[i];
          if (currentMergedIds.includes(other.id)) continue;

          if (checkCanMerge(current, other)) {
            const earlier =
              timeDiffMinutes(current.startTime, other.startTime) > 0
                ? current
                : other;
            const later = earlier === current ? other : current;

            const mergedApprovalRecords = [
              ...current.approvalRecords,
              ...other.approvalRecords.filter(
                (r) => !current.approvalRecords.some((cr) => cr.id === r.id)
              ),
            ];

            current = {
              ...current,
              id: current.id,
              startTime: earlier.startTime,
              endTime: later.endTime,
              mergedSlotIds: [...earlier.mergedSlotIds, ...later.mergedSlotIds],
              approvalRecords: mergedApprovalRecords,
            };

            currentMergedIds.push(other.id);
            remaining.splice(i, 1);
            changed = true;
            break;
          }
        }
      }

      finalMerged.push(current);
    }

    mergedResults.push(...finalMerged);
  });

  return [...mergedResults, ...otherBookings];
}
