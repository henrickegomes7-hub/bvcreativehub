import React, { useState } from 'react';
import { 
  Bell, 
  Search, 
  Plus, 
  Download, 
  CheckCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { UserProfile, NotificationItem } from '../../types';
import { Button } from '../ui/Button';
import { downloadProjectZip } from '../../utils/exportZip';

interface HeaderProps {
  currentUser: UserProfile;
  isAdmin: boolean;
  onLogout: () => void;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  onOpenNewRequest: () => void;
  onSelectRequest?: (requestId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeTabTitle: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  isAdmin,
  onLogout,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onOpenNewRequest,
  onSelectRequest,
  searchQuery,
  onSearchChange,
  activeTabTitle,
  theme,
  onToggleTheme,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleExportZip = async () => {
    setIsExporting(true);
    try {
      await downloadProjectZip();
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const getRoleBadge = (role: UserProfile['role']) => {
    switch (role) {
      case 'creative_manager': return { text: 'Gestora Criativa', bg: 'bg-[#083181]/15 text-[#083181] dark:text-blue-300' };
      case 'art_director': return { text: 'Diretor de Arte', bg: 'bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300' };
      case 'designer': return { text: 'Designer', bg: 'bg-[#a0b900]/20 text-[#627300] dark:text-[#a0b900]' };
      case 'requester': return { text: 'Solicitante', bg: 'bg-[#c56a2d]/20 text-[#c56a2d]' };
      default: return { text: 'Admin', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200' };
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white dark:bg-[#0E172E] border-b border-slate-200 dark:border-[#1F3057] shadow-xs transition-colors">
      {/* Title & Search */}
      <div className="flex items-center gap-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{activeTabTitle}</h1>
        </div>

        {/* Global Search Input */}
        {isAdmin && <div className="relative w-72 md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar demandas (código, título, tag)..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 dark:bg-[#131F3D] border border-slate-200 dark:border-[#1F3057] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#083181]/30 focus:border-[#083181] text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-all"
          />
        </div>}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5">
        {/* Dark / Light Mode Switcher */}
        <button
          onClick={onToggleTheme}
          className="p-2 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg transition-colors"
          aria-label="Alternar tema escuro e claro"
          title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-[#e8dda5]" />
          ) : (
            <Moon className="w-4 h-4 text-[#083181]" />
          )}
        </button>

        {/* Export Code ZIP Button */}
        {isAdmin && <Button
          variant="outline"
          size="sm"
          onClick={handleExportZip}
          loading={isExporting}
          icon={<Download className="w-3.5 h-3.5 text-[#083181] dark:text-[#a0b900]" />}
          title="Baixar projeto completo em ZIP pronto para o VS Code"
          className="hidden sm:inline-flex border-slate-200 dark:border-slate-700 hover:border-[#083181] dark:hover:border-blue-400 text-slate-700 dark:text-slate-200 hover:text-[#083181]"
        >
          Código Fonte (ZIP)
        </Button>}

        {/* Nova Solicitação Button */}
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenNewRequest}
          icon={<Plus className="w-4 h-4" />}
          className="shadow-sm shadow-[#083181]/30"
        >
          Nova Demanda
        </Button>

        {/* Notifications Popover */}
        {isAdmin && <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
            }}
            className="relative p-2 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Notificações"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#c56a2d] text-[10px] font-bold text-white shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#0E172E] border border-slate-200 dark:border-[#1F3057] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-[#131F3D] border-b border-slate-100 dark:border-[#1F3057]">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">Notificações</span>
                  {unreadCount > 0 && (
                    <span className="text-[11px] font-medium bg-[#083181]/15 text-[#083181] dark:text-blue-300 px-2 py-0.5 rounded-full">
                      {unreadCount} novas
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllNotificationsRead}
                    className="text-xs text-[#083181] dark:text-blue-300 hover:underline flex items-center gap-1 font-medium"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Ler todas
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Nenhuma notificação no momento.
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        onMarkNotificationRead(item.id);
                        if (item.request_id && onSelectRequest) {
                          onSelectRequest(item.request_id);
                          setShowNotifications(false);
                        }
                      }}
                      className={`p-3.5 text-left transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                        !item.read ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="shrink-0 mt-0.5">
                          {item.type === 'sla_risk' ? (
                            <AlertTriangle className="w-4 h-4 text-[#c56a2d]" />
                          ) : item.type === 'approval' ? (
                            <Sparkles className="w-4 h-4 text-[#a0b900]" />
                          ) : (
                            <Clock className="w-4 h-4 text-[#083181] dark:text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs ${!item.read ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {item.message}
                          </p>
                          {item.request_code && (
                            <span className="inline-block mt-1 text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-[#131F3D] text-slate-600 dark:text-slate-300 rounded">
                              {item.request_code}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>}

        <div className="flex items-center gap-2 border-l border-slate-200 dark:border-[#1F3057] pl-3">
          <div className="hidden md:block text-right leading-tight">
            <span className="block text-xs font-semibold text-slate-800 dark:text-white">{currentUser.name}</span>
            <span className={`inline-block text-[10px] px-1.5 py-0.2 rounded font-medium ${getRoleBadge(currentUser.role).bg}`}>
              {getRoleBadge(currentUser.role).text}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="p-2 text-slate-500 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
            aria-label="Sair da conta"
            title="Sair da conta"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
