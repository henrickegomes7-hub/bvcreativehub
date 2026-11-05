export type UserRole = 
  | 'requester'           // Solicitante (Área de negócio do Grupo BV)
  | 'designer'            // Designer Gráfico / Motion Designer
  | 'art_director'        // Diretor de Arte
  | 'creative_manager'    // Gestor do Hub Criativo
  | 'admin';              // Administrador do Sistema

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department_id: string;
  avatar_url: string;
  title: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  manager_name: string;
  icon: string;
  color: string;
  description: string;
}

export type RequestPriority = 'low' | 'medium' | 'high' | 'urgent';

export type RequestStatus = 
  | 'backlog'           // Triagem / Backlog
  | 'in_progress'       // Em Produção
  | 'review'            // Em Revisão Criativa / QA
  | 'client_approval'   // Em Aprovação do Solicitante
  | 'approved';         // Concluído / Aprovado

export type AssetFormat = 
  | 'social_feed'
  | 'social_stories'
  | 'carrossel'
  | 'banner_web'
  | 'motion'
  | 'landing_page'
  | 'ooh_print'
  | 'ebook'
  | 'email_marketing'
  | 'branding';

export interface BriefingDetails {
  target_audience: string;
  key_message: string;
  cta_text?: string;
  specs: string;
  mandatory_elements: string[];
  reference_links: string[];
  campaign_name?: string;
}

export interface RequestVersion {
  id: string;
  request_id: string;
  version_number: number;
  file_name: string;
  file_url: string;
  file_size: string;
  file_type: string;
  preview_url: string;
  changelog: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  dimensions?: string;
  resolution_dpi?: number;
  color_profile?: 'RGB' | 'CMYK';
}

export interface RequestComment {
  id: string;
  request_id: string;
  version_number?: number;
  user_id: string;
  user_name: string;
  user_avatar: string;
  user_role: UserRole;
  content: string;
  created_at: string;
  is_adjustment: boolean;
  resolved: boolean;
}

export type ApprovalDecision = 'approved' | 'approved_with_notes' | 'changes_requested';

export interface RequestApproval {
  id: string;
  request_id: string;
  version_number: number;
  reviewer_id: string;
  reviewer_name: string;
  reviewer_role: UserRole;
  decision: ApprovalDecision;
  feedback: string;
  checklist: { item: string; checked: boolean }[];
  created_at: string;
}

export interface CreativeRequest {
  id: string;
  code: string; // Ex: BV-2026-042
  title: string;
  description: string;
  department_id: string;
  requester_id: string;
  requester_name: string;
  assignee_id?: string;
  assignee_name?: string;
  priority: RequestPriority;
  status: RequestStatus;
  format: AssetFormat;
  deadline: string; // ISO string
  estimated_hours: number;
  actual_hours?: number;
  created_at: string;
  updated_at: string;
  briefing: BriefingDetails;
  tags: string[];
  current_version: number;
  versions: RequestVersion[];
  comments: RequestComment[];
  approvals: RequestApproval[];
}

export interface BrandAsset {
  id: string;
  title: string;
  category: 'logos' | 'colors' | 'typography' | 'icons' | 'guidelines' | 'photography';
  format: string;
  file_url: string;
  preview_url?: string;
  hex_color?: string;
  rgb_color?: string;
  description: string;
  download_count: number;
  tags: string[];
  updated_at: string;
}

export interface GraphicTemplate {
  id: string;
  title: string;
  category: 'social' | 'print' | 'presentation' | 'corporate' | 'digital';
  software: 'Figma' | 'Photoshop' | 'Illustrator' | 'Canva' | 'PowerPoint';
  dimensions: string;
  aspect_ratio: string;
  preview_url: string;
  template_url: string;
  file_size: string;
  downloads: number;
  description: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'approval' | 'sla_risk' | 'new_request' | 'comment' | 'assignment';
  request_id?: string;
  request_code?: string;
  read: boolean;
  created_at: string;
}

export interface DashboardMetrics {
  totalRequests: number;
  completedRequests: number;
  inReviewRequests: number;
  urgentRequests: number;
  onTimeDeliveryRate: number; // percentage (e.g. 96.5)
  avgTurnaroundHours: number; // e.g. 18.4
  firstTimeApprovalRate: number; // percentage (e.g. 84)
  requestsByDepartment: { department: string; count: number; color: string }[];
  requestsByStatus: { status: string; count: number; label: string; color: string }[];
  weeklyThroughput: { day: string; criadas: number; concluidas: number }[];
}
