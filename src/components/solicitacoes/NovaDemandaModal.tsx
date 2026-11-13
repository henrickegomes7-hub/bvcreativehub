import React, { useEffect, useState } from 'react';
import { Department, UserProfile, RequestPriority, AssetFormat, CreativeRequest, CreativeRequestEditableFields } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { requestGeminiDemandSuggestion } from '../../services/aiSuggestionService';
import { Sparkles, Calendar, Clock, AlertTriangle, Wand2, Check, RefreshCw } from 'lucide-react';

interface NovaDemandaModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  currentUser: UserProfile;
  request: CreativeRequest | null;
  onCreate: (data: Omit<CreativeRequest, 'id' | 'code' | 'created_at' | 'updated_at' | 'current_version' | 'versions' | 'comments' | 'approvals'>) => Promise<void>;
  onUpdate: (id: string, data: CreativeRequestEditableFields) => Promise<void>;
}

function toLocalDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export const NovaDemandaModal: React.FC<NovaDemandaModalProps> = ({
  isOpen,
  onClose,
  departments,
  currentUser,
  request,
  onCreate,
  onUpdate,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState(currentUser.department_id || departments[0]?.id || '');
  const [priority, setPriority] = useState<RequestPriority>('medium');
  const [format, setFormat] = useState<AssetFormat>('social_feed');
  const [deadline, setDeadline] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(12);

  // Briefing Fields
  const [targetAudience, setTargetAudience] = useState('');
  const [keyMessage, setKeyMessage] = useState('');
  const [deliveryEmail, setDeliveryEmail] = useState('');
  const [deliveryWhatsapp, setDeliveryWhatsapp] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [mandatoryElements, setMandatoryElements] = useState('Logotipo da marca, Informações obrigatórias da campanha');
  const [tags, setTags] = useState('Campanha, Digital');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Gemini AI Assistant State
  const [aiTopic, setAiTopic] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(request?.title ?? '');
    setDescription(request?.description ?? '');
    setDepartmentId(request?.department_id ?? currentUser.department_id ?? departments[0]?.id ?? '');
    setPriority(request?.priority ?? 'medium');
    setFormat(request?.format ?? 'social_feed');
    setDeadline(request ? toLocalDateTime(request.deadline) : '');
    setEstimatedHours(request?.estimated_hours ?? 12);
    setTargetAudience(request?.briefing.target_audience ?? '');
    setKeyMessage(request?.briefing.key_message ?? '');
    setDeliveryEmail(request?.briefing.delivery_email ?? '');
    setDeliveryWhatsapp(request?.briefing.delivery_whatsapp ?? '');
    setCtaText(request?.briefing.cta_text ?? '');
    setMandatoryElements(request?.briefing.mandatory_elements.join(', ') ?? 'Logotipo da marca, Informações obrigatórias da campanha');
    setTags(request?.tags.join(', ') ?? 'Campanha, Digital');
    setErrors({});
    setAiTopic('');
    setAiSuccessMessage(null);
  }, [isOpen, request?.id]);

  const quickIdeas = [
    { label: '✈️ Plano Boa Viagem', topic: 'Campanha do PLANO BOA VIAGEM' },
    { label: '🌸 BV Flores', topic: 'Campanha de divulgação da BV FLORES' },
    { label: '🎬 BV Play', topic: 'Campanha de conteúdo e entretenimento da BV PLAY' },
    { label: '🐾 BV Pet', topic: 'Campanha de serviços e cuidados para animais da BV PET' },
  ];

  const handleAiSuggest = async (topicToUse?: string) => {
    const text = topicToUse || aiTopic || title;
    if (!text.trim()) {
      alert('Digite uma ideia, tema ou título para a IA sugerir o briefing.');
      return;
    }

    setIsAiLoading(true);
    setAiSuccessMessage(null);

    try {
      const currentDept = departments.find(d => d.id === departmentId);
      const suggestion = await requestGeminiDemandSuggestion(
        text.trim(),
        currentDept?.code,
        format
      );

      // Preenche os campos automaticamente
      setTitle(suggestion.title);
      setDescription(suggestion.description);
      setFormat(suggestion.format);
      setPriority(suggestion.priority);
      setEstimatedHours(suggestion.estimated_hours);
      setTargetAudience(suggestion.target_audience);
      setKeyMessage(suggestion.key_message);
      setCtaText(suggestion.cta_text);
      setMandatoryElements(suggestion.mandatory_elements.join(', '));
      setTags(suggestion.tags.join(', '));

      // Atualiza departamento se sugerido
      if (suggestion.suggested_department_code) {
        const matched = departments.find(d => d.code === suggestion.suggested_department_code);
        if (matched) setDepartmentId(matched.id);
      }

      // Se não havia prazo, sugere 3 dias úteis adiante
      if (!deadline) {
        const autoDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);
        setDeadline(autoDeadline.toISOString().slice(0, 16));
      }

      setAiSuccessMessage(`Briefing autocompletado com sucesso via Gemini API! (${suggestion.source || 'gemini-3.8-flash'})`);
      setTimeout(() => setAiSuccessMessage(null), 6000);
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar sugestão via IA. Tente novamente.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) newErrors.title = 'O título da demanda é obrigatório.';
    if (!description.trim()) newErrors.description = 'A descrição do objetivo é obrigatória.';
    if (!deadline) newErrors.deadline = 'O prazo de entrega é obrigatório.';
    if (!departmentId) newErrors.departmentId = 'Selecione o departamento solicitante.';
    if (deliveryEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(deliveryEmail.trim())) {
      newErrors.deliveryEmail = 'Informe um e-mail válido.';
    }
    const whatsappDigits = deliveryWhatsapp.replace(/\D/g, '');
    if (deliveryWhatsapp.trim() && (
      !/^\+?[\d\s().-]+$/.test(deliveryWhatsapp.trim())
      || whatsappDigits.length < 10
      || whatsappDigits.length > 15
    )) {
      newErrors.deliveryWhatsapp = 'Informe um número de WhatsApp válido com DDD.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const data: CreativeRequestEditableFields = {
      title: title.trim(),
      description: description.trim(),
      department_id: departmentId,
      priority,
      format,
      deadline: new Date(deadline).toISOString(),
      estimated_hours: Number(estimatedHours) || 8,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      briefing: {
        target_audience: targetAudience.trim() || 'Clientes e prospects do Grupo BV',
        key_message: keyMessage.trim() || title.trim(),
        delivery_email: deliveryEmail.trim(),
        delivery_whatsapp: deliveryWhatsapp.trim(),
        cta_text: ctaText.trim() || 'Saiba mais no site oficial BV',
        specs: request?.briefing.specs || `Formato ${format} com especificações do Grupo BV`,
        mandatory_elements: mandatoryElements.split(',').map(e => e.trim()).filter(Boolean),
        reference_links: request?.briefing.reference_links ?? [],
        campaign_name: request?.briefing.campaign_name,
      },
    };

    try {
      if (request) {
        await onUpdate(request.id, data);
      } else {
        await onCreate({
          ...data,
          requester_id: currentUser.id,
          requester_name: currentUser.name,
          status: 'backlog',
        });
      }
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : `Não foi possível ${request ? 'editar' : 'registrar'} a solicitação.` });
      return;
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={request ? 'Editar Solicitação Criativa' : 'Nova Solicitação Criativa'}
      subtitle={request ? 'Atualize os dados e o briefing da sua solicitação.' : 'Cadastre o briefing estruturado para a equipe de design do Grupo BV.'}
      maxWidth="4xl"
    >
      <div className="space-y-5">
        {/* Gemini AI Smart Briefing Suggestion Bar */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 via-sky-50 to-amber-50 dark:from-[#083181]/25 dark:via-[#083181]/15 dark:to-[#c56a2d]/20 border border-blue-200/90 dark:border-blue-900/60 shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#083181] dark:text-blue-300">
              <Sparkles className="w-4 h-4 text-[#c56a2d]" />
              <span>Automação com Gemini API: Gerar Briefing Inteligente</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-100 dark:bg-[#083181]/40 text-[#083181] dark:text-blue-300 rounded-full font-semibold">
              gemini-3.8-flash
            </span>
          </div>

          <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2.5">
            Digite um tema resumido ou clique em uma das sugestões abaixo para preencher automaticamente título, formato ideal, departamento, CTA, público e elementos obrigatórios.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 mb-2.5">
            <input
              type="text"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="Ex: Campanha para a BV Flores..."
              className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-[#131F3D] border border-blue-200 dark:border-[#1F3057] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#083181]/30 focus:border-[#083181] text-slate-800 dark:text-slate-100"
            />
            <Button
              type="button"
              variant="accent"
              size="sm"
              loading={isAiLoading}
              onClick={() => handleAiSuggest()}
              icon={<Wand2 className="w-3.5 h-3.5" />}
              className="bg-[#c56a2d] hover:bg-[#ad5922] text-white"
            >
              Autocompletar com IA
            </Button>
          </div>

          {/* Quick Idea Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mr-1">Exemplos rápidos:</span>
            {quickIdeas.map((idea, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setAiTopic(idea.topic);
                  handleAiSuggest(idea.topic);
                }}
                className="text-[10px] px-2 py-1 bg-white dark:bg-[#131F3D] hover:bg-blue-100/60 dark:hover:bg-[#1E293B] text-slate-700 dark:text-slate-300 hover:text-[#083181] dark:hover:text-blue-300 font-medium rounded-md border border-blue-200/80 dark:border-[#1F3057] transition-colors cursor-pointer"
              >
                {idea.label}
              </button>
            ))}
          </div>

          {aiSuccessMessage && (
            <div className="mt-2 text-xs font-semibold text-blue-900 dark:text-blue-200 bg-blue-100/80 dark:bg-blue-950/60 p-2 rounded-lg flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-4 h-4 text-[#a0b900]" />
              <span>{aiSuccessMessage}</span>
            </div>
          )}
        </div>

        {/* Regular Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.form && <p role="alert" className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">{errors.form}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Título da Demanda *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
                }}
                placeholder="Ex: Campanha para um dos departamentos BV"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#131F3D] border border-slate-300 dark:border-[#1F3057] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#083181]/30 focus:border-[#083181] text-slate-800 dark:text-slate-100"
              />
              {errors.title && <p className="text-xs text-rose-600 mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Departamento Solicitante *
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#131F3D] border border-slate-300 dark:border-[#1F3057] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#083181]/30 focus:border-[#083181] text-slate-800 dark:text-slate-100"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Formato do Material *
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as AssetFormat)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#131F3D] border border-slate-300 dark:border-[#1F3057] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#083181]/30 focus:border-[#083181] text-slate-800 dark:text-slate-100"
              >
                <option value="social_feed">Post Instagram Feed (1080x1350 4:5)</option>
                <option value="social_stories">Stories & Reels Vertical (1080x1920 9:16)</option>
                <option value="carrossel">Carrossel Educativo Multi-Telas</option>
                <option value="banner_web">Banners Google Ads / Display</option>
                <option value="motion">Vídeo Motion Graphic / Animação</option>
                <option value="landing_page">Design de Landing Page / UI Kit</option>
                <option value="ooh_print">OOH, Outdoors & Painéis de LED</option>
                <option value="ebook">E-book Executivo / Diagramação PDF</option>
                <option value="branding">Identidade Visual & Brindes</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Nível de Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as RequestPriority)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#0A1329] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#083181]/20 focus:border-[#083181] dark:focus:ring-[#a0b900]/30 dark:focus:border-[#a0b900]"
              >
                <option value="low">Baixa (Rotina / Backlog padrão)</option>
                <option value="medium">Média (Planejamento regular)</option>
                <option value="high">Alta (Campanha com data de veiculação fixa)</option>
                <option value="urgent">Urgente / Crítica (Crise ou Diretoria)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Prazo Final de Entrega (SLA) *
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => {
                  setDeadline(e.target.value);
                  if (errors.deadline) setErrors(prev => ({ ...prev, deadline: '' }));
                }}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#0A1329] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#083181]/20 focus:border-[#083181] dark:focus:ring-[#a0b900]/30 dark:focus:border-[#a0b900]"
              />
              {errors.deadline && <p className="text-xs text-rose-600 mt-1">{errors.deadline}</p>}
            </div>
          </div>

          {/* Detailed Briefing Block */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold text-[#083181] dark:text-[#e8dda5] uppercase tracking-wider mb-3">
              Briefing Criativo Estruturado
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição do Objetivo & Contexto *
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
                  }}
                  placeholder="Descreva a finalidade da peça, canais de divulgação e objetivos de negócio..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#0A1329] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#083181]/20 focus:border-[#083181] dark:focus:ring-[#a0b900]/30 dark:focus:border-[#a0b900]"
                />
                {errors.description && <p className="text-xs text-rose-600 mt-1">{errors.description}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Público-Alvo
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="Ex: Correntistas PF, 25-45 anos, perfil investidor"
                    className="w-full px-3.5 py-1.5 text-xs bg-slate-50 dark:bg-[#0A1329] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#083181]/20 focus:border-[#083181] dark:focus:ring-[#a0b900]/30 dark:focus:border-[#a0b900]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Chamada para Ação (CTA)
                  </label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="Ex: Saiba mais"
                    className="w-full px-3.5 py-1.5 text-xs bg-slate-50 dark:bg-[#0A1329] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#083181]/20 focus:border-[#083181] dark:focus:ring-[#a0b900]/30 dark:focus:border-[#a0b900]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Elementos Obrigatórios (Disclaimers, Logos)
                  </label>
                  <input
                    type="text"
                    value={mandatoryElements}
                    onChange={(e) => setMandatoryElements(e.target.value)}
                    placeholder="Ex: Logotipo da marca, informações obrigatórias"
                    className="w-full px-3.5 py-1.5 text-xs bg-slate-50 dark:bg-[#0A1329] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#083181]/20 focus:border-[#083181] dark:focus:ring-[#a0b900]/30 dark:focus:border-[#a0b900]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Ex: Campanha, lançamento, sazonal"
                    className="w-full px-3.5 py-1.5 text-xs bg-slate-50 dark:bg-[#0A1329] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#083181]/20 focus:border-[#083181] dark:focus:ring-[#a0b900]/30 dark:focus:border-[#a0b900]"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Contato para envio dos arquivos
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      E-mail para envio
                    </label>
                    <input
                      type="email"
                      value={deliveryEmail}
                      onChange={(e) => {
                        setDeliveryEmail(e.target.value);
                        if (errors.deliveryEmail) setErrors((prev) => ({ ...prev, deliveryEmail: '' }));
                      }}
                      placeholder="nome@empresa.com"
                      maxLength={254}
                      className="w-full px-3.5 py-1.5 text-xs bg-slate-50 dark:bg-[#0A1329] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#083181]/20 focus:border-[#083181]"
                    />
                    {errors.deliveryEmail && <p className="text-xs text-rose-600 mt-1">{errors.deliveryEmail}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      WhatsApp para envio
                    </label>
                    <input
                      type="tel"
                      value={deliveryWhatsapp}
                      onChange={(e) => {
                        setDeliveryWhatsapp(e.target.value);
                        if (errors.deliveryWhatsapp) setErrors((prev) => ({ ...prev, deliveryWhatsapp: '' }));
                      }}
                      placeholder="(11) 99999-9999"
                      maxLength={20}
                      className="w-full px-3.5 py-1.5 text-xs bg-slate-50 dark:bg-[#0A1329] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#083181]/20 focus:border-[#083181]"
                    />
                    {errors.deliveryWhatsapp && <p className="text-xs text-rose-600 mt-1">{errors.deliveryWhatsapp}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" icon={<Sparkles className="w-4 h-4" />}>
              {request ? 'Salvar Alterações' : 'Cadastrar Solicitação'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
