import { 
  CreativeRequest, 
  Department, 
  UserProfile, 
  BrandAsset, 
  GraphicTemplate, 
  NotificationItem,
  RequestStatus,
  RequestVersion,
  RequestComment,
  RequestApproval,
  ApprovalDecision
} from '../types';
import { 
  INITIAL_DEPARTMENTS, 
  INITIAL_USERS, 
  INITIAL_REQUESTS, 
  INITIAL_BRAND_ASSETS, 
  INITIAL_TEMPLATES, 
  INITIAL_NOTIFICATIONS 
} from './seedData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEYS = {
  REQUESTS: 'bv_hub_requests_v1',
  DEPARTMENTS: 'bv_hub_departments_v1',
  USERS: 'bv_hub_users_v1',
  CURRENT_USER: 'bv_hub_current_user_v1',
  BRAND_ASSETS: 'bv_hub_brand_assets_v1',
  TEMPLATES: 'bv_hub_templates_v1',
  NOTIFICATIONS: 'bv_hub_notifications_v1',
};

class StorageService {
  private get<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.warn(`Erro ao carregar chave ${key} do localStorage`, e);
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Erro ao salvar chave ${key} no localStorage`, e);
    }
  }

  // Requests CRUD
  getRequests(): CreativeRequest[] {
    return this.get<CreativeRequest[]>(STORAGE_KEYS.REQUESTS, INITIAL_REQUESTS);
  }

  saveRequests(requests: CreativeRequest[]): void {
    this.set(STORAGE_KEYS.REQUESTS, requests);
  }

  getRequestById(id: string): CreativeRequest | undefined {
    return this.getRequests().find(r => r.id === id);
  }

  createRequest(newReq: Omit<CreativeRequest, 'id' | 'code' | 'created_at' | 'updated_at' | 'current_version' | 'versions' | 'comments' | 'approvals'>): CreativeRequest {
    const requests = this.getRequests();
    const count = requests.length + 42;
    const code = `BV-2026-${String(count).padStart(3, '0')}`;
    const id = `req-${Date.now()}`;
    const now = new Date().toISOString();

    const created: CreativeRequest = {
      ...newReq,
      id,
      code,
      created_at: now,
      updated_at: now,
      current_version: 0,
      versions: [],
      comments: [],
      approvals: [],
    };

    const updatedList = [created, ...requests];
    this.saveRequests(updatedList);

    // Adiciona notificação sobre nova demanda
    this.addNotification({
      title: 'Nova demanda criada',
      message: `A solicitação ${code} (${created.title}) foi registrada no hub.`,
      type: 'new_request',
      request_id: id,
      request_code: code,
    });

    if (isSupabaseConfigured && supabase) {
      supabase.from('creative_requests').insert({
        id: created.id,
        code: created.code,
        title: created.title,
        description: created.description,
        department_id: created.department_id,
        requester_id: created.requester_id,
        assignee_id: created.assignee_id,
        priority: created.priority,
        status: created.status,
        format: created.format,
        deadline: created.deadline,
        estimated_hours: created.estimated_hours,
        briefing: created.briefing,
        tags: created.tags,
      }).then(({ error }) => {
        if (error) console.error('Erro sync Supabase createRequest:', error);
      });
    }

    return created;
  }

  updateRequest(id: string, updates: Partial<CreativeRequest>): CreativeRequest | null {
    const requests = this.getRequests();
    const index = requests.findIndex(r => r.id === id);
    if (index === -1) return null;

    const updated: CreativeRequest = {
      ...requests[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    requests[index] = updated;
    this.saveRequests(requests);
    return updated;
  }

  updateRequestStatus(id: string, newStatus: RequestStatus): CreativeRequest | null {
    return this.updateRequest(id, { status: newStatus });
  }

  // Adicionar nova versão de arquivo
  addVersion(requestId: string, versionData: Omit<RequestVersion, 'id' | 'request_id' | 'version_number' | 'created_at'>): RequestVersion | null {
    const req = this.getRequestById(requestId);
    if (!req) return null;

    const nextVersionNumber = (req.current_version || 0) + 1;
    const newVersion: RequestVersion = {
      ...versionData,
      id: `ver-${Date.now()}`,
      request_id: requestId,
      version_number: nextVersionNumber,
      created_at: new Date().toISOString(),
    };

    const updatedVersions = [...req.versions, newVersion];
    this.updateRequest(requestId, {
      current_version: nextVersionNumber,
      versions: updatedVersions,
      // Se estava no backlog, avança automaticamente para Em Produção ou Revisão
      status: req.status === 'backlog' ? 'in_progress' : req.status,
    });

    this.addNotification({
      title: `Nova Versão V${nextVersionNumber} postada`,
      message: `Versão V${nextVersionNumber} de "${req.title}" foi enviada para conferência.`,
      type: 'approval',
      request_id: req.id,
      request_code: req.code,
    });

    return newVersion;
  }

  // Comentários & Checklists
  addComment(requestId: string, commentData: Omit<RequestComment, 'id' | 'request_id' | 'created_at'>): RequestComment | null {
    const req = this.getRequestById(requestId);
    if (!req) return null;

    const newComment: RequestComment = {
      ...commentData,
      id: `comm-${Date.now()}`,
      request_id: requestId,
      created_at: new Date().toISOString(),
    };

    const updatedComments = [...req.comments, newComment];
    this.updateRequest(requestId, { comments: updatedComments });

    return newComment;
  }

  // Submissão de Aprovação
  submitApproval(requestId: string, approvalData: {
    decision: ApprovalDecision;
    reviewer_id: string;
    reviewer_name: string;
    reviewer_role: UserProfile['role'];
    feedback: string;
    checklist: { item: string; checked: boolean }[];
  }): RequestApproval | null {
    const req = this.getRequestById(requestId);
    if (!req) return null;

    const newApproval: RequestApproval = {
      id: `appr-${Date.now()}`,
      request_id: requestId,
      version_number: req.current_version,
      ...approvalData,
      created_at: new Date().toISOString(),
    };

    let nextStatus: RequestStatus = req.status;
    if (approvalData.decision === 'approved' || approvalData.decision === 'approved_with_notes') {
      nextStatus = 'approved';
    } else if (approvalData.decision === 'changes_requested') {
      nextStatus = 'in_progress'; // Retorna para ajuste
    }

    const updatedApprovals = [...req.approvals, newApproval];
    this.updateRequest(requestId, {
      approvals: updatedApprovals,
      status: nextStatus,
    });

    this.addNotification({
      title: approvalData.decision === 'approved' ? 'Demanda Aprovada!' : 'Ajustes Solicitados',
      message: `${approvalData.reviewer_name} deu o parecer na demanda ${req.code}.`,
      type: 'approval',
      request_id: req.id,
      request_code: req.code,
    });

    return newApproval;
  }

  // Departments
  getDepartments(): Department[] {
    return this.get<Department[]>(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
  }

  saveDepartment(dept: Department): void {
    const depts = this.getDepartments();
    const idx = depts.findIndex(d => d.id === dept.id);
    if (idx >= 0) {
      depts[idx] = dept;
    } else {
      depts.push(dept);
    }
    this.set(STORAGE_KEYS.DEPARTMENTS, depts);
  }

  // Users
  getUsers(): UserProfile[] {
    return this.get<UserProfile[]>(STORAGE_KEYS.USERS, INITIAL_USERS).map(user =>
      user.id === INITIAL_USERS[0].id ? { ...user, name: INITIAL_USERS[0].name } : user
    );
  }

  getCurrentUser(): UserProfile {
    const currentUser = this.get<UserProfile>(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]);
    return currentUser.id === INITIAL_USERS[0].id
      ? { ...currentUser, name: INITIAL_USERS[0].name }
      : currentUser;
  }

  setCurrentUser(user: UserProfile): void {
    this.set(STORAGE_KEYS.CURRENT_USER, user);
  }

  // Brand Assets
  getBrandAssets(): BrandAsset[] {
    const list = this.get<BrandAsset[]>(STORAGE_KEYS.BRAND_ASSETS, INITIAL_BRAND_ASSETS);
    return list.map(a => (a.id === 'asset-001' || a.id === 'asset-002') ? {
      ...a,
      file_url: '/assets/aistudio/Logo_plano_BV_PNG_f061e8a5.png',
      preview_url: '/assets/aistudio/Logo_plano_BV_PNG_f061e8a5.png',
    } : a);
  }

  saveBrandAsset(asset: BrandAsset): void {
    const assets = this.getBrandAssets();
    const idx = assets.findIndex(a => a.id === asset.id);
    if (idx >= 0) {
      assets[idx] = asset;
    } else {
      assets.unshift(asset);
    }
    this.set(STORAGE_KEYS.BRAND_ASSETS, assets);
  }

  incrementAssetDownload(id: string): void {
    const assets = this.getBrandAssets();
    const asset = assets.find(a => a.id === id);
    if (asset) {
      asset.download_count = (asset.download_count || 0) + 1;
      this.set(STORAGE_KEYS.BRAND_ASSETS, assets);
    }
  }

  // Templates
  getTemplates(): GraphicTemplate[] {
    return this.get<GraphicTemplate[]>(STORAGE_KEYS.TEMPLATES, INITIAL_TEMPLATES);
  }

  incrementTemplateDownload(id: string): void {
    const tmpls = this.getTemplates();
    const tmpl = tmpls.find(t => t.id === id);
    if (tmpl) {
      tmpl.downloads = (tmpl.downloads || 0) + 1;
      this.set(STORAGE_KEYS.TEMPLATES, tmpls);
    }
  }

  // Notifications
  getNotifications(): NotificationItem[] {
    return this.get<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  }

  addNotification(notif: Omit<NotificationItem, 'id' | 'created_at' | 'read'>): void {
    const notifications = this.getNotifications();
    const item: NotificationItem = {
      ...notif,
      id: `notif-${Date.now()}`,
      created_at: new Date().toISOString(),
      read: false,
    };
    this.set(STORAGE_KEYS.NOTIFICATIONS, [item, ...notifications.slice(0, 29)]);
  }

  markNotificationRead(id: string): void {
    const notifications = this.getNotifications();
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    this.set(STORAGE_KEYS.NOTIFICATIONS, updated);
  }

  markAllNotificationsRead(): void {
    const notifications = this.getNotifications();
    const updated = notifications.map(n => ({ ...n, read: true }));
    this.set(STORAGE_KEYS.NOTIFICATIONS, updated);
  }

  // Reset to initial demo data
  resetAllData(): void {
    this.set(STORAGE_KEYS.REQUESTS, INITIAL_REQUESTS);
    this.set(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
    this.set(STORAGE_KEYS.USERS, INITIAL_USERS);
    this.set(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]);
    this.set(STORAGE_KEYS.BRAND_ASSETS, INITIAL_BRAND_ASSETS);
    this.set(STORAGE_KEYS.TEMPLATES, INITIAL_TEMPLATES);
    this.set(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  }
}

export const storageService = new StorageService();
