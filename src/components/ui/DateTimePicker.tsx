import React, { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

const pad = (value: number) => String(value).padStart(2, '0');

function parseDateTime(value: string): Date | null {
  if (!value) return null;
  const [datePart, timePart = '00:00'] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatLocalDateTime(date: Date, hour: number, minute: number): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hour)}:${pad(minute)}`;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange, error }) => {
  const selectedDate = parseDateTime(value);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initialDate = selectedDate ?? new Date();
    return new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);
  });

  useEffect(() => {
    if (isOpen) return;
    const date = parseDateTime(value);
    if (date) setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }, [value, isOpen]);

  const hour = selectedDate?.getHours() ?? 17;
  const minute = selectedDate?.getMinutes() ?? 0;
  const firstDayOffset = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const daysInPreviousMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 0).getDate();
  const days = Array.from({ length: 42 }, (_, index) => {
    const dayNumber = index - firstDayOffset + 1;
    if (dayNumber < 1) {
      return {
        date: new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, daysInPreviousMonth + dayNumber),
        isCurrentMonth: false,
      };
    }
    if (dayNumber > daysInMonth) {
      return {
        date: new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, dayNumber - daysInMonth),
        isCurrentMonth: false,
      };
    }
    return {
      date: new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), dayNumber),
      isCurrentMonth: true,
    };
  });

  const selectedDateKey = selectedDate
    ? formatLocalDateTime(selectedDate, 0, 0).slice(0, 10)
    : '';
  const todayKey = formatLocalDateTime(new Date(), 0, 0).slice(0, 10);

  const updateTime = (nextHour: number, nextMinute: number) => {
    if (selectedDate) onChange(formatLocalDateTime(selectedDate, nextHour, nextMinute));
  };

  const selectDate = (date: Date) => {
    onChange(formatLocalDateTime(date, hour, minute));
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(visibleMonth);

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex w-full items-center gap-3 rounded-lg border bg-slate-50 px-3.5 py-2.5 text-left transition-colors dark:bg-[#0A1329] ${
          error
            ? 'border-rose-400 focus:ring-2 focus:ring-rose-200'
            : 'border-slate-300 hover:border-[#083181] focus:border-[#083181] focus:ring-2 focus:ring-[#083181]/15 dark:border-slate-700 dark:hover:border-blue-400 dark:focus:border-blue-400 dark:focus:ring-blue-400/15'
        }`}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-[#083181] dark:text-blue-300" />
        <span className={`min-w-0 flex-1 text-sm ${selectedDate ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
          {selectedDate
            ? selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
            : 'Selecione a data de entrega'}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 border-l border-slate-200 pl-3 text-sm font-semibold tabular-nums text-slate-700 dark:border-slate-700 dark:text-slate-200">
          <Clock3 className="h-3.5 w-3.5 text-slate-400" />
          {selectedDate ? `${pad(hour)}:${pad(minute)}` : '17:00'}
        </span>
      </button>

      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}

      {isOpen && (
        <div
          role="dialog"
          aria-label="Selecionar prazo de entrega"
          className="mt-2 w-full max-w-[22rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 dark:border-[#2A3B60] dark:bg-[#0E172E] dark:ring-white/5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
              aria-label="Mês anterior"
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#083181] dark:text-slate-400 dark:hover:bg-[#19274A] dark:hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h3 className="text-sm font-bold capitalize text-slate-800 dark:text-slate-100">{monthLabel}</h3>
            <button
              type="button"
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
              aria-label="Próximo mês"
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#083181] dark:text-slate-400 dark:hover:bg-[#19274A] dark:hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="p-3">
            <div className="mb-1 grid grid-cols-7">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
                <span key={`${day}-${index}`} className="py-2 text-center text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                  {day}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {days.map(({ date, isCurrentMonth }, index) => {
                const dateKey = formatLocalDateTime(date, 0, 0).slice(0, 10);
                const isSelected = dateKey === selectedDateKey;
                const isToday = dateKey === todayKey;
                return (
                  <button
                    key={`${dateKey}-${index}`}
                    type="button"
                    aria-label={date.toLocaleDateString('pt-BR', { dateStyle: 'full' })}
                    aria-pressed={isSelected}
                    onClick={() => selectDate(date)}
                    className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-[#083181] text-white shadow-sm dark:bg-blue-500'
                        : isToday
                          ? 'border border-[#c56a2d] text-[#c56a2d] dark:text-orange-300'
                          : isCurrentMonth
                            ? 'text-slate-700 hover:bg-blue-50 hover:text-[#083181] dark:text-slate-200 dark:hover:bg-[#19274A] dark:hover:text-white'
                            : 'text-slate-300 hover:bg-slate-50 dark:text-slate-600 dark:hover:bg-[#131F3D]'
                    }`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-[#0A1329]">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Horário</span>
              <select
                aria-label="Hora"
                value={hour}
                onChange={(event) => updateTime(Number(event.target.value), minute)}
                disabled={!selectedDate}
                className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#083181] disabled:opacity-50 dark:border-slate-700 dark:bg-[#131F3D] dark:text-slate-100"
              >
                {Array.from({ length: 24 }, (_, item) => (
                  <option key={item} value={item}>{pad(item)}</option>
                ))}
              </select>
              <span className="font-bold text-slate-400">:</span>
              <select
                aria-label="Minuto"
                value={minute}
                onChange={(event) => updateTime(hour, Number(event.target.value))}
                disabled={!selectedDate}
                className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#083181] disabled:opacity-50 dark:border-slate-700 dark:bg-[#131F3D] dark:text-slate-100"
              >
                {Array.from({ length: 60 }, (_, item) => (
                  <option key={item} value={item}>{pad(item)}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => selectDate(new Date())}
                className="text-xs font-semibold text-[#083181] hover:underline dark:text-blue-300"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md bg-[#083181] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#062666] dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
