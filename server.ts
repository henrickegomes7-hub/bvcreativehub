import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { apiRouter } from './backend/routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProductionLike = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

app.disable('x-powered-by');
if (process.env.VERCEL) app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (isProductionLike) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use(express.json());
app.use('/api', apiRouter);

// Endpoint de Saúde
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    app: 'BV Creative Hub',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
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
