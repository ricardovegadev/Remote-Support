import {
  getRoomScopedSupabaseClient,
  getSupabaseClient,
  isSupabaseConfigured,
} from '../lib/supabaseClient';
import type {
  AdapterResult,
  AiAgentConfig,
  AuditLogEntry,
  ClientDevice,
  DispatchMode,
  EnterpriseLead,
  MemberTierType,
  MessageSenderRole,
  Organization,
  OrganizationMember,
  PaymentStatus,
  RemoteSessionRecord,
  SupportTicket,
  TechnicianAvailability,
  TechnicianSpecialty,
  TicketMessage,
  TicketStatus,
  UserAccountProfile,
} from '../types/support';
import { canClaimTicket, generateUuid, isValidUuid } from '../utils/ticketLogic';

const TICKETS_STORAGE_KEY = 'rs365_v1_tickets_v5';
const MESSAGES_STORAGE_KEY = 'rs365_v1_messages_v5';
const ORGS_STORAGE_KEY = 'rs365_v1_orgs_v5';
const MEMBERS_STORAGE_KEY = 'rs365_v1_members_v5';
const DEVICES_STORAGE_KEY = 'rs365_v1_devices_v5';
const SESSIONS_STORAGE_KEY = 'rs365_v1_sessions_v5';
const AI_AGENTS_STORAGE_KEY = 'rs365_v1_ai_agents_v5';
const AUDIT_STORAGE_KEY = 'rs365_v1_audit_v5';
const ROOM_TOKENS_STORAGE_KEY = 'rs365_room_tokens_v1';
const LOCAL_FALLBACK_TICKET_IDS_KEY = 'rs365_local_fallback_ticket_ids_v1';
const ENTERPRISE_STORAGE_KEY = 'rs365_enterprise_leads_v1';
const USER_PROFILE_STORAGE_KEY = 'rs365_user_profile_v1';
const BROADCAST_CHANNEL_NAME = 'rs365_realtime_sync_v5';

const TODAY_ISO = new Date().toISOString().slice(0, 10);

export const SEED_ORGANIZATIONS: Organization[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Remote Support 365',
    slug: 'remote-support-365',
    plan_tier: 'internal_hq',
    dispatch_mode: 'smart',
    rustdesk_relay_domain: 'relay.remotesupport365.com',
    payment_gateway: 'stripe_paypal',
    ai_credits_monthly: 5000,
    ai_credits_used: 0,
    subscription_auto_renew: true,
    subscription_canceled_at: null,
    created_at: `${TODAY_ISO}T06:00:00.000Z`,
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Andes IT Managed Services',
    slug: 'andes-it-msp',
    plan_tier: 'growth_49',
    dispatch_mode: 'round_robin',
    rustdesk_relay_domain: 'rs.andesit.ec',
    payment_gateway: 'stripe',
    ai_credits_monthly: 5000,
    ai_credits_used: 920,
    subscription_auto_renew: true,
    subscription_canceled_at: null,
    created_at: `${TODAY_ISO}T06:00:00.000Z`,
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    name: 'Red Global Partners',
    slug: 'global-overflow',
    plan_tier: 'scale_79',
    dispatch_mode: 'smart',
    rustdesk_relay_domain: 'edge.remotesupport365.net',
    payment_gateway: 'stripe_paypal',
    ai_credits_monthly: 15000,
    ai_credits_used: 3410,
    subscription_auto_renew: true,
    subscription_canceled_at: null,
    created_at: `${TODAY_ISO}T06:00:00.000Z`,
  },
];

export const SEED_MEMBERS: OrganizationMember[] = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    organization_id: '00000000-0000-4000-8000-000000000001',
    user_id: '30000000-0000-4000-8000-000000000001',
    full_name: 'Carlos Mendoza',
    email: 'cmendoza@remotesupport365.com',
    member_type: 'internal',
    role: 'owner',
    agreed_ticket_rate_usd: 0,
    status: 'active',
    specialties: ['Windows & BSOD', 'Microsoft 365 & Outlook', 'Redes & VPN'],
    availability_status: 'available',
    accepting_requests: true,
    rating: 4.96,
    resolved_count: 148,
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    organization_id: '00000000-0000-4000-8000-000000000001',
    user_id: '30000000-0000-4000-8000-000000000002',
    full_name: 'Valeria Salazar',
    email: 'vsalazar@remotesupport365.com',
    member_type: 'internal',
    role: 'technician',
    agreed_ticket_rate_usd: 0,
    status: 'active',
    specialties: ['Windows & BSOD', 'Impresoras', 'Seguridad & Malware'],
    availability_status: 'available',
    accepting_requests: true,
    rating: 4.91,
    resolved_count: 112,
  },
  {
    id: '20000000-0000-4000-8000-000000000003',
    organization_id: '00000000-0000-4000-8000-000000000001',
    user_id: '30000000-0000-4000-8000-000000000003',
    full_name: 'Gabriel Torres',
    email: 'gtorres@remotesupport365.com',
    member_type: 'internal',
    role: 'technician',
    agreed_ticket_rate_usd: 0,
    status: 'active',
    specialties: ['Redes & VPN', 'Windows & BSOD', 'Recuperación de Datos'],
    availability_status: 'available',
    accepting_requests: true,
    rating: 4.9,
    resolved_count: 95,
  },
  {
    id: '20000000-0000-4000-8000-000000000004',
    organization_id: '00000000-0000-4000-8000-000000000001',
    user_id: '30000000-0000-4000-8000-000000000004',
    full_name: 'Sofía Paredes',
    email: 'sparedes@remotesupport365.com',
    member_type: 'internal',
    role: 'technician',
    agreed_ticket_rate_usd: 0,
    status: 'active',
    specialties: ['Microsoft 365 & Outlook', 'Impresoras'],
    availability_status: 'busy',
    accepting_requests: true,
    rating: 4.89,
    resolved_count: 84,
  },
  {
    id: '20000000-0000-4000-8000-000000000005',
    organization_id: '00000000-0000-4000-8000-000000000001',
    user_id: '30000000-0000-4000-8000-000000000005',
    full_name: 'Andrés Cevallos',
    email: 'acevallos.freelance@gmail.com',
    member_type: 'freelancer',
    role: 'technician',
    agreed_ticket_rate_usd: 14,
    status: 'active',
    specialties: ['Microsoft 365 & Outlook', 'Redes & VPN'],
    availability_status: 'available',
    accepting_requests: true,
    rating: 4.88,
    resolved_count: 64,
  },
  {
    id: '20000000-0000-4000-8000-000000000006',
    organization_id: '00000000-0000-4000-8000-000000000001',
    user_id: '30000000-0000-4000-8000-000000000006',
    full_name: 'Lucía Herrera',
    email: 'lherrera.it@outlook.com',
    member_type: 'freelancer',
    role: 'technician',
    agreed_ticket_rate_usd: 15,
    status: 'active',
    specialties: ['Impresoras', 'Seguridad & Malware', 'Windows & BSOD'],
    availability_status: 'available',
    accepting_requests: true,
    rating: 4.94,
    resolved_count: 49,
  },
  {
    id: '20000000-0000-4000-8000-000000000007',
    organization_id: '00000000-0000-4000-8000-000000000001',
    user_id: '30000000-0000-4000-8000-000000000007',
    full_name: 'Mateo Rojas (Red Global)',
    email: 'mrojas@network.remotesupport365.com',
    member_type: 'network',
    role: 'technician',
    agreed_ticket_rate_usd: 17,
    status: 'active',
    specialties: ['Redes & VPN', 'Windows & BSOD', 'Recuperación de Datos'],
    availability_status: 'available',
    accepting_requests: true,
    rating: 4.92,
    resolved_count: 310,
  },
  {
    id: '20000000-0000-4000-8000-000000000008',
    organization_id: '00000000-0000-4000-8000-000000000001',
    user_id: '30000000-0000-4000-8000-000000000008',
    full_name: 'Daniela Cruz (Red Global)',
    email: 'dcruz@network.remotesupport365.com',
    member_type: 'network',
    role: 'technician',
    agreed_ticket_rate_usd: 18,
    status: 'active',
    specialties: ['Microsoft 365 & Outlook', 'Seguridad & Malware'],
    availability_status: 'available',
    accepting_requests: true,
    rating: 4.95,
    resolved_count: 274,
  },
  {
    id: '20000000-0000-4000-8000-000000000009',
    organization_id: '00000000-0000-4000-8000-000000000001',
    user_id: '30000000-0000-4000-8000-000000000009',
    full_name: 'Nicolás Vega (Red Global)',
    email: 'nvega@network.remotesupport365.com',
    member_type: 'network',
    role: 'technician',
    agreed_ticket_rate_usd: 16,
    status: 'active',
    specialties: ['Impresoras', 'Redes & VPN'],
    availability_status: 'available',
    accepting_requests: true,
    rating: 4.87,
    resolved_count: 198,
  },
  {
    id: '20000000-0000-4000-8000-000000000010',
    organization_id: '00000000-0000-4000-8000-000000000002',
    user_id: '30000000-0000-4000-8000-000000000010',
    full_name: 'Sebastián Quito',
    email: 'squito@andesit.ec',
    member_type: 'internal',
    role: 'admin',
    agreed_ticket_rate_usd: 0,
    status: 'active',
    specialties: ['Windows & BSOD', 'Redes & VPN', 'Impresoras'],
    availability_status: 'available',
    accepting_requests: true,
    rating: 4.89,
    resolved_count: 87,
  },
  {
    id: '20000000-0000-4000-8000-000000000011',
    organization_id: '00000000-0000-4000-8000-000000000003',
    user_id: '30000000-0000-4000-8000-000000000011',
    full_name: 'Elena Navarro',
    email: 'enavarro@globalpartners.net',
    member_type: 'network',
    role: 'admin',
    agreed_ticket_rate_usd: 18,
    status: 'active',
    specialties: ['Redes & VPN', 'Microsoft 365 & Outlook', 'Recuperación de Datos'],
    availability_status: 'available',
    accepting_requests: true,
    rating: 4.93,
    resolved_count: 215,
  },
];

export const SEED_TICKETS: SupportTicket[] = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    ticket_code: 'RS-1024',
    organization_id: '00000000-0000-4000-8000-000000000001',
    organization_name: 'Mi organización',
    category: 'VPN y acceso remoto',
    os_type: 'Windows',
    service_tier: 'Avanzado $39',
    priority: 'high',
    problem_description:
      'Problema de conectividad: VPN corporativa cae al conectar desde red de sucursal.',
    ai_diagnosis_summary:
      'AI Receptionist (Windows): Revisar adaptador TAP/WireGuard, ajustar MTU a 1380 y validar resolución DNS interna.',
    client_name: 'Empresa demostrativa A',
    client_email: 'soporte@empresaa.com',
    rustdesk_id: '482915307',
    agent_type: 'temporary',
    agent_downloaded: true,
    consent_accepted: true,
    consent_accepted_at: `${TODAY_ISO}T09:16:00.000Z`,
    payment_status: 'paid',
    status: 'in_progress',
    assigned_to: '30000000-0000-4000-8000-000000000001',
    assigned_technician_id: '30000000-0000-4000-8000-000000000001',
    assigned_technician_name: 'Carlos Mendoza',
    assigned_technician_specialty: 'Redes & VPN · Windows & BSOD',
    resolution_notes: null,
    client_session_token: 'seed-token-rs1024-a1b2c3d4e5f6',
    claimed_at: `${TODAY_ISO}T09:17:00.000Z`,
    created_at: `${TODAY_ISO}T09:15:00.000Z`,
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    ticket_code: 'RS-1025',
    organization_id: '00000000-0000-4000-8000-000000000001',
    organization_name: 'Mi organización',
    category: 'Errores de Microsoft 365 y Outlook',
    os_type: 'Windows',
    service_tier: 'Optimización $29',
    priority: 'medium',
    problem_description:
      'Configuración de estación: Outlook 365 pide contraseña en bucle tras cambio MFA.',
    ai_diagnosis_summary:
      'AI Receptionist (Windows): Depurar Credential Manager, token Modern Auth WAM y reconstruir perfil OST.',
    client_name: 'Empresa demostrativa B',
    client_email: 'ti@empresab.com',
    rustdesk_id: '719402835',
    agent_type: 'installed',
    agent_downloaded: true,
    consent_accepted: true,
    consent_accepted_at: `${TODAY_ISO}T08:41:00.000Z`,
    payment_status: 'paid',
    status: 'ready_to_connect',
    assigned_to: null,
    assigned_technician_id: null,
    assigned_technician_name: null,
    assigned_technician_specialty: null,
    resolution_notes: null,
    client_session_token: 'seed-token-rs1025-a1b2c3d4e5f6',
    created_at: `${TODAY_ISO}T08:40:00.000Z`,
  },
  {
    id: '11111111-1111-4111-8111-111111111103',
    ticket_code: 'RS-1026',
    organization_id: '00000000-0000-4000-8000-000000000001',
    organization_name: 'Mi organización',
    category: 'Windows lento o bajo rendimiento',
    os_type: 'Mac',
    service_tier: 'Optimización $29',
    priority: 'low',
    problem_description:
      'Rendimiento degradado: Estación presenta uso alto de CPU por sincronización en segundo plano.',
    ai_diagnosis_summary:
      'AI Receptionist (Mac): Inspección de LaunchAgents, Monitor de Actividad y reindexación Spotlight.',
    client_name: 'Cliente demostrativo C',
    client_email: 'carlos@clientec.ec',
    rustdesk_id: '309481726',
    agent_type: 'temporary',
    agent_downloaded: true,
    consent_accepted: true,
    consent_accepted_at: `${TODAY_ISO}T09:51:00.000Z`,
    payment_status: 'pending',
    status: 'waiting_payment',
    assigned_to: null,
    assigned_technician_id: null,
    assigned_technician_name: null,
    assigned_technician_specialty: null,
    resolution_notes: null,
    client_session_token: 'seed-token-rs1026-a1b2c3d4e5f6',
    created_at: `${TODAY_ISO}T09:50:00.000Z`,
  },
  {
    id: '11111111-1111-4111-8111-111111111104',
    ticket_code: 'RS-1027',
    organization_id: '00000000-0000-4000-8000-000000000001',
    organization_name: 'Mi organización',
    category: 'Configuración de impresoras',
    os_type: 'Windows',
    service_tier: 'Express $15',
    priority: 'medium',
    problem_description:
      'Impresora HP LaserJet en red local no procesa cola de impresión en recepción.',
    ai_diagnosis_summary:
      'AI Receptionist (Windows): Reiniciar spooler, validar IP fija DHCP y actualizar driver TCP/IP estándar.',
    client_name: 'Clínica Norte',
    client_email: 'recepcion@clinicanorte.ec',
    rustdesk_id: '538291046',
    agent_type: 'temporary',
    agent_downloaded: true,
    consent_accepted: true,
    consent_accepted_at: `${TODAY_ISO}T09:30:00.000Z`,
    payment_status: 'paid',
    status: 'ready_to_connect',
    assigned_to: null,
    assigned_technician_id: null,
    assigned_technician_name: null,
    assigned_technician_specialty: null,
    resolution_notes: null,
    client_session_token: 'seed-token-rs1027-a1b2c3d4e5f6',
    created_at: `${TODAY_ISO}T09:28:00.000Z`,
  },
  {
    id: '11111111-1111-4111-8111-111111111105',
    ticket_code: 'RS-1023',
    organization_id: '00000000-0000-4000-8000-000000000001',
    organization_name: 'Mi organización',
    category: 'Impresoras',
    os_type: 'Mac',
    service_tier: 'Express $15',
    priority: 'low',
    problem_description:
      'Impresora multifunción aparecía sin conexión en macOS tras cambio de router.',
    ai_diagnosis_summary:
      'AI Receptionist (Mac): Asignación de IP fija DHCP y reconfiguración AirPrint / IPP.',
    client_name: 'Diego Villacís',
    client_email: 'dvillacis@arquitecturaviva.ec',
    rustdesk_id: '928374651',
    agent_type: 'installed',
    agent_downloaded: true,
    consent_accepted: true,
    consent_accepted_at: `${TODAY_ISO}T07:22:00.000Z`,
    payment_status: 'paid',
    status: 'resolved',
    assigned_to: '30000000-0000-4000-8000-000000000001',
    assigned_technician_id: '30000000-0000-4000-8000-000000000001',
    assigned_technician_name: 'Carlos Mendoza',
    assigned_technician_specialty: 'Windows & BSOD · Redes & VPN',
    resolution_notes:
      'INFORME TÉCNICO DE CIERRE · RS-1023\nSe asignó reserva DHCP al equipo multifunción y se reinstaló la cola IPP en macOS. Prueba de impresión verificada.',
    client_session_token: 'seed-token-rs1023-a1b2c3d4e5f6',
    claimed_at: `${TODAY_ISO}T07:23:00.000Z`,
    resolved_at: `${TODAY_ISO}T07:42:00.000Z`,
    created_at: `${TODAY_ISO}T07:20:00.000Z`,
  },
  {
    id: '11111111-1111-4111-8111-111111111106',
    ticket_code: 'RS-4418',
    organization_id: '00000000-0000-4000-8000-000000000002',
    organization_name: 'Andes IT Managed Services',
    category: 'Configuración de impresoras',
    os_type: 'Windows',
    service_tier: 'Express $15',
    priority: 'high',
    problem_description:
      'Impresora fiscal Epson en caja no recibe comprobantes desde ERP contable.',
    ai_diagnosis_summary:
      'AI Receptionist (Windows): Revisar puerto COM virtual, spooler y permisos de driver.',
    client_name: 'Farmacia Santa Lucía',
    client_email: 'caja@farmaciasantalucia.ec',
    rustdesk_id: '620194857',
    agent_type: 'installed',
    agent_downloaded: true,
    consent_accepted: true,
    consent_accepted_at: `${TODAY_ISO}T09:02:00.000Z`,
    payment_status: 'paid',
    status: 'ready_to_connect',
    assigned_to: null,
    assigned_technician_id: null,
    assigned_technician_name: null,
    assigned_technician_specialty: null,
    resolution_notes: null,
    client_session_token: 'seed-token-rs4418-a1b2c3d4e5f6',
    created_at: `${TODAY_ISO}T09:00:00.000Z`,
  },
  {
    id: '11111111-1111-4111-8111-111111111107',
    ticket_code: 'RS-5509',
    organization_id: '00000000-0000-4000-8000-000000000003',
    organization_name: 'Red Global Partners',
    category: 'VPN y acceso remoto',
    os_type: 'Windows',
    service_tier: 'Avanzado $39',
    priority: 'high',
    problem_description:
      'Enlace VPN entre sede principal y sucursal logística presenta pérdida de paquetes.',
    ai_diagnosis_summary:
      'AI Receptionist (Windows): Auditar túnel IPsec/WireGuard, rutas estáticas y DNS de sucursal.',
    client_name: 'Logística Pacífico',
    client_email: 'ti@logisticapacifico.net',
    rustdesk_id: '845201937',
    agent_type: 'installed',
    agent_downloaded: true,
    consent_accepted: true,
    consent_accepted_at: `${TODAY_ISO}T09:11:00.000Z`,
    payment_status: 'paid',
    status: 'ready_to_connect',
    assigned_to: null,
    assigned_technician_id: null,
    assigned_technician_name: null,
    assigned_technician_specialty: null,
    resolution_notes: null,
    client_session_token: 'seed-token-rs5509-a1b2c3d4e5f6',
    created_at: `${TODAY_ISO}T09:10:00.000Z`,
  },
];

export const SEED_MESSAGES: TicketMessage[] = [
  {
    id: '40000000-0000-4000-8000-000000000001',
    ticket_id: '11111111-1111-4111-8111-111111111101',
    sender_role: 'client',
    message:
      'Hola, ya descargué el agente RustDesk y vinculé mi ID 482 915 307.',
    created_at: `${TODAY_ISO}T09:17:00.000Z`,
  },
  {
    id: '40000000-0000-4000-8000-000000000002',
    ticket_id: '11111111-1111-4111-8111-111111111101',
    sender_role: 'technician',
    message:
      'Perfecto, ya estoy conectado revisando los parámetros MTU del túnel WireGuard.',
    created_at: `${TODAY_ISO}T09:18:00.000Z`,
  },
  {
    id: '40000000-0000-4000-8000-000000000003',
    ticket_id: '11111111-1111-4111-8111-111111111102',
    sender_role: 'client',
    message: 'Listo, el agente instalado muestra ID 719 402 835 en línea.',
    created_at: `${TODAY_ISO}T08:43:00.000Z`,
  },
];

export const SEED_DEVICES: ClientDevice[] = [
  {
    id: '50000000-0000-4000-8000-000000000001',
    organization_id: '00000000-0000-4000-8000-000000000001',
    client_name: 'Empresa demostrativa A',
    client_email: 'soporte@empresaa.com',
    device_name: 'PC-GERENCIA-01',
    os_type: 'Windows',
    rustdesk_id: '482915307',
    agent_type: 'temporary',
    plan_name: 'Avanzado $39',
    is_online: true,
    last_seen_at: `${TODAY_ISO}T10:12:00.000Z`,
  },
  {
    id: '50000000-0000-4000-8000-000000000002',
    organization_id: '00000000-0000-4000-8000-000000000001',
    client_name: 'Empresa demostrativa B',
    client_email: 'ti@empresab.com',
    device_name: 'SRV-CONTABILIDAD-02',
    os_type: 'Windows',
    rustdesk_id: '719402835',
    agent_type: 'installed',
    plan_name: 'Pyme Corporativo $79/mes',
    is_online: true,
    last_seen_at: `${TODAY_ISO}T10:08:00.000Z`,
  },
  {
    id: '50000000-0000-4000-8000-000000000003',
    organization_id: '00000000-0000-4000-8000-000000000001',
    client_name: 'Arquitectura Viva',
    client_email: 'dvillacis@arquitecturaviva.ec',
    device_name: 'MBP-DIEGO-STUDIO',
    os_type: 'Mac',
    rustdesk_id: '928374651',
    agent_type: 'installed',
    plan_name: 'Pyme Esencial $39/mes',
    is_online: true,
    last_seen_at: `${TODAY_ISO}T10:14:00.000Z`,
  },
  {
    id: '50000000-0000-4000-8000-000000000004',
    organization_id: '00000000-0000-4000-8000-000000000002',
    client_name: 'Farmacia Santa Lucía',
    client_email: 'caja@farmaciasantalucia.ec',
    device_name: 'POS-CAJA-PRINCIPAL',
    os_type: 'Windows',
    rustdesk_id: '620194857',
    agent_type: 'installed',
    plan_name: 'Pyme Esencial $39/mes',
    is_online: false,
    last_seen_at: `${TODAY_ISO}T08:55:00.000Z`,
  },
];

export const SEED_SESSIONS: RemoteSessionRecord[] = [
  {
    id: '60000000-0000-4000-8000-000000000001',
    organization_id: '00000000-0000-4000-8000-000000000001',
    ticket_code: 'RS-1024',
    client_name: 'Empresa demostrativa A',
    technician_name: 'Carlos Mendoza',
    rustdesk_id: '482915307',
    agent_type: 'temporary',
    status: 'active',
    started_at: `${TODAY_ISO}T09:17:00.000Z`,
    ended_at: null,
    duration_minutes: 14,
  },
  {
    id: '60000000-0000-4000-8000-000000000002',
    organization_id: '00000000-0000-4000-8000-000000000001',
    ticket_code: 'RS-1025',
    client_name: 'Empresa demostrativa B',
    technician_name: 'Valeria Salazar',
    rustdesk_id: '719402835',
    agent_type: 'installed',
    status: 'ended',
    started_at: `${TODAY_ISO}T08:42:00.000Z`,
    ended_at: `${TODAY_ISO}T08:51:00.000Z`,
    duration_minutes: 9,
  },
  {
    id: '60000000-0000-4000-8000-000000000003',
    organization_id: '00000000-0000-4000-8000-000000000001',
    ticket_code: 'RS-1023',
    client_name: 'Diego Villacís',
    technician_name: 'Carlos Mendoza',
    rustdesk_id: '928374651',
    agent_type: 'installed',
    status: 'ended',
    started_at: `${TODAY_ISO}T07:23:00.000Z`,
    ended_at: `${TODAY_ISO}T07:42:00.000Z`,
    duration_minutes: 19,
  },
];

export const SEED_AI_AGENTS: AiAgentConfig[] = [
  {
    id: '70000000-0000-4000-8000-000000000001',
    organization_id: '00000000-0000-4000-8000-000000000001',
    agent_key: 'ai_receptionist',
    agent_name: 'AI Receptionist',
    role_description:
      'Ejecuta triaje conversacional en el wizard público, formula 3 preguntas clave y genera pre-diagnóstico y tarifa recomendada.',
    is_enabled: true,
    governance_rules: [
      { id: 'r-rec-1', label: 'Solicitar descripción mínima antes de cotizar', enabled: true },
      { id: 'r-rec-2', label: 'Escalar casos críticos de servidor a humano', enabled: true },
    ],
    credits_used: 540,
  },
  {
    id: '70000000-0000-4000-8000-000000000002',
    organization_id: '00000000-0000-4000-8000-000000000001',
    agent_key: 'ai_dispatcher',
    agent_name: 'AI Dispatcher',
    role_description:
      'Asigna solicitudes entrantes según especialidad, carga activa y prioridad de nivel laboral.',
    is_enabled: true,
    governance_rules: [
      { id: 'r-disp-1', label: 'Priorizar técnicos internos antes que freelancers', enabled: true },
      { id: 'r-disp-2', label: 'Activar Red Global de Desborde tras 4 min sin toma', enabled: false },
    ],
    credits_used: 310,
  },
  {
    id: '70000000-0000-4000-8000-000000000003',
    organization_id: '00000000-0000-4000-8000-000000000001',
    agent_key: 'ai_technician_assistant',
    agent_name: 'AI Technician Assistant',
    role_description:
      'Asiste al técnico dentro de la ficha del ticket con comandos exactos para Windows y macOS.',
    is_enabled: true,
    governance_rules: [
      { id: 'r-tech-1', label: 'Bloquear comandos destructivos sin confirmación', enabled: true },
    ],
    credits_used: 420,
  },
  {
    id: '70000000-0000-4000-8000-000000000004',
    organization_id: '00000000-0000-4000-8000-000000000001',
    agent_key: 'ai_follow_up',
    agent_name: 'AI Follow-up',
    role_description:
      'Envía recordatorios amables si el cliente no ha registrado su ID de 9 dígitos o pago.',
    is_enabled: true,
    governance_rules: [
      { id: 'r-fol-1', label: 'Enviar recordatorio único a los 10 minutos', enabled: true },
    ],
    credits_used: 180,
  },
  {
    id: '70000000-0000-4000-8000-000000000005',
    organization_id: '00000000-0000-4000-8000-000000000001',
    agent_key: 'ai_report_generator',
    agent_name: 'AI Report Generator',
    role_description:
      'Redacta automáticamente el informe técnico formal de cierre para el cliente y auditoría.',
    is_enabled: true,
    governance_rules: [
      { id: 'r-rep-1', label: 'Incluir recomendaciones preventivas al cerrar', enabled: true },
    ],
    credits_used: 260,
  },
  {
    id: '70000000-0000-4000-8000-000000000006',
    organization_id: '00000000-0000-4000-8000-000000000001',
    agent_key: 'ai_operations_manager',
    agent_name: 'AI Operations Manager',
    role_description:
      'Supervisa SLA, detecta cuellos de botella por categoría y sugiere apertura de turnos.',
    is_enabled: false,
    governance_rules: [
      { id: 'r-ops-1', label: 'Alertar si el tiempo de respuesta supera 5 min', enabled: true },
    ],
    credits_used: 130,
  },
];

export const SEED_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: '80000000-0000-4000-8000-000000000001',
    organization_id: '00000000-0000-4000-8000-000000000001',
    actor_type: 'technician',
    actor_label: 'Carlos Mendoza',
    action: 'Reclamó atómicamente el ticket e inició túnel RustDesk',
    target_ref: 'RS-1024',
    created_at: `${TODAY_ISO}T09:17:00.000Z`,
  },
  {
    id: '80000000-0000-4000-8000-000000000002',
    organization_id: '00000000-0000-4000-8000-000000000001',
    actor_type: 'client',
    actor_label: 'Empresa demostrativa B',
    action: 'Aceptó consentimiento explícito de acceso remoto supervisado',
    target_ref: 'RS-1025',
    created_at: `${TODAY_ISO}T08:41:00.000Z`,
  },
  {
    id: '80000000-0000-4000-8000-000000000003',
    organization_id: '00000000-0000-4000-8000-000000000001',
    actor_type: 'ai_agent',
    actor_label: 'AI Report Generator',
    action: 'Generó informe técnico de cierre verificado',
    target_ref: 'RS-1023',
    created_at: `${TODAY_ISO}T07:42:00.000Z`,
  },
];

function broadcastSync(): void {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
  try {
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channel.postMessage({ type: 'sync', ts: Date.now() });
    channel.close();
  } catch {
    // Ignore BroadcastChannel unavailability
  }
}

function loadSanitizedCollection<T>(
  key: string,
  seed: T[],
  validate: (item: unknown) => item is T,
  normalize?: (item: T) => T,
  allowEmpty: boolean = false
): T[] {
  if (typeof window === 'undefined') return seed;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      writeLocalSilentIfChanged(key, seed);
      return seed;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      writeLocalSilentIfChanged(key, seed);
      return seed;
    }
    const filtered = parsed.filter(validate);
    const sanitized = normalize ? filtered.map(normalize) : filtered;
    const hadInvalidItems = sanitized.length !== parsed.length;
    if (sanitized.length === 0 && (!allowEmpty || parsed.length > 0)) {
      writeLocalSilentIfChanged(key, seed);
      return seed;
    }
    if (hadInvalidItems) {
      writeLocalSilentIfChanged(key, sanitized);
    }
    return sanitized;
  } catch {
    writeLocalSilentIfChanged(key, seed);
    return seed;
  }
}

function isNonEmptyStr(val: unknown): val is string {
  return typeof val === 'string' && val.trim().length > 0;
}

function excludeSeedRecords<T extends { id: string }>(records: T[], seeds: T[]): T[] {
  if (!isSupabaseConfigured()) return records;
  const seedIds = new Set(seeds.map((record) => record.id));
  return records.filter((record) => !seedIds.has(record.id));
}

function writeLocal<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    broadcastSync();
  } catch {
    // Ignore storage restriction errors
  }
}

function writeLocalSilentIfChanged<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(value);
    if (window.localStorage.getItem(key) !== serialized) {
      window.localStorage.setItem(key, serialized);
    }
  } catch {
    // Ignore storage errors
  }
}

function saveRoomToken(ticketCode: string, token: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(ROOM_TOKENS_STORAGE_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[ticketCode.toUpperCase()] = token;
    window.localStorage.setItem(ROOM_TOKENS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

function getRoomToken(ticketCode: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ROOM_TOKENS_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[ticketCode.toUpperCase()] ?? null;
  } catch {
    return null;
  }
}

function getLocalFallbackTicketIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(LOCAL_FALLBACK_TICKET_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function markLocalFallbackTicket(ticketId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const ids = getLocalFallbackTicketIds();
    ids.add(ticketId);
    window.localStorage.setItem(
      LOCAL_FALLBACK_TICKET_IDS_KEY,
      JSON.stringify(Array.from(ids))
    );
  } catch {
    // Ignore storage errors
  }
}

function formatSupabaseError(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'No se pudo sincronizar con Supabase. Verifica tu red o permisos RLS.';
}

function extractMissingSchemaColumn(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const code = 'code' in err ? String((err as { code?: unknown }).code ?? '') : '';
  const message =
    'message' in err ? String((err as { message?: unknown }).message ?? '') : '';
  if (code !== 'PGRST204' && code !== '42703' && !/schema cache/i.test(message)) {
    return null;
  }
  const pgrstMatch = message.match(/Could not find the '([^']+)' column/i);
  if (pgrstMatch?.[1]) return pgrstMatch[1];
  const pgMatch = message.match(/column\s+"([^"]+)"\s+of\s+relation/i);
  if (pgMatch?.[1]) return pgMatch[1];
  return null;
}

function getTicketTimestampMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

export function sortTicketsDeterministically(
  list: SupportTicket[]
): SupportTicket[] {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const diff =
      getTicketTimestampMs(b?.created_at) - getTicketTimestampMs(a?.created_at);
    if (diff !== 0) return diff;
    return String(b?.ticket_code ?? '').localeCompare(
      String(a?.ticket_code ?? '')
    );
  });
}

export function haveTicketsChanged(
  prev: SupportTicket[],
  next: SupportTicket[]
): boolean {
  if (prev === next) return false;
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i += 1) {
    const a = prev[i];
    const b = next[i];
    if (
      a.id !== b.id ||
      a.ticket_code !== b.ticket_code ||
      a.status !== b.status ||
      a.payment_status !== b.payment_status ||
      a.rustdesk_id !== b.rustdesk_id ||
      a.assigned_to !== b.assigned_to ||
      a.claimed_at !== b.claimed_at ||
      a.resolved_at !== b.resolved_at ||
      a.consent_accepted_at !== b.consent_accepted_at ||
      a.subscription_status !== b.subscription_status ||
      a.anonymized_at !== b.anonymized_at
    ) {
      return true;
    }
  }
  try {
    return JSON.stringify(prev) !== JSON.stringify(next);
  } catch {
    return true;
  }
}

export function haveRecordsChanged<T>(prev: T[], next: T[]): boolean {
  if (prev === next) return false;
  if (prev.length !== next.length) return true;
  try {
    return JSON.stringify(prev) !== JSON.stringify(next);
  } catch {
    return true;
  }
}

export const supportAdapter = {
  loadTickets(): SupportTicket[] {
    const valid = loadSanitizedCollection<SupportTicket>(
      TICKETS_STORAGE_KEY,
      SEED_TICKETS,
      (item): item is SupportTicket => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
        const t = item as Partial<SupportTicket>;
        return (
          isNonEmptyStr(t.id) &&
          isNonEmptyStr(t.ticket_code) &&
          isNonEmptyStr(t.organization_id) &&
          isNonEmptyStr(t.client_name) &&
          isNonEmptyStr(t.status) &&
          isNonEmptyStr(t.payment_status) &&
          isNonEmptyStr(t.created_at)
        );
      }
    );
    return sortTicketsDeterministically(excludeSeedRecords(valid, SEED_TICKETS));
  },

  saveTickets(tickets: SupportTicket[]): SupportTicket[] {
    const sorted = sortTicketsDeterministically(tickets);
    writeLocal(TICKETS_STORAGE_KEY, sorted);
    return sorted;
  },

  loadMessages(): TicketMessage[] {
    return excludeSeedRecords(loadSanitizedCollection<TicketMessage>(
      MESSAGES_STORAGE_KEY,
      SEED_MESSAGES,
      (item): item is TicketMessage => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
        const m = item as Partial<TicketMessage>;
        return (
          isNonEmptyStr(m.id) &&
          isNonEmptyStr(m.ticket_id) &&
          isNonEmptyStr(m.sender_role) &&
          typeof m.message === 'string' &&
          isNonEmptyStr(m.created_at)
        );
      },
      undefined,
      true
    ), SEED_MESSAGES);
  },

  loadOrganizations(): Organization[] {
    return excludeSeedRecords(loadSanitizedCollection<Organization>(
      ORGS_STORAGE_KEY,
      SEED_ORGANIZATIONS,
      (item): item is Organization => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
        const o = item as Partial<Organization>;
        return (
          isNonEmptyStr(o.id) &&
          isNonEmptyStr(o.name) &&
          isNonEmptyStr(o.slug) &&
          isNonEmptyStr(o.created_at)
        );
      },
      (item) => ({
        ...item,
        rustdesk_relay_domain:
          item.rustdesk_relay_domain ?? 'relay.remotesupport365.com',
      })
    ), SEED_ORGANIZATIONS.filter(
      (organization) => organization.id !== '00000000-0000-4000-8000-000000000001'
    ));
  },

  loadMembers(): OrganizationMember[] {
    const normalizeSpecialties = (raw: unknown): TechnicianSpecialty[] => {
      if (!Array.isArray(raw)) return ['Windows & BSOD'];
      const mapLegacy: Record<string, TechnicianSpecialty> = {
        Windows: 'Windows & BSOD',
        'Microsoft 365': 'Microsoft 365 & Outlook',
        Redes: 'Redes & VPN',
        'Windows & BSOD': 'Windows & BSOD',
        'Microsoft 365 & Outlook': 'Microsoft 365 & Outlook',
        Impresoras: 'Impresoras',
        'Redes & VPN': 'Redes & VPN',
        'Seguridad & Malware': 'Seguridad & Malware',
        'Recuperación de Datos': 'Recuperación de Datos',
      };
      const mapped = Array.from(
        new Set(
          raw
            .map((item) => (typeof item === 'string' ? mapLegacy[item] : undefined))
            .filter((item): item is TechnicianSpecialty => Boolean(item))
        )
      );
      return mapped.length > 0 ? mapped : ['Windows & BSOD'];
    };

    return excludeSeedRecords(loadSanitizedCollection<OrganizationMember>(
      MEMBERS_STORAGE_KEY,
      SEED_MEMBERS,
      (item): item is OrganizationMember => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
        const m = item as Partial<OrganizationMember>;
        return (
          isNonEmptyStr(m.id) &&
          isNonEmptyStr(m.organization_id) &&
          isNonEmptyStr(m.full_name) &&
          isNonEmptyStr(m.email)
        );
      },
      (item) => ({
        ...item,
        specialties: normalizeSpecialties(item.specialties),
      })
    ), SEED_MEMBERS);
  },

  loadDevices(): ClientDevice[] {
    return excludeSeedRecords(loadSanitizedCollection<ClientDevice>(
      DEVICES_STORAGE_KEY,
      SEED_DEVICES,
      (item): item is ClientDevice => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
        const d = item as Partial<ClientDevice>;
        return (
          isNonEmptyStr(d.id) &&
          isNonEmptyStr(d.organization_id) &&
          isNonEmptyStr(d.device_name) &&
          isNonEmptyStr(d.rustdesk_id)
        );
      },
      undefined,
      true
    ), SEED_DEVICES);
  },

  loadSessions(): RemoteSessionRecord[] {
    return excludeSeedRecords(loadSanitizedCollection<RemoteSessionRecord>(
      SESSIONS_STORAGE_KEY,
      SEED_SESSIONS,
      (item): item is RemoteSessionRecord => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
        const s = item as Partial<RemoteSessionRecord>;
        return (
          isNonEmptyStr(s.id) &&
          isNonEmptyStr(s.organization_id) &&
          isNonEmptyStr(s.ticket_code) &&
          isNonEmptyStr(s.rustdesk_id) &&
          isNonEmptyStr(s.started_at)
        );
      },
      undefined,
      true
    ), SEED_SESSIONS);
  },

  loadAiAgents(): AiAgentConfig[] {
    return excludeSeedRecords(loadSanitizedCollection<AiAgentConfig>(
      AI_AGENTS_STORAGE_KEY,
      SEED_AI_AGENTS,
      (item): item is AiAgentConfig => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
        const a = item as Partial<AiAgentConfig>;
        return (
          isNonEmptyStr(a.id) &&
          isNonEmptyStr(a.organization_id) &&
          isNonEmptyStr(a.agent_key) &&
          isNonEmptyStr(a.agent_name) &&
          Array.isArray(a.governance_rules)
        );
      }
    ), SEED_AI_AGENTS);
  },

  loadAuditLogs(): AuditLogEntry[] {
    return excludeSeedRecords(loadSanitizedCollection<AuditLogEntry>(
      AUDIT_STORAGE_KEY,
      SEED_AUDIT_LOGS,
      (item): item is AuditLogEntry => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
        const log = item as Partial<AuditLogEntry>;
        return (
          isNonEmptyStr(log.id) &&
          isNonEmptyStr(log.organization_id) &&
          isNonEmptyStr(log.actor_label) &&
          isNonEmptyStr(log.action) &&
          isNonEmptyStr(log.created_at)
        );
      },
      undefined,
      true
    ), SEED_AUDIT_LOGS);
  },

  saveOrganizations(orgs: Organization[]): void {
    writeLocal(ORGS_STORAGE_KEY, orgs);
  },

  saveMembers(members: OrganizationMember[]): void {
    writeLocal(MEMBERS_STORAGE_KEY, members);
  },

  saveDevices(devices: ClientDevice[]): void {
    writeLocal(DEVICES_STORAGE_KEY, devices);
  },

  saveSessions(sessions: RemoteSessionRecord[]): void {
    writeLocal(SESSIONS_STORAGE_KEY, sessions);
  },

  syncDeviceForTicket(
    ticket: SupportTicket,
    devices: ClientDevice[]
  ): ClientDevice[] {
    if (!ticket.rustdesk_id) return devices;
    const nowIso = new Date().toISOString();
    const existingIndex = devices.findIndex(
      (d) =>
        d.rustdesk_id === ticket.rustdesk_id &&
        d.organization_id === ticket.organization_id
    );
    const planLabel =
      ticket.agent_type === 'installed'
        ? 'Plan Pyme (Agente Instalado)'
        : `Asistencia Puntual (${ticket.service_tier})`;

    if (existingIndex >= 0) {
      const next = devices.map((dev, idx) =>
        idx === existingIndex
          ? {
              ...dev,
              client_name: ticket.client_name,
              client_email: ticket.client_email,
              os_type: ticket.os_type,
              agent_type: ticket.agent_type,
              plan_name: planLabel,
              is_online: true,
              last_seen_at: nowIso,
            }
          : dev
      );
      this.saveDevices(next);
      return next;
    }

    const devicePrefix =
      ticket.os_type === 'Mac'
        ? 'MAC'
        : ticket.os_type === 'Linux'
        ? 'LNX'
        : ticket.os_type === 'Mobile'
        ? 'MOB'
        : 'PC';
    const shortName = ticket.client_name
      .trim()
      .split(/\s+/)[0]
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);
    const created: ClientDevice = {
      id: generateUuid(),
      organization_id: ticket.organization_id,
      client_name: ticket.client_name,
      client_email: ticket.client_email,
      device_name: `${devicePrefix}-${shortName || 'CLIENTE'}-${ticket.ticket_code.replace('RS-', '')}`,
      os_type: ticket.os_type,
      rustdesk_id: ticket.rustdesk_id,
      agent_type: ticket.agent_type,
      plan_name: planLabel,
      is_online: true,
      last_seen_at: nowIso,
    };
    const next = [created, ...devices];
    this.saveDevices(next);
    return next;
  },

  syncSessionForTicket(
    ticket: SupportTicket,
    sessions: RemoteSessionRecord[]
  ): RemoteSessionRecord[] {
    const nowIso = new Date().toISOString();
    const existingIndex = sessions.findIndex(
      (s) => s.ticket_code === ticket.ticket_code
    );

    if (ticket.status === 'resolved') {
      if (existingIndex < 0) return sessions;
      const next = sessions.map((ses, idx) => {
        if (idx !== existingIndex) return ses;
        const startMs = Date.parse(ses.started_at);
        const endMs = Date.parse(nowIso);
        const computedMin =
          !Number.isNaN(startMs) && endMs >= startMs
            ? Math.max(1, Math.round((endMs - startMs) / 60000))
            : ses.duration_minutes;
        return {
          ...ses,
          status: 'ended' as const,
          ended_at: nowIso,
          duration_minutes: computedMin,
        };
      });
      this.saveSessions(next);
      return next;
    }

    if (ticket.status === 'in_progress') {
      const techName = ticket.assigned_technician_name ?? 'Carlos Mendoza';
      const rustdeskId = ticket.rustdesk_id ?? '000000000';
      if (existingIndex >= 0) {
        const next = sessions.map((ses, idx) =>
          idx === existingIndex
            ? {
                ...ses,
                technician_name: techName,
                rustdesk_id: rustdeskId,
                agent_type: ticket.agent_type,
                status: 'active' as const,
                ended_at: null,
              }
            : ses
        );
        this.saveSessions(next);
        return next;
      }

      const created: RemoteSessionRecord = {
        id: generateUuid(),
        organization_id: ticket.organization_id,
        ticket_code: ticket.ticket_code,
        client_name: ticket.client_name,
        technician_name: techName,
        rustdesk_id: rustdeskId,
        agent_type: ticket.agent_type,
        status: 'active',
        started_at: ticket.claimed_at ?? nowIso,
        ended_at: null,
        duration_minutes: 1,
      };
      const next = [created, ...sessions];
      this.saveSessions(next);
      return next;
    }

    return sessions;
  },

  saveAiAgents(agents: AiAgentConfig[]): void {
    writeLocal(AI_AGENTS_STORAGE_KEY, agents);
  },

  appendAuditLog(entry: Omit<AuditLogEntry, 'id' | 'created_at'>): AuditLogEntry[] {
    const current = this.loadAuditLogs();
    const next: AuditLogEntry[] = [
      {
        ...entry,
        id: generateUuid(),
        created_at: new Date().toISOString(),
      },
      ...current,
    ];
    writeLocal(AUDIT_STORAGE_KEY, next);
    return next;
  },

  async syncFromSupabaseIfConfigured(options?: {
    ticketCode?: string;
  }): Promise<
    AdapterResult<{
      tickets?: SupportTicket[];
      messages?: TicketMessage[];
      organizations?: Organization[];
      members?: OrganizationMember[];
    }>
  > {
    if (!isSupabaseConfigured()) {
      return { ok: true, data: {} };
    }

    try {
      const staffClient = getSupabaseClient();
      const sessionRes = staffClient ? await staffClient.auth.getSession() : null;
      const hasTechSession = Boolean(sessionRes?.data?.session);

      let client = staffClient;
      let hasOperatorSession = hasTechSession;
      if (options?.ticketCode) {
        const token = getRoomToken(options.ticketCode);
        if (token) {
          client = getRoomScopedSupabaseClient(options.ticketCode, token);
          hasOperatorSession = false;
        }
      }

      if (!client) {
        return { ok: true, data: {} };
      }

      const [
        ticketsQuery,
        messagesQuery,
        orgsQuery,
        membersQuery,
        techProfilesQuery,
      ] = await Promise.all([
        client
          .from('tickets')
          .select('*')
          .order('created_at', { ascending: false })
          .order('ticket_code', { ascending: false }),
        client.from('ticket_messages').select('*').order('created_at', { ascending: true }),
        hasOperatorSession
          ? client.from('organizations').select('*').order('created_at', { ascending: true })
          : Promise.resolve({ data: null, error: null }),
        hasOperatorSession
          ? client.from('organization_members').select('*').order('created_at', { ascending: true })
          : Promise.resolve({ data: null, error: null }),
        hasOperatorSession
          ? client.from('technician_profiles').select('*')
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (ticketsQuery.error) {
        return {
          ok: false,
          data: {},
          error: `Error al leer tickets desde Supabase: ${ticketsQuery.error.message}`,
        };
      }
      if (messagesQuery.error) {
        return {
          ok: false,
          data: {},
          error: `Error al leer mensajes desde Supabase: ${messagesQuery.error.message}`,
        };
      }

      const remoteOrgs =
        !orgsQuery.error && Array.isArray(orgsQuery.data) && orgsQuery.data.length > 0
          ? (orgsQuery.data as Organization[])
          : undefined;

      const orgLookup = new Map<string, string>();
      for (const org of this.loadOrganizations()) {
        orgLookup.set(org.id, org.name);
      }
      if (remoteOrgs) {
        for (const org of remoteOrgs) {
          orgLookup.set(org.id, org.name);
        }
        writeLocalSilentIfChanged(ORGS_STORAGE_KEY, remoteOrgs);
      }

      const techProfilesByUserId = new Map<
        string,
        {
          specialties?: TechnicianSpecialty[];
          availability_status?: TechnicianAvailability;
          accepting_requests?: boolean;
          rating?: number;
        }
      >();
      if (!techProfilesQuery.error && Array.isArray(techProfilesQuery.data)) {
        for (const tp of techProfilesQuery.data as Array<{
          user_id: string;
          specialties?: TechnicianSpecialty[];
          availability_status?: TechnicianAvailability;
          accepting_requests?: boolean;
          rating?: number;
        }>) {
          techProfilesByUserId.set(tp.user_id, tp);
        }
      }

      let remoteMembers: OrganizationMember[] | undefined;
      if (
        !membersQuery.error &&
        Array.isArray(membersQuery.data) &&
        membersQuery.data.length > 0
      ) {
        const localMemberMap = new Map(
          this.loadMembers().map((m) => [m.email.toLowerCase(), m])
        );
        remoteMembers = (
          membersQuery.data as Array<{
            id: string;
            organization_id: string;
            user_id: string | null;
            full_name: string;
            email: string;
            member_type: MemberTierType;
            role: 'owner' | 'admin' | 'technician';
            agreed_ticket_rate_usd: number;
            status: 'active' | 'invited' | 'suspended';
          }>
        ).map((row) => {
          const tp = row.user_id ? techProfilesByUserId.get(row.user_id) : undefined;
          const localMatch = localMemberMap.get(row.email.toLowerCase());
          return {
            id: row.id,
            organization_id: row.organization_id,
            user_id: row.user_id,
            full_name: row.full_name,
            email: row.email,
            member_type: row.member_type,
            role: row.role,
            agreed_ticket_rate_usd: Number(row.agreed_ticket_rate_usd ?? 0),
            status: row.status,
            specialties: tp?.specialties ?? localMatch?.specialties ?? ['Windows & BSOD', 'Redes & VPN'],
            availability_status:
              tp?.availability_status ?? localMatch?.availability_status ?? 'available',
            accepting_requests:
              tp?.accepting_requests ?? localMatch?.accepting_requests ?? true,
            rating: Number(tp?.rating ?? localMatch?.rating ?? 5.0),
            resolved_count: localMatch?.resolved_count ?? 0,
          };
        });
        writeLocalSilentIfChanged(MEMBERS_STORAGE_KEY, remoteMembers);
      }

      const rawTickets = (ticketsQuery.data as SupportTicket[] | null) ?? undefined;
      const hydratedRemoteTickets =
        rawTickets?.map((t) => ({
          ...t,
          organization_name:
            (t.organization_name && t.organization_name.trim()) ||
            orgLookup.get(t.organization_id) ||
            'Mi organización',
        })) ?? [];

      const fallbackIds = getLocalFallbackTicketIds();
      const localTickets = this.loadTickets();
      const remoteIds = new Set(hydratedRemoteTickets.map((t) => t.id));
      const preservedFallbackTickets = localTickets.filter(
        (t) =>
          !remoteIds.has(t.id) &&
          (fallbackIds.has(t.id) ||
            (options?.ticketCode &&
              t.ticket_code.toUpperCase() === options.ticketCode.toUpperCase()))
      );
      const mergedById = new Map<string, SupportTicket>();
      for (const fallbackTicket of preservedFallbackTickets) {
        mergedById.set(fallbackTicket.id, fallbackTicket);
      }
      for (const remoteTicket of hydratedRemoteTickets) {
        mergedById.set(remoteTicket.id, remoteTicket);
      }
      const hydratedTickets =
        mergedById.size > 0
          ? sortTicketsDeterministically(Array.from(mergedById.values()))
          : undefined;

      if (hydratedTickets) {
        writeLocalSilentIfChanged(TICKETS_STORAGE_KEY, hydratedTickets);
      }

      return {
        ok: true,
        data: {
          tickets: hydratedTickets,
          messages: (messagesQuery.data as TicketMessage[] | null) ?? undefined,
          organizations: remoteOrgs,
          members: remoteMembers,
        },
      };
    } catch (error) {
      return {
        ok: false,
        data: {},
        error: formatSupabaseError(error),
      };
    }
  },

  async persistTicket(
    ticket: SupportTicket,
    existing: SupportTicket[]
  ): Promise<AdapterResult<SupportTicket[]>> {
    saveRoomToken(ticket.ticket_code, ticket.client_session_token);
    const next = sortTicketsDeterministically([
      ticket,
      ...existing.filter((item) => item.id !== ticket.id),
    ]);
    let fallbackWarning: string | undefined;

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.warn(
          '[Supabase persistTicket] Cliente Supabase no inicializado; guardando ticket en respaldo local.'
        );
        markLocalFallbackTicket(ticket.id);
        fallbackWarning =
          'El ticket se creó en modo respaldo local (pendiente de sincronizar con Supabase).';
      } else {
        try {
          const insertPayload: Record<string, unknown> = {
            id: ticket.id,
            ticket_code: ticket.ticket_code,
            organization_id: ticket.organization_id,
            organization_name: ticket.organization_name,
            category: ticket.category,
            client_name: ticket.client_name,
            client_email: ticket.client_email,
            client_birth_date: ticket.client_birth_date ?? null,
            is_adult_verified: Boolean(ticket.is_adult_verified),
            terms_accepted_at: ticket.terms_accepted_at ?? null,
            terms_version: ticket.terms_version ?? null,
            marketing_opt_in: Boolean(ticket.marketing_opt_in),
            billing_mode: ticket.billing_mode ?? 'one_time',
            os_type: ticket.os_type,
            service_tier: ticket.service_tier,
            priority: ticket.priority,
            problem_description: ticket.problem_description,
            ai_diagnosis: ticket.ai_diagnosis ?? {},
            ai_diagnosis_summary: ticket.ai_diagnosis_summary,
            client_session_token: ticket.client_session_token,
            created_at: ticket.created_at,
          };

          let insertError: unknown = null;
          const strippedColumns: string[] = [];

          for (let attempt = 0; attempt < 20; attempt += 1) {
            const { error } = await supabase.from('tickets').insert(insertPayload);
            if (!error) {
              insertError = null;
              break;
            }
            const missingCol = extractMissingSchemaColumn(error);
            if (missingCol && missingCol in insertPayload) {
              delete insertPayload[missingCol];
              strippedColumns.push(missingCol);
              continue;
            }
            insertError = error;
            break;
          }

          if (strippedColumns.length > 0 && !insertError) {
            console.info(
              '[Supabase persistTicket] Insertado en Supabase omitiendo columnas aún no presentes en caché de esquema:',
              strippedColumns.join(', ')
            );
          }

          if (insertError) {
            console.warn(
              '[Supabase persistTicket] Fallback local activado en public.tickets:',
              insertError
            );
            markLocalFallbackTicket(ticket.id);
            fallbackWarning = `Ticket generado en respaldo local (Supabase reportó: ${formatSupabaseError(insertError)}).`;
          }
        } catch (error) {
          console.warn(
            '[Supabase persistTicket] Excepción en Supabase; activando fallback local:',
            error
          );
          markLocalFallbackTicket(ticket.id);
          fallbackWarning = `Ticket generado en respaldo local (${formatSupabaseError(error)}).`;
        }
      }
    }

    try {
      const saved = this.saveTickets(next);
      if (ticket.terms_accepted_at) {
        this.appendAuditLog({
          organization_id: ticket.organization_id,
          actor_type: 'client',
          actor_label: ticket.client_name,
          action: `Verificó +18 años y aceptó Términos ${ticket.terms_version ?? 'v1.0-2026'} (marketing=${ticket.marketing_opt_in ? 'sí' : 'no'})`,
          target_ref: ticket.ticket_code,
        });
      }
      this.appendAuditLog({
        organization_id: ticket.organization_id,
        actor_type: 'ai_agent',
        actor_label: 'AI Receptionist',
        action: `Emitió ticket con pre-diagnóstico (${ticket.os_type} · ${ticket.service_tier})`,
        target_ref: ticket.ticket_code,
      });
      return {
        ok: true,
        data: saved,
        ...(fallbackWarning ? { warning: fallbackWarning } : {}),
      };
    } catch (error) {
      console.warn(
        '[supportAdapter persistTicket] No se pudo escribir en localStorage; devolviendo estado en memoria:',
        error
      );
      return {
        ok: true,
        data: next,
        warning:
          fallbackWarning ??
          'El ticket se generó en sesión actual (almacenamiento local restringido).',
      };
    }
  },

  async claimTicketAtomically(
    ticketId: string,
    techId: string,
    techName: string,
    techSpecialty: string,
    existing: SupportTicket[]
  ): Promise<AdapterResult<SupportTicket[]>> {
    const currentLocal = isSupabaseConfigured() ? existing : this.loadTickets();
    const target = currentLocal.find((t) => t.id === ticketId);

    if (!target) {
      return { ok: false, data: currentLocal, error: 'Ticket no encontrado.' };
    }

    if (!canClaimTicket(target)) {
      return {
        ok: false,
        data: currentLocal,
        error: `El ticket ${target.ticket_code} ya fue reclamado por ${
          target.assigned_technician_name ?? 'otro técnico'
        } y está bloqueado atómicamente.`,
      };
    }

    if (!isValidUuid(ticketId) || !isValidUuid(techId)) {
      return {
        ok: false,
        data: currentLocal,
        error: 'Identificador UUID inválido para el ticket o el técnico.',
      };
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) {
        return { ok: false, data: existing, error: 'Cliente Supabase no inicializado.' };
      }
      try {
        const { data, error } = await supabase.rpc('claim_ticket_atomically', {
          p_ticket_id: ticketId,
          p_tech_id: techId,
        });
        if (error) {
          return {
            ok: false,
            data: existing,
            error: `Fallo en asignación atómica: ${error.message}`,
          };
        }
        const payload = data as { claimed?: boolean; reason?: string; ticket?: SupportTicket } | null;
        if (!payload?.claimed) {
          return {
            ok: false,
            data: existing,
            error: payload?.reason ?? 'Ticket ya asignado a otro especialista.',
          };
        }
      } catch (err) {
        return { ok: false, data: existing, error: formatSupabaseError(err) };
      }
    }

    const nowIso = new Date().toISOString();
    const next = sortTicketsDeterministically(
      currentLocal.map((ticket) => {
        if (ticket.id !== ticketId) return ticket;
        const nextStatus: TicketStatus =
          ticket.status === 'resolved' ? 'resolved' : 'in_progress';
        return {
          ...ticket,
          assigned_to: techId,
          assigned_technician_id: techId,
          assigned_technician_name: techName,
          assigned_technician_specialty: techSpecialty,
          status: nextStatus,
          claimed_at: nowIso,
        };
      })
    );

    const saved = this.saveTickets(next);
    this.appendAuditLog({
      organization_id: target.organization_id,
      actor_type: 'technician',
      actor_label: techName,
      action: 'Aceptó solicitud con bloqueo atómico (claim_ticket_atomically)',
      target_ref: target.ticket_code,
    });

    return { ok: true, data: saved };
  },

  async updateTicket(
    ticketId: string,
    patch: Partial<
      Pick<
        SupportTicket,
        | 'rustdesk_id'
        | 'agent_type'
        | 'consent_accepted'
        | 'consent_accepted_at'
        | 'payment_status'
        | 'status'
        | 'assigned_to'
        | 'assigned_technician_id'
        | 'assigned_technician_name'
        | 'assigned_technician_specialty'
        | 'resolution_notes'
        | 'agent_downloaded'
        | 'claimed_at'
        | 'resolved_at'
        | 'client_name'
        | 'client_email'
        | 'client_birth_date'
        | 'marketing_opt_in'
        | 'subscription_status'
        | 'anonymized_at'
      >
    >,
    existing: SupportTicket[],
    scope?: { ticketCode?: string; sessionToken?: string }
  ): Promise<AdapterResult<SupportTicket[]>> {
    const isLocalFallback = getLocalFallbackTicketIds().has(ticketId);
    const safePatch = isSupabaseConfigured() && !isLocalFallback
      ? Object.fromEntries(Object.entries(patch).filter(([key]) => key !== 'payment_status')) as typeof patch
      : patch;
    const next = sortTicketsDeterministically(
      existing.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, ...safePatch } : ticket
      )
    );

    if (isSupabaseConfigured() && !isLocalFallback) {
      try {
        const staffClient = getSupabaseClient();
        const sessionRes = staffClient ? await staffClient.auth.getSession() : null;
        const hasTechSession = Boolean(sessionRes?.data?.session);

        const targetTicket = existing.find((t) => t.id === ticketId);
        const ticketCode = scope?.ticketCode ?? targetTicket?.ticket_code;
        const token =
          scope?.sessionToken ??
          (ticketCode ? getRoomToken(ticketCode) : null) ??
          targetTicket?.client_session_token;

        let isStaffForTicket = false;
        const operatorId = sessionRes?.data.session?.user.id;
        if (hasTechSession && operatorId && targetTicket?.organization_id && staffClient) {
          const [memberResult, profileResult] = await Promise.all([
            staffClient
              .from('organization_members')
              .select('id')
              .eq('organization_id', targetTicket.organization_id)
              .eq('user_id', operatorId)
              .eq('status', 'active')
              .limit(1),
            staffClient.from('profiles').select('role').eq('id', operatorId).maybeSingle(),
          ]);
          isStaffForTicket = Boolean(
            (!memberResult.error && memberResult.data?.length) ||
            (!profileResult.error && profileResult.data?.role === 'admin')
          );
        }

        const client = ticketCode && token
          ? getRoomScopedSupabaseClient(ticketCode, token)
          : staffClient;

        if (!client) {
          return {
            ok: false,
            data: existing,
            error: 'No hay cliente autorizado de Supabase para actualizar el ticket.',
          };
        }

        const dbPatch: Record<string, unknown> = {};
        if ('rustdesk_id' in patch) dbPatch.rustdesk_id = patch.rustdesk_id;
        if ('agent_type' in patch) dbPatch.agent_type = patch.agent_type;
        if ('consent_accepted' in patch) dbPatch.consent_accepted = patch.consent_accepted;
        if ('consent_accepted_at' in patch)
          dbPatch.consent_accepted_at = patch.consent_accepted_at;
        // payment_status is server-owned and never accepted from a browser update.
        if ('status' in patch) dbPatch.status = patch.status;
        if ('assigned_to' in patch) dbPatch.assigned_to = patch.assigned_to;
        if ('assigned_technician_id' in patch)
          dbPatch.assigned_technician_id = patch.assigned_technician_id;
        if ('assigned_technician_name' in patch)
          dbPatch.assigned_technician_name = patch.assigned_technician_name;
        if ('assigned_technician_specialty' in patch)
          dbPatch.assigned_technician_specialty = patch.assigned_technician_specialty;
        if ('resolution_notes' in patch) dbPatch.resolution_notes = patch.resolution_notes;
        if ('agent_downloaded' in patch) dbPatch.agent_downloaded = patch.agent_downloaded;
        if ('claimed_at' in patch) dbPatch.claimed_at = patch.claimed_at;
        if ('resolved_at' in patch) dbPatch.resolved_at = patch.resolved_at;
        if ('client_name' in patch) dbPatch.client_name = patch.client_name;
        if ('client_email' in patch) dbPatch.client_email = patch.client_email;
        if ('client_birth_date' in patch) dbPatch.client_birth_date = patch.client_birth_date;
        if ('marketing_opt_in' in patch) dbPatch.marketing_opt_in = patch.marketing_opt_in;
        if ('subscription_status' in patch)
          dbPatch.subscription_status = patch.subscription_status;
        if ('anonymized_at' in patch) dbPatch.anonymized_at = patch.anonymized_at;

        let updateError: unknown = null;
        if ('status' in dbPatch) {
          if (!isStaffForTicket || !staffClient) {
            return {
              ok: false,
              data: existing,
              error: 'Solo un técnico asignado o administrador puede cambiar el estado del ticket.',
            };
          }
          const { data, error } = await staffClient.rpc('update_ticket_as_staff', {
            p_ticket_id: ticketId,
            p_status: dbPatch.status,
            p_resolution_notes: typeof dbPatch.resolution_notes === 'string'
              ? dbPatch.resolution_notes
              : null,
            p_resolved_at: typeof dbPatch.resolved_at === 'string'
              ? dbPatch.resolved_at
              : null,
          });
          if (error || data !== true) {
            return {
              ok: false,
              data: existing,
              error: error
                ? `Fallo al guardar el estado del ticket: ${formatSupabaseError(error)}`
                : 'El servidor rechazó el cambio de estado por permisos, pago o transición inválida.',
            };
          }
          delete dbPatch.status;
          delete dbPatch.resolution_notes;
          delete dbPatch.resolved_at;
        }

        for (let attempt = 0; attempt < 20; attempt += 1) {
          if (Object.keys(dbPatch).length === 0) {
            updateError = null;
            break;
          }
          const { data, error } = await client
            .from('tickets')
            .update(dbPatch)
            .eq('id', ticketId)
            .select('id')
            .maybeSingle();

          if (!error) {
            updateError = data
              ? null
              : new Error('Supabase no actualizó el ticket; revisa la sesión, la política RLS y la versión del esquema.');
            break;
          }
          const missingCol = extractMissingSchemaColumn(error);
          if (missingCol && missingCol in dbPatch) {
            delete dbPatch[missingCol];
            continue;
          }
          updateError = error;
          break;
        }

        if (updateError) {
          return {
            ok: false,
            data: existing,
            error: `Fallo al guardar actualización en Supabase: ${formatSupabaseError(updateError)}`,
          };
        }
      } catch (error) {
        return {
          ok: false,
          data: existing,
          error: formatSupabaseError(error),
        };
      }
    }

    try {
      const saved = this.saveTickets(next);
      return { ok: true, data: saved };
    } catch (error) {
      return {
        ok: false,
        data: existing,
        error: formatSupabaseError(error),
      };
    }
  },

  async appendMessage(
    ticketId: string,
    senderRole: MessageSenderRole,
    messageText: string,
    existing: TicketMessage[],
    scope?: { ticketCode?: string; sessionToken?: string }
  ): Promise<AdapterResult<TicketMessage[]>> {
    const trimmed = messageText.trim();
    if (!trimmed) {
      return { ok: false, data: existing, error: 'El mensaje no puede estar vacío.' };
    }

    const newMessage: TicketMessage = {
      id: generateUuid(),
      ticket_id: ticketId,
      sender_role: senderRole,
      message: trimmed,
      created_at: new Date().toISOString(),
    };
    const next = [...existing, newMessage];
    const isLocalFallback = getLocalFallbackTicketIds().has(ticketId);

    if (isSupabaseConfigured() && !isLocalFallback) {
      try {
        const staffClient = getSupabaseClient();

        const token =
          scope?.sessionToken ??
          (scope?.ticketCode ? getRoomToken(scope.ticketCode) : null);

        const client =
          senderRole === 'client' && scope?.ticketCode && token
            ? getRoomScopedSupabaseClient(scope.ticketCode, token)
            : staffClient;

        if (!client) {
          return {
            ok: false,
            data: existing,
            error: 'Sesión no autorizada para enviar mensajes a Supabase.',
          };
        }

        const messagePayload: Record<string, unknown> = {
          id: newMessage.id,
          ticket_id: newMessage.ticket_id,
          sender_role: newMessage.sender_role,
          message: newMessage.message,
        };
        if (senderRole !== 'client') messagePayload.created_at = newMessage.created_at;
        const { error } = await client.from('ticket_messages').insert(messagePayload);

        if (error) {
          return {
            ok: false,
            data: existing,
            error: `No se pudo enviar el mensaje a Supabase: ${error.message}`,
          };
        }
      } catch (error) {
        return {
          ok: false,
          data: existing,
          error: formatSupabaseError(error),
        };
      }
    }

    try {
      writeLocal(MESSAGES_STORAGE_KEY, next);
      return { ok: true, data: next };
    } catch (error) {
      return {
        ok: false,
        data: existing,
        error: formatSupabaseError(error),
      };
    }
  },

  async confirmPaymentAndReady(
    ticketId: string,
    existing: SupportTicket[],
    scope?: { ticketCode?: string; sessionToken?: string }
  ): Promise<AdapterResult<SupportTicket[]>> {
    const target = existing.find((t) => t.id === ticketId);
    const nextStatus: TicketStatus =
      target && target.status === 'resolved'
        ? 'resolved'
        : target && target.status === 'in_progress'
        ? 'in_progress'
        : 'ready_to_connect';

    const patch: { payment_status: PaymentStatus; status: TicketStatus } = {
      payment_status: 'paid',
      status: nextStatus,
    };
    return this.updateTicket(ticketId, patch, existing, scope);
  },

  updateMemberAvailability(
    memberId: string,
    patch: Partial<{
      availability_status: TechnicianAvailability;
      specialties: TechnicianSpecialty[];
      accepting_requests: boolean;
    }>,
    members: OrganizationMember[]
  ): OrganizationMember[] {
    const next = members.map((m) => (m.id === memberId ? { ...m, ...patch } : m));
    this.saveMembers(next);
    return next;
  },

  inviteMember(
    input: {
      organization_id: string;
      full_name: string;
      email: string;
      member_type: MemberTierType;
      agreed_ticket_rate_usd: number;
      specialties: TechnicianSpecialty[];
    },
    members: OrganizationMember[]
  ): OrganizationMember[] {
    const created: OrganizationMember = {
      id: generateUuid(),
      organization_id: input.organization_id,
      user_id: generateUuid(),
      full_name: input.full_name.trim(),
      email: input.email.trim().toLowerCase(),
      member_type: input.member_type,
      role: 'technician',
      agreed_ticket_rate_usd: input.agreed_ticket_rate_usd,
      status: 'active',
      specialties:
        input.specialties.length > 0 ? input.specialties : ['Windows & BSOD'],
      availability_status: 'available',
      accepting_requests: true,
      rating: 5.0,
      resolved_count: 0,
    };
    const next = [created, ...members];
    this.saveMembers(next);
    this.appendAuditLog({
      organization_id: input.organization_id,
      actor_type: 'system',
      actor_label: 'Administrador Org',
      action: `Invitó colaborador (${input.member_type}) con tarifa $${input.agreed_ticket_rate_usd} USD/ticket`,
      target_ref: created.email,
    });
    return next;
  },

  updateOrganizationSettings(
    orgId: string,
    patch: Partial<
      Pick<
        Organization,
        'name' | 'dispatch_mode' | 'rustdesk_relay_domain' | 'payment_gateway'
      >
    >,
    orgs: Organization[]
  ): Organization[] {
    const next = orgs.map((o) => (o.id === orgId ? { ...o, ...patch } : o));
    this.saveOrganizations(next);
    return next;
  },

  subscribeRealtime(onRefresh: () => void): () => void {
    const cleanups: Array<() => void> = [];

    if (typeof window !== 'undefined') {
      const onStorage = (event: StorageEvent) => {
        if (
          event.key === TICKETS_STORAGE_KEY ||
          event.key === MESSAGES_STORAGE_KEY ||
          event.key === MEMBERS_STORAGE_KEY ||
          event.key === DEVICES_STORAGE_KEY ||
          event.key === SESSIONS_STORAGE_KEY ||
          event.key === ORGS_STORAGE_KEY ||
          event.key === AI_AGENTS_STORAGE_KEY ||
          event.key === AUDIT_STORAGE_KEY
        ) {
          onRefresh();
        }
      };
      window.addEventListener('storage', onStorage);
      cleanups.push(() => window.removeEventListener('storage', onStorage));

      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        channel.onmessage = () => onRefresh();
        cleanups.push(() => channel.close());
      }
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      const channel = supabase
        .channel('rs365-remix-v1-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tickets' },
          onRefresh
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ticket_messages' },
          onRefresh
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'technician_profiles' },
          onRefresh
        )
        .subscribe();

      cleanups.push(() => {
        void supabase.removeChannel(channel);
      });
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  },

  persistEnterpriseLead(lead: EnterpriseLead): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(ENTERPRISE_STORAGE_KEY);
      const current: EnterpriseLead[] = raw ? JSON.parse(raw) : [];
      window.localStorage.setItem(
        ENTERPRISE_STORAGE_KEY,
        JSON.stringify([lead, ...current])
      );
    } catch {
      // Ignore storage errors
    }
  },

  loadUserProfile(): UserAccountProfile | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(USER_PROFILE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed) ||
        typeof (parsed as UserAccountProfile).email !== 'string' ||
        typeof (parsed as UserAccountProfile).full_name !== 'string'
      ) {
        window.localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
        return null;
      }
      return parsed as UserAccountProfile;
    } catch {
      try {
        window.localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
      } catch {
        // Ignore removal error
      }
      return null;
    }
  },

  saveUserProfile(profile: UserAccountProfile): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
      broadcastSync();
    } catch {
      // Ignore storage errors
    }
  },

  clearUserProfile(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
      broadcastSync();
    } catch {
      // Ignore storage errors
    }
  },

  buildClientDataExportPayload(input: {
    ticket?: SupportTicket | null;
    messages?: TicketMessage[];
    auditLogs?: AuditLogEntry[];
    userProfile?: UserAccountProfile | null;
    organization?: Organization | null;
  }): string {
    const sanitizeTicket = (ticket?: SupportTicket | null) => {
      if (!ticket) return null;
      const { client_session_token: _sessionToken, payment_reference: _paymentReference, ...safeTicket } = ticket;
      return safeTicket;
    };
    const sanitizeMessages = (messages: TicketMessage[] = []) => messages.map((message) => {
      const { client_session_token: _sessionToken, payment_reference: _paymentReference, ...safeMessage } = message as TicketMessage & Record<string, unknown>;
      return safeMessage;
    });
    const payload = {
      exported_at: new Date().toISOString(),
      controller: 'Remote Support 365',
      contact_privacy: 'privacidad@remotesupport365.com',
      user_profile: input.userProfile ?? null,
      organization: input.organization ?? null,
      ticket: sanitizeTicket(input.ticket),
      messages: sanitizeMessages(input.messages),
      audit_logs: input.auditLogs ?? [],
    };
    return JSON.stringify(payload, null, 2);
  },

  async anonymizeTicketClientData(
    ticketId: string,
    existing: SupportTicket[],
    scope?: { ticketCode?: string; sessionToken?: string }
  ): Promise<AdapterResult<SupportTicket[]>> {
    const target = existing.find((t) => t.id === ticketId);
    const nowIso = new Date().toISOString();
    const res = await this.updateTicket(
      ticketId,
      {
        client_name: 'Usuario Anonimizado',
        client_email: 'eliminado@anonimizado.invalid',
        client_birth_date: null,
        rustdesk_id: null,
        marketing_opt_in: false,
        anonymized_at: nowIso,
      },
      existing,
      scope
    );
    if (res.ok && target) {
      this.appendAuditLog({
        organization_id: target.organization_id,
        actor_type: 'client',
        actor_label: 'Titular de Datos (GDPR/LOPDP)',
        action: 'Solicitó eliminación y anonimización de datos personales',
        target_ref: target.ticket_code,
      });
    }
    return res;
  },

};
