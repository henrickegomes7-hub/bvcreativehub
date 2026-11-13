import React from 'react';
import { 
  LayoutDashboard, 
  Layers, 
  KanbanSquare, 
  CheckCircle2, 
  CalendarDays, 
  BarChart3, 
  Settings, 
  ShieldCheck,
  ExternalLink
} from 'lucide-react';

export type NavTab = 
  | 'dashboard'
  | 'solicitacoes'
  | 'kanban'
  | 'aprovacoes'
  | 'calendario'
  | 'relatorios'
  | 'configuracoes';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingApprovalsCount: number;
  totalActiveCount: number;
  isAdmin: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  pendingApprovalsCount,
  totalActiveCount,
  isAdmin,
  isOpen,
  onClose,
}) => {
  const adminSections = [
    {
      title: 'PRINCIPAL',
      items: [
        { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
        { id: 'solicitacoes' as NavTab, label: 'Demandas', icon: Layers, badge: totalActiveCount > 0 ? totalActiveCount : undefined },
        { id: 'kanban' as NavTab, label: 'Kanban Criativo', icon: KanbanSquare },
        { id: 'aprovacoes' as NavTab, label: 'Portal de Aprovações', icon: CheckCircle2, badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined, highlight: true },
        { id: 'calendario' as NavTab, label: 'Calendário Editorial', icon: CalendarDays },
      ],
    },
    {
      title: 'GESTÃO & SISTEMA',
      items: [
        { id: 'relatorios' as NavTab, label: 'Relatórios & Produtividade', icon: BarChart3 },
        { id: 'configuracoes' as NavTab, label: 'Configurações & Acessos', icon: Settings },
      ],
    },
  ];
  const navSections = isAdmin ? adminSections : [
    {
      title: 'MEU ESPAÇO',
      items: [
        { id: 'dashboard' as NavTab, label: 'Meu Dashboard', icon: LayoutDashboard },
        { id: 'solicitacoes' as NavTab, label: 'Minhas Solicitações', icon: Layers },
      ],
    },
  ];

  return (
    <div className={`fixed inset-0 z-40 md:relative md:inset-auto md:z-auto ${isOpen ? 'flex' : 'hidden'} md:flex`}>
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/60 md:hidden"
        onClick={onClose}
        aria-label="Fechar menu"
      />
      <aside className="relative z-10 flex h-full w-[min(18rem,85vw)] shrink-0 flex-col border-r border-[#082463] bg-[#05163D] text-slate-300 dark:border-white/10 dark:bg-[#040B1D] select-none md:h-screen md:w-64">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-xs hover:border-white/30 transition-all">
          <img
            src="/assets/aistudio/Logo_plano_BV_PNG_f061e8a5.png"
            alt="Grupo BV"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-white tracking-tight">Creative Hub</span>
            <span className="h-2 w-2 rounded-full bg-[#a0b900] shrink-0" title="Grupo BV" />
          </div>
          <p className="text-[10px] text-slate-400 font-medium truncate">Departamento Criativo BV</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded-lg p-2 text-slate-300 hover:bg-white/10 md:hidden"
          aria-label="Fechar menu"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="px-3 text-[10px] font-semibold text-slate-400/80 uppercase tracking-wider mb-2">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#083181] text-white shadow-sm font-semibold border-l-2 border-[#a0b900]'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#e8dda5]' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white/20 text-[#e8dda5]'
                            : item.highlight
                            ? 'bg-[#c56a2d] text-white shadow-xs'
                            : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Access scope */}
      <div className="p-3 border-t border-white/10 bg-black/20">
        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#a0b900]" />
            <div className="leading-tight">
              <p className="text-[11px] font-medium text-slate-200">
                {isAdmin ? 'Área administrativa' : 'Área do funcionário'}
              </p>
              <p className="text-[10px] text-slate-400">{isAdmin ? 'Acesso exclusivo' : 'Somente seus pedidos'}</p>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-[#a0b900]" />
        </div>
      </div>
      </aside>
    </div>
  );
};
