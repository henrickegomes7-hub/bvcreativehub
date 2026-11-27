import { Activity } from 'lucide-react';
import type { CreativeRequest, RequestStatus } from '../../types';
import { APPROVAL_LABELS, STATUS_LABELS } from '../../utils/workflow';

interface TimelineEntry {
  id: string;
  title: string;
  actor?: string | null;
  date: string;
  detail?: string;
}

const actionTitles: Record<string, string> = {
  status: 'Etapa alterada',
  assignee: 'Responsável pela execução alterado',
  approver: 'Aprovador alterado',
  approvals: 'Parecer registrado',
  reopen: 'Solicitação reaberta',
  archive: 'Solicitação arquivada',
};

function statusLabel(value: unknown) {
  return typeof value === 'string' && Object.hasOwn(STATUS_LABELS, value)
    ? STATUS_LABELS[value as RequestStatus]
    : undefined;
}

function describeChange(event: NonNullable<CreativeRequest['history']>[number]) {
  if (event.reason?.trim()) return event.reason;
  const after = event.snapshot?.after as Record<string, unknown> | undefined;
  if (event.action === 'status') {
    const previous = statusLabel(event.snapshot?.status);
    const next = statusLabel(after?.status);
    if (previous && next) return previous + ' → ' + next;
    if (previous) return 'Etapa anterior: ' + previous;
  }
  if (event.action === 'assignee' || event.action === 'approver') {
    const name = after?.[event.action === 'assignee' ? 'assignee_name' : 'approver_name'];
    if (typeof name === 'string' && name) return name;
    if (name === null) return event.action === 'assignee' ? 'Responsável removido' : 'Aprovador removido';
  }
  return undefined;
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export function RequestTimeline({ request }: { request: CreativeRequest }) {
  const entries: TimelineEntry[] = [
    ...(request.history ?? []).filter(event => event.action !== 'approvals' || !request.approvals?.length).map(event => ({
      id: 'event-' + event.id,
      title: Object.hasOwn(actionTitles, event.action) ? actionTitles[event.action] : 'Solicitação atualizada',
      actor: event.actor_name,
      date: event.created_at,
      detail: describeChange(event),
    })),
    ...(request.approvals ?? []).map(approval => ({
      id: 'approval-' + approval.id,
      title: APPROVAL_LABELS[approval.decision] ?? 'Parecer registrado',
      actor: approval.reviewer_name,
      date: approval.created_at,
      detail: approval.feedback,
    })),
    ...(request.comments ?? []).map(comment => ({
      id: 'comment-' + comment.id,
      title: 'Comentário registrado',
      actor: comment.user_name,
      date: comment.created_at,
      detail: comment.content,
    })),
    { id: 'created', title: 'Solicitação enviada', actor: request.requester_name, date: request.created_at },
  ];

  entries.sort((left, right) => (Date.parse(right.date) || 0) - (Date.parse(left.date) || 0));

  return (
    <section aria-label="Histórico da solicitação">
      <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-white">Histórico da solicitação</h3>
      <ol className="ml-3 border-l border-slate-200 dark:border-slate-700">
        {entries.map(entry => {
          const date = Date.parse(entry.date);
          return (
            <li key={entry.id} className="relative pl-6 pb-4 last:pb-0">
              <span className="absolute top-3 -left-3 grid size-6 place-items-center rounded-full bg-blue-100 text-[#083181] dark:bg-slate-800 dark:text-blue-300">
                <Activity aria-hidden="true" className="size-3.5" />
              </span>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{entry.title}</h4>
                  {Number.isFinite(date) && (
                    <time dateTime={new Date(date).toISOString()} className="text-xs text-slate-600 dark:text-slate-300">
                      {dateFormat.format(date)}
                    </time>
                  )}
                </div>
                <p className="mt-1 break-words text-xs text-slate-600 dark:text-slate-300">{entry.actor || 'Autor não registrado'}</p>
                {entry.detail && <p className="mt-2 break-words whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">{entry.detail}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
