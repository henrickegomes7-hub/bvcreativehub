import { isAssetFormat, PRINT_UNITS, requiresCustomAssetSpecs, requiresPrintDimensions } from '../constants/assetFormats.js';
import type { CreativeRequest, UserProfile } from '../types';

export const REQUIRED_CHECKLIST = [
  'Marca e identidade visual conferidas',
  'Conteúdo e ortografia conferidos',
  'Requisitos do briefing e informações obrigatórias conferidos',
];
export const ROLES = { requester: 'Solicitante', designer: 'Executor', art_director: 'Aprovador', admin: 'Administrador' };

export function canReview(user: Pick<UserProfile, 'id' | 'role'>, request: CreativeRequest): boolean {
  return user.role === 'admin' || (user.role === 'art_director' && request.approver_id === user.id);
}

export function validateRequest(body: any): Record<string, string> {
  const errors: Record<string, string> = {};
  const text = (key: string, value: unknown, max: number, required = false) => {
    if ((required && (typeof value !== 'string' || !value.trim())) ||
        (value !== undefined && (typeof value !== 'string' || value.length > max))) errors[key] = `Informe um texto de até ${max} caracteres.`;
  };
  text('title', body?.title, 255, true);
  text('description', body?.description, 10000, true);
  text('department_id', body?.department_id, 80, true);
  if (!['low','medium','high','urgent'].includes(body?.priority)) errors.priority = 'Selecione a prioridade.';
  if (!isAssetFormat(body?.format)) errors.format = 'Selecione um formato do catálogo.';
  if (typeof body?.deadline !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(body.deadline) || !Number.isFinite(Date.parse(body.deadline)) || new Date(body.deadline).toISOString() !== body.deadline.replace(/(\d{2}:\d{2}:\d{2})Z$/, '$1.000Z')) errors.deadline = 'Informe uma data e hora válidas.';
  if (typeof body?.estimated_hours !== 'number' || !Number.isFinite(body.estimated_hours) || body.estimated_hours < 1 || body.estimated_hours > 1000) errors.estimated_hours = 'Informe de 1 a 1000 horas.';
  const list = (key: string, value: unknown, maxItems: number, maxLength: number) => {
    if (!Array.isArray(value) || value.length > maxItems || value.some(v => typeof v !== 'string' || v.length > maxLength)) errors[key] = `Use até ${maxItems} itens de ${maxLength} caracteres.`;
  };
  list('tags', body?.tags, 30, 100);
  const b = body?.briefing;
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { ...errors, briefing: 'Preencha o briefing.' };
  for (const [key,max] of Object.entries({target_audience:2000,key_message:2000,cta_text:500,specs:2000,campaign_name:255,delivery_email:254,delivery_whatsapp:20})) text('briefing.'+key,b[key],max);
  if (requiresCustomAssetSpecs(body.format)) text('briefing.specs',b.specs,2000,true);
  if (requiresPrintDimensions(body.format)) {
    for (const [key, label] of [['print_width', 'largura'], ['print_height', 'altura']]) {
      const value = b[key];
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        errors['briefing.' + key] = `Informe uma ${label} maior que zero.`;
      }
    }
    if (!PRINT_UNITS.includes(b.print_unit)) errors['briefing.print_unit'] = 'Selecione a unidade de medida.';
  } else if (['print_width', 'print_height', 'print_unit'].some(key => b[key] !== undefined)) {
    errors.briefing = 'As medidas de impressão só se aplicam a formatos físicos.';
  }
  list('briefing.mandatory_elements', b.mandatory_elements ?? [],30,500);
  list('briefing.reference_links', b.reference_links ?? [],20,2000);
  if (Array.isArray(b.reference_links) && b.reference_links.some((url: unknown) => typeof url !== 'string' || !/^https?:\/\/[^\s]+$/i.test(url))) errors['briefing.reference_links']='Use links iniciados por https:// ou http://.';
  if (typeof b.delivery_email !== 'string' || !b.delivery_email.trim()) {
    errors['briefing.delivery_email'] = 'Informe o e-mail para envio.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.delivery_email)) {
    errors['briefing.delivery_email'] = 'Informe um e-mail válido.';
  }
  if (typeof b.delivery_whatsapp !== 'string' || !b.delivery_whatsapp.trim()) {
    errors['briefing.delivery_whatsapp'] = 'Informe o WhatsApp para envio.';
  } else if (!/^\+?[\d\s().-]+$/.test(b.delivery_whatsapp) || !/^\d{10,15}$/.test(b.delivery_whatsapp.replace(/\D/g, ''))) {
    errors['briefing.delivery_whatsapp'] = 'Informe um WhatsApp válido com DDD.';
  }
  const allowed = new Set(['target_audience','key_message','cta_text','specs','campaign_name','delivery_email','delivery_whatsapp','mandatory_elements','reference_links','print_width','print_height','print_unit']);
  if (Object.keys(b).some(key=>!allowed.has(key))) errors.briefing='O briefing contém campos desconhecidos.';
  return errors;
}
