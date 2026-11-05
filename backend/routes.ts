import { randomBytes, randomUUID, scrypt as scryptCallback, createHash, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { QueryResultRow } from 'pg';
import { getPool, isDatabaseConfigured } from './database';

const SESSION_COOKIE = 'bv_hub_session';
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

interface UserRow extends QueryResultRow {
  id: string;
  name: string;
  email: string;
  role: 'requester' | 'admin';
  password_hash: string;
}

interface AuthenticatedRequest extends Request {
  user?: Omit<UserRow, 'password_hash'>;
}

function publicUser(user: UserRow): Omit<UserRow, 'password_hash'> {
  const { password_hash: _passwordHash, ...safeUser } = user;
  return safeUser;
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

function sessionCookie(value: string, maxAgeSeconds: number): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}${secure}`;
}

function readSessionCookie(req: Request): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  const item = cookieHeader.split(';').map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(`${SESSION_COOKIE}=`));
  return item?.slice(SESSION_COOKIE.length + 1);
}

function sessionHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function requireUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const token = readSessionCookie(req);
    if (!token) {
      res.status(401).json({ error: 'Faça login para continuar.' });
      return;
    }

    const result = await getPool().query<UserRow>(
      `SELECT u.id, u.name, u.email, u.role
       FROM app_sessions s
       JOIN app_users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
      [sessionHash(token)],
    );
    if (!result.rows[0]) {
      res.setHeader('Set-Cookie', sessionCookie('', 0));
      res.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' });
      return;
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Erro ao validar sessão:', error);
    res.status(503).json({ error: 'Não foi possível validar a sessão.' });
  }
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (req.user?.role !== 'admin' || !adminEmail || req.user.email !== adminEmail) {
    res.status(403).json({ error: 'Acesso exclusivo à administração.' });
    return;
  }
  next();
}

function validCredentials(name: unknown, email: unknown, password: unknown) {
  return typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 150
    && typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    && typeof password === 'string' && password.length >= 12 && password.length <= 128;
}

function validEmailAndPassword(email: unknown, password: unknown) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    && typeof password === 'string' && password.length >= 12 && password.length <= 128;
}

async function createSession(userId: string, res: Response) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
  const pool = getPool();
  await pool.query('DELETE FROM app_sessions WHERE expires_at <= NOW()');
  await pool.query(
    'INSERT INTO app_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, sessionHash(token), expiresAt],
  );
  res.setHeader('Set-Cookie', sessionCookie(token, SESSION_LIFETIME_MS / 1000));
}

function validId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export const apiRouter = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
});

apiRouter.get('/auth/status', async (_req, res) => {
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

apiRouter.post('/auth/register', authLimiter, async (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (!validCredentials(name, email, password)) {
    res.status(400).json({ error: 'Informe nome, e-mail válido e senha com ao menos 12 caracteres.' });
    return;
  }
  if (!isDatabaseConfigured()) {
    res.status(503).json({ error: 'O banco de dados ainda não foi configurado.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === process.env.ADMIN_EMAIL?.trim().toLowerCase()) {
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
    res.status(201).json({ user: publicUser(result.rows[0]) });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });
      return;
    }
    console.error('Erro ao criar conta de funcionário:', error);
    res.status(503).json({ error: 'Não foi possível criar a conta.' });
  }
});

apiRouter.post('/auth/bootstrap-admin', authLimiter, async (req, res) => {
  const { name, email, password, bootstrapToken } = req.body ?? {};
  if (!validCredentials(name, email, password) || typeof bootstrapToken !== 'string') {
    res.status(400).json({ error: 'Informe os dados da conta e a chave de configuração inicial.' });
    return;
  }
  const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const expectedToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
  if (!expectedEmail || !expectedToken || expectedToken.length < 32) {
    res.status(503).json({ error: 'Configure ADMIN_EMAIL e uma ADMIN_BOOTSTRAP_TOKEN de ao menos 32 caracteres no servidor.' });
    return;
  }
  const supplied = Buffer.from(bootstrapToken);
  const expected = Buffer.from(expectedToken);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)
      || email.trim().toLowerCase() !== expectedEmail) {
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
    res.status(201).json({ user: publicUser(result.rows[0]) });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'A conta administrativa já foi criada.' });
      return;
    }
    console.error('Erro ao configurar conta administrativa:', error);
    res.status(503).json({ error: 'Não foi possível criar a conta administrativa.' });
  }
});

apiRouter.post('/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!validEmailAndPassword(email, password)) {
    res.status(400).json({ error: 'Informe um e-mail válido e uma senha de ao menos 12 caracteres.' });
    return;
  }
  if (!isDatabaseConfigured()) {
    res.status(503).json({ error: 'O banco de dados ainda não foi configurado.' });
    return;
  }

  try {
    const result = await getPool().query<UserRow>(
      'SELECT id, name, email, role, password_hash FROM app_users WHERE email = $1',
      [email.trim().toLowerCase()],
    );
    const user = result.rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      return;
    }
    await createSession(user.id, res);
    res.json({ user: publicUser(user) });
  } catch (error) {
    console.error('Erro ao autenticar conta:', error);
    res.status(503).json({ error: 'Não foi possível acessar o serviço de autenticação.' });
  }
});

apiRouter.get('/auth/me', requireUser, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

apiRouter.post('/auth/logout', requireUser, async (req, res) => {
  try {
    const token = readSessionCookie(req);
    if (token) {
      await getPool().query('DELETE FROM app_sessions WHERE token_hash = $1', [sessionHash(token)]);
    }
    res.setHeader('Set-Cookie', sessionCookie('', 0));
    res.status(204).end();
  } catch (error) {
    console.error('Erro ao encerrar sessão:', error);
    res.status(503).json({ error: 'Não foi possível encerrar a sessão.' });
  }
});

apiRouter.get('/users', requireUser, requireAdmin, async (_req, res) => {
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

apiRouter.get('/departments', requireUser, async (_req, res) => {
  try {
    const result = await getPool().query(
      `SELECT id, code, name, manager_name, icon, color, description
       FROM app_departments ORDER BY name`,
    );
    res.json({ departments: result.rows });
  } catch (error) {
    console.error('Erro ao carregar departamentos:', error);
    res.status(503).json({ error: 'Não foi possível carregar os departamentos.' });
  }
});

apiRouter.post('/departments', requireUser, requireAdmin, async (req, res) => {
  const { code, name, manager_name: managerName, color } = req.body ?? {};
  if (typeof code !== 'string' || !/^[A-Z0-9]{2,10}$/.test(code.trim().toUpperCase())
      || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 150
      || (managerName !== undefined && (typeof managerName !== 'string' || managerName.length > 150))
      || (color !== undefined && (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)))) {
    res.status(400).json({ error: 'Informe sigla, nome, gestor e cor válidos.' });
    return;
  }
  const department = {
    id: `dept-${randomUUID()}`,
    code: code.trim().toUpperCase(),
    name: name.trim(),
    manager_name: typeof managerName === 'string' && managerName.trim() ? managerName.trim() : 'Gestor Responsável',
    icon: 'Building2',
    color: typeof color === 'string' ? color : '#083181',
    description: `Área de negócio ${name.trim()} do Grupo BV`,
  };
  try {
    await getPool().query(
      `INSERT INTO app_departments (id, code, name, manager_name, icon, color, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [department.id, department.code, department.name, department.manager_name,
        department.icon, department.color, department.description],
    );
    res.status(201).json({ department });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'Já existe um departamento com essa sigla.' });
      return;
    }
    console.error('Erro ao salvar departamento:', error);
    res.status(503).json({ error: 'Não foi possível salvar o departamento.' });
  }
});

apiRouter.get('/requests', requireUser, async (req: AuthenticatedRequest, res) => {
  try {
    const result = req.user?.role === 'admin'
      ? await getPool().query('SELECT data FROM creative_requests ORDER BY created_at DESC')
      : await getPool().query('SELECT data FROM creative_requests WHERE requester_id = $1 ORDER BY created_at DESC', [req.user?.id]);
    res.json({ requests: result.rows.map((row) => row.data) });
  } catch (error) {
    console.error('Erro ao carregar demandas:', error);
    res.status(503).json({ error: 'Não foi possível carregar as demandas.' });
  }
});

apiRouter.post('/requests', requireUser, async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Faça login para continuar.' });
    return;
  }
  const body = req.body ?? {};
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 255
      || typeof body.description !== 'string' || !body.description.trim() || body.description.trim().length > 10_000
      || typeof body.department_id !== 'string' || !body.department_id
      || typeof body.deadline !== 'string' || Number.isNaN(Date.parse(body.deadline))
      || !['low', 'medium', 'high', 'urgent'].includes(body.priority)
      || !['social_feed', 'social_stories', 'carrossel', 'banner_web', 'motion', 'landing_page', 'ooh_print', 'ebook', 'email_marketing', 'branding'].includes(body.format)
      || !Number.isFinite(body.estimated_hours) || body.estimated_hours < 1 || body.estimated_hours > 1000
      || !Array.isArray(body.tags) || body.tags.length > 30 || body.tags.some((tag: unknown) => typeof tag !== 'string')
      || !body.briefing || typeof body.briefing !== 'object' || Array.isArray(body.briefing)) {
    res.status(400).json({ error: 'Preencha título, descrição, departamento, prioridade, formato, briefing e prazo válidos.' });
    return;
  }
  try {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const department = await client.query(
        'SELECT 1 FROM app_departments WHERE id = $1',
        [body.department_id],
      );
      if (department.rowCount === 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Selecione um departamento válido.' });
        return;
      }
      const count = await client.query<{ code: string }>(
        `SELECT 'BV-' || EXTRACT(YEAR FROM NOW())::text || '-' ||
           LPAD(nextval('creative_request_code_seq')::text, 3, '0') AS code`,
      );
      const now = new Date().toISOString();
      const data = {
        title: body.title.trim().slice(0, 255),
        description: body.description.trim(),
        department_id: body.department_id,
        priority: body.priority,
        format: body.format,
        deadline: body.deadline,
        estimated_hours: body.estimated_hours,
        tags: body.tags.slice(0, 30).map((tag: string) => tag.slice(0, 100)),
        briefing: body.briefing,
        id: randomUUID(),
        code: count.rows[0].code,
        requester_id: req.user.id,
        requester_name: req.user.name,
        status: 'backlog',
        assignee_id: undefined,
        assignee_name: undefined,
        created_at: now,
        updated_at: now,
        current_version: 0,
        versions: [],
        comments: [],
        approvals: [],
      };
      await client.query(
        'INSERT INTO creative_requests (requester_id, code, data) VALUES ($1, $2, $3)',
        [req.user.id, data.code, data],
      );
      await client.query('COMMIT');
      res.status(201).json({ request: data });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao criar demanda:', error);
    res.status(503).json({ error: 'Não foi possível registrar a demanda.' });
  }
});

apiRouter.patch('/requests/:id/status', requireUser, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body ?? {};
  const allowedStatuses = ['backlog', 'in_progress', 'review', 'client_approval', 'approved'];
  if (!validId(id) || !allowedStatuses.includes(status)) {
    res.status(400).json({ error: 'Demanda ou status inválido.' });
    return;
  }
  try {
    const result = await getPool().query(
      `UPDATE creative_requests
       SET data = jsonb_set(data, '{status}', to_jsonb($2::text), true)
           || jsonb_build_object('updated_at', NOW())
       WHERE id = $1
       RETURNING data`,
      [id, status],
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Demanda não encontrada.' });
      return;
    }
    res.json({ request: result.rows[0].data });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(503).json({ error: 'Não foi possível atualizar o status.' });
  }
});

apiRouter.post('/requests/:id/comments', requireUser, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const content = req.body?.content;
  if (!req.user || !validId(id) || typeof content !== 'string' || !content.trim() || content.length > 5000) {
    res.status(400).json({ error: 'Comentário inválido.' });
    return;
  }
  try {
    const result = await getPool().query(
      `UPDATE creative_requests
       SET data = jsonb_set(
         data,
         '{comments}',
         COALESCE(data->'comments', '[]'::jsonb) || $2::jsonb,
         true
       ) || jsonb_build_object('updated_at', NOW())
       WHERE id = $1 AND ($3::text = 'admin' OR requester_id = $4)
       RETURNING data`,
      [id, JSON.stringify([{
        id: randomBytes(12).toString('hex'),
        request_id: id,
        user_id: req.user.id,
        user_name: req.user.name,
        user_avatar: '',
        user_role: req.user.role,
        content: content.trim(),
        is_adjustment: req.user.role === 'requester',
        resolved: false,
        created_at: new Date().toISOString(),
      }]), req.user.role, req.user.id],
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Demanda não encontrada ou sem permissão.' });
      return;
    }
    res.json({ request: result.rows[0].data });
  } catch (error) {
    console.error('Erro ao registrar comentário:', error);
    res.status(503).json({ error: 'Não foi possível registrar o comentário.' });
  }
});

apiRouter.post('/requests/:id/approvals', requireUser, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { decision, feedback, checklist } = req.body ?? {};
  if (!validId(id) || !['approved', 'approved_with_notes', 'changes_requested'].includes(decision)
      || typeof feedback !== 'string' || !Array.isArray(checklist)) {
    res.status(400).json({ error: 'Parecer de aprovação inválido.' });
    return;
  }
  const status = decision === 'changes_requested' ? 'in_progress' : 'approved';
  try {
    const result = await getPool().query(
      `UPDATE creative_requests
       SET data = jsonb_set(
         jsonb_set(
           data,
           '{approvals}',
           COALESCE(data->'approvals', '[]'::jsonb) || jsonb_build_array(
             jsonb_build_object(
               'id', $2,
               'request_id', id::text,
               'version_number', COALESCE((data->>'current_version')::int, 0),
               'reviewer_id', $3,
               'reviewer_name', $4,
               'reviewer_role', 'admin',
               'decision', $5,
               'feedback', $6,
               'checklist', $7::jsonb,
               'created_at', NOW()
             )
           ),
           true
         ),
         '{status}', to_jsonb($8::text), true
       ) || jsonb_build_object('updated_at', NOW())
       WHERE id = $1
       RETURNING data`,
      [id, randomBytes(12).toString('hex'), (req as AuthenticatedRequest).user?.id,
        (req as AuthenticatedRequest).user?.name, decision, feedback, JSON.stringify(checklist), status],
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Demanda não encontrada.' });
      return;
    }
    res.json({ request: result.rows[0].data });
  } catch (error) {
    console.error('Erro ao salvar parecer:', error);
    res.status(503).json({ error: 'Não foi possível salvar o parecer.' });
  }
});

apiRouter.post('/requests/:id/versions', requireUser, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const input = req.body ?? {};
  if (!validId(id) || typeof input.file_name !== 'string' || typeof input.file_url !== 'string') {
    res.status(400).json({ error: 'Dados da versão inválidos.' });
    return;
  }
  try {
    const result = await getPool().query(
      `UPDATE creative_requests
       SET data = jsonb_set(
         jsonb_set(
           jsonb_set(data, '{versions}', COALESCE(data->'versions', '[]'::jsonb) || jsonb_build_array(
             jsonb_build_object(
               'id', $2,
               'request_id', id::text,
               'version_number', COALESCE((data->>'current_version')::int, 0) + 1,
               'file_name', $3,
               'file_url', $4,
               'file_size', $5,
               'file_type', $6,
               'preview_url', $7,
               'changelog', $8,
               'created_by', $9,
               'created_by_name', $10,
               'created_at', NOW(),
               'dimensions', $11,
               'resolution_dpi', $12,
               'color_profile', $13
             )
           ), true),
           '{current_version}', to_jsonb(COALESCE((data->>'current_version')::int, 0) + 1), true
         ),
         '{status}', to_jsonb(CASE WHEN data->>'status' = 'backlog' THEN 'in_progress' ELSE data->>'status' END), true
       ) || jsonb_build_object('updated_at', NOW())
       WHERE id = $1
       RETURNING data`,
      [id, randomBytes(12).toString('hex'), input.file_name, input.file_url,
        input.file_size ?? '', input.file_type ?? '', input.preview_url ?? input.file_url,
        input.changelog ?? '', (req as AuthenticatedRequest).user?.id,
        (req as AuthenticatedRequest).user?.name, input.dimensions ?? null,
        input.resolution_dpi ?? null, input.color_profile ?? null],
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Demanda não encontrada.' });
      return;
    }
    res.json({ request: result.rows[0].data });
  } catch (error) {
    console.error('Erro ao salvar versão:', error);
    res.status(503).json({ error: 'Não foi possível salvar a versão.' });
  }
});
