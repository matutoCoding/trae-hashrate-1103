import { create } from 'zustand';
import type { TreatmentTable, Booking, TimeSlot, TimeoutRecord } from '@/types';
import { mockTreatmentTables, mockBookings, mockTimeoutRecords } from '@/data/mockData';
import { generateTimeSlots, getToday } from '@/utils/dateUtils';
import { mergeBookings, splitBooking } from '@/utils/mergeUtils';
import { approveNode, rejectNode, cancelApproval, createApprovalNodes, createApprovalRecord } from '@/utils/approvalUtils';
import { checkAndUpdateTimeouts, createTimeoutRecord, getTimeoutStatus } from '@/utils/timeoutUtils';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

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
  
  updateTimeouts: () => void;
  
  addTreatmentTable: (table: Omit<TreatmentTable, 'id' | 'createdAt'>) => void;
  updateTreatmentTable: (id: string, updates: Partial<TreatmentTable>) => void;
  deleteTreatmentTable: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  treatmentTables: mockTreatmentTables,
  bookings: mockBookings,
  selectedDate: getToday(),
  selectedTableId: mockTreatmentTables[0]?.id || null,
  selectedSlots: [],
  timeoutRecords: mockTimeoutRecords,
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
      set({ selectedSlots: selectedSlots.filter(id => id !== slotId) });
    } else {
      set({ selectedSlots: [...selectedSlots, slotId] });
    }
  },
  
  clearSlotSelection: () => {
    set({ selectedSlots: [] });
  },
  
  getTimeSlotsForTable: (tableId, date) => {
    const baseSlots = generateTimeSlots(date, tableId, '08:00', '18:00', 30);
    const { bookings } = get();
    const tableBookings = bookings.filter(
      b => b.tableId === tableId && 
           b.date === date && 
           b.status !== 'cancelled' && 
           b.status !== 'rejected'
    );
    
    return baseSlots.map(slot => {
      const booking = tableBookings.find(b => b.mergedSlotIds.includes(slot.id));
      if (booking) {
        return { ...slot, status: 'booked' as const, bookingId: booking.id };
      }
      return slot;
    });
  },
  
  getBookingsForTable: (tableId, date) => {
    const { bookings } = get();
    return bookings.filter(
      b => b.tableId === tableId && b.date === date
    );
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
    
    const newBooking: Booking = {
      id: bookingId,
      tableId,
      ownerId: generateId(),
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
    
    set({ 
      bookings: result.mergedBookings,
      selectedSlots: [],
    });
  },
  
  cancelBooking: (bookingId, cancelStart, cancelEnd) => {
    const { bookings, currentUserId, currentUserName } = get();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    const { selectedTableId, selectedDate } = get();
    const slots = get().getTimeSlotsForTable(booking.tableId, booking.date);
    
    const result = splitBooking(booking, cancelStart, cancelEnd, slots);
    
    let updatedBookings = bookings.filter(b => b.id !== bookingId);
    
    result.splitBookings.forEach((splitBooking, index) => {
      const bookingWithApproval = cancelApproval(
        { ...splitBooking, approvalNodes: booking.approvalNodes, approvalRecords: booking.approvalRecords },
        currentUserId,
        currentUserName,
        index === 0 ? '部分取消预约' : '预约拆分后取消'
      );
      updatedBookings.push(bookingWithApproval);
    });
    
    set({ bookings: updatedBookings });
  },
  
  approveBooking: (bookingId, nodeId, comment) => {
    const { bookings } = get();
    const updatedBookings = bookings.map(booking => {
      if (booking.id === bookingId) {
        return approveNode(booking, nodeId, comment);
      }
      return booking;
    });
    set({ bookings: updatedBookings });
  },
  
  rejectBooking: (bookingId, nodeId, comment) => {
    const { bookings } = get();
    const updatedBookings = bookings.map(booking => {
      if (booking.id === bookingId) {
        return rejectNode(booking, nodeId, comment);
      }
      return booking;
    });
    set({ bookings: updatedBookings });
  },
  
  updateTimeouts: () => {
    const { bookings, timeoutRecords } = get();
    const { updatedBookings, timeoutRecords: newRecords } = checkAndUpdateTimeouts(bookings);
    
    if (newRecords.length > 0) {
      set({
        bookings: updatedBookings,
        timeoutRecords: [...timeoutRecords, ...newRecords],
      });
    }
  },
  
  addTreatmentTable: (table) => {
    const { treatmentTables } = get();
    const newTable: TreatmentTable = {
      ...table,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    set({ treatmentTables: [...treatmentTables, newTable] });
  },
  
  updateTreatmentTable: (id, updates) => {
    const { treatmentTables } = get();
    const updatedTables = treatmentTables.map(t => 
      t.id === id ? { ...t, ...updates } : t
    );
    set({ treatmentTables: updatedTables });
  },
  
  deleteTreatmentTable: (id) => {
    const { treatmentTables } = get();
    set({ treatmentTables: treatmentTables.filter(t => t.id !== id) });
  },
}));
