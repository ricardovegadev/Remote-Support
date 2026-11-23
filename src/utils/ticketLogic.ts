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

export const FIXED_SERVICE_PRICE_USD = 15;
export const LEGAL_TERMS_VERSION = 'v1.0-2026';
export const ADULT_RESTRICTION_ERROR =
  'Remote Support 365 está disponible únicamente para personas mayores de 18 años.';

export const SERVICE_TIER_PRICES: Record<ServiceTier, number> = {
  'Express $15': 15,
  'Optimización $29': 29,
  'Avanzado $39': 39,
  'Pyme Esencial $39/mes': 39,
  'Pyme Corporativo $79/mes': 79,
};

export const SERVICE_TIER_REGULAR_PRICES: Record<ServiceTier, number> = {
  'Express $15': 25,
  'Optimización $29': 40,
  'Avanzado $39': 55,
  'Pyme Esencial $39/mes': 59,
  'Pyme Corporativo $79/mes': 99,
};

export const SERVICE_TIER_OPTIONS: Array<{
  id: ServiceTier;
  priceUsd: number;
  regularPriceUsd: number;
  discountLabel: string;
  recommended?: boolean;
  eyebrow: string;
  summary: string;
  features: string[];
}> = [
  {
    id: 'Express $15',
    priceUsd: 15,
    regularPriceUsd: 25,
    discountLabel: '40% OFF',
    eyebrow: 'Sesión Única Temporal · Inicio Rápido',
    summary: 'Asistencia puntual para incidencias cotidianas, sujeta a disponibilidad.',
    features: [
      'Impresoras y escáneres',
      'Correo Outlook / Microsoft 365',
      'Instalación y configuración rápida',
    ],
  },
  {
    id: 'Optimización $29',
    priceUsd: 29,
    regularPriceUsd: 40,
    discountLabel: '28% OFF',
    recommended: true,
    eyebrow: 'Rendimiento Integral',
    summary: 'Deja tu equipo rápido, limpio y protegido en una sola sesión supervisada.',
    features: [
      'Limpieza profunda Windows / macOS',
      'Eliminación de malware y procesos lentos',
      'Optimización de arranque y actualizaciones',
    ],
  },
  {
    id: 'Avanzado $39',
    priceUsd: 39,
    regularPriceUsd: 55,
    discountLabel: '29% OFF',
    eyebrow: 'Soporte Especializado',
    summary: 'Intervención avanzada para conectividad, respaldos y entornos críticos.',
    features: [
      'Configuración de redes Wi-Fi y VPN',
      'Respaldos críticos y migración de datos',
      'Diagnóstico avanzado de sistema',
    ],
  },
];

export const PYME_PLANS: Array<{
  id: string;
  name: string;
  serviceTier: ServiceTier;
  priceUsd: number;
  regularPriceUsd: number;
  devicesLimit: string;
  summary: string;
  features: string[];
}> = [
  {
    id: 'pyme-39',
    name: 'Pyme Esencial',
    serviceTier: 'Pyme Esencial $39/mes',
    priceUsd: 39,
    regularPriceUsd: 59,
    devicesLimit: 'Hasta 5 equipos',
    summary: 'Agente instalado desatendido y mesa de ayuda prioritaria mensual.',
    features: [
      'Hasta 5 equipos protegidos en red',
      'Agente RustDesk instalado desatendido',
      'Acceso a la información técnica disponible en la plataforma',
    ],
  },
  {
    id: 'pyme-79',
    name: 'Pyme Corporativo',
    serviceTier: 'Pyme Corporativo $79/mes',
    priceUsd: 79,
    regularPriceUsd: 99,
    devicesLimit: 'Hasta 15 equipos',
    summary: 'Plan mensual para equipos de una pequeña empresa; alcance sujeto a configuración.',
    features: [
      'Atención de solicitudes según condiciones del plan',
      'Herramientas disponibles según la configuración contratada',
      'Consulta de registros disponibles en la plataforma',
    ],
  },
];

export const SAAS_PLANS = [
  {
    id: 'starter-29',
    name: 'Starter MSP',
    priceUsd: 29,
    regularPriceUsd: 49,
    seats: 'Hasta 3 técnicos internos',
    summary: 'Para firmas de soporte IT que digitalizan su mesa de ayuda remota.',
    features: [
      'Sala de conexión white-label (/sesion/RS-XXXX)',
      'Despacho manual y cola en tiempo real',
      'Herramientas de mesa de ayuda disponibles en la plataforma',
    ],
  },
  {
    id: 'growth-49',
    name: 'Growth Helpdesk',
    priceUsd: 49,
    regularPriceUsd: 79,
    seats: 'Hasta 10 técnicos + Freelancers',
    summary: 'Plan de crecimiento con funciones de soporte y automatización sujetas a disponibilidad.',
    highlighted: true,
    features: [
      'Asignación de tickets según las funciones disponibles',
      'Gestión de miembros de la organización',
      'Herramientas de automatización sujetas a disponibilidad',
    ],
  },
  {
    id: 'scale-79',
    name: 'Scale Marketplace',
    priceUsd: 79,
    regularPriceUsd: 119,
    seats: 'Capacidad y alcance por confirmar',
    summary: 'Funciones avanzadas sujetas a configuración y acuerdo de servicio.',
    features: [
      'Funciones de gestión multiempresa sujetas a disponibilidad del producto',
      'Integraciones remotas según configuración contratada',
      'Volumen y tiempos de atención por definir en el acuerdo de servicio',
    ],
  },
];

export const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: 'Windows lento o bajo rendimiento',
    label: 'Windows lento o con bajo rendimiento',
    summary:
      'Dejamos tu equipo rápido y fluido al encender, sin trabas ni programas que frenan tu trabajo.',
    typicalResolutionTime: '25–35 min',
    suggestedTier: 'Optimización $29',
    examples: ['Tarda en encender', 'Se congela al abrir apps', 'Ventilador al máximo'],
  },
  {
    id: 'Aplicaciones que no arrancan',
    label: 'Aplicaciones que no arrancan o se cierran',
    summary:
      'Hacemos que tus programas vuelvan a abrir normalmente sin cierres inesperados ni mensajes de error.',
    typicalResolutionTime: '15–25 min',
    suggestedTier: 'Express $15',
    examples: ['Programa no abre', 'Se cierra solo', 'Error al instalar'],
  },
  {
    id: 'Pantallazos azules (BSOD)',
    label: 'Pantallazos azules o reinicios inesperados',
    summary:
      'Identificamos la causa de los reinicios repentinos o pantallas azules y devolvemos estabilidad a tu equipo.',
    typicalResolutionTime: '30–45 min',
    suggestedTier: 'Avanzado $39',
    examples: ['Pantalla azul repentina', 'Se reinicia solo', 'Se apaga trabajando'],
  },
  {
    id: 'Problemas de Wi-Fi o red',
    label: 'Problemas de conexión Wi-Fi o red',
    summary:
      'Recuperamos tu conexión estable a internet y red local sin cortes durante videollamadas o trabajo.',
    typicalResolutionTime: '15–25 min',
    suggestedTier: 'Express $15',
    examples: ['Sin acceso a internet', 'Wi-Fi se desconecta', 'Red lenta en tu PC'],
  },
  {
    id: 'Errores de Microsoft 365 y Outlook',
    label: 'Errores de Microsoft 365 y Outlook',
    summary:
      'Dejamos Outlook, Word, Excel y OneDrive funcionando al día sin perder tus correos ni archivos.',
    typicalResolutionTime: '20–30 min',
    suggestedTier: 'Express $15',
    examples: ['Outlook no abre', 'Pide contraseña sin parar', 'Activar Microsoft 365'],
  },
  {
    id: 'Configuración de impresoras',
    label: 'Configuración de impresoras',
    summary:
      'Dejamos tu impresora conectada por Wi-Fi o cable e imprimiendo tus documentos al instante.',
    typicalResolutionTime: '15–25 min',
    suggestedTier: 'Express $15',
    examples: ['Aparece sin conexión', 'Documentos atascados', 'Instalar en PC nueva'],
  },
  {
    id: 'Eliminación de malware y virus',
    label: 'Eliminación de malware y virus',
    summary:
      'Limpiamos anuncios invasivos, ventanas sospechosas y virus protegiendo tus archivos personales.',
    typicalResolutionTime: '25–40 min',
    suggestedTier: 'Optimización $29',
    examples: ['Ventanas emergentes', 'Navegador con publicidad', 'Sospecha de virus'],
  },
  {
    id: 'Recuperación de archivos',
    label: 'Recuperación de archivos',
    summary:
      'Te ayudamos a rescatar documentos, fotos o carpetas borradas por error y respaldarlas de forma segura.',
    typicalResolutionTime: '35–50 min',
    suggestedTier: 'Avanzado $39',
    examples: ['Archivos borrados', 'USB o disco no abre', 'Respaldo seguro'],
  },
  {
    id: 'Actualizaciones de Windows',
    label: 'Problemas de actualizaciones de Windows',
    summary:
      'Desbloqueamos actualizaciones atascadas o que fallan al reiniciar para que tu PC vuelva a operar normal.',
    typicalResolutionTime: '25–40 min',
    suggestedTier: 'Optimización $29',
    examples: ['Atascado actualizando', 'Falla al reiniciar', 'Error tras actualizar'],
  },
  {
    id: 'VPN y acceso remoto',
    label: 'Configuración de VPN y acceso remoto',
    summary:
      'Configuramos tu acceso seguro a la oficina o teletrabajo para que te conectes sin bloqueos.',
    typicalResolutionTime: '25–40 min',
    suggestedTier: 'Avanzado $39',
    examples: ['VPN no conecta', 'Acceso al trabajo', 'Escritorio remoto'],
  },
];

export const CATEGORY_SUGGESTED_TIER_MAP: Record<IssueCategory, ServiceTier> = {
  'Windows lento o bajo rendimiento': 'Optimización $29',
  'Aplicaciones que no arrancan': 'Express $15',
  'Pantallazos azules (BSOD)': 'Avanzado $39',
  'Problemas de Wi-Fi o red': 'Express $15',
  'Errores de Microsoft 365 y Outlook': 'Express $15',
  'Configuración de impresoras': 'Express $15',
  'Eliminación de malware y virus': 'Optimización $29',
  'Recuperación de archivos': 'Avanzado $39',
  'Actualizaciones de Windows': 'Optimización $29',
  'VPN y acceso remoto': 'Avanzado $39',
  Impresoras: 'Express $15',
  'Correo/Office': 'Express $15',
  'Sistema Operativo/Lentitud': 'Optimización $29',
  'Redes/Wi-Fi': 'Express $15',
  Otro: 'Express $15',
};

export function getSuggestedTierForCategory(category: IssueCategory): ServiceTier {
  return CATEGORY_SUGGESTED_TIER_MAP[category] ?? 'Express $15';
}

export const INITIAL_WIZARD_DRAFT: WizardDraft = {
  step: 1,
  category: null,
  operatingSystem: null,
  serviceTier: 'Express $15',
  billingMode: 'one_time',
  description: '',
  clientName: '',
  clientEmail: '',
  birthDate: '',
  termsAccepted: false,
  marketingOptIn: false,
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

export function getServiceTierRegularPriceUsd(tier: ServiceTier): number {
  return SERVICE_TIER_REGULAR_PRICES[tier] ?? 25;
}

export function getDiscountPercent(
  priceUsd: number,
  regularPriceUsd: number
): number {
  if (regularPriceUsd <= 0 || priceUsd >= regularPriceUsd) return 0;
  return Math.round(((regularPriceUsd - priceUsd) / regularPriceUsd) * 100);
}

export function getInitials(name: string | null | undefined): string {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'RS';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function deriveTicketPriority(ticket: SupportTicket): TicketPriority {
  if (ticket.priority) return ticket.priority;
  if (
    ticket.service_tier === 'Avanzado $39' ||
    ticket.service_tier === 'Pyme Corporativo $79/mes' ||
    ticket.status === 'in_progress'
  ) {
    return 'high';
  }
  if (
    ticket.service_tier === 'Optimización $29' ||
    ticket.service_tier === 'Pyme Esencial $39/mes' ||
    ticket.status === 'ready_to_connect'
  ) {
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
        badgeClass: 'bg-[#FEF3C7] text-amber-800',
      };
    case 'low':
      return {
        label: 'BAJA',
        badgeClass: 'bg-[#E0F2FE] text-sky-800',
      };
  }
}

export function getStatusBadgeClass(status: TicketStatus): string {
  switch (status) {
    case 'in_progress':
      return 'bg-[#DBEAFE] text-[#1D4ED8]';
    case 'ready_to_connect':
      return 'bg-[#D1FAE5] text-emerald-800';
    case 'waiting_payment':
      return 'bg-[#FEF3C7] text-amber-800';
    case 'resolved':
      return 'bg-[#D1FAE5] text-emerald-800';
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

export function calculateAgeFromBirthDate(
  birthDateIso: string | null | undefined,
  referenceDate: Date = new Date()
): number | null {
  if (!birthDateIso) return null;
  const match = birthDateIso.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  const refYear = referenceDate.getUTCFullYear();
  const refMonth = referenceDate.getUTCMonth() + 1;
  const refDay = referenceDate.getUTCDate();
  if (
    year > refYear ||
    (year === refYear && (month > refMonth || (month === refMonth && day > refDay)))
  ) {
    return null;
  }

  let age = refYear - year;
  if (refMonth < month || (refMonth === month && refDay < day)) {
    age -= 1;
  }
  return age;
}

export function isAdultBirthDate(
  birthDateIso: string | null | undefined,
  referenceDate: Date = new Date()
): boolean {
  const age = calculateAgeFromBirthDate(birthDateIso, referenceDate);
  return age !== null && age >= 18;
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
    errors.operatingSystem =
      'Selecciona tu sistema operativo (Windows, Mac, Linux o Mobile).';
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
  const age = calculateAgeFromBirthDate(draft.birthDate);
  if (age === null) {
    errors.birthDate =
      'Ingresa tu fecha de nacimiento válida para verificar la mayoría de edad (+18 años).';
  } else if (age < 18) {
    errors.birthDate = ADULT_RESTRICTION_ERROR;
  }
  if (!draft.termsAccepted) {
    errors.termsAccepted =
      'Debes aceptar los Términos y Condiciones, la Política de Privacidad y la Política de Reembolsos.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function deriveInitialDiagnosisSummary(
  category: IssueCategory,
  osType: OperatingSystem,
  problemDescription: string
): string {
  const map: Record<IssueCategory, string> = {
    'Windows lento o bajo rendimiento': `Protocolo sugerido (${osType}): Auditar Administrador de Tareas, programas de inicio, uso de disco/RAM y servicios en segundo plano.`,
    'Aplicaciones que no arrancan': `Protocolo sugerido (${osType}): Verificar librerías Runtime/DLL, registros de fallos de aplicación y permisos de ejecución.`,
    'Pantallazos azules (BSOD)': `Protocolo sugerido (${osType}): Analizar archivos Minidump/volcados de memoria, controladores críticos y estabilidad del sistema.`,
    'Problemas de Wi-Fi o red': `Protocolo sugerido (${osType}): Validar adaptador de red, concesión DHCP, resolución DNS y estabilidad de puerta de enlace.`,
    'Errores de Microsoft 365 y Outlook': `Protocolo sugerido (${osType}): Verificar credenciales Modern Auth/WAM, estado de licencia Microsoft 365 y reparación de perfil PST/OST.`,
    'Configuración de impresoras': `Protocolo sugerido (${osType}): Inspeccionar spooler de impresión, driver oficial y puerto TCP/IP o USB.`,
    'Eliminación de malware y virus': `Protocolo sugerido (${osType}): Ejecutar desinfección profunda, depurar extensiones/secuestradores de navegador y reforzar protección.`,
    'Recuperación de archivos': `Protocolo sugerido (${osType}): Evaluar volumen afectado en modo seguro de lectura, rescatar documentos y respaldar en ruta segura.`,
    'Actualizaciones de Windows': `Protocolo sugerido (${osType}): Limpiar caché de SoftwareDistribution, reparar componentes de Windows Update o revertir parches fallidos.`,
    'VPN y acceso remoto': `Protocolo sugerido (${osType}): Configurar túnel VPN corporativo, reglas de escritorio remoto RDP seguro y rutas DNS privadas.`,
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

export function generateSessionToken(randomFn?: () => number): string {
  if (!randomFn) {
    if (typeof globalThis.crypto?.getRandomValues !== 'function') {
      throw new Error('No hay un generador criptográfico seguro para crear la sesión.');
    }
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  const random = randomFn;
  const partA = generateUuid(random).replace(/-/g, '');
  const partB = generateUuid(random).replace(/-/g, '');
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
  const explicitRandomFn = options?.randomFn;
  const randomFn = explicitRandomFn ?? Math.random;
  const created_at = options?.nowIso ?? new Date().toISOString();
  const aiSummary =
    draft.aiTriage?.preDiagnosis ??
    deriveInitialDiagnosisSummary(
      draft.category,
      draft.operatingSystem,
      draft.description
    );

  const billingMode = draft.billingMode ?? 'one_time';
  const birthDate = draft.birthDate?.trim() || null;
  const adultVerified = birthDate ? isAdultBirthDate(birthDate) : false;

  return {
    id: generateUuid(randomFn),
    ticket_code: generateTicketCode(randomFn),
    organization_id: options?.organizationId ?? '00000000-0000-4000-8000-000000000001',
    organization_name:
      options?.organizationName ?? 'Mi organización',
    category: draft.category,
    os_type: draft.operatingSystem,
    service_tier: draft.serviceTier,
    billing_mode: billingMode,
    priority:
      draft.serviceTier === 'Avanzado $39' ||
      draft.serviceTier === 'Pyme Corporativo $79/mes'
        ? 'high'
        : draft.serviceTier === 'Optimización $29' ||
          draft.serviceTier === 'Pyme Esencial $39/mes'
        ? 'medium'
        : 'low',
    problem_description: draft.description.trim(),
    ai_diagnosis_summary: aiSummary,
    ai_diagnosis: draft.aiTriage ?? null,
    client_name: draft.clientName.trim(),
    client_email: draft.clientEmail.trim().toLowerCase(),
    client_birth_date: birthDate,
    is_adult_verified: adultVerified,
    terms_accepted_at: draft.termsAccepted ? created_at : null,
    terms_version: draft.termsAccepted ? LEGAL_TERMS_VERSION : null,
    marketing_opt_in: Boolean(draft.marketingOptIn),
    subscription_status: 'none',
    anonymized_at: null,
    rustdesk_id: null,
    agent_type: billingMode === 'pyme_monthly' ? 'installed' : 'temporary',
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
    client_session_token: generateSessionToken(explicitRandomFn),
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
    if (os === 'Linux') {
      return {
        fileName: 'RemoteSupport365-Host.deb',
        sizeLabel: '14.9 MB · Linux Debian / Ubuntu (x86_64)',
        shaHint: 'Agente instalado systemd con acceso recurrente para planes Pyme',
      };
    }
    if (os === 'Mobile') {
      return {
        fileName: 'RemoteSupport365-Mobile.apk',
        sizeLabel: '12.4 MB · Android / Soporte iOS Guiado',
        shaHint: 'Cliente móvil oficial para asistencia remota asistida',
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
  if (os === 'Linux') {
    return {
      fileName: 'RemoteSupport365-Quick.AppImage',
      sizeLabel: '13.5 MB · Linux AppImage / .deb (x86_64)',
      shaHint: 'Agente portable sin instalación · Se cierra al terminar',
    };
  }
  if (os === 'Mobile') {
    return {
      fileName: 'RemoteSupport365-Mobile.apk',
      sizeLabel: '12.4 MB · Android APK / Guía iOS',
      shaHint: 'Asistencia móvil segura sin acceso permanente',
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

export function getOfficialRustDeskDownloadEndpoint(os: OperatingSystem): string {
  return `/api/rustdesk/official-download?os=${encodeURIComponent(os)}`;
}

export function getRustDeskInstallerUrl(
  os: OperatingSystem,
  _agentType: AgentInstallType = 'temporary',
  env?: { windowsUrl?: string; macUrl?: string }
): string {
  const customUrl =
    os === 'Mac'
      ? env?.macUrl?.trim()
      : os === 'Windows'
      ? env?.windowsUrl?.trim()
      : undefined;
  if (
    customUrl &&
    customUrl !== OFFICIAL_RUSTDESK_RELEASES_URL &&
    /^https?:\/\//i.test(customUrl)
  ) {
    return customUrl;
  }
  return getOfficialRustDeskDownloadEndpoint(os);
}

export function parseAppRoute(pathname: string): {
  view: AppView;
  ticketCode: string | null;
} {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/' || clean === '/portal') {
    return { view: 'landing', ticketCode: null };
  }
  if (clean === '/dashboard') {
    return { view: 'tech_portal', ticketCode: null };
  }
  const sessionMatch = clean.match(/^\/sesion\/([^/]+)$/i);
  if (sessionMatch) {
    return {
      view: 'connection_room',
      ticketCode: decodeURIComponent(sessionMatch[1]).toUpperCase(),
    };
  }
  return { view: 'landing', ticketCode: null };
}
