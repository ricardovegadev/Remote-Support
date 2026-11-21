import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  AppWindow,
  ArrowRight,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  HardDriveDownload,
  KeyRound,
  Layers,
  Lock,
  Mail,
  Monitor,
  MonitorCheck,
  Printer,
  RefreshCw,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  Wifi,
  Wrench,
  Zap,
} from 'lucide-react';
import type { IssueCategory, ServiceTier } from '../types/support';
import {
  CATEGORY_OPTIONS,
  isValidEmail,
  PYME_PLANS,
  SAAS_PLANS,
  SERVICE_TIER_OPTIONS,
} from '../utils/ticketLogic';
import {
  CardNetworkBadges,
  GooglePayLogo,
  PayPalLogo,
  StripeLogo,
} from './PaymentBrandLogos';
import { ScrollReveal } from './ScrollReveal';

interface LandingSectionsProps {
  onSelectCategoryForWizard: (
    category: IssueCategory,
    serviceTier?: ServiceTier,
    billingMode?: 'one_time' | 'pyme_monthly'
  ) => void;
  onSubmitEnterpriseLead: (lead: {
    companyName: string;
    contactEmail: string;
    teamSize: string;
    planInterest?: string;
  }) => void;
  onStartDiagnostic?: () => void;
}

const SERVICE_ICON_MAP: Record<IssueCategory, typeof Cpu> = {
  'Windows lento o bajo rendimiento': Cpu,
  'Aplicaciones que no arrancan': AppWindow,
  'Pantallazos azules (BSOD)': AlertTriangle,
  'Problemas de Wi-Fi o red': Wifi,
  'Errores de Microsoft 365 y Outlook': Mail,
  'Configuración de impresoras': Printer,
  'Eliminación de malware y virus': ShieldAlert,
  'Recuperación de archivos': HardDriveDownload,
  'Actualizaciones de Windows': RefreshCw,
  'VPN y acceso remoto': KeyRound,
  Impresoras: Printer,
  'Correo/Office': Mail,
  'Sistema Operativo/Lentitud': Cpu,
  'Redes/Wi-Fi': Wifi,
  Otro: Wrench,
};

const SERVICE_COLOR_MAP: Record<IssueCategory, string> = {
  'Windows lento o bajo rendimiento':
    'bg-blue-50 text-[#2563EB] border border-blue-200/80',
  'Aplicaciones que no arrancan':
    'bg-blue-50 text-[#2563EB] border border-blue-200/80',
  'Actualizaciones de Windows':
    'bg-blue-50 text-[#2563EB] border border-blue-200/80',
  'Pantallazos azules (BSOD)':
    'bg-rose-50 text-rose-700 border border-rose-200/80',
  'Eliminación de malware y virus':
    'bg-amber-50 text-amber-700 border border-amber-200/80',
  'Problemas de Wi-Fi o red':
    'bg-indigo-50 text-indigo-700 border border-indigo-200/80',
  'VPN y acceso remoto':
    'bg-indigo-50 text-indigo-700 border border-indigo-200/80',
  'Errores de Microsoft 365 y Outlook':
    'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
  'Configuración de impresoras':
    'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
  'Recuperación de archivos':
    'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
  Impresoras: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
  'Correo/Office': 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
  'Sistema Operativo/Lentitud':
    'bg-blue-50 text-[#2563EB] border border-blue-200/80',
  'Redes/Wi-Fi': 'bg-indigo-50 text-indigo-700 border border-indigo-200/80',
  Otro: 'bg-slate-100 text-[#0B1528] border border-slate-200',
};

function getTierBadgeStyle(tier: ServiceTier): string {
  if (tier === 'Express $15') {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200/90';
  }
  if (tier === 'Avanzado $39') {
    return 'bg-indigo-50 text-indigo-800 border-indigo-200/90';
  }
  return 'bg-blue-50 text-[#1D4ED8] border-blue-200/90';
}

const PROCESS_STEPS = [
  {
    num: '01',
    eyebrow: '01. Triaje AI Receptionist',
    title: 'Pre-diagnóstico y Ticket único',
    description: `Describe la falla en Windows, Mac, Linux o Mobile, responde preguntas de triaje y revisa la tarifa del servicio antes de crear tu solicitud.`,
    icon: Bot,
  },
  {
    num: '02',
    eyebrow: '02. Doble Agente RustDesk',
    title: 'Agente temporal o instalado',
    description:
      'Descarga el cliente portable sin instalación para emergencias puntuales o el agente fijo desatendido si perteneces a un plan mensual Pyme.',
    icon: MonitorCheck,
  },
  {
    num: '03',
    eyebrow: '03. Resolución Auditada',
    title: 'Reparación en vivo e informe IA',
    description:
      'Aceptas el consentimiento de acceso, sigues la reparación en vivo por chat y recibes el informe técnico generado automáticamente al cierre.',
    icon: ShieldCheck,
  },
];

const OPERATIONAL_PILLARS = [
  {
    title: 'Help Desk con Tickets RS-XXXX',
    description:
      'Cada incidencia genera un ticket único con historial de chat, auditoría y sala dedicada.',
    icon: Ticket,
    iconBg: 'bg-blue-50 text-[#2563EB] border-blue-200/70',
  },
  {
    title: 'Atención por especialidad',
    description:
      'El caso se deriva según la categoría y la disponibilidad del equipo de soporte.',
    icon: ShieldCheck,
    iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
  },
  {
    title: 'Motor Remoto Seguro RustDesk',
    description:
      'Estándar equivalente a TeamViewer, AnyDesk o RDP: agente portable puntual o fijo para Pyme.',
    icon: Monitor,
    iconBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/70',
  },
  {
    title: 'Solicitudes online 24/7',
    description:
      'Puedes iniciar una solicitud en cualquier momento. La asignación de técnico depende de la disponibilidad.',
    icon: Clock,
    iconBg: 'bg-amber-50 text-amber-700 border-amber-200/70',
  },
  {
    title: 'Seguimiento del ticket',
    description:
      'Consulta el estado disponible de tu solicitud y su información de servicio.',
    icon: Activity,
    iconBg: 'bg-cyan-50 text-cyan-700 border-cyan-200/70',
  },
];

export function LandingSections({
  onSelectCategoryForWizard,
  onSubmitEnterpriseLead,
  onStartDiagnostic,
}: LandingSectionsProps) {
  const [pricingAudience, setPricingAudience] = useState<'clients' | 'saas'>('clients');
  const [referralCopied, setReferralCopied] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [teamSize, setTeamSize] = useState('3–10 técnicos internos');
  const [selectedSaasPlan, setSelectedSaasPlan] = useState('Growth Helpdesk ($49/mes)');
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  const handleCopyReferralLink = async () => {
    const baseUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/portal?ref=RS365-VIP`
        : 'https://remotesupport365.com/portal?ref=RS365-VIP';

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Remote Support 365 — soporte técnico remoto',
          text: 'Inicia una solicitud de soporte remoto y revisa el precio del servicio antes de continuar.',
          url: baseUrl,
        });
        setReferralCopied(true);
        window.setTimeout(() => setReferralCopied(false), 3000);
        return;
      } catch {
        // Fallback to clipboard copy if user dismisses native share sheet
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(baseUrl);
    }
    setReferralCopied(true);
    window.setTimeout(() => setReferralCopied(false), 3000);
  };

  const handleEnterpriseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (companyName.trim().length < 2) {
      setLeadError('Ingresa el nombre de tu empresa de soporte o departamento TI.');
      return;
    }
    if (!isValidEmail(contactEmail)) {
      setLeadError('Ingresa un correo corporativo válido.');
      return;
    }
    setLeadError(null);
    onSubmitEnterpriseLead({
      companyName: companyName.trim(),
      contactEmail: contactEmail.trim(),
      teamSize,
      planInterest: selectedSaasPlan,
    });
    setLeadSubmitted(true);
    setCompanyName('');
    setContactEmail('');
  };

  return (
    <>
      {/* Confianza Humana: Tu equipo. Tus decisiones. */}
      <section
        id="confianza"
        aria-labelledby="trust-human-heading"
        className="scroll-mt-20 py-14 sm:py-20 bg-white border-b border-slate-200/80"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="scale">
            <div className="bg-[#F2FBF7] border border-emerald-200/70 rounded-3xl p-8 sm:p-12 lg:p-14 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              {/* Left: Soft Emerald Shield Geometric Illustration */}
              <div className="lg:col-span-5 flex items-center justify-center">
                <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
                  {/* Concentric subtle orbital rings */}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 260 260"
                    className="absolute inset-0 w-full h-full text-emerald-500/20"
                    fill="none"
                  >
                    <g className="animate-orb-orbit" style={{ animationDuration: '28s' }}>
                      <ellipse
                        cx="130"
                        cy="130"
                        rx="112"
                        ry="86"
                        transform="rotate(-24 130 130)"
                        stroke="currentColor"
                        strokeWidth="1.25"
                      />
                    </g>
                    <g
                      className="animate-orb-orbit-reverse"
                      style={{ animationDuration: '36s' }}
                    >
                      <ellipse
                        cx="130"
                        cy="130"
                        rx="102"
                        ry="114"
                        transform="rotate(18 130 130)"
                        stroke="currentColor"
                        strokeWidth="1.25"
                      />
                    </g>
                  </svg>

                  {/* Central Emerald Shield */}
                  <div className="relative z-10 w-28 h-32 sm:w-32 sm:h-36 flex items-center justify-center animate-float-gentle">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 120 136"
                      className="w-full h-full drop-shadow-lg"
                      fill="none"
                    >
                      <path
                        d="M60 6L110 24V64C110 96.5 88.8 119.8 60 130C31.2 119.8 10 96.5 10 64V24L60 6Z"
                        fill="#10B981"
                      />
                      <path
                        d="M60 6L110 24V64C110 96.5 88.8 119.8 60 130V6Z"
                        fill="#059669"
                        fillOpacity="0.35"
                      />
                      <path
                        d="M44 68L55.5 79.5L78 55"
                        stroke="#FFFFFF"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  {/* Floating Mini Padlock Badge */}
                  <span
                    aria-hidden="true"
                    className="absolute top-8 right-6 w-10 h-10 rounded-xl bg-white border border-emerald-200/80 shadow-md shadow-emerald-900/5 text-emerald-700 flex items-center justify-center animate-float-gentle"
                    style={{ animationDelay: '-2s' }}
                  >
                    <Lock className="w-4 h-4" />
                  </span>

                  {/* Subtle Emerald Sparkle Accent */}
                  <Sparkles
                    aria-hidden="true"
                    className="absolute bottom-9 left-8 w-5 h-5 text-emerald-600/70"
                  />
                </div>
              </div>

              {/* Right: Human Control & Privacy Guarantees */}
              <div className="lg:col-span-7 space-y-5">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-800">
                  <Sparkles className="w-3.5 h-3.5 text-[#10B981] shrink-0" aria-hidden="true" />
                  <span>Confianza desde el primer paso</span>
                </p>

                <h2
                  id="trust-human-heading"
                  className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight leading-[1.1]"
                >
                  <span className="block text-[#0B192C]">Tu equipo.</span>
                  <span className="block text-[#047857]">Tus decisiones.</span>
                </h2>

                <p className="text-base text-slate-700 leading-relaxed max-w-xl">
                  La IA te explica qué va a comprobar antes de guiarte. No controla tu
                  dispositivo ni ejecuta cambios por su cuenta.
                </p>

                <ul className="space-y-3 pt-1">
                  {[
                    'No compartas contraseñas, códigos MFA ni claves de recuperación',
                    'Puedes parar la guía y pedir un especialista cuando quieras',
                    'Si escalas, revisas el resumen y el precio antes de aceptar',
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm text-slate-700"
                    >
                      <CheckCircle2
                        className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onStartDiagnostic) {
                        onStartDiagnostic();
                      } else if (typeof document !== 'undefined') {
                        document
                          .getElementById('diagnostico')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
                  >
                    <span>Empezar con tranquilidad</span>
                    <ArrowRight
                      className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Cómo funciona */}
      <section
        id="como-funciona"
        className="scroll-mt-20 py-16 sm:py-20 bg-white border-b border-slate-200/80"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="max-w-2xl mb-12">
              <p className="text-xs font-semibold text-emerald-700 tracking-wide">
                Cómo funciona
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1528] mt-1">
                Protocolo remoto seguro en tres pasos claros
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
                Sin visitas presenciales ni accesos ocultos. Visualizas qué organización y
                qué técnico atiende tu equipo en tiempo real.
              </p>
            </div>
          </ScrollReveal>

          <div className="relative pt-4">
            {/* Desktop connecting line across the 3 medallions */}
            <div
              aria-hidden="true"
              className="hidden md:block absolute top-11 left-[14%] right-[14%] h-[2px] bg-gradient-to-r from-[#2563EB]/25 via-[#2563EB]/50 to-[#10B981]/40"
            />

            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {PROCESS_STEPS.map((step, index) => {
                const StepIcon = step.icon;
                return (
                  <ScrollReveal key={step.num} delayMs={index * 110} className="h-full">
                    <div className="h-full relative rounded-2xl border border-slate-200/90 bg-[#F8FAFC]/70 p-6 space-y-3 hover:bg-white hover:shadow-md hover:border-blue-200 transition-all duration-200">
                      <div className="flex items-center justify-between gap-4">
                        <span className="relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br from-[#0B1528] to-[#2563EB] text-white flex items-center justify-center shadow-md shadow-blue-950/15">
                          <StepIcon className="w-5 h-5" aria-hidden="true" />
                        </span>
                        <span className="font-mono tabular-nums text-3xl font-bold text-slate-200 select-none">
                          {step.num}
                        </span>
                      </div>

                      <p className="font-mono tabular-nums text-xs font-semibold text-[#2563EB]">
                        {step.eyebrow}
                      </p>
                      <h3 className="text-lg font-semibold text-[#0B1528]">
                        {step.title}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>

          {/* Arquitectura Operativa & Garantías de Servicio (5 pilares verificables) */}
          <div className="mt-12 pt-10 border-t border-slate-200">
            <ScrollReveal>
              <p className="text-xs font-semibold text-[#0B1528] uppercase tracking-wider mb-5">
                Información operativa
              </p>
            </ScrollReveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {OPERATIONAL_PILLARS.map((pillar, index) => {
                const PillarIcon = pillar.icon;
                return (
                  <ScrollReveal key={pillar.title} delayMs={index * 65} className="h-full">
                    <div className="h-full rounded-xl border border-slate-200/90 bg-[#F8FAFC] p-4 space-y-2.5 hover:bg-white hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200">
                      <span
                        className={`w-9 h-9 rounded-lg border flex items-center justify-center ${pillar.iconBg}`}
                      >
                        <PillarIcon className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <p className="text-xs font-semibold text-[#0B1528]">
                        {pillar.title}
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {pillar.description}
                      </p>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Servicios */}
      <section
        id="servicios"
        className="scroll-mt-20 py-16 sm:py-20 bg-[#F8FAFC] border-b border-slate-200/80"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold text-emerald-700 tracking-wide">
                  Catálogo Oficial de Lanzamiento · 10 Especialidades Remotas
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1528] mt-1">
                  10 soluciones técnicas remotas para fallas críticas en Windows, Mac y Linux
                </h2>
              </div>
              <p className="text-xs text-slate-600">
                Haz clic en cualquier especialidad para preseleccionarla con su tarifa sugerida
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {CATEGORY_OPTIONS.map((service, index) => {
              const serviceNumber = String(index + 1).padStart(2, '0');
              const Icon = SERVICE_ICON_MAP[service.id] ?? Wrench;
              const iconTone =
                SERVICE_COLOR_MAP[service.id] ??
                'bg-blue-50 text-[#2563EB] border border-blue-200/80';
              return (
                <ScrollReveal
                  key={service.id}
                  delayMs={(index % 2) * 80}
                  className="h-full"
                >
                  <button
                    type="button"
                    onClick={() =>
                      onSelectCategoryForWizard(service.id, service.suggestedTier)
                    }
                    className="w-full h-full text-left bg-white border border-slate-200/90 hover:border-[#2563EB] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5 rounded-2xl p-6 transition-all duration-200 ease-out-expo flex flex-col justify-between gap-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${iconTone}`}
                          >
                            <Icon className="w-5 h-5" aria-hidden="true" />
                          </span>
                          <div>
                            <span className="font-mono tabular-nums text-[11px] font-medium text-slate-500 block">
                              Especialidad {serviceNumber} · {service.typicalResolutionTime}
                            </span>
                            <h3 className="text-base font-semibold text-[#0B1528] group-hover:text-[#2563EB] transition-colors">
                              {service.label}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`font-mono tabular-nums text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${getTierBadgeStyle(
                              service.suggestedTier
                            )}`}
                          >
                            {service.suggestedTier}
                          </span>
                          <ArrowRight
                            className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB] group-hover:translate-x-1 transition-all duration-200"
                            aria-hidden="true"
                          />
                        </div>
                      </div>

                      <p className="text-sm text-slate-600 leading-relaxed">
                        {service.summary}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100">
                      {service.examples.map((example) => (
                        <span
                          key={example}
                          className="px-2.5 py-1 rounded-md bg-slate-100/90 text-slate-700 text-[11px] font-medium"
                        >
                          {example}
                        </span>
                      ))}
                    </div>
                  </button>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Planes: Separación Explícita Clientes Finales vs Empresas de Soporte (SaaS) */}
      <section
        id="planes-empresas"
        className="scroll-mt-20 py-16 sm:py-20 bg-white border-b border-slate-200/80"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <ScrollReveal>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold text-emerald-700 tracking-wide">
                  Tarifas vigentes · precios visibles antes de contratar
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1528] mt-1">
                  Precios y política de reembolso
                </h2>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Consulta el precio, alcance, renovación y condiciones del servicio puntual,
                  los planes Pyme y la plataforma SaaS antes de contratar.
                </p>
              </div>

              {/* Segmented Control Switch */}
              <div
                role="tablist"
                aria-label="Seleccionar audiencia de planes"
                className="grid grid-cols-2 sm:inline-flex items-center p-1 bg-slate-100 border border-slate-200 rounded-xl w-full sm:w-auto self-start lg:self-auto"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={pricingAudience === 'clients'}
                  onClick={() => setPricingAudience('clients')}
                  className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-all duration-200 text-center sm:whitespace-nowrap ${
                    pricingAudience === 'clients'
                      ? 'bg-[#0B1528] text-white shadow-sm'
                      : 'text-slate-600 hover:text-[#0B1528]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Para Clientes Finales</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={pricingAudience === 'saas'}
                  onClick={() => setPricingAudience('saas')}
                  className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-all duration-200 text-center sm:whitespace-nowrap ${
                    pricingAudience === 'saas'
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'text-slate-600 hover:text-[#0B1528]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Para Empresas de Soporte (SaaS)</span>
                </button>
              </div>
            </div>
          </ScrollReveal>

          {pricingAudience === 'clients' ? (
            <div
              key="clients"
              data-testid="plans-clients-panel"
              className="space-y-10 animate-fade-up"
            >
              {/* Row 1: One-Time Tiers ($15 / $29 / $39) */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <p className="text-xs font-semibold text-slate-700">
                    Asistencia puntual bajo demanda (pago único por solicitud)
                  </p>
                  <p className="text-xs font-semibold text-emerald-700">
                    Tarifas vigentes; consulta condiciones antes de pagar
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch pt-2">
                  {SERVICE_TIER_OPTIONS.map((tier) => {
                    const isFeatured = Boolean(tier.recommended);
                    const tierName = tier.id.split(' $')[0];
                    const isExpress = tier.id === 'Express $15';
                    const TierIcon = isFeatured
                      ? Sparkles
                      : isExpress
                      ? Zap
                      : Shield;

                    return (
                      <div
                        key={tier.id}
                        className={`relative rounded-2xl p-6 flex flex-col justify-between gap-6 transition-all duration-200 hover:-translate-y-0.5 ${
                          isFeatured
                            ? 'bg-white text-[#0B1528] border-2 border-[#2563EB] shadow-2xl shadow-blue-950/12'
                            : 'bg-white text-[#0B1528] border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
                        }`}
                      >
                        {isFeatured && (
                          <>
                            <div
                              aria-hidden="true"
                              className="absolute inset-x-0 top-0 h-1.5 rounded-t-xl bg-gradient-to-r from-[#2563EB] via-blue-400 to-[#10B981]"
                            />
                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white text-[11px] font-bold tracking-wide whitespace-nowrap shadow-md shadow-blue-600/25">
                              ★ RECOMENDADO
                            </div>
                          </>
                        )}

                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <p
                              className={`text-xs font-semibold ${
                                isFeatured ? 'text-[#2563EB]' : 'text-slate-500'
                              }`}
                            >
                              {tier.eyebrow}
                            </p>
                            <span
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isFeatured
                                  ? 'bg-blue-50 text-[#2563EB] border border-blue-200'
                                  : isExpress
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              }`}
                            >
                              <TierIcon className="w-4 h-4" aria-hidden="true" />
                            </span>
                          </div>

                          <h3 className="text-xl font-bold text-[#0B1528] mt-1">
                            {tierName}
                          </h3>

                          <div className="mt-4 space-y-1">
                            <p className="font-mono tabular-nums text-3xl font-bold tracking-tight text-[#0B1528]">
                              ${tier.priceUsd} USD{' '}
                              <span className="text-xs font-sans font-normal text-slate-600">
                                / incidente
                              </span>
                            </p>
                          </div>

                          <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                            {tier.summary}
                          </p>

                          <ul className="mt-5 pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
                            {tier.features.map((feat) => (
                              <li key={feat} className="flex items-start gap-2">
                                <Check
                                  className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5"
                                  aria-hidden="true"
                                />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <button
                          type="button"
                          onClick={() => onSelectCategoryForWizard('Otro', tier.id)}
                          className={`w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                            isFeatured
                              ? 'bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white shadow-md shadow-blue-600/20'
                              : isExpress
                              ? 'bg-white text-[#2563EB] border border-[#2563EB] hover:bg-blue-50'
                              : 'bg-white text-[#0B1528] border border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span>
                            Solicitar {tierName} ${tier.priceUsd}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row 2: Pyme Monthly Plans ($39 / $79) */}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-4">
                  Planes Pyme Mensuales (acceso desatendido y tiempos objetivo)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {PYME_PLANS.map((plan, index) => {
                    const isPrimary = index === 1;
                    return (
                      <div
                        key={plan.id}
                        className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between gap-6 border transition-all duration-200 hover:-translate-y-0.5 ${
                          isPrimary
                            ? 'bg-[#0B1528] text-white border-[#0B1528] shadow-xl shadow-slate-900/15'
                            : 'bg-white text-[#0B1528] border-slate-200 shadow-sm hover:shadow-md'
                        }`}
                      >
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                                isPrimary
                                  ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30'
                                  : 'bg-blue-50 text-[#2563EB] border border-blue-200/80'
                              }`}
                            >
                              <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{plan.devicesLimit}</span>
                            </span>
                          </div>

                          <h3 className="text-xl font-bold mt-3">{plan.name}</h3>

                          <div className="mt-3 flex items-baseline gap-2.5">
                            <p className="font-mono tabular-nums text-3xl font-bold">
                              ${plan.priceUsd} USD
                              <span
                                className={`text-xs font-sans font-normal ${
                                  isPrimary ? 'text-slate-300' : 'text-slate-600'
                                }`}
                              >
                                {' '}
                                / mes
                              </span>
                            </p>
                          </div>

                          <p
                            className={`text-xs mt-2.5 leading-relaxed ${
                              isPrimary ? 'text-slate-300' : 'text-slate-600'
                            }`}
                          >
                            {plan.summary}
                          </p>
                          <p
                            className={`text-[11px] mt-1.5 font-medium ${
                              isPrimary ? 'text-emerald-300' : 'text-emerald-700'
                            }`}
                          >
                            Facturación mensual recurrente según los términos del plan
                          </p>
                          <ul
                            className={`mt-4 pt-4 border-t space-y-2 text-xs ${
                              isPrimary
                                ? 'border-slate-800 text-slate-200'
                                : 'border-slate-100 text-slate-700'
                            }`}
                          >
                            {plan.features.map((feat) => (
                              <li key={feat} className="flex items-start gap-2">
                                <Check
                                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                                    isPrimary ? 'text-[#10B981]' : 'text-emerald-700'
                                  }`}
                                  aria-hidden="true"
                                />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div
                          className={`pt-4 border-t flex flex-wrap items-center justify-between gap-4 text-xs ${
                            isPrimary
                              ? 'border-slate-800 text-slate-300'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          <span
                            className={`inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-lg ${
                              isPrimary
                                ? 'bg-slate-800/80 text-slate-200'
                                : 'bg-slate-100 text-[#0B1528]'
                            }`}
                          >
                            <Shield
                              className={`w-3.5 h-3.5 ${
                                isPrimary ? 'text-[#10B981]' : 'text-emerald-700'
                              }`}
                              aria-hidden="true"
                            />
                            <span>Incluye Agente Host Instalado</span>
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onSelectCategoryForWizard(
                                'Otro',
                                plan.serviceTier,
                                'pyme_monthly'
                              )
                            }
                            className={`px-4 py-2.5 font-semibold rounded-xl transition-colors whitespace-nowrap ${
                              isPrimary
                                ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                                : 'bg-[#0B1528] text-white hover:bg-[#132544]'
                            }`}
                          >
                            Activar Plan
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Trust & Payment Methods Bar below Pricing Cards */}
              <ScrollReveal>
                <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs text-slate-600">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck
                      className="w-4 h-4 text-[#10B981] shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      <strong className="text-[#0B1528]">
                        Métodos de pago seguros aceptados:
                      </strong>{' '}
                      conexión cifrada mediante la plataforma de asistencia e informe técnico.
                    </span>
                  </div>
                  <div
                    className="flex flex-wrap items-center gap-2 shrink-0"
                    aria-label="Métodos de pago aceptados"
                  >
                    <span className="h-7 px-2.5 rounded border border-slate-200 bg-white flex items-center justify-center shadow-xs">
                      <GooglePayLogo variant="light" className="h-4" />
                    </span>
                    <span className="h-7 px-2.5 rounded border border-slate-200 bg-[#FFC439] flex items-center justify-center shadow-xs">
                      <PayPalLogo className="h-4" />
                    </span>
                    <span className="h-7 px-2.5 rounded border border-slate-200 bg-white flex items-center justify-center shadow-xs">
                      <StripeLogo variant="light" className="h-4" />
                    </span>
                    <CardNetworkBadges />
                  </div>
                </div>
              </ScrollReveal>

              {/* Conversion Hook + Viral Referral Strip */}
              <ScrollReveal delayMs={80}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch pt-2">
                <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-6 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#0B1528]">
                      <ShieldCheck
                        className="w-4 h-4 text-[#10B981] shrink-0"
                        aria-hidden="true"
                      />
                      <span>Asistencia técnica a distancia</span>
                    </div>
                    <h3 className="text-base font-semibold text-[#0B1528]">
                      Solicita soporte remoto y consulta las condiciones antes de pagar
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Describe el problema en el diagnóstico guiado. La tarifa del servicio se muestra antes de iniciar el checkout y el pago se procesa antes de la asistencia.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-200 text-xs">
                    <div>
                      <p className="font-mono tabular-nums font-bold text-[#0B1528]">
                        Tarifa publicada
                      </p>
                      <p className="text-slate-600 mt-0.5">Consulta antes de contratar</p>
                    </div>
                    <div>
                      <p className="font-mono tabular-nums font-bold text-emerald-700">
                        $15 USD
                      </p>
                      <p className="text-slate-600 mt-0.5">Tarifa Express publicada</p>
                    </div>
                    <div>
                      <p className="font-mono tabular-nums font-bold text-[#2563EB]">
                        3 pasos
                      </p>
                      <p className="text-slate-600 mt-0.5">Diagnóstico guiado</p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 rounded-2xl border border-[#0B1528] bg-[#0B1528] text-white p-6 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#10B981]">
                      Comparte el servicio
                    </p>
                    <h3 className="text-base font-semibold text-white">
                      ¿Conoces a alguien con el equipo lento o sin impresora?
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Comparte el enlace para que un colega o familiar conozca el servicio y
                      las tarifas vigentes.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => void handleCopyReferralLink()}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-[#2563EB] hover:bg-blue-500 text-white rounded-xl transition-colors whitespace-nowrap"
                    >
                      {referralCopied ? (
                        <>
                          <Check className="w-4 h-4 text-[#10B981]" aria-hidden="true" />
                          <span>Enlace VIP copiado</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4" aria-hidden="true" />
                          <span>Compartir enlace</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleCopyReferralLink()}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-mono text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 rounded-xl transition-colors whitespace-nowrap"
                    >
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>?ref=RS365-VIP</span>
                    </button>
                  </div>
                </div>
                </div>
              </ScrollReveal>
            </div>
          ) : (
            /* SaaS Tab: $29 - $79/mes for IT Support Companies + Tenant Request Form */
            <div
              key="saas"
              data-testid="plans-saas-panel"
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-up"
            >
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-5">
                {SAAS_PLANS.map((plan) => {
                  return (
                    <div
                      key={plan.id}
                      className={`rounded-2xl p-6 flex flex-col justify-between gap-5 border transition-all duration-200 hover:-translate-y-0.5 ${
                        plan.highlighted
                          ? 'bg-[#0B1528] text-white border-[#0B1528] shadow-xl shadow-slate-900/15'
                          : 'bg-white text-[#0B1528] border-slate-200 shadow-sm hover:shadow-md'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-xs font-medium ${
                              plan.highlighted ? 'text-[#10B981]' : 'text-[#2563EB]'
                            }`}
                          >
                            {plan.seats}
                          </p>
                          <Layers
                            className={`w-4 h-4 ${
                              plan.highlighted ? 'text-[#10B981]' : 'text-[#2563EB]'
                            }`}
                            aria-hidden="true"
                          />
                        </div>
                        <h3 className="text-lg font-semibold mt-1">{plan.name}</h3>

                        <div className="mt-3 space-y-1">

                          <p className="font-mono tabular-nums text-2xl font-bold">
                            ${plan.priceUsd} USD{' '}
                            <span
                              className={`text-xs font-sans font-normal ${
                                plan.highlighted ? 'text-slate-300' : 'text-slate-600'
                              }`}
                            >
                              / mes
                            </span>
                          </p>
                        </div>

                        <p
                          className={`text-xs mt-2 leading-relaxed ${
                            plan.highlighted ? 'text-slate-300' : 'text-slate-600'
                          }`}
                        >
                          {plan.summary}
                        </p>
                        <p
                          className={`text-[11px] mt-1.5 font-medium ${
                            plan.highlighted ? 'text-emerald-300' : 'text-emerald-700'
                          }`}
                        >
                          Facturación mensual recurrente según los términos del plan
                        </p>

                        <ul
                          className={`mt-4 space-y-2 text-xs ${
                            plan.highlighted ? 'text-slate-200' : 'text-slate-700'
                          }`}
                        >
                          {plan.features.map((feat) => (
                            <li key={feat} className="flex items-start gap-2">
                              <Check
                                className={`w-4 h-4 shrink-0 ${
                                  plan.highlighted ? 'text-[#10B981]' : 'text-emerald-700'
                                }`}
                                aria-hidden="true"
                              />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedSaasPlan(`${plan.name} ($${plan.priceUsd}/mes)`)
                        }
                        className={`w-full px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors ${
                          plan.highlighted
                            ? 'bg-[#2563EB] text-white hover:bg-blue-500'
                            : 'border border-slate-300 text-[#0B1528] hover:bg-slate-50'
                        }`}
                      >
                        Elegir {plan.name}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Right: B2B SaaS Tenant Onboarding Form */}
              <div className="lg:col-span-4 bg-[#F8FAFC] border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center gap-2.5 mb-3">
                  <Building2 className="w-5 h-5 text-[#0B1528]" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-[#0B1528]">
                    Crear Tenant SaaS MSP
                  </h3>
                </div>
                <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                  Habilita tu organización multiempresa con AI Workforce 365, freelancers
                  invitados y relay RustDesk propio.
                </p>

                {leadSubmitted ? (
                  <div
                    data-testid="enterprise-lead-confirmed"
                    className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2"
                  >
                    <p className="text-sm font-semibold text-emerald-800">
                      Solicitud SaaS registrada
                    </p>
                    <p className="text-xs text-emerald-900/80 leading-relaxed">
                      Hemos registrado tu interés para{' '}
                      <strong>{selectedSaasPlan}</strong>. Nuestro equipo aprovisionará tu
                      espacio multi-tenant.
                    </p>
                    <button
                      type="button"
                      onClick={() => setLeadSubmitted(false)}
                      className="text-xs font-semibold text-emerald-800 underline pt-1"
                    >
                      Enviar otra solicitud
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleEnterpriseSubmit} noValidate className="space-y-4">
                    <div>
                      <label
                        htmlFor="b2b-company"
                        className="block text-xs font-semibold text-[#0B1528] mb-1"
                      >
                        Empresa de soporte o MSP
                      </label>
                      <input
                        id="b2b-company"
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Ej. Andes IT Managed Services"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="b2b-email"
                        className="block text-xs font-semibold text-[#0B1528] mb-1"
                      >
                        Correo del administrador
                      </label>
                      <input
                        id="b2b-email"
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="admin@tuempresa-it.com"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="b2b-plan"
                        className="block text-xs font-semibold text-[#0B1528] mb-1"
                      >
                        Plan SaaS seleccionado
                      </label>
                      <select
                        id="b2b-plan"
                        value={selectedSaasPlan}
                        onChange={(e) => setSelectedSaasPlan(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
                      >
                        <option value="Starter MSP ($29/mes)">Starter MSP ($29/mes)</option>
                        <option value="Growth Helpdesk ($49/mes)">
                          Growth Helpdesk ($49/mes)
                        </option>
                        <option value="Scale Marketplace ($79/mes)">
                          Scale Marketplace ($79/mes)
                        </option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="b2b-size"
                        className="block text-xs font-semibold text-[#0B1528] mb-1"
                      >
                        Tamaño del equipo técnico
                      </label>
                      <select
                        id="b2b-size"
                        value={teamSize}
                        onChange={(e) => setTeamSize(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
                      >
                        <option value="1–3 técnicos internos">1–3 técnicos internos</option>
                        <option value="3–10 técnicos internos">3–10 técnicos internos</option>
                        <option value="10+ técnicos + Freelancers">
                          10+ técnicos + Freelancers
                        </option>
                      </select>
                    </div>

                    {leadError && (
                      <p role="alert" className="text-xs font-medium text-red-700">
                        {leadError}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-500 rounded-xl transition-colors"
                    >
                      Solicitar Alta SaaS
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
