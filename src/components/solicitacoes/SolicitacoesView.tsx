import React, { useState } from 'react';
import { CreativeRequest, Department, RequestPriority, RequestStatus, AssetFormat } from '../../types';
import { getSlaStatus } from '../../utils/sla';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '../../utils/workflow';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { 
  Filter, 
  Search, 
  Plus, 
  ArrowUpDown, 
  Eye, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Layers
} from 'lucide-react';

interface SolicitacoesViewProps {
  requests: CreativeRequest[];
  departments: Department[];
  onSelectRequest: (id: string) => void;
  onOpenNewRequest: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const SolicitacoesView: React.FC<SolicitacoesViewProps> = ({
  requests,
  departments,
  onSelectRequest,
  onOpenNewRequest,
  searchQuery,
  onSearchChange,
}) => {
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  const filteredRequests = requests.filter((req) => {
    // Search match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = req.code.toLowerCase().includes(q);
      const matchTitle = req.title.toLowerCase().includes(q);
      const matchDesc = req.description.toLowerCase().includes(q);
      const matchTags = req.tags.some(t => t.toLowerCase().includes(q));
      if (!matchCode && !matchTitle && !matchDesc && !matchTags) return false;
    }

    // Department match
    if (selectedDept !== 'all' && req.department_id !== selectedDept) {
      return false;
    }

    // Status match
    if (selectedStatus !== 'all' && req.status !== selectedStatus) {
      return false;
    }

    // Priority match
    if (selectedPriority !== 'all' && req.priority !== selectedPriority) {
      return false;
    }

    return true;
  });

  const getFormatLabel = (fmt: AssetFormat) => {
    switch (fmt) {
      case 'social_feed': return 'Feed Instagram';
      case 'social_stories': return 'Stories/Reels';
      case 'carrossel': return 'Carrossel';
      case 'banner_web': return 'Banner Display';
      case 'motion': return 'Motion Vídeo';
      case 'landing_page': return 'Landing Page';
      case 'ooh_print': return 'OOH / Print';
      case 'ebook': return 'E-book PDF';
      case 'branding': return 'Branding';
      default: return fmt;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="bg-white dark:bg-[#0E172E] rounded-xl p-4 border border-slate-200 dark:border-[#1F3057] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
            <Filter className="w-3.5 h-3.5" />
            Filtros:
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs px-3 py-1.5 bg-slate-50 dark:bg-[#131F3D] border border-slate-200 dark:border-[#1F3057] rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#083181]/30 focus:border-[#083181]"
          >
            <option value="all">Todos Departamentos ({departments.length})</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs px-3 py-1.5 bg-slate-50 dark:bg-[#131F3D] border border-slate-200 dark:border-[#1F3057] rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#083181]/30 focus:border-[#083181]"
          >
            <option value="all">Todos os Status</option>
            <option value="backlog">Triagem / Backlog</option>
            <option value="in_progress">Em Produção</option>
            <option value="review">Revisão Criativa / QA</option>
            <option value="client_approval">Aprovação do Solicitante</option>
            <option value="approved">Concluído & Aprovado</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="text-xs px-3 py-1.5 bg-slate-50 dark:bg-[#131F3D] border border-slate-200 dark:border-[#1F3057] rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#083181]/30 focus:border-[#083181]"
          >
            <option value="all">Todas as Prioridades</option>
            <option value="urgent">Urgente / Crítica</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>

          {(selectedDept !== 'all' || selectedStatus !== 'all' || selectedPriority !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedDept('all');
                setSelectedStatus('all');
                setSelectedPriority('all');
                onSearchChange('');
              }}
              className="text-xs text-[#083181] dark:text-blue-300 hover:underline font-semibold ml-1"
            >
              Limpar filtros
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Mostrando <strong>{filteredRequests.length}</strong> de {requests.length}
          </span>
          <Button variant="primary" size="sm" onClick={onOpenNewRequest} icon={<Plus className="w-3.5 h-3.5" />}>
            Nova
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-[#0E172E] rounded-xl border border-slate-200 dark:border-[#1F3057] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-[#131F3D] border-b border-slate-200 dark:border-[#1F3057] text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Demanda & Briefing</th>
                <th className="py-3 px-4">Departamento</th>
                <th className="py-3 px-4">Formato</th>
                <th className="py-3 px-4">Responsável</th>
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
                  const sla = getSlaStatus(req.deadline, req.status === 'approved');
                  const dept = departments.find(d => d.id === req.department_id);
                  const pColors = PRIORITY_COLORS[req.priority];

                  return (
                    <tr
                      key={req.id}
                      onClick={() => onSelectRequest(req.id)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {req.code}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold text-slate-900 dark:text-white group-hover:text-[#083181] dark:group-hover:text-blue-300 transition-colors truncate">
                          {req.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {req.description}
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
                          {dept?.name || 'Geral'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#131F3D] px-2 py-0.5 rounded">
                          {getFormatLabel(req.format)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-slate-300 shrink-0">
                            {req.assignee_name ? req.assignee_name.charAt(0) : '?'}
                          </div>
                          <span className="truncate max-w-[100px] text-[11px] text-slate-700 dark:text-slate-300">
                            {req.assignee_name || 'Aguardando'}
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
                          variant={sla.status === 'overdue' ? 'danger' : sla.status === 'critical' ? 'warning' : 'neutral'} 
                          size="sm" 
                          dot
                        >
                          {sla.label}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span 
                          className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: STATUS_COLORS[req.status] }}
                        >
                          {STATUS_LABELS[req.status]}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRequest(req.id);
                          }}
                        >
                          Ver
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
