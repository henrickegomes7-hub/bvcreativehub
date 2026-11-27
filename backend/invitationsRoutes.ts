import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { requireUser, requireAdmin, normalizeEmail, sessionHash, type AuthenticatedRequest } from './auth.js';
import { getPool } from './database.js';
import { sendMail } from './mail.js';
export const invitationsRouter = Router();
invitationsRouter.use('/invitations',requireUser,requireAdmin);
invitationsRouter.get('/invitations', async (_req,res) => {
  try { res.json({invitations:(await getPool().query('SELECT id,email,role,expires_at,used_at,revoked_at FROM app_invitations ORDER BY created_at DESC LIMIT 200')).rows}); }
  catch { res.status(503).json({error:'Não foi possível consultar os convites.'}); }
});
invitationsRouter.post('/invitations', async (req:AuthenticatedRequest,res) => {
  const email=normalizeEmail(req.body?.email), role=req.body?.role;
  if (!email || !['requester','designer','art_director'].includes(role)) { res.status(400).json({error:'Informe um e-mail e uma responsabilidade válidos.'}); return; }
  const token=randomBytes(32).toString('base64url');
  let id: string | undefined;
  try {
    const url=new URL(process.env.APP_URL ?? '');
    if (!['http:','https:'].includes(url.protocol)) throw new Error();
    if ((await getPool().query('SELECT 1 FROM app_users WHERE email=$1',[email])).rowCount) { res.status(409).json({error:'Este e-mail já possui conta.'}); return; }
    await getPool().query('UPDATE app_invitations SET revoked_at=NOW() WHERE email=$1 AND expires_at<=NOW() AND used_at IS NULL AND revoked_at IS NULL',[email]);
    const result=await getPool().query(`INSERT INTO app_invitations(email,role,token_hash,created_by,expires_at)
      VALUES($1,$2,$3,$4,NOW()+interval '48 hours')
      ON CONFLICT (email) WHERE used_at IS NULL AND revoked_at IS NULL
      DO NOTHING RETURNING id`,[email,role,sessionHash(token),req.user!.id]);
    id=result.rows[0]?.id;
    if(!id){res.status(409).json({error:'Este e-mail já tem um convite pendente. Revogue-o para enviar outro.'});return;}
    url.hash = new URLSearchParams({invitation:token,email}).toString();
    await sendMail(email,'Convite | BV Creative Hub',`Você recebeu um convite para o BV Creative Hub. Confirme sua conta em ${url}. Este convite expira em 48 horas e só pode ser usado uma vez.`);
    res.status(201).json({message:'Convite enviado para o e-mail informado.'});
  } catch {
    if (id) await getPool().query('UPDATE app_invitations SET revoked_at=NOW() WHERE id=$1',[id]).catch(()=>{});
    res.status(503).json({error:'Não foi possível enviar o convite. Tente novamente mais tarde.'});
  }
});
invitationsRouter.delete('/invitations/:id',async(req,res)=>{
  if(!/^[a-f0-9-]{36}$/i.test(req.params.id)){res.status(400).json({error:'Convite inválido.'});return;}
  try { await getPool().query('UPDATE app_invitations SET revoked_at=NOW() WHERE id=$1 AND used_at IS NULL',[req.params.id]);res.status(204).end(); }
  catch {res.status(503).json({error:'Não foi possível revogar o convite.'});}
});
