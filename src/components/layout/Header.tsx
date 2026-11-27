import React, { useState } from 'react';
import { 
  Bell, 
  Search, 
  CheckCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  Sun,
  Moon,
  LogOut,
  Menu,
  Plus,
} from 'lucide-react';
import { UserProfile, NotificationItem } from '../../types';
import { Button } from '../ui/Button';
import { ProfileAvatar } from './ProfilePhoto';

interface HeaderProps {
  currentUser: UserProfile;
  isAdmin: boolean;
  onLogout: () => void;
  onOpenProfile: () => void;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  onOpenNewRequest: () => void;
  onSelectRequest?: (requestId: string, item: NotificationItem) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeTabTitle: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenMenu: () => void;
  menuOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  isAdmin,
  onLogout,
  onOpenProfile,
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
  onOpenMenu,
  menuOpen,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getRoleBadge = (role: UserProfile['role']) => {
    switch (role) {
      case 'creative_manager': return { text: 'Gestora Criativa', bg: 'bg-[#083181]/15 text-[#083181] dark:text-blue-300' };
      case 'art_director': return { text: 'Diretor de Arte', bg: 'bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300' };
      case 'designer': return { text: 'Designer', bg: 'bg-[#a0b900]/20 text-[#627300] dark:text-[#a0b900]' };
      case 'requester': return { text: 'Colaborador (a) Solicitante', bg: 'bg-[#c56a2d]/20 text-[#c56a2d]' };
      default: return { text: 'Admin', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200' };
    }
  };

  return (
    <header className="hub-header sticky top-0 z-30 flex min-h-16 flex-wrap items-center justify-between gap-y-2 border-b border-slate-200 bg-white/95 px-3 py-2 transition-colors sm:h-20 sm:flex-nowrap sm:px-6 sm:py-0">
      {/* Title & Search */}
      <div className="order-1 flex min-w-0 flex-1 items-center gap-2 sm:gap-6">
        <button
          id="hub-mobile-menu-toggle"
          type="button"
          onClick={onOpenMenu}
          className="grid size-11 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
          aria-controls="hub-sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">{activeTabTitle}</h1>
        </div>

        {/* Global Search Input */}
        {<div className="relative hidden w-72 lg:block lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            aria-label="Buscar por código, título ou tag"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar demandas (código, título, tag)..."
            className="hub-field w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-[#131F3D] border border-slate-200 dark:border-[#1F3057] rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-all"
          />
        </div>}
      </div>

      {/* Right Actions */}
      <div className="order-2 flex shrink-0 items-center gap-1 sm:gap-2.5">
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

        {currentUser.role === 'requester' && <Button
          variant="primary"
          size="sm"
          onClick={onOpenNewRequest}
          className="min-h-11 min-w-11 shadow-sm shadow-[#083181]/30"
          aria-label="Nova demanda"
        >
          <Plus aria-hidden="true" className="size-5 sm:hidden" />
          <span className="hidden sm:inline">Nova Demanda</span>
        </Button>}

        {/* Notifications Popover */}
        {(isAdmin || currentUser.role === 'requester') && <div className="relative"
          onKeyDown={event => {
            if (event.key === 'Escape' && showNotifications) {
              setShowNotifications(false);
              event.currentTarget.querySelector('button')?.focus();
            }
          }}>
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
            }}
            className="relative grid size-11 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Notificações"
            aria-expanded={showNotifications}
            aria-controls="hub-notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#c56a2d] text-[10px] font-bold text-white shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div id="hub-notifications" className="hub-panel fixed inset-x-3 top-16 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-[#1F3057] dark:bg-[#0E172E] md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-2 md:w-96">
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
                    <button type="button"
                      key={item.id}
                      onClick={() => {
                        onMarkNotificationRead(item.id);
                        if (item.request_id && onSelectRequest) {
                          onSelectRequest(item.request_id, item);
                          setShowNotifications(false);
                        }
                      }}
                      className={`block w-full p-3.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-500 dark:hover:bg-slate-800/60 ${
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
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>}

        <div className="flex items-center gap-2 border-l border-slate-200 dark:border-[#1F3057] pl-3">
          <button type="button" aria-label="Editar foto de perfil" title="Editar foto de perfil"
            onClick={onOpenProfile} className="h-9 w-9 shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2">
            <ProfileAvatar name={currentUser.name} url={currentUser.avatar_url} />
          </button>
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
      {<div className="relative order-3 w-full lg:hidden">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          aria-label="Buscar por código, título ou tag"
            value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar demandas..."
          className="hub-field w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 dark:border-[#1F3057] dark:bg-[#131F3D] dark:text-slate-100"
        />
      </div>}
    </header>
  );
};
