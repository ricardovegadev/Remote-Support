import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  Cpu,
  Laptop,
  Loader2,
  Mail,
  Printer,
  ShieldCheck,
  Sparkles,
  Wifi,
  Wrench,
} from 'lucide-react';
import { runAiReceptionistTriage } from '../services/aiService';
import type {
  AiAgentConfig,
  IssueCategory,
  OperatingSystem,
  ServiceTier,
  WizardDraft,
} from '../types/support';
import {
  CATEGORY_OPTIONS,
  deriveInitialDiagnosisSummary,
  FIXED_SERVICE_PRICE_USD,
  getServiceTierPriceUsd,
  SERVICE_TIER_OPTIONS,
  validateStep1,
  validateStep2,
  validateStep3,
} from '../utils/ticketLogic';

interface DiagnosticWizardProps {
  draft: WizardDraft;
  errors: Record<string, string>;
  aiAgents?: AiAgentConfig[];
  onChangeDraft: (patch: Partial<WizardDraft>) => void;
  onSetErrors: (errors: Record<string, string>) => void;
  onSubmitTicket: () => void;
}

const CATEGORY_ICON_MAP: Record<IssueCategory, typeof Printer> = {
  Impresoras: Printer,
  'Correo/Office': Mail,
  'Sistema Operativo/Lentitud': Cpu,
  'Redes/Wi-Fi': Wifi,
  Otro: Wrench,
};

const QUICK_ANSWERS = ['Sí, ocurre siempre', 'Solo a veces', 'No estoy seguro'];

export function DiagnosticWizard({
  draft,
  errors,
  aiAgents = [],
  onChangeDraft,
  onSetErrors,
  onSubmitTicket,
}: DiagnosticWizardProps) {
  const [aiLoading, setAiLoading] = useState(false);

  const receptionistAgent = aiAgents.find(
    (a) => a.agent_key === 'ai_receptionist'
  );
  const receptionistEnabled = receptionistAgent ? receptionistAgent.is_enabled : true;
  const escalateCriticalServers =
    receptionistAgent?.governance_rules.find((r) => r.id === 'r-rec-2')
      ?.enabled ?? true;

  const isCriticalServerCase =
    escalateCriticalServers &&
    /\b(servidor|server|active directory|dominio|base de datos|sql)\b/i.test(
      draft.description
    );

  const handleSelectCategory = (category: IssueCategory) => {
    onChangeDraft({ category, aiTriage: null });
    if (errors.category) {
      onSetErrors({});
    }
  };

  const handleNextFromStep1 = () => {
    const result = validateStep1(draft);
    if (!result.valid) {
      onSetErrors(result.errors);
      return;
    }
    onSetErrors({});
    onChangeDraft({ step: 2 });
  };

  const handleRunAiReceptionist = async () => {
    if (!receptionistEnabled) return;
    const result = validateStep2(draft);
    if (!result.valid || !draft.category || !draft.operatingSystem) {
      onSetErrors(result.errors);
      return;
    }
    onSetErrors({});
    setAiLoading(true);
    try {
      const existingAnswers = draft.aiTriage?.selectedAnswers
        ? Object.entries(draft.aiTriage.selectedAnswers).map(([idx, answer]) => ({
            question:
              draft.aiTriage?.followUpQuestions[Number(idx)] ?? `Pregunta ${idx}`,
            answer,
          }))
        : [];
      const triage = await runAiReceptionistTriage({
        category: draft.category,
        osType: draft.operatingSystem,
        description: draft.description,
        followUpAnswers: existingAnswers,
      });
      const resolvedTier: ServiceTier = isCriticalServerCase
        ? 'Avanzado $55'
        : draft.serviceTier !== 'Express $25'
        ? draft.serviceTier
        : triage.suggestedTier;
      onChangeDraft({
        aiTriage: {
          ...triage,
          suggestedTier: resolvedTier,
          confidenceNote: isCriticalServerCase
            ? 'Caso crítico de servidor detectado: escalamiento prioritario a especialista humano activado.'
            : triage.confidenceNote,
          selectedAnswers: draft.aiTriage?.selectedAnswers ?? {},
        },
        serviceTier: resolvedTier,
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleNextFromStep2 = async () => {
    const result = validateStep2(draft);
    if (!result.valid || !draft.category || !draft.operatingSystem) {
      onSetErrors(result.errors);
      return;
    }
    onSetErrors({});

    if (!receptionistEnabled) {
      const manualSummary = deriveInitialDiagnosisSummary(
        draft.category,
        draft.operatingSystem,
        draft.description
      );
      onChangeDraft({
        step: 3,
        aiTriage: draft.aiTriage ?? {
          followUpQuestions: [],
          preDiagnosis: manualSummary,
          suggestedTier: draft.serviceTier,
          estimatedMinutes: 30,
          confidenceNote:
            'AI Receptionist pausado por gobernanza: triaje manual directo enviado al técnico.',
          source: 'fallback',
          selectedAnswers: {},
        },
      });
      return;
    }

    if (!draft.aiTriage) {
      setAiLoading(true);
      try {
        const triage = await runAiReceptionistTriage({
          category: draft.category,
          osType: draft.operatingSystem,
          description: draft.description,
        });
        const resolvedTier: ServiceTier = isCriticalServerCase
          ? 'Avanzado $55'
          : draft.serviceTier !== 'Express $25'
          ? draft.serviceTier
          : triage.suggestedTier;
        onChangeDraft({
          step: 3,
          aiTriage: {
            ...triage,
            suggestedTier: resolvedTier,
            confidenceNote: isCriticalServerCase
              ? 'Caso crítico de servidor detectado: escalamiento prioritario a especialista humano activado.'
              : triage.confidenceNote,
            selectedAnswers: {},
          },
          serviceTier: resolvedTier,
        });
        return;
      } finally {
        setAiLoading(false);
      }
    }

    onChangeDraft({ step: 3 });
  };

  const handleSelectFollowUpAnswer = (questionIndex: number, answer: string) => {
    if (!draft.aiTriage) return;
    onChangeDraft({
      aiTriage: {
        ...draft.aiTriage,
        selectedAnswers: {
          ...(draft.aiTriage.selectedAnswers ?? {}),
          [questionIndex]: answer,
        },
      },
    });
  };

  const handleSubmitStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateStep3(draft);
    if (!result.valid) {
      onSetErrors(result.errors);
      return;
    }
    onSetErrors({});
    onSubmitTicket();
  };

  const selectedTierPrice = getServiceTierPriceUsd(draft.serviceTier);

  const stepsMeta = [
    { num: 1 as const, title: 'Categoría' },
    { num: 2 as const, title: 'AI Receptionist' },
    { num: 3 as const, title: 'Tarifa y Ticket' },
  ];

  return (
    <section
      id="diagnostico"
      aria-labelledby="wizard-heading"
      className="scroll-mt-20 py-14 sm:py-16 bg-[#F8FAFC] border-b border-slate-200"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-xs font-semibold text-[#2563EB] tracking-wide">
              Triaje Inteligente en 3 Pasos · AI Receptionist
            </p>
            <h2
              id="wizard-heading"
              className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B192C] mt-1"
            >
              Diagnóstico guiado y emisión inmediata de ticket
            </h2>
          </div>

          <ol
            aria-label="Progreso del diagnóstico"
            className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm"
          >
            {stepsMeta.map((stepItem) => {
              const isActive = draft.step === stepItem.num;
              const isCompleted = draft.step > stepItem.num;
              return (
                <li
                  key={stepItem.num}
                  aria-current={isActive ? 'step' : undefined}
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <span
                    className={`w-6 h-6 rounded-md font-mono tabular-nums text-xs font-semibold flex items-center justify-center transition-colors ${
                      isCompleted
                        ? 'bg-[#10B981] text-white'
                        : isActive
                        ? 'bg-[#2563EB] text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      stepItem.num
                    )}
                  </span>
                  <span
                    className={
                      isActive
                        ? 'font-semibold text-[#0B192C]'
                        : isCompleted
                        ? 'font-medium text-emerald-700'
                        : 'text-slate-500'
                    }
                  >
                    {stepItem.title}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          {draft.step === 1 && (
            <div data-testid="wizard-step-1">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[#0B192C]">
                  Paso 1 · Selecciona la categoría y sistema operativo
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Elige el área afectada para activar el protocolo técnico y pre-asignar al
                  especialista adecuado.
                </p>
              </div>

              <div
                role="radiogroup"
                aria-label="Categoría del problema técnico"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {CATEGORY_OPTIONS.map((option) => {
                  const Icon = CATEGORY_ICON_MAP[option.id];
                  const selected = draft.category === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => handleSelectCategory(option.id)}
                      className={`text-left p-4 rounded-lg border transition-colors duration-150 flex flex-col justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                        selected
                          ? 'border-[#2563EB] bg-blue-50/40 ring-1 ring-[#2563EB]'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            selected
                              ? 'bg-[#2563EB] text-white'
                              : 'bg-slate-100 text-[#0B192C]'
                          }`}
                        >
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        </span>
                        <span className="text-xs font-mono tabular-nums text-slate-500">
                          {option.typicalResolutionTime}
                        </span>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-[#0B192C]">
                          {option.label}
                        </p>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {option.summary}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {errors.category && (
                <p role="alert" className="mt-4 text-sm font-medium text-red-700">
                  {errors.category}
                </p>
              )}

              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-xs text-slate-500">
                  {draft.category
                    ? `Categoría seleccionada: ${draft.category} · Asistencia puntual desde $${FIXED_SERVICE_PRICE_USD} USD`
                    : `Asistencia puntual desde $${FIXED_SERVICE_PRICE_USD} USD por incidente resuelto`}
                </p>
                <button
                  type="button"
                  onClick={handleNextFromStep1}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0B192C] hover:bg-[#0F172A] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  <span>Continuar a AI Receptionist</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {draft.step === 2 && (
            <div data-testid="wizard-step-2">
              <div className="mb-6">
                <p className="text-xs text-slate-500 mb-1">
                  Categoría: {draft.category}
                </p>
                <h3 className="text-lg font-semibold text-[#0B192C]">
                  Paso 2 · Sistema operativo, descripción y triaje con AI Receptionist
                </h3>
              </div>

              <div className="space-y-6">
                <div>
                  <span
                    id="os-label"
                    className="block text-sm font-semibold text-[#0B192C] mb-2.5"
                  >
                    Sistema Operativo del equipo a reparar
                  </span>
                  <div
                    role="radiogroup"
                    aria-labelledby="os-label"
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    {(['Windows', 'Mac'] as OperatingSystem[]).map((os) => {
                      const selected = draft.operatingSystem === os;
                      return (
                        <button
                          key={os}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => {
                            onChangeDraft({ operatingSystem: os });
                            if (errors.operatingSystem) {
                              const nextErrors = { ...errors };
                              delete nextErrors.operatingSystem;
                              onSetErrors(nextErrors);
                            }
                          }}
                          className={`flex items-center justify-between p-4 rounded-lg border text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                            selected
                              ? 'border-[#2563EB] bg-blue-50/40 ring-1 ring-[#2563EB]'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Laptop
                              className={`w-5 h-5 ${
                                selected ? 'text-[#2563EB]' : 'text-slate-600'
                              }`}
                              aria-hidden="true"
                            />
                            <div>
                              <p className="text-sm font-semibold text-[#0B192C]">
                                {os === 'Windows' ? 'Windows (10 / 11)' : 'Mac (macOS)'}
                              </p>
                              <p className="text-xs text-slate-500">
                                {os === 'Windows'
                                  ? 'Agente temporal RemoteSupport365-Quick.exe'
                                  : 'Agente temporal RemoteSupport365-Quick.dmg'}
                              </p>
                            </div>
                          </div>
                          {selected && (
                            <Check
                              className="w-4 h-4 text-[#2563EB] shrink-0"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {errors.operatingSystem && (
                    <p role="alert" className="mt-2 text-sm font-medium text-red-700">
                      {errors.operatingSystem}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="problem-description"
                      className="block text-sm font-semibold text-[#0B192C]"
                    >
                      Describe el síntoma principal
                    </label>
                    <span className="text-xs font-mono tabular-nums text-slate-500">
                      {draft.description.trim().length} caracteres
                    </span>
                  </div>
                  <textarea
                    id="problem-description"
                    rows={3}
                    value={draft.description}
                    onChange={(e) => {
                      onChangeDraft({ description: e.target.value });
                      if (errors.description && e.target.value.trim().length >= 10) {
                        const nextErrors = { ...errors };
                        delete nextErrors.description;
                        onSetErrors(nextErrors);
                      }
                    }}
                    placeholder="Ejemplo: Desde ayer Outlook no sincroniza correos entrantes y pide contraseña en bucle..."
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
                  />
                  {errors.description && (
                    <p role="alert" className="mt-2 text-sm font-medium text-red-700">
                      {errors.description}
                    </p>
                  )}
                </div>

                {/* AI Receptionist Interactive Panel */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-[#0B192C] text-[#10B981] flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[#0B192C]">
                          AI Receptionist · Pre-Diagnóstico Técnico
                        </p>
                        <p className="text-xs text-slate-500">
                          Analiza tu falla y genera preguntas clave antes de conectar al
                          técnico.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={aiLoading || !receptionistEnabled}
                      onClick={() => void handleRunAiReceptionist()}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-500 disabled:bg-slate-400 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      {aiLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>
                        {!receptionistEnabled
                          ? 'AI Receptionist pausado'
                          : aiLoading
                          ? 'Analizando falla...'
                          : draft.aiTriage
                          ? 'Recalcular Diagnóstico IA'
                          : 'Analizar con AI Receptionist'}
                      </span>
                    </button>
                  </div>

                  {!receptionistEnabled && (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Gobernanza activa: AI Receptionist está pausado por el administrador. Puedes continuar normalmente con triaje directo al técnico.
                    </p>
                  )}

                  {isCriticalServerCase && receptionistEnabled && (
                    <p className="text-xs text-blue-900 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      Regla de escalamiento activa: Caso crítico de servidor detectado; se prioriza atención por especialista humano (Avanzado $55).
                    </p>
                  )}

                  {draft.aiTriage && (
                    <div
                      data-testid="ai-receptionist-result"
                      className="space-y-4 pt-3 border-t border-slate-200"
                    >
                      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-[#0B192C]">
                            Pre-diagnóstico generado
                          </span>
                          <span className="font-mono tabular-nums text-emerald-700 font-medium">
                            Sugerido: {draft.aiTriage.suggestedTier} · ~
                            {draft.aiTriage.estimatedMinutes} min
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {draft.aiTriage.preDiagnosis}
                        </p>
                      </div>

                      <div className="space-y-2.5">
                        <p className="text-xs font-semibold text-[#0B192C]">
                          Preguntas rápidas para afinar la intervención (opcional):
                        </p>
                        {draft.aiTriage.followUpQuestions.map((question, idx) => {
                          const currentAnswer =
                            draft.aiTriage?.selectedAnswers?.[idx] ?? '';
                          return (
                            <div
                              key={idx}
                              className="bg-white border border-slate-200 rounded-lg p-3 space-y-2"
                            >
                              <p className="text-xs font-medium text-slate-800">
                                {idx + 1}. {question}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {QUICK_ANSWERS.map((ans) => {
                                  const active = currentAnswer === ans;
                                  return (
                                    <button
                                      key={ans}
                                      type="button"
                                      onClick={() =>
                                        handleSelectFollowUpAnswer(idx, ans)
                                      }
                                      className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors ${
                                        active
                                          ? 'bg-[#0B192C] text-white border-[#0B192C]'
                                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      {ans}
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
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => {
                    onSetErrors({});
                    onChangeDraft({ step: 1 });
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:text-[#0B192C] border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  <span>Volver</span>
                </button>

                <button
                  type="button"
                  disabled={aiLoading}
                  onClick={() => void handleNextFromStep2()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0B192C] hover:bg-[#0F172A] disabled:bg-slate-400 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  <span>
                    {aiLoading ? 'Preparando Pre-Diagnóstico...' : 'Confirmar Tarifa y Datos'}
                  </span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {draft.step === 3 && (
            <form onSubmit={handleSubmitStep3} noValidate data-testid="wizard-step-3">
              <div className="mb-6">
                <p className="text-xs text-slate-500 mb-1">
                  {draft.category} · {draft.operatingSystem}
                </p>
                <h3 className="text-lg font-semibold text-[#0B192C]">
                  Paso 3 · Confirmación de tarifa y emisión de Ticket
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-7 space-y-5">
                  <div>
                    <span
                      id="service-tier-label"
                      className="block text-sm font-semibold text-[#0B192C] mb-2"
                    >
                      Nivel de asistencia
                    </span>
                    <div
                      role="radiogroup"
                      aria-labelledby="service-tier-label"
                      className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
                    >
                      {SERVICE_TIER_OPTIONS.map((tier) => {
                        const selected = draft.serviceTier === tier.id;
                        return (
                          <button
                            key={tier.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() =>
                              onChangeDraft({ serviceTier: tier.id as ServiceTier })
                            }
                            className={`p-3 rounded-lg border text-left transition-colors ${
                              selected
                                ? 'border-[#2563EB] bg-blue-50/40 ring-1 ring-[#2563EB]'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <p className="text-xs font-semibold text-[#0B192C]">
                              {tier.id}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                              {tier.summary}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="client-name"
                      className="block text-sm font-semibold text-[#0B192C] mb-1.5"
                    >
                      Nombre completo
                    </label>
                    <input
                      id="client-name"
                      type="text"
                      required
                      value={draft.clientName}
                      onChange={(e) => {
                        onChangeDraft({ clientName: e.target.value });
                        if (errors.clientName) {
                          const nextErrors = { ...errors };
                          delete nextErrors.clientName;
                          onSetErrors(nextErrors);
                        }
                      }}
                      placeholder="Ej. Andrea Morales"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
                    />
                    {errors.clientName && (
                      <p role="alert" className="mt-1.5 text-sm font-medium text-red-700">
                        {errors.clientName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="client-email"
                      className="block text-sm font-semibold text-[#0B192C] mb-1.5"
                    >
                      Correo electrónico
                    </label>
                    <input
                      id="client-email"
                      type="email"
                      required
                      value={draft.clientEmail}
                      onChange={(e) => {
                        onChangeDraft({ clientEmail: e.target.value });
                        if (errors.clientEmail) {
                          const nextErrors = { ...errors };
                          delete nextErrors.clientEmail;
                          onSetErrors(nextErrors);
                        }
                      }}
                      placeholder="andrea@empresa.com"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
                    />
                    {errors.clientEmail && (
                      <p role="alert" className="mt-1.5 text-sm font-medium text-red-700">
                        {errors.clientEmail}
                      </p>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
                  <div className="flex items-baseline justify-between border-b border-slate-200 pb-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Tarifa única transparente
                      </p>
                      <p className="text-sm font-semibold text-[#0B192C] mt-0.5">
                        {draft.serviceTier}
                      </p>
                    </div>
                    <p className="font-mono tabular-nums text-2xl font-bold text-[#0B192C]">
                      ${selectedTierPrice} USD
                    </p>
                  </div>

                  <dl className="space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Categoría</dt>
                      <dd className="font-medium text-slate-900 text-right">
                        {draft.category}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Sistema</dt>
                      <dd className="font-medium text-slate-900 text-right">
                        {draft.operatingSystem}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Pre-diagnóstico IA</dt>
                      <dd className="font-medium text-emerald-700 text-right">
                        {draft.aiTriage ? 'Adjunto al ticket' : 'Automático'}
                      </dd>
                    </div>
                  </dl>

                  {draft.aiTriage && (
                    <div className="p-3 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                      <strong className="text-[#0B192C]">Resumen AI Receptionist:</strong>{' '}
                      {draft.aiTriage.preDiagnosis}
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-200 flex items-start gap-2 text-xs text-slate-600">
                    <ShieldCheck
                      className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span>
                      Al confirmar pasarás directo a tu Sala de Conexión{' '}
                      <span className="font-mono">/sesion/RS-XXXX</span> con trazabilidad
                      de técnico y descarga del agente.
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => {
                    onSetErrors({});
                    onChangeDraft({ step: 2 });
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:text-[#0B192C] border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  <span>Volver</span>
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#10B981] hover:bg-emerald-500 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                >
                  <span>Generar Ticket y Sala de Conexión</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
