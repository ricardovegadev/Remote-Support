import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Briefcase,
  Check,
  CheckCircle2,
  Clock,
  FileSignature,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { submitTechnicianApplicationToServer } from '../services/technicianApplicationService';
import type {
  TechnicianApplication,
  TechnicianSpecialty,
  WorkModality,
} from '../types/support';
import {
  ASSESSMENT_DURATION_SECONDS,
  evaluateTechnicianAssessment,
  TECHNICIAN_ASSESSMENT_QUESTIONS,
} from '../utils/techEvaluation';
import {
  ADULT_RESTRICTION_ERROR,
  calculateAgeFromBirthDate,
  generateUuid,
  isValidEmail,
  NDA_TECH_VERSION,
  TECHNICIAN_COMMISSION_TIERS,
} from '../utils/ticketLogic';
import type { LegalDocTab } from './LegalDocsModal';

interface TechnicianApplyViewProps {
  onReturnHome: () => void;
  onOpenLegalDoc: (tab: LegalDocTab) => void;
}

type ApplyStep = 1 | 2 | 3 | 4;

const SPECIALTY_OPTIONS: TechnicianSpecialty[] = [
  'Windows & BSOD',
  'Microsoft 365 & Outlook',
  'Impresoras',
  'Redes & VPN',
  'Seguridad & Malware',
  'Recuperación de Datos',
];

const STEPS: Array<{ step: ApplyStep; label: string; shortLabel: string }> = [
  { step: 1, label: 'Beneficios y Comisiones', shortLabel: 'Beneficios' },
  { step: 2, label: 'Perfil Técnico (+18)', shortLabel: 'Perfil' },
  { step: 3, label: 'Firma NDA Interno', shortLabel: 'NDA Interno' },
  { step: 4, label: 'Evaluación (15 min)', shortLabel: 'Evaluación' },
];

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getAdultMaxBirthDate(): string {
  const today = new Date();
  return new Date(
    Date.UTC(
      today.getUTCFullYear() - 18,
      today.getUTCMonth(),
      today.getUTCDate()
    )
  )
    .toISOString()
    .slice(0, 10);
}

export function TechnicianApplyView({
  onReturnHome,
  onOpenLegalDoc,
}: TechnicianApplyViewProps) {
  const [step, setStep] = useState<ApplyStep>(1);

  // Step 2: Profile fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Guayaquil';
    } catch {
      return 'America/Guayaquil';
    }
  });
  const [birthDate, setBirthDate] = useState('');
  const [modality, setModality] = useState<WorkModality>('half_time');
  const [specialties, setSpecialties] = useState<TechnicianSpecialty[]>([
    'Windows & BSOD',
  ]);
  const [certifications, setCertifications] = useState('');
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  // Step 3: Internal NDA
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [ndaSignedName, setNdaSignedName] = useState('');
  const [ndaAcceptedAt, setNdaAcceptedAt] = useState<string | null>(null);
  const [ndaError, setNdaError] = useState<string | null>(null);

  // Step 4: Timed assessment
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(ASSESSMENT_DURATION_SECONDS);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [submittedApplication, setSubmittedApplication] =
    useState<TechnicianApplication | null>(null);
  const [assessmentNotice, setAssessmentNotice] = useState<string | null>(null);

  const hasSubmittedRef = useRef(false);
  const answersRef = useRef(answers);
  const secondsLeftRef = useRef(secondsLeft);

  answersRef.current = answers;
  secondsLeftRef.current = secondsLeft;

  const maxBirthDate = useMemo(() => getAdultMaxBirthDate(), []);

  const answeredCount = useMemo(
    () =>
      TECHNICIAN_ASSESSMENT_QUESTIONS.filter(
        (q) => typeof answers[q.id] === 'string' && answers[q.id].length > 0
      ).length,
    [answers]
  );

  const toggleSpecialty = (item: TechnicianSpecialty) => {
    setSpecialties((prev) =>
      prev.includes(item) ? prev.filter((s) => s !== item) : [...prev, item]
    );
    setProfileErrors((prev) => {
      if (!prev.specialties) return prev;
      const next = { ...prev };
      delete next.specialties;
      return next;
    });
  };

  const handleContinueToNda = () => {
    const errors: Record<string, string> = {};
    if (fullName.trim().length < 3) {
      errors.fullName = 'Ingresa tu nombre y apellido completos.';
    }
    if (!isValidEmail(email)) {
      errors.email =
        'Ingresa un correo electrónico válido (donde recibirás el resultado).';
    }
    if (country.trim().length < 2) {
      errors.country = 'Indica tu país de residencia.';
    }
    if (timezone.trim().length < 2) {
      errors.timezone = 'Indica tu zona horaria de operación.';
    }
    const age = calculateAgeFromBirthDate(birthDate);
    if (age === null) {
      errors.birthDate =
        'Ingresa una fecha de nacimiento válida para verificar mayoría de edad (+18).';
    } else if (age < 18) {
      errors.birthDate = ADULT_RESTRICTION_ERROR;
    }
    if (specialties.length === 0) {
      errors.specialties = 'Selecciona al menos una especialidad técnica.';
    }

    setProfileErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartAssessment = () => {
    if (!ndaAccepted) {
      setNdaError(
        `Debes leer y aceptar el Acuerdo de Confidencialidad Interno (${NDA_TECH_VERSION}) antes de iniciar la evaluación.`
      );
      return;
    }
    const cleanSigned = ndaSignedName.trim();
    if (cleanSigned.length < 3) {
      setNdaError(
        'Escribe tu nombre completo como firma nominal obligatoria del NDA interno.'
      );
      return;
    }
    const normalizedApplicant = fullName.trim().toLowerCase().replace(/\s+/g, ' ');
    const normalizedSigned = cleanSigned.toLowerCase().replace(/\s+/g, ' ');
    if (normalizedApplicant.length >= 3 && normalizedSigned !== normalizedApplicant) {
      setNdaError(
        `La firma nominal debe coincidir con tu nombre registrado (${fullName.trim()}).`
      );
      return;
    }

    setNdaError(null);
    setNdaAcceptedAt(new Date().toISOString());
    hasSubmittedRef.current = false;
    setSecondsLeft(ASSESSMENT_DURATION_SECONDS);
    setAutoSubmitted(false);
    setStep(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const finalizeAssessment = useCallback(
    async (triggeredByTimeout: boolean) => {
      if (hasSubmittedRef.current) return;
      hasSubmittedRef.current = true;
      setAssessmentNotice(null);

      const evaluation = evaluateTechnicianAssessment(answersRef.current);
      const elapsedSeconds = Math.min(
        ASSESSMENT_DURATION_SECONDS,
        Math.max(1, ASSESSMENT_DURATION_SECONDS - secondsLeftRef.current)
      );
      const nowIso = new Date().toISOString();

      const application: TechnicianApplication = {
        id: generateUuid(),
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        country: country.trim(),
        timezone: timezone.trim(),
        birth_date: birthDate,
        is_adult_verified: true,
        modality,
        specialties,
        certifications: certifications.trim(),
        nda_accepted: true,
        nda_version: NDA_TECH_VERSION,
        nda_signed_name: ndaSignedName.trim(),
        nda_accepted_at: ndaAcceptedAt ?? nowIso,
        technical_score: evaluation.technicalScore,
        attitude_score: evaluation.attitudeScore,
        total_score: evaluation.totalScore,
        recommendation: evaluation.recommendation,
        elapsed_seconds: elapsedSeconds,
        status: 'pending_review',
        created_at: nowIso,
      };

      const result = await submitTechnicianApplicationToServer(
        application,
        answersRef.current
      );
      if (!result.ok) {
        hasSubmittedRef.current = false;
        setAssessmentNotice(
          result.error ||
            'No se pudo enviar tu postulación al servidor. Intenta nuevamente.'
        );
        return;
      }

      setAutoSubmitted(triggeredByTimeout);
      setSubmittedApplication(result.application);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [
      birthDate,
      certifications,
      country,
      email,
      fullName,
      modality,
      ndaAcceptedAt,
      ndaSignedName,
      specialties,
      timezone,
    ]
  );

  // Countdown timer active only during Step 4 before submission
  useEffect(() => {
    if (step !== 4 || submittedApplication !== null) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [step, submittedApplication]);

  // React to countdown milestones (2-minute warning and auto-submit at 00:00)
  useEffect(() => {
    if (step !== 4 || submittedApplication !== null) return;

    if (secondsLeft === 120) {
      setAssessmentNotice(
        'Quedan 2 minutos para finalizar la evaluación. Tus respuestas marcadas se enviarán automáticamente al llegar a 00:00.'
      );
    } else if (secondsLeft === 0) {
      finalizeAssessment(true);
    }
  }, [step, submittedApplication, secondsLeft, finalizeAssessment]);

  const timerTone =
    secondsLeft <= 60
      ? 'bg-red-50 border-red-200 text-red-700'
      : secondsLeft <= 180
      ? 'bg-amber-50 border-amber-200 text-amber-900'
      : 'bg-blue-50 border-blue-200 text-[#1D4ED8]';

  return (
    <section
      data-testid="technician-apply-view"
      className="py-8 sm:py-12 bg-[#F8FAFC] min-h-[calc(100vh-12rem)]"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onReturnHome}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-[#0B1528] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-lg px-2 py-1"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Volver al inicio</span>
          </button>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-mono text-slate-600 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
            <span>/postular · Red de Técnicos</span>
          </span>
        </div>

        {/* 4-Step Progress Stepper */}
        {!submittedApplication && (
          <nav aria-label="Progreso de postulación">
            <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STEPS.map((item) => {
                const isActive = step === item.step;
                const isDone = step > item.step;
                return (
                  <li
                    key={item.step}
                    aria-current={isActive ? 'step' : undefined}
                    className={`rounded-xl px-3 py-2.5 border text-xs flex items-center gap-2.5 transition-colors ${
                      isActive
                        ? 'bg-[#0B192C] text-white border-[#0B192C] shadow-sm'
                        : isDone
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-bold shrink-0 ${
                        isActive
                          ? 'bg-[#2563EB] text-white'
                          : isDone
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isDone ? (
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        item.step
                      )}
                    </span>
                    <span className="font-semibold truncate">
                      <span className="hidden sm:inline">{item.label}</span>
                      <span className="sm:hidden">{item.shortLabel}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        {/* STEP 1: Value proposition & Commission Tiers (65% / 75% / 80% / 85%) */}
        {step === 1 && !submittedApplication && (
          <div className="space-y-6 animate-fade-up">
            <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-slate-800 shadow-xl space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-[#10B981]" aria-hidden="true" />
                <span>Red de Especialistas Verificados · Modelo Bajo Demanda</span>
              </div>

              <div className="space-y-2.5 max-w-3xl">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
                  Trabaja como Técnico en Remote Support 365
                </h1>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Conéctate bajo demanda estilo Uber en modalidad{' '}
                  <strong className="text-white">Half-time</strong> o{' '}
                  <strong className="text-white">Full-time</strong>, resuelve incidencias
                  reales en Windows, Microsoft 365, redes o impresoras y escala tu
                  participación mensual del <strong className="text-emerald-300">65 % al 85 %</strong>{' '}
                  según tu volumen de casos resueltos.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-4 space-y-1">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300">
                    <Briefcase className="w-4 h-4 text-[#10B981]" aria-hidden="true" />
                    <span>Modalidad Flexible</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Elige Half-time (15–20 h/sem) o Full-time (35–40 h/sem) con asignación
                    inteligente por especialidad.
                  </p>
                </div>
                <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-4 space-y-1">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-300">
                    <Award className="w-4 h-4 text-[#60A5FA]" aria-hidden="true" />
                    <span>Comisión Progresiva</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    A más incidencias resueltas en el mes calendario, mayor es tu nivel y
                    porcentaje de ganancia.
                  </p>
                </div>
                <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-4 space-y-1">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300">
                    <Lock className="w-4 h-4 text-[#10B981]" aria-hidden="true" />
                    <span>Estándar NDA y Seguridad</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Todos los especialistas aprueban evaluación técnica + actitud y firman el{' '}
                    <span className="font-mono">{NDA_TECH_VERSION}</span>.
                  </p>
                </div>
              </div>
            </div>

            {/* Commission Tiers Table / Grid */}
            <div
              data-testid="commission-tiers-grid"
              className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-6 sm:p-8 space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-emerald-700 tracking-wide">
                    Esquema transparente de compensación mensual
                  </p>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#0B192C] mt-0.5">
                    Tramos de comisión por volumen resuelto (65 % – 85 %)
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-[#1D4ED8] bg-blue-50 border border-blue-200 px-3 py-1 rounded-full self-start sm:self-auto">
                  4 niveles mensuales
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {TECHNICIAN_COMMISSION_TIERS.map((tier) => {
                  const isElite = tier.id === 'elite';
                  return (
                    <div
                      key={tier.id}
                      data-testid={`commission-tier-${tier.id}`}
                      className={`rounded-2xl p-5 border flex flex-col justify-between gap-3 ${
                        isElite
                          ? 'bg-[#0B192C] text-white border-[#2563EB] shadow-md'
                          : 'bg-[#F8FAFC] text-[#0B192C] border-slate-200'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs font-bold uppercase tracking-wider ${
                              isElite ? 'text-emerald-300' : 'text-slate-600'
                            }`}
                          >
                            {tier.label}
                          </span>
                          {isElite && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[10px] font-semibold text-emerald-300">
                              Máximo nivel
                            </span>
                          )}
                        </div>
                        <p className="text-3xl font-extrabold font-mono tabular-nums">
                          {tier.commissionPercent}%
                        </p>
                        <p
                          className={`text-xs font-mono font-semibold ${
                            isElite ? 'text-blue-200' : 'text-[#1D4ED8]'
                          }`}
                        >
                          {tier.rangeLabel}
                        </p>
                      </div>
                      <p
                        className={`text-xs leading-relaxed ${
                          isElite ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        {tier.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3.5 leading-relaxed">
                <strong>Nota de transparencia:</strong> El porcentaje mensual corresponde al
                ingreso neto de cada incidencia resuelta tras descontar la comisión de la
                pasarela de pago (Stripe / PayPal). Requisitos obligatorios: ser mayor de 18
                años (+18), firmar el NDA interno (<span className="font-mono">{NDA_TECH_VERSION}</span>) y completar la evaluación cronometrada de 15 minutos.
              </p>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onOpenLegalDoc('nda')}
                  className="text-xs font-semibold text-[#2563EB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
                >
                  Revisar Acuerdo de Confidencialidad ({NDA_TECH_VERSION})
                </button>

                <button
                  type="button"
                  data-testid="tech-apply-start-btn"
                  onClick={() => {
                    setStep(2);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold shadow-md shadow-blue-600/20 active:scale-[0.99] transition-all"
                >
                  <span>Comenzar postulación</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Applicant Profile (+18, modality, specialties) */}
        {step === 2 && !submittedApplication && (
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-6 sm:p-8 space-y-6 animate-fade-up">
            <div>
              <p className="text-xs font-semibold text-emerald-700 tracking-wide">
                Paso 2 de 4 · Datos del postulante
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0B192C] mt-0.5">
                Completa tu perfil técnico (+18 años)
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Usaremos tu correo electrónico para notificarte el resultado de la revisión
                y enviarte tu enlace de activación si eres aprobado.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="tech-full-name"
                  className="block text-xs font-semibold text-[#0B192C] mb-1.5"
                >
                  Nombre completo *
                </label>
                <input
                  id="tech-full-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (profileErrors.fullName) {
                      setProfileErrors((prev) => ({ ...prev, fullName: '' }));
                    }
                  }}
                  placeholder="Ej. Carlos Mendoza Herrera"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base sm:text-sm text-[#0B192C] bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2563EB]"
                />
                {profileErrors.fullName && (
                  <p role="alert" className="text-xs text-red-700 mt-1">
                    {profileErrors.fullName}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="tech-email"
                  className="block text-xs font-semibold text-[#0B192C] mb-1.5"
                >
                  Correo electrónico *
                </label>
                <input
                  id="tech-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (profileErrors.email) {
                      setProfileErrors((prev) => ({ ...prev, email: '' }));
                    }
                  }}
                  placeholder="tu.nombre@gmail.com"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base sm:text-sm text-[#0B192C] bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2563EB]"
                />
                {profileErrors.email && (
                  <p role="alert" className="text-xs text-red-700 mt-1">
                    {profileErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="tech-country"
                  className="block text-xs font-semibold text-[#0B192C] mb-1.5"
                >
                  País de residencia *
                </label>
                <input
                  id="tech-country"
                  type="text"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    if (profileErrors.country) {
                      setProfileErrors((prev) => ({ ...prev, country: '' }));
                    }
                  }}
                  placeholder="Ej. Ecuador, México, Colombia, España"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base sm:text-sm text-[#0B192C] bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2563EB]"
                />
                {profileErrors.country && (
                  <p role="alert" className="text-xs text-red-700 mt-1">
                    {profileErrors.country}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="tech-timezone"
                  className="block text-xs font-semibold text-[#0B192C] mb-1.5"
                >
                  Zona horaria *
                </label>
                <input
                  id="tech-timezone"
                  type="text"
                  value={timezone}
                  onChange={(e) => {
                    setTimezone(e.target.value);
                    if (profileErrors.timezone) {
                      setProfileErrors((prev) => ({ ...prev, timezone: '' }));
                    }
                  }}
                  placeholder="Ej. America/Guayaquil (UTC-5)"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base sm:text-sm text-[#0B192C] bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2563EB]"
                />
                {profileErrors.timezone && (
                  <p role="alert" className="text-xs text-red-700 mt-1">
                    {profileErrors.timezone}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="tech-birth-date"
                  className="block text-xs font-semibold text-[#0B192C] mb-1.5"
                >
                  Fecha de nacimiento (+18 años obligatorio) *
                </label>
                <input
                  id="tech-birth-date"
                  type="date"
                  max={maxBirthDate}
                  value={birthDate}
                  onChange={(e) => {
                    setBirthDate(e.target.value);
                    if (profileErrors.birthDate) {
                      setProfileErrors((prev) => ({ ...prev, birthDate: '' }));
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base sm:text-sm text-[#0B192C] bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2563EB]"
                />
                {profileErrors.birthDate && (
                  <p role="alert" className="text-xs text-red-700 mt-1">
                    {profileErrors.birthDate}
                  </p>
                )}
              </div>

              <div>
                <span className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                  Modalidad de disponibilidad *
                </span>
                <div
                  role="radiogroup"
                  aria-label="Modalidad de disponibilidad"
                  className="grid grid-cols-2 gap-2.5"
                >
                  {(
                    [
                      {
                        id: 'half_time',
                        title: 'Half-time',
                        subtitle: '15 – 20 h / semana',
                      },
                      {
                        id: 'full_time',
                        title: 'Full-time',
                        subtitle: '35 – 40 h / semana',
                      },
                    ] as const
                  ).map((option) => {
                    const selected = modality === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setModality(option.id)}
                        className={`rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                          selected
                            ? 'border-[#2563EB] bg-blue-50/70 text-[#0B192C] ring-1 ring-[#2563EB]'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-xs font-bold">{option.title}</span>
                        <span className="block text-[11px] text-slate-600">
                          {option.subtitle}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Specialties */}
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-[#0B192C]">
                Especialidades técnicas (selecciona al menos una) *
              </span>
              <div className="flex flex-wrap gap-2">
                {SPECIALTY_OPTIONS.map((item) => {
                  const active = specialties.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleSpecialty(item)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                        active
                          ? 'bg-[#0B192C] text-white border-[#0B192C]'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>
              {profileErrors.specialties && (
                <p role="alert" className="text-xs text-red-700">
                  {profileErrors.specialties}
                </p>
              )}
            </div>

            {/* Certifications */}
            <div>
              <label
                htmlFor="tech-certifications"
                className="block text-xs font-semibold text-[#0B192C] mb-1.5"
              >
                Certificaciones o experiencia relevante (opcional)
              </label>
              <textarea
                id="tech-certifications"
                rows={3}
                maxLength={400}
                value={certifications}
                onChange={(e) => setCertifications(e.target.value)}
                placeholder="Ej. CompTIA A+, Microsoft 365 Fundamentals, 3 años en mesa de ayuda remota..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base sm:text-sm text-[#0B192C] bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2563EB]"
              />
              <p className="text-[11px] text-slate-500 mt-1 text-right font-mono">
                {certifications.length}/400
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#0B192C] bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>Volver a beneficios</span>
              </button>

              <button
                type="button"
                data-testid="tech-apply-to-nda-btn"
                onClick={handleContinueToNda}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition-all"
              >
                <span>Continuar a firma NDA</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Internal Technician NDA (NDA-TECH-v1.0-2026) */}
        {step === 3 && !submittedApplication && (
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-6 sm:p-8 space-y-6 animate-fade-up">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-emerald-700 tracking-wide">
                  Paso 3 de 4 · Obligatorio antes de la evaluación
                </p>
                <h2 className="text-xl sm:text-2xl font-bold text-[#0B192C] mt-0.5">
                  Acuerdo de Confidencialidad Interno para Técnicos
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-mono font-semibold text-emerald-800">
                <FileSignature className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{NDA_TECH_VERSION}</span>
              </span>
            </div>

            <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-5 space-y-3">
              <p className="text-xs font-bold text-emerald-950">
                Resumen vinculante de tus 4 obligaciones de confidencialidad:
              </p>
              <ul className="space-y-2 text-xs text-slate-700 leading-relaxed list-disc pl-5">
                <li>
                  <strong>Confidencialidad absoluta:</strong> reserva estricta sobre datos
                  de clientes, tickets, pantallas visibles y procesos internos de Remote
                  Support 365.
                </li>
                <li>
                  <strong>Cero solicitud de credenciales:</strong> prohibido solicitar
                  contraseñas personales, códigos 2FA, PINs o datos bancarios.
                </li>
                <li>
                  <strong>Cero grabación ni copia de archivos:</strong> prohibido grabar
                  sesiones, capturar datos sensibles o retener archivos del cliente.
                </li>
                <li>
                  <strong>Cláusula de no elusión (Non-Circumvention):</strong> prohibido
                  contactar o cobrar por fuera de la plataforma a clientes conocidos vía
                  Remote Support 365.
                </li>
              </ul>

              <div className="pt-1">
                <button
                  type="button"
                  data-testid="tech-apply-read-nda-btn"
                  onClick={() => onOpenLegalDoc('nda')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-emerald-50 border border-emerald-300 text-xs font-semibold text-emerald-900 transition-colors"
                >
                  <FileSignature className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Leer texto completo del NDA Interno ({NDA_TECH_VERSION})</span>
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <input
                  id="tech-nda-accepted"
                  type="checkbox"
                  checked={ndaAccepted}
                  onChange={(e) => {
                    setNdaAccepted(e.target.checked);
                    if (ndaError) setNdaError(null);
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                />
                <label
                  htmlFor="tech-nda-accepted"
                  className="text-xs text-slate-700 leading-relaxed cursor-pointer"
                >
                  Declaro haber leído y aceptado íntegramente el{' '}
                  <strong>
                    Acuerdo de Confidencialidad Interno para Técnicos ({NDA_TECH_VERSION})
                  </strong>
                  , comprendiendo que su incumplimiento conlleva la desvinculación inmediata
                  de Remote Support 365. *
                </label>
              </div>

              <div>
                <label
                  htmlFor="tech-nda-signature"
                  className="block text-xs font-semibold text-[#0B192C] mb-1.5"
                >
                  Firma nominal obligatoria (escribe tu nombre completo: {fullName.trim()}) *
                </label>
                <input
                  id="tech-nda-signature"
                  type="text"
                  value={ndaSignedName}
                  onChange={(e) => {
                    setNdaSignedName(e.target.value);
                    if (ndaError) setNdaError(null);
                  }}
                  placeholder={fullName.trim() || 'Escribe tu nombre completo'}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base sm:text-sm text-[#0B192C] bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2563EB]"
                />
                <p className="text-[11px] text-slate-500 mt-1.5 font-mono">
                  Sello electrónico al firmar: {NDA_TECH_VERSION} ·{' '}
                  {new Date().toISOString().slice(0, 10)}
                </p>
              </div>

              {ndaError && (
                <p
                  role="alert"
                  className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 flex items-start gap-2"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{ndaError}</span>
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#0B192C] bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>Editar perfil</span>
              </button>

              <button
                type="button"
                data-testid="tech-apply-start-exam-btn"
                onClick={handleStartAssessment}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition-all"
              >
                <span>Firmar NDA e iniciar evaluación (15:00)</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Timed Assessment (15 minutes) */}
        {step === 4 && !submittedApplication && (
          <div className="space-y-5 animate-fade-up">
            {/* Sticky Countdown & Progress Bar */}
            <div className="sticky top-20 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-md p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#0B192C]">
                  Evaluación Técnica y de Confidencialidad (10 preguntas)
                </p>
                <p className="text-xs text-slate-600">
                  Respondidas:{' '}
                  <strong className="font-mono text-[#0B192C]">
                    {answeredCount}/{TECHNICIAN_ASSESSMENT_QUESTIONS.length}
                  </strong>
                </p>
              </div>

              <div
                data-testid="assessment-countdown"
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border font-mono tabular-nums text-sm font-bold ${timerTone}`}
              >
                <Clock className="w-4 h-4" aria-hidden="true" />
                <span>{formatCountdown(secondsLeft)}</span>
              </div>
            </div>

            {assessmentNotice && (
              <div
                role="status"
                aria-live="polite"
                className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-medium text-amber-900 flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{assessmentNotice}</span>
              </div>
            )}

            <div className="space-y-4">
              {TECHNICIAN_ASSESSMENT_QUESTIONS.map((question, index) => {
                const selectedOptionId = answers[question.id];
                return (
                  <div
                    key={question.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#0B192C]">
                        Pregunta {index + 1} de {TECHNICIAN_ASSESSMENT_QUESTIONS.length}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          question.dimension === 'technical'
                            ? 'bg-blue-50 text-[#1D4ED8] border-blue-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {question.topic}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-[#0B192C] leading-relaxed">
                      {question.prompt}
                    </p>

                    <div
                      role="radiogroup"
                      aria-label={`Opciones para pregunta ${index + 1}`}
                      className="space-y-2"
                    >
                      {question.options.map((option) => {
                        const checked = selectedOptionId === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            role="radio"
                            aria-checked={checked}
                            onClick={() =>
                              setAnswers((prev) => ({
                                ...prev,
                                [question.id]: option.id,
                              }))
                            }
                            className={`w-full text-left rounded-xl border px-4 py-3 text-xs sm:text-sm leading-relaxed flex items-start gap-3 transition-all ${
                              checked
                                ? 'border-[#2563EB] bg-blue-50/70 text-[#0B192C] font-medium ring-1 ring-[#2563EB]'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span
                              className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center text-[11px] font-mono font-bold shrink-0 ${
                                checked
                                  ? 'bg-[#2563EB] border-[#2563EB] text-white'
                                  : 'border-slate-300 text-slate-500'
                              }`}
                            >
                              {option.id.toUpperCase()}
                            </span>
                            <span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-slate-600">
                Al enviar tu evaluación se calculará tu pre-calificación técnica y de
                actitud/NDA para revisión del equipo de Remote Support 365.
              </p>
              <button
                type="button"
                data-testid="tech-apply-submit-exam-btn"
                onClick={() => finalizeAssessment(false)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition-all"
              >
                <UserCheck className="w-4 h-4" aria-hidden="true" />
                <span>Enviar evaluación y finalizar postulación</span>
              </button>
            </div>
          </div>
        )}

        {/* CONFIRMATION SCREEN */}
        {submittedApplication && (
          <div
            data-testid="tech-apply-confirmation"
            className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-6 sm:p-8 space-y-6 animate-fade-up"
          >
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-4">
              <CheckCircle2
                className="w-7 h-7 text-emerald-700 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="space-y-1.5">
                <h2 className="text-lg sm:text-xl font-bold text-emerald-950">
                  ¡Postulación y evaluación registradas correctamente!
                </h2>
                <p className="text-xs sm:text-sm text-emerald-900 leading-relaxed">
                  {autoSubmitted
                    ? 'El tiempo de 15 minutos finalizó y enviamos automáticamente las respuestas completadas. '
                    : ''}
                  Nuestro equipo revisará tu perfil y te enviará la respuesta oficial a{' '}
                  <strong className="font-mono">{submittedApplication.email}</strong>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-[#F8FAFC] border border-slate-200 p-4 space-y-1">
                <p className="text-xs text-slate-600">Puntaje Técnico</p>
                <p className="text-2xl font-extrabold font-mono tabular-nums text-[#0B192C]">
                  {submittedApplication.technical_score}%
                </p>
              </div>
              <div className="rounded-2xl bg-[#F8FAFC] border border-slate-200 p-4 space-y-1">
                <p className="text-xs text-slate-600">Actitud y Confidencialidad</p>
                <p className="text-2xl font-extrabold font-mono tabular-nums text-emerald-800">
                  {submittedApplication.attitude_score}%
                </p>
              </div>
              <div className="rounded-2xl bg-[#0B192C] text-white border border-slate-800 p-4 space-y-1">
                <p className="text-xs text-slate-300">Puntaje Global</p>
                <p className="text-2xl font-extrabold font-mono tabular-nums text-white">
                  {submittedApplication.total_score}%
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-700 space-y-1.5">
              <p>
                <strong>Referencia de postulación:</strong>{' '}
                <span className="font-mono text-[#0B192C]">
                  {submittedApplication.id.slice(0, 8).toUpperCase()}
                </span>
              </p>
              <p>
                <strong>Postulante:</strong> {submittedApplication.full_name} ·{' '}
                {submittedApplication.modality === 'full_time' ? 'Full-time' : 'Half-time'}
              </p>
              <p>
                <strong>NDA firmado:</strong>{' '}
                <span className="font-mono">{submittedApplication.nda_version}</span> por{' '}
                <em>{submittedApplication.nda_signed_name}</em> (
                {submittedApplication.nda_accepted_at.slice(0, 19).replace('T', ' ')} UTC)
              </p>
              <p className="inline-flex items-center gap-1.5 text-slate-600 pt-1">
                <Mail className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
                <span>
                  Estado actual: <strong>Pendiente de revisión</strong>. Recibirás tu enlace
                  de alta por correo si resultas aprobado.
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => onOpenLegalDoc('nda')}
                className="text-xs font-semibold text-[#2563EB] hover:underline"
              >
                Consultar copia del NDA ({NDA_TECH_VERSION})
              </button>
              <button
                type="button"
                onClick={onReturnHome}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#0F172A] text-white text-xs sm:text-sm font-semibold transition-colors"
              >
                <span>Volver al portal principal</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
