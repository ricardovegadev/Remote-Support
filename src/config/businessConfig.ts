import type {
  BusinessConfig,
  BusinessFeeConfig,
  NetCommissionBreakdown,
  PymePlanConfig,
  SaasPlanConfig,
  ServiceTier,
  ServiceTierConfig,
  TechnicianCommissionTier,
} from '../types/support';

function readEnvNumber(key: string, fallback: number, min = 0): number {
  const raw =
    typeof process !== 'undefined' && process.env
      ? process.env[key]?.trim()
      : undefined;
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return Number(parsed.toFixed(2));
}

function roundUsd(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Number((value * 100).toFixed(6))) / 100;
}

const DEFAULT_FEE_CONFIG: BusinessFeeConfig = {
  paymentFeePercent: 2.9,
  paymentFeeFixedUsd: 0.3,
  operationalCostUsd: 1.5,
};

const DEFAULT_SERVICE_TIERS: ServiceTierConfig[] = [
  {
    id: 'Express $15',
    priceUsd: 15,
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
    eyebrow: 'Soporte Especializado',
    summary: 'Intervención avanzada para conectividad, respaldos y entornos críticos.',
    features: [
      'Configuración de redes Wi-Fi y VPN',
      'Respaldos críticos y migración de datos',
      'Diagnóstico avanzado de sistema',
    ],
  },
];

const DEFAULT_PYME_PLANS: PymePlanConfig[] = [
  {
    id: 'pyme-39',
    name: 'Pyme Esencial',
    serviceTier: 'Pyme Esencial $39/mes',
    priceUsd: 39,
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
    devicesLimit: 'Hasta 15 equipos',
    summary: 'Plan mensual para equipos de una pequeña empresa; alcance sujeto a configuración.',
    features: [
      'Atención de solicitudes según condiciones del plan',
      'Herramientas disponibles según la configuración contratada',
      'Consulta de registros disponibles en la plataforma',
    ],
  },
];

const DEFAULT_SAAS_PLANS: SaasPlanConfig[] = [
  {
    id: 'starter-29',
    name: 'Starter MSP',
    priceUsd: 29,
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
    seats: 'Hasta 10 técnicos independientes',
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
    seats: 'Capacidad y alcance por confirmar',
    summary: 'Funciones avanzadas sujetas a configuración y acuerdo de servicio.',
    features: [
      'Funciones de gestión multiempresa sujetas a disponibilidad del producto',
      'Integraciones remotas según configuración contratada',
      'Volumen y tiempos de atención por definir en el acuerdo de servicio',
    ],
  },
];

const DEFAULT_COMMISSION_TIERS: TechnicianCommissionTier[] = [
  {
    id: 'base',
    label: 'Nivel Base',
    minIncidents: 0,
    maxIncidents: 25,
    rangeLabel: '0 – 25 incidencias/mes',
    commissionPercent: 65,
    description:
      'Participación inicial sobre el neto para especialistas independientes verificados y en período supervisado.',
  },
  {
    id: 'pro',
    label: 'Nivel Pro',
    minIncidents: 26,
    maxIncidents: 100,
    rangeLabel: '26 – 100 incidencias/mes',
    commissionPercent: 75,
    description:
      'Desbloqueado al superar 25 incidencias resueltas en el mes calendario con auditoría conforme.',
  },
  {
    id: 'senior',
    label: 'Nivel Senior',
    minIncidents: 101,
    maxIncidents: 250,
    rangeLabel: '101 – 250 incidencias/mes',
    commissionPercent: 80,
    description:
      'Para especialistas independientes de alto volumen con SLA y calificación consistentes.',
  },
  {
    id: 'elite',
    label: 'Nivel Elite',
    minIncidents: 251,
    maxIncidents: null,
    rangeLabel: '251 – 500+ incidencias/mes',
    commissionPercent: 85,
    description:
      'Máxima participación sobre el neto para referentes de la red Remote Support 365.',
  },
];

/**
 * Single authoritative business configuration built on the server
 * (reading optional environment overrides) and exposed to the UI via GET /api/config/business.
 */
export function buildServerBusinessConfig(): BusinessConfig {
  const feeConfig: BusinessFeeConfig = {
    paymentFeePercent: readEnvNumber('BUSINESS_PAYMENT_FEE_PERCENT', DEFAULT_FEE_CONFIG.paymentFeePercent, 0),
    paymentFeeFixedUsd: readEnvNumber('BUSINESS_PAYMENT_FEE_FIXED_USD', DEFAULT_FEE_CONFIG.paymentFeeFixedUsd, 0),
    operationalCostUsd: readEnvNumber('BUSINESS_OPERATIONAL_COST_USD', DEFAULT_FEE_CONFIG.operationalCostUsd, 0),
  };

  const serviceTiers: ServiceTierConfig[] = DEFAULT_SERVICE_TIERS.map((tier) => {
    const envPrice =
      tier.id === 'Express $15'
        ? readEnvNumber('BUSINESS_TIER_EXPRESS_USD', tier.priceUsd, 1)
        : tier.id === 'Optimización $29'
          ? readEnvNumber('BUSINESS_TIER_OPTIMIZATION_USD', tier.priceUsd, 1)
          : readEnvNumber('BUSINESS_TIER_ADVANCED_USD', tier.priceUsd, 1);
    return {
      ...tier,
      priceUsd: envPrice,
      features: [...tier.features],
    };
  });

  const pymePlans: PymePlanConfig[] = DEFAULT_PYME_PLANS.map((plan) => ({
    ...plan,
    priceUsd:
      plan.serviceTier === 'Pyme Esencial $39/mes'
        ? readEnvNumber('BUSINESS_PLAN_PYME_ESENCIAL_USD', plan.priceUsd, 1)
        : readEnvNumber('BUSINESS_PLAN_PYME_CORP_USD', plan.priceUsd, 1),
    features: [...plan.features],
  }));

  const saasPlans: SaasPlanConfig[] = DEFAULT_SAAS_PLANS.map((plan) => ({
    ...plan,
    features: [...plan.features],
  }));

  const commissionTiers: TechnicianCommissionTier[] = DEFAULT_COMMISSION_TIERS.map((tier) => {
    const commissionPercent =
      tier.id === 'base'
        ? readEnvNumber('BUSINESS_COMMISSION_BASE_PCT', tier.commissionPercent, 1)
        : tier.id === 'pro'
          ? readEnvNumber('BUSINESS_COMMISSION_PRO_PCT', tier.commissionPercent, 1)
          : tier.id === 'senior'
            ? readEnvNumber('BUSINESS_COMMISSION_SENIOR_PCT', tier.commissionPercent, 1)
            : readEnvNumber('BUSINESS_COMMISSION_ELITE_PCT', tier.commissionPercent, 1);
    return {
      ...tier,
      commissionPercent: Math.min(95, Math.max(1, commissionPercent)),
    };
  });

  return {
    currency: 'USD',
    feeConfig,
    serviceTiers,
    pymePlans,
    saasPlans,
    commissionTiers,
  };
}

let activeBusinessConfig: BusinessConfig = buildServerBusinessConfig();
const configListeners = new Set<(config: BusinessConfig) => void>();

export function getActiveBusinessConfig(): BusinessConfig {
  return activeBusinessConfig;
}

export function applyBusinessConfigFromServer(next: Partial<BusinessConfig> | null | undefined): BusinessConfig {
  if (!next || typeof next !== 'object') return activeBusinessConfig;

  const base = buildServerBusinessConfig();
  const merged: BusinessConfig = {
    currency: 'USD',
    feeConfig: {
      paymentFeePercent:
        typeof next.feeConfig?.paymentFeePercent === 'number' &&
        Number.isFinite(next.feeConfig.paymentFeePercent) &&
        next.feeConfig.paymentFeePercent >= 0
          ? next.feeConfig.paymentFeePercent
          : base.feeConfig.paymentFeePercent,
      paymentFeeFixedUsd:
        typeof next.feeConfig?.paymentFeeFixedUsd === 'number' &&
        Number.isFinite(next.feeConfig.paymentFeeFixedUsd) &&
        next.feeConfig.paymentFeeFixedUsd >= 0
          ? next.feeConfig.paymentFeeFixedUsd
          : base.feeConfig.paymentFeeFixedUsd,
      operationalCostUsd:
        typeof next.feeConfig?.operationalCostUsd === 'number' &&
        Number.isFinite(next.feeConfig.operationalCostUsd) &&
        next.feeConfig.operationalCostUsd >= 0
          ? next.feeConfig.operationalCostUsd
          : base.feeConfig.operationalCostUsd,
    },
    serviceTiers:
      Array.isArray(next.serviceTiers) && next.serviceTiers.length > 0
        ? next.serviceTiers
        : base.serviceTiers,
    pymePlans:
      Array.isArray(next.pymePlans) && next.pymePlans.length > 0
        ? next.pymePlans
        : base.pymePlans,
    saasPlans:
      Array.isArray(next.saasPlans) && next.saasPlans.length > 0
        ? next.saasPlans
        : base.saasPlans,
    commissionTiers:
      Array.isArray(next.commissionTiers) && next.commissionTiers.length > 0
        ? next.commissionTiers
        : base.commissionTiers,
  };

  activeBusinessConfig = merged;
  for (const listener of configListeners) {
    listener(merged);
  }
  return merged;
}

export function subscribeBusinessConfig(listener: (config: BusinessConfig) => void): () => void {
  configListeners.add(listener);
  return () => {
    configListeners.delete(listener);
  };
}

export function getConfiguredTierPriceUsd(
  tier: ServiceTier | string,
  billingMode?: 'one_time' | 'pyme_monthly',
  config: BusinessConfig = activeBusinessConfig
): number | null {
  const oneTimeMatch = config.serviceTiers.find((t) => t.id === tier);
  if (oneTimeMatch) {
    if (billingMode && billingMode !== 'one_time') return null;
    return oneTimeMatch.priceUsd;
  }
  const pymeMatch = config.pymePlans.find((p) => p.serviceTier === tier);
  if (pymeMatch) {
    if (billingMode && billingMode !== 'pyme_monthly') return null;
    return pymeMatch.priceUsd;
  }
  return null;
}

export function getConfiguredCommissionTier(
  monthlyResolvedCount: number,
  config: BusinessConfig = activeBusinessConfig
): TechnicianCommissionTier {
  const safeCount = Number.isFinite(monthlyResolvedCount)
    ? Math.max(0, Math.floor(monthlyResolvedCount))
    : 0;
  const tiers = [...config.commissionTiers].sort((a, b) => b.minIncidents - a.minIncidents);
  for (const tier of tiers) {
    if (safeCount >= tier.minIncidents) return tier;
  }
  return config.commissionTiers[0] ?? DEFAULT_COMMISSION_TIERS[0];
}

/**
 * Calculates technician earnings on NET revenue after payment gateway fees
 * and operational cost per ticket.
 */
export function computeNetCommissionBreakdown(input: {
  grossUsd: number;
  commissionPercent: number;
  feeConfig?: BusinessFeeConfig;
}): NetCommissionBreakdown {
  const feeConfig = input.feeConfig ?? activeBusinessConfig.feeConfig;
  const grossUsd = Math.max(0, roundUsd(input.grossUsd));
  const commissionPercent = Math.min(100, Math.max(0, Number(input.commissionPercent) || 0));

  if (grossUsd <= 0) {
    return {
      grossUsd: 0,
      paymentFeeUsd: 0,
      operationalCostUsd: 0,
      netDistributableUsd: 0,
      commissionPercent,
      technicianPayoutUsd: 0,
      platformMarginUsd: 0,
    };
  }

  const rawPaymentFee =
    grossUsd * (feeConfig.paymentFeePercent / 100) + feeConfig.paymentFeeFixedUsd;
  const paymentFeeUsd = Math.min(grossUsd, roundUsd(rawPaymentFee));
  const remainingAfterPayment = Math.max(0, roundUsd(grossUsd - paymentFeeUsd));
  const operationalCostUsd = Math.min(
    remainingAfterPayment,
    roundUsd(feeConfig.operationalCostUsd)
  );
  const netDistributableUsd = Math.max(
    0,
    roundUsd(grossUsd - paymentFeeUsd - operationalCostUsd)
  );
  const technicianPayoutUsd = roundUsd((netDistributableUsd * commissionPercent) / 100);
  const platformMarginUsd = Math.max(
    0,
    roundUsd(netDistributableUsd - technicianPayoutUsd)
  );

  return {
    grossUsd,
    paymentFeeUsd,
    operationalCostUsd,
    netDistributableUsd,
    commissionPercent,
    technicianPayoutUsd,
    platformMarginUsd,
  };
}
