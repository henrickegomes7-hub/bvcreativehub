import { AssetFormat, RequestPriority } from '../types';

export interface DemandSuggestion {
  title: string;
  description: string;
  format: AssetFormat;
  priority: RequestPriority;
  estimated_hours: number;
  target_audience: string;
  key_message: string;
  cta_text: string;
  mandatory_elements: string[];
  tags: string[];
  suggested_department_code: string;
  source?: string;
}

export async function requestGeminiDemandSuggestion(
  topic: string,
  departmentCode?: string,
  formatHint?: string
): Promise<DemandSuggestion> {
  try {
    const res = await fetch('/api/gemini/suggest-demand', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        departmentCode,
        formatHint,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json && json.data) {
        return {
          ...json.data,
          source: json.source || 'gemini-3.8-flash',
        };
      }
    }
  } catch (e) {
    console.warn('Erro ao conectar com /api/gemini/suggest-demand, aplicando fallback local:', e);
  }

  // Fallback local caso o endpoint não esteja acessível
  const lower = topic.toLowerCase();
  let dept = departmentCode || 'CART';
  let fmt: AssetFormat = 'social_feed';
  let hours = 12;
  let priority: RequestPriority = 'medium';

  if (lower.includes('veículo') || lower.includes('carro') || lower.includes('feirão')) {
    dept = 'VEIC';
    fmt = 'ooh_print';
    hours = 20;
    priority = 'high';
  } else if (lower.includes('app') || lower.includes('digital') || lower.includes('motion')) {
    dept = 'INOV';
    fmt = 'motion';
    hours = 18;
  } else if (lower.includes('esg') || lower.includes('relatório')) {
    dept = 'MKTG';
    fmt = 'ebook';
    hours = 30;
  }

  return {
    title: topic.trim() || 'Nova Campanha Institucional BV',
    description: `Criação de material gráfico de alta conversão para ${topic}. A peça deve posicionar os diferenciais do Grupo BV com solidez e transparência.`,
    format: fmt,
    priority,
    estimated_hours: hours,
    target_audience: 'Clientes pessoa física e prospects do Grupo BV',
    key_message: `Condições exclusivas e transparência em cada etapa com o Banco BV.`,
    cta_text: 'Simule online ou acesse o App BV agora mesmo.',
    mandatory_elements: ['Logo Oficial BV', 'Tarja BACEN regulatória', 'Disclaimers de taxa'],
    tags: ['Campanha', 'Performance', 'GrupoBV', dept],
    suggested_department_code: dept,
    source: 'local-intelligent-engine',
  };
}
