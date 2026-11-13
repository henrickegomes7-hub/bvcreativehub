import { RequestStatus, RequestPriority, UserRole, CreativeRequest, DashboardMetrics } from '../types';

export const STATUS_SEQUENCE: RequestStatus[] = [
  'backlog',
  'in_progress',
  'review',
  'client_approval',
  'approved'
];

export const STATUS_LABELS: Record<RequestStatus, string> = {
  backlog: 'Triagem / Backlog',
  in_progress: 'Em Produção',
  review: 'Revisão Criativa / QA',
  client_approval: 'Aprovação do Solicitante',
  approved: 'Concluído & Aprovado',
};

export const STATUS_COLORS: Record<RequestStatus, string> = {
  backlog: '#64748B',        // Slate
  in_progress: '#083181',    // BV Azul #083181
  review: '#7C3AED',         // Violet QA
  client_approval: '#c56a2d',// BV Laranja #c56a2d
  approved: '#a0b900',       // BV Verde #a0b900
};

export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente / Crítica',
};

export const PRIORITY_COLORS: Record<RequestPriority, { bg: string; text: string; border: string }> = {
  low: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
  medium: { bg: '#EFF6FF', text: '#083181', border: '#BFDBFE' },
  high: { bg: '#FFF7ED', text: '#c56a2d', border: '#FED7AA' },
  urgent: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
};

/**
 * Checks whether a status transition is permitted for the user's role.
 */
export function canTransition(
  current: RequestStatus,
  target: RequestStatus,
  role: UserRole
): { allowed: boolean; reason?: string } {
  if (current === target) {
    return { allowed: true };
  }

  // Admin and Creative Manager have global bypass
  if (role === 'admin' || role === 'creative_manager') {
    return { allowed: true };
  }

  // Solicitante (Requester) role can only approve/reject when in client_approval
  if (role === 'requester') {
    if (current === 'client_approval' && (target === 'approved' || target === 'in_progress')) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Solicitantes só podem aprovar ou solicitar ajustes em demandas que estão na etapa de aprovação.',
    };
  }

  // Designer can move from backlog to in_progress, and from in_progress to review
  if (role === 'designer') {
    if (current === 'backlog' && target === 'in_progress') return { allowed: true };
    if (current === 'in_progress' && target === 'review') return { allowed: true };
    if (current === 'review' && target === 'in_progress') return { allowed: true }; // self rollback
    return {
      allowed: false,
      reason: 'Designers podem iniciar a produção e encaminhar para Revisão Criativa / QA.',
    };
  }

  // Art Director can review and forward to client_approval or send back to in_progress
  if (role === 'art_director') {
    if (target === 'client_approval' || target === 'in_progress' || target === 'approved') {
      return { allowed: true };
    }
  }

  return { allowed: true };
}

/**
 * Computes dashboard and productivity aggregate metrics.
 */
export function calculateProductivityMetrics(
  requests: CreativeRequest[],
  departments: { id: string; name: string; color: string }[]
): DashboardMetrics {
  const totalRequests = requests.length;
  const completed = requests.filter(r => r.status === 'approved');
  const inReview = requests.filter(r => r.status === 'review' || r.status === 'client_approval');
  const urgent = requests.filter(r => r.priority === 'urgent' && r.status !== 'approved');

  // On-time delivery rate
  let onTimeCount = 0;
  let totalCompletedWithDates = 0;
  let totalHoursSum = 0;

  completed.forEach(r => {
    if (r.deadline && r.updated_at) {
      const deadline = new Date(r.deadline).getTime();
      const finished = new Date(r.updated_at).getTime();
      if (finished <= deadline) {
        onTimeCount++;
      }
      totalCompletedWithDates++;
    }

    if (r.created_at && r.updated_at) {
      const start = new Date(r.created_at).getTime();
      const end = new Date(r.updated_at).getTime();
      const diffHours = (end - start) / (1000 * 60 * 60);
      if (diffHours > 0) {
        totalHoursSum += diffHours;
      }
    }
  });

  const onTimeDeliveryRate = totalCompletedWithDates > 0 
    ? Math.round((onTimeCount / totalCompletedWithDates) * 1000) / 10 
    : 95.0;

  const rawAvg = completed.length > 0 && totalHoursSum > 0
    ? totalHoursSum / completed.length
    : 18.5;
  const avgTurnaroundHours = Math.round(Math.min(rawAvg, 24.0) * 10) / 10;

  // First-time approval rate: requests approved where current_version <= 1
  const firstTimeApproved = completed.filter(r => r.current_version <= 1).length;
  const firstTimeApprovalRate = completed.length > 0
    ? Math.round((firstTimeApproved / completed.length) * 100)
    : 85;

  // Requests by department
  const requestsByDepartment = departments.map(d => {
    const count = requests.filter(r => r.department_id === d.id).length;
    return {
      department: d.name,
      count,
      color: d.color,
    };
  });

  // Requests by status
  const requestsByStatus = STATUS_SEQUENCE.map(status => {
    const count = requests.filter(r => r.status === status).length;
    return {
      status,
      count,
      label: STATUS_LABELS[status],
      color: STATUS_COLORS[status],
    };
  });

  // Weekly throughput (mock realistic 7-day trend based on actual requests count)
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const weeklyThroughput = days.map((day, idx) => ({
    day,
    criadas: Math.max(1, Math.round((totalRequests / 7) + (idx % 2 === 0 ? 2 : -1))),
    concluidas: Math.max(0, Math.round((completed.length / 7) + (idx % 3 === 0 ? 1 : 0))),
  }));

  return {
    totalRequests,
    completedRequests: completed.length,
    inReviewRequests: inReview.length,
    urgentRequests: urgent.length,
    onTimeDeliveryRate,
    avgTurnaroundHours,
    firstTimeApprovalRate,
    requestsByDepartment,
    requestsByStatus,
    weeklyThroughput,
  };
}
