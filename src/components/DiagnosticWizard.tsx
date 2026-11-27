import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Cloud,
  Cpu,
  Laptop,
  Loader2,
  Lock,
  Mail,
  Monitor,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  Wifi,
} from 'lucide-react';
import { AssistantOrbIcon } from './AssistantOrbIcon';
import { ScrollReveal } from './ScrollReveal';
import { runAiReceptionistTriage } from '../services/aiService';
import type {
  AiAgentConfig,
  IssueCategory,
  OperatingSystem,
  ServiceTier,
  WizardDraft,
} from '../types/support';
import { getConfiguredTierPriceUsd } from '../config/businessConfig';
import { useBusinessConfig } from '../hooks/useBusinessConfig';
import {
  deriveInitialDiagnosisSummary,
  formatCategoryForOs,
  getOsCompatibleCategory,
  getServiceTierPriceUsd,
  getSuggestedTierForCategory,
  validateStep3,
} from '../utils/ticketLogic';
import type { LegalDocTab } from './LegalDocsModal';
import heroWarmSpecialistImg from '../assets/images/hero_warm_specialist_1795208080027.webp';

export interface ExternalTriageTrigger {
  id: number;
  symptom: string;
  category?: IssueCategory;
  openComposer?: boolean;
  preselectedTier?: ServiceTier;
  preselectedBillingMode?: 'one_time' | 'pyme_monthly';
}

interface DiagnosticWizardProps {
  draft: WizardDraft;
  errors: Record<string, string>;
  persistenceError?: string | null;
  aiAgents?: AiAgentConfig[];
  externalTrigger?: ExternalTriageTrigger | null;
  onChangeDraft: (patch: Partial<WizardDraft>) => void;
  onSetErrors: (errors: Record<string, string>) => void;
  onSubmitTicket: () => Promise<void> | void;
  onOpenLegalDoc?: (tab: LegalDocTab) => void;
  onOpenTicketLookup?: () => void;
}

interface ChatTurn {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
}

const QUICK_STARTER_OPTIONS: Array<{
  label: string;
  symptom: string;
  category: IssueCategory;
  badgeStyle: string;
  icon: typeof Mail;
}> = [
  {
    label: 'Outlook no abre',
    symptom: 'Outlook no abre o se queda cargando el perfil en mi equipo.',
    category: 'Errores de Microsoft 365 y Outlook',
    badgeStyle: 'bg-sky-50 text-sky-700 border-sky-100',
    icon: Mail,
  },
  {
    label: 'Problemas con Microsoft 365',
    symptom: 'Microsoft 365 muestra error de cuenta, activación o cierre inesperado.',
    category: 'Errores de Microsoft 365 y Outlook',
    badgeStyle: 'bg-orange-50 text-orange-600 border-orange-100',
    icon: Sparkles,
  },
  {
    label: 'OneDrive no sincroniza',
    symptom: 'OneDrive se quedó detenido sincronizando o muestra error de cuenta.',
    category: 'Errores de Microsoft 365 y Outlook',
    badgeStyle: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    icon: Cloud,
  },
  {
    label: 'PC lenta o bloqueada',
    symptom: 'Mi equipo va muy lento, tarda en encender o se congela al abrir programas.',
    category: 'Windows lento o bajo rendimiento',
    badgeStyle: 'bg-blue-50 text-[#2563EB] border-blue-100',
    icon: Cpu,
  },
  {
    label: 'Wi-Fi o impresora no conecta',
    symptom: 'Mi Wi-Fi se desconecta o mi impresora aparece sin conexión en el equipo.',
    category: 'Problemas de Wi-Fi o red',
    badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    icon: Wifi,
  },
  {
    label: 'Virus o ventanas emergentes',
    symptom: 'Aparecen anuncios sospechosos, ventanas emergentes o posible malware en mi PC.',
    category: 'Eliminación de malware y virus',
    badgeStyle: 'bg-rose-50 text-rose-700 border-rose-100',
    icon: ShieldAlert,
  },
];

const OS_SELECTOR_OPTIONS: Array<{
  value: OperatingSystem;
  label: string;
  subtitle: string;
  icon: typeof Monitor;
}> = [
  { value: 'Windows', label: 'Windows', subtitle: '10 / 11', icon: Monitor },
  { value: 'Mac', label: 'Mac', subtitle: 'macOS', icon: Laptop },
  { value: 'Linux', label: 'Linux', subtitle: 'Ubuntu / Deb', icon: Terminal },
  { value: 'Mobile', label: 'Mobile', subtitle: 'Android / iOS', icon: Smartphone },
];

function getQuickOptionsForQuestion(question: string): string[] {
  const lower = question.toLowerCase();
  if (lower.includes('frecuencia') || lower.includes('continua') || lower.includes('intermitente')) {
    return ['Siempre que lo uso', 'Solo a veces', 'Empezó hoy'];
  }
  if (lower.includes('actualización') || lower.includes('cambio') || lower.includes('reciente')) {
    return ['Sí, hubo un cambio', 'No, fue de repente', 'No estoy seguro'];
  }
  if (lower.includes('personal') || lower.includes('empresa') || lower.includes('trabajo')) {
    return ['Equipo personal', 'De trabajo / empresa'];
  }
  return ['Sí', 'No', 'No estoy seguro'];
}

export function DiagnosticWizard({
  draft,
  errors,
  persistenceError,
  aiAgents = [],
  externalTrigger,
  onChangeDraft,
  onSetErrors,
  onSubmitTicket,
  onOpenLegalDoc,
  onOpenTicketLookup,
}: DiagnosticWizardProps) {
  const [composerText, setComposerText] = useState('');
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([]);
  const [aiQuestionAnswers, setAiQuestionAnswers] = useState<Record<number, string>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selfSolved, setSelfSolved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTierSwitcher, setShowTierSwitcher] = useState(false);

  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const chatCardRef = useRef<HTMLDivElement | null>(null);
  const lastTriggerIdRef = useRef<number | null>(null);

  const receptionistAgent = aiAgents.find((a) => a.agent_key === 'ai_receptionist');
  const receptionistEnabled = receptionistAgent ? receptionistAgent.is_enabled : true;

  const businessConfig = useBusinessConfig();
  const isStage2 = draft.step === 3;
  const activeTier = draft.serviceTier;
  const activePrice =
    getConfiguredTierPriceUsd(activeTier, draft.billingMode, businessConfig) ??
    getServiceTierPriceUsd(activeTier);
  const isPymeMonthly = draft.billingMode === 'pyme_monthly';
  const currentOs: OperatingSystem = draft.operatingSystem ?? 'Windows';

  const scrollToChatCard = () => {
    window.setTimeout(() => {
      const card = chatCardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const headerOffset = 76;
      const availableHeight = window.innerHeight - headerOffset;
      const targetTop =
        rect.height <= availableHeight
          ? window.scrollY +
            rect.top -
            headerOffset -
            Math.max(0, (availableHeight - rect.height) / 2)
          : window.scrollY + rect.top - headerOffset;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    }, 80);
  };

  const executeAiTriage = async (
    symptomText: string,
    overrideCategory?: IssueCategory,
    followUpAnswers?: Array<{ question: string; answer: string }>,
    lockedTierOverride?: boolean
  ) => {
    const cleanText = symptomText.trim();
    if (!cleanText) return;

    setSelfSolved(false);
    setAiError(null);
    onSetErrors({});

    const nextCategory = overrideCategory ?? draft.category ?? 'Otro';
    const nextDescription =
      draft.description.trim().length > 0 &&
      !draft.description.includes(cleanText) &&
      chatTurns.length > 0
        ? `${draft.description.trim()}\nDetalle adicional: ${cleanText}`
        : cleanText;

    setChatTurns((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        sender: 'user',
        text: cleanText,
      },
    ]);

    onChangeDraft({
      step: 1,
      category: nextCategory,
      operatingSystem: currentOs,
      description: nextDescription,
    });

    if (!receptionistEnabled) {
      setChatTurns((prev) => [
        ...prev,
        {
          id: `a-${Date.now() + 1}`,
          sender: 'assistant',
          text: 'Gracias por compartir el detalle. Puedes pasar directamente al siguiente paso para revisar la tarifa fija y solicitar atención especializada.',
        },
      ]);
      return;
    }

    setAiLoading(true);
    try {
      const triage = await runAiReceptionistTriage({
        category: nextCategory,
        osType: currentOs,
        description: nextDescription,
        ...(followUpAnswers && followUpAnswers.length > 0
          ? { followUpAnswers }
          : {}),
      });

      const resolvedCategory = getOsCompatibleCategory(
        triage.suggestedCategory || nextCategory,
        currentOs
      );
      const shouldPreserveSelectedTier =
        draft.billingMode === 'pyme_monthly' ||
        Boolean(draft.userLockedTier) ||
        Boolean(lockedTierOverride);
      const suggestedTier = shouldPreserveSelectedTier
        ? draft.serviceTier
        : triage.suggestedTier || getSuggestedTierForCategory(resolvedCategory);

      onChangeDraft({
        step: 1,
        category: resolvedCategory,
        operatingSystem: currentOs,
        description: nextDescription,
        serviceTier: suggestedTier,
        aiTriage: triage,
      });
      setAiQuestionAnswers({});

      setChatTurns((prev) => [
        ...prev,
        {
          id: `a-${Date.now() + 1}`,
          sender: 'assistant',
          text: triage.preDiagnosis,
        },
      ]);
    } catch {
      setAiError(
        'No fue posible completar el triaje IA en este instante. Puedes continuar con un especialista ahora mismo.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (!externalTrigger || externalTrigger.id === lastTriggerIdRef.current) return;
    lastTriggerIdRef.current = externalTrigger.id;

    const hasLockedTier = Boolean(
      externalTrigger.preselectedTier ||
        externalTrigger.preselectedBillingMode === 'pyme_monthly'
    );
    if (externalTrigger.openComposer && !externalTrigger.symptom.trim()) {
      onChangeDraft({
        step: 1,
        ...(externalTrigger.preselectedTier
          ? {
              serviceTier: externalTrigger.preselectedTier,
              userLockedTier: true,
            }
          : {}),
        ...(externalTrigger.preselectedBillingMode
          ? { billingMode: externalTrigger.preselectedBillingMode }
          : {}),
      });
      scrollToChatCard();
      window.setTimeout(() => composerRef.current?.focus({ preventScroll: true }), 220);
      return;
    }

    if (externalTrigger.symptom.trim()) {
      setComposerText('');
      scrollToChatCard();
      void executeAiTriage(
        externalTrigger.symptom,
        externalTrigger.category,
        undefined,
        hasLockedTier
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalTrigger]);

  const handleResetConversation = () => {
    setChatTurns([]);
    setAiQuestionAnswers({});
    setComposerText('');
    setSelfSolved(false);
    setAiError(null);
    onSetErrors({});
    onChangeDraft({
      step: 1,
      description: '',
      aiTriage: null,
      userLockedTier: false,
    });
    window.setTimeout(() => composerRef.current?.focus({ preventScroll: true }), 80);
  };

  const handleComposerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerText.trim() || aiLoading) return;
    const text = composerText.trim();
    setComposerText('');
    void executeAiTriage(text, draft.category ?? 'Otro');
  };

  const handleRefineWithAnswers = () => {
    const structuredAnswers = Object.entries(aiQuestionAnswers)
      .filter(([, ans]) => ans.trim().length > 0)
      .map(([idx, ans]) => ({
        question: draft.aiTriage?.followUpQuestions[Number(idx)] ?? 'Detalle',
        answer: ans.trim(),
      }));

    if (structuredAnswers.length === 0) return;
    const qaSummary = structuredAnswers
      .map((item) => `${item.question} → ${item.answer}`)
      .join(' | ');
    void executeAiTriage(
      `Respuestas rápidas: ${qaSummary}`,
      draft.category ?? 'Otro',
      structuredAnswers
    );
  };

  const handleEscalateToSpecialist = () => {
    const resolvedCategory = draft.category ?? 'Otro';
    const baseDesc =
      draft.description.trim().length >= 8
        ? draft.description.trim()
        : `Solicitud de atención directa con especialista remoto en ${currentOs} (${resolvedCategory}).`;

    const selectedQuickContext = Object.entries(aiQuestionAnswers)
      .filter(([, ans]) => ans.trim().length > 0)
      .map(
        ([idx, ans]) =>
          `${draft.aiTriage?.followUpQuestions[Number(idx)] ?? 'Detalle'} ${ans.trim()}`
      )
      .join(' | ');

    const fallbackDesc =
      selectedQuickContext && !baseDesc.includes(selectedQuickContext)
        ? `${baseDesc}\nContexto rápido: ${selectedQuickContext}`
        : baseDesc;

    const shouldPreserveSelectedTier =
      draft.billingMode === 'pyme_monthly' || Boolean(draft.userLockedTier);
    const resolvedTier = shouldPreserveSelectedTier
      ? draft.serviceTier
      : draft.aiTriage?.suggestedTier ?? getSuggestedTierForCategory(resolvedCategory);

    onSetErrors({});
    onChangeDraft({
      step: 3,
      category: resolvedCategory,
      operatingSystem: currentOs,
      description: fallbackDesc,
      serviceTier: resolvedTier,
    });
    scrollToChatCard();
  };

  const handleSelectOneTimeTier = (tier: ServiceTier) => {
    onChangeDraft({
      serviceTier: tier,
      billingMode: 'one_time',
      userLockedTier: true,
    });
  };

  const handleSelectPymeTier = (tier: ServiceTier) => {
    onChangeDraft({
      serviceTier: tier,
      billingMode: 'pyme_monthly',
      userLockedTier: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateStep3(draft);
    if (!validation.valid) {
      onSetErrors(validation.errors);
      return;
    }
    onSetErrors({});
    setIsSubmitting(true);
    try {
      await onSubmitTicket();
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeErrorList = Object.values(errors).filter(Boolean);
  const hasAnsweredFollowUps = Object.values(aiQuestionAnswers).some(
    (v) => v.trim().length > 0
  );

  return (
    <section
      id="diagnostico"
      aria-labelledby="wizard-heading"
      className="scroll-mt-16 py-10 sm:py-14 bg-[#F8FAFC] border-b border-slate-200/80"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Luminous Header */}
        <ScrollReveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-5">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
                <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Empieza por lo que te pasa</span>
              </p>
              <h2
                id="wizard-heading"
                className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B192C] mt-1"
              >
                ¿Con qué necesitas ayuda?
              </h2>
            </div>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed">
              Elige un fallo común o descríbelo abajo. La IA te guiará paso a paso antes de cualquier conexión remota.
            </p>
          </div>
        </ScrollReveal>

        {/* Wide White Rounded-3xl Conversational Assistant & Escalation Card */}
        <div
          ref={chatCardRef}
          data-testid="diagnostic-assistant-card"
          className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 overflow-hidden animate-fade-up"
        >
            {/* Clean Light Header */}
            <div className="px-5 sm:px-8 py-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <AssistantOrbIcon
                  size="lg"
                  state={aiLoading ? 'thinking' : draft.aiTriage ? 'ready' : 'idle'}
                  showOnlineBadge
                />
                <div className="min-w-0">
                  <p className="text-base font-bold text-[#0B192C] leading-tight">
                    Asistente Remote 365
                  </p>
                  <p className="text-xs font-medium text-emerald-700 mt-0.5">
                    {aiLoading
                      ? 'Analizando tu caso en tiempo real...'
                      : 'Aquí para ayudarte · Sin acceso remoto hasta que tú lo autorices'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {!isStage2 && !(draft.aiTriage && !aiLoading && !selfSolved) && (
                  <button
                    type="button"
                    data-testid="direct-escalate-button"
                    onClick={handleEscalateToSpecialist}
                    className="inline-flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-[#0B192C] shadow-xs transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  >
                    <img
                      src={heroWarmSpecialistImg}
                      alt=""
                      width={24}
                      height={24}
                      loading="lazy"
                      decoding="async"
                      aria-hidden="true"
                      referrerPolicy="no-referrer"
                      className="w-6 h-6 rounded-full object-cover border border-slate-200"
                    />
                    <span>Hablar con especialista</span>
                  </button>
                )}

                {isStage2 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-[#1D4ED8] text-xs font-semibold">
                    <span>Paso 2 de 2 · Tarifa fija y sala segura</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleResetConversation}
                  aria-label="Reiniciar conversación"
                  title="Reiniciar conversación"
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-[#0B192C] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div
              role="region"
              aria-label="Progreso del diagnóstico"
              className="px-5 sm:px-8 py-3 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between gap-4"
            >
              <div className="w-full flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className={`flex items-center gap-2 font-semibold text-xs ${
                      !isStage2 ? 'text-[#2563EB]' : 'text-emerald-700'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                        !isStage2
                          ? 'bg-[#2563EB] text-white shadow-xs'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {!isStage2 ? '1' : <Check className="w-3 h-3" />}
                    </span>
                    <span className="hidden sm:inline">1. Diagnóstico y Triage IA</span>
                    <span className="sm:hidden">1. Diagnóstico</span>
                  </div>
                  <div
                    className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                      !isStage2 ? 'bg-slate-200' : 'bg-emerald-500'
                    }`}
                  />
                  <div
                    className={`flex items-center gap-2 font-semibold text-xs ${
                      isStage2 ? 'text-[#2563EB]' : 'text-slate-400'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                        isStage2
                          ? 'bg-[#2563EB] text-white shadow-xs'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      2
                    </span>
                    <span className="hidden sm:inline">2. Resumen y Sala Segura</span>
                    <span className="sm:hidden">2. Sala Segura</span>
                  </div>
                </div>
              </div>
            </div>

            {/* STAGE 1: Conversational AI Receptionist */}
            {!isStage2 && (
              <div data-testid="wizard-step-1" className="p-5 sm:p-8 space-y-6">
                {/* Compact OS Selector Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-600">
                    Tu sistema operativo:
                  </span>
                  <div
                    role="radiogroup"
                    aria-label="Sistema operativo de tu equipo"
                    className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2"
                  >
                    {OS_SELECTOR_OPTIONS.map((os) => {
                      const OsIcon = os.icon;
                      const isActive = currentOs === os.value;
                      const isDisabled = os.value !== 'Windows';
                      return (
                        <button
                          key={os.value}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          disabled={isDisabled}
                          title={isDisabled ? 'Disponible próximamente' : os.label}
                          onClick={() => {
                            if (!isDisabled) {
                              onChangeDraft({ operatingSystem: os.value });
                            }
                          }}
                          className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all duration-150 ${
                            isDisabled
                              ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                              : isActive
                              ? 'border-[#2563EB] bg-blue-50/70 text-[#1D4ED8]'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <OsIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>{os.label}</span>
                          {isDisabled && (
                            <span className="text-[9px] font-normal text-slate-400">
                              (Pronto)
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pre-selected Plan Banner when user selected a specific pricing plan */}
                {(draft.userLockedTier || isPymeMonthly) && (
                  <div
                    data-testid="preselected-plan-banner"
                    className="rounded-xl bg-blue-50/80 border border-blue-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 text-xs">
                      <p className="font-semibold text-[#0B192C]">
                        Plan preseleccionado:{' '}
                        <span className="text-[#1D4ED8]">{activeTier}</span>{' '}
                        <span className="font-mono tabular-nums">
                          (${activePrice} USD{isPymeMonthly ? '/mes' : ''})
                        </span>
                      </p>
                      <p className="text-slate-600">
                        Mantendremos tu tarifa elegida intacta durante el diagnóstico.
                        {draft.aiTriage?.suggestedTier &&
                          draft.aiTriage.suggestedTier !== activeTier &&
                          !isPymeMonthly && (
                            <>
                              {' '}
                              Sugerencia opcional de IA:{' '}
                              <strong className="text-[#0B192C]">
                                {draft.aiTriage.suggestedTier}
                              </strong>
                              .
                            </>
                          )}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleEscalateToSpecialist}
                        className="px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors whitespace-nowrap"
                      >
                        Continuar con este plan
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onChangeDraft({
                            userLockedTier: false,
                            billingMode: 'one_time',
                          })
                        }
                        className="px-2.5 py-1.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-xs font-medium text-slate-700 transition-colors whitespace-nowrap"
                      >
                        Cambiar plan
                      </button>
                    </div>
                  </div>
                )}

                {/* Chat Conversation Area */}
                <div className="space-y-4">
                  {chatTurns.length === 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-slate-600">
                        Sugerencias rápidas de fallos comunes:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {QUICK_STARTER_OPTIONS.map((opt) => {
                          const OptIcon = opt.icon;
                          const effectiveCategory = getOsCompatibleCategory(opt.category, currentOs);
                          const displayLabel =
                            opt.category === 'Windows lento o bajo rendimiento'
                              ? currentOs === 'Mac'
                                ? 'Mac lento o bloqueado'
                                : currentOs === 'Linux'
                                ? 'Linux lento o alto consumo'
                                : currentOs === 'Mobile'
                                ? 'Equipo móvil lento o bloqueado'
                                : 'Equipo lento o bloqueado'
                              : opt.label;
                          return (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => void executeAiTriage(opt.symptom, effectiveCategory)}
                              className="w-full rounded-2xl border border-slate-200/90 hover:border-blue-300 bg-white hover:bg-blue-50/40 hover:shadow-sm px-4 py-3.5 flex items-center justify-between gap-3 text-left transition-all duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                            >
                              <span className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105 ${opt.badgeStyle}`}
                                >
                                  <OptIcon className="w-4 h-4" aria-hidden="true" />
                                </span>
                                <span className="text-sm font-medium text-[#0B192C] group-hover:text-[#1D4ED8] leading-snug">
                                  {displayLabel}
                                </span>
                              </span>
                              <ArrowUpRight
                                className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0"
                                aria-hidden="true"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-[#F8FAFC] border border-slate-200/80 p-4 sm:p-5 space-y-4">
                      {chatTurns.map((turn) => (
                        <div
                          key={turn.id}
                          className={`flex items-start gap-3 animate-chat-pop ${
                            turn.sender === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {turn.sender === 'assistant' && (
                            <AssistantOrbIcon size="sm" state="ready" className="mt-0.5" />
                          )}
                          <div
                            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-2xl ${
                              turn.sender === 'user'
                                ? 'bg-[#2563EB] text-white rounded-tr-sm shadow-xs'
                                : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-sm shadow-xs'
                            }`}
                          >
                            {turn.text}
                          </div>
                        </div>
                      ))}

                      {aiLoading && (
                        <div className="flex items-start gap-3 animate-chat-pop">
                          <AssistantOrbIcon size="sm" state="thinking" className="mt-0.5" />
                          <div className="rounded-2xl rounded-tl-sm bg-white border border-blue-200 px-4 py-3 text-xs font-medium text-[#1D4ED8] flex items-center gap-2">
                            <span>Analizando tu caso y preparando pasos seguros de comprobación</span>
                            <span className="inline-flex items-center gap-1" aria-hidden="true">
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-typing-dot"
                                style={{ animationDelay: '0ms' }}
                              />
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-typing-dot"
                                style={{ animationDelay: '150ms' }}
                              />
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-typing-dot"
                                style={{ animationDelay: '300ms' }}
                              />
                            </span>
                          </div>
                        </div>
                      )}

                      {aiError && (
                        <div
                          role="alert"
                          className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-center justify-between gap-3"
                        >
                          <span>{aiError}</span>
                          <button
                            type="button"
                            onClick={handleEscalateToSpecialist}
                            className="font-semibold underline shrink-0"
                          >
                            Ir con especialista
                          </button>
                        </div>
                      )}

                      {/* Structured AI Response: Safe Self-Service Steps + Brief Follow-Up Questions */}
                      {draft.aiTriage && !aiLoading && (
                        <div
                          data-testid="ai-receptionist-result"
                          className="rounded-2xl bg-white border border-slate-200/90 p-5 space-y-5 shadow-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                              <span className="font-semibold text-[#0B192C]">
                                {formatCategoryForOs(
                                  draft.aiTriage.suggestedCategory ?? draft.category ?? 'Otro',
                                  currentOs
                                )}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 text-[#2563EB] font-medium">
                                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                                Generado por IA
                              </span>
                            </div>
                            <span className="font-mono tabular-nums text-xs font-semibold text-emerald-700">
                              ~{draft.aiTriage.estimatedMinutes} min estimados
                            </span>
                          </div>

                          {/* Safe Self-Service Steps */}
                          {draft.aiTriage.selfServiceSteps &&
                            draft.aiTriage.selfServiceSteps.length > 0 && (
                              <div className="rounded-xl bg-[#F2FBF7] border border-emerald-200/70 p-4 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                                    <ShieldCheck
                                      className="w-4 h-4 text-[#10B981]"
                                      aria-hidden="true"
                                    />
                                    <span>Pasos seguros que puedes probar ahora mismo</span>
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setSelfSolved(true)}
                                    className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-2"
                                  >
                                    ¡Me funcionó! Ya quedó resuelto
                                  </button>
                                </div>

                                <ol className="space-y-2 text-xs sm:text-[13px] text-slate-700">
                                  {draft.aiTriage.selfServiceSteps.map((stepText, idx) => (
                                    <li key={idx} className="flex items-start gap-2.5">
                                      <span className="w-5 h-5 rounded-full bg-white border border-emerald-300 text-emerald-800 font-mono tabular-nums text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                        {idx + 1}
                                      </span>
                                      <span className="leading-relaxed">{stepText}</span>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            )}

                          {selfSolved && (
                            <div
                              role="status"
                              className="rounded-xl bg-emerald-600 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                            >
                              <span className="inline-flex items-center gap-2 font-medium">
                                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                                ¡Excelente! Me alegra haberte ayudado sin costo. Si vuelve a ocurrir, aquí seguimos disponibles.
                              </span>
                              <button
                                type="button"
                                onClick={handleResetConversation}
                                className="font-semibold underline whitespace-nowrap"
                              >
                                Nueva consulta
                              </button>
                            </div>
                          )}

                          {/* 2–3 Brief Follow-Up Questions (1-Click Quick Chips) */}
                          {draft.aiTriage.followUpQuestions.length > 0 && !selfSolved && (
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-[#0B192C]">
                                  Ayúdanos a preparar al especialista con 1 clic (opcional):
                                </p>
                                {hasAnsweredFollowUps && (
                                  <button
                                    type="button"
                                    onClick={handleRefineWithAnswers}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Afinar guía IA con estas respuestas</span>
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {draft.aiTriage.followUpQuestions.slice(0, 3).map((q, idx) => {
                                  const selectedAnswer = aiQuestionAnswers[idx] ?? '';
                                  const options = getQuickOptionsForQuestion(q);
                                  return (
                                    <div
                                      key={idx}
                                      className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 space-y-2"
                                    >
                                      <p className="text-xs font-medium text-slate-700 leading-snug">
                                        {q}
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {options.map((opt) => {
                                          const isSelected = selectedAnswer === opt;
                                          return (
                                            <button
                                              key={opt}
                                              type="button"
                                              aria-pressed={isSelected}
                                              onClick={() =>
                                                setAiQuestionAnswers((prev) => ({
                                                  ...prev,
                                                  [idx]: prev[idx] === opt ? '' : opt,
                                                }))
                                              }
                                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                                                isSelected
                                                  ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                                                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:text-[#1D4ED8]'
                                              }`}
                                            >
                                              {opt}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Escalation Action Strip */}
                          {!selfSolved && (
                            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-[#0B192C]">
                                  ¿Prefieres que un especialista lo resuelva ahora por ti?
                                </p>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                  <strong className="font-semibold text-[#0B192C]">
                                    Sin cobro todavía
                                  </strong>{' '}
                                  · En el siguiente paso confirmas tus datos y abres tu sala segura.{' '}
                                  <span className="text-emerald-700 font-medium">
                                    Garantía de resolución conforme a nuestra Política de Reembolsos.
                                  </span>
                                </p>
                              </div>
                              <button
                                type="button"
                                data-testid="escalate-to-step3-button"
                                onClick={handleEscalateToSpecialist}
                                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 active:scale-[0.99] transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2563EB]"
                              >
                                <span>
                                  Continuar con especialista · ${activePrice} USD
                                  {isPymeMonthly ? '/mes' : ''}
                                </span>
                                <ArrowRight className="w-4 h-4" aria-hidden="true" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Free-Text Conversational Composer */}
                <form onSubmit={handleComposerSubmit} className="space-y-2.5">
                  <div className="rounded-2xl border border-slate-200 bg-white focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    <label htmlFor="chat-symptom-input" className="sr-only">
                      Escribe aquí qué está pasando con tu equipo
                    </label>
                    <textarea
                      ref={composerRef}
                      id="chat-symptom-input"
                      data-testid="chat-symptom-input"
                      rows={2}
                      maxLength={500}
                      value={composerText}
                      onChange={(e) => setComposerText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (composerText.trim() && !aiLoading) {
                            const text = composerText.trim();
                            setComposerText('');
                            void executeAiTriage(text, draft.category ?? 'Otro');
                          }
                        }
                      }}
                      placeholder="Escribe aquí qué está pasando..."
                      className="w-full bg-transparent px-4 pt-3.5 pb-2 text-sm text-[#0B192C] placeholder:text-slate-500 focus:outline-none resize-none"
                    />
                    <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
                        <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                        <span>No incluyas contraseñas ni códigos de acceso</span>
                      </span>

                      <div className="flex items-center gap-3 ml-auto">
                        <span className="font-mono tabular-nums text-[11px] text-slate-600">
                          {composerText.length}/500
                        </span>
                        <button
                          type="submit"
                          aria-label="Enviar mensaje al asistente IA"
                          disabled={aiLoading || composerText.trim().length === 0}
                          className="w-9 h-9 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-200 disabled:text-slate-500 text-white flex items-center justify-center shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                        >
                          {aiLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <ArrowUp className="w-4 h-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-x-3 gap-y-1 text-center text-[11px] text-slate-500">
                    <span>
                      La IA puede equivocarse. Tú decides qué pasos seguir. Si escalas,
                      verás el precio antes de aceptar.
                    </span>
                    {onOpenTicketLookup && (
                      <>
                        <span className="hidden sm:inline text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <button
                          type="button"
                          onClick={onOpenTicketLookup}
                          className="font-semibold text-[#2563EB] hover:text-[#1D4ED8] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
                        >
                          ¿Ya tienes un ticket RS-XXXX? Retomar sala
                        </button>
                      </>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* STAGE 2: Transparent Fixed-Rate Proposal, +18 Verification & Ticket Creation */}
            {isStage2 && (
              <form
                onSubmit={handleSubmit}
                data-testid="wizard-step-3"
                className="p-5 sm:p-8 space-y-6"
                noValidate
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-[#0B192C]">
                      Revisa tu resumen y tarifa fija antes de abrir tu sala
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                      Sin cobros sorpresa. El especialista recibe tu caso listo para resolverlo más rápido.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChangeDraft({ step: 1 })}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0B192C]"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Volver al chat IA</span>
                  </button>
                </div>

                {/* Technician-Ready Case Summary + Fixed Rate Card */}
                <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-5 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <p className="text-xs font-semibold text-[#2563EB] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>Resumen listo para tu especialista</span>
                      </p>
                      <p className="text-sm font-bold text-[#0B192C]">
                        {draft.category
                          ? formatCategoryForOs(draft.category, currentOs)
                          : 'Soporte técnico remoto'}{' '}
                        · {currentOs}
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {draft.aiTriage?.preDiagnosis ??
                          deriveInitialDiagnosisSummary(
                            getOsCompatibleCategory(draft.category ?? 'Otro', currentOs),
                            currentOs,
                            draft.description
                          )}
                      </p>
                    </div>

                    <div className="md:text-right shrink-0 rounded-xl bg-white border border-slate-200 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {isPymeMonthly ? 'Plan mensual Pyme' : activeTier}
                      </p>
                      <div className="flex items-baseline md:justify-end gap-2 mt-0.5">
                        <span className="font-display tabular-nums text-2xl font-bold text-[#0B192C]">
                          ${activePrice}
                          <span className="text-xs font-sans font-semibold text-slate-600">
                            {isPymeMonthly ? ' USD/mes' : ' USD'}
                          </span>
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                        Pago seguro · consulta términos y política de reembolso
                      </p>
                    </div>
                  </div>

                  {/* Toggle to change Fixed Rate or Switch to Pyme Monthly */}
                  <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-slate-600">
                      {isPymeMonthly
                        ? 'Facturación mensual recurrente según los términos del plan.'
                        : 'Pago único por solicitud. Pago seguro con Stripe, PayPal o G Pay.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTierSwitcher((prev) => !prev)}
                      className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] underline underline-offset-2"
                    >
                      {showTierSwitcher
                        ? 'Ocultar niveles y planes Pyme'
                        : `Cambiar nivel o ver planes Pyme (${businessConfig.pymePlans.map((p) => `$${p.priceUsd}`).join(' / ')})`}
                    </button>
                  </div>

                  {showTierSwitcher && (
                    <div className="pt-2 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {businessConfig.serviceTiers.map((tierOpt) => {
                          const selected =
                            !isPymeMonthly && draft.serviceTier === tierOpt.id;
                          const tierLabel = tierOpt.id.split(' $')[0];
                          return (
                            <button
                              key={tierOpt.id}
                              type="button"
                              onClick={() => handleSelectOneTimeTier(tierOpt.id)}
                              className={`rounded-xl border p-3 text-left transition-all ${
                                selected
                                  ? 'border-[#2563EB] bg-blue-50/70 ring-1 ring-[#2563EB]'
                                  : 'border-slate-200 bg-white hover:border-blue-300'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-[#0B192C]">
                                  {tierLabel}
                                </span>
                                <span className="tabular-nums text-sm font-bold text-[#2563EB]">
                                  ${tierOpt.priceUsd} USD
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                                {tierOpt.summary}
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {businessConfig.pymePlans.map((pyme) => {
                          const selected =
                            isPymeMonthly && draft.serviceTier === pyme.serviceTier;
                          return (
                            <button
                              key={pyme.id}
                              type="button"
                              onClick={() => handleSelectPymeTier(pyme.serviceTier)}
                              className={`rounded-xl border p-3 text-left transition-all ${
                                selected
                                  ? 'border-[#0B192C] bg-[#0B192C] text-white'
                                  : 'border-slate-200 bg-white hover:border-slate-400 text-[#0B192C]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold">{pyme.name}</span>
                                <span className="tabular-nums text-sm font-bold">
                                  ${pyme.priceUsd}/mes
                                </span>
                              </div>
                              <p
                                className={`text-[11px] mt-1 ${
                                  selected ? 'text-slate-300' : 'text-slate-600'
                                }`}
                              >
                                {pyme.devicesLimit} · {pyme.summary}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Editable Client Details + Mandatory +18 Birth Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="client-name"
                      className="block text-xs font-semibold text-[#0B192C] mb-1.5"
                    >
                      Nombre completo *
                    </label>
                    <input
                      id="client-name"
                      type="text"
                      autoComplete="name"
                      value={draft.clientName}
                      onChange={(e) => onChangeDraft({ clientName: e.target.value })}
                      placeholder="Ej. María Fernanda Torres"
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-base sm:text-sm text-[#0B192C] bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                        errors.clientName
                          ? 'border-red-400 focus:border-red-500'
                          : 'border-slate-300 focus:border-[#2563EB]'
                      }`}
                    />
                    {errors.clientName && (
                      <p className="text-xs text-red-600 mt-1">{errors.clientName}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="client-email"
                      className="block text-xs font-semibold text-[#0B192C] mb-1.5"
                    >
                      Correo electrónico *
                    </label>
                    <input
                      id="client-email"
                      type="email"
                      autoComplete="email"
                      value={draft.clientEmail}
                      onChange={(e) => onChangeDraft({ clientEmail: e.target.value })}
                      placeholder="tu@correo.com"
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-base sm:text-sm text-[#0B192C] bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                        errors.clientEmail
                          ? 'border-red-400 focus:border-red-500'
                          : 'border-slate-300 focus:border-[#2563EB]'
                      }`}
                    />
                    {errors.clientEmail && (
                      <p className="text-xs text-red-600 mt-1">{errors.clientEmail}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="client-birth-date"
                      className="block text-xs font-semibold text-[#0B192C] mb-1.5"
                    >
                      Fecha de nacimiento (+18 años) *
                    </label>
                    <input
                      id="client-birth-date"
                      type="date"
                      autoComplete="bday"
                      max={new Date(
                        Date.UTC(
                          new Date().getUTCFullYear() - 18,
                          new Date().getUTCMonth(),
                          new Date().getUTCDate()
                        )
                      )
                        .toISOString()
                        .slice(0, 10)}
                      value={draft.birthDate ?? ''}
                      onChange={(e) => onChangeDraft({ birthDate: e.target.value })}
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-base sm:text-sm text-[#0B192C] bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                        errors.birthDate
                          ? 'border-red-400 focus:border-red-500'
                          : 'border-slate-300 focus:border-[#2563EB]'
                      }`}
                    />
                    {errors.birthDate && (
                      <p className="text-xs text-red-600 mt-1">{errors.birthDate}</p>
                    )}
                  </div>
                </div>

                {/* Mandatory Unchecked-by-Default Legal & Marketing Checkboxes (ADR-05) */}
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <input
                      id="wizard-terms-accepted"
                      type="checkbox"
                      checked={Boolean(draft.termsAccepted)}
                      onChange={(e) =>
                        onChangeDraft({ termsAccepted: e.target.checked })
                      }
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 leading-relaxed">
                      <label htmlFor="wizard-terms-accepted" className="cursor-pointer">
                        Declaro ser mayor de 18 años y acepto los{' '}
                      </label>
                      <button
                        type="button"
                        onClick={() => onOpenLegalDoc?.('terms')}
                        className="font-semibold text-[#2563EB] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
                      >
                        Términos de Servicio
                      </button>
                      , la{' '}
                      <button
                        type="button"
                        onClick={() => onOpenLegalDoc?.('privacy')}
                        className="font-semibold text-[#2563EB] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
                      >
                        Política de Privacidad
                      </button>
                      , el{' '}
                      <button
                        type="button"
                        onClick={() => onOpenLegalDoc?.('nda')}
                        data-testid="wizard-legal-nda-link"
                        className="font-semibold text-[#2563EB] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
                      >
                        Acuerdo de Confidencialidad (NDA)
                      </button>{' '}
                      y la{' '}
                      <button
                        type="button"
                        onClick={() => onOpenLegalDoc?.('refunds')}
                        className="font-semibold text-[#2563EB] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
                      >
                        Política de Reembolsos y Garantía
                      </button>
                      . *
                    </span>
                  </div>
                  {errors.termsAccepted && (
                    <p className="text-xs text-red-600 pl-7">{errors.termsAccepted}</p>
                  )}

                  <div className="flex items-start gap-3">
                    <input
                      id="wizard-marketing-optin"
                      type="checkbox"
                      checked={Boolean(draft.marketingOptIn)}
                      onChange={(e) =>
                        onChangeDraft({ marketingOptIn: e.target.checked })
                      }
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                    />
                    <label
                      htmlFor="wizard-marketing-optin"
                      className="text-xs text-slate-600 leading-relaxed cursor-pointer"
                    >
                      Deseo recibir consejos preventivos de seguridad y promociones de
                      Remote Support 365 por correo (opcional).
                    </label>
                  </div>
                </div>

                {/* Error Summary Above Submit CTA */}
                {(activeErrorList.length > 0 || persistenceError) && (
                  <div
                    role="alert"
                    className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-800 space-y-1"
                  >
                    <p className="font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>Revisa los siguientes puntos antes de continuar:</span>
                    </p>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {activeErrorList.map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                      {persistenceError && <li>{persistenceError}</li>}
                    </ul>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-[#10B981] shrink-0" aria-hidden="true" />
                    <span>
                      Acceso remoto RustDesk bajo demanda y revocable en 1 clic.
                    </span>
                  </p>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-sm font-semibold shadow-lg shadow-blue-600/20 active:scale-[0.99] transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2563EB]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        <span>Generando sala segura...</span>
                      </>
                    ) : (
                      <>
                        <span>Generar Ticket y Abrir Sala Segura</span>
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
        </div>
      </div>
    </section>
  );
}
