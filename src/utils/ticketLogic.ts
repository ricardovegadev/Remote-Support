import type {
  AgentInstallType,
  AppView,
  CategoryOption,
  DashboardMetrics,
  DispatchMode,
  IssueCategory,
  MemberTierType,
  OperatingSystem,
  OrganizationMember,
  PaymentStatus,
  RemoteSessionRecord,
  ServiceTier,
  SupportTicket,
  TechnicianAvailability,
  TechnicianCommissionTier,
  TechnicianSpecialty,
  TicketPriority,
  TicketStatus,
  ValidationResult,
  WizardDraft,
} from '../types/support';
import {
  computeNetCommissionBreakdown,
  getActiveBusinessConfig,
  getConfiguredCommissionTier,
  getConfiguredTierPriceUsd,
} from '../config/businessConfig';

export const FIXED_SERVICE_PRICE_USD = 15;
export const LEGAL_TERMS_VERSION = 'v1.0-2026';
export const NDA_CLIENT_VERSION = 'NDA-CLIENT-v1.0-2026';
export const NDA_TECH_VERSION = 'NDA-TECH-v1.0-2026';
export const ADULT_RESTRICTION_ERROR =
  'Remote Support 365 está disponible únicamente para personas mayores de 18 años.';

export const SERVICE_TIER_PRICES: Record<ServiceTier, number> = {
  'Express $15': getActiveBusinessConfig().serviceTiers[0]?.priceUsd ?? 15,
  'Optimización $29': getActiveBusinessConfig().serviceTiers[1]?.priceUsd ?? 29,
  'Avanzado $39': getActiveBusinessConfig().serviceTiers[2]?.priceUsd ?? 39,
  'Pyme Esencial $39/mes': getActiveBusinessConfig().pymePlans[0]?.priceUsd ?? 39,
  'Pyme Corporativo $79/mes': getActiveBusinessConfig().pymePlans[1]?.priceUsd ?? 79,
};

export const SERVICE_TIER_OPTIONS = getActiveBusinessConfig().serviceTiers;

export const PYME_PLANS = getActiveBusinessConfig().pymePlans;

export const SAAS_PLANS = getActiveBusinessConfig().saasPlans;

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

export function getOsCompatibleCategory(
  category: IssueCategory,
  osType: OperatingSystem | null | undefined
): IssueCategory {
  if (!osType || osType === 'Windows') {
    return category;
  }
  if (
    category === 'Windows lento o bajo rendimiento' ||
    category === 'Actualizaciones de Windows'
  ) {
    return 'Sistema Operativo/Lentitud';
  }
  return category;
}

export function formatCategoryForOs(
  category: IssueCategory | string,
  osType?: OperatingSystem | null
): string {
  if (!osType || osType === 'Windows') {
    return category;
  }

  if (osType === 'Mac') {
    if (
      category === 'Windows lento o bajo rendimiento' ||
      category === 'Sistema Operativo/Lentitud'
    ) {
      return 'macOS lento o bajo rendimiento';
    }
    if (category === 'Actualizaciones de Windows') {
      return 'Actualizaciones de macOS';
    }
    if (category === 'Pantallazos azules (BSOD)') {
      return 'Reinicios inesperados / Kernel Panic';
    }
  }

  if (osType === 'Linux') {
    if (
      category === 'Windows lento o bajo rendimiento' ||
      category === 'Sistema Operativo/Lentitud'
    ) {
      return 'Linux lento o alto consumo';
    }
    if (category === 'Actualizaciones de Windows') {
      return 'Actualizaciones y paquetes del sistema';
    }
    if (category === 'Pantallazos azules (BSOD)') {
      return 'Fallos de arranque o Kernel Panic';
    }
  }

  if (osType === 'Mobile') {
    if (
      category === 'Windows lento o bajo rendimiento' ||
      category === 'Sistema Operativo/Lentitud'
    ) {
      return 'Dispositivo móvil lento o sin espacio';
    }
    if (category === 'Actualizaciones de Windows') {
      return 'Actualizaciones del sistema móvil';
    }
    if (category === 'Pantallazos azules (BSOD)') {
      return 'Reinicios o bloqueos del dispositivo';
    }
  }

  return category;
}

const CATEGORY_TO_SPECIALTIES: Record<IssueCategory, TechnicianSpecialty[]> = {
  'Windows lento o bajo rendimiento': ['Windows & BSOD'],
  'Aplicaciones que no arrancan': ['Windows & BSOD'],
  'Pantallazos azules (BSOD)': ['Windows & BSOD'],
  'Problemas de Wi-Fi o red': ['Redes & VPN'],
  'Errores de Microsoft 365 y Outlook': ['Microsoft 365 & Outlook'],
  'Configuración de impresoras': ['Impresoras'],
  'Eliminación de malware y virus': ['Seguridad & Malware'],
  'Recuperación de archivos': ['Recuperación de Datos'],
  'Actualizaciones de Windows': ['Windows & BSOD'],
  'VPN y acceso remoto': ['Redes & VPN'],
  Impresoras: ['Impresoras'],
  'Correo/Office': ['Microsoft 365 & Outlook'],
  'Sistema Operativo/Lentitud': ['Windows & BSOD'],
  'Redes/Wi-Fi': ['Redes & VPN'],
  Otro: ['Windows & BSOD'],
};

export function matchTechnicianForTicket(
  ticket: Pick<SupportTicket, 'os_type' | 'category'>,
  member: Pick<OrganizationMember, 'specialties' | 'full_name'>
): {
  compatible: boolean;
  score: number;
  reason: string;
  matchedSpecialties: TechnicianSpecialty[];
} {
  const specialties = Array.isArray(member.specialties) ? member.specialties : [];
  const rawCategorySpecs = CATEGORY_TO_SPECIALTIES[ticket.category] ?? [];
  const categorySpecs: TechnicianSpecialty[] =
    ticket.os_type === 'Windows'
      ? rawCategorySpecs
      : rawCategorySpecs.filter((spec) => spec !== 'Windows & BSOD');

  const matchedSpecialties: TechnicianSpecialty[] = [];

  if (ticket.os_type === 'Mac') {
    if (!specialties.includes('Soporte macOS')) {
      return {
        compatible: false,
        score: 0,
        reason: 'Requiere especialidad Soporte macOS.',
        matchedSpecialties: [],
      };
    }
    matchedSpecialties.push('Soporte macOS');
  } else if (ticket.os_type === 'Linux') {
    if (!specialties.includes('Soporte Linux & Servidores')) {
      return {
        compatible: false,
        score: 0,
        reason: 'Requiere especialidad Soporte Linux & Servidores.',
        matchedSpecialties: [],
      };
    }
    matchedSpecialties.push('Soporte Linux & Servidores');
  } else if (ticket.os_type === 'Windows') {
    const requiresWindowsOs =
      ticket.category === 'Pantallazos azules (BSOD)' ||
      ticket.category === 'Actualizaciones de Windows' ||
      ticket.category === 'Windows lento o bajo rendimiento';

    if (requiresWindowsOs && !specialties.includes('Windows & BSOD')) {
      return {
        compatible: false,
        score: 0,
        reason: 'Requiere especialidad Windows & BSOD.',
        matchedSpecialties: [],
      };
    }
    if (specialties.includes('Windows & BSOD')) {
      matchedSpecialties.push('Windows & BSOD');
    }
  }

  for (const spec of categorySpecs) {
    if (specialties.includes(spec) && !matchedSpecialties.includes(spec)) {
      matchedSpecialties.push(spec);
    }
  }

  if (ticket.os_type === 'Windows' && matchedSpecialties.length === 0) {
    return {
      compatible: false,
      score: 0,
      reason: `Sin especialidad Windows o ${categorySpecs[0] ?? 'categoría compatible'}.`,
      matchedSpecialties: [],
    };
  }

  const matchedCategory = categorySpecs.some((spec) => specialties.includes(spec));
  const score =
    (ticket.os_type === 'Mac' || ticket.os_type === 'Linux' || specialties.includes('Windows & BSOD')
      ? 60
      : 30) + (matchedCategory ? 40 : 0);

  return {
    compatible: true,
    score,
    reason:
      matchedSpecialties.length > 0
        ? `Compatible: ${matchedSpecialties.join(' · ')}`
        : `Compatible con ${ticket.os_type}`,
    matchedSpecialties,
  };
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
  return (
    getConfiguredTierPriceUsd(tier, undefined, getActiveBusinessConfig()) ??
    SERVICE_TIER_PRICES[tier] ??
    getActiveBusinessConfig().serviceTiers[0]?.priceUsd ??
    FIXED_SERVICE_PRICE_USD
  );
}

export { computeNetCommissionBreakdown };

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

const PRIORITY_URGENCY_RANK: Record<TicketPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const ACTIVE_STATUS_SLA_RANK: Record<TicketStatus, number> = {
  ready_to_connect: 0,
  in_progress: 1,
  waiting_payment: 2,
  resolved: 3,
};

export function sortTicketsByUrgencyAndSla(
  tickets: SupportTicket[]
): SupportTicket[] {
  return [...tickets].sort((a, b) => {
    const aResolved = a.status === 'resolved' ? 1 : 0;
    const bResolved = b.status === 'resolved' ? 1 : 0;
    if (aResolved !== bResolved) {
      return aResolved - bResolved;
    }

    if (aResolved === 0) {
      const aPriority = PRIORITY_URGENCY_RANK[deriveTicketPriority(a)];
      const bPriority = PRIORITY_URGENCY_RANK[deriveTicketPriority(b)];
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      const aStatusRank = ACTIVE_STATUS_SLA_RANK[a.status] ?? 99;
      const bStatusRank = ACTIVE_STATUS_SLA_RANK[b.status] ?? 99;
      if (aStatusRank !== bStatusRank) {
        return aStatusRank - bStatusRank;
      }

      const aCreated = Date.parse(a.created_at) || 0;
      const bCreated = Date.parse(b.created_at) || 0;
      if (aCreated !== bCreated) {
        return aCreated - bCreated;
      }
      return a.ticket_code.localeCompare(b.ticket_code);
    }

    const aClosed = Date.parse(a.resolved_at ?? a.created_at) || 0;
    const bClosed = Date.parse(b.resolved_at ?? b.created_at) || 0;
    return bClosed - aClosed;
  });
}

export function formatElapsedSessionDuration(
  startedAtIso: string | null | undefined,
  nowMs: number = Date.now()
): string {
  const startMs = startedAtIso ? Date.parse(startedAtIso) : Number.NaN;
  if (Number.isNaN(startMs)) return '00:00';
  const totalSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
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
      'Debes aceptar los Términos y Condiciones, la Política de Privacidad, el Acuerdo de Confidencialidad (NDA) y la Política de Reembolsos.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function deriveInitialDiagnosisSummary(
  category: IssueCategory,
  osType: OperatingSystem,
  problemDescription: string
): string {
  const isMac = osType === 'Mac';
  const isLinux = osType === 'Linux';
  const isMobile = osType === 'Mobile';

  const map: Record<IssueCategory, string> = {
    'Windows lento o bajo rendimiento': isMac
      ? 'Protocolo sugerido (Mac): Auditar Monitor de Actividad, ítems de inicio de sesión, almacenamiento APFS y procesos en segundo plano.'
      : isLinux
      ? 'Protocolo sugerido (Linux): Auditar consumo de CPU/RAM (top/htop), servicios systemd y espacio en particiones.'
      : isMobile
      ? 'Protocolo sugerido (Mobile): Revisar almacenamiento disponible, caché de aplicaciones y procesos activos en segundo plano.'
      : 'Protocolo sugerido (Windows): Auditar Administrador de Tareas, programas de inicio, uso de disco/RAM y servicios en segundo plano.',
    'Aplicaciones que no arrancan': isMac
      ? 'Protocolo sugerido (Mac): Revisar reportes de cierre en Consola, permisos en Privacidad y Seguridad e integridad del paquete .app.'
      : isLinux
      ? 'Protocolo sugerido (Linux): Revisar dependencias en terminal, logs de journalctl y permisos de ejecución.'
      : isMobile
      ? 'Protocolo sugerido (Mobile): Validar permisos de la app, limpiar caché y verificar compatibilidad de versión.'
      : 'Protocolo sugerido (Windows): Verificar librerías Runtime/DLL, registros de fallos de aplicación y permisos de ejecución.',
    'Pantallazos azules (BSOD)': isMac
      ? 'Protocolo sugerido (Mac): Analizar reportes de Kernel Panic, extensiones del sistema y salud de almacenamiento.'
      : isLinux
      ? 'Protocolo sugerido (Linux): Analizar logs de kernel (dmesg/journalctl), módulos y estabilidad de memoria.'
      : isMobile
      ? 'Protocolo sugerido (Mobile): Analizar historial de reinicios, temperatura del equipo y conflictos de software.'
      : 'Protocolo sugerido (Windows): Analizar archivos Minidump/volcados de memoria, controladores críticos y estabilidad del sistema.',
    'Problemas de Wi-Fi o red': `Protocolo sugerido (${osType}): Validar adaptador de red, concesión DHCP, resolución DNS y estabilidad de puerta de enlace.`,
    'Errores de Microsoft 365 y Outlook': `Protocolo sugerido (${osType}): Verificar credenciales Modern Auth, estado de licencia Microsoft 365 y reparación de perfil.`,
    'Configuración de impresoras': isMac
      ? 'Protocolo sugerido (Mac): Inspeccionar cola de impresión CUPS, AirPrint o controlador oficial y conectividad de red.'
      : `Protocolo sugerido (${osType}): Inspeccionar cola de impresión, controlador oficial y puerto TCP/IP o USB.`,
    'Eliminación de malware y virus': `Protocolo sugerido (${osType}): Ejecutar desinfección profunda, depurar extensiones sospechosas del navegador y reforzar protección.`,
    'Recuperación de archivos': `Protocolo sugerido (${osType}): Evaluar volumen afectado en modo seguro de lectura, rescatar documentos y respaldar en ruta segura.`,
    'Actualizaciones de Windows': isMac
      ? 'Protocolo sugerido (Mac): Verificar espacio libre para actualización de macOS, descarga del instalador y estado de reinicio.'
      : isLinux
      ? 'Protocolo sugerido (Linux): Reparar gestor de paquetes, limpiar bloqueos pendientes y validar kernel instalado.'
      : 'Protocolo sugerido (Windows): Limpiar caché de SoftwareDistribution, reparar componentes de Windows Update o revertir parches fallidos.',
    'VPN y acceso remoto': `Protocolo sugerido (${osType}): Configurar túnel VPN corporativo, reglas de acceso remoto seguro y rutas DNS privadas.`,
    Impresoras: isMac
      ? 'Protocolo sugerido (Mac): Inspeccionar cola CUPS / AirPrint, controlador activo y puerto de red.'
      : `Protocolo sugerido (${osType}): Inspeccionar cola de impresión, controlador activo y puerto TCP/IP.`,
    'Correo/Office': `Protocolo sugerido (${osType}): Verificar credenciales OAuth2/IMAP, caché de perfil y estado de licencia Microsoft 365.`,
    'Sistema Operativo/Lentitud': isMac
      ? 'Protocolo sugerido (Mac): Auditar Monitor de Actividad, ítems de inicio, disco APFS y actualizaciones pendientes de macOS.'
      : isLinux
      ? 'Protocolo sugerido (Linux): Auditar consumo de CPU/disco, servicios systemd y cola de paquetes.'
      : isMobile
      ? 'Protocolo sugerido (Mobile): Revisar almacenamiento, caché de aplicaciones y consumo en segundo plano.'
      : `Protocolo sugerido (${osType}): Auditar consumo de CPU/disco, servicios en segundo plano y cola de actualizaciones.`,
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
  const normalizedCategory = getOsCompatibleCategory(
    draft.category,
    draft.operatingSystem
  );
  const aiSummary =
    draft.aiTriage?.preDiagnosis ??
    deriveInitialDiagnosisSummary(
      normalizedCategory,
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
    category: normalizedCategory,
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
    human_reviewed_at: null,
    human_reviewed_by: null,
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
  _sessions: RemoteSessionRecord[] = []
): { minutes: number | null; formatted: string; sampleCount: number } {
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
    return { minutes: null, formatted: 'Sin datos', sampleCount: 0 };
  }

  const total = responseSamples.reduce((acc, val) => acc + val, 0);
  const avg = Math.round((total / responseSamples.length) * 10) / 10;
  return {
    minutes: avg,
    formatted: `${avg.toFixed(1)} min`,
    sampleCount: responseSamples.length,
  };
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

export const TECHNICIAN_COMMISSION_TIERS: TechnicianCommissionTier[] =
  getActiveBusinessConfig().commissionTiers;

export function getTechnicianCommissionTier(
  monthlyResolvedCount: number
): TechnicianCommissionTier {
  return getConfiguredCommissionTier(monthlyResolvedCount, getActiveBusinessConfig());
}

export function parseAppRoute(pathname: string): {
  view: AppView;
  ticketCode: string | null;
} {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const lower = clean.toLowerCase();
  if (lower === '/' || lower === '/portal') {
    return { view: 'landing', ticketCode: null };
  }
  if (lower === '/dashboard') {
    return { view: 'tech_portal', ticketCode: null };
  }
  if (lower === '/postular' || lower === '/trabaja-con-nosotros') {
    return { view: 'technician_apply', ticketCode: null };
  }
  if (lower === '/registro-tecnico') {
    return { view: 'technician_register', ticketCode: null };
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

export function validateRegistrationPassword(
  password: string,
  confirmPassword: string
): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return {
      valid: false,
      error: 'La contraseña debe tener al menos 8 caracteres.',
    };
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return {
      valid: false,
      error: 'Incluye al menos una letra y un número en tu contraseña.',
    };
  }
  if (password !== confirmPassword) {
    return {
      valid: false,
      error: 'Las contraseñas no coinciden.',
    };
  }
  return { valid: true };
}
