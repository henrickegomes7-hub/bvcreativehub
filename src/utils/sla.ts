export interface SlaInfo {
  hoursRemaining: number;
  status: 'overdue' | 'critical' | 'warning' | 'normal' | 'delivered';
  label: string;
  color: string;
  isOverdue: boolean;
}

/**
 * Calculates remaining SLA time and assigns risk level.
 * @param deadlineIso Deadline timestamp in ISO format
 * @param isCompleted Whether the request is marked completed/approved
 * @param now Reference timestamp (defaults to current time)
 */
export function getSlaStatus(
  deadlineIso: string,
  isCompleted: boolean = false,
  now: Date = new Date()
): SlaInfo {
  if (isCompleted) {
    return {
      hoursRemaining: 0,
      status: 'delivered',
      label: 'Entregue no Prazo',
      color: '#a0b900', // BV Verde
      isOverdue: false,
    };
  }

  const deadline = new Date(deadlineIso);
  const diffMs = deadline.getTime() - now.getTime();
  const hoursRemaining = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;

  if (hoursRemaining < 0) {
    const overdueHours = Math.abs(hoursRemaining);
    return {
      hoursRemaining,
      status: 'overdue',
      label: overdueHours >= 24 
        ? `Atrasado há ${Math.floor(overdueHours / 24)}d ${Math.round(overdueHours % 24)}h` 
        : `Atrasado há ${Math.round(overdueHours)}h`,
      color: '#DC2626', // Red
      isOverdue: true,
    };
  }

  if (hoursRemaining <= 12) {
    return {
      hoursRemaining,
      status: 'critical',
      label: `Crítico: ${hoursRemaining}h restantes`,
      color: '#EA580C', // Deep Orange
      isOverdue: false,
    };
  }

  if (hoursRemaining <= 36) {
    return {
      hoursRemaining,
      status: 'warning',
      label: `Atenção: ${Math.round(hoursRemaining)}h restantes`,
      color: '#c56a2d', // BV Accent Laranja
      isOverdue: false,
    };
  }

  const days = Math.floor(hoursRemaining / 24);
  return {
    hoursRemaining,
    status: 'normal',
    label: days > 0 ? `${days}d ${Math.round(hoursRemaining % 24)}h restantes` : `${Math.round(hoursRemaining)}h restantes`,
    color: '#083181', // BV Azul
    isOverdue: false,
  };
}

/**
 * Calculates turnaround time in decimal hours between creation and completion
 */
export function calculateTurnaroundHours(createdAtIso: string, completedAtIso: string): number {
  const start = new Date(createdAtIso).getTime();
  const end = new Date(completedAtIso).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return 0;
  return Math.round(((end - start) / (1000 * 60 * 60)) * 10) / 10;
}
