import { Router } from 'express';
import { requireAdmin, requireUser, type AuthenticatedRequest } from './auth.js';
import { getPool } from './database.js';

export const usersRouter = Router();

usersRouter.get('/users', requireUser, requireAdmin, async (_req, res) => {
  try {
    const result = await getPool().query(
      'SELECT id, name, email, role, active FROM app_users ORDER BY created_at',
    );
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Erro ao listar usuários:');
    res.status(503).json({ error: 'Não foi possível carregar os usuários.' });
  }
});

usersRouter.patch('/users/:id', requireUser, requireAdmin, async (req: AuthenticatedRequest,res)=>{
  const {role,active}=req.body??{};
  if (!/^[a-f0-9-]{36}$/i.test(req.params.id) || req.params.id===req.user!.id || !['requester','designer','art_director'].includes(role) || typeof active!=='boolean') {
    res.status(400).json({error:'Selecione outra conta e uma responsabilidade válida.'}); return;
  }
  let client;
  let failed=false;
  try {
    client=await getPool().connect(); await client.query('BEGIN');
    const result=await client.query("UPDATE app_users SET role=$2,active=$3 WHERE id=$1 AND role<>'admin' RETURNING id,name,email,role,active",[req.params.id,role,active]);
    if(!result.rows[0]){await client.query('ROLLBACK');res.status(404).json({error:'Conta não encontrada.'});return;}
    await client.query('DELETE FROM app_sessions WHERE user_id=$1',[req.params.id]);
    await client.query('DELETE FROM app_password_resets WHERE user_id=$1',[req.params.id]);
    await client.query('COMMIT'); res.json({user:result.rows[0]});
  } catch {failed=true;res.status(503).json({error:'Não foi possível atualizar a conta.'});}
  finally{client?.release(failed);}
});
