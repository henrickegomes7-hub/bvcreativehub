import { ApprovalInput, CreativeRequest, CreativeRequestEditableFields, NotificationItem, UserProfile } from '../types';
import { Department } from '../types';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'requester' | 'designer' | 'art_director' | 'admin';
  active?: boolean;
  avatar_url?: string | null;
}

export interface AuthStatus {
  configured: boolean;
  adminSetupRequired: boolean;
  supportEmail?: string;
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string, readonly fields?: Record<string,string>) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string; fields?: Record<string,string> } | null;
    throw new ApiError(response.status, body?.error || `Falha na solicitação (${response.status}).`, body?.fields);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const apiClient = {
  getAuthStatus: () => request<AuthStatus>('/api/auth/status'),
  me: () => request<{ user: AuthUser }>('/api/auth/me'),
  uploadProfilePhoto: (image: Blob) => request<{ avatar_url: string }>('/api/profile/photo', {
    method: 'PUT', body: image, headers: { 'Content-Type': 'image/jpeg' },
  }),
  removeProfilePhoto: () => request<void>('/api/profile/photo', { method: 'DELETE' }),
  login: (email: string, password: string) =>
    request<{ user: AuthUser }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string, invitationToken?: string) =>
    request<{ message: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, invitationToken }) }),
  bootstrapAdmin: (name: string, email: string, password: string, bootstrapToken: string) =>
    request<{ user: AuthUser }>('/api/auth/bootstrap-admin', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, bootstrapToken }),
    }),
  requestPasswordReset: (email: string) =>
    request<{ message: string }>('/api/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  verifyPasswordResetCode: (email: string, code: string) =>
    request<{ resetToken: string }>('/api/auth/password-reset/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),
  completePasswordReset: (resetToken: string, password: string) =>
    request<{ message: string }>('/api/auth/password-reset/complete', {
      method: 'POST',
      body: JSON.stringify({ resetToken, password }),
    }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  getRequests: (filters: Record<string,string> = {}, signal?: AbortSignal) => request<{ requests: CreativeRequest[]; total: number; nextCursor: string | null }>('/api/requests?'+new URLSearchParams(filters), {signal}),
  getRequest: (id:string) => request<{request:CreativeRequest}>('/api/requests/'+id),
  metrics: (filters:Record<string,string> = {}, signal?:AbortSignal) => request<import('../types').DashboardMetrics>('/api/requests/metrics?'+new URLSearchParams(filters),{signal}),
  invite: (email:string,role:string) => request('/api/invitations',{method:'POST',body:JSON.stringify({email,role})}),
  invitations: () => request<{invitations:any[]}>('/api/invitations'),
  revokeInvitation: (id:string) => request('/api/invitations/'+id,{method:'DELETE'}),
  updateUser: (id:string,role:string,active:boolean) => request('/api/users/'+id,{method:'PATCH',body:JSON.stringify({role,active})}),
  assignApprover: (id:string, approverId:string|null) => request<{request:CreativeRequest}>('/api/requests/'+id+'/approver',{method:'PATCH',body:JSON.stringify({approverId})}),
  lifecycle: (id:string,action:'reopen'|'archive',reason:string) => request<{request:CreativeRequest}>('/api/requests/'+id+'/'+action,{method:'POST',body:JSON.stringify({reason})}),
  getDepartments: () => request<{ departments: Department[] }>('/api/departments'),
  getNotifications: (signal?: AbortSignal) => request<{ notifications: NotificationItem[] }>('/api/requests/notifications', { signal }),
  getUsers: () => request<{ users: AuthUser[] }>('/api/users'),
  createDepartment: (department: Pick<Department, 'code' | 'name' | 'manager_name' | 'color'>) =>
    request<{ department: Department }>('/api/departments', {
      method: 'POST',
      body: JSON.stringify(department),
    }),
  createRequest: (data: Omit<CreativeRequest, 'id' | 'code' | 'created_at' | 'updated_at' | 'current_version' | 'versions' | 'comments' | 'approvals'>) =>
    request<{ request: CreativeRequest }>('/api/requests', { method: 'POST', body: JSON.stringify(data) }),
  updateRequest: (id: string, data: CreativeRequestEditableFields) =>
    request<{ request: CreativeRequest }>(`/api/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteRequest: (id: string) =>
    request<void>(`/api/requests/${id}`, { method: 'DELETE' }),
  updateStatus: (id: string, status: CreativeRequest['status']) =>
    request<{ request: CreativeRequest }>(`/api/requests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  assignRequest: (id: string, assigneeId: string | null) =>
    request<{ request: CreativeRequest }>(`/api/requests/${id}/assignee`, {
      method: 'PATCH',
      body: JSON.stringify({ assigneeId }),
    }),
  addComment: (id: string, content: string) =>
    request<{ request: CreativeRequest }>(`/api/requests/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  submitApproval: (id: string, approval: ApprovalInput) =>
    request<{ request: CreativeRequest }>(`/api/requests/${id}/approvals`, {
      method: 'POST',
      body: JSON.stringify(approval),
    }),
};

export function toUserProfile(user: AuthUser, departmentId: string): UserProfile {
  const isAdmin = user.role === 'admin';
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    department_id: departmentId,
    avatar_url: user.avatar_url ?? '',
    title: ({admin:'Administração',requester:'Solicitante',designer:'Executor',art_director:'Aprovador'})[user.role],
  };
}
