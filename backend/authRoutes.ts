import { randomBytes, randomInt, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { PoolClient, QueryResultRow } from 'pg';
import {
  publicUser,
  normalizeEmail,
  validCredentials,
  validEmailAndPassword,
  readSessionCookie,
  sessionHash,
  requireUser,
  requireAdmin,
  canAccessAdmin,
  type AuthenticatedRequest,
  createSession,
  sessionCookie,
} from './auth.js';
import { sendMail } from './mail.js';
import { logAuthEvent } from './audit.js';
import { databaseErrorCode, ensureDatabaseSchema, getPool, isDatabaseConfigured } from './database.js';

interface UserRow extends QueryResultRow {
  id: string;
  name: string;
  email: string;
  role: 'requester' | 'admin';
  password_hash: string;
}

export function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return deriveKey(password, salt, 64).then((key) => `${salt.toString('hex')}:${key.toString('hex')}`);
}

function deriveKey(password: string, salt: Buffer, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, length, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await deriveKey(password, Buffer.from(saltHex, 'hex'), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export const authRouter = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
});

authRouter.get('/auth/status', async (_req, res) => {
  if (!isDatabaseConfigured()) {
    res.json({ configured: false, adminSetupRequired: false, supportEmail: normalizeEmail(process.env.SUPPORT_EMAIL) });
    return;
  }
  try {
    await ensureDatabaseSchema();
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? '';
    const result = await getPool().query<{ admin_exists: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM app_users WHERE role = 'admin' AND email = $1) AS admin_exists",
      [adminEmail],
    );
    res.json({ configured: true, adminSetupRequired: !result.rows[0]?.admin_exists, supportEmail: normalizeEmail(process.env.SUPPORT_EMAIL) });
  } catch (error) {
    console.error('Erro ao consultar configuração de autenticação:');
    res.status(503).json({ error: 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.' });
  }
});

authRouter.post('/auth/register', authLimiter, async (req, res) => {
  const { name, email, password, invitationToken } = req.body ?? {};
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !validCredentials(name, email, password)) {
    res.status(400).json({ error: 'Informe nome, e-mail válido e senha de 12 a 128 caracteres.' });
    return;
  }
  if (normalizedEmail === normalizeEmail(process.env.ADMIN_EMAIL)) {
    res.status(403).json({ error: 'Este e-mail é reservado para a conta administrativa.' });
    return;
  }
  if (invitationToken === undefined) {
    try {
      await ensureDatabaseSchema();
      const result = await getPool().query(
        `INSERT INTO app_users (name, email, role, password_hash)
         SELECT $1::text, $2::text, 'requester', $3::text
         WHERE NOT EXISTS (
           SELECT 1 FROM app_invitations WHERE email=$2::text AND role IN ('designer','art_director')
             AND used_at IS NULL AND revoked_at IS NULL AND expires_at>NOW()
         )
         ON CONFLICT (email) DO NOTHING RETURNING id`,
        [name.trim(), normalizedEmail, await hashPassword(password)],
      );
      if (!result.rowCount) {
        res.status(409).json({ error: 'Já existe uma conta ou um cadastro iniciado para este e-mail. Tente entrar ou fale com o suporte.' });
        return;
      }
      logAuthEvent('register', 'success', { user_id: result.rows[0].id }, normalizedEmail);
      res.status(201).json({ message: 'Conta criada. Entre com seu e-mail e senha.' });
    } catch (error) {
      console.error('Erro ao cadastrar colaborador:', { code: databaseErrorCode(error) });
      res.status(503).json({ error: 'Não foi possível criar a conta agora. Tente novamente mais tarde.' });
    }
    return;
  }
  if (typeof invitationToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(invitationToken)) {
    res.status(400).json({ error: 'Convite inválido, expirado ou já utilizado.' });
    return;
  }
  let client: PoolClient | undefined;
  let failed = false;
  try {
    await ensureDatabaseSchema();
    const passwordHash = await hashPassword(password);
    client = await getPool().connect();
    await client.query('BEGIN');
    const invitation = await client.query(
      'SELECT * FROM app_invitations WHERE token_hash=$1 AND email=$2 AND expires_at>NOW() AND used_at IS NULL AND revoked_at IS NULL FOR UPDATE',
      [sessionHash(invitationToken), normalizedEmail],
    );
    if (!invitation.rows[0]) {
      await client.query('ROLLBACK');
      res.status(400).json({error:'Convite inválido, expirado ou já utilizado.'}); return;
    }
    await client.query("INSERT INTO app_users(name,email,role,password_hash) VALUES($1,$2,$3,$4)",[name.trim(),normalizedEmail,invitation.rows[0].role,passwordHash]);
    await client.query('UPDATE app_invitations SET used_at=NOW() WHERE id=$1',[invitation.rows[0].id]);
    await client.query('COMMIT');
    res.status(201).json({message:'Conta confirmada. Entre com seu e-mail e senha.'});
  } catch {
    failed = true;
    res.status(409).json({error:'Não foi possível aceitar o convite. Verifique se você já possui uma conta.'});
  } finally { client?.release(failed); }
});

authRouter.post('/auth/bootstrap-admin', authLimiter, async (req, res) => {
  const { name, email, password, bootstrapToken } = req.body ?? {};
  if (!validCredentials(name, email, password) || typeof bootstrapToken !== 'string') {
    logAuthEvent('bootstrap_admin_failed', 'failure', { reason: 'invalid_bootstrap_payload' });
    res.status(400).json({ error: 'Informe os dados da conta e a chave de configuração inicial.' });
    return;
  }
  const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const expectedToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
  if (!expectedEmail || !expectedToken || expectedToken.length < 32) {
    logAuthEvent('bootstrap_admin_failed', 'failure', { reason: 'missing_server_bootstrap_config' });
    res.status(503).json({ error: 'A configuração inicial está indisponível. Contate a administração.' });
    return;
  }
  const normalizedEmail = normalizeEmail(email) ?? '';
  const supplied = Buffer.from(bootstrapToken);
  const expected = Buffer.from(expectedToken);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)
      || normalizedEmail !== expectedEmail) {
    logAuthEvent('bootstrap_admin_failed', 'warning', { reason: 'invalid_bootstrap_credentials' }, normalizedEmail || undefined);
    res.status(403).json({ error: 'E-mail administrativo ou chave inicial inválidos.' });
    return;
  }

  try {
    const result = await getPool().query<UserRow>(
      `INSERT INTO app_users (name, email, role, password_hash)
       VALUES ($1, $2, 'admin', $3)
       RETURNING id, name, email, role, password_hash`,
      [name.trim(), expectedEmail, await hashPassword(password)],
    );
    await createSession(result.rows[0].id, res);
    logAuthEvent('bootstrap_admin', 'success', { user_id: result.rows[0].id }, normalizedEmail);
    res.status(201).json({ user: publicUser(result.rows[0]) });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      logAuthEvent('bootstrap_admin_failed', 'warning', { reason: 'admin_already_exists' }, normalizedEmail);
      res.status(409).json({ error: 'A conta administrativa já foi criada.' });
      return;
    }
    console.error('Erro ao configurar conta administrativa:');
    logAuthEvent('bootstrap_admin_failed', 'failure', { reason: 'database_error' }, normalizedEmail);
    res.status(503).json({ error: 'Não foi possível criar a conta administrativa.' });
  }
});

authRouter.post('/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!validEmailAndPassword(email, password)) {
    logAuthEvent('login_failed', 'failure', { reason: 'invalid_email_or_password' });
    res.status(400).json({ error: 'Informe um e-mail válido e uma senha de ao menos 12 caracteres.' });
    return;
  }
  if (!isDatabaseConfigured()) {
    res.status(503).json({ error: 'Serviço temporariamente indisponível. Contate o suporte.' });
    return;
  }

  try {
    await ensureDatabaseSchema();
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      logAuthEvent('login_failed', 'failure', { reason: 'invalid_email' });
      res.status(400).json({ error: 'Informe um e-mail válido.' });
      return;
    }
    const result = await getPool().query<UserRow>(
      `SELECT id, name, email, role, password_hash,
              ('/api/profile/photo/' || avatar_revision) AS avatar_url
       FROM app_users WHERE email = $1 AND active`,
      [normalizedEmail],
    );
    const user = result.rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      logAuthEvent('login_failed', 'warning', { reason: 'invalid_credentials' }, normalizedEmail);
      res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      return;
    }
    await createSession(user.id, res);
    logAuthEvent('login', 'success', { user_id: user.id }, normalizedEmail);
    res.json({ user: publicUser(user) });
  } catch (error) {
    const code = databaseErrorCode(error);
    console.error('Erro ao autenticar conta:', { code });
    logAuthEvent('login_failed', 'failure', { reason: 'database_error', code }, normalizeEmail(email) ?? undefined);
    res.status(503).json({ error: 'Não foi possível acessar o serviço de autenticação.' });
  }
});

authRouter.post('/auth/password-reset/request', authLimiter, async (req, res) => {
  const { email } = req.body ?? {};
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    logAuthEvent('password_reset_requested', 'failure', { reason: 'invalid_email' });
    res.status(400).json({ error: 'Informe um e-mail válido.' });
    return;
  }
  if (!isDatabaseConfigured()) {
    res.status(503).json({ error: 'Serviço temporariamente indisponível. Contate o suporte.' });
    return;
  }
  try {
    const result = await getPool().query<{ id: string; email: string }>(
      'SELECT id, email FROM app_users WHERE email = $1 AND active',
      [normalizedEmail],
    );
    const user = result.rows[0];
    if (user) {
      const code = randomInt(100_000, 1_000_000).toString();
      const salt = randomBytes(16);
      const codeHash = await deriveKey(code, salt, 64);
      const pendingTokenHash = sessionHash(randomBytes(32).toString('base64url'));
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await getPool().query(
        `INSERT INTO app_password_resets (user_id, token_hash, code_salt, code_hash, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE SET
           token_hash = EXCLUDED.token_hash,
           code_salt = EXCLUDED.code_salt,
           code_hash = EXCLUDED.code_hash,
           attempts = 0,
           expires_at = EXCLUDED.expires_at,
           code_verified_at = NULL,
           created_at = NOW()`,
        [user.id, pendingTokenHash, salt.toString('hex'), codeHash.toString('hex'), expiresAt],
      );

      try {
        await sendMail(user.email, 'Redefinição de senha | BV Creative Hub', `Seu código é ${code}. Expira em 15 minutos. Se você não solicitou esta alteração, ignore esta mensagem.`);
      } catch {
        await getPool().query('DELETE FROM app_password_resets WHERE user_id=$1 AND token_hash=$2',[user.id,pendingTokenHash]);
        throw new Error('MAIL_FAILED');
      }
    }

    logAuthEvent('password_reset_requested', 'success', { user_registered: Boolean(user) }, normalizedEmail);
    res.json({ message: 'Se o e-mail estiver cadastrado, enviaremos um código de redefinição em instantes.' });
  } catch (error) {
    console.error('Erro ao solicitar redefinição de senha:');
    logAuthEvent('password_reset_failed', 'failure', { reason: 'database_or_mail_error' }, normalizedEmail);
    res.status(503).json({ error: 'Não foi possível solicitar a redefinição de senha.' });
  }
});

authRouter.post('/auth/password-reset/verify', authLimiter, async (req, res) => {
  const { email, code } = req.body ?? {};
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    logAuthEvent('password_reset_failed', 'failure', { reason: 'invalid_reset_payload' });
    res.status(400).json({ error: 'Informe o e-mail e o código de seis dígitos.' });
    return;
  }

  let client: PoolClient | undefined;
  let discardClient = false;
  try {
    client = await getPool().connect();
    await client.query('BEGIN');
    const result = await client.query<{
      user_id: string;
      code_salt: string;
      code_hash: string;
    }>(
      `SELECT r.user_id, r.code_salt, r.code_hash
       FROM app_password_resets r
       JOIN app_users u ON u.id = r.user_id
       WHERE u.email = $1 AND u.active
         AND r.expires_at > NOW()
         AND r.code_verified_at IS NULL
         AND r.attempts < 5
       FOR UPDATE OF r`,
      [normalizedEmail],
    );
    const reset = result.rows[0];
    if (!reset) {
      await client.query('COMMIT');
      logAuthEvent('password_reset_failed', 'warning', { reason: 'invalid_or_expired_code' }, normalizedEmail);
      res.status(400).json({ error: 'Código inválido ou expirado. Solicite um novo código.' });
      return;
    }

    const expected = Buffer.from(reset.code_hash, 'hex');
    const actual = await deriveKey(code, Buffer.from(reset.code_salt, 'hex'), expected.length);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      await client.query(
        'UPDATE app_password_resets SET attempts = attempts + 1 WHERE user_id = $1',
        [reset.user_id],
      );
      await client.query('COMMIT');
      logAuthEvent('password_reset_failed', 'warning', { reason: 'code_mismatch' }, normalizedEmail);
      res.status(400).json({ error: 'Código inválido ou expirado. Solicite um novo código.' });
      return;
    }

    const resetToken = randomBytes(32).toString('base64url');
    await client.query(
      'UPDATE app_password_resets SET token_hash = $2, code_verified_at = NOW() WHERE user_id = $1',
      [reset.user_id, sessionHash(resetToken)],
    );
    await client.query('COMMIT');
    logAuthEvent('password_reset_verified', 'success', { user_id: reset.user_id }, normalizedEmail);
    res.json({ resetToken });
  } catch (error) {
    // Closing the connection also rolls back any open transaction.
    discardClient = true;
    console.error('Erro ao validar código de redefinição:');
    logAuthEvent('password_reset_failed', 'failure', { reason: 'verification_error' }, normalizedEmail);
    res.status(503).json({ error: 'Não foi possível validar o código.' });
  } finally {
    client?.release(discardClient);
  }
});

authRouter.post('/auth/password-reset/complete', authLimiter, async (req, res) => {
  const { resetToken, password } = req.body ?? {};
  if (typeof resetToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(resetToken)
      || typeof password !== 'string' || password.length < 12 || password.length > 128) {
    logAuthEvent('password_reset_failed', 'failure', { reason: 'invalid_reset_token_or_password' });
    res.status(400).json({ error: 'Use um código válido e uma senha de 12 a 128 caracteres.' });
    return;
  }

  let client: PoolClient | undefined;
  let discardClient = false;
  try {
    client = await getPool().connect();
    await client.query('BEGIN');
    const result = await client.query<{ user_id: string }>(
      `SELECT user_id
       FROM app_password_resets
       WHERE token_hash = $1 AND expires_at > NOW() AND code_verified_at IS NOT NULL
       FOR UPDATE`,
      [sessionHash(resetToken)],
    );
    const reset = result.rows[0];
    if (!reset) {
      await client.query('COMMIT');
      logAuthEvent('password_reset_failed', 'warning', { reason: 'reset_token_expired_or_used' });
      res.status(400).json({ error: 'A solicitação expirou ou já foi utilizada. Solicite um novo código.' });
      return;
    }

    await client.query('UPDATE app_users SET password_hash = $2 WHERE id = $1 AND active', [
      reset.user_id,
      await hashPassword(password),
    ]);
    await client.query('DELETE FROM app_sessions WHERE user_id = $1', [reset.user_id]);
    await client.query('DELETE FROM app_password_resets WHERE user_id = $1', [reset.user_id]);
    await client.query('COMMIT');
    logAuthEvent('password_reset_completed', 'success', { user_id: reset.user_id });
    res.json({ message: 'Senha redefinida com sucesso.' });
  } catch (error) {
    discardClient = true;
    console.error('Erro ao redefinir senha:');
    logAuthEvent('password_reset_failed', 'failure', { reason: 'database_error' });
    res.status(503).json({ error: 'Não foi possível redefinir a senha.' });
  } finally {
    client?.release(discardClient);
  }
});

authRouter.get('/auth/me', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    await ensureDatabaseSchema();
    const result = await getPool().query<{ avatar_url: string | null }>(
      "SELECT ('/api/profile/photo/' || avatar_revision) AS avatar_url FROM app_users WHERE id=$1",
      [req.user!.id],
    );
    res.json({ user: { ...req.user, avatar_url: result.rows[0]?.avatar_url ?? null } });
  } catch {
    res.status(503).json({ error: 'Não foi possível carregar o perfil.' });
  }
});

authRouter.post('/auth/logout', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const token = readSessionCookie(req);
    if (token) {
      await getPool().query('DELETE FROM app_sessions WHERE token_hash = $1', [sessionHash(token)]);
      logAuthEvent('logout', 'success', { user_id: req.user?.id }, req.user?.email);
    }
    res.setHeader('Set-Cookie', sessionCookie('', 0));
    res.status(204).end();
  } catch (error) {
    console.error('Erro ao encerrar sessão:');
    res.status(503).json({ error: 'Não foi possível encerrar a sessão.' });
  }
});

export { canAccessAdmin, requireUser, requireAdmin };
