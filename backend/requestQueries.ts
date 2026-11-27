import { Router } from 'express';
import type { PoolClient } from 'pg';
import { getPool } from './database.js';
import { requireUser, type AuthenticatedRequest } from './auth.js';
import { ACCESS_SQL, scope } from './permissions.js';
import { calculateProductivityMetrics } from '../src/utils/workflow.js';
import { toCsv } from '../src/utils/csv.js';

export const requestQueries = Router();
export async function getRequestHistory(requestId: string, client: Pick<PoolClient, 'query'> = getPool()) {
  const { rows } = await client.query(
    `SELECT e.id, e.actor_id, u.name AS actor_name, e.action, e.reason, e.snapshot, e.created_at
     FROM request_events e LEFT JOIN app_users u ON u.id=e.actor_id
     WHERE e.request_id=$1 ORDER BY e.created_at,e.id`,
    [requestId],
  );
  return rows;
}
const SUMMARY = `(data - ARRAY['briefing','description','comments','approvals','versions','history'])
 || jsonb_build_object('has_review',CASE WHEN jsonb_typeof(data->'approvals') = 'array' THEN jsonb_array_length(data->'approvals')>0 ELSE false END,
 'adjustments_requested',COALESCE((data->'approvals'->-1->>'decision')='changes_requested' AND (data->>'status')='in_progress',false),
 'first_time_approved',(CASE WHEN data->>'current_version' ~ '^[0-9]{1,9}$' THEN (data->>'current_version')::int<=1 ELSE true END)
 AND NOT (COALESCE(data->'approvals','[]') @> '[{"decision":"changes_requested"}]'))`;

function filter(req:AuthenticatedRequest) {
  const params: unknown[] = scope(req);
  const conditions=[ACCESS_SQL];
  if(req.query.archived!=='true') conditions.push("data->>'archived_at' IS NULL");
  if (req.query.attention === 'approval') {
    conditions.push("data->>'status' IN ('review','client_approval')", "data->>'archived_at' IS NULL");
  } else if (req.query.attention === 'unassigned' || req.query.attention === 'critical') {
    conditions.push("data->>'status' <> 'approved'", "data->>'archived_at' IS NULL");
    if (req.query.attention === 'unassigned') {
      conditions.push("NULLIF(data->>'assignee_id','') IS NULL");
    } else {
      // Briefing deadlines are stored in UTC ISO format. Normalize optional milliseconds before comparing.
      params.push(new Date(Date.now() + 43_380_000).toISOString());
      conditions.push("data->>'deadline' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{3})?Z$'",
        `regexp_replace(data->>'deadline', '(:[0-9]{2})Z$', '\\1.000Z') COLLATE "C" < $${params.length}`);
    }
  }
  for(const key of ['status','department_id','priority']) {
    const value=req.query[key];
    if(typeof value==='string' && value && value!=='all') {params.push(value);conditions.push(`data->>'${key}'=$${params.length}`);}
  }
  if(typeof req.query.q==='string' && req.query.q.trim()){
    params.push('%'+req.query.q.trim().slice(0,200).replace(/[\\%_]/g,'\\$&')+'%');
    conditions.push(`(code ILIKE $${params.length} OR data->>'title' ILIKE $${params.length} OR data->>'tags' ILIKE $${params.length})`);
  }
  for(const [key,operator] of [['from','>='],['to','<=']]){
    const value=req.query[key];
    if(typeof value==='string' && value){
      if(!Number.isFinite(Date.parse(value))) throw new RangeError('Filtro de data inválido.');
      params.push(new Date(value).toISOString());conditions.push(`created_at ${operator} $${params.length}::timestamptz`);
    }
  }
  return {params,where:conditions.join(' AND ')};
}

requestQueries.get('/requests',requireUser,async(req:AuthenticatedRequest,res)=>{
  try{
    const {params,where}=filter(req);
    const total=await getPool().query(`SELECT COUNT(*)::int AS total FROM creative_requests WHERE ${where}`,params);
    let cursor='';
    if(req.query.cursor){
      const value=JSON.parse(Buffer.from(String(req.query.cursor),'base64url').toString());
      if(!Number.isFinite(Date.parse(value?.created_at)) || !/^[a-f0-9-]{36}$/i.test(value.id)) throw new RangeError('Cursor inválido.');
      params.push(value.created_at,value.id);cursor=` AND (created_at,id)<($${params.length-1}::timestamptz,$${params.length}::uuid)`;
    }
    const limit=Math.min(200,Math.max(1,Math.trunc(Number(req.query.limit))||50));
    params.push(limit+1);
    const rows=(await getPool().query(`SELECT ${SUMMARY} AS data,created_at::text AS created_at,id FROM creative_requests WHERE ${where}${cursor} ORDER BY created_at DESC,id DESC LIMIT $${params.length}`,params)).rows;
    const page=rows.slice(0,limit),last=page.at(-1);
    res.json({requests:page.map(r=>r.data),total:total.rows[0].total,nextCursor:rows.length>limit?Buffer.from(JSON.stringify({created_at:last.created_at,id:last.id})).toString('base64url'):null});
  }catch(error) {const badFilter=error instanceof SyntaxError || error instanceof RangeError;res.status(badFilter?400:503).json({error:badFilter?'Confira os filtros da fila.':'A fila está temporariamente indisponível.'});}
});

requestQueries.get('/requests/metrics',requireUser,async(req:AuthenticatedRequest,res)=>{
  try {
    const {params,where}=filter(req);
    const [rows,departments]=await Promise.all([
      getPool().query(`SELECT ${SUMMARY} AS data FROM creative_requests WHERE ${where}`,params),
      getPool().query('SELECT id,name,color FROM app_departments'),
    ]);
    res.json(calculateProductivityMetrics(rows.rows.map(r=>r.data),departments.rows));
  }catch{res.status(503).json({error:'Indicadores temporariamente indisponíveis.'});}
});
requestQueries.get('/requests/export',requireUser,async(req:AuthenticatedRequest,res)=>{
  try{
    const {params,where}=filter(req);
    const rows=(await getPool().query(`SELECT data, (SELECT name FROM app_departments WHERE id=data->>'department_id') AS department FROM creative_requests WHERE ${where} ORDER BY created_at DESC,id DESC`,params)).rows;
    const csv=toCsv([['Código','Título','Departamento','Solicitante','Responsável','Prioridade','Status','Horas estimadas','Versões','Prazo','Conclusão'],...rows.map(({data,department})=>[data.code,data.title,department,data.requester_name,data.assignee_name,data.priority,data.status,data.estimated_hours,data.current_version,data.deadline,data.completed_at])]);
    res.setHeader('Content-Disposition','attachment; filename="demandas.csv"');res.type('text/csv').send(csv);
  }catch{res.status(503).json({error:'Não foi possível exportar as demandas.'});}
});
requestQueries.get('/requests/notifications', requireUser, async (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'requester') { res.json({ notifications: [] }); return; }
  try {
    const { rows } = await getPool().query(
      `SELECT approval->>'id' AS id, approval->>'decision' AS decision,
              approval->>'created_at' AS created_at, r.id AS request_id, r.code AS request_code,
              r.data->>'title' AS message
       FROM creative_requests r
       CROSS JOIN LATERAL jsonb_array_elements(
         CASE WHEN jsonb_typeof(r.data->'approvals') = 'array' THEN r.data->'approvals' ELSE '[]'::jsonb END
       ) AS items(approval)
       WHERE r.requester_id=$1 AND approval->>'id' IS NOT NULL
         AND approval->>'decision' IN ('changes_requested', 'approved', 'approved_with_notes')
       ORDER BY created_at DESC NULLS LAST, id DESC LIMIT 50`,
      [req.user.id],
    );
    res.json({ notifications: rows.map(({ decision, ...row }) => ({
      ...row,
      type: 'approval',
      title: decision === 'changes_requested' ? 'Ajustes solicitados' : 'Demanda concluída',
      read: false,
    })) });
  } catch {
    res.status(503).json({ error: 'Não foi possível carregar os avisos.' });
  }
});
requestQueries.get('/requests/:id',requireUser,async(req:AuthenticatedRequest,res)=>{
  if(!/^[a-f0-9-]{36}$/i.test(req.params.id)){res.status(400).json({error:'Demanda inválida.'});return;}
  try{
    const row=(await getPool().query(`SELECT data FROM creative_requests WHERE ${ACCESS_SQL} AND id=$4`,[...scope(req),req.params.id])).rows[0];
    if(!row){res.status(404).json({error:'Demanda não encontrada.'});return;}
    const history = await getRequestHistory(req.params.id);
    res.json({request:{...row.data,history}});
  }catch{res.status(503).json({error:'Não foi possível abrir a demanda.'});}
});
