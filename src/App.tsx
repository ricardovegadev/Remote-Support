import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { ConnectionRoom } from './components/ConnectionRoom';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import {
  DiagnosticWizard,
  type ExternalTriageTrigger,
} from './components/DiagnosticWizard';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { LandingSections } from './components/LandingSections';
import { LegalDocsModal, type LegalDocTab } from './components/LegalDocsModal';
import { TechPortalView } from './components/TechPortalView';
import { getSupabaseClient, isSupabaseConfigured } from './lib/supabaseClient';
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

export default function App() {
  const initialRoute =
    typeof window !== 'undefined'
      ? parseAppRoute(window.location.pathname)
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
  const [activeTicketCode, setActiveTicketCode] = useState<string | null>(
    initialRoute.ticketCode
  );
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<UserAccountProfile | null>(() =>
    supportAdapter.loadUserProfile()
  );
  const [legalDocTab, setLegalDocTab] = useState<LegalDocTab | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [cookieBannerOpen, setCookieBannerOpen] = useState<boolean>(
    () => typeof window !== 'undefined' && !readCookieConsent()
  );

  const [isHydratingSession, setIsHydratingSession] = useState<boolean>(false);
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

  const activeTicket =
    matchedTicket ?? (!activeTicketCode ? tickets[0] ?? null : null);

  const activeTicketMessages = activeTicket
    ? messages.filter((msg) => msg.ticket_id === activeTicket.id)
    : [];

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
      const parsed = parseAppRoute(window.location.pathname);
      setActiveView(parsed.view);
      setActiveTicketCode(parsed.ticketCode);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

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

    return () => {
      isMounted = false;
      if (safetyTimer !== null) window.clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, [activeTicketCode]);

  const scrollToElement = (elementId: string) => {
    window.requestAnimationFrame(() => {
      const target = document.getElementById(elementId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  const handleNavigateSection = (sectionId: string) => {
    if (activeView !== 'landing') {
      navigateToRoute('/portal', 'landing', null);
      window.setTimeout(() => scrollToElement(sectionId), 60);
    } else {
      scrollToElement(sectionId);
    }
  };

  const handleReturnHome = () => {
    navigateToRoute('/portal', 'landing', null);
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
    navigateToRoute('/portal', 'landing', null);
    scrollToElement('diagnostico');
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
    navigateToRoute('/portal', 'landing', null);
    scrollToElement('diagnostico');
  };

  const handleSelectCategoryFromLanding = (
    category: IssueCategory,
    serviceTier?: ServiceTier,
    billingMode: 'one_time' | 'pyme_monthly' = 'one_time'
  ) => {
    setWizardErrors({});
    setWizardDraft((prev) => ({
      ...prev,
      step: 1,
      category,
      operatingSystem: prev.operatingSystem ?? 'Windows',
      serviceTier:
        serviceTier ??
        (billingMode === 'one_time' && prev.serviceTier.startsWith('Pyme')
          ? 'Express $15'
          : prev.serviceTier),
      billingMode,
    }));
    if (category !== 'Otro') {
      setExternalTriageTrigger({
        id: Date.now(),
        symptom: `Necesito soporte técnico remoto para: ${category}.`,
        category,
      });
    }
    navigateToRoute('/portal', 'landing', null);
    scrollToElement('diagnostico');
  };

  const handleChangeWizardDraft = (patch: Partial<WizardDraft>) => {
    setWizardDraft((prev) => ({ ...prev, ...patch }));
  };

  const handleCreateQuickTicket = async (
    draft: WizardDraft
  ): Promise<SupportTicket | null> => {
    const targetOrg =
      organizations.find((o) => o.id === activeOrgId) ?? organizations[0];
    const newTicket = createTicketFromDraft(draft, {
      organizationId: targetOrg?.id,
      organizationName: targetOrg?.name,
    });
    const result = await supportAdapter.persistTicket(newTicket, tickets);
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

  const handleSubmitTicket = async () => {
    const created = await handleCreateQuickTicket(wizardDraft);
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
  ) => {
    const target = tickets.find((t) => t.id === ticketId);
    const nextStatus =
      target && target.status === 'waiting_payment'
        ? 'ready_to_connect'
        : target?.status ?? 'ready_to_connect';

    const result = await supportAdapter.updateTicket(
      ticketId,
      {
        rustdesk_id: rustdeskId,
        consent_accepted: consentAccepted,
        consent_accepted_at: consentAccepted ? new Date().toISOString() : null,
        status: nextStatus,
      },
      tickets,
      getTicketScope(ticketId)
    );
    if (!result.ok) {
      setPersistenceError(result.error ?? 'No se pudo guardar el ID de RustDesk.');
      return;
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
  };

  const handleConfirmPayment = async (ticketId: string) => {
    const result = await supportAdapter.confirmPaymentAndReady(
      ticketId,
      tickets,
      getTicketScope(ticketId)
    );
    if (!result.ok) {
      setPersistenceError(result.error ?? 'Error al confirmar el pago.');
      return;
    }
    setPersistenceError(null);
    setTickets(result.data);
  };

  const handleStartSession = async (ticketId: string) => {
    const target = tickets.find((t) => t.id === ticketId);
    const nowIso = new Date().toISOString();
    const orgMember =
      members.find((m) => m.organization_id === (target?.organization_id ?? activeOrgId)) ??
      members[0];
    const techId =
      target?.assigned_to ??
      orgMember?.user_id ??
      '30000000-0000-4000-8000-000000000001';
    const techName =
      target?.assigned_technician_name ?? orgMember?.full_name ?? 'Carlos Mendoza';
    const techSpecialty =
      target?.assigned_technician_specialty ??
      (orgMember && Array.isArray(orgMember.specialties)
        ? orgMember.specialties.join(' · ')
        : 'Windows & BSOD · Microsoft 365 & Outlook · Redes & VPN');

    const result = await supportAdapter.updateTicket(
      ticketId,
      {
        status: 'in_progress',
        assigned_to: techId,
        assigned_technician_id: techId,
        assigned_technician_name: techName,
        assigned_technician_specialty: techSpecialty,
        claimed_at: target?.claimed_at ?? nowIso,
      },
      tickets
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

  const handleResolveTicket = async (ticketId: string, resolutionNotes: string) => {
    const target = tickets.find((t) => t.id === ticketId);
    const result = await supportAdapter.updateTicket(
      ticketId,
      {
        status: 'resolved',
        payment_status: 'paid',
        resolution_notes: resolutionNotes,
        resolved_at: new Date().toISOString(),
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
          actor_type: 'ai_agent',
          actor_label: 'AI Report Generator',
          action: 'Emitió informe técnico final y cerró la sesión remota',
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
    navigateToRoute('/portal', 'landing', null);
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

  const handleExportClientData = (ticketId: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    const ticketMsgs = messages.filter((m) => m.ticket_id === ticketId);
    const ticketLogs = auditLogs.filter(
      (l) => l.target_ref === ticket.ticket_code
    );
    const jsonPayload = supportAdapter.buildClientDataExportPayload({
      ticket,
      messages: ticketMsgs,
      auditLogs: ticketLogs,
      userProfile: currentUser,
    });
    triggerJsonDownload(`datos-rs365-${ticket.ticket_code}.json`, jsonPayload);
  };

  const handleExportUserOrOrgData = () => {
    const activeOrg =
      organizations.find((o) => o.id === activeOrgId) ?? organizations[0];
    const orgTickets = tickets.filter((t) => t.organization_id === activeOrgId);
    const matchingUserTickets = currentUser
      ? tickets.filter(
          (t) =>
            String(t?.client_email ?? '').toLowerCase() ===
            String(currentUser.email ?? '').toLowerCase()
        )
      : orgTickets;
    const exportPayload = JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        platform: 'Remote Support 365',
        legal_framework: 'GDPR / LOPDP - Portabilidad de Datos (JSON)',
        user_profile: currentUser,
        organization: activeOrg,
        tickets: matchingUserTickets,
        cookie_preferences: readCookieConsent(),
        audit_logs: auditLogs.filter((l) => l.organization_id === activeOrgId),
      },
      null,
      2
    );
    triggerJsonDownload(
      `portabilidad-rs365-${new Date().toISOString().slice(0, 10)}.json`,
      exportPayload
    );
  };

  const handleAnonymizeClientData = async (ticketId: string) => {
    const result = await supportAdapter.anonymizeTicketClientData(
      ticketId,
      tickets,
      getTicketScope(ticketId)
    );
    if (!result.ok) {
      setPersistenceError(
        result.error ?? 'No se pudieron anonimizar los datos personales.'
      );
      return;
    }
    setPersistenceError(null);
    setTickets(result.data);
    setAuditLogs(supportAdapter.loadAuditLogs());
  };

  const handleCancelTicketSubscription = async (ticketId: string) => {
    const result = await supportAdapter.cancelTicketSubscription(
      ticketId,
      tickets,
      getTicketScope(ticketId)
    );
    if (!result.ok) {
      setPersistenceError(
        result.error ?? 'No se pudo cancelar la renovación automática.'
      );
      return;
    }
    setPersistenceError(null);
    setTickets(result.data);
    setAuditLogs(supportAdapter.loadAuditLogs());
  };

  const handleCancelOrgAutoRenew = () => {
    const next = supportAdapter.cancelOrganizationAutoRenew(
      activeOrgId,
      organizations,
      currentUser?.full_name ?? 'Administrador Org'
    );
    setOrganizations(next);
    setAuditLogs(supportAdapter.loadAuditLogs());
  };

  const handleDeletePersonalData = () => {
    const actorLabel = currentUser?.full_name ?? 'Usuario / Operador';
    if (currentUser) {
      const matchingIds = tickets
        .filter(
          (t) =>
            String(t?.client_email ?? '').toLowerCase() ===
            String(currentUser.email ?? '').toLowerCase()
        )
        .map((t) => t.id);
      for (const id of matchingIds) {
        void handleAnonymizeClientData(id);
      }
    }
    setAuditLogs(
      supportAdapter.appendAuditLog({
        organization_id: activeOrgId,
        actor_type: 'client',
        actor_label: actorLabel,
        action:
          'Solicitó eliminación y anonimización de datos personales de cuenta',
        target_ref: currentUser?.email ?? activeOrgId,
      })
    );
    handleSignOutAccount();
  };

  const sharedOverlays = (
    <>
      <LegalDocsModal
        isOpen={legalDocTab !== null}
        activeTab={legalDocTab ?? 'privacy'}
        onSelectTab={setLegalDocTab}
        onClose={() => setLegalDocTab(null)}
      />
      <CookieConsentBanner
        isOpen={cookieBannerOpen}
        onClose={() => setCookieBannerOpen(false)}
        onOpenPrivacyPolicy={() => setLegalDocTab('privacy')}
      />
      <AuthModal
        isOpen={authModalOpen}
        currentUser={currentUser}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
        onSignOut={handleSignOutAccount}
        onOpenLegalDoc={setLegalDocTab}
        onExportUserData={handleExportUserOrOrgData}
        onDeleteUserData={handleDeletePersonalData}
        onCancelUserSubscription={handleCancelOrgAutoRenew}
      />
    </>
  );

  if (activeView === 'tech_portal') {
    return (
      <>
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
          onCancelOrgAutoRenew={handleCancelOrgAutoRenew}
          onExportOrgData={handleExportUserOrOrgData}
          onDeletePersonalData={handleDeletePersonalData}
        />
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
        onReturnHome={handleReturnHome}
      />

      <main className="flex-1">
        {activeView === 'landing' && (
          <>
            {persistenceError && (
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <div
                  role="alert"
                  className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-center justify-between gap-4 text-xs text-red-900"
                >
                  <span className="font-medium">{persistenceError}</span>
                  <button
                    type="button"
                    onClick={() => setPersistenceError(null)}
                    className="font-semibold underline shrink-0"
                  >
                    Ocultar
                  </button>
                </div>
              </div>
            )}
            <HeroSection
              onStartDiagnostic={handleStartDiagnostic}
              onHowItWorks={() => handleNavigateSection('como-funciona')}
              onQuickStartSymptom={handleQuickStartSymptom}
            />
            <DiagnosticWizard
              draft={wizardDraft}
              errors={wizardErrors}
              persistenceError={persistenceError}
              aiAgents={
                aiAgents.some((a) => a.organization_id === activeOrgId)
                  ? aiAgents.filter((a) => a.organization_id === activeOrgId)
                  : aiAgents
              }
              externalTrigger={externalTriageTrigger}
              onChangeDraft={handleChangeWizardDraft}
              onSetErrors={setWizardErrors}
              onSubmitTicket={handleSubmitTicket}
              onOpenLegalDoc={setLegalDocTab}
            />
            <LandingSections
              onSelectCategoryForWizard={handleSelectCategoryFromLanding}
              onSubmitEnterpriseLead={handleSubmitEnterpriseLead}
              onStartDiagnostic={handleStartDiagnostic}
            />
          </>
        )}

        {activeView === 'connection_room' && (
          activeTicket ? (
            <ConnectionRoom
              ticket={activeTicket}
              messages={activeTicketMessages}
              relayDomain={
                organizations.find((o) => o.id === activeTicket.organization_id)
                  ?.rustdesk_relay_domain ?? 'relay.remotesupport365.com'
              }
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
              onCancelTicketSubscription={handleCancelTicketSubscription}
            />
          ) : isHydratingSession ? (
            <section className="py-16 bg-[#F8FAFC] min-h-[calc(100vh-12rem)]">
              <div className="max-w-xl mx-auto px-4 text-center space-y-3 bg-white border border-slate-200 rounded-xl p-8">
                <p className="text-sm font-semibold text-[#0B192C]">
                  Sincronizando Sala de Conexión {activeTicketCode}...
                </p>
                <p className="text-xs text-slate-600">
                  Verificando el estado del ticket y el comprobante de pago.
                </p>
              </div>
            </section>
          ) : (
            <section className="py-16 bg-[#F8FAFC] min-h-[calc(100vh-12rem)]">
              <div className="max-w-xl mx-auto px-4 text-center space-y-4 bg-white border border-slate-200 rounded-xl p-8">
                <h1 className="text-lg font-bold text-[#0B192C]">
                  No encontramos la sala {activeTicketCode ?? 'solicitada'} en este navegador
                </h1>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Si abriste el enlace desde otra sesión o limpiaste el almacenamiento
                  local, puedes abrir el último ticket disponible o generar uno nuevo.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {tickets[0] && (
                    <button
                      type="button"
                      onClick={() =>
                        navigateToRoute(
                          `/sesion/${tickets[0].ticket_code}`,
                          'connection_room',
                          tickets[0].ticket_code
                        )
                      }
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors"
                    >
                      Abrir sala {tickets[0].ticket_code}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResetToNewTicket}
                    className="px-4 py-2 text-xs font-semibold text-[#0B192C] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
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
      />
      {sharedOverlays}
    </div>
  );
}
