import type { Booking, ApprovalNode, ApprovalRecord } from '@/types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function createApprovalNodes(bookingId: string): ApprovalNode[] {
  const now = new Date().toISOString();
  
  return [
    {
      id: generateId(),
      bookingId,
      nodeName: '医生提交',
      nodeOrder: 1,
      assignee: 'doctor1',
      assigneeName: '张医生',
      status: 'approved',
      startTime: now,
      endTime: now,
      timeoutDuration: 0,
      comment: '治疗方案已确认',
    },
    {
      id: generateId(),
      bookingId,
      nodeName: '主诊医生审批',
      nodeOrder: 2,
      assignee: 'senior1',
      assigneeName: '李主诊',
      status: 'pending',
      startTime: now,
      timeoutDuration: 30,
    },
    {
      id: generateId(),
      bookingId,
      nodeName: '前台确认',
      nodeOrder: 3,
      assignee: 'reception1',
      assigneeName: '王前台',
      status: 'pending',
      startTime: now,
      timeoutDuration: 15,
    },
  ];
}

export function createApprovalRecord(
  nodeId: string,
  bookingId: string,
  action: ApprovalRecord['action'],
  operator: string,
  operatorName: string,
  comment?: string
): ApprovalRecord {
  return {
    id: generateId(),
    nodeId,
    bookingId,
    action,
    operator,
    operatorName,
    comment,
    timestamp: new Date().toISOString(),
  };
}

export function getCurrentApprovalNode(booking: Booking): ApprovalNode | undefined {
  return booking.approvalNodes.find(node => node.status === 'pending');
}

export function getApprovalProgress(booking: Booking): number {
  const totalNodes = booking.approvalNodes.length;
  const approvedNodes = booking.approvalNodes.filter(
    n => n.status === 'approved' || n.status === 'timeout'
  ).length;
  
  if (totalNodes === 0) return 0;
  return Math.round((approvedNodes / totalNodes) * 100);
}

export function approveNode(
  booking: Booking,
  nodeId: string,
  comment?: string
): Booking {
  const updatedNodes = booking.approvalNodes.map(node => {
    if (node.id === nodeId) {
      return {
        ...node,
        status: 'approved' as const,
        endTime: new Date().toISOString(),
        comment,
      };
    }
    return node;
  });
  
  const currentIndex = updatedNodes.findIndex(n => n.id === nodeId);
  if (currentIndex < updatedNodes.length - 1) {
    const nextNode = updatedNodes[currentIndex + 1];
    if (nextNode.status === 'pending') {
      nextNode.startTime = new Date().toISOString();
    }
  }
  
  const approvalRecord = createApprovalRecord(
    nodeId,
    booking.id,
    'approve',
    'senior1',
    '李主诊',
    comment
  );
  
  const allApproved = updatedNodes.every(n => n.status === 'approved' || n.status === 'timeout');
  
  return {
    ...booking,
    approvalNodes: updatedNodes,
    approvalRecords: [...booking.approvalRecords, approvalRecord],
    status: allApproved ? 'approved' : booking.status,
  };
}

export function rejectNode(
  booking: Booking,
  nodeId: string,
  comment?: string
): Booking {
  const updatedNodes = booking.approvalNodes.map(node => {
    if (node.id === nodeId) {
      return {
        ...node,
        status: 'rejected' as const,
        endTime: new Date().toISOString(),
        comment,
      };
    }
    return node;
  });
  
  const approvalRecord = createApprovalRecord(
    nodeId,
    booking.id,
    'reject',
    'senior1',
    '李主诊',
    comment
  );
  
  return {
    ...booking,
    approvalNodes: updatedNodes,
    approvalRecords: [...booking.approvalRecords, approvalRecord],
    status: 'rejected',
  };
}

export function escalateNode(
  booking: Booking,
  nodeId: string
): Booking {
  const node = booking.approvalNodes.find(n => n.id === nodeId);
  if (!node) return booking;
  
  const approvalRecord = createApprovalRecord(
    nodeId,
    booking.id,
    'escalate',
    'system',
    '系统自动升级',
    '审批超时，已自动升级至管理员'
  );
  
  return {
    ...booking,
    approvalRecords: [...booking.approvalRecords, approvalRecord],
  };
}

export function cancelApproval(
  booking: Booking,
  operator: string,
  operatorName: string,
  comment?: string
): Booking {
  const updatedNodes = booking.approvalNodes.map(node => {
    if (node.status === 'pending') {
      return {
        ...node,
        status: 'rejected' as const,
        endTime: new Date().toISOString(),
        comment: '预约已取消',
      };
    }
    return node;
  });
  
  const approvalRecord = createApprovalRecord(
    '',
    booking.id,
    'cancel',
    operator,
    operatorName,
    comment
  );
  
  return {
    ...booking,
    approvalNodes: updatedNodes,
    approvalRecords: [...booking.approvalRecords, approvalRecord],
    status: 'cancelled',
  };
}

export function getApprovalStatusText(status: Booking['status']): string {
  const statusMap = {
    pending: '审批中',
    approved: '已通过',
    rejected: '已驳回',
    cancelled: '已取消',
  };
  return statusMap[status];
}

export function getNodeStatusText(status: ApprovalNode['status']): string {
  const statusMap = {
    pending: '待处理',
    approved: '已通过',
    rejected: '已驳回',
    timeout: '已超时',
  };
  return statusMap[status];
}

export function getActionText(action: ApprovalRecord['action']): string {
  const actionMap = {
    submit: '提交',
    approve: '通过',
    reject: '驳回',
    timeout: '超时',
    escalate: '升级催办',
    cancel: '取消',
  };
  return actionMap[action];
}
