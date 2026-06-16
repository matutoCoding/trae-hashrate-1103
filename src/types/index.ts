export interface TreatmentTable {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'maintenance' | 'disabled';
  createdAt: string;
}

export interface TimeSlot {
  id: string;
  tableId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'free' | 'booked' | 'merged';
  bookingId?: string;
}

export interface Booking {
  id: string;
  tableId: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  petId: string;
  petName: string;
  petType: string;
  treatmentType: string;
  startTime: string;
  endTime: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  mergedSlotIds: string[];
  approvalNodes: ApprovalNode[];
  approvalRecords: ApprovalRecord[];
  createdAt: string;
  submittedBy: string;
  submittedByName: string;
}

export interface ApprovalNode {
  id: string;
  bookingId: string;
  nodeName: string;
  nodeOrder: number;
  assignee: string;
  assigneeName: string;
  status: 'pending' | 'approved' | 'rejected' | 'timeout';
  startTime: string;
  endTime?: string;
  timeoutDuration: number;
  comment?: string;
}

export interface ApprovalRecord {
  id: string;
  nodeId: string;
  bookingId: string;
  action: 'submit' | 'approve' | 'reject' | 'timeout' | 'escalate' | 'cancel';
  operator: string;
  operatorName: string;
  comment?: string;
  timestamp: string;
}

export interface TimeoutRecord {
  id: string;
  bookingId: string;
  nodeId: string;
  nodeName: string;
  assignee: string;
  assigneeName: string;
  timeoutDuration: number;
  isEscalated: boolean;
  reminderCount: number;
  createdAt: string;
}

export interface PetOwner {
  id: string;
  name: string;
  phone: string;
}

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  species: string;
  breed: string;
}

export interface MergeResult {
  mergedBookings: Booking[];
  affectedSlotIds: string[];
}

export interface SplitResult {
  splitBookings: Booking[];
  removedBookingId?: string;
}

export type TimeoutStatus = 'normal' | 'warning' | 'timeout' | 'escalated';
