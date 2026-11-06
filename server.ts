import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { apiRouter, requireUser } from './backend/routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
if (process.env.VERCEL) app.set('trust proxy', 1);

app.use(express.json());
app.use('/api', apiRouter);

// Inicialização do cliente Gemini SDK no backend
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY') {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Endpoint de Saúde
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    app: 'BV Creative Hub',
    version: '1.0.0',
    geminiConfigured: Boolean(ai),
    timestamp: new Date().toISOString(),
  });
});

// Endpoint de Automação Criativa com Gemini API
app.post('/api/gemini/suggest-demand', requireUser, async (req: Request, res: Response) => {
  const { topic, departmentCode, formatHint } = req.body || {};

  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({ error: 'O tópico ou ideia da demanda é obrigatório.' });
  }

  // Se o cliente Gemini estiver configurado, executa a chamada com modelo gemini-3.8-flash
  if (ai) {
    try {
      const prompt = `Crie uma sugestão completa e estruturada de demanda de design para o BV Creative Hub a partir da seguinte ideia: "${topic}".
Contexto adicional:
- Departamento sugerido: ${departmentCode || 'Detectar automaticamente de acordo com o tema'}
- Formato preliminar: ${formatHint || 'Sugerir o formato gráfico mais adequado'}

Certifique-se de usar linguagem adequada ao tema e de incluir avisos regulatórios apenas quando forem aplicáveis à demanda.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: 'Você é o Head Criativo e Arquiteto de Briefings do Grupo BV (Banco BV). Sua missão é transformar ideias simples dos solicitantes em briefings completos de design, profissionais e com especificações técnicas e legais claras.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Título claro da campanha ou demanda criativa' },
              description: { type: Type.STRING, description: 'Descrição detalhada dos objetivos de negócio e canais' },
              format: { 
                type: Type.STRING, 
                description: 'social_feed, social_stories, carrossel, banner_web, motion, landing_page, ooh_print, ebook ou branding' 
              },
              priority: { 
                type: Type.STRING, 
                description: 'low, medium, high ou urgent' 
              },
              estimated_hours: { type: Type.NUMBER, description: 'Estimativa de horas de design entre 4 e 40' },
              target_audience: { type: Type.STRING, description: 'Público-alvo qualificado' },
              key_message: { type: Type.STRING, description: 'Mensagem principal' },
              cta_text: { type: Type.STRING, description: 'Chamada para ação assertiva' },
              mandatory_elements: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: 'Elementos regulatórios, disclaimers ou marcas que não podem faltar'
              },
              tags: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: '3 a 5 tags temáticas'
              },
              suggested_department_code: { 
                type: Type.STRING, 
                description: 'PBOA (PLANO BOA VIAGEM), FLORES (BV FLORES), PLAY (BV PLAY), FIN (BV FINANÇAS), SAUDE (BV SAÚDE), PET (BV PET), SBV (SAÚDE BV) ou FUNE (FUNERÁRIA)'
              }
            },
            required: [
              'title',
              'description',
              'format',
              'priority',
              'estimated_hours',
              'target_audience',
              'key_message',
              'cta_text',
              'mandatory_elements',
              'tags',
              'suggested_department_code'
            ],
          },
        },
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        return res.json({ source: 'gemini-3.8-flash', data: parsed });
      }
    } catch (err: any) {
      console.warn('Erro ao chamar Gemini API no servidor, acionando fallback inteligente:', err?.message || err);
      // Cai no fallback abaixo caso haja quota esgotada ou erro de rede
    }
  }

  // Fallback heurístico inteligente especializado no Grupo BV caso a chave não esteja presente no runtime
  const lower = topic.toLowerCase();
  let dept = 'FIN';
  let fmt = 'social_feed';
  let hours = 12;
  let priority = 'medium';
  const mandatory = ['Logotipo da marca', 'Informações obrigatórias da campanha'];

  if (lower.includes('funer') || lower.includes('sepult') || lower.includes('luto')) {
    dept = 'FUNE';
  } else if (lower.includes('bv pet') || lower.includes('pet') || lower.includes('animal') || lower.includes('cachorro') || lower.includes('gato')) {
    dept = 'PET';
  } else if (lower.includes('saúde bv') || lower.includes('saude bv')) {
    dept = 'SBV';
  } else if (lower.includes('bv saúde') || lower.includes('bv saude') || lower.includes('saúde') || lower.includes('saude')) {
    dept = 'SAUDE';
  } else if (lower.includes('flores') || lower.includes('floricultura')) {
    dept = 'FLORES';
  } else if (lower.includes('boa viagem') || lower.includes('viagem') || lower.includes('turismo')) {
    dept = 'PBOA';
  } else if (lower.includes('bv play') || lower.includes('streaming') || lower.includes('entretenimento') || lower.includes('série') || lower.includes('filme')) {
    dept = 'PLAY';
  } else if (lower.includes('finanças') || lower.includes('financas') || lower.includes('financeiro') || lower.includes('crédito') || lower.includes('credito') || lower.includes('cartão') || lower.includes('cartao') || lower.includes('financiamento')) {
    dept = 'FIN';
  } else if (lower.includes('motion') || lower.includes('vídeo') || lower.includes('video')) {
    fmt = 'motion';
  }
  if (lower.includes('urgente') || lower.includes('crise') || lower.includes('diretoria')) priority = 'urgent';

  const fallbackResult = {
    title: topic.length > 5 ? topic.trim() : 'Campanha Institucional Grupo BV',
    description: `Desenvolvimento de peças gráficas com foco em ${topic}. O material deverá comunicar a mensagem da campanha com clareza.`,
    format: fmt,
    priority: priority,
    estimated_hours: hours,
    target_audience: 'Público relacionado ao departamento solicitante',
    key_message: 'Conheça nossos serviços e soluções. Saiba mais.',
    cta_text: 'Saiba mais.',
    mandatory_elements: mandatory,
    tags: ['GrupoBV', 'Campanha', 'Performance', dept],
    suggested_department_code: dept,
  };

  return res.json({ source: 'intelligent-bv-engine', data: fallbackResult });
});

// Em desenvolvimento, monta os middlewares do Vite
async function bootstrap() {
  if (process.env.VERCEL) {
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error('Erro ao montar Vite middleware:', e);
      app.use(express.static(path.join(__dirname, 'dist')));
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BV Creative Hub] Servidor Full-Stack rodando na porta ${PORT}`);
  });
}

void bootstrap();

export default app;
