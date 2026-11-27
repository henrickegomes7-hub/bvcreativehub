import { getRequestSla, getSlaStatus } from './sla.js';
import type { ApprovalDecision, RequestStatus, RequestPriority, UserRole, CreativeRequest, DashboardMetrics } from '../types';

export const APPROVAL_LABELS: Record<ApprovalDecision, string> = {
  approved: 'Aprovado sem ressalvas',
  approved_with_notes: 'Aprovado com ressalvas',
  changes_requested: 'Ajustes solicitados',
};

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
  departments: { id: string; name: string; color: string }[],
  now = new Date(),
): DashboardMetrics {
  const totalRequests = requests.length;
  const completed = requests.filter(r => r.status === 'approved');
  const active = requests.filter(r => r.status !== 'approved' && !r.archived_at);
  const inReview = active.filter(r => r.status === 'review' || r.status === 'client_approval');
  const urgent = requests.filter(r => r.priority === 'urgent' && r.status !== 'approved');

  const measuredDeliveries = completed.map(r => getRequestSla(r)).filter(sla => sla.status === 'delivered');
  const onTimeCount = measuredDeliveries.filter(sla => !sla.isOverdue).length;
  const onTimeDeliveryRate = measuredDeliveries.length
    ? Math.round(1000 * onTimeCount / measuredDeliveries.length) / 10
    : null;

  const durations = completed.map(r => Date.parse(r.completed_at ?? '') - Date.parse(r.created_at))
    .filter(ms => Number.isFinite(ms) && ms >= 0);
  const avgTurnaroundHours = durations.length
    ? Math.round(durations.reduce((sum, ms) => sum + ms, 0) / durations.length / 3_600_000 * 10) / 10
    : null;

  const reviewed = completed.filter(r => r.current_version > 0 || r.has_review || r.approvals?.length);
  const firstTimeApproved = reviewed.filter(r => (r.first_time_approved ?? r.current_version <= 1)
    && !r.approvals?.some(a => a.decision === 'changes_requested')).length;
  const firstTimeApprovalRate = reviewed.length ? Math.round(100 * firstTimeApproved / reviewed.length) : null;

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

  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const byDate = new Map<string, DashboardMetrics['weeklyThroughput'][number]>();
  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date(now);
    date.setDate(date.getDate() - offset);
    byDate.set(date.toDateString(), { day: days[date.getDay()], criadas: 0, concluidas: 0 });
  }
  for (const request of requests) {
    const created = byDate.get(new Date(request.created_at).toDateString());
    if (created) created.criadas++;
    if (request.status === 'approved' && request.completed_at) {
      const finished = byDate.get(new Date(request.completed_at).toDateString());
      if (finished) finished.concluidas++;
    }
  }
  const weeklyThroughput = [...byDate.values()];
  const byAssignee = new Map<string, {name:string;concluidas:number;emAndamento:number}>();
  for (const request of requests) {
    if (!request.assignee_id || !request.assignee_name) continue;
    const stats = byAssignee.get(request.assignee_id) ?? {name:request.assignee_name,concluidas:0,emAndamento:0};
    if (request.status === 'approved') stats.concluidas++;
    else stats.emAndamento++;
    byAssignee.set(request.assignee_id,stats);
  }

  return {
    totalRequests,
    completedRequests: completed.length,
    inReviewRequests: inReview.length,
    urgentRequests: urgent.length,
    criticalDeadlineRequests: active.filter(r => ['critical', 'overdue'].includes(getSlaStatus(r.deadline, false, now).status)).length,
    unassignedRequests: active.filter(r => !r.assignee_id).length,
    onTimeDeliveryRate,
    avgTurnaroundHours,
    firstTimeApprovalRate,
    requestsByDepartment,
    requestsByStatus,
    requestsByAssignee: [...byAssignee.values()],
    weeklyThroughput,
  };
}

export function formatMetric(value: number | null, unit: '%' | 'h'): string {
  return value === null ? 'Sem dados' : `${value.toLocaleString('pt-BR')}${unit}`;
}
