import { useCallback, useEffect, useState } from 'react';
import { ConnectionRoom } from './components/ConnectionRoom';
import { DiagnosticWizard } from './components/DiagnosticWizard';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { LandingSections } from './components/LandingSections';
import { TechPortalView } from './components/TechPortalView';
import { supportAdapter } from './services/supportAdapter';
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
  WizardDraft,
} from './types/support';
import {
  createTicketFromDraft,
  INITIAL_WIZARD_DRAFT,
  parseAppRoute,
} from './utils/ticketLogic';

export default function App() {
  const initialRoute =
    typeof window !== 'undefined'
      ? parseAppRoute(window.location.pathname)
      : { view: 'landing' as AppView, ticketCode: null };

  const [activeView, setActiveView] = useState<AppView>(initialRoute.view);
  const [wizardDraft, setWizardDraft] = useState<WizardDraft>(INITIAL_WIZARD_DRAFT);
  const [wizardErrors, setWizardErrors] = useState<Record<string, string>>({});

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

  const activeTicket =
    (activeTicketCode
      ? tickets.find(
          (ticket) =>
            ticket.ticket_code.toUpperCase() === activeTicketCode.toUpperCase()
        )
      : null) ??
    tickets[0] ??
    null;

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
        category: prev.category ?? 'Redes/Wi-Fi',
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
    const syncOptions = activeTicketCode ? { ticketCode: activeTicketCode } : undefined;
    void supportAdapter.syncFromSupabaseIfConfigured(syncOptions).then((res) => {
      if (!res.ok && res.error) {
        setPersistenceError(res.error);
        return;
      }
      if (res.data.tickets && res.data.tickets.length > 0) setTickets(res.data.tickets);
      if (res.data.messages) setMessages(res.data.messages);
    });

    const unsubscribe = supportAdapter.subscribeRealtime(() => {
      setTickets(supportAdapter.loadTickets());
      setMessages(supportAdapter.loadMessages());
      setMembers(supportAdapter.loadMembers());
      setDevices(supportAdapter.loadDevices());
      setSessions(supportAdapter.loadSessions());
      setOrganizations(supportAdapter.loadOrganizations());
      setAiAgents(supportAdapter.loadAiAgents());
      setAuditLogs(supportAdapter.loadAuditLogs());

      void supportAdapter.syncFromSupabaseIfConfigured(syncOptions).then((res) => {
        if (!res.ok && res.error) {
          setPersistenceError(res.error);
          return;
        }
        if (res.data.tickets && res.data.tickets.length > 0) setTickets(res.data.tickets);
        if (res.data.messages) setMessages(res.data.messages);
      });
    });

    return unsubscribe;
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
    navigateToRoute('/portal', 'landing', null);
    scrollToElement('diagnostico');
  };

  const handleSelectCategoryFromLanding = (
    category: IssueCategory,
    serviceTier?: ServiceTier
  ) => {
    setWizardErrors({});
    setWizardDraft((prev) => ({
      ...prev,
      step: 1,
      category,
      serviceTier: serviceTier ?? prev.serviceTier,
    }));
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
    setPersistenceError(null);
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
      (orgMember ? orgMember.specialties.join(' · ') : 'Windows · Microsoft 365 · Redes');

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

  if (activeView === 'tech_portal') {
    return (
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
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8FB] text-slate-900">
      <Header
        activeView={activeView}
        onNavigateSection={handleNavigateSection}
        onOpenTechPortal={() => {
          navigateToRoute('/dashboard', 'tech_portal', null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
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
            <HeroSection onStartDiagnostic={handleStartDiagnostic} />
            <DiagnosticWizard
              draft={wizardDraft}
              errors={wizardErrors}
              aiAgents={
                aiAgents.some((a) => a.organization_id === activeOrgId)
                  ? aiAgents.filter((a) => a.organization_id === activeOrgId)
                  : aiAgents
              }
              onChangeDraft={handleChangeWizardDraft}
              onSetErrors={setWizardErrors}
              onSubmitTicket={() => void handleSubmitTicket()}
            />
            <LandingSections
              onSelectCategoryForWizard={handleSelectCategoryFromLanding}
              onSubmitEnterpriseLead={handleSubmitEnterpriseLead}
            />
          </>
        )}

        {activeView === 'connection_room' && activeTicket && (
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
          />
        )}
      </main>

      <Footer onNavigateSection={handleNavigateSection} />
    </div>
  );
}
