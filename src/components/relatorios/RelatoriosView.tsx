import React from 'react';
import { CreativeRequest, Department, UserProfile } from '../../types';
import { calculateProductivityMetrics } from '../../utils/workflow';
import { Button } from '../ui/Button';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { BarChart3, Download, Printer, TrendingUp, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface RelatoriosViewProps {
  requests: CreativeRequest[];
  departments: Department[];
  users: UserProfile[];
}

export const RelatoriosView: React.FC<RelatoriosViewProps> = ({
  requests,
  departments,
  users,
}) => {
  const metrics = calculateProductivityMetrics(
    requests,
    departments.map((d) => ({ id: d.id, name: d.name, color: d.color }))
  );

  const designers = users.filter((u) => u.role === 'designer' || u.role === 'art_director');

  // Group by designer
  const designerStats = designers.map((d) => {
    const assigned = requests.filter((r) => r.assignee_id === d.id);
    const completed = assigned.filter((r) => r.status === 'approved');
    return {
      name: d.name,
      total: assigned.length,
      concluidas: completed.length,
      emAndamento: assigned.length - completed.length,
    };
  });

  const handleExportCsv = () => {
    const headers = ['Código', 'Título', 'Departamento', 'Solicitante', 'Designer', 'Prioridade', 'Status', 'SLA Estimado (h)', 'Versões'];
    const rows = requests.map(r => {
      const dept = departments.find(d => d.id === r.department_id)?.name || 'Geral';
      return [
        r.code,
        `"${r.title.replace(/"/g, '""')}"`,
        `"${dept}"`,
        `"${r.requester_name}"`,
        `"${r.assignee_name || 'Não alocado'}"`,
        r.priority,
        r.status,
        r.estimated_hours,
        r.current_version,
      ].join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_produtividade_bv_hub_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white dark:bg-[#0E172E] rounded-xl p-5 border border-slate-200 dark:border-[#1F3057] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-blue-50 dark:bg-[#083181]/30 text-[#083181] dark:text-blue-300 rounded-md">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Relatórios de Produtividade & SLAs do Departamento
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Métricas de desempenho operacional, tempo de ciclo e conformidade com os SLAs do Grupo BV.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            icon={<Printer className="w-3.5 h-3.5" />}
          >
            Imprimir Relatório
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCsv}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* 4 Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0E172E] p-4 rounded-xl border border-slate-200 dark:border-[#1F3057] shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cumprimento de SLA</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#6b7b00] dark:text-[#a0b900]">{metrics.onTimeDeliveryRate}%</span>
            <span className="text-xs font-semibold text-[#6b7b00] dark:text-[#a0b900]">Alta Eficiência</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-[#19274A] h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-[#a0b900] rounded-full" style={{ width: `${metrics.onTimeDeliveryRate}%` }} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#0E172E] p-4 rounded-xl border border-slate-200 dark:border-[#1F3057] shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tempo Médio de Ciclo</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.avgTurnaroundHours}h</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">do briefing ao OK</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Dentro da janela planejada de 24h</p>
        </div>

        <div className="bg-white dark:bg-[#0E172E] p-4 rounded-xl border border-slate-200 dark:border-[#1F3057] shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aprovação 1ª Versão</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#c56a2d]">{metrics.firstTimeApprovalRate}%</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">sem retrabalho</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Briefings bem especificados</p>
        </div>

        <div className="bg-white dark:bg-[#0E172E] p-4 rounded-xl border border-slate-200 dark:border-[#1F3057] shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total de Entregas</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.completedRequests}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">peças finalizadas</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">De {metrics.totalRequests} solicitadas</p>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Throughput */}
        <div className="bg-white dark:bg-[#0E172E] p-5 rounded-xl border border-slate-200 dark:border-[#1F3057] shadow-xs">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-1">
            Vazão Semanal da Equipe (Criadas x Concluídas)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Volume comparativo dia a dia</p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.weeklyThroughput} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip contentStyle={{ backgroundColor: '#083181', borderRadius: '8px', border: '1px solid #1F3057', color: '#fff', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="criadas" name="Novas Demandas" fill="#c56a2d" radius={[4, 4, 0, 0]} />
                <Bar dataKey="concluidas" name="Demandas Concluídas" fill="#a0b900" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Throughput by Designer */}
        <div className="bg-white dark:bg-[#0E172E] p-5 rounded-xl border border-slate-200 dark:border-[#1F3057] shadow-xs">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-1">
            Produtividade por Designer
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Demandas atribuídas e finalizadas</p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={designerStats} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip contentStyle={{ backgroundColor: '#083181', borderRadius: '8px', border: '1px solid #1F3057', color: '#fff', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="concluidas" name="Concluídas" fill="#a0b900" stackId="a" />
                <Bar dataKey="emAndamento" name="Em Andamento" fill="#083181" stackId="a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
