import React from 'react';
import { 
  CreativeRequest, 
  Department, 
  UserProfile 
} from '../../types';
import { calculateProductivityMetrics, STATUS_LABELS, STATUS_COLORS } from '../../utils/workflow';
import { getSlaStatus } from '../../utils/sla';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  TrendingUp, 
  ArrowUpRight, 
  ChevronRight,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  CartesianGrid,
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface DashboardViewProps {
  requests: CreativeRequest[];
  departments: Department[];
  currentUser: UserProfile;
  onSelectRequest: (id: string) => void;
  onNavigateToTab: (tab: 'solicitacoes' | 'kanban' | 'aprovacoes' | 'relatorios') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  requests,
  departments,
  currentUser,
  onSelectRequest,
  onNavigateToTab,
}) => {
  const metrics = calculateProductivityMetrics(
    requests,
    departments.map(d => ({ id: d.id, name: d.name, color: d.color }))
  );

  const pendingApprovals = requests.filter(r => r.status === 'client_approval');
  const criticalSlaRequests = requests
    .filter(r => r.status !== 'approved')
    .map(r => ({ request: r, sla: getSlaStatus(r.deadline, false) }))
    .filter(item => item.sla.status === 'critical' || item.sla.status === 'overdue')
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Welcome Banner - Azul #083181 conforme identidade visual BV */}
      <div className="bg-[#083181] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-[#083181]">
        {/* Decorative subtle brand accents in Laranja #c56a2d and Verde #a0b900 */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(197,106,45,0.25),transparent_70%)] pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-44 h-44 bg-[#a0b900]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 p-2 shrink-0 flex items-center justify-center shadow-md backdrop-blur-xs">
              <img
                src="/assets/aistudio/Logo_plano_BV_PNG_f061e8a5.png"
                alt="Logo Grupo BV"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/15 text-[#e8dda5] border border-[#e8dda5]/30 backdrop-blur-xs">
                  Hub Criativo Grupo BV
                </span>
                <span className="text-xs text-white/70">Atualizado em tempo real</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Olá, {currentUser.name}! 👋
              </h2>
              <p className="text-xs text-white/90 mt-1 max-w-xl">
                Central de operações do departamento criativo. Existem <strong className="text-[#e8dda5] font-semibold">{pendingApprovals.length} demandas</strong> aguardando aprovação e <strong className="text-[#e8dda5] font-semibold">{criticalSlaRequests.length} com prazo crítico</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToTab('kanban')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/25 backdrop-blur-xs"
            >
              Ver Kanban
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Demandas */}
        <div className="bg-white dark:bg-[#0E172E] rounded-xl p-5 border border-slate-300/80 dark:border-[#1F3057] shadow-sm hover:border-slate-400 dark:hover:border-slate-600 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Demandas Ativas</span>
            <div className="p-2 bg-blue-50 dark:bg-[#083181]/20 rounded-lg text-[#083181] dark:text-blue-300">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{metrics.totalRequests}</span>
            <span className="text-xs font-medium text-[#6b7b00] dark:text-[#a0b900] flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +12% no mês
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {metrics.completedRequests} concluídas no ciclo atual
          </p>
        </div>

        {/* Card 2: Prazos Críticos / Em Risco */}
        <div className="bg-white dark:bg-[#0E172E] rounded-xl p-5 border border-slate-300/80 dark:border-[#1F3057] shadow-sm hover:border-slate-400 dark:hover:border-slate-600 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Prazos em Risco</span>
            <div className="p-2 bg-orange-50 dark:bg-[#c56a2d]/20 rounded-lg text-[#c56a2d]">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#c56a2d]">{criticalSlaRequests.length}</span>
            <span className="text-xs text-slate-400">demandas com &lt; 24h</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Requerem priorização imediata
          </p>
        </div>

        {/* Card 3: Em Aprovação */}
        <div 
          onClick={() => onNavigateToTab('aprovacoes')}
          className="bg-white dark:bg-[#0E172E] rounded-xl p-5 border border-slate-300/80 dark:border-[#1F3057] shadow-sm hover:border-[#083181] dark:hover:border-blue-400 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Em Aprovação</span>
            <div className="p-2 bg-blue-50 dark:bg-[#083181]/25 rounded-lg text-[#083181] dark:text-blue-300 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{metrics.inReviewRequests}</span>
            <span className="text-xs font-semibold text-[#083181] dark:text-blue-300 flex items-center group-hover:underline">
              Avaliar <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Aguardando feedback formal
          </p>
        </div>

        {/* Card 4: Taxa de Aprovação de Primeira */}
        <div className="bg-white dark:bg-[#0E172E] rounded-xl p-5 border border-slate-300/80 dark:border-[#1F3057] shadow-sm hover:border-slate-400 dark:hover:border-slate-600 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aprovação 1ª Versão</span>
            <div className="p-2 bg-emerald-50 dark:bg-[#a0b900]/20 rounded-lg text-[#6b7b00] dark:text-[#a0b900]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{metrics.firstTimeApprovalRate}%</span>
            <span className="text-xs font-medium text-[#6b7b00] dark:text-[#a0b900]">Meta: 80%</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Tempo médio de entrega: {metrics.avgTurnaroundHours}h
          </p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Chart: Demandas por Departamento */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0E172E] rounded-xl p-5 border border-slate-300/80 dark:border-[#1F3057] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Volume por Departamento Solicitante</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Distribuição das demandas ativas do Grupo BV</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">Total: {requests.length}</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.requestsByDepartment} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis dataKey="department" type="category" width={180} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#083181', borderRadius: '8px', border: '1px solid #1F3057', color: '#fff', fontSize: '12px' }}
                  cursor={{ fill: 'rgba(8, 49, 129, 0.08)' }}
                />
                <Bar dataKey="count" name="Demandas" radius={[0, 4, 4, 0]}>
                  {metrics.requestsByDepartment.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#083181'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Chart: Pipeline por Status */}
        <div className="bg-white dark:bg-[#0E172E] rounded-xl p-5 border border-slate-300/80 dark:border-[#1F3057] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Funil de Produção</h3>
              <button 
                onClick={() => onNavigateToTab('kanban')} 
                className="text-xs text-[#083181] dark:text-blue-300 hover:underline font-semibold"
              >
                Abrir Kanban
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Etapas da esteira de design</p>

            <div className="space-y-3">
              {metrics.requestsByStatus.map((item) => {
                const percentage = requests.length > 0 ? Math.round((item.count / requests.length) * 100) : 0;
                return (
                  <div key={item.status} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.label}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">{item.count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-[#19274A] h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%`, backgroundColor: item.color }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Taxa de SLA Cumprido</span>
            <span className="font-bold text-[#6b7b00] dark:text-[#a0b900]">{metrics.onTimeDeliveryRate}%</span>
          </div>
        </div>
      </div>

      {/* Critical SLA & Urgent Demands Banner */}
      {criticalSlaRequests.length > 0 && (
        <div className="bg-white dark:bg-[#0E172E] rounded-xl border border-amber-200 dark:border-amber-900/60 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-amber-50/60 dark:bg-amber-950/30 border-b border-amber-200/80 dark:border-amber-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
              <AlertCircle className="w-4 h-4 text-[#c56a2d]" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Demandas com SLA em Atenção / Crítico</h3>
            </div>
            <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">{criticalSlaRequests.length} solicitações</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {criticalSlaRequests.map(({ request, sla }) => (
              <div 
                key={request.id} 
                onClick={() => onSelectRequest(request.id)}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-[#131F3D] text-slate-700 dark:text-slate-300 rounded-md">
                    {request.code}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white hover:text-[#083181] dark:hover:text-blue-300 transition-colors">
                      {request.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Solicitante: {request.requester_name} • Responsável pela execução: {request.assignee_name || 'Aguardando alocação'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={sla.status === 'overdue' ? 'danger' : 'warning'} dot>
                    {sla.label}
                  </Badge>
                  <Button variant="ghost" size="sm" icon={<ChevronRight className="w-4 h-4" />}>
                    Detalhes
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
