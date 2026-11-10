import { randomBytes, randomInt, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { QueryResultRow } from 'pg';
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
import { logAuthEvent } from './audit.js';
import { getPool, isDatabaseConfigured } from './database.js';

interface UserRow extends QueryResultRow {
  id: string;
  name: string;
  email: string;
  role: 'requester' | 'admin';
  password_hash: string;
}

function hashPassword(password: string): Promise<string> {
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
    res.json({ configured: false, adminSetupRequired: false });
    return;
  }
  try {
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? '';
    const result = await getPool().query<{ admin_exists: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM app_users WHERE role = 'admin' AND email = $1) AS admin_exists",
      [adminEmail],
    );
    res.json({ configured: true, adminSetupRequired: !result.rows[0]?.admin_exists });
  } catch (error) {
    console.error('Erro ao consultar configuração de autenticação:', error);
    res.status(503).json({ error: 'Banco indisponível ou migração ainda não aplicada.' });
  }
});

authRouter.post('/auth/register', authLimiter, async (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (!validCredentials(name, email, password)) {
    logAuthEvent('register_failed', 'failure', { reason: 'invalid_credentials' });
    res.status(400).json({ error: 'Informe nome, e-mail válido e senha com ao menos 12 caracteres.' });
    return;
  }
  if (!isDatabaseConfigured()) {
    res.status(503).json({ error: 'O banco de dados ainda não foi configurado.' });
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    logAuthEvent('register_failed', 'failure', { reason: 'invalid_email' });
    res.status(400).json({ error: 'Informe um e-mail válido.' });
    return;
  }
  if (normalizedEmail === process.env.ADMIN_EMAIL?.trim().toLowerCase()) {
    logAuthEvent('register_failed', 'warning', { reason: 'admin_email_reserved' }, normalizedEmail);
    res.status(403).json({ error: 'Este e-mail é reservado para a conta administrativa.' });
    return;
  }

  try {
    const result = await getPool().query<UserRow>(
      `INSERT INTO app_users (name, email, role, password_hash)
       VALUES ($1, $2, 'requester', $3)
       RETURNING id, name, email, role, password_hash`,
      [name.trim(), normalizedEmail, await hashPassword(password)],
    );
    await createSession(result.rows[0].id, res);
    logAuthEvent('register', 'success', { user_id: result.rows[0].id }, normalizedEmail);
    res.status(201).json({ user: publicUser(result.rows[0]) });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      logAuthEvent('register_failed', 'warning', { reason: 'duplicate_email' }, normalizedEmail);
      res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });
      return;
    }
    console.error('Erro ao criar conta de funcionário:', error);
    logAuthEvent('register_failed', 'failure', { reason: 'database_error' }, normalizedEmail);
    res.status(503).json({ error: 'Não foi possível criar a conta.' });
  }
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
    res.status(503).json({ error: 'Configure ADMIN_EMAIL e uma ADMIN_BOOTSTRAP_TOKEN de ao menos 32 caracteres no servidor.' });
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
    console.error('Erro ao configurar conta administrativa:', error);
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
    res.status(503).json({ error: 'O banco de dados ainda não foi configurado.' });
    return;
  }

  try {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      logAuthEvent('login_failed', 'failure', { reason: 'invalid_email' });
      res.status(400).json({ error: 'Informe um e-mail válido.' });
      return;
    }
    const result = await getPool().query<UserRow>(
      'SELECT id, name, email, role, password_hash FROM app_users WHERE email = $1',
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
    console.error('Erro ao autenticar conta:', error);
    logAuthEvent('login_failed', 'failure', { reason: 'database_error' }, normalizeEmail(email) ?? undefined);
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
    res.status(503).json({ error: 'O banco de dados ainda não foi configurado.' });
    return;
  }
  const gmailClientId = process.env.GMAIL_CLIENT_ID;
  const gmailClientSecret = process.env.GMAIL_CLIENT_SECRET;
  const gmailRefreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const gmailSenderEmail = process.env.GMAIL_SENDER_EMAIL;
  if (!gmailClientId || !gmailClientSecret || !gmailRefreshToken
      || !gmailSenderEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gmailSenderEmail)) {
    logAuthEvent('password_reset_failed', 'failure', { reason: 'gmail_not_configured' }, normalizedEmail);
    res.status(503).json({ error: 'O envio de e-mails não está configurado. Configure as quatro variáveis GMAIL_* no servidor.' });
    return;
  }

  try {
    const result = await getPool().query<{ id: string; email: string }>(
      'SELECT id, email FROM app_users WHERE email = $1',
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

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: gmailClientId,
          client_secret: gmailClientSecret,
          refresh_token: gmailRefreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const tokenPayload: {
        access_token?: unknown;
        error?: unknown;
        error_description?: unknown;
      } = await tokenResponse.json();
      if (!tokenResponse.ok || typeof tokenPayload.access_token !== 'string') {
        await getPool().query(
          'DELETE FROM app_password_resets WHERE user_id = $1 AND token_hash = $2',
          [user.id, pendingTokenHash],
        );
        const oauthError = typeof tokenPayload.error === 'string' ? tokenPayload.error : 'desconhecido';
        const oauthErrorDescription = typeof tokenPayload.error_description === 'string'
          ? tokenPayload.error_description.replace(/[\r\n]/g, ' ').slice(0, 300)
          : 'sem descrição';
        console.error(`Falha ao obter token da Gmail API (HTTP ${tokenResponse.status}; ${oauthError}: ${oauthErrorDescription}).`);
        res.status(503).json({ error: 'Não foi possível enviar o e-mail de redefinição. Tente novamente mais tarde.' });
        return;
      }

      const boundary = `bvcreativehub_${randomUUID()}`;
      const textBody = [
        'Olá!',
        '',
        'Recebemos uma solicitação para redefinir a senha da sua conta no BV Creative Hub.',
        '',
        `Seu código de verificação é: ${code}`,
        '',
        'O código expira em 15 minutos e só pode ser usado uma vez.',
        'Se você não solicitou a redefinição, ignore esta mensagem. Sua senha continuará a mesma.',
        '',
        'Atenciosamente,',
        'Equipe BV Creative Hub',
      ].join('\n');
      const htmlBody = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:32px 16px;background-color:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#14213d;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
      <tr>
        <td style="padding:28px 32px;background:#103b82;color:#ffffff;font-size:20px;font-weight:700;">BV Creative Hub</td>
      </tr>
      <tr>
        <td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#14213d;">Redefinição de senha</h1>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#43536d;">Recebemos uma solicitação para redefinir a senha da sua conta. Use o código abaixo para continuar:</p>
          <div style="padding:18px;text-align:center;background:#f1f5fc;border:1px solid #dce5f3;border-radius:12px;color:#103b82;font-size:32px;font-weight:700;letter-spacing:8px;">${code}</div>
          <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#43536d;">O código expira em <strong>15 minutos</strong> e só pode ser usado uma vez.</p>
          <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#43536d;">Se você não solicitou a redefinição, ignore esta mensagem. Sua senha continuará a mesma.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px;background:#f8faff;border-top:1px solid #e8edf5;font-size:12px;line-height:1.5;color:#68768c;">Mensagem automática de segurança do BV Creative Hub. Não responda a este e-mail.</td>
      </tr>
    </table>
  </body>
</html>`;
      const encodeMimeBody = (body: string) => Buffer.from(body, 'utf8')
        .toString('base64')
        .match(/.{1,76}/g)
        ?.join('\r\n') ?? '';
      const encodedSubject = Buffer.from('Código para redefinir sua senha | BV Creative Hub', 'utf8')
        .toString('base64');
      const message = [
        `From: BV Creative Hub <${gmailSenderEmail}>`,
        `To: ${user.email}`,
        `Subject: =?UTF-8?B?${encodedSubject}?=`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: base64',
        '',
        encodeMimeBody(textBody),
        `--${boundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        'Content-Transfer-Encoding: base64',
        '',
        encodeMimeBody(htmlBody),
        `--${boundary}--`,
      ].join('\r\n');
      const emailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenPayload.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: Buffer.from(message, 'utf8').toString('base64url') }),
      });

      if (!emailResponse.ok) {
        await getPool().query(
          'DELETE FROM app_password_resets WHERE user_id = $1 AND token_hash = $2',
          [user.id, pendingTokenHash],
        );
        console.error(`Falha ao enviar e-mail de redefinição via Gmail API (HTTP ${emailResponse.status}).`);
        res.status(503).json({ error: 'Não foi possível enviar o e-mail de redefinição. Tente novamente mais tarde.' });
        return;
      }
    }

    logAuthEvent('password_reset_requested', 'success', { user_registered: Boolean(user) }, normalizedEmail);
    res.json({ message: 'Se o e-mail estiver cadastrado, enviaremos um código de redefinição em instantes.' });
  } catch (error) {
    console.error('Erro ao solicitar redefinição de senha:', error);
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

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<{
      user_id: string;
      code_salt: string;
      code_hash: string;
    }>(
      `SELECT r.user_id, r.code_salt, r.code_hash
       FROM app_password_resets r
       JOIN app_users u ON u.id = r.user_id
       WHERE u.email = $1
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
    await client.query('ROLLBACK');
    console.error('Erro ao validar código de redefinição:', error);
    logAuthEvent('password_reset_failed', 'failure', { reason: 'verification_error' }, normalizedEmail);
    res.status(503).json({ error: 'Não foi possível validar o código.' });
  } finally {
    client.release();
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

  const client = await getPool().connect();
  try {
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

    await client.query('UPDATE app_users SET password_hash = $2 WHERE id = $1', [
      reset.user_id,
      await hashPassword(password),
    ]);
    await client.query('DELETE FROM app_sessions WHERE user_id = $1', [reset.user_id]);
    await client.query('DELETE FROM app_password_resets WHERE user_id = $1', [reset.user_id]);
    await client.query('COMMIT');
    logAuthEvent('password_reset_completed', 'success', { user_id: reset.user_id });
    res.json({ message: 'Senha redefinida com sucesso.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao redefinir senha:', error);
    logAuthEvent('password_reset_failed', 'failure', { reason: 'database_error' });
    res.status(503).json({ error: 'Não foi possível redefinir a senha.' });
  } finally {
    client.release();
  }
});

authRouter.get('/auth/me', requireUser, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
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
    console.error('Erro ao encerrar sessão:', error);
    res.status(503).json({ error: 'Não foi possível encerrar a sessão.' });
  }
});

export { canAccessAdmin, requireUser, requireAdmin };
