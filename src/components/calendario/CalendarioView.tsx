import React, { useState } from 'react';
import { CreativeRequest, Department } from '../../types';
import { STATUS_COLORS, STATUS_LABELS } from '../../utils/workflow';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Layers } from 'lucide-react';

interface CalendarioViewProps {
  requests: CreativeRequest[];
  departments: Department[];
  onSelectRequest: (id: string) => void;
  onOpenNewRequest: () => void;
}

export const CalendarioView: React.FC<CalendarioViewProps> = ({
  requests,
  departments,
  onSelectRequest,
  onOpenNewRequest,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Generate 28 calendar days starting from Monday of current week
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Group requests by date (day of current month)
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const mobileDeliveryDays = daysArray
    .map((day) => ({
      day,
      requests: requests.filter((request) => {
        if (!request.deadline) return false;
        const deadline = new Date(request.deadline);
        return deadline.getDate() === day
          && deadline.getMonth() === currentDate.getMonth()
          && deadline.getFullYear() === currentDate.getFullYear();
      }),
    }))
    .filter(({ requests: dayRequests }) => dayRequests.length > 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-[#0E172E] rounded-xl p-4 border border-slate-200 dark:border-[#1F3057] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-[#083181]/30 text-[#083181] dark:text-blue-300 rounded-lg">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight sm:text-base">
              <span className="sm:hidden">Calendário de Entregas</span>
              <span className="hidden sm:inline">Calendário Editorial & Cronograma de Entregas</span>
            </h2>
            <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
              Acompanhamento diário das datas de corte e prazos finais do departamento criativo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-[#131F3D]">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 dark:text-slate-200">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <Button variant="primary" size="sm" onClick={onOpenNewRequest}>
            Nova Demanda
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-[#1F3057] dark:bg-[#0E172E] sm:block">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-[#1F3057] bg-slate-50 dark:bg-[#131F3D] text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-2.5">
          <span>Dom</span>
          <span>Seg</span>
          <span>Ter</span>
          <span>Qua</span>
          <span>Qui</span>
          <span>Sex</span>
          <span>Sáb</span>
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800 min-h-[500px]">
          {daysArray.map((day) => {
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            // Find requests with deadlines matching this day
            const dayRequests = requests.filter((r) => {
              if (!r.deadline) return false;
              const rDate = new Date(r.deadline);
              return (
                rDate.getDate() === day &&
                rDate.getMonth() === currentDate.getMonth() &&
                rDate.getFullYear() === currentDate.getFullYear()
              );
            });

            const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth();

            return (
              <div
                key={day}
                className={`p-2 min-h-[110px] flex flex-col justify-between transition-colors ${
                  isToday ? 'bg-blue-50/30 dark:bg-[#083181]/15' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-[#083181] text-white shadow-xs'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {day}
                  </span>
                  {dayRequests.length > 0 && (
                    <span className="text-[10px] font-bold text-[#083181] dark:text-[#a0b900]">
                      {dayRequests.length} {dayRequests.length === 1 ? 'entrega' : 'entregas'}
                    </span>
                  )}
                </div>

                <div className="mt-1.5 space-y-1 flex-1 overflow-y-auto max-h-[85px]">
                  {dayRequests.map((req) => (
                    <div
                      key={req.id}
                      onClick={() => onSelectRequest(req.id)}
                      className="p-1 rounded text-[10px] font-medium border cursor-pointer hover:opacity-90 transition-opacity truncate"
                      style={{
                        backgroundColor: `${STATUS_COLORS[req.status]}15`,
                        borderColor: `${STATUS_COLORS[req.status]}40`,
                        color: STATUS_COLORS[req.status],
                      }}
                      title={`${req.code}: ${req.title}`}
                    >
                      <strong>{req.code}</strong>: {req.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 sm:hidden">
        {mobileDeliveryDays.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-xs dark:border-[#1F3057] dark:bg-[#0E172E] dark:text-slate-400">
            Nenhuma entrega prevista para este mês.
          </div>
        ) : mobileDeliveryDays.map(({ day, requests: dayRequests }) => (
          <section
            key={day}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-[#1F3057] dark:bg-[#0E172E]"
          >
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h3>
            <div className="space-y-2">
              {dayRequests.map((request) => (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => onSelectRequest(request.id)}
                  className="w-full rounded-lg border p-3 text-left"
                  style={{
                    backgroundColor: `${STATUS_COLORS[request.status]}15`,
                    borderColor: `${STATUS_COLORS[request.status]}40`,
                    color: STATUS_COLORS[request.status],
                  }}
                >
                  <span className="block text-[10px] font-bold">{request.code}</span>
                  <span className="mt-0.5 block text-xs font-semibold">{request.title}</span>
                  <span className="mt-1 block text-[10px] opacity-80">{STATUS_LABELS[request.status]}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
