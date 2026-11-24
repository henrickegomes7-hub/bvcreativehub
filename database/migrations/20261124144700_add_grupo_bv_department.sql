INSERT INTO app_departments (id, code, name, manager_name, icon, color, description)
VALUES (
  'dept-grupo-bv',
  'GBV',
  'GRUPO BV',
  'A definir',
  'Building2',
  '#083181',
  'Departamento solicitante do BV Creative Hub.'
)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  manager_name = EXCLUDED.manager_name,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  description = EXCLUDED.description;
