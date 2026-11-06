UPDATE app_departments
SET code = 'PBOA',
    name = 'PLANO BOA VIAGEM',
    manager_name = 'A definir',
    icon = 'Building2',
    color = '#083181',
    description = 'Departamento solicitante do BV Creative Hub.'
WHERE id = 'dept-cartoes';

UPDATE app_departments
SET code = 'FLORES',
    name = 'BV FLORES',
    manager_name = 'A definir',
    icon = 'Building2',
    color = '#c56a2d',
    description = 'Departamento solicitante do BV Creative Hub.'
WHERE id = 'dept-veiculos';

UPDATE app_departments
SET code = 'PLAY',
    name = 'BV PLAY',
    manager_name = 'A definir',
    icon = 'Building2',
    color = '#a0b900',
    description = 'Departamento solicitante do BV Creative Hub.'
WHERE id = 'dept-marketing';

UPDATE app_departments
SET code = 'FIN',
    name = 'BV FINANÇAS',
    manager_name = 'A definir',
    icon = 'Building2',
    color = '#2563EB',
    description = 'Departamento solicitante do BV Creative Hub.'
WHERE id = 'dept-imobiliario';

UPDATE app_departments
SET code = 'SAUDE',
    name = 'BV SAÚDE',
    manager_name = 'A definir',
    icon = 'Building2',
    color = '#9333EA',
    description = 'Departamento solicitante do BV Creative Hub.'
WHERE id = 'dept-rh';

UPDATE app_departments
SET code = 'PET',
    name = 'BV PET',
    manager_name = 'A definir',
    icon = 'Building2',
    color = '#0D9488',
    description = 'Departamento solicitante do BV Creative Hub.'
WHERE id = 'dept-inovacao';

UPDATE app_departments
SET code = 'SBV',
    name = 'SAÚDE BV',
    manager_name = 'A definir',
    icon = 'Building2',
    color = '#475569',
    description = 'Departamento solicitante do BV Creative Hub.'
WHERE id = 'dept-compliance';

INSERT INTO app_departments (id, code, name, manager_name, icon, color, description)
VALUES ('dept-funeraria', 'FUNE', 'FUNERÁRIA', 'A definir', 'Building2', '#64748B',
        'Departamento solicitante do BV Creative Hub.')
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  manager_name = EXCLUDED.manager_name,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  description = EXCLUDED.description;
