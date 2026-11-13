import React from 'react';
import { CalendarDays, CheckCircle2, Clock3, FileText, Plus, ArrowRight } from 'lucide-react';
import { CreativeRequest, UserProfile } from '../../types';
import { STATUS_COLORS, STATUS_LABELS } from '../../utils/workflow';
import { getSlaStatus } from '../../utils/sla';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface CollaboratorDashboardViewProps {
  requests: CreativeRequest[];
  currentUser: UserProfile;
  onSelectRequest: (id: string) => void;
  onNavigateToRequests: () => void;
  onOpenNewRequest: () => void;
}

export const CollaboratorDashboardView: React.FC<CollaboratorDashboardViewProps> = ({
  requests,
  currentUser,
  onSelectRequest,
  onNavigateToRequests,
  onOpenNewRequest,
}) => {
  const myRequests = requests.filter((request) => request.requester_id === currentUser.id);
  const activeRequests = myRequests.filter((request) => request.status !== 'approved');
  const inProgressCount = myRequests.filter((request) =>
    request.status === 'in_progress' || request.status === 'review'
  ).length;
  const awaitingMyReviewCount = myRequests.filter((request) => request.status === 'client_approval').length;
  const completedCount = myRequests.filter((request) => request.status === 'approved').length;

  const upcomingRequests = [...activeRequests]
    .sort((left, right) => new Date(left.deadline).getTime() - new Date(right.deadline).getTime())
    .slice(0, 4);
  const recentRequests = [...myRequests]
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .slice(0, 5);

  const cards = [
    { label: 'Minhas solicitações', value: myRequests.length, icon: FileText, color: '#083181' },
    { label: 'Em andamento', value: inProgressCount, icon: Clock3, color: '#c56a2d' },
    { label: 'Aguardando minha aprovação', value: awaitingMyReviewCount, icon: CheckCircle2, color: '#7C3AED' },
    { label: 'Concluídas', value: completedCount, icon: CheckCircle2, color: '#6b7b00' },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-[#083181] bg-[#083181] p-6 text-white shadow-xl">
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-[#a0b900]/20 blur-2xl" />
        <div className="relative z-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#e8dda5]">Meu espaço criativo</p>
            <h2 className="text-2xl font-bold tracking-tight">Olá, {currentUser.name}!</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/85">
              Acompanhe suas solicitações, prazos e aprovações em um só lugar.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenNewRequest}
            className="shrink-0 border border-white/20 !bg-white !text-[#083181] hover:!bg-slate-100"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Nova solicitação
          </Button>
        </div>
      </section>

      <section aria-label="Resumo das solicitações" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <button
            key={label}
            type="button"
            onClick={onNavigateToRequests}
            className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-xs transition-colors hover:border-[#083181] dark:border-[#1F3057] dark:bg-[#0E172E] dark:hover:border-blue-400"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
              <span className="rounded-lg bg-slate-100 p-2 dark:bg-[#131F3D]" style={{ color }}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
          </button>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-[#1F3057] dark:bg-[#0E172E]">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Próximos prazos</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Solicitações ainda não concluídas</p>
            </div>
            <CalendarDays className="h-4 w-4 text-[#083181] dark:text-blue-300" />
          </div>
          {upcomingRequests.length ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {upcomingRequests.map((request) => {
                const sla = getSlaStatus(request.deadline);
                return (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => onSelectRequest(request.id)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-slate-900 dark:text-white">{request.title}</span>
                      <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">
                        {request.code} · {new Date(request.deadline).toLocaleString('pt-BR')}
                      </span>
                    </span>
                    <Badge variant={sla.status === 'overdue' ? 'danger' : sla.status === 'critical' ? 'warning' : 'neutral'} dot>
                      {sla.label}
                    </Badge>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="px-5 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              Você não tem solicitações com prazo pendente.
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-[#1F3057] dark:bg-[#0E172E]">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Solicitações recentes</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Últimas atualizações do seu espaço</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onNavigateToRequests}>
              Ver todas <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
          {recentRequests.length ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentRequests.map((request) => (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => onSelectRequest(request.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-slate-900 dark:text-white">{request.title}</span>
                    <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">
                      {request.code} · {new Date(request.updated_at).toLocaleDateString('pt-BR')}
                    </span>
                  </span>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white"
                    style={{ backgroundColor: STATUS_COLORS[request.status] }}
                  >
                    {STATUS_LABELS[request.status]}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">Você ainda não criou uma solicitação.</p>
              <Button variant="outline" size="sm" onClick={onOpenNewRequest} className="mt-3">
                Criar solicitação
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
