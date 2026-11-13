import { randomBytes, randomUUID } from 'node:crypto';
import { Router } from 'express';
import { requireAdmin, requireUser, type AuthenticatedRequest } from './auth.js';
import { getPool } from './database.js';

export const requestsRouter = Router();

function validId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function validDeliveryContacts(briefing: Record<string, unknown>): boolean {
  const email = briefing.delivery_email;
  const whatsapp = briefing.delivery_whatsapp;
  const whatsappDigits = typeof whatsapp === 'string' ? whatsapp.replace(/\D/g, '') : '';
  return (email === undefined || email === '' || (
    typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  )) && (whatsapp === undefined || whatsapp === '' || (
    typeof whatsapp === 'string' && whatsapp.length <= 20 && /^\+?[\d\s().-]+$/.test(whatsapp)
    && whatsappDigits.length >= 10 && whatsappDigits.length <= 15
  ));
}

requestsRouter.get('/requests', requireUser, async (req: AuthenticatedRequest, res) => {
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

requestsRouter.post('/requests', requireUser, async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Faça login para continuar.' });
    return;
  }
  if (req.user.role !== 'requester') {
    res.status(403).json({ error: 'Somente colaboradores podem abrir solicitações.' });
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
      || !body.briefing || typeof body.briefing !== 'object' || Array.isArray(body.briefing)
      || !validDeliveryContacts(body.briefing)) {
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
      const requestId = randomUUID();
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
        id: requestId,
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
        'INSERT INTO creative_requests (id, requester_id, code, data) VALUES ($1, $2, $3, $4)',
        [requestId, req.user.id, data.code, data],
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
    res.status(503).json({ error: 'Não foi possível criar a demanda.' });
  }
});

requestsRouter.patch('/requests/:id', requireUser, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const body = req.body ?? {};
  const allowedFormats = [
    'social_feed', 'social_stories', 'carrossel', 'banner_web', 'motion',
    'landing_page', 'ooh_print', 'ebook', 'email_marketing', 'branding',
  ];
  if (!req.user || req.user.role !== 'requester') {
    res.status(403).json({ error: 'Somente colaboradores podem editar suas próprias solicitações.' });
    return;
  }
  if (!validId(id)
      || typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 255
      || typeof body.description !== 'string' || !body.description.trim() || body.description.trim().length > 10_000
      || typeof body.department_id !== 'string' || !body.department_id
      || typeof body.deadline !== 'string' || Number.isNaN(Date.parse(body.deadline))
      || !['low', 'medium', 'high', 'urgent'].includes(body.priority)
      || !allowedFormats.includes(body.format)
      || !Number.isFinite(body.estimated_hours) || body.estimated_hours < 1 || body.estimated_hours > 1000
      || !Array.isArray(body.tags) || body.tags.length > 30 || body.tags.some((tag: unknown) => typeof tag !== 'string')
      || !body.briefing || typeof body.briefing !== 'object' || Array.isArray(body.briefing)
      || !validDeliveryContacts(body.briefing)) {
    res.status(400).json({ error: 'Preencha título, descrição, departamento, prioridade, formato, briefing e prazo válidos.' });
    return;
  }
  try {
    const pool = getPool();
    const department = await pool.query('SELECT 1 FROM app_departments WHERE id = $1', [body.department_id]);
    if (department.rowCount === 0) {
      res.status(400).json({ error: 'Selecione um departamento válido.' });
      return;
    }
    const result = await pool.query(
      `UPDATE creative_requests
       SET data = data || jsonb_build_object(
         'title', $3::text,
         'description', $4::text,
         'department_id', $5::text,
         'priority', $6::text,
         'format', $7::text,
         'deadline', $8::text,
         'estimated_hours', $9::numeric,
         'tags', $10::jsonb,
         'briefing', $11::jsonb,
         'updated_at', NOW()
       )
       WHERE id = $1 AND requester_id = $2
       RETURNING data`,
      [
        id,
        req.user.id,
        body.title.trim(),
        body.description.trim(),
        body.department_id,
        body.priority,
        body.format,
        new Date(body.deadline).toISOString(),
        body.estimated_hours,
        JSON.stringify(body.tags.slice(0, 30).map((tag: string) => tag.trim().slice(0, 100))),
        JSON.stringify(body.briefing),
      ],
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Solicitação não encontrada ou sem permissão.' });
      return;
    }
    res.json({ request: result.rows[0].data });
  } catch (error) {
    console.error('Erro ao editar demanda:', error);
    res.status(503).json({ error: 'Não foi possível editar a solicitação.' });
  }
});

requestsRouter.delete('/requests/:id', requireUser, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  if (!req.user || req.user.role !== 'requester') {
    res.status(403).json({ error: 'Somente colaboradores podem excluir suas próprias solicitações.' });
    return;
  }
  if (!validId(id)) {
    res.status(400).json({ error: 'Solicitação inválida.' });
    return;
  }
  try {
    const result = await getPool().query(
      'DELETE FROM creative_requests WHERE id = $1 AND requester_id = $2 RETURNING id',
      [id, req.user.id],
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Solicitação não encontrada ou sem permissão.' });
      return;
    }
    res.status(204).end();
  } catch (error) {
    console.error('Erro ao excluir demanda:', error);
    res.status(503).json({ error: 'Não foi possível excluir a solicitação.' });
  }
});

requestsRouter.patch('/requests/:id/status', requireUser, requireAdmin, async (req, res) => {
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

requestsRouter.post('/requests/:id/comments', requireUser, async (req: AuthenticatedRequest, res) => {
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

requestsRouter.post('/requests/:id/approvals', requireUser, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { decision, feedback, checklist } = req.body ?? {};
  if (!validId(id) || !['approved', 'approved_with_notes', 'changes_requested'].includes(decision)
      || typeof feedback !== 'string' || feedback.length > 5000
      || !Array.isArray(checklist) || checklist.length > 50
      || checklist.some((item: unknown) => !item || typeof item !== 'object'
        || typeof (item as { item?: unknown }).item !== 'string'
        || (item as { item: string }).item.length > 500
        || typeof (item as { checked?: unknown }).checked !== 'boolean')) {
    res.status(400).json({ error: 'Parecer de aprovação inválido.' });
    return;
  }
  const status = decision === 'changes_requested' ? 'in_progress' : 'approved';
  try {
    const result = await getPool().query(
      `UPDATE creative_requests
       SET data = data || jsonb_build_object(
         'approvals',
         (CASE
           WHEN jsonb_typeof(data->'approvals') = 'array' THEN data->'approvals'
           ELSE '[]'::jsonb
         END) || jsonb_build_array(
           jsonb_build_object(
             'id', $2::text,
             'request_id', $1::text,
             'version_number', CASE
               WHEN COALESCE(data->>'current_version', '') ~ '^[0-9]+$'
                 THEN (data->>'current_version')::int
               ELSE 0
             END,
             'reviewer_id', $3::text,
             'reviewer_name', $4::text,
             'reviewer_role', 'admin',
             'decision', $5::text,
             'feedback', $6::text,
             'checklist', $7::jsonb,
             'created_at', NOW()
           )
         ),
         'status', $8::text,
         'updated_at', NOW()
       )
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
