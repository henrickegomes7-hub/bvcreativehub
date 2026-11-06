import React, { useState } from 'react';
import { Department, UserProfile } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Settings, 
  Database, 
  Building2, 
  Users, 
  Plus, 
  CheckCircle2, 
  Terminal,
} from 'lucide-react';

interface ConfiguracoesViewProps {
  departments: Department[];
  users: UserProfile[];
  databaseConfigured: boolean;
  onSaveDepartment: (dept: Department) => Promise<void>;
}

export const ConfiguracoesView: React.FC<ConfiguracoesViewProps> = ({
  departments,
  users,
  databaseConfigured,
  onSaveDepartment,
}) => {
  const [activeTab, setActiveTab] = useState<'departments' | 'users' | 'database'>('departments');

  // New Department Modal
  const [showNewDept, setShowNewDept] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptManager, setDeptManager] = useState('');
  const [deptColor, setDeptColor] = useState('#083181');

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim()) return;

    try {
      await onSaveDepartment({
        id: '',
        code: deptCode.trim().toUpperCase(),
        name: deptName.trim(),
        manager_name: deptManager.trim() || 'Gestor Responsável',
        icon: 'Building2',
        color: deptColor,
        description: '',
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível salvar o departamento.');
      return;
    }

    setDeptName('');
    setDeptCode('');
    setDeptManager('');
    setShowNewDept(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-[#0E172E] rounded-xl p-5 border border-slate-200 dark:border-[#1F3057] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-blue-50 dark:bg-[#083181]/30 text-[#083181] dark:text-blue-300 rounded-md">
              <Settings className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight sm:text-lg">
              Configurações & Governança do Hub
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Administração de departamentos do Grupo BV, controle de permissões (RBAC) e status de infraestrutura.
          </p>
        </div>

      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 dark:border-[#1F3057]">
        <button
          onClick={() => setActiveTab('departments')}
          className={`flex shrink-0 items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 transition-all sm:px-4 ${
            activeTab === 'departments'
              ? 'border-[#083181] text-[#083181] dark:border-blue-400 dark:text-blue-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Departamentos do Grupo BV ({departments.length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex shrink-0 items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 transition-all sm:px-4 ${
            activeTab === 'users'
              ? 'border-[#083181] text-[#083181] dark:border-blue-400 dark:text-blue-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Usuários & Permissões ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`flex shrink-0 items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 transition-all sm:px-4 ${
            activeTab === 'database'
              ? 'border-[#083181] text-[#083181] dark:border-blue-400 dark:text-blue-300'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          Banco de Dados
        </button>
      </div>

      {/* Tab: Departments */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500">
              Áreas solicitantes e centros de custo autorizados a abrir demandas criativas.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowNewDept(true)}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Novo Departamento
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="bg-white dark:bg-[#0E172E] p-4 rounded-xl border border-slate-200 dark:border-[#1F3057] shadow-xs space-y-2 hover:border-[#083181] dark:hover:border-blue-400 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: dept.color }}
                    />
                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#131F3D] px-1.5 py-0.5 rounded">
                      {dept.code}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">Ativo</span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{dept.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{dept.description}</p>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                  Responsável: <strong className="text-slate-800 dark:text-slate-200">{dept.manager_name}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-[#1F3057] dark:bg-[#0E172E] md:block">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#131F3D] border-b border-slate-200 dark:border-[#1F3057] text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">E-mail Corporativo</th>
                  <th className="py-3 px-4">Cargo / Função</th>
                  <th className="py-3 px-4">Nível de Permissão (RBAC)</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="py-3 px-4 flex items-center gap-2.5">
                      <img
                        src={user.avatar_url}
                        alt={user.name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <span className="font-bold text-slate-900 dark:text-white">{user.name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">{user.email}</td>
                    <td className="py-3 px-4 text-slate-800 dark:text-slate-200">{user.title}</td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-[#131F3D] text-slate-700 dark:text-slate-300 font-semibold">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="success" size="sm" dot>Ativo</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {users.map((user) => (
              <article
                key={user.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-[#1F3057] dark:bg-[#0E172E]"
              >
                <div className="flex items-center gap-3">
                  <img src={user.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{user.name}</h3>
                    <p className="break-all text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                  </div>
                  <Badge variant="success" size="sm" dot>Ativo</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-300">{user.title}</span>
                  <span className="rounded bg-slate-100 px-2 py-1 font-mono text-[10px] font-semibold text-slate-700 dark:bg-[#131F3D] dark:text-slate-300">
                    {user.role}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Tab: PostgreSQL & Infra */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0E172E] rounded-xl p-5 border border-slate-200 dark:border-[#1F3057] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-[#a0b900]" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Status do PostgreSQL</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Banco privado acessado pelo backend; sessões protegidas por cookie.</p>
                </div>
              </div>

              <Badge variant={databaseConfigured ? 'success' : 'warning'} dot>
                {databaseConfigured ? 'PostgreSQL conectado' : 'Banco não configurado'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <span className="font-bold text-slate-700 block">Variáveis de Ambiente Detectadas</span>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">DATABASE_URL:</span>
                    <span className="text-slate-800">{databaseConfigured ? 'Configurado no servidor' : 'Não configurado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ADMIN_EMAIL:</span>
                    <span className="text-slate-800">Configurado somente no servidor</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <span className="font-bold text-slate-700 block">Arquivos de Migração no Repositório</span>
                <div className="space-y-1 font-mono text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>database/migrations/20261105000000_create_standalone_auth.sql</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-900 text-slate-200 rounded-lg space-y-2 font-mono text-xs">
              <div className="flex items-center gap-2 text-emerald-400">
                <Terminal className="w-4 h-4" />
                <span className="font-bold">Configuração do banco PostgreSQL:</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                # Aplicar a migração no banco configurado em DATABASE_URL:<br />
                <span className="text-white">npm run db:migrate</span><br /><br />
                # Em seguida, configurar as variáveis do servidor e publicar:<br />
                <span className="text-white">DATABASE_URL, ADMIN_EMAIL, ADMIN_BOOTSTRAP_TOKEN</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Departamento */}
      {showNewDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Novo Departamento Solicitante</h3>
            <form onSubmit={handleCreateDept} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Departamento *</label>
                <input
                  type="text"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="Ex: Seguros & Previdência BV"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sigla / Código *</label>
                  <input
                    type="text"
                    value={deptCode}
                    onChange={(e) => setDeptCode(e.target.value)}
                    placeholder="SEGU"
                    maxLength={5}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cor Identificadora</label>
                  <input
                    type="color"
                    value={deptColor}
                    onChange={(e) => setDeptColor(e.target.value)}
                    className="w-full h-8 p-1 bg-slate-50 border border-slate-300 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Gestor Responsável</label>
                <input
                  type="text"
                  value={deptManager}
                  onChange={(e) => setDeptManager(e.target.value)}
                  placeholder="Nome do gestor da área"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowNewDept(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Salvar Departamento
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
