import React, { useState } from 'react';
import { 
  CreativeRequest, 
  UserProfile, 
  RequestStatus, 
  ApprovalDecision 
} from '../../types';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { getSlaStatus } from '../../utils/sla';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, canTransition } from '../../utils/workflow';
import { 
  CheckCircle2, 
  MessageSquare, 
  FileText,
  Send,
  ShieldCheck
} from 'lucide-react';

interface DetalheDemandaModalProps {
  request: CreativeRequest | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  users: UserProfile[];
  isAdmin: boolean;
  onUpdateStatus: (id: string, status: RequestStatus) => void;
  onAssignRequest: (id: string, assigneeId: string | null) => void;
  onAddComment: (requestId: string, commentData: {
    user_id: string;
    user_name: string;
    user_avatar: string;
    user_role: UserProfile['role'];
    content: string;
    is_adjustment: boolean;
    resolved: boolean;
    version_number?: number;
  }) => void;
  onSubmitApproval: (requestId: string, approvalData: {
    decision: ApprovalDecision;
    reviewer_id: string;
    reviewer_name: string;
    reviewer_role: UserProfile['role'];
    feedback: string;
    checklist: { item: string; checked: boolean }[];
  }) => void;
}

export const DetalheDemandaModal: React.FC<DetalheDemandaModalProps> = ({
  request,
  isOpen,
  onClose,
  currentUser,
  users,
  isAdmin,
  onUpdateStatus,
  onAssignRequest,
  onAddComment,
  onSubmitApproval,
}) => {
  const [activeTab, setActiveTab] = useState<'briefing' | 'comments' | 'approval'>('briefing');

  // New Comment Form State
  const [commentText, setCommentText] = useState('');
  const [isAdjustment, setIsAdjustment] = useState(false);

  // Approval Form State
  const [approvalDecision, setApprovalDecision] = useState<ApprovalDecision>('approved');
  const [approvalFeedback, setApprovalFeedback] = useState('');
  const [checklist, setChecklist] = useState([
    { item: 'Logotipo oficial do Grupo BV com área de respiro correta', checked: true },
    { item: 'Cores estritamente aderentes à paleta oficial BV (#083181 / #c56a2d / #a0b900)', checked: true },
    { item: 'Tarja legal de crédito / BACEN conforme regulamento', checked: true },
    { item: 'Ortografia, acentuação e clareza da chamada (CTA)', checked: true },
  ]);

  if (!request) return null;

  const sla = getSlaStatus(request.deadline, request.status === 'approved');

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    onAddComment(request.id, {
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_avatar: currentUser.avatar_url,
      user_role: currentUser.role,
      content: commentText.trim(),
      is_adjustment: isAdjustment,
      resolved: false,
      version_number: request.current_version,
    });

    setCommentText('');
    setIsAdjustment(false);
  };

  const handleApprovalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitApproval(request.id, {
      decision: approvalDecision,
      reviewer_id: currentUser.id,
      reviewer_name: currentUser.name,
      reviewer_role: currentUser.role,
      feedback: approvalFeedback.trim() || (approvalDecision === 'approved' ? 'Aprovado sem ressalvas.' : 'Ajustes solicitados conforme checklist.'),
      checklist,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="5xl"
    >
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded">
                {request.code}
              </span>
              <span 
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-white"
                style={{ backgroundColor: STATUS_COLORS[request.status] }}
              >
                {STATUS_LABELS[request.status]}
              </span>
              <Badge variant={request.priority === 'urgent' ? 'danger' : 'neutral'}>
                Prioridade {PRIORITY_LABELS[request.priority]}
              </Badge>
              <Badge variant={sla.status === 'overdue' ? 'danger' : sla.status === 'critical' ? 'warning' : 'success'} dot>
                {sla.label}
              </Badge>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{request.title}</h2>
          </div>

          {/* Quick Status Advance Button */}
          <div className="flex items-center gap-2">
            {isAdmin && request.status !== 'approved' && (
              <select
                value={request.status}
                onChange={(e) => {
                  const target = e.target.value as RequestStatus;
                  const check = canTransition(request.status, target, currentUser.role);
                  if (!check.allowed) {
                    alert(check.reason);
                    return;
                  }
                  onUpdateStatus(request.id, target);
                }}
                className="text-xs font-semibold px-3 py-1.5 bg-white dark:bg-[#0E172E] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none"
              >
                <option value="backlog">1. Triagem / Backlog</option>
                <option value="in_progress">2. Em Produção</option>
                <option value="review">3. Revisão Criativa / QA</option>
                <option value="client_approval">4. Aprovação do Solicitante</option>
                <option value="approved">5. Concluído & Aprovado</option>
              </select>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('briefing')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'briefing'
                ? 'border-[#083181] text-[#083181] dark:border-[#a0b900] dark:text-[#e8dda5]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Briefing & Specs
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'comments'
                ? 'border-[#083181] text-[#083181] dark:border-[#a0b900] dark:text-[#e8dda5]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Ajustes & Comentários ({request.comments.length})
          </button>

          {isAdmin && <button
            onClick={() => setActiveTab('approval')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'approval'
                ? 'border-[#083181] text-[#083181] dark:border-[#a0b900] dark:text-[#e8dda5]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Aprovação Formal ({request.approvals.length})
          </button>}
        </div>

        {/* Tab 1: Briefing & Specs */}
        {activeTab === 'briefing' && (
          <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-[#0A1329] rounded-xl p-4 border border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Objetivo do Negócio
              </h3>
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {request.description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A1329] space-y-3">
                <h4 className="text-xs font-bold text-[#083181] dark:text-[#e8dda5] uppercase tracking-wider">
                  Diretrizes de Comunicação
                </h4>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Público-Alvo</span>
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">{request.briefing.target_audience}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Mensagem Principal</span>
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">{request.briefing.key_message}</p>
                </div>
                {request.briefing.cta_text && (
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Chamada para Ação (CTA)</span>
                    <p className="text-xs font-semibold text-[#c56a2d]">{request.briefing.cta_text}</p>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A1329] space-y-3">
                <h4 className="text-xs font-bold text-[#083181] dark:text-[#e8dda5] uppercase tracking-wider">
                  Especificações & Prazos
                </h4>
                {request.briefing.specs && (
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                      Dimensões e Especificações do Formato
                    </span>
                    <p className="text-xs text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap">
                      {request.briefing.specs}
                    </p>
                  </div>
                )}
                <div className="flex justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Solicitante:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{request.requester_name}</span>
                </div>
                <div className="space-y-1 border-b border-slate-100 py-1 dark:border-slate-800">
                  <label htmlFor="request-assignee" className="text-xs text-slate-500 dark:text-slate-400">
                    Responsável pela execução:
                  </label>
                  {isAdmin ? (
                    <>
                      <select
                        id="request-assignee"
                        value={request.assignee_id ?? ''}
                        onChange={(event) => onAssignRequest(request.id, event.target.value || null)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#083181] focus:outline-none dark:border-slate-700 dark:bg-[#0E172E] dark:text-slate-200"
                      >
                        <option value="">Aguardando alocação</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Quem executa a solicitação; não altera quem registra a aprovação.
                      </p>
                    </>
                  ) : (
                    <p className="text-xs font-semibold text-[#083181] dark:text-[#a0b900]">
                      {request.assignee_name || 'Aguardando alocação'}
                    </p>
                  )}
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Horas Estimadas:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{request.estimated_hours}h</span>
                </div>
                <div className="flex justify-between text-xs py-1">
                  <span className="text-slate-500 dark:text-slate-400">Prazo de Entrega:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                    {new Date(request.deadline).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>

            {(request.briefing.delivery_email || request.briefing.delivery_whatsapp) && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A1329] p-4">
                <h4 className="text-xs font-bold text-[#083181] dark:text-[#e8dda5] uppercase tracking-wider mb-3">
                  Contato para envio dos arquivos
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {request.briefing.delivery_email && (
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">E-mail</span>
                      <a className="font-medium text-[#083181] dark:text-blue-300 break-all" href={`mailto:${request.briefing.delivery_email}`}>
                        {request.briefing.delivery_email}
                      </a>
                    </div>
                  )}
                  {request.briefing.delivery_whatsapp && (
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">WhatsApp</span>
                      <a
                        className="font-medium text-[#083181] dark:text-blue-300"
                        href={`https://wa.me/${request.briefing.delivery_whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {request.briefing.delivery_whatsapp}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {request.briefing.mandatory_elements && request.briefing.mandatory_elements.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Elementos Obrigatórios
                </h4>
                <div className="flex flex-wrap gap-2">
                  {request.briefing.mandatory_elements.map((item, idx) => (
                    <span key={idx} className="text-xs px-2.5 py-1 bg-[#083181]/10 text-[#083181] dark:bg-[#083181]/30 dark:text-[#e8dda5] rounded-md font-medium border border-[#083181]/20 dark:border-[#083181]/40">
                      ✓ {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Comentários & Ajustes */}
        {activeTab === 'comments' && (
          <div className="space-y-4">
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {request.comments.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Nenhum comentário ou solicitação de ajuste registrada.
                </div>
              ) : (
                request.comments.map((comm) => (
                  <div
                    key={comm.id}
                    className={`p-3.5 rounded-xl border ${
                      comm.is_adjustment
                        ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50'
                        : 'bg-slate-50 dark:bg-[#0A1329] border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <img
                          src={comm.user_avatar}
                          alt={comm.user_name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{comm.user_name}</span>
                        {comm.is_adjustment && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#c56a2d] text-white">
                            Ajuste Solicitado
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(comm.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{comm.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handlePostComment} className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="checkbox"
                  id="chk-adj"
                  checked={isAdjustment}
                  onChange={(e) => setIsAdjustment(e.target.checked)}
                  className="rounded text-[#c56a2d] focus:ring-[#c56a2d]"
                />
                <label htmlFor="chk-adj" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Marcar como Solicitação de Alteração / Refação
                </label>
              </div>

              <div className="flex gap-2">
                <textarea
                  rows={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Escreva seu feedback ou aponte os ajustes desejados..."
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-[#0E172E] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#083181]/20 focus:border-[#083181] dark:focus:ring-[#a0b900]/30 dark:focus:border-[#a0b900]"
                />
                <Button type="submit" variant="primary" size="sm" icon={<Send className="w-3.5 h-3.5" />}>
                  Enviar
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 4: Aprovação Formal */}
        {isAdmin && activeTab === 'approval' && (
          <div className="space-y-5">
            {/* Past Approvals Audit */}
            {request.approvals.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Histórico de Pareceres
                </h4>
                {request.approvals.map((app) => (
                  <div key={app.id} className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#a0b900]" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Parecer registrado por: {app.reviewer_name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded">
                          {app.decision.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {new Date(app.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 italic">"{app.feedback}"</p>
                  </div>
                ))}
              </div>
            )}

            {/* Approval Action Form */}
            <div className="p-5 bg-slate-50 dark:bg-[#0A1329] rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold text-[#083181] dark:text-[#e8dda5] uppercase tracking-wider mb-3">
                Emitir Parecer de Aprovação Formal
              </h4>

              <form onSubmit={handleApprovalSubmit} className="space-y-4">
                {/* Decision Radio */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2 transition-all ${
                    approvalDecision === 'approved' ? 'bg-emerald-50/70 dark:bg-[#083181]/30 border-[#a0b900] ring-1 ring-[#a0b900]' : 'bg-white dark:bg-[#0E172E] border-slate-200 dark:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="decision"
                      value="approved"
                      checked={approvalDecision === 'approved'}
                      onChange={() => setApprovalDecision('approved')}
                      className="text-[#a0b900] focus:ring-[#a0b900]"
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Aprovar sem Ressalvas</span>
                  </label>

                  <label className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2 transition-all ${
                    approvalDecision === 'approved_with_notes' ? 'bg-amber-50 dark:bg-amber-950/30 border-[#c56a2d] ring-1 ring-[#c56a2d]' : 'bg-white dark:bg-[#0E172E] border-slate-200 dark:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="decision"
                      value="approved_with_notes"
                      checked={approvalDecision === 'approved_with_notes'}
                      onChange={() => setApprovalDecision('approved_with_notes')}
                      className="text-[#c56a2d] focus:ring-[#c56a2d]"
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Aprovar com Ressalvas</span>
                  </label>

                  <label className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2 transition-all ${
                    approvalDecision === 'changes_requested' ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-500 ring-1 ring-rose-500' : 'bg-white dark:bg-[#0E172E] border-slate-200 dark:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="decision"
                      value="changes_requested"
                      checked={approvalDecision === 'changes_requested'}
                      onChange={() => setApprovalDecision('changes_requested')}
                      className="text-rose-500 focus:ring-rose-500"
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Solicitar Ajustes</span>
                  </label>
                </div>

                {/* Compliance Checklist */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Checklist de Conformidade de Marca
                  </label>
                  <div className="space-y-2">
                    {checklist.map((item, idx) => (
                      <label key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(e) => {
                            const updated = [...checklist];
                            updated[idx].checked = e.target.checked;
                            setChecklist(updated);
                          }}
                          className="rounded text-[#083181] focus:ring-[#083181]"
                        />
                        <span>{item.item}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Feedback note */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Parecer Técnico / Observações
                  </label>
                  <textarea
                    rows={2}
                    value={approvalFeedback}
                    onChange={(e) => setApprovalFeedback(e.target.value)}
                    placeholder="Escreva comentários para a equipe ou observações para o relatório executivo..."
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0E172E] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#083181]/20 focus:border-[#083181] dark:focus:ring-[#a0b900]/30 dark:focus:border-[#a0b900]"
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" variant="primary" icon={<ShieldCheck className="w-4 h-4" />}>
                    Registrar Decisão no Sistema
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
