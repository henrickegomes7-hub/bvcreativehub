import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Save, Send } from 'lucide-react';
import { FORMAT_CATEGORIES, PRINT_ASSET_FORMATS, PRINT_UNITS, normalizeAssetFormat, requiresCustomAssetSpecs, requiresPrintDimensions } from '../../constants/assetFormats';
import { ApiError } from '../../services/apiClient';
import type { AssetFormat, CreativeRequest, CreativeRequestEditableFields, Department, RequestPriority, UserProfile } from '../../types';
import { validateRequest } from '../../utils/requestRules';
import { Button } from '../ui/Button';
import { DateTimePicker } from '../ui/DateTimePicker';
import { Modal } from '../ui/Modal';

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
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function initialFields(request: CreativeRequest | null) {
  const format = normalizeAssetFormat(request?.format ?? 'social_feed');
  return {
    title: request?.title ?? '',
    department_id: request?.department_id ?? '',
    priority: request?.priority ?? 'medium',
    format,
    'briefing.specs': requiresCustomAssetSpecs(format) ? request?.briefing.specs ?? '' : '',
    'briefing.print_width': request?.briefing.print_width?.toString() ?? '',
    'briefing.print_height': request?.briefing.print_height?.toString() ?? '',
    'briefing.print_unit': request?.briefing.print_unit ?? ('cm' as const),
    description: request?.description ?? '',
    'briefing.target_audience': request?.briefing.target_audience ?? '',
    'briefing.key_message': request?.briefing.key_message ?? '',
    'briefing.cta_text': request?.briefing.cta_text ?? '',
    'briefing.mandatory_elements': request?.briefing.mandatory_elements?.join(', ') ?? 'Logotipo da marca, Informações obrigatórias da campanha',
    tags: request?.tags.join(', ') ?? 'Campanha, Digital',
    deadline: request ? toLocalDateTime(request.deadline) : '',
    'briefing.delivery_email': request?.briefing.delivery_email ?? '',
    'briefing.delivery_whatsapp': request?.briefing.delivery_whatsapp ?? '',
  };
}

type Fields = ReturnType<typeof initialFields>;

function printMeasurement(value: string) {
  const text = value.trim();
  return /^\d+(?:[.,]\d+)?$/.test(text) ? Number(text.replace(',', '.')) : NaN;
}

function readDraft(key: string): Partial<Fields> | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return Object.fromEntries(Object.keys(initialFields(null))
      .filter(field => typeof value[field] === 'string')
      .map(field => [field, value[field]]));
  } catch {
    return null;
  }
}

const fieldClass = 'hub-field min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 aria-invalid:border-rose-500 dark:border-[#1F3057] dark:bg-[#0A1329] dark:text-slate-100 sm:text-sm';
const sectionClass = 'space-y-3 border-b border-slate-200 pb-5 dark:border-slate-700';
const headingClass = 'text-base font-bold text-slate-900 dark:text-white';
const printUnitLabels = { m: 'Metros', cm: 'Centímetros', mm: 'Milímetros' } as const;

export function NovaDemandaModal({ isOpen, onClose, departments, currentUser, request, onCreate, onUpdate }: NovaDemandaModalProps) {
  const prefix = useId();
  const form = useRef<HTMLFormElement>(null);
  const sending = useRef(false);
  const shouldFocusError = useRef(false);
  const draftKey = 'bv_creative_request_draft:' + currentUser.id;
  const [draft] = useState(() => request ? null : readDraft(draftKey));
  const [fields, setFields] = useState(() => ({ ...initialFields(request), ...draft }));
  const [printOnly, setPrintOnly] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [draftMessage, setDraftMessage] = useState(draft ? 'Rascunho deste navegador recuperado.' : '');
  const departmentId = fields.department_id || departments.find(dept => dept.id === currentUser.department_id)?.id || departments[0]?.id || '';

  function update<Key extends keyof Fields>(key: Key, value: Fields[Key]) {
    setFields(previous => ({ ...previous, [key]: value }));
    setErrors(previous => ({ ...previous, [key]: '', form: '' }));
    setDraftMessage('');
  }

  useEffect(() => {
    if (!shouldFocusError.current || !form.current) return;
    shouldFocusError.current = false;
    const invalid = form.current.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (invalid) {
      const group = invalid.closest('details');
      if (group) group.open = true;
      invalid.focus();
    } else {
      form.current.querySelector<HTMLElement>('[data-form-error]')?.focus();
    }
  }, [errors]);

  function saveDraft() {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ ...fields, department_id: departmentId }));
      setDraftMessage('Rascunho salvo neste navegador.');
    } catch {
      setDraftMessage('Não foi possível salvar o rascunho neste navegador.');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const split = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);
    const title = fields.title.trim();
    const format = fields.format;
    const data: CreativeRequestEditableFields = {
      title,
      description: fields.description.trim(),
      department_id: departmentId,
      priority: fields.priority,
      format,
      deadline: Number.isFinite(Date.parse(fields.deadline)) ? new Date(fields.deadline).toISOString() : fields.deadline,
      estimated_hours: request?.estimated_hours ?? 12,
      tags: split(fields.tags),
      briefing: {
        target_audience: fields['briefing.target_audience'].trim() || 'Clientes e prospects do Grupo BV',
        key_message: fields['briefing.key_message'].trim() || title,
        delivery_email: fields['briefing.delivery_email'].trim(),
        delivery_whatsapp: fields['briefing.delivery_whatsapp'].trim(),
        cta_text: fields['briefing.cta_text'].trim() || 'Saiba mais no site oficial BV',
        specs: requiresCustomAssetSpecs(format)
          ? fields['briefing.specs'].trim()
          : request?.briefing.specs || `Formato ${format} com especificações do Grupo BV`,
        ...(requiresPrintDimensions(format) ? {
          print_width: printMeasurement(fields['briefing.print_width']),
          print_height: printMeasurement(fields['briefing.print_height']),
          print_unit: fields['briefing.print_unit'],
        } : {}),
        mandatory_elements: split(fields['briefing.mandatory_elements']),
        reference_links: request?.briefing.reference_links ?? [],
        campaign_name: request?.briefing.campaign_name,
      },
    };
    const validation = validateRequest(data);
    if (!title) validation.title = 'Informe o título da demanda.';
    if (!data.description) validation.description = 'Descreva o objetivo da demanda.';
    if (!fields.deadline) validation.deadline = 'Selecione o prazo de entrega.';
    shouldFocusError.current = Object.keys(validation).length > 0;
    setErrors(validation);
    if (Object.keys(validation).length) return;

    sending.current = true;
    setBusy(true);
    try {
      if (request) await onUpdate(request.id, data);
      else {
        await onCreate({ ...data, requester_id: currentUser.id, requester_name: currentUser.name, status: 'backlog' });
        try { localStorage.removeItem(draftKey); } catch { /* Browser storage is optional. */ }
      }
      onClose();
    } catch (error) {
      shouldFocusError.current = true;
      setErrors(error instanceof ApiError && error.fields
        ? { form: error.message, ...error.fields }
        : { form: error instanceof Error ? error.message : 'Não foi possível salvar a solicitação.' });
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  const fieldProps = (key: keyof Fields) => ({
    id: prefix + key,
    'aria-invalid': Boolean(errors[key]),
    'aria-describedby': errors[key] ? prefix + key + '-error' : undefined,
  });
  const label = (key: keyof Fields, text: string) => (
    <label htmlFor={prefix + key} className="mb-1 block text-sm font-semibold">{text}</label>
  );
  const errorFor = (key: keyof Fields) => errors[key] && (
    <p id={prefix + key + '-error'} className="mt-1 text-xs text-rose-700 dark:text-rose-300">{errors[key]}</p>
  );
  const input = (key: keyof Fields, text: string, placeholder: string, type = 'text', maxLength?: number, required = false, inputMode?: 'decimal') => (
    <div>
      {label(key, text)}
      <input {...fieldProps(key)} type={type} inputMode={inputMode} value={fields[key]} placeholder={placeholder} maxLength={maxLength} required={required}
        onChange={event => update(key, event.target.value as Fields[typeof key])} className={fieldClass} />
      {errorFor(key)}
    </div>
  );
  const otherErrors = Object.entries(errors).filter(([key, message]) => message && key !== 'form' && !Object.hasOwn(fields, key));
  const changeFormat = (format: AssetFormat) => {
    update('format', format);
    setErrors(previous => ({
      ...previous, 'briefing.specs': '', 'briefing.print_width': '',
      'briefing.print_height': '', 'briefing.print_unit': '',
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!sending.current) onClose(); }}
      title={request ? 'Editar Solicitação Criativa' : 'Nova Solicitação Criativa'} maxWidth="2xl">
      <form ref={form} noValidate onSubmit={handleSubmit} className="space-y-5">
        <p className="text-xs text-slate-600 dark:text-slate-300">Os campos com * são obrigatórios.</p>
        {(errors.form || otherErrors.length > 0) && (
          <div role="alert" tabIndex={-1} data-form-error className="space-y-1 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
            {errors.form && <p>{errors.form}</p>}
            {otherErrors.map(([key, message]) => <p key={key}>{message}</p>)}
          </div>
        )}

        <section aria-labelledby={prefix + 'details'} className={sectionClass}>
          <h4 id={prefix + 'details'} className={headingClass}>Dados da demanda</h4>
          <div>
            {label('title', 'Título da demanda *')}
            <input {...fieldProps('title')} required data-initial-focus value={fields.title} maxLength={255}
              onChange={event => update('title', event.target.value)} placeholder="Ex: Campanha para um dos departamentos BV" className={fieldClass} />
            {errorFor('title')}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              {label('department_id', 'Departamento solicitante *')}
              <select {...fieldProps('department_id')} required value={departmentId}
                onChange={event => update('department_id', event.target.value)} className={fieldClass}>
                <option value="" disabled>Selecione um departamento</option>
                {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>)}
              </select>
              {errorFor('department_id')}
            </div>
            <div>
              {label('format', 'Formato do material *')}
              <select {...fieldProps('format')} required value={fields.format}
                onChange={event => changeFormat(event.target.value as AssetFormat)}
                className={fieldClass}>
                <optgroup label="Impressos e grandes formatos">
                  {PRINT_ASSET_FORMATS.map(option => <option key={option} value={option}>{option}</option>)}
                </optgroup>
                {!printOnly && FORMAT_CATEGORIES.map(category => {
                  const options = category.options.filter(option => !requiresPrintDimensions(option));
                  return options.length > 0 && <optgroup key={category.label} label={category.label}>
                    {options.map(option => <option key={option} value={option}>{option}</option>)}
                  </optgroup>;
                })}
              </select>
              <label className="mt-2 flex min-h-8 items-center gap-2 text-sm">
                <input type="checkbox" checked={printOnly} onChange={event => {
                  const checked = event.target.checked;
                  setPrintOnly(checked);
                  if (checked && !requiresPrintDimensions(fields.format)) changeFormat(PRINT_ASSET_FORMATS[0]);
                }} />
                Mostrar apenas impressos
              </label>
              {errorFor('format')}
            </div>
          </div>
          {requiresPrintDimensions(fields.format) && (
            <fieldset className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <legend className="px-1 text-sm font-semibold">Dimensões finais da peça</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {input('briefing.print_width', 'Largura *', 'Ex: 21', 'text', 18, true, 'decimal')}
                {input('briefing.print_height', 'Altura *', 'Ex: 29,7', 'text', 18, true, 'decimal')}
                <div>
                  {label('briefing.print_unit', 'Unidade *')}
                  <select {...fieldProps('briefing.print_unit')} required className={fieldClass} value={fields['briefing.print_unit']}
                    onChange={event => update('briefing.print_unit', event.target.value as Fields['briefing.print_unit'])}>
                    {PRINT_UNITS.map(unit => (
                      <option key={unit} value={unit}>{printUnitLabels[unit]}</option>
                    ))}
                  </select>
                  {errorFor('briefing.print_unit')}
                </div>
              </div>
            </fieldset>
          )}
          {requiresCustomAssetSpecs(fields.format) && <div>
            {label('briefing.specs', 'Dimensões e especificações *')}
            <textarea {...fieldProps('briefing.specs')} required rows={3} maxLength={2000} value={fields['briefing.specs']}
              onChange={event => update('briefing.specs', event.target.value)} className={fieldClass} />
            {errorFor('briefing.specs')}
          </div>}
          <div>
            {label('priority', 'Prioridade')}
            <select {...fieldProps('priority')} value={fields.priority}
              onChange={event => update('priority', event.target.value as RequestPriority)} className={fieldClass}>
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
            {errorFor('priority')}
          </div>
        </section>

        <section aria-labelledby={prefix + 'briefing'} className={sectionClass}>
          <h4 id={prefix + 'briefing'} className={headingClass}>Briefing</h4>
          <div>
            {label('description', 'Objetivo e contexto *')}
            <textarea {...fieldProps('description')} required rows={4} maxLength={10000} value={fields.description}
              placeholder="Descreva a finalidade da peça, canais de divulgação e objetivos de negócio..."
              onChange={event => update('description', event.target.value)} className={fieldClass} />
            {errorFor('description')}
          </div>
          <details open={request ? true : undefined} className="rounded-lg border border-slate-200 px-3 dark:border-slate-700">
            <summary className="cursor-pointer rounded py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-blue-500">Detalhes opcionais do briefing</summary>
            <div className="grid gap-3 pb-3 sm:grid-cols-2">
              {input('briefing.target_audience', 'Público-alvo', 'Ex: Clientes do Grupo BV', 'text', 2000)}
              {input('briefing.key_message', 'Mensagem principal', 'Ex: Conheça os benefícios da campanha', 'text', 2000)}
              {input('briefing.cta_text', 'Chamada para ação', 'Ex: Saiba mais', 'text', 500)}
              {input('briefing.mandatory_elements', 'Elementos obrigatórios da peça', 'Separe por vírgulas')}
              {input('tags', 'Tags', 'Separe por vírgulas')}
            </div>
          </details>
        </section>

        <section aria-labelledby={prefix + 'delivery'} className={sectionClass}>
          <h4 id={prefix + 'delivery'} className={headingClass}>Entrega</h4>
          <div>
            {label('deadline', 'Prazo de entrega *')}
            <DateTimePicker {...fieldProps('deadline')} value={fields.deadline}
              onChange={value => update('deadline', value)} />
            {errorFor('deadline')}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {input('briefing.delivery_email', 'E-mail para envio *', 'nome@empresa.com', 'email', 254, true)}
            {input('briefing.delivery_whatsapp', 'WhatsApp para envio *', '(11) 99999-9999', 'tel', 20, true)}
          </div>
        </section>

        {draftMessage && <p role="status" className="text-sm text-slate-600 dark:text-slate-300">{draftMessage}</p>}
        <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose} className="min-h-11">Cancelar</Button>
          {!request && <Button type="button" variant="outline" disabled={busy} onClick={saveDraft}
            icon={<Save aria-hidden="true" className="size-4" />} className="min-h-11">Salvar rascunho</Button>}
          <Button type="submit" loading={busy} icon={<Send aria-hidden="true" className="size-4" />} className="min-h-11">
            {request ? 'Salvar alterações' : 'Cadastrar Solicitação'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
