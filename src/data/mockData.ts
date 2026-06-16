import type { TreatmentTable, Booking, TimeoutRecord, PetOwner, Pet } from '@/types';
import { getToday, addDays, formatDateTime } from '@/utils/dateUtils';
import { createApprovalNodes, createApprovalRecord } from '@/utils/approvalUtils';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

const today = getToday();
const tomorrow = addDays(today, 1);
const dayAfter = addDays(today, 2);

export const mockTreatmentTables: TreatmentTable[] = [
  {
    id: 'table-1',
    name: '牙科治疗台A',
    description: '高端数字化牙科治疗台，配备超声波洁牙机',
    status: 'active',
    createdAt: '2024-01-01',
  },
  {
    id: 'table-2',
    name: '牙科治疗台B',
    description: '标准牙科治疗台，适合常规洁牙和检查',
    status: 'active',
    createdAt: '2024-01-01',
  },
  {
    id: 'table-3',
    name: '牙科治疗台C',
    description: '手术级牙科治疗台，配备麻醉设备',
    status: 'maintenance',
    createdAt: '2024-03-15',
  },
];

export const mockPetOwners: PetOwner[] = [
  { id: 'owner-1', name: '王小明', phone: '138****1234' },
  { id: 'owner-2', name: '李小花', phone: '139****5678' },
  { id: 'owner-3', name: '张大明', phone: '137****9012' },
];

export const mockPets: Pet[] = [
  { id: 'pet-1', ownerId: 'owner-1', name: '豆豆', species: '犬', breed: '金毛' },
  { id: 'pet-2', ownerId: 'owner-1', name: '咪咪', species: '猫', breed: '英短' },
  { id: 'pet-3', ownerId: 'owner-2', name: '旺财', species: '犬', breed: '柯基' },
  { id: 'pet-4', ownerId: 'owner-3', name: '小白', species: '猫', breed: '布偶' },
];

function createMockBooking(
  id: string,
  tableId: string,
  ownerId: string,
  ownerName: string,
  ownerPhone: string,
  petId: string,
  petName: string,
  petType: string,
  treatmentType: string,
  date: string,
  startTime: string,
  endTime: string,
  status: Booking['status'],
  submittedBy: string,
  submittedByName: string
): Booking {
  const bookingId = id;
  const approvalNodes = createApprovalNodes(bookingId);
  
  if (status === 'approved') {
    approvalNodes.forEach(node => {
      node.status = 'approved';
      node.endTime = node.startTime;
    });
  } else if (status === 'rejected') {
    approvalNodes[0].status = 'approved';
    approvalNodes[0].endTime = approvalNodes[0].startTime;
    approvalNodes[1].status = 'rejected';
    approvalNodes[1].endTime = approvalNodes[1].startTime;
    approvalNodes[1].comment = '治疗方案需要调整';
  }
  
  const slotCount = Math.floor(
    (parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]) -
     parseInt(startTime.split(':')[0]) * 60 - parseInt(startTime.split(':')[1])) / 30
  );
  
  const mergedSlotIds = [];
  let currentTime = startTime;
  for (let i = 0; i < slotCount; i++) {
    const slotId = `${tableId}-${date}-${Math.floor(
      (parseInt(currentTime.split(':')[0]) * 60 + parseInt(currentTime.split(':')[1]) - 8 * 60) / 30
    )}`;
    mergedSlotIds.push(slotId);
    const hours = parseInt(currentTime.split(':')[0]);
    const mins = parseInt(currentTime.split(':')[1]) + 30;
    currentTime = `${String(Math.floor((hours * 60 + mins) / 60)).padStart(2, '0')}:${String((hours * 60 + mins) % 60).padStart(2, '0')}`;
  }
  
  const approvalRecords = [
    createApprovalRecord(
      approvalNodes[0].id,
      bookingId,
      'submit',
      submittedBy,
      submittedByName,
      '提交治疗排程'
    ),
  ];
  
  if (status === 'approved' || status === 'rejected') {
    approvalRecords.push(
      createApprovalRecord(
        approvalNodes[1].id,
        bookingId,
        status === 'approved' ? 'approve' : 'reject',
        'senior1',
        '李主诊',
        status === 'approved' ? '同意治疗方案' : '治疗方案需要调整'
      )
    );
  }
  
  return {
    id: bookingId,
    tableId,
    ownerId,
    ownerName,
    ownerPhone,
    petId,
    petName,
    petType,
    treatmentType,
    startTime,
    endTime,
    date,
    status,
    mergedSlotIds,
    approvalNodes,
    approvalRecords,
    createdAt: formatDateTime(new Date()),
    submittedBy,
    submittedByName,
  };
}

export const mockBookings: Booking[] = [
  createMockBooking(
    'booking-1',
    'table-1',
    'owner-1',
    '王小明',
    '138****1234',
    'pet-1',
    '豆豆',
    '犬',
    '超声波洁牙',
    today,
    '09:00',
    '10:00',
    'pending',
    'doctor1',
    '张医生'
  ),
  createMockBooking(
    'booking-2',
    'table-1',
    'owner-1',
    '王小明',
    '138****1234',
    'pet-1',
    '豆豆',
    '犬',
    '牙齿检查',
    today,
    '10:00',
    '10:30',
    'pending',
    'doctor1',
    '张医生'
  ),
  createMockBooking(
    'booking-3',
    'table-1',
    'owner-2',
    '李小花',
    '139****5678',
    'pet-3',
    '旺财',
    '犬',
    '拔牙手术',
    today,
    '14:00',
    '15:30',
    'approved',
    'doctor2',
    '刘医生'
  ),
  createMockBooking(
    'booking-4',
    'table-2',
    'owner-3',
    '张大明',
    '137****9012',
    'pet-4',
    '小白',
    '猫',
    '常规洁牙',
    today,
    '10:00',
    '11:00',
    'approved',
    'doctor1',
    '张医生'
  ),
  createMockBooking(
    'booking-5',
    'table-2',
    'owner-2',
    '李小花',
    '139****5678',
    'pet-3',
    '旺财',
    '犬',
    '术后复查',
    tomorrow,
    '09:30',
    '10:00',
    'pending',
    'doctor2',
    '刘医生'
  ),
  createMockBooking(
    'booking-6',
    'table-1',
    'owner-3',
    '张大明',
    '137****9012',
    'pet-4',
    '小白',
    '猫',
    '牙齿美容',
    dayAfter,
    '14:00',
    '15:00',
    'rejected',
    'doctor1',
    '张医生'
  ),
];

export const mockTimeoutRecords: TimeoutRecord[] = [
  {
    id: 'timeout-1',
    bookingId: 'booking-1',
    nodeId: 'node-2',
    nodeName: '主诊医生审批',
    assignee: 'senior1',
    assigneeName: '李主诊',
    timeoutDuration: 45,
    isEscalated: false,
    reminderCount: 1,
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
];
