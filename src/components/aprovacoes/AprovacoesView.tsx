import React, { useState } from 'react';
import { CreativeRequest, UserProfile, ApprovalDecision, RequestStatus } from '../../types';
import { getSlaStatus } from '../../utils/sla';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Eye, 
  Layers, 
  Sparkles,
  ShieldCheck,
  Check,
  Mail,
  MessageCircle
} from 'lucide-react';

interface AprovacoesViewProps {
  requests: CreativeRequest[];
  currentUser: UserProfile;
  onSubmitApproval: (requestId: string, approvalData: {
    decision: ApprovalDecision;
    reviewer_id: string;
    reviewer_name: string;
    reviewer_role: UserProfile['role'];
    feedback: string;
    checklist: { item: string; checked: boolean }[];
  }) => void;
  onSelectRequest: (id: string) => void;
}

export const AprovacoesView: React.FC<AprovacoesViewProps> = ({
  requests,
  currentUser,
  onSubmitApproval,
  onSelectRequest,
}) => {
  // Filter items in review or client approval
  const pendingRequests = requests.filter(
    (r) => r.status === 'client_approval' || r.status === 'review'
  );

  const [selectedRequestId, setSelectedRequestId] = useState<string>(
    pendingRequests[0]?.id || ''
  );
  const [feedback, setFeedback] = useState('');
  const [checklist, setChecklist] = useState([
    { item: 'Logotipo oficial do Grupo BV com área de respiro correta', checked: true },
    { item: 'Paleta cromática institucional (Azul #083181, Laranja #c56a2d, Verde #a0b900, Amarelo #e8dda5)', checked: true },
    { item: 'Tarja legal de crédito / disclaimers regulatórios BACEN', checked: true },
    { item: 'Ortografia, clareza da proposta e chamada para ação (CTA)', checked: true },
  ]);

  const activeRequest = requests.find((r) => r.id === selectedRequestId) || pendingRequests[0];

  const handleDecision = (decision: ApprovalDecision) => {
    if (!activeRequest) return;
    onSubmitApproval(activeRequest.id, {
      decision,
      reviewer_id: currentUser.id,
      reviewer_name: currentUser.name,
      reviewer_role: currentUser.role,
      feedback: feedback.trim() || (decision === 'approved' ? 'Aprovado para veiculação.' : 'Ajustes pontuais solicitados.'),
      checklist,
    });
    setFeedback('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#0E172E] rounded-xl p-5 border border-slate-300/80 dark:border-[#1F3057] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-blue-50 dark:bg-[#083181]/30 text-[#083181] dark:text-blue-300 rounded-md">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Portal de Aprovações & Qualidade Criativa
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Espaço formal para registrar aprovação, conferir compliance de marca e solicitar ajustes. As artes são enviadas por WhatsApp ou e-mail, fora do sistema.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="warning" dot size="md">
            {pendingRequests.length} peças aguardando avaliação
          </Badge>
        </div>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="bg-white dark:bg-[#0E172E] rounded-2xl p-12 text-center border border-slate-300/80 dark:border-[#1F3057] shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-[#a0b900] mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">Tudo em dia! Nenhuma demanda pendente de aprovação.</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Não há solicitações aguardando parecer neste momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: List of Pending Items */}
          <div className="lg:col-span-4 bg-white dark:bg-[#0E172E] rounded-xl border border-slate-300/80 dark:border-[#1F3057] shadow-sm p-3 space-y-2">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 py-1">
              Fila de Peças para Validação
            </p>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {pendingRequests.map((req) => {
                const isSelected = req.id === activeRequest?.id;
                const sla = getSlaStatus(req.deadline, false);

                return (
                  <div
                    key={req.id}
                    onClick={() => setSelectedRequestId(req.id)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#083181]/10 dark:bg-[#083181]/25 border-[#083181] dark:border-blue-400 ring-1 ring-[#083181]/50'
                        : 'bg-slate-50 dark:bg-[#131F3D] border-slate-300/80 dark:border-[#1F3057] hover:border-slate-400 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{req.code}</span>
                      <Badge variant={sla.status === 'overdue' ? 'danger' : sla.status === 'critical' ? 'warning' : 'neutral'} size="sm" dot>
                        {sla.label}
                      </Badge>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{req.title}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Solicitante: {req.requester_name}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Visual Inspector & Decision Panel */}
          {activeRequest && (
            <div className="lg:col-span-8 bg-white dark:bg-[#0E172E] rounded-xl border border-slate-300/80 dark:border-[#1F3057] shadow-sm p-5 space-y-6">
              {/* Request Info Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-[#131F3D] text-slate-700 dark:text-slate-300 rounded">
                      {activeRequest.code}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{activeRequest.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{activeRequest.description}</p>
                </div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
                A arte é enviada ao solicitante fora do sistema, por WhatsApp ou e-mail. A aprovação abaixo registra somente o parecer e o checklist.
                {(activeRequest.briefing.delivery_email || activeRequest.briefing.delivery_whatsapp) && (
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-semibold">
                    {activeRequest.briefing.delivery_email && (
                      <a className="inline-flex items-center gap-1.5 underline" href={`mailto:${activeRequest.briefing.delivery_email}`}>
                        <Mail className="h-3.5 w-3.5" />
                        {activeRequest.briefing.delivery_email}
                      </a>
                    )}
                    {activeRequest.briefing.delivery_whatsapp && (
                      <a
                        className="inline-flex items-center gap-1.5 underline"
                        href={`https://wa.me/${activeRequest.briefing.delivery_whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        {activeRequest.briefing.delivery_whatsapp}
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Compliance Checklist */}
              <div className="p-4 bg-slate-50 dark:bg-[#131F3D] rounded-xl border border-slate-200 dark:border-[#1F3057] space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Checklist de Aprovação & Identidade Grupo BV
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

              {/* Feedback Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Parecer do Revisor / Comentários
                </label>
                <textarea
                  rows={2}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Insira comentários, validações de texto ou instruções caso solicite alterações..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-[#131F3D] border border-slate-300 dark:border-[#1F3057] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#083181]/30 focus:border-[#083181] text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectRequest(activeRequest.id)}
                >
                  Abrir Ficha Completa
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDecision('changes_requested')}
                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                  >
                    Solicitar Ajustes
                  </Button>
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => handleDecision('approved_with_notes')}
                  >
                    Aprovar com Ressalvas
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleDecision('approved')}
                    icon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Aprovar sem Ressalvas
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
