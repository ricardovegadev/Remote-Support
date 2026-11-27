import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  HardDrive,
  Laptop,
  Mail,
  MessageSquare,
  Pause,
  Play,
  Printer,
  ShieldCheck,
  Sparkles,
  Wifi,
} from 'lucide-react';
import type { IssueCategory } from '../types/support';
import { AssistantOrbIcon } from './AssistantOrbIcon';
import heroSpecialistMainImg from '../assets/images/hero_specialist_main.webp';
import heroRemoteSupportImg from '../assets/images/hero_remote_support_screens_1795192443338.webp';
import heroWindowsFixImg from '../assets/images/hero_windows_fix_screen_1795193579297.webp';
import heroCleanWorkstationImg from '../assets/images/hero_clean_workstation_1794958415031.webp';

interface HeroSectionProps {
  onStartDiagnostic: () => void;
  onHowItWorks?: () => void;
  onQuickStartSymptom?: (payload: {
    symptom: string;
    category?: IssueCategory;
  }) => void;
}

interface HeroSlide {
  id: string;
  src: string;
  alt: string;
  objectPosition: string;
  statusTitle: string;
  statusSub: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'warm-specialist',
    src: heroSpecialistMainImg,
    alt: 'Especialista de soporte técnico remoto sonriendo con auriculares frente a monitores de diagnóstico IT',
    objectPosition: 'object-[60%_20%]',
    statusTitle: 'IA primero · Especialista si hace falta',
    statusSub: 'Contexto listo para especialista',
  },
  {
    id: 'dual-monitor-support',
    src: heroRemoteSupportImg,
    alt: 'Especialista técnico atendiendo sesión remota auditada con consolas de soporte en doble monitor',
    objectPosition: 'object-center',
    statusTitle: 'Conexión cifrada TLS 1.3 · Supervisada',
    statusSub: 'Sesión remota revocable en 1 clic',
  },
  {
    id: 'windows-fix-live',
    src: heroWindowsFixImg,
    alt: 'Ingeniera resolviendo un fallo de Windows y diagnóstico de red en estación moderna',
    objectPosition: 'object-center',
    statusTitle: 'Diagnóstico en vivo · Windows y Red',
    statusSub: 'Informe técnico IA al cierre',
  },
  {
    id: 'clean-workstation',
    src: heroCleanWorkstationImg,
    alt: 'Estación de trabajo moderna Windows y macOS optimizada y limpia',
    objectPosition: 'object-center',
    statusTitle: 'Optimización activa · Windows, Mac y Linux',
    statusSub: 'Rendimiento, arranque y seguridad',
  },
];

interface DemoConversationScenario {
  id: string;
  shortLabel: string;
  category: IssueCategory;
  userMessage: string;
  thinkingLabel: string;
  assistantReply: string;
  replies: [
    { label: string; symptom: string; testId: string },
    { label: string; symptom: string; testId: string }
  ];
}

const DEMO_SCENARIOS: DemoConversationScenario[] = [
  {
    id: 'outlook',
    shortLabel: 'Outlook',
    category: 'Errores de Microsoft 365 y Outlook',
    userMessage: 'Outlook no abre desde la actualización',
    thinkingLabel: 'Revisando perfil y actualización...',
    assistantReply:
      'Vamos a revisarlo juntos. ¿Usas Outlook clásico o el nuevo Outlook?',
    replies: [
      {
        label: 'Nuevo Outlook',
        symptom: 'Outlook no abre desde la actualización. Uso el nuevo Outlook.',
        testId: 'hero-chat-reply-new-outlook',
      },
      {
        label: 'Outlook clásico',
        symptom: 'Outlook no abre desde la actualización. Uso Outlook clásico.',
        testId: 'hero-chat-reply-classic-outlook',
      },
    ],
  },
  {
    id: 'windows-slow',
    shortLabel: 'Windows',
    category: 'Windows lento o bajo rendimiento',
    userMessage: 'Mi PC con Windows tarda mucho en encender',
    thinkingLabel: 'Evaluando arranque y procesos...',
    assistantReply:
      'Podemos aligerarlo hoy mismo. ¿El disco llega al 100% al iniciar?',
    replies: [
      {
        label: 'Sí, se traba al inicio',
        symptom:
          'Mi PC con Windows tarda mucho en encender y el disco llega al 100% al iniciar.',
        testId: 'hero-chat-reply-windows-boot',
      },
      {
        label: 'Solo al abrir apps',
        symptom:
          'Mi PC con Windows se vuelve muy lento cuando abro varias aplicaciones.',
        testId: 'hero-chat-reply-windows-apps',
      },
    ],
  },
  {
    id: 'wifi-printer',
    shortLabel: 'Red / Impresora',
    category: 'Configuración de impresoras',
    userMessage: 'Mi impresora Wi-Fi aparece sin conexión',
    thinkingLabel: 'Verificando cola y conectividad...',
    assistantReply:
      'Revisemos la red en 2 pasos. ¿La impresora muestra su luz Wi-Fi fija?',
    replies: [
      {
        label: 'Luz fija encendida',
        symptom:
          'Mi impresora Wi-Fi aparece sin conexión en Windows aunque tiene la luz Wi-Fi fija.',
        testId: 'hero-chat-reply-printer-on',
      },
      {
        label: 'Parpadea / sin red',
        symptom:
          'Mi impresora Wi-Fi parpadea y no se conecta a la red inalámbrica.',
        testId: 'hero-chat-reply-printer-blink',
      },
    ],
  },
];

const DAILY_APP_SHORTCUTS: Array<{
  label: string;
  category: IssueCategory;
  symptom: string;
  icon: typeof Laptop;
}> = [
  {
    label: 'Windows',
    category: 'Windows lento o bajo rendimiento',
    symptom: 'Mi equipo con Windows va lento o presenta errores de rendimiento.',
    icon: Cpu,
  },
  {
    label: 'Microsoft 365',
    category: 'Errores de Microsoft 365 y Outlook',
    symptom: 'Tengo problemas con aplicaciones o activación de Microsoft 365.',
    icon: Laptop,
  },
  {
    label: 'Outlook',
    category: 'Errores de Microsoft 365 y Outlook',
    symptom: 'Outlook no abre o no sincroniza mis correos correctamente.',
    icon: Mail,
  },
  {
    label: 'OneDrive',
    category: 'Recuperación de archivos',
    symptom: 'OneDrive no sincroniza mis archivos o faltan documentos recientes.',
    icon: HardDrive,
  },
  {
    label: 'Teams',
    category: 'Aplicaciones que no arrancan',
    symptom: 'Microsoft Teams no inicia o falla al conectarse a reuniones.',
    icon: MessageSquare,
  },
  {
    label: 'Impresoras y Wi-Fi',
    category: 'Problemas de Wi-Fi o red',
    symptom: 'Mi conexión Wi-Fi o mi impresora de red no conecta en el equipo.',
    icon: Wifi,
  },
];

type SimStage = 'user' | 'typing' | 'reply' | 'actions';

export function HeroSection({
  onStartDiagnostic,
  onHowItWorks,
  onQuickStartSymptom,
}: HeroSectionProps) {
  // 4-Slide Photo Carousel State (auto-advancing with pause on hover)
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);

  // Live Conversation Simulation State inside the Floating Demo Card
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [simStage, setSimStage] = useState<SimStage>('actions');
  const [demoPaused, setDemoPaused] = useState(false);
  const [cardTiltActive, setCardTiltActive] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const glareRef = useRef<HTMLDivElement | null>(null);
  const tiltRafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (tiltRafRef.current !== null) {
        window.cancelAnimationFrame(tiltRafRef.current);
      }
    };
  }, []);

  const handleCardPointerEnter = () => {
    setDemoPaused(true);
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced) {
      setCardTiltActive(true);
    }
  };

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const rotateY = (relX - 0.5) * 12;
    const rotateX = (0.5 - relY) * 9;
    const glareX = Math.round(relX * 100);
    const glareY = Math.round(relY * 100);

    if (tiltRafRef.current !== null) {
      window.cancelAnimationFrame(tiltRafRef.current);
    }
    tiltRafRef.current = window.requestAnimationFrame(() => {
      if (cardRef.current) {
        cardRef.current.style.transform = `perspective(1100px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
      }
      if (glareRef.current) {
        glareRef.current.style.opacity = '1';
        glareRef.current.style.background = `radial-gradient(280px circle at ${glareX}% ${glareY}%, rgba(37, 99, 235, 0.11), transparent 65%)`;
      }
      tiltRafRef.current = null;
    });
  };

  const handleCardPointerLeave = () => {
    setDemoPaused(false);
    setCardTiltActive(false);
    if (tiltRafRef.current !== null) {
      window.cancelAnimationFrame(tiltRafRef.current);
      tiltRafRef.current = null;
    }
    if (cardRef.current) {
      cardRef.current.style.transform = '';
    }
    if (glareRef.current) {
      glareRef.current.style.opacity = '0';
    }
  };

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (carouselPaused || prefersReduced) return;
    const timer = window.setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [carouselPaused]);

  // Progressive conversation simulation choreography
  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setSimStage('actions');
      return;
    }

    if (simStage === 'user') {
      const t = window.setTimeout(() => setSimStage('typing'), 750);
      return () => window.clearTimeout(t);
    }
    if (simStage === 'typing') {
      const t = window.setTimeout(() => setSimStage('reply'), 1250);
      return () => window.clearTimeout(t);
    }
    if (simStage === 'reply') {
      const t = window.setTimeout(() => setSimStage('actions'), 380);
      return () => window.clearTimeout(t);
    }
    // Pause auto-cycling to the next scenario while the user is hovering or interacting
    if (demoPaused) return;
    const t = window.setTimeout(() => {
      setScenarioIndex((prev) => (prev + 1) % DEMO_SCENARIOS.length);
      setSimStage('user');
    }, 5800);
    return () => window.clearTimeout(t);
  }, [simStage, scenarioIndex, demoPaused]);

  const activeSlide = HERO_SLIDES[activeSlideIndex];
  const activeScenario = DEMO_SCENARIOS[scenarioIndex];

  const handlePrevSlide = () => {
    setActiveSlideIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  const handleNextSlide = () => {
    setActiveSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const handleSelectScenario = (index: number) => {
    setScenarioIndex(index);
    setSimStage('user');
  };

  const triggerSymptom = (symptom: string, category?: IssueCategory) => {
    if (onQuickStartSymptom) {
      onQuickStartSymptom({ symptom, category });
    } else {
      onStartDiagnostic();
    }
  };

  const handleScrollHowItWorks = () => {
    if (onHowItWorks) {
      onHowItWorks();
      return;
    }
    if (typeof document !== 'undefined') {
      const target = document.getElementById('como-funciona');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const orbState: 'idle' | 'thinking' | 'ready' =
    simStage === 'typing' ? 'thinking' : simStage === 'actions' ? 'ready' : 'idle';

  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="relative overflow-x-clip bg-gradient-to-b from-[#F4F7FB] via-white to-[#F8FAFC] border-b border-slate-200/80"
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-10 sm:pt-14 sm:pb-12 lg:pt-16 lg:pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Title, Subtitle & Floating Assistant Card */}
          <div className="lg:col-span-5 space-y-6">
            <p
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2563EB] animate-fade-up"
              style={{ animationDelay: '0ms' }}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Soporte remoto con IA + Especialistas</span>
            </p>

            <h1
              id="hero-heading"
              className="text-4xl sm:text-5xl lg:text-[52px] font-bold tracking-tight text-[#0B192C] leading-[1.08] animate-fade-up"
              style={{ animationDelay: '80ms' }}
            >
              <span className="block">Tu problema IT,</span>
              <span className="block text-[#2563EB]">un paso más cerca</span>
              <span className="block">de resolverse.</span>
            </h1>

            <p
              className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed animate-fade-up"
              style={{ animationDelay: '160ms' }}
            >
              Cuéntanos qué ocurre. Nuestro asistente IA te guía gratis con pasos
              seguros; si necesitas conexión remota, un especialista certificado lo
              resuelve contigo.
            </p>

            {/* Floating Animated Live Conversation Demo Card with Continuous 3D Perspective & Interactive Tilt */}
            <div
              onPointerEnter={handleCardPointerEnter}
              onPointerMove={handleCardPointerMove}
              onPointerLeave={handleCardPointerLeave}
              onFocusCapture={() => setDemoPaused(true)}
              onBlurCapture={() => setDemoPaused(false)}
              className="hidden md:block relative w-full p-1 pb-3 [perspective:1100px] animate-fade-up"
              style={{ animationDelay: '200ms' }}
            >
              {/* Soft Levitating Ambient Glow Underneath */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-x-2 -bottom-1 h-10 rounded-full bg-gradient-to-r from-[#2563EB]/25 via-sky-400/20 to-[#10B981]/25 blur-xl animate-perspective-shadow"
              />

              <div
                ref={cardRef}
                data-testid="hero-assistant-card"
                className={`relative overflow-hidden w-full min-h-[300px] bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-900/12 border border-slate-200/90 p-4 flex flex-col justify-between gap-3 z-10 hover:shadow-2xl hover:border-blue-300/80 ${
                  cardTiltActive
                    ? 'transition-[transform,box-shadow,border-color] duration-75 ease-out'
                    : 'animate-perspective-float transition-[transform,box-shadow,border-color] duration-500 ease-out'
                }`}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Continuous Subtle Light Sheen Sweep */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-blue-100/45 to-transparent animate-card-sheen"
                />

                {/* Interactive Pointer Spotlight Glare */}
                <div
                  ref={glareRef}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 transition-opacity duration-200"
                  style={{ opacity: 0 }}
                />

                {/* Card Header with Custom Animated Interactive Assistant Orb */}
                <div className="relative z-10 flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AssistantOrbIcon
                      size="sm"
                      state={orbState}
                      showOnlineBadge
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-[#0B192C] leading-tight truncate">
                          Asistente Remote 365
                        </p>
                        <span
                          data-testid="hero-demo-badge"
                          className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[9px] font-bold uppercase tracking-wider shrink-0"
                        >
                          DEMO
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-emerald-700 leading-tight mt-0.5 truncate">
                        {simStage === 'typing'
                          ? activeScenario.thinkingLabel
                          : 'Vista previa interactiva'}
                      </p>
                    </div>
                  </div>

                  {/* Interactive Scenario Switcher Dots */}
                  <div
                    role="tablist"
                    aria-label="Escenarios de simulación de chat"
                    className="flex items-center gap-0.5 shrink-0"
                  >
                    {DEMO_SCENARIOS.map((sc, idx) => (
                      <button
                        key={sc.id}
                        type="button"
                        role="tab"
                        aria-selected={idx === scenarioIndex}
                        aria-label={`Simular escenario ${sc.shortLabel}`}
                        title={sc.shortLabel}
                        onClick={() => handleSelectScenario(idx)}
                        className="inline-flex items-center justify-center min-w-6 min-h-6 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                      >
                        <span
                          className={`block h-1.5 rounded-full transition-all duration-300 ${
                            idx === scenarioIndex
                              ? 'w-4 bg-[#2563EB]'
                              : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

              {/* Live Animated Conversation Simulation Body */}
              <div
                key={activeScenario.id}
                className="space-y-2.5 flex-1 flex flex-col justify-center py-1"
              >
                {/* Step 1: Client Message Bubble */}
                <div className="flex justify-end animate-chat-pop">
                  <div className="max-w-[92%] rounded-2xl rounded-tr-sm bg-[#2563EB] text-white px-3 py-2 text-xs leading-relaxed shadow-xs">
                    {activeScenario.userMessage}
                  </div>
                </div>

                {/* Step 2: Typing / Thinking Indicator */}
                {simStage === 'typing' && (
                  <div
                    data-testid="hero-demo-typing"
                    className="flex justify-start animate-chat-pop"
                  >
                    <div className="rounded-2xl rounded-tl-sm bg-[#F1F5F9] border border-slate-200/70 px-3.5 py-2.5 inline-flex items-center gap-1.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-typing-dot"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-typing-dot"
                        style={{ animationDelay: '160ms' }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-typing-dot"
                        style={{ animationDelay: '320ms' }}
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: Assistant Guided Reply Bubble */}
                {(simStage === 'reply' || simStage === 'actions') && (
                  <div className="flex justify-start animate-chat-pop">
                    <div className="max-w-[96%] rounded-2xl rounded-tl-sm bg-[#F1F5F9] text-[#0B192C] px-3 py-2 text-xs leading-relaxed border border-slate-200/60">
                      {activeScenario.assistantReply}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 4: Clickable 1-Click Quick-Reply Buttons */}
              <div
                className={`pt-1 space-y-1.5 transition-all duration-300 ${
                  simStage === 'actions'
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-40 translate-y-1'
                }`}
              >
                <div className="grid grid-cols-2 gap-1.5">
                  {activeScenario.replies.map((reply) => (
                    <button
                      key={reply.label}
                      type="button"
                      data-testid={reply.testId}
                      onClick={() =>
                        triggerSymptom(reply.symptom, activeScenario.category)
                      }
                      className="px-2.5 py-2 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-[11px] font-semibold text-[#0B192C] hover:text-[#1D4ED8] transition-colors text-center truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                    >
                      {reply.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  data-testid="hero-chat-reply-custom"
                  onClick={onStartDiagnostic}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-dashed border-slate-300 hover:border-blue-300 text-[11px] font-medium text-slate-600 hover:text-[#1D4ED8] transition-colors flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  <span>Escribir mi problema...</span>
                  <ArrowRight
                    className="w-3.5 h-3.5 text-[#2563EB] shrink-0"
                    aria-hidden="true"
                  />
                </button>
              </div>
              </div>
            </div>
          </div>

          {/* Right Column: 4-Slide Photo Carousel (Completely free and unobstructed) */}
          <div
            className="lg:col-span-7 relative animate-fade-up"
            style={{ animationDelay: '140ms' }}
          >
            <div
              className="relative"
              onMouseEnter={() => setCarouselPaused(true)}
              onMouseLeave={() => setCarouselPaused(false)}
            >
              {/* 4-Slide Interactive Carousel Frame */}
              <div
                data-testid="hero-carousel"
                aria-roledescription="carousel"
                aria-label="Escenas reales de soporte técnico remoto"
                className="relative rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/10 border border-slate-200/80 bg-slate-100 aspect-[4/3]"
              >
                {HERO_SLIDES.map((slide, index) => {
                  const isActive = index === activeSlideIndex;
                  return (
                    <img
                      key={slide.id}
                      src={slide.src}
                      alt={slide.alt}
                      width={1200}
                      height={900}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      fetchPriority={index === 0 ? 'high' : undefined}
                      referrerPolicy="no-referrer"
                      aria-hidden={!isActive}
                      className={`absolute inset-0 w-full h-full object-cover ${slide.objectPosition} transition-opacity duration-700 ease-out-expo ${
                        isActive
                          ? 'opacity-100 z-[1] animate-ken-burns'
                          : 'opacity-0 z-0 pointer-events-none'
                      }`}
                    />
                  );
                })}

                {/* Soft bottom scrim for crisp badge legibility across all 4 photos */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-32 z-[2] bg-gradient-to-t from-slate-950/45 via-slate-900/10 to-transparent"
                />

                {/* Previous / Next Carousel Controls */}
                <div className="absolute top-3.5 left-3.5 z-[4] flex items-center gap-1.5">
                  <button
                    type="button"
                    data-testid="hero-carousel-prev"
                    onClick={handlePrevSlide}
                    aria-label="Imagen anterior del carrusel"
                    className="w-8 h-8 rounded-full bg-slate-950/55 hover:bg-slate-950/80 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    data-testid="hero-carousel-next"
                    onClick={handleNextSlide}
                    aria-label="Siguiente imagen del carrusel"
                    className="w-8 h-8 rounded-full bg-slate-950/55 hover:bg-slate-950/80 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                {/* Bottom-Left Floating Trust Mini-Card synced with active slide */}
                <div className="hidden sm:flex items-center gap-2.5 absolute bottom-4 left-4 z-[4] max-w-[295px] rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-lg shadow-slate-900/10 px-3.5 py-2.5 animate-float-gentle">
                  <span className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 text-[#2563EB] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <div key={activeSlide.id} className="min-w-0 animate-chat-pop">
                    <p className="text-[11px] font-bold text-[#0B192C] leading-tight">
                      {activeSlide.statusTitle}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 mt-0.5 flex items-center gap-1 whitespace-nowrap">
                      <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                      <span>{activeSlide.statusSub}</span>
                    </p>
                  </div>
                </div>

                {/* Carousel Progress Capsule Dots */}
                <div
                  role="tablist"
                  aria-label="Seleccionar escena del carrusel"
                  className="absolute bottom-3.5 right-3.5 z-[4] flex items-center gap-1 rounded-full bg-slate-950/65 backdrop-blur-md border border-white/20 px-2 py-1"
                >
                  <button
                    type="button"
                    aria-label={carouselPaused ? 'Reanudar carrusel' : 'Pausar carrusel'}
                    onClick={() => setCarouselPaused((prev) => !prev)}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white/90 hover:text-white hover:bg-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {carouselPaused ? (
                      <Play className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                  </button>
                  {HERO_SLIDES.map((slide, idx) => {
                    const isCurrent = idx === activeSlideIndex;
                    return (
                      <button
                        key={slide.id}
                        type="button"
                        role="tab"
                        aria-selected={isCurrent}
                        aria-label={`Ver escena ${idx + 1} de ${HERO_SLIDES.length}`}
                        onClick={() => setActiveSlideIndex(idx)}
                        className="inline-flex items-center justify-center min-w-7 min-h-7 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      >
                        <span
                          className={`block h-1.5 rounded-full transition-all duration-300 ${
                            isCurrent
                              ? 'w-5 bg-[#10B981]'
                              : 'w-1.5 bg-white/60 hover:bg-white/90'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Primary & Secondary CTAs + Micro-guarantees directly below the carousel */}
            <div className="mt-6 space-y-3.5 animate-fade-up" style={{ animationDelay: '180ms' }}>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  data-testid="hero-start-diagnostic"
                  onClick={onStartDiagnostic}
                  className="group inline-flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 py-3.5 rounded-xl text-sm sm:text-base font-semibold shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/25 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2563EB]"
                >
                  <span>Iniciar diagnóstico</span>
                  <ArrowRight
                    className="w-4 h-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>

                <button
                  type="button"
                  onClick={handleScrollHowItWorks}
                  className="group inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-[#0B192C] border border-slate-200 px-5 py-3.5 rounded-xl text-sm sm:text-base font-semibold shadow-xs hover:-translate-y-0.5 transition-all duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
                >
                  <span>Así funciona</span>
                  <ArrowDown
                    className="w-4 h-4 text-slate-500 shrink-0 transition-transform duration-150 group-hover:translate-y-0.5"
                    aria-hidden="true"
                  />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-slate-700">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" aria-hidden="true" />
                  <span>Tú decides cada paso</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" aria-hidden="true" />
                  <span>Sin contraseñas por chat</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" aria-hidden="true" />
                  <span>Desde $15 USD</span>
                </span>
              </div>
            </div>

            {/* Bottom Strip: Daily Application Shortcuts Bar */}
            <div
              className="mt-6 pt-5 border-t border-slate-200/80 flex flex-col items-start gap-3.5 animate-fade-up w-full"
              style={{ animationDelay: '360ms' }}
            >
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                <Printer className="w-3.5 h-3.5 text-slate-400 hidden sm:block" aria-hidden="true" />
                <span>Ayuda para tu día a día</span>
              </div>

              <div
                role="group"
                aria-label="Accesos directos por aplicación"
                className="w-full flex flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-transparent pb-0.5"
              >
                {DAILY_APP_SHORTCUTS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => triggerSymptom(item.symptom, item.category)}
                      className="inline-flex items-center gap-1.5 bg-white hover:bg-blue-50/80 border border-slate-200/90 hover:border-blue-300 text-slate-700 hover:text-[#1D4ED8] hover:-translate-y-0.5 px-2.5 py-2 rounded-xl text-[11px] xl:text-xs font-medium shadow-xs transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                    >
                      <Icon className="w-3.5 h-3.5 text-[#2563EB] shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
