import { Router } from 'express';
import { requireAdmin, requireUser, type AuthenticatedRequest } from './auth.js';
import { getPool } from './database.js';

export const usersRouter = Router();

usersRouter.get('/users', requireUser, requireAdmin, async (_req, res) => {
  try {
    const result = await getPool().query(
      'SELECT id, name, email, role FROM app_users ORDER BY created_at',
    );
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(503).json({ error: 'Não foi possível carregar os usuários.' });
  }
});
