import { CreativeRequest, UserProfile } from '../types';
import { Department } from '../types';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'requester' | 'admin';
}

export interface AuthStatus {
  configured: boolean;
  adminSetupRequired: boolean;
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
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error || `Falha na solicitação (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const apiClient = {
  getAuthStatus: () => request<AuthStatus>('/api/auth/status'),
  me: () => request<{ user: AuthUser }>('/api/auth/me'),
  login: (email: string, password: string) =>
    request<{ user: AuthUser }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string) =>
    request<{ user: AuthUser }>('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  bootstrapAdmin: (name: string, email: string, password: string, bootstrapToken: string) =>
    request<{ user: AuthUser }>('/api/auth/bootstrap-admin', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, bootstrapToken }),
    }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  getRequests: () => request<{ requests: CreativeRequest[] }>('/api/requests'),
  getDepartments: () => request<{ departments: Department[] }>('/api/departments'),
  getUsers: () => request<{ users: AuthUser[] }>('/api/users'),
  createDepartment: (department: Pick<Department, 'code' | 'name' | 'manager_name' | 'color'>) =>
    request<{ department: Department }>('/api/departments', {
      method: 'POST',
      body: JSON.stringify(department),
    }),
  createRequest: (data: Omit<CreativeRequest, 'id' | 'code' | 'created_at' | 'updated_at' | 'current_version' | 'versions' | 'comments' | 'approvals'>) =>
    request<{ request: CreativeRequest }>('/api/requests', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string, status: CreativeRequest['status']) =>
    request<{ request: CreativeRequest }>(`/api/requests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  addComment: (id: string, content: string) =>
    request<{ request: CreativeRequest }>(`/api/requests/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  addVersion: (id: string, version: object) =>
    request<{ request: CreativeRequest }>(`/api/requests/${id}/versions`, {
      method: 'POST',
      body: JSON.stringify(version),
    }),
  submitApproval: (id: string, approval: { decision: string; feedback: string; checklist: { item: string; checked: boolean }[] }) =>
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
    role: isAdmin ? 'admin' : 'requester',
    department_id: departmentId,
    avatar_url: '',
    title: isAdmin ? 'Administradora' : 'Funcionário',
  };
}
