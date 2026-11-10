import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { requireAdmin, requireUser } from './auth.js';
import { getPool } from './database.js';

export const departmentsRouter = Router();

departmentsRouter.get('/departments', requireUser, async (_req, res) => {
  try {
    const result = await getPool().query(
      `SELECT id, code, name, manager_name, icon, color, description
       FROM app_departments
       ORDER BY CASE id
         WHEN 'dept-cartoes' THEN 1
         WHEN 'dept-veiculos' THEN 2
         WHEN 'dept-marketing' THEN 3
         WHEN 'dept-imobiliario' THEN 4
         WHEN 'dept-rh' THEN 5
         WHEN 'dept-inovacao' THEN 6
         WHEN 'dept-compliance' THEN 7
         WHEN 'dept-funeraria' THEN 8
         ELSE 9
       END, name`,
    );
    res.json({ departments: result.rows });
  } catch (error) {
    console.error('Erro ao carregar departamentos:', error);
    res.status(503).json({ error: 'Não foi possível carregar os departamentos.' });
  }
});

departmentsRouter.post('/departments', requireUser, requireAdmin, async (req, res) => {
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
