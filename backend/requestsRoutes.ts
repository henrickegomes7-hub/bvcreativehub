import { randomBytes, randomUUID } from 'node:crypto';
import { Router } from 'express';
import { canAccessAdmin, requireAdmin, requireUser, type AuthenticatedRequest } from './auth.js';
import { getPool } from './database.js';
import { validateRequest, REQUIRED_CHECKLIST } from '../src/utils/requestRules.js';
import { getRequestHistory, requestQueries } from './requestQueries.js';
import { ACCESS_SQL, scope, mayReview, mayProduce } from './permissions.js';

export const requestsRouter = Router();
requestsRouter.use(requestQueries);

export function formatRequestCode(year: string, sequence: string): string {
  return `BV-${year}-${sequence.padStart(3, '0')}`;
}

function validId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

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
  const errors=validateRequest(body);
  if(Object.keys(errors).length){res.status(400).json({error:'Confira os campos indicados.',fields:errors});return;}
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
      const sequence = await client.query<{ year: string; number: string }>(
        `SELECT EXTRACT(YEAR FROM NOW())::text AS year,
                nextval('creative_request_code_seq')::text AS number`,
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
        code: formatRequestCode(sequence.rows[0].year, sequence.rows[0].number),
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
    console.error('Erro ao criar demanda:');
    res.status(503).json({ error: 'Não foi possível criar a demanda.' });
  }
});

requestsRouter.patch('/requests/:id', requireUser, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const body = req.body ?? {};
  if (!req.user || req.user.role !== 'requester') {
    res.status(403).json({ error: 'Somente colaboradores podem editar suas próprias solicitações.' });
    return;
  }
  const errors=validateRequest(body);
  if(!validId(id) || Object.keys(errors).length){res.status(400).json({error:'Confira os campos indicados.',fields:errors});return;}
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
       WHERE id = $1 AND requester_id = $2 AND data->>'status'<>'approved' AND data->>'archived_at' IS NULL
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
    console.error('Erro ao editar demanda:');
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
      `DELETE FROM creative_requests WHERE id = $1 AND requester_id = $2 AND data->>'status'='backlog' AND data->>'archived_at' IS NULL AND NOT EXISTS(SELECT 1 FROM request_events WHERE request_id=$1) RETURNING id`,
      [id, req.user.id],
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Solicitação não encontrada ou sem permissão.' });
      return;
    }
    res.status(204).end();
  } catch (error) {
    console.error('Erro ao excluir demanda:');
    res.status(503).json({ error: 'Não foi possível excluir a solicitação.' });
  }
});


type WorkflowAction = 'status' | 'assignee' | 'approver' | 'comments' | 'approvals' | 'reopen' | 'archive';
async function changeRequest(req: AuthenticatedRequest, res: import('express').Response, action: WorkflowAction) {
  const {id}=req.params, body=req.body??{};
  if(!req.user || !validId(id)){res.status(400).json({error:'Demanda inválida.'});return;}
  let client: import('pg').PoolClient | undefined;
  let failed=false;
  try {
    client=await getPool().connect();await client.query('BEGIN');
    const row=(await client.query(`SELECT data FROM creative_requests WHERE ${ACCESS_SQL} AND id=$4 FOR UPDATE`,[...scope(req),id])).rows[0];
    if(!row){await client.query('ROLLBACK');res.status(404).json({error:'Demanda não encontrada.'});return;}
    const data=row.data, original={status:data.status,deadline:data.deadline,completed_at:data.completed_at,completion_deadline:data.completion_deadline,approval:data.approvals?.at(-1)};
    const now=new Date().toISOString();
    const reject = async (code:number,error:string) => {await client!.query('ROLLBACK');res.status(code).json({error});};
    if(data.archived_at){await reject(409,'Esta demanda está arquivada.');return;}
    if(action==='comments'){
      if(typeof body.content!=='string' || !body.content.trim() || body.content.length>5000){await reject(400,'Use um comentário de 1 a 5000 caracteres.');return;}
      data.comments=[...(data.comments??[]),{id:randomUUID(),request_id:id,user_id:req.user.id,user_name:req.user.name,user_role:req.user.role,content:body.content.trim(),created_at:now}];
    } else if(action==='assignee' || action==='approver'){
      if(!canAccessAdmin(req)){await reject(403,'Somente a administração pode delegar responsabilidades.');return;}
      const field=action==='assignee'?'assigneeId':'approverId';
      const personId=body[field];
      if(personId!==null && (typeof personId!=='string' || !validId(personId))){await reject(400,'Selecione uma conta válida.');return;}
      const person=personId===null?null:(await client.query('SELECT id,name,role FROM app_users WHERE id=$1 AND active FOR SHARE',[personId])).rows[0];
      if(personId!==null && (!person || ![action==='assignee'?'designer':'art_director','admin'].includes(person.role))){await reject(400,'Selecione uma pessoa com a responsabilidade correspondente.');return;}
      data[action+'_id']=person?.id??null;data[action+'_name']=person?.name??null;
    } else if(action==='status'){
      if(!mayProduce(req,data)){await reject(403,'Você não tem permissão para movimentar esta demanda.');return;}
      if(body.status==='approved'){await reject(409,'Para concluir, registre um parecer de aprovação.');return;}
      if(data.status==='approved'){await reject(409,'Reabra a demanda informando o motivo.');return;}
      const next: Record<string,string[]>={backlog:['in_progress'],in_progress:['review'],review:['client_approval','in_progress'],client_approval:['in_progress']};
      if(!next[data.status]?.includes(body.status)){await reject(409,'Transição indisponível nesta etapa.');return;}
      data.status=body.status;
    } else if(action==='approvals'){
      if(!mayReview(req,data)){await reject(403,'Você não tem permissão para aprovar esta demanda.');return;}
      if(!['review','client_approval'].includes(data.status)){await reject(409,'Esta demanda saiu da fila de aprovação. Atualize a fila para continuar.');return;}
      if(!['approved','approved_with_notes','changes_requested'].includes(body.decision) ||
         typeof body.feedback!=='string' || body.feedback.length>5000 ||
         !Array.isArray(body.checklist) || body.checklist.length>50 ||
         body.checklist.some((item:any)=>!item || typeof item.item!=='string' || item.item.length>500 || typeof item.checked!=='boolean') ||
         (body.delivery_reference!==undefined && (typeof body.delivery_reference!=='string' || body.delivery_reference.length>2000))){
        await reject(400,'Confira o parecer e o checklist.');return;
      }
      if(body.decision!=='changes_requested' && !REQUIRED_CHECKLIST.every(item=>body.checklist.some((entry:any)=>entry.item===item && entry.checked))){
        await reject(400,'Confirme todos os itens obrigatórios para aprovar.');return;
      }
      const approval={id:randomUUID(),request_id:id,reviewer_id:req.user.id,reviewer_name:req.user.name,reviewer_role:req.user.role,decision:body.decision,feedback:body.feedback,checklist:body.checklist,delivery_reference:body.delivery_reference??'',version_number:data.current_version??0,created_at:now};
      data.approvals=[...(data.approvals??[]),approval];
      data.status=body.decision==='changes_requested'?'in_progress':'approved';
      if(data.status==='approved'){data.completed_at=now;data.completion_deadline=data.deadline;}
    } else {
      if(!canAccessAdmin(req) && !(action==='reopen' && mayReview(req,data))){await reject(403,'Você não tem permissão para esta ação.');return;}
      if(typeof body.reason!=='string' || !body.reason.trim() || body.reason.length>2000){await reject(400,'Informe o motivo de até 2000 caracteres.');return;}
      if(action==='reopen'){
        if(data.status!=='approved'){await reject(409,'Somente demandas concluídas podem ser reabertas.');return;}
        data.status='in_progress';data.completed_at=null;data.completion_deadline=null;
      } else data.archived_at=now;
    }
    data.updated_at=now;
    await client.query('UPDATE creative_requests SET data=$2 WHERE id=$1',[id,data]);
    if (action !== 'comments') {
      const snapshot = { ...original, after: { status: data.status, assignee_name: data.assignee_name, approver_name: data.approver_name } };
      const reason = action === 'reopen' || action === 'archive' ? body.reason.trim() : '';
      await client.query(
        'INSERT INTO request_events(request_id,actor_id,action,reason,snapshot) VALUES($1,$2,$3,$4,$5)',
        [id, req.user.id, action, reason, snapshot],
      );
    }
    const history = await getRequestHistory(id, client);
    await client.query('COMMIT');res.json({request:{ ...data, history }});
  }catch{failed=true;res.status(503).json({error:'Não foi possível salvar a alteração. Tente novamente.'});}
  finally{client?.release(failed);}
}
for(const action of ['status','assignee','approver'] as const) requestsRouter.patch('/requests/:id/'+action,requireUser,(req,res)=>{void changeRequest(req,res,action);});
for(const action of ['comments','approvals','reopen','archive'] as const) requestsRouter.post('/requests/:id/'+action,requireUser,(req,res)=>{void changeRequest(req,res,action);});
