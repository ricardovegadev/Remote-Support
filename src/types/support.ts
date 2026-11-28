/**
 * Domain types for Remote Support 365 (Remix Integral — Dashboard V1 Unified)
 * Aligned 1:1 with `supabase/schema.sql`.
 */

export type UserRole = 'client' | 'technician' | 'admin' | 'owner' | 'supervisor';

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
  | 'Soporte macOS'
  | 'Soporte Linux & Servidores'
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

export type PaymentStatus = 'pending' | 'authorized' | 'paid' | 'voided' | 'refunded';

export type PaymentGateway = 'stripe' | 'google_pay' | 'paypal' | 'sandbox';

export type ResolutionOutcome =
  | 'resolved'
  | 'software_unresolved'
  | 'hardware_fault'
  | 'client_absent';

export type TicketStatus =
  | 'waiting_payment'
  | 'ready_to_connect'
  | 'in_progress'
  | 'pending_client_confirmation'
  | 'resolved'
  | 'refunded';

export type TechnicianPayoutStatus =
  | 'pending'
  | 'scheduled'
  | 'paid'
  | 'paid_out'
  | 'reversed'
  | 'cancelled';

export interface NetTechnicianPayoutBreakdown {
  grossUsd: number;
  gateway: PaymentGateway;
  gatewayFeeUsd: number;
  netAmountUsd: number;
  commissionPercent: 65 | 75 | 80 | 85;
  technicianNetUsd: number;
  platformNetUsd: number;
}

export interface TechnicianPayoutRecord {
  id: string;
  organization_id: string;
  ticket_id: string;
  ticket_code: string;
  service_tier: ServiceTier;
  technician_id: string;
  technician_name: string;
  payment_gateway: PaymentGateway;
  gross_amount_usd: number;
  gateway_fee_usd: number;
  net_amount_usd: number;
  commission_percent: 65 | 75 | 80 | 85;
  payout_amount_usd: number;
  platform_net_usd: number;
  status: TechnicianPayoutStatus;
  warranty_releases_at: string;
  payout_batch_reference?: string | null;
  paid_out_at?: string | null;
  created_at: string;
}

export type MessageSenderRole = 'client' | 'technician' | 'system';

export type AppView =
  | 'landing'
  | 'connection_room'
  | 'tech_portal'
  | 'technician_apply'
  | 'technician_register';

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
  role: 'owner' | 'admin' | 'supervisor' | 'technician';
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
  userLockedTier?: boolean;
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
  human_reviewed_at?: string | null;
  human_reviewed_by?: string | null;
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
  payment_gateway?: PaymentGateway | null;
  payment_authorization_id?: string | null;
  payment_reference?: string | null;
  paid_at?: string | null;
  auto_capture_at?: string | null;
  client_confirmed_at?: string | null;
  client_rating?: number | null;
  client_feedback?: string | null;
  resolution_outcome?: ResolutionOutcome | null;
  status: TicketStatus;
  assigned_to: string | null;
  assigned_technician_id: string | null;
  assigned_technician_name: string | null;
  assigned_technician_specialty?: string | null;
  assigned_technician_verified?: boolean;
  assigned_technician_sessions_count?: number | null;
  assigned_technician_rating?: number | null;
  resolution_notes: string | null;
  client_session_token: string;
  claimed_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
  stripe_subscription_id?: string | null;
}

export interface UserAccountProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  organization_id?: string | null;
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

export type WorkModality = 'half_time' | 'full_time';

export type ApplicationStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'registered';

export type AssessmentRecommendation =
  | 'recommended_approve'
  | 'manual_review'
  | 'recommended_reject';

export interface TechnicianCommissionTier {
  id: 'base' | 'pro' | 'senior' | 'elite';
  label: string;
  minIncidents: number;
  maxIncidents: number | null;
  rangeLabel: string;
  commissionPercent: number;
  description: string;
}

export interface TechnicianApplication {
  id: string;
  full_name: string;
  email: string;
  country: string;
  timezone: string;
  birth_date: string;
  is_adult_verified: boolean;
  modality: WorkModality;
  specialties: TechnicianSpecialty[];
  certifications: string;
  nda_accepted: boolean;
  nda_version: string;
  nda_signed_name: string;
  nda_accepted_at: string;
  technical_score: number;
  attitude_score: number;
  total_score: number;
  recommendation: AssessmentRecommendation;
  elapsed_seconds: number;
  status: ApplicationStatus;
  reviewer_notes?: string | null;
  reviewed_at?: string | null;
  invite_expires_at?: string | null;
  email_delivery_status?: 'not_sent' | 'sent' | 'simulated' | 'failed';
  email_sent_at?: string | null;
  debug_register_url?: string;
  created_at: string;
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

export interface BusinessFeeConfig {
  paymentFeePercent: number;
  paymentFeeFixedUsd: number;
  operationalCostUsd: number;
}

export interface ServiceTierConfig {
  id: ServiceTier;
  priceUsd: number;
  recommended?: boolean;
  eyebrow: string;
  summary: string;
  features: string[];
}

export interface PymePlanConfig {
  id: string;
  name: string;
  serviceTier: ServiceTier;
  priceUsd: number;
  devicesLimit: string;
  summary: string;
  features: string[];
}

export interface SaasPlanConfig {
  id: string;
  name: string;
  priceUsd: number;
  seats: string;
  summary: string;
  highlighted?: boolean;
  features: string[];
}

export interface BusinessConfig {
  currency: 'USD';
  feeConfig: BusinessFeeConfig;
  serviceTiers: ServiceTierConfig[];
  pymePlans: PymePlanConfig[];
  saasPlans: SaasPlanConfig[];
  commissionTiers: TechnicianCommissionTier[];
}

export interface NetCommissionBreakdown {
  grossUsd: number;
  paymentFeeUsd: number;
  operationalCostUsd: number;
  netDistributableUsd: number;
  commissionPercent: number;
  technicianPayoutUsd: number;
  platformMarginUsd: number;
}

