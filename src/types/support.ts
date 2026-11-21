/**
 * Domain types for Remote Support 365 (Remix Integral — Dashboard V1 Unified)
 * Aligned 1:1 with `supabase/schema.sql`.
 */

export type UserRole = 'client' | 'technician' | 'admin';

export type OrganizationPlanTier =
  | 'internal_hq'
  | 'starter_29'
  | 'growth_49'
  | 'scale_79';

export type DispatchMode = 'smart' | 'manual' | 'round_robin';

export type MemberTierType = 'internal' | 'freelancer' | 'network';

export type TechnicianAvailability = 'available' | 'busy' | 'paused' | 'offline';

export type TechnicianSpecialty =
  | 'Windows & BSOD'
  | 'Microsoft 365 & Outlook'
  | 'Impresoras'
  | 'Redes & VPN'
  | 'Seguridad & Malware'
  | 'Recuperación de Datos';

export type AgentInstallType = 'temporary' | 'installed';

export type TicketPriority = 'high' | 'medium' | 'low';

export type LaunchIssueCategory =
  | 'Windows lento o bajo rendimiento'
  | 'Aplicaciones que no arrancan'
  | 'Pantallazos azules (BSOD)'
  | 'Problemas de Wi-Fi o red'
  | 'Errores de Microsoft 365 y Outlook'
  | 'Configuración de impresoras'
  | 'Eliminación de malware y virus'
  | 'Recuperación de archivos'
  | 'Actualizaciones de Windows'
  | 'VPN y acceso remoto';

export type LegacyIssueCategory =
  | 'Impresoras'
  | 'Correo/Office'
  | 'Sistema Operativo/Lentitud'
  | 'Redes/Wi-Fi'
  | 'Otro';

export type IssueCategory = LaunchIssueCategory | LegacyIssueCategory;

export type OperatingSystem = 'Windows' | 'Mac' | 'Linux' | 'Mobile';

export type ServiceTier =
  | 'Express $15'
  | 'Optimización $29'
  | 'Avanzado $39'
  | 'Pyme Esencial $39/mes'
  | 'Pyme Corporativo $79/mes';

export type PaymentStatus = 'pending' | 'paid' | 'refunded';

export type TicketStatus =
  | 'waiting_payment'
  | 'ready_to_connect'
  | 'in_progress'
  | 'resolved';

export type MessageSenderRole = 'client' | 'technician' | 'system';

export type AppView = 'landing' | 'connection_room' | 'tech_portal';

export type DashboardSection =
  | 'overview'
  | 'tickets'
  | 'devices'
  | 'sessions'
  | 'workforce'
  | 'ai_workforce'
  | 'analytics'
  | 'security'
  | 'settings';

export type AiAgentKey =
  | 'ai_receptionist'
  | 'ai_dispatcher'
  | 'ai_technician_assistant'
  | 'ai_follow_up'
  | 'ai_report_generator'
  | 'ai_operations_manager';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan_tier: OrganizationPlanTier;
  dispatch_mode: DispatchMode;
  rustdesk_relay_domain: string;
  payment_gateway: 'stripe' | 'paypal' | 'stripe_paypal';
  ai_credits_monthly: number;
  ai_credits_used: number;
  subscription_auto_renew?: boolean;
  subscription_canceled_at?: string | null;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  member_type: MemberTierType;
  role: 'owner' | 'admin' | 'technician';
  agreed_ticket_rate_usd: number;
  status: 'active' | 'invited' | 'suspended';
  specialties: TechnicianSpecialty[];
  availability_status: TechnicianAvailability;
  accepting_requests: boolean;
  rating: number;
  resolved_count: number;
}

export interface AiReceptionistTriage {
  followUpQuestions: string[];
  selfServiceSteps?: string[];
  needsRemoteSpecialist?: boolean;
  selectedAnswers?: Record<number, string>;
  preDiagnosis: string;
  suggestedCategory?: IssueCategory;
  suggestedTier: ServiceTier;
  estimatedMinutes: number;
  confidenceNote: string;
  source: 'gemini' | 'fallback';
}

export interface CategoryOption {
  id: LaunchIssueCategory;
  label: string;
  summary: string;
  typicalResolutionTime: string;
  suggestedTier: ServiceTier;
  examples: string[];
}

export interface WizardDraft {
  step: 1 | 2 | 3;
  category: IssueCategory | null;
  operatingSystem: OperatingSystem | null;
  serviceTier: ServiceTier;
  billingMode?: 'one_time' | 'pyme_monthly';
  description: string;
  clientName: string;
  clientEmail: string;
  birthDate?: string;
  termsAccepted?: boolean;
  marketingOptIn?: boolean;
  aiTriage?: AiReceptionistTriage | null;
}

export interface SupportTicket {
  id: string;
  ticket_code: string;
  organization_id: string;
  organization_name: string;
  category: IssueCategory;
  os_type: OperatingSystem;
  service_tier: ServiceTier;
  billing_mode?: 'one_time' | 'pyme_monthly';
  priority: TicketPriority;
  problem_description: string;
  ai_diagnosis_summary: string;
  ai_diagnosis?: AiReceptionistTriage | null;
  client_name: string;
  client_email: string;
  client_birth_date?: string | null;
  is_adult_verified?: boolean;
  terms_accepted_at?: string | null;
  terms_version?: string | null;
  marketing_opt_in?: boolean;
  subscription_status?: 'none' | 'active' | 'past_due' | 'canceled';
  anonymized_at?: string | null;
  /** 9-digit RustDesk ID entered by the client inside `/sesion/[ticket_code]` */
  rustdesk_id: string | null;
  agent_type: AgentInstallType;
  agent_downloaded: boolean;
  consent_accepted: boolean;
  consent_accepted_at: string | null;
  payment_status: PaymentStatus;
  payment_reference?: string | null;
  paid_at?: string | null;
  status: TicketStatus;
  assigned_to: string | null;
  assigned_technician_id: string | null;
  assigned_technician_name: string | null;
  assigned_technician_specialty?: string | null;
  resolution_notes: string | null;
  client_session_token: string;
  claimed_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
}

export interface UserAccountProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  birth_date: string;
  is_adult_verified: boolean;
  terms_accepted_at: string;
  terms_version: string;
  marketing_opt_in: boolean;
  subscription_plan?: string | null;
  subscription_status?: 'none' | 'active' | 'past_due' | 'canceled';
  created_at: string;
}

export interface CookieConsentPreferences {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
  version: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_role: MessageSenderRole;
  message: string;
  created_at: string;
}

export interface ClientDevice {
  id: string;
  organization_id: string;
  client_name: string;
  client_email: string;
  device_name: string;
  os_type: OperatingSystem;
  rustdesk_id: string;
  agent_type: AgentInstallType;
  plan_name: string;
  is_online: boolean;
  last_seen_at: string;
}

export interface RemoteSessionRecord {
  id: string;
  organization_id: string;
  ticket_code: string;
  client_name: string;
  technician_name: string;
  rustdesk_id: string;
  agent_type: AgentInstallType;
  status: 'active' | 'ended';
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
}

export interface AiGovernanceRule {
  id: string;
  label: string;
  enabled: boolean;
}

export interface AiAgentConfig {
  id: string;
  organization_id: string;
  agent_key: AiAgentKey;
  agent_name: string;
  role_description: string;
  is_enabled: boolean;
  governance_rules: AiGovernanceRule[];
  credits_used: number;
}

export interface AuditLogEntry {
  id: string;
  organization_id: string;
  actor_type: 'technician' | 'ai_agent' | 'client' | 'system';
  actor_label: string;
  action: string;
  target_ref: string;
  created_at: string;
}

export interface DashboardMetrics {
  pendingCount: number;
  activeSessionsCount: number;
  resolvedTodayCount: number;
  revenueUsd: number;
}

export interface EnterpriseLead {
  id: string;
  companyName: string;
  contactEmail: string;
  teamSize: string;
  planInterest?: string;
  createdAt: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export interface AdapterResult<T> {
  ok: boolean;
  data: T;
  error?: string;
  warning?: string;
}
