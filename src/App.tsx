import React, { useState, useEffect } from 'react';
import { 
  CreativeRequest, 
  Department, 
  UserProfile, 
  NotificationItem, 
  RequestStatus, 
  RequestVersion,
  RequestComment,
  RequestApproval,
} from './types';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { SolicitacoesView } from './components/solicitacoes/SolicitacoesView';
import { KanbanView } from './components/kanban/KanbanView';
import { AprovacoesView } from './components/aprovacoes/AprovacoesView';
import { CalendarioView } from './components/calendario/CalendarioView';
import { RelatoriosView } from './components/relatorios/RelatoriosView';
import { ConfiguracoesView } from './components/configuracoes/ConfiguracoesView';
import { NovaDemandaModal } from './components/solicitacoes/NovaDemandaModal';
import { DetalheDemandaModal } from './components/solicitacoes/DetalheDemandaModal';
import { AuthView } from './components/auth/AuthView';
import { apiClient, AuthStatus, AuthUser, toUserProfile } from './services/apiClient';

export default function App() {
  const [requests, setRequests] = useState<CreativeRequest[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);

  // Theme Management (Light / Dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bv_creative_hub_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('bv_creative_hub_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const loadData = async (user: AuthUser) => {
    const [requestData, departmentData, userData] = await Promise.all([
      apiClient.getRequests(),
      apiClient.getDepartments(),
      user.role === 'admin' ? apiClient.getUsers() : Promise.resolve({ users: [user] }),
    ]);
    const nextDepartments = departmentData.departments;
    const departmentId = nextDepartments[0]?.id || '';
    setRequests(requestData.requests);
    setDepartments(nextDepartments);
    setUsers(userData.users.map((item) => toUserProfile(item, departmentId)));
    setCurrentUser(toUserProfile(user, departmentId));
    setNotifications([]);
  };

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        const status = await apiClient.getAuthStatus();
        if (!active) return;
        setAuthStatus(status);
        if (!status.configured) return;
        try {
          const { user } = await apiClient.me();
          await loadData(user);
        } catch (error) {
          if (!(error instanceof Error) || (!error.message.includes('login') && !error.message.includes('sessão expirou'))) {
            throw error;
          }
        }
      } catch (error) {
        if (active) {
          setAuthStatus((status) => status ?? { configured: true, adminSetupRequired: false });
          setAuthError(error instanceof Error ? error.message : 'Não foi possível iniciar o site.');
        }
      } finally {
        if (active) setAuthLoading(false);
      }
    };
    void initialize();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const refreshRequests = async () => {
      try {
        const result = await apiClient.getRequests();
        setRequests(result.requests);
      } catch (error) {
        if (error instanceof Error && (error.message.includes('login') || error.message.includes('sessão expirou'))) {
          setCurrentUser(null);
          setRequests([]);
          return;
        }
        console.error('Não foi possível atualizar as solicitações:', error);
      }
    };
    const intervalId = window.setInterval(() => { void refreshRequests(); }, 30_000);
    return () => window.clearInterval(intervalId);
  }, [currentUser?.id]);

  const handleAuth = async (user: AuthUser) => {
    try {
      await loadData(user);
      setAuthError(null);
      setActiveTab(user.role === 'admin' ? 'dashboard' : 'solicitacoes');
      setAuthStatus((status) => status ? { ...status, adminSetupRequired: false } : status);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Não foi possível carregar os dados.');
      throw error;
    }
  };

  const handleLogin = async (email: string, password: string) => {
    const { user } = await apiClient.login(email, password);
    await handleAuth(user);
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    const { user } = await apiClient.register(name, email, password);
    await handleAuth(user);
  };

  const handleBootstrapAdmin = async (name: string, email: string, password: string, token: string) => {
    const { user } = await apiClient.bootstrapAdmin(name, email, password, token);
    await handleAuth(user);
  };

  const handleRequestPasswordReset = async (email: string) => {
    await apiClient.requestPasswordReset(email);
  };

  const handleVerifyPasswordResetCode = async (email: string, code: string) => {
    const { resetToken } = await apiClient.verifyPasswordResetCode(email, code);
    return resetToken;
  };

  const handleCompletePasswordReset = async (resetToken: string, password: string) => {
    await apiClient.completePasswordReset(resetToken, password);
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      setCurrentUser(null);
      setRequests([]);
      setUsers([]);
      setSelectedRequestId(null);
      setIsNewRequestOpen(false);
      setAuthError(null);
      setActiveTab('solicitacoes');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível encerrar a sessão.');
    }
  };

  const updateRequest = (request: CreativeRequest) => {
    setRequests((current) => current.map((item) => item.id === request.id ? request : item));
  };

  const handleCreateRequest = async (newReqData: Omit<CreativeRequest, 'id' | 'code' | 'created_at' | 'updated_at' | 'current_version' | 'versions' | 'comments' | 'approvals'>) => {
    const { request } = await apiClient.createRequest(newReqData);
    setRequests((current) => [request, ...current]);
    setIsNewRequestOpen(false);
  };

  const handleUpdateStatus = async (id: string, status: RequestStatus) => {
    try {
      const { request } = await apiClient.updateStatus(id, status);
      updateRequest(request);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível atualizar o status.');
    }
  };

  const handleAddVersion = async (requestId: string, versionData: Omit<RequestVersion, 'id' | 'request_id' | 'version_number' | 'created_at'>) => {
    try {
      const { request } = await apiClient.addVersion(requestId, versionData);
      updateRequest(request);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível enviar a versão.');
    }
  };

  const handleAddComment = async (requestId: string, commentData: Omit<RequestComment, 'id' | 'request_id' | 'created_at'>) => {
    try {
      const { request } = await apiClient.addComment(requestId, commentData.content);
      updateRequest(request);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível enviar o comentário.');
    }
  };

  const handleSubmitApproval = async (requestId: string, approvalData: Omit<RequestApproval, 'id' | 'request_id' | 'version_number' | 'created_at'>) => {
    try {
      const { request } = await apiClient.submitApproval(requestId, approvalData);
      updateRequest(request);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível registrar o parecer.');
    }
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((items) => items.map((item) => item.id === id ? { ...item, read: true } : item));
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
  };

  const handleSaveDepartment = async (dept: Department) => {
    const { department } = await apiClient.createDepartment(dept);
    setDepartments((current) => [...current, department]);
  };

  if (authLoading) return <div className={`min-h-screen flex items-center justify-center text-sm ${theme === 'light' ? 'bg-white text-[#083181]' : 'bg-[#083181] text-white'}`}>Carregando...</div>;
  if (!currentUser) {
    return (
      <AuthView
        configured={authStatus?.configured ?? false}
        adminSetupRequired={authStatus?.adminSetupRequired ?? false}
        error={authError}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onBootstrapAdmin={handleBootstrapAdmin}
        onRequestPasswordReset={handleRequestPasswordReset}
        onVerifyPasswordResetCode={handleVerifyPasswordResetCode}
        onCompletePasswordReset={handleCompletePasswordReset}
      />
    );
  }

  const isAdmin = currentUser.role === 'admin';
  const visibleTab: NavTab = isAdmin ? activeTab : 'solicitacoes';

  const pendingApprovalsCount = requests.filter(
    (r) => r.status === 'client_approval' || r.status === 'review'
  ).length;

  const activeCount = requests.filter((r) => r.status !== 'approved').length;

  const selectedRequest = requests.find((r) => r.id === selectedRequestId) || null;

  const getTabTitle = (tab: NavTab) => {
    if (!isAdmin) return 'Minhas Solicitações';
    switch (tab) {
      case 'dashboard': return 'Dashboard de Criação';
      case 'solicitacoes': return 'Gerenciamento de Demandas';
      case 'kanban': return 'Quadro Kanban de Produção';
      case 'aprovacoes': return 'Portal de Validação & Aprovação';
      case 'calendario': return 'Calendário Editorial de Entregas';
      case 'relatorios': return 'Relatórios de Produtividade & SLA';
      case 'configuracoes': return 'Configurações do Sistema';
      default: return 'BV Creative Hub';
    }
  };

  return (
    <div className="flex h-screen bg-[#F5F6F8] dark:bg-[#070D1E] text-[#171A19] dark:text-[#F8FAFC] overflow-hidden transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={visibleTab}
        onSelectTab={setActiveTab}
        pendingApprovalsCount={pendingApprovalsCount}
        totalActiveCount={activeCount}
        isAdmin={isAdmin}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          currentUser={currentUser}
          isAdmin={isAdmin}
          onLogout={handleLogout}
          notifications={notifications}
          onMarkNotificationRead={handleMarkNotificationRead}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          onOpenNewRequest={() => setIsNewRequestOpen(true)}
          onSelectRequest={(id) => setSelectedRequestId(id)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeTabTitle={getTabTitle(visibleTab)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {isAdmin && activeTab === 'dashboard' && (
              <DashboardView
                requests={requests}
                departments={departments}
                currentUser={currentUser}
                onSelectRequest={(id) => setSelectedRequestId(id)}
                onNavigateToTab={(tab) => setActiveTab(tab)}
                onOpenNewRequest={() => setIsNewRequestOpen(true)}
              />
            )}

            {(!isAdmin || activeTab === 'solicitacoes') && (
              <SolicitacoesView
                requests={requests}
                departments={departments}
                onSelectRequest={(id) => setSelectedRequestId(id)}
                onOpenNewRequest={() => setIsNewRequestOpen(true)}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            )}

            {isAdmin && activeTab === 'kanban' && (
              <KanbanView
                requests={requests}
                departments={departments}
                currentUser={currentUser}
                onSelectRequest={(id) => setSelectedRequestId(id)}
                onUpdateStatus={handleUpdateStatus}
                onOpenNewRequest={() => setIsNewRequestOpen(true)}
              />
            )}

            {isAdmin && activeTab === 'aprovacoes' && (
              <AprovacoesView
                requests={requests}
                currentUser={currentUser}
                onSubmitApproval={handleSubmitApproval}
                onSelectRequest={(id) => setSelectedRequestId(id)}
              />
            )}

            {isAdmin && activeTab === 'calendario' && (
              <CalendarioView
                requests={requests}
                departments={departments}
                onSelectRequest={(id) => setSelectedRequestId(id)}
                onOpenNewRequest={() => setIsNewRequestOpen(true)}
              />
            )}

            {isAdmin && activeTab === 'relatorios' && (
              <RelatoriosView
                requests={requests}
                departments={departments}
                users={users}
              />
            )}

            {isAdmin && activeTab === 'configuracoes' && (
              <ConfiguracoesView
                departments={departments}
                users={users}
                databaseConfigured={authStatus?.configured ?? false}
                onSaveDepartment={handleSaveDepartment}
              />
            )}
          </div>
        </main>
      </div>

      {/* New Request Modal */}
      <NovaDemandaModal
        isOpen={isNewRequestOpen}
        onClose={() => setIsNewRequestOpen(false)}
        departments={departments}
        currentUser={currentUser}
        onCreate={handleCreateRequest}
      />

      {/* Demand Detail Modal */}
      <DetalheDemandaModal
        request={selectedRequest}
        isOpen={Boolean(selectedRequestId)}
        onClose={() => setSelectedRequestId(null)}
        currentUser={currentUser}
        isAdmin={isAdmin}
        onUpdateStatus={handleUpdateStatus}
        onAddVersion={handleAddVersion}
        onAddComment={handleAddComment}
        onSubmitApproval={handleSubmitApproval}
      />
    </div>
  );
}
