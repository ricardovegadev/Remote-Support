import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import {
  DiagnosticWizard,
  type ExternalTriageTrigger,
} from './components/DiagnosticWizard';
import { Footer } from './components/Footer';
import { FaqSection } from './components/FaqSection';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { LandingSections } from './components/LandingSections';
import type { LegalDocTab } from './components/LegalDocsModal';
import { ScrollReveal } from './components/ScrollReveal';
import { StickySectionNav } from './components/StickySectionNav';
import { FEATURE_FLAGS } from './config/features';
import { getSupabaseClient, isSupabaseConfigured } from './lib/supabaseClient';

const AuthModal = lazy(() =>
  import('./components/AuthModal').then((m) => ({ default: m.AuthModal }))
);
const ConnectionRoom = lazy(() =>
  import('./components/ConnectionRoom').then((m) => ({
    default: m.ConnectionRoom,
  }))
);
const LegalDocsModal = lazy(() =>
  import('./components/LegalDocsModal').then((m) => ({
    default: m.LegalDocsModal,
  }))
);
const TechnicianApplyView = lazy(() =>
  import('./components/TechnicianApplyView').then((m) => ({
    default: m.TechnicianApplyView,
  }))
);
const TechnicianRegisterView = lazy(() =>
  import('./components/TechnicianRegisterView').then((m) => ({
    default: m.TechnicianRegisterView,
  }))
);
const TechPortalView = lazy(() =>
  import('./components/TechPortalView').then((m) => ({
    default: m.TechPortalView,
  }))
);
const TicketLookupModal = lazy(() =>
  import('./components/TicketLookupModal').then((m) => ({
    default: m.TicketLookupModal,
  }))
);
import {
  haveRecordsChanged,
  haveTicketsChanged,
  sortTicketsDeterministically,
  supportAdapter,
} from './services/supportAdapter';
import type {
  AgentInstallType,
  AiAgentConfig,
  AppView,
  AuditLogEntry,
  ClientDevice,
  DispatchMode,
  IssueCategory,
  MemberTierType,
  Organization,
  OrganizationMember,
  RemoteSessionRecord,
  ServiceTier,
  SupportTicket,
  TechnicianAvailability,
  TechnicianSpecialty,
  TicketMessage,
  UserAccountProfile,
  WizardDraft,
} from './types/support';
import { readCookieConsent } from './utils/cookieConsent';
import {
  createTicketFromDraft,
  INITIAL_WIZARD_DRAFT,
  parseAppRoute,
} from './utils/ticketLogic';

const PUBLIC_PORTAL_ORG_ID = '00000000-0000-4000-8000-000000000001';

function triggerJsonDownload(filename: string, jsonText: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function resolveAppRoute(pathname: string): { view: AppView; ticketCode: string | null } {
  const parsed = parseAppRoute(pathname);
  if (
    parsed.view === 'technician_apply' &&
    !FEATURE_FLAGS.ENABLE_TECHNICIAN_RECRUITMENT
  ) {
    return { view: 'landing', ticketCode: null };
  }
  return parsed;
}

function consumeRoomTokenFromUrl(ticketCode: string | null): void {
  if (typeof window === 'undefined' || !ticketCode) return;
  const params = new URLSearchParams(window.location.search);
  if (params.has('payment') || params.get('gateway') === 'paypal') return;
  const urlToken = params.get('token')?.trim();
  if (!urlToken) return;
  supportAdapter.saveRoomToken(ticketCode, urlToken);
  params.delete('token');
  const nextQuery = params.toString();
  const cleanUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
  window.history.replaceState(window.history.state, '', cleanUrl);
}

export default function App() {
  const initialRoute =
    typeof window !== 'undefined'
      ? resolveAppRoute(window.location.pathname)
      : { view: 'landing' as AppView, ticketCode: null };

  const [activeView, setActiveView] = useState<AppView>(initialRoute.view);
  const [wizardDraft, setWizardDraft] = useState<WizardDraft>(INITIAL_WIZARD_DRAFT);
  const [wizardErrors, setWizardErrors] = useState<Record<string, string>>({});
  const [externalTriageTrigger, setExternalTriageTrigger] =
    useState<ExternalTriageTrigger | null>(null);

  const [organizations, setOrganizations] = useState<Organization[]>(() =>
    supportAdapter.loadOrganizations()
  );
  const [activeOrgId, setActiveOrgId] = useState<string>(
    () =>
      supportAdapter.loadOrganizations()[0]?.id ??
      '00000000-0000-4000-8000-000000000001'
  );
  const [members, setMembers] = useState<OrganizationMember[]>(() =>
    supportAdapter.loadMembers()
  );
  const [devices, setDevices] = useState<ClientDevice[]>(() =>
    supportAdapter.loadDevices()
  );
  const [sessions, setSessions] = useState<RemoteSessionRecord[]>(() =>
    supportAdapter.loadSessions()
  );
  const [aiAgents, setAiAgents] = useState<AiAgentConfig[]>(() =>
    supportAdapter.loadAiAgents()
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() =>
    supportAdapter.loadAuditLogs()
  );

  const [tickets, setTickets] = useState<SupportTicket[]>(() =>
    supportAdapter.loadTickets()
  );
  const [messages, setMessages] = useState<TicketMessage[]>(() =>
    supportAdapter.loadMessages()
  );
  const [activeTicketCode, setActiveTicketCode] = useState<string | null>(() => {
    if (initialRoute.view === 'connection_room' && initialRoute.ticketCode) {
      consumeRoomTokenFromUrl(initialRoute.ticketCode);
    }
    return initialRoute.ticketCode;
  });
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [roomAccessState, setRoomAccessState] = useState<
    'idle' | 'checking' | 'authorized' | 'denied'
  >(() =>
    initialRoute.view === 'connection_room' && initialRoute.ticketCode
      ? 'checking'
      : 'idle'
  );
  const [roomAccessError, setRoomAccessError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<UserAccountProfile | null>(() =>
    supportAdapter.loadUserProfile()
  );
  const [legalDocTab, setLegalDocTab] = useState<LegalDocTab | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [ticketLookupOpen, setTicketLookupOpen] = useState(false);
  const [cookieBannerOpen, setCookieBannerOpen] = useState<boolean>(
    () => typeof window !== 'undefined' && !readCookieConsent()
  );

  const [isHydratingSession, setIsHydratingSession] = useState<boolean>(false);
  const heroSectionRef = useRef<HTMLDivElement | null>(null);
  const wizardSectionRef = useRef<HTMLDivElement | null>(null);
  const landingSectionRef = useRef<HTMLDivElement | null>(null);
  const faqSectionRef = useRef<HTMLDivElement | null>(null);

  const [visibleSections, setVisibleSections] = useState({
    hero: true,
    wizard: false,
    landing: false,
    faq: false,
  });

  useEffect(() => {
    if (activeView !== 'landing') return;
    if (typeof window === 'undefined' || typeof IntersectionObserver !== 'function') {
      setVisibleSections({ hero: true, wizard: true, landing: true, faq: true });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-section-id');
            if (id) {
              setVisibleSections((prev) => ({ ...prev, [id]: true }));
            }
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    const nodes = [
      heroSectionRef.current,
      wizardSectionRef.current,
      landingSectionRef.current,
      faqSectionRef.current,
    ];

    nodes.forEach((node) => {
      if (node) observer.observe(node);
    });

    return () => {
      observer.disconnect();
    };
  }, [activeView]);

  const syncRequestSeqRef = useRef(0);
  const ticketsRef = useRef<SupportTicket[]>(tickets);
  ticketsRef.current = tickets;
  const activeViewRef = useRef<AppView>(activeView);
  activeViewRef.current = activeView;

  const matchedTicket = activeTicketCode
    ? tickets.find(
        (ticket) =>
          String(ticket?.ticket_code ?? '').toUpperCase() ===
          activeTicketCode.toUpperCase()
      ) ?? null
    : null;

  const activeTicket = matchedTicket;

  const activeTicketMessages = activeTicket
    ? messages.filter((msg) => msg.ticket_id === activeTicket.id)
    : [];

  useEffect(() => {
    setAiAgents((prev) => {
      let next = supportAdapter.ensureOrganizationAiAgents(PUBLIC_PORTAL_ORG_ID, prev);
      if (activeOrgId && activeOrgId !== PUBLIC_PORTAL_ORG_ID) {
        next = supportAdapter.ensureOrganizationAiAgents(activeOrgId, next);
      }
      return next === prev ? prev : next;
    });
  }, [activeOrgId]);

  const navigateToRoute = useCallback(
    (path: string, view: AppView, code: string | null = null) => {
      setActiveView(view);
      setActiveTicketCode(code);
      if (typeof window !== 'undefined' && window.location.pathname !== path) {
        window.history.pushState({ view, code }, '', path);
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setWizardDraft((prev) => ({
        ...prev,
        category: prev.category ?? 'Problemas de Wi-Fi o red',
      }));
    }

    const onPopState = () => {
      const parsed = resolveAppRoute(window.location.pathname);
      if (parsed.view === 'connection_room' && parsed.ticketCode) {
        consumeRoomTokenFromUrl(parsed.ticketCode);
      }
      setActiveView(parsed.view);
      setActiveTicketCode(parsed.ticketCode);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (activeView !== 'connection_room' || !activeTicketCode) {
      setRoomAccessState('idle');
      setRoomAccessError(null);
      return;
    }
    consumeRoomTokenFromUrl(activeTicketCode);
    let cancelled = false;
    setRoomAccessState('checking');
    setRoomAccessError(null);

    void (async () => {
      const storedToken = supportAdapter.getRoomToken(activeTicketCode);
      let operatorAccessToken: string | null = null;
      if (!storedToken && isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        const sessionRes = supabase ? await supabase.auth.getSession() : null;
        operatorAccessToken = sessionRes?.data.session?.access_token ?? null;
      }

      const authRes = await supportAdapter.fetchAuthorizedRoomTicket(
        activeTicketCode,
        storedToken,
        operatorAccessToken
      );
      if (cancelled) return;

      if (!authRes.ok || !authRes.ticket) {
        setRoomAccessState('denied');
        setRoomAccessError(
          authRes.error ?? 'Acceso denegado: se requiere el token privado válido de esta sala.'
        );
        return;
      }

      const serverTicket = authRes.ticket;
      setTickets((prev) => {
        const merged = sortTicketsDeterministically([
          serverTicket,
          ...prev.filter(
            (t) =>
              t.id !== serverTicket.id &&
              String(t.ticket_code).toUpperCase() !==
                String(serverTicket.ticket_code).toUpperCase()
          ),
        ]);
        supportAdapter.saveTickets(merged);
        return merged;
      });
      if (authRes.messages && authRes.messages.length > 0) {
        const incoming = authRes.messages;
        setMessages((prev) => {
          const incomingIds = new Set(incoming.map((m) => m.id));
          return [...prev.filter((m) => !incomingIds.has(m.id)), ...incoming];
        });
      }
      setRoomAccessState('authorized');
    })();

    return () => {
      cancelled = true;
    };
  }, [activeView, activeTicketCode]);

  useEffect(() => {
    let isMounted = true;
    const supabaseEnabled = isSupabaseConfigured();
    const syncOptions = activeTicketCode ? { ticketCode: activeTicketCode } : undefined;
    const hasLocalTicketMatch = activeTicketCode
      ? ticketsRef.current.some(
          (ticket) =>
            String(ticket?.ticket_code ?? '').toUpperCase() ===
            activeTicketCode.toUpperCase()
        )
      : false;
    const needsRemoteTicketLookup =
      activeViewRef.current === 'connection_room' &&
      Boolean(activeTicketCode) &&
      !hasLocalTicketMatch &&
      supabaseEnabled;

    let safetyTimer: number | null = null;
    if (needsRemoteTicketLookup) {
      setIsHydratingSession(true);
      safetyTimer = window.setTimeout(() => {
        if (isMounted) setIsHydratingSession(false);
      }, 4000);
    } else {
      setIsHydratingSession((prev) => (prev ? false : prev));
    }

    const syncFromRemote = (clearHydratingOnDone: boolean) => {
      const requestSeq = ++syncRequestSeqRef.current;
      void supportAdapter
        .syncFromSupabaseIfConfigured(syncOptions)
        .then((res) => {
          if (!isMounted || requestSeq !== syncRequestSeqRef.current) return;
          if (!res.ok && res.error) {
            setPersistenceError(res.error);
            return;
          }
          if (res.data.organizations && res.data.organizations.length > 0) {
            const nextOrgs = res.data.organizations;
            setOrganizations((prev) =>
              haveRecordsChanged(prev, nextOrgs) ? nextOrgs : prev
            );
          }
          if (res.data.members && res.data.members.length > 0) {
            const nextMembers = res.data.members;
            setMembers((prev) =>
              haveRecordsChanged(prev, nextMembers) ? nextMembers : prev
            );
          }
          if (res.data.tickets && res.data.tickets.length > 0) {
            const dedupedById = new Map<string, SupportTicket>();
            for (const ticket of res.data.tickets) {
              dedupedById.set(ticket.id, ticket);
            }
            const nextTickets = sortTicketsDeterministically(
              Array.from(dedupedById.values())
            );
            setTickets((prev) =>
              haveTicketsChanged(prev, nextTickets) ? nextTickets : prev
            );
          }
          if (res.data.messages) {
            const nextMessages = res.data.messages;
            setMessages((prev) =>
              haveRecordsChanged(prev, nextMessages) ? nextMessages : prev
            );
          }
          if (res.data.devices) {
            const nextDevices = res.data.devices;
            setDevices((prev) =>
              haveRecordsChanged(prev, nextDevices) ? nextDevices : prev
            );
          }
          if (res.data.sessions) {
            const nextSessions = res.data.sessions;
            setSessions((prev) =>
              haveRecordsChanged(prev, nextSessions) ? nextSessions : prev
            );
          }
          if (res.data.aiAgents && res.data.aiAgents.length > 0) {
            const nextAiAgents = res.data.aiAgents;
            setAiAgents((prev) =>
              haveRecordsChanged(prev, nextAiAgents) ? nextAiAgents : prev
            );
          }
          if (res.data.auditLogs) {
            const nextAuditLogs = res.data.auditLogs;
            setAuditLogs((prev) =>
              haveRecordsChanged(prev, nextAuditLogs) ? nextAuditLogs : prev
            );
          }
        })
        .finally(() => {
          if (!clearHydratingOnDone) return;
          if (safetyTimer !== null) window.clearTimeout(safetyTimer);
          if (isMounted) setIsHydratingSession(false);
        });
    };

    syncFromRemote(true);

    const unsubscribe = supportAdapter.subscribeRealtime(() => {
      if (!isSupabaseConfigured()) {
        const nextTickets = supportAdapter.loadTickets();
        const nextMessages = supportAdapter.loadMessages();
        const nextMembers = supportAdapter.loadMembers();
        const nextOrgs = supportAdapter.loadOrganizations();
        setTickets((prev) =>
          haveTicketsChanged(prev, nextTickets) ? nextTickets : prev
        );
        setMessages((prev) =>
          haveRecordsChanged(prev, nextMessages) ? nextMessages : prev
        );
        setMembers((prev) =>
          haveRecordsChanged(prev, nextMembers) ? nextMembers : prev
        );
        setOrganizations((prev) =>
          haveRecordsChanged(prev, nextOrgs) ? nextOrgs : prev
        );
      }

      const nextDevices = supportAdapter.loadDevices();
      const nextSessions = supportAdapter.loadSessions();
      const nextAiAgents = supportAdapter.loadAiAgents();
      const nextAuditLogs = supportAdapter.loadAuditLogs();
      setDevices((prev) =>
        haveRecordsChanged(prev, nextDevices) ? nextDevices : prev
      );
      setSessions((prev) =>
        haveRecordsChanged(prev, nextSessions) ? nextSessions : prev
      );
      setAiAgents((prev) =>
        haveRecordsChanged(prev, nextAiAgents) ? nextAiAgents : prev
      );
      setAuditLogs((prev) =>
        haveRecordsChanged(prev, nextAuditLogs) ? nextAuditLogs : prev
      );

      if (isSupabaseConfigured()) {
        syncFromRemote(false);
      }
    });

    const supabase = supabaseEnabled ? getSupabaseClient() : null;
    const authSubscription = supabase
      ? supabase.auth.onAuthStateChange((event, session) => {
          if (!isMounted) return;
          if (event === 'SIGNED_OUT') {
            supportAdapter.clearUserProfile();
            setCurrentUser(null);
            return;
          }
          if (
            session?.user &&
            (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')
          ) {
            syncFromRemote(false);
          }
        }).data.subscription
      : null;

    return () => {
      isMounted = false;
      if (safetyTimer !== null) window.clearTimeout(safetyTimer);
      authSubscription?.unsubscribe();
      unsubscribe();
    };
  }, [activeTicketCode]);

  const scrollToElement = (elementId: string) => {
    window.requestAnimationFrame(() => {
      const target = document.getElementById(elementId);
      if (!target) return;
      if (elementId === 'diagnostico') {
        const assistantCard = target.querySelector<HTMLElement>(
          '[data-testid="diagnostic-assistant-card"]'
        );
        const focusEl = assistantCard ?? target;
        const rect = focusEl.getBoundingClientRect();
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
        return;
      }
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleNavigateSection = (sectionId: string) => {
    if (activeView !== 'landing') {
      navigateToRoute('/', 'landing', null);
      window.setTimeout(() => scrollToElement(sectionId), 60);
    } else {
      scrollToElement(sectionId);
    }
  };

  const handleReturnHome = () => {
    navigateToRoute('/', 'landing', null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenTechnicianApply = () => {
    if (!FEATURE_FLAGS.ENABLE_TECHNICIAN_RECRUITMENT) {
      navigateToRoute('/', 'landing', null);
      return;
    }
    navigateToRoute('/postular', 'technician_apply', null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartDiagnostic = () => {
    setWizardErrors({});
    setWizardDraft((prev) => ({
      ...prev,
      step: 1,
      operatingSystem: prev.operatingSystem ?? 'Windows',
    }));
    setExternalTriageTrigger({
      id: Date.now(),
      symptom: '',
      openComposer: true,
    });
    if (activeView !== 'landing') {
      navigateToRoute('/', 'landing', null);
    }
  };

  const handleQuickStartSymptom = (payload: {
    symptom: string;
    category?: IssueCategory;
  }) => {
    const cleanSymptom = payload.symptom.trim();
    if (!cleanSymptom) {
      handleStartDiagnostic();
      return;
    }
    setWizardErrors({});
    setWizardDraft((prev) => ({
      ...prev,
      step: 1,
      category: payload.category ?? prev.category,
      operatingSystem: prev.operatingSystem ?? 'Windows',
    }));
    setExternalTriageTrigger({
      id: Date.now(),
      symptom: cleanSymptom,
      category: payload.category,
    });
    navigateToRoute('/', 'landing', null);
    scrollToElement('diagnostico');
  };

  const handleSelectCategoryFromLanding = (
    category: IssueCategory,
    serviceTier?: ServiceTier,
    billingMode: 'one_time' | 'pyme_monthly' = 'one_time'
  ) => {
    const resolvedTier: ServiceTier =
      serviceTier ??
      (billingMode === 'one_time' && wizardDraft.serviceTier.startsWith('Pyme')
        ? 'Express $15'
        : wizardDraft.serviceTier);
    const shouldLockTier = Boolean(serviceTier) || billingMode === 'pyme_monthly';
    setWizardErrors({});
    setWizardDraft((prev) => ({
      ...prev,
      step: 1,
      category,
      operatingSystem: prev.operatingSystem ?? 'Windows',
      serviceTier: resolvedTier,
      userLockedTier: shouldLockTier,
      billingMode,
    }));
    setExternalTriageTrigger({
      id: Date.now(),
      symptom:
        category !== 'Otro'
          ? `Necesito soporte técnico remoto para: ${category}.`
          : '',
      category,
      openComposer: true,
      preselectedTier: shouldLockTier ? resolvedTier : undefined,
      preselectedBillingMode: billingMode,
    });
    navigateToRoute('/', 'landing', null);
    scrollToElement('diagnostico');
  };

  const handleChangeWizardDraft = (patch: Partial<WizardDraft>) => {
    setWizardDraft((prev) => ({ ...prev, ...patch }));
  };

  const createTicketForOrganization = async (
    draft: WizardDraft,
    targetOrgId: string,
    options?: { operatorCreated?: boolean }
  ): Promise<SupportTicket | null> => {
    const targetOrg =
      organizations.find((o) => o.id === targetOrgId) ??
      organizations.find((o) => o.id === PUBLIC_PORTAL_ORG_ID) ??
      organizations[0];
    const resolvedOrgId = targetOrg?.id ?? targetOrgId;
    const newTicket = {
      ...createTicketFromDraft(draft, {
        organizationId: resolvedOrgId,
        organizationName: targetOrg?.name ?? 'Remote Support 365',
      }),
      consent_accepted: false,
      consent_accepted_at: null,
    };
    const result = await supportAdapter.persistTicket(newTicket, tickets, options);
    if (!result.ok) {
      setPersistenceError(
        result.error ?? 'No se pudo emitir el ticket. Intenta nuevamente.'
      );
      return null;
    }
    setPersistenceError(result.warning ?? null);
    setTickets(result.data);
    setAuditLogs(supportAdapter.loadAuditLogs());
    return newTicket;
  };

  const handleCreateQuickTicket = async (
    draft: WizardDraft
  ): Promise<SupportTicket | null> => {
    return createTicketForOrganization(draft, activeOrgId, { operatorCreated: true });
  };

  const handleSubmitTicket = async () => {
    const created = await createTicketForOrganization(
      wizardDraft,
      PUBLIC_PORTAL_ORG_ID
    );
    if (!created) return;
    navigateToRoute(
      `/sesion/${created.ticket_code}`,
      'connection_room',
      created.ticket_code
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getTicketScope = (ticketId: string) => {
    const t = tickets.find((item) => item.id === ticketId);
    return t
      ? { ticketCode: t.ticket_code, sessionToken: t.client_session_token }
      : undefined;
  };

  const handleMarkAgentDownloaded = async (
    ticketId: string,
    agentType: AgentInstallType
  ) => {
    const result = await supportAdapter.updateTicket(
      ticketId,
      { agent_downloaded: true, agent_type: agentType },
      tickets,
      getTicketScope(ticketId)
    );
    if (!result.ok) {
      setPersistenceError(result.error ?? 'Error al registrar descarga del agente.');
      return;
    }
    const updatedTicket = result.data.find((t) => t.id === ticketId);
    if (updatedTicket?.rustdesk_id) {
      setDevices((prev) =>
        supportAdapter.syncDeviceForTicket(updatedTicket, prev)
      );
    }
    setPersistenceError(null);
    setTickets(result.data);
  };

  const handleSaveRustDeskId = async (
    ticketId: string,
    rustdeskId: string,
    consentAccepted: boolean
  ): Promise<boolean> => {
    const result = await supportAdapter.updateTicket(
      ticketId,
      {
        rustdesk_id: rustdeskId,
        consent_accepted: consentAccepted,
        consent_accepted_at: consentAccepted ? new Date().toISOString() : null,
      },
      tickets,
      getTicketScope(ticketId)
    );
    if (!result.ok) {
      setPersistenceError(result.error ?? 'No se pudo guardar el ID de RustDesk.');
      return false;
    }
    const updatedTicket = result.data.find((t) => t.id === ticketId);
    if (updatedTicket) {
      setDevices((prev) =>
        supportAdapter.syncDeviceForTicket(updatedTicket, prev)
      );
      setAuditLogs(
        supportAdapter.appendAuditLog({
          organization_id: updatedTicket.organization_id,
          actor_type: 'client',
          actor_label: updatedTicket.client_name,
          action: 'Vinculó ID RustDesk 9 dígitos y aceptó consentimiento de acceso',
          target_ref: updatedTicket.ticket_code,
        })
      );
    }
    setPersistenceError(null);
    setTickets(result.data);
    return true;
  };

  const handleConfirmPayment = async (ticketId: string): Promise<boolean> => {
    const target = tickets.find((ticket) => ticket.id === ticketId);
    if (!target) {
      setPersistenceError('No se encontró el ticket para verificar el estado de pago.');
      return false;
    }

    if (isSupabaseConfigured()) {
      const isOperatorPortal = activeViewRef.current === 'tech_portal';
      const refreshed = await supportAdapter.syncFromSupabaseIfConfigured(
        isOperatorPortal ? undefined : { ticketCode: target.ticket_code }
      );
      const refreshedTicket = refreshed.data.tickets?.find(
        (ticket) => ticket.ticket_code === target.ticket_code
      );
      if (refreshed.ok && refreshed.data.tickets && refreshed.data.tickets.length > 0) {
        setTickets(refreshed.data.tickets);
      }
      if (refreshed.ok && refreshed.data.messages) {
        setMessages(refreshed.data.messages);
      }
      if (!refreshed.ok || !refreshedTicket || refreshedTicket.payment_status !== 'paid') {
        setPersistenceError(
          refreshed.error ??
            (isOperatorPortal
              ? 'El pago aún figura pendiente en el servidor. El cliente debe completar el checkout antes de iniciar la sesión.'
              : 'El pago aún no aparece confirmado por el webhook en el servidor. Intenta verificar nuevamente en unos segundos.')
        );
        return false;
      }
      setPersistenceError(null);
      return true;
    }

    const result = await supportAdapter.confirmPaymentAndReady(
      ticketId,
      tickets,
      getTicketScope(ticketId)
    );
    if (!result.ok) {
      setPersistenceError(result.error ?? 'El pago aún no está confirmado por webhook.');
      return false;
    }
    setPersistenceError(null);
    setTickets(result.data);
    return true;
  };

  const handleStartSession = async (ticketId: string) => {
    let target = tickets.find((t) => t.id === ticketId);
    let baseTickets = tickets;
    if (!target) {
      setPersistenceError('No se encontró el ticket seleccionado.');
      return;
    }

    if (isSupabaseConfigured()) {
      if (target.payment_status !== 'paid') {
        setPersistenceError('No se puede iniciar una sesión antes de verificar el pago.');
        return;
      }
      const supabase = getSupabaseClient();
      const { data: userData, error: userError } = supabase
        ? await supabase.auth.getUser()
        : { data: { user: null }, error: new Error('Cliente Supabase no disponible.') };
      const user = userData.user;
      if (userError || !user) {
        setPersistenceError('Inicia sesión con una cuenta técnica para comenzar.');
        return;
      }
      if (target.assigned_to && target.assigned_to !== user.id) {
        setPersistenceError('Este ticket ya está asignado a otro técnico.');
        return;
      }
      if (!target.assigned_to) {
        const member = members.find(
          (item) => item.user_id === user.id && item.organization_id === target?.organization_id
        );
        if (!member) {
          setPersistenceError('Tu cuenta no tiene una membresía activa para este ticket.');
          return;
        }
        const claim = await supportAdapter.claimTicketAtomically(
          ticketId,
          user.id,
          member.full_name,
          member.specialties.join(' · '),
          tickets
        );
        if (!claim.ok) {
          setPersistenceError(claim.error ?? 'No se pudo reclamar el ticket.');
          return;
        }
        setTickets(claim.data);
        baseTickets = claim.data;
        target = claim.data.find((item) => item.id === ticketId) ?? target;
      }
    }

    const patch: Partial<SupportTicket> = { status: 'in_progress' };
    if (!isSupabaseConfigured()) {
      const orgMember =
        members.find((m) => m.organization_id === (target?.organization_id ?? activeOrgId)) ??
        members[0];
      patch.assigned_to = target.assigned_to ?? orgMember?.user_id ?? '30000000-0000-4000-8000-000000000001';
      patch.assigned_technician_id = patch.assigned_to;
      patch.assigned_technician_name = target.assigned_technician_name ?? orgMember?.full_name ?? 'Carlos Mendoza';
      patch.assigned_technician_specialty = target.assigned_technician_specialty ??
        (orgMember && Array.isArray(orgMember.specialties)
          ? orgMember.specialties.join(' · ')
          : 'Windows & BSOD · Microsoft 365 & Outlook · Redes & VPN');
      patch.claimed_at = target.claimed_at ?? new Date().toISOString();
    }
    const result = await supportAdapter.updateTicket(
      ticketId,
      patch,
      baseTickets
    );
    if (!result.ok) {
      setPersistenceError(result.error ?? 'Error al iniciar la sesión.');
      return;
    }
    const updatedTicket = result.data.find((t) => t.id === ticketId);
    if (updatedTicket) {
      setSessions((prev) =>
        supportAdapter.syncSessionForTicket(updatedTicket, prev)
      );
      if (updatedTicket.rustdesk_id) {
        setDevices((prev) =>
          supportAdapter.syncDeviceForTicket(updatedTicket, prev)
        );
      }
    }
    setPersistenceError(null);
    setTickets(result.data);
  };

  const handleClaimTicketAtomically = async (
    ticketId: string,
    techId: string,
    techName: string,
    techSpecialty: string
  ) => {
    const result = await supportAdapter.claimTicketAtomically(
      ticketId,
      techId,
      techName,
      techSpecialty,
      tickets
    );
    if (!result.ok) {
      setPersistenceError(result.error ?? 'No se pudo reclamar el ticket.');
      return;
    }
    const updatedTicket = result.data.find((t) => t.id === ticketId);
    if (updatedTicket) {
      setSessions((prev) =>
        supportAdapter.syncSessionForTicket(updatedTicket, prev)
      );
    }
    setPersistenceError(null);
    setTickets(result.data);
    setAuditLogs(supportAdapter.loadAuditLogs());
  };

  const handleMarkHumanReviewed = async (
    ticketId: string,
    reviewerName?: string
  ) => {
    const target = tickets.find((t) => t.id === ticketId);
    const nowIso = new Date().toISOString();
    const reviewedBy =
      reviewerName?.trim() ||
      target?.assigned_technician_name ||
      'Especialista de soporte';
    const result = await supportAdapter.updateTicket(
      ticketId,
      {
        human_reviewed_at: nowIso,
        human_reviewed_by: reviewedBy,
      },
      tickets
    );
    if (!result.ok) {
      setPersistenceError(
        result.error ?? 'No se pudo registrar la revisión del especialista.'
      );
      return;
    }
    if (target) {
      setAuditLogs(
        supportAdapter.appendAuditLog({
          organization_id: target.organization_id,
          actor_type: 'technician',
          actor_label: reviewedBy,
          action: 'Validó manualmente el pre-diagnóstico del ticket',
          target_ref: target.ticket_code,
        })
      );
    }
    setPersistenceError(null);
    setTickets(result.data);
  };

  const handleResolveTicket = async (ticketId: string, resolutionNotes: string) => {
    const target = tickets.find((t) => t.id === ticketId);
    const nowIso = new Date().toISOString();
    const reviewer =
      target?.human_reviewed_by ??
      target?.assigned_technician_name ??
      'Especialista de soporte';
    const result = await supportAdapter.updateTicket(
      ticketId,
      {
        status: 'resolved',
        resolution_notes: resolutionNotes,
        resolved_at: nowIso,
        human_reviewed_at: target?.human_reviewed_at ?? nowIso,
        human_reviewed_by: reviewer,
      },
      tickets
    );
    if (!result.ok) {
      setPersistenceError(result.error ?? 'No se pudo cerrar el ticket.');
      return;
    }
    const updatedTicket = result.data.find((t) => t.id === ticketId);
    if (updatedTicket) {
      setSessions((prev) =>
        supportAdapter.syncSessionForTicket(updatedTicket, prev)
      );
    }
    if (target) {
      setAuditLogs(
        supportAdapter.appendAuditLog({
          organization_id: target.organization_id,
          actor_type: 'technician',
          actor_label: reviewer,
          action: 'Revisó y cerró la sesión remota con informe final',
          target_ref: target.ticket_code,
        })
      );
    }
    setPersistenceError(null);
    setTickets(result.data);
  };

  const handleReopenTicket = async (ticketId: string) => {
    const result = await supportAdapter.updateTicket(
      ticketId,
      { status: 'in_progress', resolved_at: null },
      tickets
    );
    if (!result.ok) {
      setPersistenceError(result.error ?? 'No se pudo reabrir el ticket.');
      return;
    }
    const updatedTicket = result.data.find((t) => t.id === ticketId);
    if (updatedTicket) {
      setSessions((prev) =>
        supportAdapter.syncSessionForTicket(updatedTicket, prev)
      );
    }
    setPersistenceError(null);
    setTickets(result.data);
  };

  const handleSendMessage = async (
    ticketId: string,
    role: 'client' | 'technician',
    text: string
  ) => {
    const result = await supportAdapter.appendMessage(
      ticketId,
      role,
      text,
      messages,
      role === 'client' ? getTicketScope(ticketId) : undefined
    );
    if (!result.ok) {
      setPersistenceError(result.error ?? 'No se pudo enviar el mensaje.');
      return;
    }
    setPersistenceError(null);
    setMessages(result.data);
  };

  const handleUpdateMemberAvailability = (
    memberId: string,
    patch: Partial<{
      availability_status: TechnicianAvailability;
      specialties: TechnicianSpecialty[];
      accepting_requests: boolean;
    }>
  ) => {
    const next = supportAdapter.updateMemberAvailability(memberId, patch, members);
    setMembers(next);
  };

  const handleChangeDispatchMode = (mode: DispatchMode) => {
    const next = supportAdapter.updateOrganizationSettings(
      activeOrgId,
      { dispatch_mode: mode },
      organizations
    );
    setOrganizations(next);
  };

  const handleInviteMember = (input: {
    full_name: string;
    email: string;
    member_type: MemberTierType;
    agreed_ticket_rate_usd: number;
    specialties: TechnicianSpecialty[];
  }) => {
    const next = supportAdapter.inviteMember(
      { ...input, organization_id: activeOrgId },
      members
    );
    setMembers(next);
    setAuditLogs(supportAdapter.loadAuditLogs());
  };

  const handleToggleAiAgent = (agentId: string) => {
    const next = aiAgents.map((a) =>
      a.id === agentId ? { ...a, is_enabled: !a.is_enabled } : a
    );
    supportAdapter.saveAiAgents(next);
    setAiAgents(next);
  };

  const handleToggleAiGovernanceRule = (agentId: string, ruleId: string) => {
    const next = aiAgents.map((a) => {
      if (a.id !== agentId) return a;
      return {
        ...a,
        governance_rules: a.governance_rules.map((r) =>
          r.id === ruleId ? { ...r, enabled: !r.enabled } : r
        ),
      };
    });
    supportAdapter.saveAiAgents(next);
    setAiAgents(next);
  };

  const handleSaveOrgSettings = (
    patch: Partial<
      Pick<Organization, 'name' | 'rustdesk_relay_domain' | 'payment_gateway'>
    >
  ) => {
    const next = supportAdapter.updateOrganizationSettings(
      activeOrgId,
      patch,
      organizations
    );
    setOrganizations(next);
  };

  const handleResetToNewTicket = () => {
    setWizardDraft(INITIAL_WIZARD_DRAFT);
    setWizardErrors({});
    navigateToRoute('/', 'landing', null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitEnterpriseLead = (lead: {
    companyName: string;
    contactEmail: string;
    teamSize: string;
    planInterest?: string;
  }) => {
    supportAdapter.persistEnterpriseLead({
      id: `LEAD-${Date.now()}`,
      ...lead,
      createdAt: new Date().toISOString(),
    });
  };

  const handleAuthenticated = (profile: UserAccountProfile) => {
    supportAdapter.saveUserProfile(profile);
    setCurrentUser(profile);
    setAuditLogs(
      supportAdapter.appendAuditLog({
        organization_id: activeOrgId,
        actor_type: profile.role === 'client' ? 'client' : 'technician',
        actor_label: profile.full_name,
        action: `Acceso autenticado (+18 verificado · ${profile.terms_version})`,
        target_ref: profile.email,
      })
    );
  };

  const handleSignOutAccount = () => {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (supabase) {
        void supabase.auth.signOut();
      }
    }
    supportAdapter.clearUserProfile();
    setCurrentUser(null);
  };

  const handleExportClientData = (ticketId: string, verifiedExportPayload?: unknown) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket || !verifiedExportPayload) {
      setPersistenceError('Se requiere verificación por código OTP enviado al correo para descargar tus datos.');
      return;
    }
    triggerJsonDownload(
      `datos-rs365-${ticket.ticket_code}.json`,
      JSON.stringify(verifiedExportPayload, null, 2)
    );
  };

  const handleExportUserOrOrgData = (verifiedExportPayload?: unknown) => {
    if (!verifiedExportPayload) {
      setPersistenceError('Se requiere verificación por código OTP enviado al correo para exportar datos.');
      return;
    }
    triggerJsonDownload(
      `portabilidad-rs365-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(verifiedExportPayload, null, 2)
    );
  };

  const handleAnonymizeClientData = async (
    ticketId: string,
    anonymizedAt?: string
  ): Promise<boolean> => {
    if (!anonymizedAt) {
      setPersistenceError('Se requiere verificación por código OTP enviado al correo para eliminar tus datos.');
      return false;
    }
    const target = tickets.find((t) => t.id === ticketId);
    const next = tickets.map((t) =>
      t.id === ticketId
        ? {
            ...t,
            client_name: 'Usuario Anonimizado',
            client_email: 'eliminado@anonimizado.invalid',
            client_birth_date: null,
            rustdesk_id: null,
            marketing_opt_in: false,
            anonymized_at: anonymizedAt,
          }
        : t
    );
    supportAdapter.saveTickets(next);
    setTickets(next);
    if (target) {
      supportAdapter.appendAuditLog({
        organization_id: target.organization_id,
        actor_type: 'client',
        actor_label: 'Titular de Datos (OTP Verificado)',
        action: 'Solicitó eliminación y anonimización de datos personales verificada por OTP',
        target_ref: target.ticket_code,
      });
    }
    setPersistenceError(null);
    setAuditLogs(supportAdapter.loadAuditLogs());
    return true;
  };

  const handleDeletePersonalData = async (verified?: boolean) => {
    if (!verified) {
      setPersistenceError('Se requiere verificación por código OTP enviado al correo para eliminar datos personales.');
      return;
    }
    const actorLabel = currentUser?.full_name ?? 'Usuario / Operador';
    const nowIso = new Date().toISOString();
    if (currentUser) {
      const normalizedEmail = String(currentUser.email ?? '').toLowerCase();
      const next = tickets.map((t) =>
        String(t?.client_email ?? '').toLowerCase() === normalizedEmail
          ? {
              ...t,
              client_name: 'Usuario Anonimizado',
              client_email: 'eliminado@anonimizado.invalid',
              client_birth_date: null,
              rustdesk_id: null,
              marketing_opt_in: false,
              anonymized_at: nowIso,
            }
          : t
      );
      supportAdapter.saveTickets(next);
      setTickets(next);
    }
    setAuditLogs(
      supportAdapter.appendAuditLog({
        organization_id: activeOrgId,
        actor_type: 'client',
        actor_label: actorLabel,
        action:
          'Solicitó eliminación y anonimización de datos personales verificada por OTP',
        target_ref: currentUser?.email ?? activeOrgId,
      })
    );
    handleSignOutAccount();
  };

  const lazyFallback = (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[60vh] flex items-center justify-center bg-[#F8FAFC] px-4 py-16"
    >
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 shadow-xs text-center space-y-1">
        <p className="text-sm font-semibold text-[#0B192C]">
          Cargando módulo seguro...
        </p>
        <p className="text-xs text-slate-600">
          Preparando la interfaz de Remote Support 365.
        </p>
      </div>
    </div>
  );

  const sharedOverlays = (
    <>
      {legalDocTab !== null && (
        <Suspense fallback={null}>
          <LegalDocsModal
            isOpen={true}
            activeTab={legalDocTab}
            onSelectTab={setLegalDocTab}
            onClose={() => setLegalDocTab(null)}
          />
        </Suspense>
      )}
      {activeView !== 'tech_portal' && (
        <CookieConsentBanner
          isOpen={cookieBannerOpen}
          onClose={() => setCookieBannerOpen(false)}
          onOpenPrivacyPolicy={() => setLegalDocTab('privacy')}
        />
      )}
      {authModalOpen && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={true}
            currentUser={currentUser}
            onClose={() => setAuthModalOpen(false)}
            onAuthenticated={handleAuthenticated}
            onSignOut={handleSignOutAccount}
            onOpenLegalDoc={setLegalDocTab}
            onExportUserData={handleExportUserOrOrgData}
            onDeleteUserData={handleDeletePersonalData}
          />
        </Suspense>
      )}
      {ticketLookupOpen && (
        <Suspense fallback={null}>
          <TicketLookupModal
            isOpen={true}
            recentTickets={tickets.filter(
              (t) =>
                Boolean(t.client_session_token) &&
                t.organization_id === PUBLIC_PORTAL_ORG_ID
            )}
            onClose={() => setTicketLookupOpen(false)}
            onSelectTicketCode={(ticketCode) => {
              setTicketLookupOpen(false);
              navigateToRoute(
                `/sesion/${ticketCode}`,
                'connection_room',
                ticketCode
              );
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </Suspense>
      )}
    </>
  );

  if (activeView === 'tech_portal') {
    return (
      <>
        <Suspense fallback={lazyFallback}>
          <TechPortalView
            organizations={organizations}
            activeOrgId={activeOrgId}
            onSelectOrg={setActiveOrgId}
            tickets={tickets}
            messages={messages}
            members={members}
            devices={devices}
            sessions={sessions}
            aiAgents={aiAgents}
            auditLogs={auditLogs}
            persistenceError={persistenceError}
            onDismissPersistenceError={() => setPersistenceError(null)}
            onStartSession={handleStartSession}
            onMarkPaymentPaid={handleConfirmPayment}
            onMarkHumanReviewed={handleMarkHumanReviewed}
            onResolveTicket={handleResolveTicket}
            onReopenTicket={handleReopenTicket}
            onSendTechnicianMessage={(ticketId, text) =>
              handleSendMessage(ticketId, 'technician', text)
            }
            onInspectConnectionRoom={(ticket) => {
              navigateToRoute(
                `/sesion/${ticket.ticket_code}`,
                'connection_room',
                ticket.ticket_code
              );
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onClaimTicketAtomically={handleClaimTicketAtomically}
            onUpdateMemberAvailability={handleUpdateMemberAvailability}
            onChangeDispatchMode={handleChangeDispatchMode}
            onInviteMember={handleInviteMember}
            onToggleAiAgent={handleToggleAiAgent}
            onToggleAiGovernanceRule={handleToggleAiGovernanceRule}
            onSaveOrgSettings={handleSaveOrgSettings}
            onCreateQuickTicket={handleCreateQuickTicket}
            onOpenPublicPortal={handleReturnHome}
            onOpenLegalDoc={setLegalDocTab}
            onExportOrgData={handleExportUserOrOrgData}
            onDeletePersonalData={handleDeletePersonalData}
          />
        </Suspense>
        {sharedOverlays}
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8FB] text-slate-900">
      <Header
        activeView={activeView}
        currentUser={currentUser}
        onNavigateSection={handleNavigateSection}
        onOpenTechPortal={() => {
          navigateToRoute('/dashboard', 'tech_portal', null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onOpenTicketLookup={() => setTicketLookupOpen(true)}
        onOpenTechnicianApply={handleOpenTechnicianApply}
        onReturnHome={handleReturnHome}
      />

      <main className="flex-1">
        {activeView === 'landing' && (
          <>
            <StickySectionNav />
            <div
              ref={heroSectionRef}
              data-section-id="hero"
              className={`transition-all duration-1000 ease-out will-change-[opacity,transform] ${
                visibleSections.hero ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6'
              }`}
            >
              <HeroSection
                onStartDiagnostic={handleStartDiagnostic}
                onHowItWorks={() => handleNavigateSection('como-funciona')}
                onQuickStartSymptom={handleQuickStartSymptom}
              />
            </div>
            <div
              ref={wizardSectionRef}
              data-section-id="wizard"
              className={`transition-all duration-1000 ease-out will-change-[opacity,transform] ${
                visibleSections.wizard ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8'
              }`}
            >
              <ScrollReveal direction="up">
                <DiagnosticWizard
                  draft={wizardDraft}
                  errors={wizardErrors}
                  persistenceError={persistenceError}
                  aiAgents={aiAgents.filter(
                    (a) => a.organization_id === PUBLIC_PORTAL_ORG_ID
                  )}
                  externalTrigger={externalTriageTrigger}
                  onChangeDraft={handleChangeWizardDraft}
                  onSetErrors={setWizardErrors}
                  onSubmitTicket={handleSubmitTicket}
                  onOpenLegalDoc={setLegalDocTab}
                  onOpenTicketLookup={() => setTicketLookupOpen(true)}
                />
              </ScrollReveal>
            </div>
            <div
              ref={landingSectionRef}
              data-section-id="landing"
              className={`transition-all duration-1000 ease-out will-change-[opacity,transform] ${
                visibleSections.landing ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8'
              }`}
            >
              <ScrollReveal direction="up">
                <LandingSections
                  onSelectCategoryForWizard={handleSelectCategoryFromLanding}
                  onSubmitEnterpriseLead={handleSubmitEnterpriseLead}
                  onStartDiagnostic={handleStartDiagnostic}
                  onOpenTechnicianApply={handleOpenTechnicianApply}
                />
              </ScrollReveal>
            </div>
            <div
              ref={faqSectionRef}
              data-section-id="faq"
              className={`transition-all duration-1000 ease-out will-change-[opacity,transform] ${
                visibleSections.faq ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8'
              }`}
            >
              <ScrollReveal direction="up">
                <FaqSection />
              </ScrollReveal>
            </div>
          </>
        )}

        {activeView === 'technician_apply' &&
          FEATURE_FLAGS.ENABLE_TECHNICIAN_RECRUITMENT && (
            <Suspense fallback={lazyFallback}>
              <TechnicianApplyView
                onReturnHome={handleReturnHome}
                onOpenLegalDoc={setLegalDocTab}
              />
            </Suspense>
          )}

        {activeView === 'technician_register' && (
          <Suspense fallback={lazyFallback}>
            <TechnicianRegisterView
              onReturnHome={handleReturnHome}
              onOpenLegalDoc={setLegalDocTab}
              onRegistered={({ profile, specialties }) => {
                handleAuthenticated(profile);
                if (specialties && specialties.length > 0) {
                  setMembers((prev) => {
                    if (prev.some((m) => m.email.toLowerCase() === profile.email.toLowerCase())) {
                      return prev;
                    }
                    const nextMember: OrganizationMember = {
                      id: profile.id,
                      organization_id: PUBLIC_PORTAL_ORG_ID,
                      user_id: profile.id,
                      full_name: profile.full_name,
                      email: profile.email,
                      member_type: 'network',
                      role: 'technician',
                      agreed_ticket_rate_usd: 15,
                      status: 'active',
                      specialties,
                      availability_status: 'offline',
                      accepting_requests: false,
                      rating: 5.0,
                      resolved_count: 0,
                    };
                    const next = [nextMember, ...prev];
                    supportAdapter.saveMembers(next);
                    return next;
                  });
                }
                window.setTimeout(() => {
                  navigateToRoute('/dashboard', 'tech_portal', null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 900);
              }}
            />
          </Suspense>
        )}

        {activeView === 'connection_room' && (
          roomAccessState === 'checking' || (!activeTicket && isHydratingSession) ? (
            <section className="py-16 bg-[#F8FAFC] min-h-[calc(100vh-12rem)]">
              <div className="max-w-xl mx-auto px-4 text-center space-y-3 bg-white border border-slate-200 rounded-xl p-8">
                <p className="text-sm font-semibold text-[#0B192C]">
                  Verificando autorización de la Sala {activeTicketCode}...
                </p>
                <p className="text-xs text-slate-600">
                  Validando el token privado de sesión en el servidor.
                </p>
              </div>
            </section>
          ) : roomAccessState === 'authorized' && activeTicket ? (
            <Suspense fallback={lazyFallback}>
              <ConnectionRoom
                ticket={activeTicket}
                messages={activeTicketMessages}
                persistenceError={persistenceError}
                onDismissError={() => setPersistenceError(null)}
                onMarkAgentDownloaded={handleMarkAgentDownloaded}
                onSaveRustDeskId={handleSaveRustDeskId}
                onConfirmPayment={handleConfirmPayment}
                onSendClientMessage={(ticketId, text) =>
                  handleSendMessage(ticketId, 'client', text)
                }
                onResetToNewTicket={handleResetToNewTicket}
                onOpenLegalDoc={setLegalDocTab}
                onExportClientData={handleExportClientData}
                onAnonymizeClientData={handleAnonymizeClientData}
              />
            </Suspense>
          ) : (
            <section
              data-testid="room-access-denied"
              className="py-16 bg-[#F8FAFC] min-h-[calc(100vh-12rem)]"
            >
              <div className="max-w-xl mx-auto px-4 text-center space-y-4 bg-white border border-slate-200 rounded-xl p-8">
                <h1 className="text-lg font-bold text-[#0B192C]">
                  Acceso denegado · Token de sala inválido o faltante
                </h1>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {roomAccessError ??
                    `No se pudo verificar el token privado para la sala ${activeTicketCode ?? 'solicitada'}. Abre el enlace completo enviado a tu correo o inicia una nueva solicitud.`}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleResetToNewTicket}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors"
                  >
                    Volver al Portal de Clientes
                  </button>
                </div>
              </div>
            </section>
          )
        )}
      </main>

      <Footer
        onNavigateSection={handleNavigateSection}
        onOpenLegalDoc={setLegalDocTab}
        onOpenCookieSettings={() => setCookieBannerOpen(true)}
        onOpenTechnicianApply={handleOpenTechnicianApply}
      />
      {sharedOverlays}
    </div>
  );
}
