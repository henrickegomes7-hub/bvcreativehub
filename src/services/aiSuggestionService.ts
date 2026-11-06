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
  let dept = departmentCode || 'FIN';
  let fmt: AssetFormat = 'social_feed';
  let hours = 12;
  let priority: RequestPriority = 'medium';

  if (lower.includes('funer') || lower.includes('sepult') || lower.includes('luto')) {
    dept = 'FUNE';
  } else if (lower.includes('bv pet') || lower.includes('pet') || lower.includes('animal') || lower.includes('cachorro') || lower.includes('gato')) {
    dept = 'PET';
  } else if (lower.includes('saúde bv') || lower.includes('saude bv')) {
    dept = 'SBV';
  } else if (lower.includes('bv saúde') || lower.includes('bv saude') || lower.includes('saúde') || lower.includes('saude') || lower.includes('plano de saúde')) {
    dept = 'SAUDE';
  } else if (lower.includes('flores') || lower.includes('floricultura')) {
    dept = 'FLORES';
  } else if (lower.includes('boa viagem') || lower.includes('viagem') || lower.includes('turismo')) {
    dept = 'PBOA';
  } else if (lower.includes('bv play') || lower.includes('streaming') || lower.includes('entretenimento') || lower.includes('série') || lower.includes('filme')) {
    dept = 'PLAY';
  } else if (lower.includes('finanças') || lower.includes('financas') || lower.includes('financeiro') || lower.includes('crédito') || lower.includes('credito') || lower.includes('cartão') || lower.includes('cartao')) {
    dept = 'FIN';
  } else if (lower.includes('motion') || lower.includes('vídeo') || lower.includes('video')) {
    fmt = 'motion';
  }

  return {
    title: topic.trim() || 'Nova Campanha Institucional BV',
    description: `Criação de material gráfico de alta conversão para ${topic}. A peça deve posicionar os diferenciais do Grupo BV com solidez e transparência.`,
    format: fmt,
    priority,
    estimated_hours: hours,
    target_audience: 'Público definido para a demanda',
    key_message: 'Conheça nossos serviços e soluções. Saiba mais.',
    cta_text: 'Saiba mais.',
    mandatory_elements: ['Logotipo da marca', 'Informações obrigatórias da campanha'],
    tags: ['Campanha', 'Performance', 'GrupoBV', dept],
    suggested_department_code: dept,
    source: 'local-intelligent-engine',
  };
}
