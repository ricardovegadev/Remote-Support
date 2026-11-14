import type {
  AgentInstallType,
  AppView,
  CategoryOption,
  DashboardMetrics,
  DispatchMode,
  IssueCategory,
  MemberTierType,
  OperatingSystem,
  PaymentStatus,
  RemoteSessionRecord,
  ServiceTier,
  SupportTicket,
  TechnicianAvailability,
  TicketPriority,
  TicketStatus,
  ValidationResult,
  WizardDraft,
} from '../types/support';

export const FIXED_SERVICE_PRICE_USD = 25;

export const SERVICE_TIER_PRICES: Record<ServiceTier, number> = {
  'Express $25': 25,
  'Optimización $40': 40,
  'Avanzado $55': 55,
};

export const SERVICE_TIER_OPTIONS: Array<{
  id: ServiceTier;
  priceUsd: number;
  summary: string;
}> = [
  {
    id: 'Express $25',
    priceUsd: 25,
    summary: 'Asistencia puntual: impresoras, correo o red (tarifa estándar)',
  },
  {
    id: 'Optimización $40',
    priceUsd: 40,
    summary: 'Limpieza profunda de sistema operativo, inicio y actualizaciones',
  },
  {
    id: 'Avanzado $55',
    priceUsd: 55,
    summary: 'Configuración VPN, respaldos críticos o software corporativo',
  },
];

export const PYME_PLANS = [
  {
    id: 'pyme-99',
    name: 'Pyme Esencial',
    priceUsd: 99,
    devicesLimit: 'Hasta 5 equipos',
    summary: 'Agente instalado desatendido y mesa de ayuda prioritaria mensual.',
    features: [
      'Hasta 6 sesiones remotas al mes',
      'Agente RustDesk instalado desatendido',
      'Informes técnicos mensuales verificados',
    ],
  },
  {
    id: 'pyme-199',
    name: 'Pyme Corporativo',
    priceUsd: 199,
    devicesLimit: 'Hasta 15 equipos',
    summary: 'Cobertura continua con técnico asignado y SLA menor a 10 minutos.',
    features: [
      'Sesiones remotas ilimitadas en horario hábil',
      'Monitoreo preventivo y respaldos críticos',
      'Consolidación de auditoría e historial',
    ],
  },
];

export const SAAS_PLANS = [
  {
    id: 'starter-29',
    name: 'Starter MSP',
    priceUsd: 29,
    seats: 'Hasta 3 técnicos internos',
    summary: 'Para firmas de soporte IT que digitalizan su mesa de ayuda remota.',
    features: [
      'Sala de conexión white-label (/sesion/RS-XXXX)',
      'Despacho manual y cola en tiempo real',
      '1,500 créditos mensuales de AI Receptionist',
    ],
  },
  {
    id: 'growth-49',
    name: 'Growth Helpdesk',
    priceUsd: 49,
    seats: 'Hasta 10 técnicos + Freelancers',
    summary: 'Escala con colaboradores externos y automatización AI Workforce 365.',
    highlighted: true,
    features: [
      'Asignación atómica sin colisiones (RPC)',
      'Gestión de Freelancers con tarifa por ticket',
      '6 agentes AI Workforce 365 + 5,000 créditos',
    ],
  },
  {
    id: 'scale-79',
    name: 'Scale Marketplace',
    priceUsd: 79,
    seats: 'Ilimitado + Red Global de Desborde',
    summary: 'Operación multiempresa con relay RustDesk dedicado y red global.',
    features: [
      'Red Global de Desborde 24/7 bajo demanda',
      'Relay RustDesk propio y auditoría inmutable',
      '15,000 créditos AI Workforce + SLA corporativo',
    ],
  },
];

export const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: 'Impresoras',
    label: 'Impresoras',
    summary: 'Cola de impresión atascada, controladores o conexión en red local.',
    typicalResolutionTime: '15–25 min',
    examples: ['No imprime por Wi-Fi', 'Error de driver USB', 'Escáner sin respuesta'],
  },
  {
    id: 'Correo/Office',
    label: 'Correo / Microsoft 365',
    summary: 'Outlook, IMAP/SMTP, licencias Microsoft 365 y sincronización.',
    typicalResolutionTime: '20–30 min',
    examples: ['Outlook no envía correos', 'Activación de Office', 'Buzón lleno o PST'],
  },
  {
    id: 'Sistema Operativo/Lentitud',
    label: 'Sistema Operativo / Lentitud',
    summary: 'Optimización de inicio, actualizaciones bloqueadas y uso alto de disco.',
    typicalResolutionTime: '25–40 min',
    examples: ['CPU al 100%', 'Actualización fallida', 'Limpieza de procesos'],
  },
  {
    id: 'Redes/Wi-Fi',
    label: 'Redes / Wi-Fi / VPN',
    summary: 'Cortes intermitentes, configuración DNS, VPN corporativa y carpetas.',
    typicalResolutionTime: '15–30 min',
    examples: ['Sin acceso a internet', 'VPN no autentica', 'DNS lento'],
  },
  {
    id: 'Otro',
    label: 'Otro',
    summary: 'Software específico, periféricos, respaldo de archivos o configuración.',
    typicalResolutionTime: '20–35 min',
    examples: ['Instalación segura', 'Audio/Cámara en reuniones', 'Certificados digitales'],
  },
];

export const INITIAL_WIZARD_DRAFT: WizardDraft = {
  step: 1,
  category: null,
  operatingSystem: null,
  serviceTier: 'Express $25',
  description: '',
  clientName: '',
  clientEmail: '',
  aiTriage: null,
};

export function generateTicketCode(randomFn: () => number = Math.random): string {
  const numericPart = Math.floor(1000 + randomFn() * 9000);
  return `RS-${numericPart}`;
}

export function generateUuid(randomFn: () => number = Math.random): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const hex = () => Math.floor(randomFn() * 0xffff).toString(16).padStart(4, '0');
  return `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-8${hex().slice(1)}-${hex()}${hex()}${hex()}`;
}

export function isValidUuid(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
}

export function getServiceTierPriceUsd(tier: ServiceTier): number {
  return SERVICE_TIER_PRICES[tier] ?? FIXED_SERVICE_PRICE_USD;
}

export function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'RS';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function deriveTicketPriority(ticket: SupportTicket): TicketPriority {
  if (ticket.priority) return ticket.priority;
  if (ticket.service_tier === 'Avanzado $55' || ticket.status === 'in_progress') {
    return 'high';
  }
  if (ticket.service_tier === 'Optimización $40' || ticket.status === 'ready_to_connect') {
    return 'medium';
  }
  return 'low';
}

export function getPriorityMeta(priority: TicketPriority): {
  label: string;
  badgeClass: string;
} {
  switch (priority) {
    case 'high':
      return {
        label: 'ALTA',
        badgeClass: 'bg-[#FEE2E2] text-[#DC2626]',
      };
    case 'medium':
      return {
        label: 'MEDIA',
        badgeClass: 'bg-[#FEF3C7] text-[#D97706]',
      };
    case 'low':
      return {
        label: 'BAJA',
        badgeClass: 'bg-[#E0F2FE] text-[#0284C7]',
      };
  }
}

export function getStatusBadgeClass(status: TicketStatus): string {
  switch (status) {
    case 'in_progress':
      return 'bg-[#DBEAFE] text-[#1D4ED8]';
    case 'ready_to_connect':
      return 'bg-[#D1FAE5] text-[#059669]';
    case 'waiting_payment':
      return 'bg-[#FEF3C7] text-[#D97706]';
    case 'resolved':
      return 'bg-[#D1FAE5] text-[#059669]';
  }
}

export function normalizeRustDeskId(input: string): string {
  return input.replace(/\D/g, '').slice(0, 9);
}

export function formatRustDeskId(rawCode: string | null | undefined): string {
  if (!rawCode) return '';
  const digits = normalizeRustDeskId(rawCode);
  if (digits.length !== 9) return digits;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
}

export function validateRustDeskId(input: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const normalized = normalizeRustDeskId(input);
  if (normalized.length !== 9) {
    return {
      valid: false,
      normalized,
      error: 'El ID de RustDesk debe contener exactamente 9 dígitos numéricos.',
    };
  }
  return { valid: true, normalized };
}

export function buildRustDeskDeepLink(
  rustdeskId: string | null | undefined
): string | null {
  if (!rustdeskId) return null;
  const digits = normalizeRustDeskId(rustdeskId);
  if (digits.length !== 9) return null;
  return `rustdesk://connection/new/${digits}`;
}

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

export function validateStep1(draft: WizardDraft): ValidationResult {
  const errors: Record<string, string> = {};
  if (!draft.category) {
    errors.category = 'Selecciona una categoría para continuar con el diagnóstico.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateStep2(draft: WizardDraft): ValidationResult {
  const errors: Record<string, string> = {};
  if (!draft.operatingSystem) {
    errors.operatingSystem = 'Selecciona tu sistema operativo (Windows o Mac).';
  }
  const desc = draft.description.trim();
  if (desc.length < 10) {
    errors.description =
      'Describe brevemente el problema (mínimo 10 caracteres para preparar al técnico).';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateStep3(draft: WizardDraft): ValidationResult {
  const errors: Record<string, string> = {};
  if (draft.clientName.trim().length < 2) {
    errors.clientName = 'Ingresa tu nombre completo para emitir el ticket.';
  }
  if (!isValidEmail(draft.clientEmail)) {
    errors.clientEmail =
      'Ingresa un correo electrónico válido para recibir el comprobante.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function deriveInitialDiagnosisSummary(
  category: IssueCategory,
  osType: OperatingSystem,
  problemDescription: string
): string {
  const map: Record<IssueCategory, string> = {
    Impresoras: `Protocolo sugerido (${osType}): Inspeccionar spooler de impresión, driver activo y puerto TCP/IP.`,
    'Correo/Office': `Protocolo sugerido (${osType}): Verificar credenciales OAuth2/IMAP, caché de perfil y estado de licencia Microsoft 365.`,
    'Sistema Operativo/Lentitud': `Protocolo sugerido (${osType}): Auditar consumo de CPU/disco, servicios en segundo plano y cola de actualizaciones.`,
    'Redes/Wi-Fi': `Protocolo sugerido (${osType}): Validar adaptador de red, resolución DNS, puerta de enlace y túnel VPN.`,
    Otro: `Protocolo sugerido (${osType}): Diagnóstico guiado de software, periféricos y permisos del sistema.`,
  };
  const snippet = problemDescription.trim().slice(0, 90);
  return `${map[category]} Contexto reportado: "${snippet}${
    problemDescription.trim().length > 90 ? '...' : ''
  }"`;
}

export function generateSessionToken(randomFn: () => number = Math.random): string {
  const partA = generateUuid(randomFn).replace(/-/g, '');
  const partB = Math.floor(randomFn() * 0xffffffff)
    .toString(16)
    .padStart(8, '0');
  return `${partA}${partB}`;
}

export function createTicketFromDraft(
  draft: WizardDraft,
  options?: {
    nowIso?: string;
    randomFn?: () => number;
    organizationId?: string;
    organizationName?: string;
  }
): SupportTicket {
  if (!draft.category || !draft.operatingSystem) {
    throw new Error('Cannot create ticket without category and operatingSystem');
  }
  const randomFn = options?.randomFn ?? Math.random;
  const created_at = options?.nowIso ?? new Date().toISOString();
  const aiSummary =
    draft.aiTriage?.preDiagnosis ??
    deriveInitialDiagnosisSummary(
      draft.category,
      draft.operatingSystem,
      draft.description
    );

  return {
    id: generateUuid(randomFn),
    ticket_code: generateTicketCode(randomFn),
    organization_id: options?.organizationId ?? '00000000-0000-4000-8000-000000000001',
    organization_name:
      options?.organizationName ?? 'Mi organización',
    category: draft.category,
    os_type: draft.operatingSystem,
    service_tier: draft.serviceTier,
    priority:
      draft.serviceTier === 'Avanzado $55'
        ? 'high'
        : draft.serviceTier === 'Optimización $40'
        ? 'medium'
        : 'low',
    problem_description: draft.description.trim(),
    ai_diagnosis_summary: aiSummary,
    ai_diagnosis: draft.aiTriage ?? null,
    client_name: draft.clientName.trim(),
    client_email: draft.clientEmail.trim().toLowerCase(),
    rustdesk_id: null,
    agent_type: 'temporary',
    agent_downloaded: false,
    consent_accepted: false,
    consent_accepted_at: null,
    payment_status: 'pending',
    status: 'waiting_payment',
    assigned_to: null,
    assigned_technician_id: null,
    assigned_technician_name: null,
    assigned_technician_specialty: null,
    resolution_notes: null,
    client_session_token: generateSessionToken(randomFn),
    claimed_at: null,
    resolved_at: null,
    created_at,
  };
}

export function computeDashboardMetrics(
  tickets: SupportTicket[],
  nowIso: string = new Date().toISOString()
): DashboardMetrics {
  const todayDatePrefix = nowIso.slice(0, 10);

  let pendingCount = 0;
  let activeSessionsCount = 0;
  let resolvedTodayCount = 0;
  let revenueUsd = 0;

  for (const ticket of tickets) {
    if (ticket.status === 'waiting_payment' || ticket.status === 'ready_to_connect') {
      pendingCount += 1;
    }
    if (ticket.status === 'in_progress') {
      activeSessionsCount += 1;
    }
    if (
      ticket.status === 'resolved' &&
      ticket.created_at.slice(0, 10) === todayDatePrefix
    ) {
      resolvedTodayCount += 1;
    }
    if (ticket.payment_status === 'paid') {
      revenueUsd += getServiceTierPriceUsd(ticket.service_tier);
    }
  }

  return {
    pendingCount,
    activeSessionsCount,
    resolvedTodayCount,
    revenueUsd,
  };
}

export function canClaimTicket(ticket: SupportTicket): boolean {
  return (
    ticket.assigned_to === null &&
    ticket.assigned_technician_id === null &&
    ticket.status !== 'resolved'
  );
}

export function computeAverageResponseMinutes(
  tickets: SupportTicket[],
  sessions: RemoteSessionRecord[] = []
): { minutes: number; formatted: string } {
  const responseSamples: number[] = [];

  for (const ticket of tickets) {
    const startMs = Date.parse(ticket.created_at);
    if (Number.isNaN(startMs)) continue;

    const endIso = ticket.claimed_at ?? ticket.resolved_at ?? null;
    if (!endIso) continue;
    const endMs = Date.parse(endIso);
    if (Number.isNaN(endMs) || endMs < startMs) continue;

    const diffMinutes = Math.max(0.5, (endMs - startMs) / 60000);
    responseSamples.push(diffMinutes);
  }

  if (responseSamples.length === 0) {
    const validDurations = sessions
      .map((s) => s.duration_minutes)
      .filter((d) => typeof d === 'number' && d > 0);
    if (validDurations.length === 0) {
      return { minutes: 0, formatted: '0.0 min' };
    }
    const avgSessionMin =
      validDurations.reduce((acc, n) => acc + n, 0) / validDurations.length;
    const rounded = Math.round(avgSessionMin * 10) / 10;
    return { minutes: rounded, formatted: `${rounded.toFixed(1)} min` };
  }

  const total = responseSamples.reduce((acc, val) => acc + val, 0);
  const avg = Math.round((total / responseSamples.length) * 10) / 10;
  return { minutes: avg, formatted: `${avg.toFixed(1)} min` };
}

export function buildTechnicalResolutionSummary(
  ticket: SupportTicket,
  rawNotes: string,
  includePreventive: boolean = true
): string {
  const cleanNotes = rawNotes.trim();
  const baseFinding =
    cleanNotes || 'Se ejecutó diagnóstico remoto y validación funcional completa.';
  const lines = [
    `INFORME TÉCNICO DE CIERRE · ${ticket.ticket_code} (${ticket.os_type} · ${ticket.service_tier})`,
    `Incidencia atendida: ${ticket.problem_description}`,
    `Intervención aplicada: ${baseFinding}`,
    `Verificación final: Equipo operativo y sesión remota finalizada de forma segura.`,
  ];
  if (includePreventive) {
    lines.push(
      `Recomendación preventiva: Mantener copias de seguridad periódicas y actualizaciones críticas del sistema.`
    );
  }
  return lines.join('\n');
}

export function getTicketStatusLabel(status: TicketStatus): string {
  switch (status) {
    case 'waiting_payment':
      return 'Pendiente';
    case 'ready_to_connect':
      return 'Listo para conectar';
    case 'in_progress':
      return 'En curso';
    case 'resolved':
      return 'Resuelto';
  }
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'paid':
      return 'Pagado';
    case 'refunded':
      return 'Reembolsado';
  }
}

export function getAvailabilityLabel(status: TechnicianAvailability): string {
  switch (status) {
    case 'available':
      return 'Disponible';
    case 'busy':
      return 'Ocupado';
    case 'paused':
      return 'Pausado';
    case 'offline':
      return 'Desconectado';
  }
}

export function getMemberTypeLabel(type: MemberTierType): string {
  switch (type) {
    case 'internal':
      return 'Técnico Interno';
    case 'freelancer':
      return 'Freelancer Invitado';
    case 'network':
      return 'Red Global Desborde';
  }
}

export function getDispatchModeLabel(mode: DispatchMode): string {
  switch (mode) {
    case 'smart':
      return 'Asignación Inteligente';
    case 'manual':
      return 'Manual';
    case 'round_robin':
      return 'Por Turnos';
  }
}

export function getAgentDownloadMeta(
  os: OperatingSystem,
  agentType: AgentInstallType = 'temporary'
): {
  fileName: string;
  sizeLabel: string;
  shaHint: string;
} {
  if (agentType === 'installed') {
    if (os === 'Mac') {
      return {
        fileName: 'RemoteSupport365-Host.pkg',
        sizeLabel: '18.6 MB · macOS Servicio Desatendido',
        shaHint: 'Agente instalado con acceso recurrente para planes Pyme',
      };
    }
    return {
      fileName: 'RemoteSupport365-Host.msi',
      sizeLabel: '16.4 MB · Windows Servicio Windows (x64)',
      shaHint: 'Agente instalado para soporte continuo desatendido',
    };
  }

  if (os === 'Mac') {
    return {
      fileName: 'RemoteSupport365-Quick.dmg',
      sizeLabel: '14.2 MB · macOS Universal (Apple Silicon & Intel)',
      shaHint: 'Agente temporal sin instalación · Se cierra al terminar',
    };
  }
  return {
    fileName: 'RemoteSupport365-Quick.exe',
    sizeLabel: '11.8 MB · Windows 10 / 11 (x64)',
    shaHint: 'Agente temporal sin instalación · Ejecución portable',
  };
}

export const OFFICIAL_RUSTDESK_RELEASES_URL =
  'https://github.com/rustdesk/rustdesk/releases/latest';

export function getRustDeskInstallerUrl(
  os: OperatingSystem,
  _agentType: AgentInstallType = 'temporary',
  env?: { windowsUrl?: string; macUrl?: string }
): string {
  const customUrl =
    os === 'Mac' ? env?.macUrl?.trim() : env?.windowsUrl?.trim();
  if (customUrl && /^https?:\/\//i.test(customUrl)) {
    return customUrl;
  }
  return OFFICIAL_RUSTDESK_RELEASES_URL;
}

export function parseAppRoute(pathname: string): {
  view: AppView;
  ticketCode: string | null;
} {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/' || clean === '/dashboard') {
    return { view: 'tech_portal', ticketCode: null };
  }
  if (clean === '/portal') {
    return { view: 'landing', ticketCode: null };
  }
  const sessionMatch = clean.match(/^\/sesion\/([^/]+)$/i);
  if (sessionMatch) {
    return {
      view: 'connection_room',
      ticketCode: decodeURIComponent(sessionMatch[1]).toUpperCase(),
    };
  }
  return { view: 'tech_portal', ticketCode: null };
}
