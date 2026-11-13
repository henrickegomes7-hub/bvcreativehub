import React, { useState } from 'react';
import { CreativeRequest, UserProfile, ApprovalDecision, RequestStatus } from '../../types';
import { getSlaStatus } from '../../utils/sla';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Download, 
  Eye, 
  Layers, 
  Sparkles,
  ShieldCheck,
  Check,
  Split,
  FileText
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
  const [compareVersion, setCompareVersion] = useState<boolean>(false);
  const [checklist, setChecklist] = useState([
    { item: 'Logotipo oficial do Grupo BV com área de respiro correta', checked: true },
    { item: 'Paleta cromática institucional (Azul #083181, Laranja #c56a2d, Verde #a0b900, Amarelo #e8dda5)', checked: true },
    { item: 'Tarja legal de crédito / disclaimers regulatórios BACEN', checked: true },
    { item: 'Ortografia, clareza da proposta e chamada para ação (CTA)', checked: true },
  ]);

  const activeRequest = requests.find((r) => r.id === selectedRequestId) || pendingRequests[0];
  const currentVer = activeRequest?.versions?.[activeRequest.versions.length - 1];
  const previousVer = activeRequest?.versions && activeRequest.versions.length > 1
    ? activeRequest.versions[activeRequest.versions.length - 2]
    : null;
  const currentPreviewUrl = currentVer?.preview_url || currentVer?.file_url;
  const previousPreviewUrl = previousVer?.preview_url || previousVer?.file_url;

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
      <div className="bg-white dark:bg-[#0E172E] rounded-xl p-5 border border-slate-200 dark:border-[#1F3057] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            Espaço formal para aprovação de peças gráficas, conferência de compliance de marca e solicitação de ajustes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="warning" dot size="md">
            {pendingRequests.length} peças aguardando avaliação
          </Badge>
        </div>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="bg-white dark:bg-[#0E172E] rounded-2xl p-12 text-center border border-slate-200 dark:border-[#1F3057]">
          <CheckCircle2 className="w-12 h-12 text-[#a0b900] mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">Tudo em dia! Nenhuma demanda pendente de aprovação.</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Todas as versões criadas foram avaliadas ou estão em fase de produção.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: List of Pending Items */}
          <div className="lg:col-span-4 bg-white dark:bg-[#0E172E] rounded-xl border border-slate-200 dark:border-[#1F3057] shadow-xs p-3 space-y-2">
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
                        : 'bg-white dark:bg-[#131F3D] border-slate-200 dark:border-[#1F3057] hover:border-slate-300 dark:hover:border-slate-600'
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
                      Versão: <strong className="text-[#083181] dark:text-[#a0b900]">V{req.current_version}</strong> • Solicitante: {req.requester_name}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Visual Inspector & Decision Panel */}
          {activeRequest && (
            <div className="lg:col-span-8 bg-white dark:bg-[#0E172E] rounded-xl border border-slate-200 dark:border-[#1F3057] shadow-xs p-5 space-y-6">
              {/* Request Info Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-[#131F3D] text-slate-700 dark:text-slate-300 rounded">
                      {activeRequest.code}
                    </span>
                    <span className="text-xs font-semibold text-[#083181] dark:text-blue-300 bg-blue-50 dark:bg-[#083181]/20 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900/40">
                      Versão V{activeRequest.current_version}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{activeRequest.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{activeRequest.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  {previousVer && (
                    <Button
                      variant={compareVersion ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setCompareVersion(!compareVersion)}
                      icon={<Split className="w-3.5 h-3.5" />}
                    >
                      {compareVersion ? 'Ver Apenas Atual' : 'Comparar V1 x V2'}
                    </Button>
                  )}
                  {currentVer?.file_url ? (
                    <a
                      href={currentVer.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#131F3D] hover:bg-slate-200 dark:hover:bg-[#1E293B] rounded-lg transition-colors border border-slate-200 dark:border-[#1F3057]"
                    >
                      <Download className="w-3.5 h-3.5 text-[#083181] dark:text-[#a0b900]" /> Baixar Peça
                    </a>
                  ) : currentVer ? (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Arquivo enviado por WhatsApp ou e-mail
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Visual Display */}
              {currentVer ? (
                <div>
                  <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
                    O sistema mantém apenas o registro da versão. O arquivo é enviado ao solicitante por WhatsApp ou e-mail.
                    {(activeRequest.briefing.delivery_email || activeRequest.briefing.delivery_whatsapp) && (
                      <span className="mt-1 block">
                        {activeRequest.briefing.delivery_email && `E-mail: ${activeRequest.briefing.delivery_email}`}
                        {activeRequest.briefing.delivery_email && activeRequest.briefing.delivery_whatsapp && ' · '}
                        {activeRequest.briefing.delivery_whatsapp && `WhatsApp: ${activeRequest.briefing.delivery_whatsapp}`}
                      </span>
                    )}
                  </div>
                  {compareVersion && previousVer ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Previous Version */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2">
                        <div className="flex justify-between items-center mb-2 px-1">
                          <span className="text-xs font-bold text-slate-600">Versão Anterior (V{previousVer.version_number})</span>
                          <span className="text-[10px] text-slate-400">{previousVer.dimensions}</span>
                        </div>
                        {previousPreviewUrl ? (
                          <img
                            src={previousPreviewUrl}
                            alt="Versão Anterior"
                            className="w-full aspect-square object-cover rounded-lg border border-slate-200"
                          />
                        ) : (
                          <div className="w-full aspect-square rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
                            <FileText className="w-8 h-8" />
                            Arquivo enviado externamente
                          </div>
                        )}
                        <p className="text-[11px] text-slate-500 mt-2 italic px-1">"{previousVer.changelog}"</p>
                      </div>

                      {/* Current Version */}
                      <div className="border border-[#083181]/30 dark:border-blue-500/30 rounded-xl overflow-hidden bg-blue-50/20 dark:bg-[#083181]/15 p-2 ring-1 ring-[#083181]/40">
                        <div className="flex justify-between items-center mb-2 px-1">
                          <span className="text-xs font-bold text-[#083181] dark:text-blue-300">Versão Atual (V{currentVer.version_number})</span>
                          <span className="text-[10px] text-[#083181] dark:text-blue-300 font-semibold">{currentVer.dimensions}</span>
                        </div>
                        {currentPreviewUrl ? (
                          <img
                            src={currentPreviewUrl}
                            alt="Versão Atual"
                            className="w-full aspect-square object-cover rounded-lg border border-blue-300 dark:border-blue-700"
                          />
                        ) : (
                          <div className="w-full aspect-square rounded-lg border border-dashed border-blue-300 dark:border-blue-700 flex flex-col items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <FileText className="w-8 h-8" />
                            Arquivo enviado externamente
                          </div>
                        )}
                        <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-2 font-medium px-1">"{currentVer.changelog}"</p>
                      </div>
                    </div>
                  ) : (
                    currentPreviewUrl ? (
                      <div className="bg-slate-100 dark:bg-[#131F3D] rounded-xl overflow-hidden border border-slate-200 dark:border-[#1F3057] p-2 max-h-[450px] flex items-center justify-center">
                        <img
                          src={currentPreviewUrl}
                          alt="Preview da Arte"
                          className="max-h-[420px] w-auto object-contain rounded-lg shadow-sm"
                        />
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-slate-100 dark:bg-[#131F3D] rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                        <FileText className="w-8 h-8 mx-auto mb-2" />
                        <p className="font-semibold">{currentVer.file_name}</p>
                        <p className="mt-1">Arquivo enviado ao solicitante por WhatsApp ou e-mail, fora do sistema.</p>
                      </div>
                    )
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 px-1">
                    <span>
                      Arquivo: <strong>{currentVer.file_name}</strong> ({currentVer.file_size})
                    </span>
                    <span>
                      Criado por {currentVer.created_by_name} em {new Date(currentVer.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 dark:bg-[#131F3D] rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-400">
                  Nenhuma versão registrada. O envio dos arquivos é feito fora do sistema, por WhatsApp ou e-mail.
                </div>
              )}

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
