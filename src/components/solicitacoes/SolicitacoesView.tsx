import React, { useState } from 'react';
import { CreativeRequest, Department, RequestPriority, RequestStatus, AssetFormat } from '../../types';
import { normalizeAssetFormat } from '../../constants/assetFormats';
import { getRequestSla } from '../../utils/sla';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '../../utils/workflow';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { 
  Filter, 
  Search, 
  ArrowUpDown, 
  Eye, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Layers
} from 'lucide-react';

interface SolicitacoesViewProps {
  filters: Record<string,string>;
  onFiltersChange: (filters: Record<string,string>)=>void;
  requests: CreativeRequest[];
  total: number;
  departments: Department[];
  currentUserId: string;
  isAdmin: boolean;
  canCreate: boolean;
  onSelectRequest: (id: string, showApproval?: boolean) => void;
  onEditRequest: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  onOpenNewRequest: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const filterLabelClass = 'grid min-w-0 gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200';
const filterFieldClass = 'hub-field block h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-[#1F3057] dark:bg-[#131F3D] dark:text-slate-100';

const nextStepByStatus: Record<RequestStatus, string> = {
  backlog: 'Aguardando triagem da equipe criativa',
  in_progress: 'A equipe criativa está produzindo a peça',
  review: 'A peça está em revisão criativa',
  client_approval: 'Aguardando parecer de aprovação',
  approved: 'Aprovada e concluída',
};

function requestProgress(request: CreativeRequest) {
  if (request.archived_at) return 'Solicitação arquivada';
  if (request.adjustments_requested) return 'Ajustes solicitados · Ver parecer';
  return nextStepByStatus[request.status];
}

export const SolicitacoesView: React.FC<SolicitacoesViewProps> = ({
  filters,
  onFiltersChange,
  requests,
  total,
  departments,
  currentUserId,
  isAdmin,
  canCreate,
  onSelectRequest,
  onEditRequest,
  onDeleteRequest,
  onOpenNewRequest,
  searchQuery,
  onSearchChange,
}) => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterCount = Object.entries(filters).filter(([key, value]) => value && value !== 'all' && (key !== 'archived' || value === 'true')).length;
  const dateValue = (key: 'from' | 'to') => filters[key] ? new Date(filters[key]).toLocaleDateString('sv-SE') : '';
  const setDate = (key: 'from' | 'to', value: string) => onFiltersChange({
    ...filters, [key]: value ? new Date(value + (key === 'from' ? 'T00:00:00' : 'T23:59:59.999')).toISOString() : '',
  });
  const selectedDept = filters.department_id ?? 'all';
  const selectedStatus = filters.status ?? 'all';
  const selectedPriority = filters.priority ?? 'all';
  const filteredRequests = requests;
  const getFormatLabel = (fmt: AssetFormat) => {
    return normalizeAssetFormat(fmt);
  };

  const canManageRequest = (request: CreativeRequest) =>
    !isAdmin && request.requester_id === currentUserId && request.status !== 'approved' && !request.archived_at;
  const openRequest = (request: CreativeRequest) =>
    onSelectRequest(request.id, Boolean(request.adjustments_requested && !request.archived_at));

  return (
    <div className="space-y-4">
      <section aria-label="Filtros e ações de solicitações" className="hub-panel space-y-4 rounded-xl border border-slate-300/80 bg-white p-4 shadow-sm dark:border-[#1F3057] dark:bg-[#0E172E]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" className="min-h-11 md:hidden"
              icon={<Filter aria-hidden="true" className="size-4" />} aria-expanded={filtersOpen}
              aria-controls="request-filters" onClick={() => setFiltersOpen(open => !open)}>
              Filtros{filterCount > 0 && ` (${filterCount})`}
            </Button>
            <span className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-300" role="status">
              Mostrando <strong>{filteredRequests.length}</strong> de {total}
            </span>
          </div>
          {canCreate && (
            <Button type="button" variant="primary" className="min-h-11 shrink-0 whitespace-nowrap" onClick={onOpenNewRequest}>
              Nova solicitação
            </Button>
          )}
        </div>

        <div id="request-filters" className={`${filtersOpen ? 'grid' : 'hidden'} grid-cols-1 gap-3 border-t border-slate-200 pt-4 dark:border-slate-700 sm:grid-cols-2 md:grid md:grid-cols-3 xl:grid-cols-5`}>
          <label className={filterLabelClass}>
            Departamento
            <select aria-label="Departamento" value={selectedDept} onChange={e => onFiltersChange({...filters, department_id: e.target.value})} className={filterFieldClass}>
              <option value="all">Todos os departamentos</option>
              {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </label>
          <label className={filterLabelClass}>
            Status
            <select aria-label="Status" value={selectedStatus} onChange={e => onFiltersChange({...filters, status: e.target.value})} className={filterFieldClass}>
              <option value="all">Todos os status</option>
              {Object.entries(STATUS_LABELS).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
            </select>
          </label>
          <label className={filterLabelClass}>
            Prioridade
            <select aria-label="Prioridade" value={selectedPriority} onChange={e => onFiltersChange({...filters, priority: e.target.value})} className={filterFieldClass}>
              <option value="all">Todas as prioridades</option>
              {Object.entries(PRIORITY_LABELS).map(([priority, label]) => <option key={priority} value={priority}>{label}</option>)}
            </select>
          </label>
          <label className={filterLabelClass}>
            Desde
            <input type="date" value={dateValue('from')} onChange={e => setDate('from', e.target.value)} className={`m-0! ${filterFieldClass}`} />
          </label>
          <label className={filterLabelClass}>
            Até
            <input type="date" value={dateValue('to')} onChange={e => setDate('to', e.target.value)} className={`m-0! ${filterFieldClass}`} />
          </label>
          <div className="col-span-full flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex min-h-9 items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={filters.archived === 'true'}
                onChange={e => onFiltersChange({...filters, archived: e.target.checked ? 'true' : ''})} />
              Incluir arquivadas
            </label>
            {(filterCount > 0 || searchQuery) && (
              <Button type="button" variant="ghost" size="sm" className="min-h-9" onClick={() => {
                onFiltersChange({});
                onSearchChange('');
              }}>Limpar tudo</Button>
            )}
          </div>
        </div>
      </section>

      {/* Table Container */}
      <div className="hidden overflow-hidden hub-panel rounded-xl border border-slate-300/80 bg-white shadow-sm dark:border-[#1F3057] dark:bg-[#0E172E] md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-[88px]" />
              <col className="w-[235px]" />
              <col className="w-[132px]" />
              <col className="w-[175px]" />
              <col className="w-[150px]" />
              <col className="w-[105px]" />
              <col className="w-[145px]" />
              <col className="w-[140px]" />
              <col className="w-[110px]" />
            </colgroup>
            <thead>
              <tr className="bg-slate-100/90 dark:bg-[#131F3D] border-b border-slate-200 dark:border-[#1F3057] text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Demanda & Briefing</th>
                <th className="py-3 px-4">Departamento</th>
                <th className="py-3 px-4">Formato</th>
                <th className="py-3 px-4">Responsável pela execução</th>
                <th className="py-3 px-4">Prioridade</th>
                <th className="py-3 px-4">SLA / Prazo</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Nenhuma demanda encontrada.</p>
                    <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros ou cadastrar uma nova solicitação.</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const sla = getRequestSla(req);
                  const dept = departments.find(d => d.id === req.department_id);
                  const pColors = PRIORITY_COLORS[req.priority];

                  return (
                    <tr
                      key={req.id}
                      onClick={() => openRequest(req)}
                      className="hover:bg-blue-50/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {req.code}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold text-slate-900 dark:text-white group-hover:text-[#083181] dark:group-hover:text-blue-300 transition-colors truncate">
                          {req.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {requestProgress(req)}
                        </p>
                        <div className="flex gap-1 mt-1">
                          {req.tags.slice(0, 2).map((t, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.2 bg-slate-100 dark:bg-[#131F3D] text-slate-600 dark:text-slate-300 rounded">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span 
                            className="w-2 h-2 rounded-full shrink-0" 
                            style={{ backgroundColor: dept?.color || '#083181' }} 
                          />
                          <span className="truncate">{dept?.name || 'Geral'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block max-w-full rounded bg-slate-100 px-2 py-1 text-[11px] font-medium leading-snug text-slate-700 dark:bg-[#131F3D] dark:text-slate-300">
                          {getFormatLabel(req.format)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-slate-300 shrink-0">
                            {req.assignee_name ? req.assignee_name.charAt(0) : '?'}
                          </div>
                          <span className="truncate max-w-[100px] text-[11px] text-slate-700 dark:text-slate-300">
                            {req.assignee_name || 'Aguardando alocação'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span 
                          className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded border"
                          style={{ backgroundColor: pColors.bg, color: pColors.text, borderColor: pColors.border }}
                        >
                          {PRIORITY_LABELS[req.priority]}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge 
                          variant={sla.isOverdue ? 'danger' : sla.status === 'critical' ? 'warning' : 'neutral'}
                          size="sm" 
                          dot
                        >
                          {sla.label}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span 
                          className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: STATUS_COLORS[req.status], color:req.status==='approved'?'#14213D':undefined }}
                        >
                          {STATUS_LABELS[req.status]}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Eye className="w-3.5 h-3.5" />}
                            onClick={(e) => {
                              e.stopPropagation();
                              openRequest(req);
                            }}
                          >
                            Ver
                          </Button>
                          {canManageRequest(req) && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditRequest(req.id);
                                }}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteRequest(req.id);
                                }}
                              >
                                Excluir
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {filteredRequests.length === 0 ? (
          <div className="hub-panel rounded-xl border border-slate-300/80 bg-white p-8 text-center text-slate-400 shadow-sm dark:border-[#1F3057] dark:bg-[#0E172E]">
            <Layers className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Nenhuma demanda encontrada.</p>
            <p className="mt-1 text-xs">Ajuste os filtros ou cadastre uma nova solicitação.</p>
          </div>
        ) : filteredRequests.map((req) => {
          const sla = getRequestSla(req);
          const dept = departments.find((d) => d.id === req.department_id);

          return (
            <div
              key={req.id}
              className="w-full hub-panel rounded-xl border border-slate-300/80 bg-white p-4 text-left shadow-sm transition-colors hover:border-[#083181]/40 dark:border-[#1F3057] dark:bg-[#0E172E]"
            >
              <button
                type="button"
                onClick={() => openRequest(req)}
                className="w-full text-left"
              >
                <h3 className="break-words text-base font-bold text-slate-900 dark:text-white">{req.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: STATUS_COLORS[req.status], color: req.status === 'approved' ? '#14213D' : undefined }}>
                    {STATUS_LABELS[req.status]}
                  </span>
                  {req.status !== 'approved' && <Badge variant={sla.isOverdue ? 'danger' : sla.status === 'critical' ? 'warning' : 'neutral'} size="sm" dot>
                    {sla.label}
                  </Badge>}
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{requestProgress(req)}</p>
                {req.deadline && <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Prazo: {new Date(req.deadline).toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'})}
                </p>}
                <p className="mt-3 break-words border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  {req.code} · {dept?.name || 'Geral'} · {req.assignee_name || 'Aguardando responsável'}
                </p>
              </button>
              {canManageRequest(req) && (
                <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <Button variant="outline" size="sm" className="min-h-11" onClick={() => onEditRequest(req.id)}>
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" className="min-h-11" onClick={() => onDeleteRequest(req.id)}>
                    Excluir
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
