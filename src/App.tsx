import React, { useState, useEffect } from 'react';
import { 
  DashboardMetrics,
  CreativeRequest, 
  CreativeRequestEditableFields,
  Department, 
  UserProfile, 
  NotificationItem, 
  RequestStatus, 
  RequestComment,
  ApprovalInput,
} from './types';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ProfilePhotoModal } from './components/layout/ProfilePhoto';
import { Button } from './components/ui/Button';
import { Modal } from './components/ui/Modal';
import { canReview } from './utils/requestRules';
import { CollaboratorDashboardView } from './components/dashboard/CollaboratorDashboardView';
import { AuthView } from './components/auth/AuthView';
import { apiClient, ApiError, AuthStatus, AuthUser, toUserProfile } from './services/apiClient';

const DashboardView = React.lazy(() => import('./components/dashboard/DashboardView').then(module => ({ default: module.DashboardView })));

const RelatoriosView = React.lazy(() => import('./components/relatorios/RelatoriosView').then(module => ({ default: module.RelatoriosView })));
const SolicitacoesView = React.lazy(() => import('./components/solicitacoes/SolicitacoesView').then(module => ({ default: module.SolicitacoesView })));
const KanbanView = React.lazy(() => import('./components/kanban/KanbanView').then(module => ({ default: module.KanbanView })));
const AprovacoesView = React.lazy(() => import('./components/aprovacoes/AprovacoesView').then(module => ({ default: module.AprovacoesView })));
const CalendarioView = React.lazy(() => import('./components/calendario/CalendarioView').then(module => ({ default: module.CalendarioView })));
const ConfiguracoesView = React.lazy(() => import('./components/configuracoes/ConfiguracoesView').then(module => ({ default: module.ConfiguracoesView })));
const NovaDemandaModal = React.lazy(() => import('./components/solicitacoes/NovaDemandaModal').then(module => ({ default: module.NovaDemandaModal })));
const DetalheDemandaModal = React.lazy(() => import('./components/solicitacoes/DetalheDemandaModal').then(module => ({ default: module.DetalheDemandaModal })));

export default function App() {
  const [filters,setFilters]=useState<Record<string,string>>({});
  const [metrics,setMetrics]=useState<DashboardMetrics>();
  const [total,setTotal]=useState(0);
  const [nextCursor,setNextCursor]=useState<string|null>(null);
  const [selectedRequest,setSelectedRequest]=useState<CreativeRequest|null>(null);
  const [editingRequest,setEditingRequest]=useState<CreativeRequest|null>(null);
  const [initialApproval,setInitialApproval]=useState(false);
  const [listError,setListError]=useState('');
  const [requests, setRequests] = useState<CreativeRequest[]>([]);
  const requestListRevision = React.useRef(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const readNotifications = React.useRef(new Set<string>());
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [createdRequest, setCreatedRequest] = useState<Pick<CreativeRequest, 'id' | 'code'> | null>(null);


  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);

  // Theme Management (Light / Dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bv_creative_hub_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'dark';
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
    setRequests(requestData.requests.map(summary));
    setTotal(requestData.total);setNextCursor(requestData.nextCursor);
    setDepartments(nextDepartments);
    setUsers(userData.users.map((item) => toUserProfile(item, departmentId)));
    setCurrentUser(toUserProfile(user, departmentId));
    setNotifications([]);
  };

  useEffect(() => {
    if (currentUser?.role !== 'requester') return;
    const controller = new AbortController();
    try {
      const stored: unknown = JSON.parse(localStorage.getItem('bv_notification_reads:' + currentUser.id) ?? '[]');
      readNotifications.current = new Set(Array.isArray(stored) ? stored.filter(id => typeof id === 'string') : []);
    } catch {
      readNotifications.current = new Set();
    }
    const refresh = async () => {
      if (document.hidden || controller.signal.aborted) return;
      try {
        const result = await apiClient.getNotifications(controller.signal);
        if (!controller.signal.aborted) {
          setNotifications(result.notifications.map(item => ({ ...item, read: readNotifications.current.has(item.id) })));
        }
      } catch { /* Keep existing notices available if a refresh fails. */ }
    };
    void refresh();
    const timer = window.setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        const [statusResult, sessionResult] = await Promise.allSettled([
          apiClient.getAuthStatus(),
          apiClient.me(),
        ]);
        if (!active) return;
        if (statusResult.status === 'rejected') throw statusResult.reason;
        const status = statusResult.value;
        setAuthStatus(status);
        if (!status.configured) return;
        if (sessionResult.status === 'fulfilled') {
          await loadData(sessionResult.value.user);
        } else if (!(sessionResult.reason instanceof ApiError) || sessionResult.reason.status !== 401) {
          throw sessionResult.reason;
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

  const query = {...filters, attention: activeTab === 'solicitacoes' ? filters.attention ?? '' : '', q: searchQuery};
  const listController=React.useRef<AbortController>(null);
  const refreshList = async (signal?: AbortSignal) => {
    listController.current?.abort();
    const queryController=new AbortController();
    listController.current=queryController;
    signal=signal ? AbortSignal.any([signal,queryController.signal]) : queryController.signal;
    const revision = ++requestListRevision.current;
    try {
      const first=await apiClient.getRequests(query,signal);
      if(revision!==requestListRevision.current || signal.aborted) return;
      setRequests(first.requests.map(summary));setTotal(first.total);setNextCursor(first.nextCursor);setListError('');
      void apiClient.metrics(query,signal).then(counts=>{
        if(!signal?.aborted && revision===requestListRevision.current) setMetrics(counts);
      }).catch(()=>{});
      let rows=first.requests, cursor=first.nextCursor;
      if (['kanban','calendario','aprovacoes'].includes(activeTab)) {
        while(cursor && !signal?.aborted) {
          const page=await apiClient.getRequests({...query,cursor,limit:'200'},signal);
          rows=rows.concat(page.requests);cursor=page.nextCursor;
        }
      }
      if(revision!==requestListRevision.current || signal?.aborted) return;
      setRequests(rows.map(summary));setTotal(first.total);setNextCursor(cursor);setListError('');
    } catch(error) {
      if(signal?.aborted || revision!==requestListRevision.current) return;
      if(error instanceof ApiError && error.status===401) setCurrentUser(null);
      else setListError('A fila está temporariamente indisponível. Tente novamente.');
    }
  };
  useEffect(()=>{
    if(!currentUser) return;
    const controller=new AbortController();
    let timer:ReturnType<typeof setTimeout>;
    let running=false;
    const refresh=async()=>{
      if(running || controller.signal.aborted) return;
      clearTimeout(timer);
      if(document.hidden){timer=setTimeout(refresh,30000);return;}
      running=true;
      await refreshList(controller.signal);
      running=false;
      if(!controller.signal.aborted) timer=setTimeout(refresh,60000);
    };
    timer=setTimeout(refresh,250);
    document.addEventListener('visibilitychange',refresh);
    return()=>{controller.abort();listController.current?.abort();clearTimeout(timer);document.removeEventListener('visibilitychange',refresh);requestListRevision.current++;};
  },[currentUser?.id,activeTab,searchQuery,JSON.stringify(filters)]);
  useEffect(()=>{
    let active=true;setSelectedRequest(null);
    if(selectedRequestId) void apiClient.getRequest(selectedRequestId).then(result=>{if(active)setSelectedRequest(result.request);}).catch(error=>{if(active)alert(error.message);});
    return()=>{active=false;};
  },[selectedRequestId]);
  useEffect(()=>{
    let active=true;setEditingRequest(null);
    if(editingRequestId) void apiClient.getRequest(editingRequestId).then(result=>{if(active)setEditingRequest(result.request);}).catch(error=>{if(active){setEditingRequestId(null);alert(error.message);}});
    return()=>{active=false;};
  },[editingRequestId]);

  const handleAuth = async (user: AuthUser) => {
    try {
      await loadData(user);
      setAuthError(null);
      setActiveTab('dashboard');
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

  const handleRegister = async (name: string, email: string, password: string, token?: string) => {
    await apiClient.register(name, email, password, token);
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
      setCreatedRequest(null);
      setEditingRequestId(null);
      setAuthError(null);
      setActiveTab('solicitacoes');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível encerrar a sessão.');
    }
  };

  const updateRequest = (request: CreativeRequest) => {
    requestListRevision.current++;
    setSelectedRequest(current => current?.id === request.id
      ? { ...request, history: request.history ?? current.history }
      : current);
    void refreshList();
    setRequests((current) => current.map((item) => item.id === request.id ? request : item));
  };

  const handleCreateRequest = async (newReqData: Omit<CreativeRequest, 'id' | 'code' | 'created_at' | 'updated_at' | 'current_version' | 'versions' | 'comments' | 'approvals'>) => {
    const { request } = await apiClient.createRequest(newReqData);
    requestListRevision.current++;
    setRequests((current) => [request, ...current]);
    setIsNewRequestOpen(false);
    setCreatedRequest({ id: request.id, code: request.code });
    void refreshList();
  };

  const handleUpdateRequest = async (id: string, data: CreativeRequestEditableFields) => {
    const { request } = await apiClient.updateRequest(id, data);
    updateRequest(request);
    setEditingRequestId(null);
  };

  const handleEditRequest = (id: string) => {
    setSelectedRequestId(null);
    setIsNewRequestOpen(false);
    setEditingRequestId(id);
  };

  const handleDeleteRequest = async (id: string) => {
    const target = requests.find((request) => request.id === id);
    if (!target || !window.confirm(`Deseja excluir a solicitação ${target.code}? Essa ação não poderá ser desfeita.`)) {
      return;
    }
    try {
      await apiClient.deleteRequest(id);
      requestListRevision.current++;
      setRequests((current) => current.filter((request) => request.id !== id));
      setSelectedRequestId((current) => current === id ? null : current);
      setEditingRequestId((current) => current === id ? null : current);
      void refreshList();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível excluir a solicitação.');
    }
  };

  const handleOpenNewRequest = () => {
    if (currentUser?.role !== 'requester') return;
    setEditingRequestId(null);
    setIsNewRequestOpen(true);
  };

  const handleUpdateStatus = async (id: string, status: RequestStatus) => {
    if(status==='approved'){setInitialApproval(true);setSelectedRequestId(id);return;}
    try {
      const { request } = await apiClient.updateStatus(id, status);
      updateRequest(request);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível atualizar o status.');
    }
  };

  const handleAssignRequest = async (id: string, assigneeId: string | null) => {
    try {
      const { request } = await apiClient.assignRequest(id, assigneeId);
      updateRequest(request);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível atualizar o responsável pela execução.');
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

  const handleSubmitApproval = async (requestId: string, approvalData: ApprovalInput) => {
    try {
      const { request } = await apiClient.submitApproval(requestId, approvalData);
      updateRequest(request);
      return true;
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível registrar o parecer.');
      if (error instanceof ApiError && error.status === 409) {
        const revision = ++requestListRevision.current;
        try {
          const result = await apiClient.getRequests();
          if (revision === requestListRevision.current) setRequests(result.requests);
        } catch (refreshError) {
          console.error('Falha ao atualizar a fila de aprovação:', refreshError);
        }
      }
      return false;
    }
  };

  const markNotificationsRead = (ids: string[]) => {
    for (const id of ids) {
      readNotifications.current.delete(id);
      readNotifications.current.add(id);
    }
    const recent = [...readNotifications.current].slice(-200);
    readNotifications.current = new Set(recent);
    if (currentUser) {
      try { localStorage.setItem('bv_notification_reads:' + currentUser.id, JSON.stringify(recent)); } catch { /* Storage is optional. */ }
    }
    setNotifications(items => items.map(item => readNotifications.current.has(item.id) ? { ...item, read: true } : item));
  };

  const handleMarkNotificationRead = (id: string) => markNotificationsRead([id]);
  const handleMarkAllNotificationsRead = () => {
    markNotificationsRead(notifications.map(item => item.id));
  };

  const handleSaveDepartment = async (dept: Department) => {
    const { department } = await apiClient.createDepartment(dept);
    setDepartments((current) => [...current, department]);
  };

  if (authLoading) return (
    <div role="status" aria-label="Carregando BV Creative Hub"
      className={`grid min-h-dvh place-items-center ${theme === 'light' ? 'bg-slate-50' : 'bg-[#083181]'}`}>
      <div aria-hidden="true" className="relative grid size-24 place-items-center">
        <span className="absolute inset-0 rounded-full border-2 border-[#083181]/15 dark:border-white/20" />
        <span className="hub-loading-ring absolute inset-0 rounded-full text-[#083181] dark:text-white" />
        {theme === 'light' ? (
          <svg viewBox="0 0 144 144" className="size-12">
            <defs>
              <filter id="hub-navy-mark" colorInterpolationFilters="sRGB">
                <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.25 0.25 0.5 0 0" />
                <feComponentTransfer result="mark-alpha">
                  <feFuncA type="linear" slope={8} intercept={-0.24} />
                </feComponentTransfer>
                <feComposite in="SourceGraphic" operator="in" in2="mark-alpha" />
              </filter>
            </defs>
            <image href="/assets/bv-mark-navy.png" width={144} height={144} filter="url(#hub-navy-mark)" />
          </svg>
        ) : (
          <img src="/assets/bv-mark.png" alt="" width={48} height={48} className="size-12 object-contain" />
        )}
      </div>
    </div>
  );
  if (!currentUser) {
    return (
      <AuthView
        supportEmail={authStatus?.supportEmail}
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
  const isStaff = currentUser.role !== 'requester';
  const visibleTab: NavTab = activeTab;

  const pendingApprovalsCount = requests.filter(
    (r) => r.status === 'client_approval' || r.status === 'review'
  ).length;

  const activeCount = requests.filter((r) => r.status !== 'approved').length;


  const getTabTitle = (tab: NavTab) => {
    if (!isStaff) return tab === 'dashboard' ? 'Meu Dashboard' : 'Minhas Solicitações';
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
    <div className="flex h-dvh bg-[#EEF2F7] dark:bg-[#070c16] text-[#171A19] dark:text-[#F8FAFC] overflow-hidden transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar
        isRootAdmin={isAdmin}
        canApprove={isAdmin || currentUser.role==='art_director'}
        activeTab={visibleTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsMobileMenuOpen(false);
        }}
        pendingApprovalsCount={metrics?.inReviewRequests ?? pendingApprovalsCount}
        totalActiveCount={metrics ? metrics.totalRequests-metrics.completedRequests : activeCount}
        isAdmin={isStaff}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div inert={isMobileMenuOpen} className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          currentUser={currentUser}
          isAdmin={isAdmin}
          onLogout={handleLogout}
          onOpenProfile={() => setIsProfileOpen(true)}
          notifications={notifications}
          onMarkNotificationRead={handleMarkNotificationRead}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          onOpenNewRequest={handleOpenNewRequest}
          onSelectRequest={(id, item) => {setInitialApproval(item.type === 'approval');setSelectedRequestId(id);}}
          searchQuery={searchQuery}
          onSearchChange={q=>{setSearchQuery(q);setActiveTab('solicitacoes');}}
          activeTabTitle={getTabTitle(visibleTab)}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenMenu={() => setIsMobileMenuOpen(true)}
          menuOpen={isMobileMenuOpen}
        />

        {/* Scrollable View Container */}
        <main className="hub-workspace relative isolate min-h-0 flex-1 overflow-y-auto p-3 sm:p-5 md:p-8">

          <div className="hub-enter relative z-10 mx-auto max-w-7xl">
            {activeTab !== 'solicitacoes' && <div className="hub-panel mb-5 flex flex-wrap items-center gap-3 border border-slate-200 bg-white/90 p-3 text-xs text-slate-600 dark:border-white/10 dark:text-slate-300 sm:text-sm">
              <label>Desde <input aria-label="Desde" type="date" value={filters.from ? new Date(filters.from).toLocaleDateString('sv-SE') : ''} onChange={e=>setFilters({...filters,from:e.target.value?new Date(e.target.value+'T00:00:00').toISOString():''})}/></label>
              <label>Até <input aria-label="Até" type="date" value={filters.to ? new Date(filters.to).toLocaleDateString('sv-SE') : ''} onChange={e=>setFilters({...filters,to:e.target.value?new Date(e.target.value+'T23:59:59.999').toISOString():''})}/></label>
              <label><input type="checkbox" checked={filters.archived==='true'} onChange={e=>setFilters({...filters,archived:e.target.checked?'true':'false'})}/> Incluir arquivadas</label>
              <span role="status">{total} demandas encontradas</span>
            </div>}
            {listError && <p role="alert">{listError} <button onClick={()=>void refreshList()}>Tentar novamente</button></p>}
            <React.Suspense fallback={<p role="status">Carregando painel…</p>}>
              {isStaff && activeTab === 'dashboard' && (
                <DashboardView
                  metricsOverride={metrics}
                  requests={requests}
                  departments={departments}
                  currentUser={currentUser}
                  onSelectRequest={(id) => {setInitialApproval(false);setSelectedRequestId(id);}}
                  onNavigateToTab={(tab) => setActiveTab(tab)}
                  onOpenAttention={(attention) => {
                    setFilters(previous => ({ ...previous, attention }));
                    setActiveTab('solicitacoes');
                  }}
                />
              )}

              {!isStaff && activeTab === 'dashboard' && (
                <CollaboratorDashboardView
                  requests={requests}
                  currentUser={currentUser}
                  onSelectRequest={(id, showApproval) => {setInitialApproval(Boolean(showApproval));setSelectedRequestId(id);}}
                  onNavigateToRequests={() => {
                    setFilters(previous => ({ ...previous, attention: '' }));
                    setActiveTab('solicitacoes');
                  }}
                  onOpenNewRequest={handleOpenNewRequest}
                />
              )}

              {activeTab === 'solicitacoes' && (
                <>
                {filters.attention && <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
                  <span>Filtro: {filters.attention === 'approval' ? 'Aprovações pendentes' : filters.attention === 'critical' ? 'Prazos em risco' : 'Sem responsável'}</span>
                  <button type="button" className="rounded-lg px-2 py-1 font-semibold text-blue-700 underline dark:text-blue-300"
                    onClick={() => setFilters(previous => ({ ...previous, attention: '' }))}>Limpar filtro</button>
                </div>}
                <SolicitacoesView
                  canCreate={!isStaff}
                  total={total}
                  filters={filters}
                  onFiltersChange={setFilters}
                  requests={requests}
                  departments={departments}
                  currentUserId={currentUser.id}
                  isAdmin={isAdmin}
                  onSelectRequest={(id, showApproval) => {setInitialApproval(Boolean(showApproval));setSelectedRequestId(id);}}
                  onEditRequest={handleEditRequest}
                  onDeleteRequest={handleDeleteRequest}
                  onOpenNewRequest={handleOpenNewRequest}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
                </>
              )}

              {isStaff && activeTab === 'kanban' && (
                <KanbanView
                  requests={requests}
                  departments={departments}
                  currentUser={currentUser}
                  onSelectRequest={(id) => {setInitialApproval(false);setSelectedRequestId(id);}}
                  onUpdateStatus={handleUpdateStatus}
                />
              )}

              {(isAdmin || currentUser.role==='art_director') && activeTab === 'aprovacoes' && (
                <AprovacoesView
                  requests={requests.filter(r=>!r.archived_at && canReview(currentUser,r))}
                  onSubmitApproval={handleSubmitApproval}
                  onSelectRequest={(id) => {setInitialApproval(false);setSelectedRequestId(id);}}
                />
              )}

              {isStaff && activeTab === 'calendario' && (
                <CalendarioView
                  requests={requests}
                  departments={departments}
                  onSelectRequest={(id) => {setInitialApproval(false);setSelectedRequestId(id);}}
                />
              )}

              {isStaff && activeTab === 'relatorios' && (
                <RelatoriosView
                  metricsOverride={metrics}
                  filters={query}
                  requests={requests}
                  departments={departments}
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
            </React.Suspense>
            {activeTab==='solicitacoes' && nextCursor && <button className="my-4 rounded border px-4 py-2" onClick={async()=>{const page=await apiClient.getRequests({...query,cursor:nextCursor});setRequests(previous=>[...previous,...page.requests.map(summary)]);setNextCursor(page.nextCursor);}}>Carregar mais demandas</button>}
          </div>
        </main>
      </div>

      {createdRequest && <Modal isOpen title="Solicitação enviada" maxWidth="sm" onClose={() => setCreatedRequest(null)}>
        <p className="text-sm">A solicitação <strong className="font-mono">{createdRequest.code}</strong> foi registrada e aguarda triagem da equipe criativa.</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" className="min-h-11" onClick={() => setCreatedRequest(null)}>Concluir</Button>
          <Button type="button" data-initial-focus className="min-h-11" onClick={() => {
            setInitialApproval(false);
            setSelectedRequestId(createdRequest.id);
            setCreatedRequest(null);
          }}>Ver solicitação</Button>
        </div>
      </Modal>}
      {isProfileOpen && <ProfilePhotoModal name={currentUser.name} url={currentUser.avatar_url}
        onClose={() => setIsProfileOpen(false)}
        onChange={avatar_url => setCurrentUser(user => user?.id === currentUser.id ? { ...user, avatar_url } : user)}
      />}
      <React.Suspense fallback={null}>
      {currentUser.role === 'requester' && (isNewRequestOpen || editingRequest) && <NovaDemandaModal
        key={editingRequest?.id ?? currentUser.id}
        isOpen={currentUser.role === 'requester' && (isNewRequestOpen || Boolean(editingRequest))}
        onClose={() => {
          setIsNewRequestOpen(false);
          setEditingRequestId(null);
        }}
        departments={departments}
        currentUser={currentUser}
        request={editingRequest}
        onCreate={handleCreateRequest}
        onUpdate={handleUpdateRequest}
      />}

      {/* Demand Detail Modal */}
      {selectedRequestId && selectedRequest && <DetalheDemandaModal
        initialApproval={initialApproval}
        onRefresh={updateRequest}
        key={selectedRequestId}
        request={selectedRequest}
        isOpen={Boolean(selectedRequestId && selectedRequest)}
        onClose={() => setSelectedRequestId(null)}
        currentUser={currentUser}
        isAdmin={isAdmin}
        users={users}
        onUpdateStatus={handleUpdateStatus}
        onAssignRequest={handleAssignRequest}
        onAddComment={handleAddComment}
        onSubmitApproval={handleSubmitApproval}
      />}
      </React.Suspense>
    </div>
  );
}

function summary(row:CreativeRequest):CreativeRequest {
  return {...row,adjustments_requested:row.adjustments_requested ?? (row.status === 'in_progress' && row.approvals?.at(-1)?.decision === 'changes_requested'),description:'',briefing:{target_audience:'',key_message:'',specs:'',mandatory_elements:[],reference_links:[]},comments:[],versions:[],approvals:[]};
}
