import React, { useState } from 'react';
import { CreativeRequest, Department, RequestStatus, UserProfile } from '../../types';
import { normalizeAssetFormat } from '../../constants/assetFormats';
import { STATUS_SEQUENCE, STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, canTransition } from '../../utils/workflow';
import { getSlaStatus } from '../../utils/sla';
import { Badge } from '../ui/Badge';
import { 
  ArrowRight, 
  ArrowLeft, 
  Upload,
  MessageSquare, 
  Clock,
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

interface KanbanViewProps {
  requests: CreativeRequest[];
  departments: Department[];
  currentUser: UserProfile;
  onSelectRequest: (id: string) => void;
  onUpdateStatus: (id: string, status: RequestStatus) => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  requests,
  departments,
  currentUser,
  onSelectRequest,
  onUpdateStatus,
}) => {
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const filteredRequests = requests.filter(r => {
    if (filterDept !== 'all' && r.department_id !== filterDept) return false;
    if (filterPriority !== 'all' && r.priority !== filterPriority) return false;
    return true;
  });

  const handleMove = (req: CreativeRequest, direction: 'forward' | 'backward', e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = STATUS_SEQUENCE.indexOf(req.status);
    const targetIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;

    if (targetIndex < 0 || targetIndex >= STATUS_SEQUENCE.length) return;

    const targetStatus = STATUS_SEQUENCE[targetIndex];
    const check = canTransition(req.status, targetStatus, currentUser.role);

    if (!check.allowed) {
      alert(check.reason || 'Movimentação não permitida pelas regras da esteira.');
      return;
    }

    onUpdateStatus(req.id, targetStatus);
  };

  return (
    <div className="space-y-4">
      {/* Kanban Header & Filters */}
      <div className="bg-white dark:bg-[#0E172E] rounded-xl p-4 border border-slate-200 dark:border-[#1F3057] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Filtrar Quadro:</span>

          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="text-xs px-3 py-1.5 bg-slate-50 dark:bg-[#131F3D] border border-slate-200 dark:border-[#1F3057] rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#083181]/30 focus:border-[#083181]"
          >
            <option value="all">Todos Departamentos</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="text-xs px-3 py-1.5 bg-slate-50 dark:bg-[#131F3D] border border-slate-200 dark:border-[#1F3057] rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#083181]/30 focus:border-[#083181]"
          >
            <option value="all">Todas Prioridades</option>
            <option value="urgent">Urgente</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>
        </div>

      </div>

      {/* Kanban Board Horizontal Scroll */}
      <div className="grid auto-cols-[minmax(260px,85vw)] grid-flow-col items-start gap-3 overflow-x-auto pb-4 md:auto-cols-auto md:grid-flow-row md:grid-cols-3 md:gap-4 lg:grid-cols-5">
        {STATUS_SEQUENCE.map((colStatus, colIndex) => {
          const colRequests = filteredRequests.filter(r => r.status === colStatus);
          const colColor = STATUS_COLORS[colStatus];

          return (
            <div
              key={colStatus}
              className="bg-slate-100/70 dark:bg-[#0E172E]/70 rounded-xl p-3 border border-slate-200 dark:border-[#1F3057] flex flex-col min-h-[500px]"
            >
              {/* Column Title */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200 dark:border-[#1F3057]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colColor }} />
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                    {STATUS_LABELS[colStatus]}
                  </h3>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-[#131F3D] text-slate-600 dark:text-slate-300 shadow-2xs">
                  {colRequests.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colRequests.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-center p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-[11px] text-slate-400">
                    Nenhuma tarefa nesta etapa
                  </div>
                ) : (
                  colRequests.map((req) => {
                    const sla = getSlaStatus(req.deadline, req.status === 'approved');
                    const dept = departments.find(d => d.id === req.department_id);
                    const pColors = PRIORITY_COLORS[req.priority];

                    return (
                      <div
                        key={req.id}
                        onClick={() => onSelectRequest(req.id)}
                        className="bg-white dark:bg-[#131F3D] rounded-lg p-3.5 border border-slate-200 dark:border-[#1F3057] shadow-xs hover:border-[#083181] dark:hover:border-blue-400 hover:shadow-md transition-all cursor-pointer space-y-2.5 group relative"
                      >
                        {/* Top Meta */}
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {req.code}
                          </span>
                          <span
                            className="font-bold text-[10px] px-1.5 py-0.2 rounded border"
                            style={{ backgroundColor: pColors.bg, color: pColors.text, borderColor: pColors.border }}
                          >
                            {PRIORITY_LABELS[req.priority]}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#083181] dark:group-hover:text-blue-300 transition-colors line-clamp-2">
                          {req.title}
                        </h4>

                        {/* Department & Format Tag */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                          <span 
                            className="inline-block px-1.5 py-0.5 rounded text-white font-medium"
                            style={{ backgroundColor: dept?.color || '#083181' }}
                          >
                            {dept?.code || 'BV'}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium">
                            {normalizeAssetFormat(req.format)}
                          </span>
                        </div>

                        {/* SLA Indicator */}
                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                          <Badge 
                            variant={sla.status === 'overdue' ? 'danger' : sla.status === 'critical' ? 'warning' : 'neutral'} 
                            size="sm"
                            dot
                          >
                            {sla.label}
                          </Badge>

                          <div className="flex items-center gap-2 text-slate-400">
                            {req.comments.length > 0 && (
                              <span className="flex items-center gap-0.5">
                                <MessageSquare className="w-3 h-3" /> {req.comments.length}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom Footer: Execution owner & Action Arrows */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[9px] text-slate-700 dark:text-slate-300">
                              {req.assignee_name ? req.assignee_name.charAt(0) : '?'}
                            </div>
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate max-w-[80px]">
                              {req.assignee_name || 'Sem responsável'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {colIndex > 0 && (
                              <button
                                onClick={(e) => handleMove(req, 'backward', e)}
                                title="Voltar etapa"
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {colIndex < STATUS_SEQUENCE.length - 1 && (
                              <button
                                onClick={(e) => handleMove(req, 'forward', e)}
                                title="Avançar etapa"
                                className="p-1 text-[#083181] dark:text-blue-300 hover:bg-[#083181]/10 rounded transition-colors"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
