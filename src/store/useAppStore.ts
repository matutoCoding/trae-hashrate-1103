import { create } from 'zustand';
import type { TreatmentTable, Booking, TimeSlot, TimeoutRecord } from '@/types';
import { mockTreatmentTables, mockBookings, mockTimeoutRecords } from '@/data/mockData';
import { generateTimeSlots, getToday, timeDiffMinutes } from '@/utils/dateUtils';
import { mergeBookings, splitBooking, mergeAllBookings } from '@/utils/mergeUtils';
import {
  approveNode,
  rejectNode,
  cancelApproval,
  createApprovalNodes,
  createApprovalRecord,
  escalateNode,
} from '@/utils/approvalUtils';
import {
  checkAndUpdateTimeouts,
  createTimeoutRecord,
  getTimeoutStatus,
  calculateElapsedMinutes,
} from '@/utils/timeoutUtils';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

const STORAGE_KEY = 'pet-dental-booking-store';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}

function saveToStorage(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

interface PersistedData {
  treatmentTables: TreatmentTable[];
  bookings: Booking[];
  timeoutRecords: TimeoutRecord[];
}

const persisted = loadFromStorage<PersistedData>(STORAGE_KEY, {
  treatmentTables: mockTreatmentTables,
  bookings: mockBookings,
  timeoutRecords: mockTimeoutRecords,
});

const initialBookings = mergeAllBookings(persisted.bookings);

interface AppState {
  treatmentTables: TreatmentTable[];
  bookings: Booking[];
  selectedDate: string;
  selectedTableId: string | null;
  selectedSlots: string[];
  timeoutRecords: TimeoutRecord[];
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string;

  setSelectedDate: (date: string) => void;
  setSelectedTableId: (id: string | null) => void;
  toggleSlotSelection: (slotId: string) => void;
  selectSlotRange: (slotId: string, allSlots: TimeSlot[]) => void;
  clearSlotSelection: () => void;

  getTimeSlotsForTable: (tableId: string, date: string) => TimeSlot[];
  getBookingsForTable: (tableId: string, date: string) => Booking[];

  createBooking: (
    tableId: string,
    ownerName: string,
    ownerPhone: string,
    petName: string,
    petType: string,
    treatmentType: string,
    startTime: string,
    endTime: string,
    date: string,
    slotIds: string[]
  ) => void;

  cancelBooking: (bookingId: string, cancelStart: string, cancelEnd: string) => void;

  approveBooking: (bookingId: string, nodeId: string, comment?: string) => void;
  rejectBooking: (bookingId: string, nodeId: string, comment?: string) => void;

  remindBooking: (bookingId: string) => void;
  escalateBooking: (bookingId: string) => void;

  updateTimeouts: () => void;

  addTreatmentTable: (table: Omit<TreatmentTable, 'id' | 'createdAt'>) => void;
  updateTreatmentTable: (id: string, updates: Partial<TreatmentTable>) => void;
  deleteTreatmentTable: (id: string) => void;
}

function persist(state: { treatmentTables: TreatmentTable[]; bookings: Booking[]; timeoutRecords: TimeoutRecord[] }) {
  saveToStorage(STORAGE_KEY, {
    treatmentTables: state.treatmentTables,
    bookings: state.bookings,
    timeoutRecords: state.timeoutRecords,
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  treatmentTables: persisted.treatmentTables,
  bookings: initialBookings,
  selectedDate: getToday(),
  selectedTableId: persisted.treatmentTables[0]?.id || null,
  selectedSlots: [],
  timeoutRecords: persisted.timeoutRecords,
  currentUserId: 'senior1',
  currentUserName: '李主诊',
  currentUserRole: 'senior',

  setSelectedDate: (date) => {
    set({ selectedDate: date, selectedSlots: [] });
  },

  setSelectedTableId: (id) => {
    set({ selectedTableId: id, selectedSlots: [] });
  },

  toggleSlotSelection: (slotId) => {
    const { selectedSlots } = get();
    if (selectedSlots.includes(slotId)) {
      set({ selectedSlots: selectedSlots.filter((id) => id !== slotId) });
    } else {
      set({ selectedSlots: [...selectedSlots, slotId] });
    }
  },

  selectSlotRange: (slotId, allSlots) => {
    const { selectedSlots } = get();
    if (selectedSlots.length === 0) {
      set({ selectedSlots: [slotId] });
      return;
    }

    const clickedIndex = allSlots.findIndex((s) => s.id === slotId);
    if (clickedIndex === -1) return;

    const bookedIds = new Set(
      allSlots.filter((s) => s.status === 'booked').map((s) => s.id)
    );

    const firstSelectedIndex = allSlots.findIndex((s) => s.id === selectedSlots[0]);
    if (firstSelectedIndex === -1) {
      set({ selectedSlots: [slotId] });
      return;
    }

    const start = Math.min(firstSelectedIndex, clickedIndex);
    const end = Math.max(firstSelectedIndex, clickedIndex);

    const rangeIds: string[] = [];
    for (let i = start; i <= end; i++) {
      if (!bookedIds.has(allSlots[i].id)) {
        rangeIds.push(allSlots[i].id);
      }
    }

    set({ selectedSlots: rangeIds });
  },

  clearSlotSelection: () => {
    set({ selectedSlots: [] });
  },

  getTimeSlotsForTable: (tableId, date) => {
    const baseSlots = generateTimeSlots(date, tableId, '08:00', '18:00', 30);
    const { bookings } = get();
    const tableBookings = bookings.filter(
      (b) =>
        b.tableId === tableId &&
        b.date === date &&
        b.status !== 'cancelled' &&
        b.status !== 'rejected'
    );

    return baseSlots.map((slot) => {
      const booking = tableBookings.find((b) => b.mergedSlotIds.includes(slot.id));
      if (booking) {
        return { ...slot, status: 'booked' as const, bookingId: booking.id };
      }
      return slot;
    });
  },

  getBookingsForTable: (tableId, date) => {
    const { bookings } = get();
    return bookings.filter((b) => b.tableId === tableId && b.date === date);
  },

  createBooking: (
    tableId,
    ownerName,
    ownerPhone,
    petName,
    petType,
    treatmentType,
    startTime,
    endTime,
    date,
    slotIds
  ) => {
    const { bookings, currentUserId, currentUserName } = get();
    const bookingId = generateId();

    const existingOwner = bookings.find(
      (b) =>
        b.ownerName === ownerName &&
        b.ownerPhone === ownerPhone &&
        b.tableId === tableId &&
        b.date === date &&
        b.status !== 'cancelled' &&
        b.status !== 'rejected'
    );
    const ownerId = existingOwner?.ownerId || generateId();

    const newBooking: Booking = {
      id: bookingId,
      tableId,
      ownerId,
      ownerName,
      ownerPhone,
      petId: generateId(),
      petName,
      petType,
      treatmentType,
      startTime,
      endTime,
      date,
      status: 'pending',
      mergedSlotIds: slotIds,
      approvalNodes: createApprovalNodes(bookingId),
      approvalRecords: [
        createApprovalRecord('', bookingId, 'submit', currentUserId, currentUserName, '提交治疗排程'),
      ],
      createdAt: new Date().toISOString(),
      submittedBy: currentUserId,
      submittedByName: currentUserName,
    };

    const result = mergeBookings(bookings, newBooking);

    const allMergedBookings = mergeAllBookings(result.mergedBookings);

    const newState = {
      bookings: allMergedBookings,
      selectedSlots: [],
    };
    set(newState);
    persist({ ...get(), ...newState });
  },

  cancelBooking: (bookingId, cancelStart, cancelEnd) => {
    const { bookings, currentUserId, currentUserName } = get();
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const slots = get().getTimeSlotsForTable(booking.tableId, booking.date);

    const result = splitBooking(booking, cancelStart, cancelEnd, slots);

    let updatedBookings = bookings.filter((b) => b.id !== bookingId);

    if (result.splitBookings.length === 0) {
      const cancelledBooking = cancelApproval(
        { ...booking },
        currentUserId,
        currentUserName,
        '取消全部预约'
      );
      updatedBookings.push(cancelledBooking);
    } else {
      result.splitBookings.forEach((splitB, index) => {
        const keptBooking: Booking = {
          ...splitB,
          approvalNodes: booking.approvalNodes.map((n) => ({ ...n })),
          approvalRecords: [...booking.approvalRecords],
        };

        const cancelRecord = createApprovalRecord(
          '',
          splitB.id,
          'cancel',
          currentUserId,
          currentUserName,
          index === 0
            ? `部分取消预约 (${cancelStart}-${cancelEnd})`
            : `预约拆分保留段 (${splitB.startTime}-${splitB.endTime})`
        );
        keptBooking.approvalRecords = [...keptBooking.approvalRecords, cancelRecord];

        updatedBookings.push(keptBooking);
      });
    }

    const newState = { bookings: updatedBookings };
    set(newState);
    persist({ ...get(), ...newState });
  },

  approveBooking: (bookingId, nodeId, comment) => {
    const { bookings } = get();
    const updatedBookings = bookings.map((booking) => {
      if (booking.id === bookingId) {
        return approveNode(booking, nodeId, comment);
      }
      return booking;
    });
    const newState = { bookings: updatedBookings };
    set(newState);
    persist({ ...get(), ...newState });
  },

  rejectBooking: (bookingId, nodeId, comment) => {
    const { bookings } = get();
    const updatedBookings = bookings.map((booking) => {
      if (booking.id === bookingId) {
        return rejectNode(booking, nodeId, comment);
      }
      return booking;
    });
    const newState = { bookings: updatedBookings };
    set(newState);
    persist({ ...get(), ...newState });
  },

  remindBooking: (bookingId) => {
    const { bookings, timeoutRecords, currentUserId, currentUserName } = get();
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const currentNode = booking.approvalNodes.find(
      (n) => n.status === 'pending' || n.status === 'timeout' || n.status === 'escalated'
    );
    if (!currentNode) return;

    const reminderRecord = createApprovalRecord(
      currentNode.id,
      bookingId,
      'timeout',
      'system',
      '系统催办',
      `催办通知已发送至 ${currentNode.assigneeName}，请尽快处理`
    );

    const timeoutRecord = createTimeoutRecord(bookingId, currentNode, false, 1);

    const updatedBookings = bookings.map((b) => {
      if (b.id === bookingId) {
        return {
          ...b,
          approvalRecords: [...b.approvalRecords, reminderRecord],
        };
      }
      return b;
    });

    const existing = timeoutRecords.find(
      (r) => r.nodeId === currentNode.id && !r.isEscalated
    );
    let updatedTimeoutRecords = timeoutRecords;
    if (existing) {
      updatedTimeoutRecords = timeoutRecords.map((r) =>
        r.id === existing.id
          ? { ...r, reminderCount: r.reminderCount + 1, createdAt: new Date().toISOString() }
          : r
      );
    } else {
      updatedTimeoutRecords = [...timeoutRecords, timeoutRecord];
    }

    const newState = { bookings: updatedBookings, timeoutRecords: updatedTimeoutRecords };
    set(newState);
    persist({ ...get(), ...newState });
  },

  escalateBooking: (bookingId) => {
    const { bookings, timeoutRecords, currentUserId, currentUserName } = get();
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const currentNode = booking.approvalNodes.find(
      (n) => n.status === 'pending' || n.status === 'timeout' || n.status === 'escalated'
    );
    if (!currentNode) return;

    const originalAssigneeName = currentNode.originalAssigneeName || currentNode.assigneeName;

    const updatedBooking = escalateNode(booking, currentNode.id);

    const escalateRecord = createApprovalRecord(
      currentNode.id,
      bookingId,
      'escalate',
      'system',
      '系统升级催办',
      `审批超时已升级，原责任人：${originalAssigneeName}，现升级至管理员处理`
    );
    updatedBooking.approvalRecords = [...updatedBooking.approvalRecords, escalateRecord];

    const newCurrentNode = updatedBooking.approvalNodes.find(n => n.id === currentNode.id);
    const timeoutRecord = createTimeoutRecord(bookingId, newCurrentNode || currentNode, true, 1);

    const updatedBookings = bookings.map((b) =>
      b.id === bookingId ? updatedBooking : b
    );

    const existing = timeoutRecords.find(
      (r) => r.nodeId === currentNode.id && r.isEscalated
    );
    let updatedTimeoutRecords = timeoutRecords;
    if (existing) {
      updatedTimeoutRecords = timeoutRecords.map((r) =>
        r.id === existing.id
          ? { ...r, reminderCount: r.reminderCount + 1, createdAt: new Date().toISOString() }
          : r
      );
    } else {
      updatedTimeoutRecords = [...timeoutRecords, timeoutRecord];
    }

    const newState = { bookings: updatedBookings, timeoutRecords: updatedTimeoutRecords };
    set(newState);
    persist({ ...get(), ...newState });
  },

  updateTimeouts: () => {
    const { bookings, timeoutRecords } = get();
    const { updatedBookings, timeoutRecords: newRecords } = checkAndUpdateTimeouts(bookings);

    if (newRecords.length > 0) {
      const newState = {
        bookings: updatedBookings,
        timeoutRecords: [...timeoutRecords, ...newRecords],
      };
      set(newState);
      persist({ ...get(), ...newState });
    }
  },

  addTreatmentTable: (table) => {
    const { treatmentTables } = get();
    const newTable: TreatmentTable = {
      ...table,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const newState = { treatmentTables: [...treatmentTables, newTable] };
    set(newState);
    persist({ ...get(), ...newState });
  },

  updateTreatmentTable: (id, updates) => {
    const { treatmentTables } = get();
    const updatedTables = treatmentTables.map((t) =>
      t.id === id ? { ...t, ...updates } : t
    );
    const newState = { treatmentTables: updatedTables };
    set(newState);
    persist({ ...get(), ...newState });
  },

  deleteTreatmentTable: (id) => {
    const { treatmentTables } = get();
    const newState = { treatmentTables: treatmentTables.filter((t) => t.id !== id) };
    set(newState);
    persist({ ...get(), ...newState });
  },
}));
