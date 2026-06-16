import type { Booking, ApprovalNode, TimeoutRecord, TimeoutStatus } from '@/types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function calculateElapsedMinutes(node: ApprovalNode, currentTime: Date = new Date()): number {
  const startTime = new Date(node.startTime);
  const elapsedMs = currentTime.getTime() - startTime.getTime();
  return Math.floor(elapsedMs / 1000 / 60);
}

export function getTimeoutStatus(node: ApprovalNode, currentTime: Date = new Date()): TimeoutStatus {
  if (node.status === 'timeout') return 'timeout';
  if (node.status === 'escalated') return 'escalated';
  if (node.status !== 'pending') return 'normal';
  if (node.timeoutDuration === 0) return 'normal';
  
  const elapsed = calculateElapsedMinutes(node, currentTime);
  const ratio = elapsed / node.timeoutDuration;
  
  if (ratio >= 1.5) return 'escalated';
  if (ratio >= 1) return 'timeout';
  if (ratio >= 0.8) return 'warning';
  return 'normal';
}

export function getTimeoutStatusText(status: TimeoutStatus): string {
  const statusMap = {
    normal: '正常',
    warning: '即将超时',
    timeout: '已超时',
    escalated: '已升级',
  };
  return statusMap[status];
}

export function getTimeoutStatusColor(status: TimeoutStatus): string {
  const colorMap = {
    normal: 'text-green-500',
    warning: 'text-yellow-500',
    timeout: 'text-orange-500',
    escalated: 'text-red-500',
  };
  return colorMap[status];
}

export function getRemainingTime(node: ApprovalNode, currentTime: Date = new Date()): number {
  const elapsed = calculateElapsedMinutes(node, currentTime);
  return Math.max(0, node.timeoutDuration - elapsed);
}

export function formatRemainingTime(minutes: number): string {
  if (minutes <= 0) return '已超时';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `剩余${hours}小时${mins}分钟`;
  }
  return `剩余${mins}分钟`;
}

export function createTimeoutRecord(
  bookingId: string,
  node: ApprovalNode,
  isEscalated: boolean = false,
  reminderCount: number = 1
): TimeoutRecord {
  return {
    id: generateId(),
    bookingId,
    nodeId: node.id,
    nodeName: node.nodeName,
    assignee: node.originalAssignee || node.assignee,
    assigneeName: node.originalAssigneeName || node.assigneeName,
    timeoutDuration: calculateElapsedMinutes(node),
    isEscalated,
    reminderCount,
    createdAt: new Date().toISOString(),
  };
}

export function checkAndUpdateTimeouts(
  bookings: Booking[],
  currentTime: Date = new Date()
): { updatedBookings: Booking[]; timeoutRecords: TimeoutRecord[] } {
  const timeoutRecords: TimeoutRecord[] = [];
  
  const updatedBookings = bookings.map(booking => {
    if (booking.status !== 'pending') return booking;
    
    let hasChanges = false;
    const updatedNodes = booking.approvalNodes.map(node => {
      if (node.status === 'approved' || node.status === 'rejected') return node;
      
      const status = getTimeoutStatus(node, currentTime);
      
      if (status === 'timeout' && node.status === 'pending') {
        hasChanges = true;
        timeoutRecords.push(createTimeoutRecord(booking.id, node, false, 1));
        return { ...node, status: 'timeout' as const };
      }
      
      if (status === 'escalated' && node.status !== 'escalated') {
        hasChanges = true;
        timeoutRecords.push(createTimeoutRecord(booking.id, node, true, 2));
        return { ...node, status: 'escalated' as const };
      }
      
      return node;
    });
    
    if (hasChanges) {
      return { ...booking, approvalNodes: updatedNodes };
    }
    
    return booking;
  });
  
  return { updatedBookings, timeoutRecords };
}

export function getTimeoutBookings(bookings: Booking[]): Booking[] {
  return bookings.filter(booking => 
    booking.approvalNodes.some(node => 
      node.status === 'timeout' || getTimeoutStatus(node) === 'escalated'
    )
  );
}

export function getWarningBookings(bookings: Booking[]): Booking[] {
  return bookings.filter(booking => 
    booking.approvalNodes.some(node => 
      getTimeoutStatus(node) === 'warning'
    )
  );
}

export function getTimeoutStats(bookings: Booking[]) {
  let totalTimeout = 0;
  let totalWarning = 0;
  let totalEscalated = 0;
  const assigneeStats: Record<string, { name: string; count: number; totalMinutes: number }> = {};
  
  bookings.forEach(booking => {
    booking.approvalNodes.forEach(node => {
      const status = getTimeoutStatus(node);
      
      if (status === 'warning') totalWarning++;
      if (status === 'timeout') totalTimeout++;
      if (status === 'escalated') {
        totalEscalated++;
        totalTimeout++;
      }
      
      if (status === 'timeout' || status === 'escalated') {
        const statId = node.originalAssignee || node.assignee;
        const statName = node.originalAssigneeName || node.assigneeName;
        
        if (!assigneeStats[statId]) {
          assigneeStats[statId] = {
            name: statName,
            count: 0,
            totalMinutes: 0,
          };
        }
        assigneeStats[statId].count++;
        assigneeStats[statId].totalMinutes += calculateElapsedMinutes(node);
      }
    });
  });
  
  const assigneeRanking = Object.entries(assigneeStats)
    .map(([id, stats]) => ({ id, ...stats }))
    .sort((a, b) => b.count - a.count || b.totalMinutes - a.totalMinutes);
  
  return {
    totalTimeout,
    totalWarning,
    totalEscalated,
    assigneeRanking,
  };
}

export function getTodayReminderCount(timeoutRecords: TimeoutRecord[]): number {
  const today = new Date().toDateString();
  return timeoutRecords.filter(r => 
    new Date(r.createdAt).toDateString() === today
  ).length;
}
