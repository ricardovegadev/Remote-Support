import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Copy,
  Lock,
  Menu,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import schemaSql from '../../supabase/schema.sql?raw';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import type {
  AiAgentConfig,
  AuditLogEntry,
  ClientDevice,
  DashboardSection,
  DispatchMode,
  IssueCategory,
  MemberTierType,
  OperatingSystem,
  Organization,
  OrganizationMember,
  RemoteSessionRecord,
  ServiceTier,
  SupportTicket,
  TechnicianAvailability,
  TechnicianSpecialty,
  TicketMessage,
  WizardDraft,
} from '../types/support';
import {
  ADULT_RESTRICTION_ERROR,
  calculateAgeFromBirthDate,
  CATEGORY_OPTIONS,
  isValidEmail,
  LEGAL_TERMS_VERSION,
  SERVICE_TIER_OPTIONS,
} from '../utils/ticketLogic';

async function hasOperatorAccess(
  supabase: NonNullable<ReturnType<typeof getSupabaseClient>>,
  userId: string
): Promise<boolean> {
  const [memberResult, profileResult] = await Promise.all([
    supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1),
    supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
  ]);
  return Boolean(
    (!memberResult.error && memberResult.data?.length) ||
    (!profileResult.error && profileResult.data?.role === 'admin')
  );
}
import type { LegalDocTab } from './LegalDocsModal';
import { DashboardSidebar } from './DashboardSidebar';
import { AiWorkforceView } from './dashboard/AiWorkforceView';
import {
  AnalyticsView,
  OrganizationSettingsView,
  SecurityAuditView,
} from './dashboard/AnalyticsSecuritySettingsView';
import { DashboardOverview } from './dashboard/DashboardOverview';
import {
  DevicesDirectoryView,
  RemoteSessionsView,
} from './dashboard/DevicesAndSessionsView';
import { TicketsInboxView } from './dashboard/TicketsInboxView';
import { WorkforceDispatchView } from './dashboard/WorkforceDispatchView';

interface TechPortalViewProps {
  organizations: Organization[];
  activeOrgId: string;
  onSelectOrg: (orgId: string) => void;
  tickets: SupportTicket[];
  messages: TicketMessage[];
  members: OrganizationMember[];
  devices: ClientDevice[];
  sessions: RemoteSessionRecord[];
  aiAgents: AiAgentConfig[];
  auditLogs: AuditLogEntry[];
  persistenceError: string | null;
  onDismissPersistenceError: () => void;
  onStartSession: (ticketId: string) => Promise<void>;
  onMarkPaymentPaid: (ticketId: string) => Promise<void>;
  onResolveTicket: (ticketId: string, resolutionNotes: string) => Promise<void>;
  onReopenTicket: (ticketId: string) => Promise<void>;
  onSendTechnicianMessage: (
    ticketId: string,
    messageText: string
  ) => Promise<void>;
  onInspectConnectionRoom: (ticket: SupportTicket) => void;
  onClaimTicketAtomically: (
    ticketId: string,
    techId: string,
    techName: string,
    techSpecialty: string
  ) => Promise<void>;
  onUpdateMemberAvailability: (
    memberId: string,
    patch: Partial<{
      availability_status: TechnicianAvailability;
      specialties: TechnicianSpecialty[];
      accepting_requests: boolean;
    }>
  ) => void;
  onChangeDispatchMode: (mode: DispatchMode) => void;
  onInviteMember: (input: {
    full_name: string;
    email: string;
    member_type: MemberTierType;
    agreed_ticket_rate_usd: number;
    specialties: TechnicianSpecialty[];
  }) => void;
  onToggleAiAgent: (agentId: string) => void;
  onToggleAiGovernanceRule: (agentId: string, ruleId: string) => void;
  onSaveOrgSettings: (
    patch: Partial<
      Pick<Organization, 'name' | 'rustdesk_relay_domain' | 'payment_gateway'>
    >
  ) => void;
  onCreateQuickTicket: (draft: WizardDraft) => Promise<SupportTicket | null>;
  onOpenPublicPortal: () => void;
  onOpenLegalDoc?: (tab: LegalDocTab) => void;
  onExportOrgData?: () => void;
  onDeletePersonalData?: () => void;
}

const LOCAL_DEMO_AUTH_KEY = 'rs365_local_demo_operator_v1';
const LOCAL_DEMO_SIGNED_OUT_KEY = 'rs365_local_demo_signed_out_v1';

const SECTION_BREADCRUMBS: Record<DashboardSection, string> = {
  overview: 'Dashboard',
  tickets: 'Solicitudes y tickets',
  devices: 'Clientes y dispositivos',
  sessions: 'Sesiones remotas',
  workforce: 'Workforce & Dispatch',
  ai_workforce: 'AI Workforce',
  analytics: 'Informes y analítica',
  security: 'Seguridad y auditoría',
  settings: 'Configuración',
};

export function TechPortalView({
  organizations,
  activeOrgId,
  onSelectOrg,
  tickets,
  messages,
  members,
  devices,
  sessions,
  aiAgents,
  auditLogs,
  persistenceError,
  onDismissPersistenceError,
  onStartSession,
  onMarkPaymentPaid,
  onResolveTicket,
  onReopenTicket,
  onSendTechnicianMessage,
  onInspectConnectionRoom,
  onClaimTicketAtomically,
  onUpdateMemberAvailability,
  onChangeDispatchMode,
  onInviteMember,
  onToggleAiAgent,
  onToggleAiGovernanceRule,
  onSaveOrgSettings,
  onCreateQuickTicket,
  onOpenPublicPortal,
  onOpenLegalDoc,
  onExportOrgData,
  onDeletePersonalData,
}: TechPortalViewProps) {
  const supabaseConfigured = isSupabaseConfigured();
  const demoModeEnabled = import.meta.env.DEV && !supabaseConfigured;

  const [authStatus, setAuthStatus] = useState<
    'checking' | 'unauthenticated' | 'authenticated'
  >(() => {
    if (supabaseConfigured) return 'checking';
    if (!import.meta.env.DEV) return 'unauthenticated';
    if (typeof window !== 'undefined') {
      try {
        const signedOut =
          window.sessionStorage.getItem(LOCAL_DEMO_SIGNED_OUT_KEY) === '1';
        return signedOut ? 'unauthenticated' : 'authenticated';
      } catch {
        return 'authenticated';
      }
    }
    return 'authenticated';
  });

  const [operatorEmail, setOperatorEmail] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return (
          window.sessionStorage.getItem(LOCAL_DEMO_AUTH_KEY) ??
          'cmendoza@remotesupport365.com'
        );
      } catch {
        return 'cmendoza@remotesupport365.com';
      }
    }
    return 'cmendoza@remotesupport365.com';
  });

  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [signupFullName, setSignupFullName] = useState('');
  const [signupBirthDate, setSignupBirthDate] = useState('');
  const [signupTermsAccepted, setSignupTermsAccepted] = useState(false);
  const [signupMarketingOptIn, setSignupMarketingOptIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeSection, setActiveSection] =
    useState<DashboardSection>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    () =>
      tickets.find((t) => !t.organization_id || t.organization_id === activeOrgId)
        ?.id ??
      tickets[0]?.id ??
      null
  );
  const [activeTechId, setActiveTechId] = useState<string>(
    () =>
      members.find((m) => m.organization_id === activeOrgId)?.user_id ??
      members.find((m) => m.organization_id === activeOrgId)?.id ??
      members[0]?.user_id ??
      ''
  );
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Quick "+ Nueva solicitud" modal state
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [qtClientName, setQtClientName] = useState('');
  const [qtClientEmail, setQtClientEmail] = useState('');
  const [qtCategory, setQtCategory] = useState<IssueCategory>('Configuración de impresoras');
  const [qtOs, setQtOs] = useState<OperatingSystem>('Windows');
  const [qtTier, setQtTier] = useState<ServiceTier>('Express $15');
  const [qtDescription, setQtDescription] = useState('');
  const [qtError, setQtError] = useState<string | null>(null);
  const [qtSubmitting, setQtSubmitting] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (newTicketModalOpen) setNewTicketModalOpen(false);
        if (sqlModalOpen) setSqlModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [newTicketModalOpen, sqlModalOpen]);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = getSupabaseClient();
    if (!supabase) {
      setAuthStatus('unauthenticated');
      return;
    }

    let mounted = true;

    const acceptSession = async (user: { id: string; email?: string }) => {
      const allowed = await hasOperatorAccess(supabase, user.id);
      if (!mounted) return;
      if (!allowed) {
        setAuthError('Tu cuenta no tiene una membresía técnica activa. Solicita una invitación al administrador.');
        setAuthStatus('unauthenticated');
        void supabase.auth.signOut();
        return;
      }
      setOperatorEmail(user.email ?? 'tecnico@remotesupport365.com');
      setAuthError(null);
      setAuthStatus('authenticated');
    };

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error || !data.session) {
        setAuthStatus('unauthenticated');
      } else {
        void acceptSession(data.session.user);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        if (session?.user) {
          setAuthStatus('checking');
          queueMicrotask(() => void acceptSession(session.user));
        } else {
          setAuthStatus('unauthenticated');
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabaseConfigured]);

  const activeOrg =
    organizations.find((o) => o.id === activeOrgId) ?? organizations[0];

  const orgTickets = tickets.filter(
    (t) => !t.organization_id || t.organization_id === activeOrg.id
  );
  const orgMembers = members.filter((m) => m.organization_id === activeOrg.id);
  const orgDevices = devices.filter((d) => d.organization_id === activeOrg.id);
  const orgSessions = sessions.filter(
    (s) => s.organization_id === activeOrg.id
  );
  const tenantAiAgents = aiAgents.filter(
    (a) => a.organization_id === activeOrg.id
  );
  const orgAiAgents = tenantAiAgents.length > 0 ? tenantAiAgents : aiAgents;
  const orgAuditLogs = auditLogs.filter(
    (a) => !a.organization_id || a.organization_id === activeOrg.id
  );

  const openTicketsCount = orgTickets.filter(
    (t) => t.status !== 'resolved'
  ).length;

  useEffect(() => {
    if (orgMembers.length > 0) {
      const hasCurrentTech = orgMembers.some(
        (m) => m.user_id === activeTechId || m.id === activeTechId
      );
      if (!hasCurrentTech) {
        const nextTech = orgMembers[0].user_id ?? orgMembers[0].id;
        setActiveTechId(nextTech);
      }
    }
  }, [activeOrg.id, orgMembers, activeTechId]);

  useEffect(() => {
    if (
      selectedTicketId &&
      !orgTickets.some((t) => t.id === selectedTicketId)
    ) {
      setSelectedTicketId(orgTickets[0]?.id ?? null);
    }
  }, [activeOrg.id, orgTickets, selectedTicketId]);

  const handleSupabaseSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseConfigured && !demoModeEnabled) {
      setAuthError('El portal no está disponible hasta configurar Supabase Auth.');
      return;
    }
    if (!isValidEmail(loginEmail) || loginPassword.trim().length < 6) {
      setAuthError(
        'Ingresa un correo técnico válido y una contraseña de al menos 6 caracteres.'
      );
      return;
    }
    setAuthError(null);

    if (supabaseConfigured) {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setAuthError('No se pudo inicializar el cliente de Supabase.');
        return;
      }
      setAuthLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginEmail.trim(),
          password: loginPassword,
        });
        if (error) {
          setAuthError(`Autenticación rechazada: ${error.message}`);
          return;
        }
        if (data.user) {
          const allowed = await hasOperatorAccess(supabase, data.user.id);
          if (!allowed) {
            await supabase.auth.signOut();
            setAuthError('Cuenta creada. Un administrador debe invitarte a una organización antes de acceder al portal técnico.');
            return;
          }
          setOperatorEmail(data.user.email ?? loginEmail.trim());
          setAuthStatus('authenticated');
        }
      } catch {
        setAuthError('Error de red al conectar con Supabase Auth.');
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    const cleanEmail = loginEmail.trim().toLowerCase();
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(LOCAL_DEMO_SIGNED_OUT_KEY);
        window.sessionStorage.setItem(LOCAL_DEMO_AUTH_KEY, cleanEmail);
      } catch {
        // Ignore restricted sessionStorage
      }
    }
    setOperatorEmail(cleanEmail);
    setAuthStatus('authenticated');
  };

  const handleSupabaseSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseConfigured && !demoModeEnabled) {
      setAuthError('El registro técnico está deshabilitado hasta configurar Supabase Auth.');
      return;
    }
    if (signupFullName.trim().length < 2) {
      setAuthError('Ingresa tu nombre completo.');
      return;
    }
    if (!isValidEmail(loginEmail) || loginPassword.trim().length < 6) {
      setAuthError(
        'Ingresa un correo válido y una contraseña de al menos 6 caracteres.'
      );
      return;
    }
    const age = calculateAgeFromBirthDate(signupBirthDate);
    if (age === null) {
      setAuthError(
        'Ingresa tu fecha de nacimiento válida para verificar la mayoría de edad (+18 años).'
      );
      return;
    }
    if (age < 18) {
      setAuthError(ADULT_RESTRICTION_ERROR);
      return;
    }
    if (!signupTermsAccepted) {
      setAuthError(
        'Debes aceptar los Términos y Condiciones, la Política de Privacidad y la Política de Reembolsos.'
      );
      return;
    }

    setAuthError(null);
    const cleanEmail = loginEmail.trim().toLowerCase();
    const nowIso = new Date().toISOString();

    if (supabaseConfigured) {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setAuthError('No se pudo inicializar el cliente de Supabase.');
        return;
      }
      setAuthLoading(true);
      try {
        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: loginPassword,
          options: {
            data: {
              full_name: signupFullName.trim(),
              birth_date: signupBirthDate,
              is_adult_verified: true,
              terms_accepted_at: nowIso,
              terms_version: LEGAL_TERMS_VERSION,
              marketing_opt_in: signupMarketingOptIn,
            },
          },
        });
        if (error) {
          setAuthError(`Registro rechazado: ${error.message}`);
          return;
        }
        const { data: currentUser } = await supabase.auth.getUser();
        const allowed = currentUser.user
          ? await hasOperatorAccess(supabase, currentUser.user.id)
          : false;
        if (!allowed) {
          await supabase.auth.signOut();
          setAuthError('Cuenta creada. Un administrador debe invitarte a una organización antes de acceder al portal técnico.');
          return;
        }
        setOperatorEmail(cleanEmail);
        setAuthStatus('authenticated');
      } catch {
        setAuthError('Error de red al conectar con Supabase Auth.');
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(LOCAL_DEMO_SIGNED_OUT_KEY);
        window.sessionStorage.setItem(LOCAL_DEMO_AUTH_KEY, cleanEmail);
      } catch {
        // Ignore restricted sessionStorage
      }
    }
    setOperatorEmail(cleanEmail);
    setAuthStatus('authenticated');
  };

  const handleEnterLocalDemoMode = () => {
    if (!demoModeEnabled) return;
    const demoEmail = 'cmendoza@remotesupport365.com';
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(LOCAL_DEMO_SIGNED_OUT_KEY);
        window.sessionStorage.setItem(LOCAL_DEMO_AUTH_KEY, demoEmail);
      } catch {
        // Ignore restricted sessionStorage
      }
    }
    setOperatorEmail(demoEmail);
    setAuthError(null);
    setAuthStatus('authenticated');
  };

  const handleSignOut = async () => {
    if (supabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    }
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(LOCAL_DEMO_AUTH_KEY);
        window.sessionStorage.setItem(LOCAL_DEMO_SIGNED_OUT_KEY, '1');
      } catch {
        // Ignore restricted sessionStorage
      }
    }
    setLoginPassword('');
    setAuthStatus('unauthenticated');
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(schemaSql);
      setCopiedSql(true);
      window.setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      setCopiedSql(true);
    }
  };

  const handleQuickTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (qtClientName.trim().length < 2) {
      setQtError('Ingresa el nombre del cliente o empresa.');
      return;
    }
    if (!isValidEmail(qtClientEmail)) {
      setQtError('Ingresa un correo electrónico válido.');
      return;
    }
    if (qtDescription.trim().length < 10) {
      setQtError(
        'Describe brevemente el incidente técnico (mínimo 10 caracteres).'
      );
      return;
    }

    setQtError(null);
    setQtSubmitting(true);
    try {
      const created = await onCreateQuickTicket({
        step: 3,
        category: qtCategory,
        operatingSystem: qtOs,
        serviceTier: qtTier,
        billingMode: 'one_time',
        description: qtDescription.trim(),
        clientName: qtClientName.trim(),
        clientEmail: qtClientEmail.trim(),
        birthDate: '1990-01-01',
        termsAccepted: true,
        marketingOptIn: false,
        aiTriage: null,
      });
      if (created) {
        setSelectedTicketId(created.id);
        setActiveSection('tickets');
        setNewTicketModalOpen(false);
        setQtClientName('');
        setQtClientEmail('');
        setQtDescription('');
      }
    } finally {
      setQtSubmitting(false);
    }
  };

  // Auth Gate (only shown when Supabase auth is required or operator explicitly signed out)
  if (authStatus !== 'authenticated') {
    return (
      <section
        aria-labelledby="tech-auth-heading"
        data-testid="tech-auth-gate"
        className="min-h-screen bg-[#F6F8FB] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-md w-full mx-auto space-y-6">
          <button
            type="button"
            onClick={onOpenPublicPortal}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Ir al Portal Cliente</span>
          </button>

          <div className="bg-white border border-[#E5E9F2] rounded-xl p-6 sm:p-8 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-6">
            <div>
              <p className="text-xs font-bold tracking-tight text-[#2563EB] mb-1.5">
                Remote Support 365
              </p>
              <div className="flex items-center gap-2.5 text-[#0F172A]">
                <span className="w-9 h-9 rounded-xl bg-[#0B1528] text-[#3B82F6] flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" aria-hidden="true" />
                </span>
                <h1
                  id="tech-auth-heading"
                  className="text-xl font-bold tracking-tight"
                >
                  Centro de operaciones · Acceso
                </h1>
              </div>
              <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
                {supabaseConfigured
                  ? 'Inicia sesión con tu cuenta registrada en Supabase Auth.'
                  : 'Modo demostración listo para operar o inicia sesión con credenciales locales.'}
              </p>
            </div>

            {authStatus === 'checking' ? (
              <p className="text-xs font-medium text-[#64748B] py-4">
                Verificando sesión activa en Supabase Auth...
              </p>
            ) : (
              <>
                <div
                  role="tablist"
                  aria-label="Modo de acceso de operador"
                  className="grid grid-cols-2 p-1 bg-slate-100 border border-[#E5E9F2] rounded-xl"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={authTab === 'login'}
                    onClick={() => {
                      setAuthTab('login');
                      setAuthError(null);
                    }}
                    className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                      authTab === 'login'
                        ? 'bg-[#0B1528] text-white'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={authTab === 'signup'}
                    onClick={() => {
                      setAuthTab('signup');
                      setAuthError(null);
                    }}
                    className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                      authTab === 'signup'
                        ? 'bg-[#2563EB] text-white'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    Registrarse (+18)
                  </button>
                </div>

                <form
                  onSubmit={
                    authTab === 'login'
                      ? handleSupabaseSignIn
                      : handleSupabaseSignUp
                  }
                  noValidate
                  className="space-y-4"
                >
                  {authTab === 'signup' && (
                    <>
                      <div>
                        <label
                          htmlFor="tech-fullname"
                          className="block text-xs font-semibold text-[#0F172A] mb-1.5"
                        >
                          Nombre completo
                        </label>
                        <input
                          id="tech-fullname"
                          type="text"
                          value={signupFullName}
                          onChange={(e) => setSignupFullName(e.target.value)}
                          placeholder="Ej. Carlos Mendoza"
                          className="w-full rounded-xl border border-[#E5E9F2] px-3.5 py-2.5 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="tech-birthdate"
                          className="block text-xs font-semibold text-[#0F172A] mb-1.5"
                        >
                          Fecha de nacimiento (+18 años)
                        </label>
                        <input
                          id="tech-birthdate"
                          type="date"
                          required
                          value={signupBirthDate}
                          onChange={(e) => setSignupBirthDate(e.target.value)}
                          className="w-full rounded-xl border border-[#E5E9F2] px-3.5 py-2.5 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label
                      htmlFor="tech-email"
                      className="block text-xs font-semibold text-[#0F172A] mb-1.5"
                    >
                      Correo corporativo
                    </label>
                    <input
                      id="tech-email"
                      type="email"
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="cmendoza@remotesupport365.com"
                      className="w-full rounded-xl border border-[#E5E9F2] px-3.5 py-2.5 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="tech-password"
                      className="block text-xs font-semibold text-[#0F172A] mb-1.5"
                    >
                      Contraseña
                    </label>
                    <input
                      id="tech-password"
                      type="password"
                      autoComplete={
                        authTab === 'login' ? 'current-password' : 'new-password'
                      }
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full rounded-xl border border-[#E5E9F2] px-3.5 py-2.5 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
                    />
                  </div>

                  {authTab === 'signup' && (
                    <div className="space-y-2.5 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E9F2] text-xs">
                      <label className="flex items-start gap-2 text-[#0F172A] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={signupTermsAccepted}
                          onChange={(e) => setSignupTermsAccepted(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#2563EB]"
                        />
                        <span>
                          He leído y acepto los{' '}
                          <button
                            type="button"
                            onClick={() => onOpenLegalDoc?.('terms')}
                            className="font-semibold text-[#2563EB] hover:underline"
                          >
                            Términos y Condiciones
                          </button>
                          , la{' '}
                          <button
                            type="button"
                            onClick={() => onOpenLegalDoc?.('privacy')}
                            className="font-semibold text-[#2563EB] hover:underline"
                          >
                            Política de Privacidad
                          </button>{' '}
                          y la{' '}
                          <button
                            type="button"
                            onClick={() => onOpenLegalDoc?.('refunds')}
                            className="font-semibold text-[#2563EB] hover:underline"
                          >
                            Política de Reembolsos
                          </button>
                          .
                        </span>
                      </label>

                      <label className="flex items-start gap-2 text-[#475569] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={signupMarketingOptIn}
                          onChange={(e) => setSignupMarketingOptIn(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#2563EB]"
                        />
                        <span>
                          Acepto recibir novedades y consejos técnicos por correo (puedo
                          darme de baja en cualquier momento).
                        </span>
                      </label>
                    </div>
                  )}

                  {authError && (
                    <p
                      role="alert"
                      className="text-xs font-medium text-[#DC2626]"
                    >
                      {authError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-400 rounded-xl transition-colors"
                  >
                    {authLoading
                      ? 'Validando credenciales...'
                      : authTab === 'login'
                      ? 'Ingresar al Centro de operaciones'
                      : 'Crear cuenta técnica (+18)'}
                  </button>
                </form>

                {!supabaseConfigured && (
                  <div className="pt-4 border-t border-[#E5E9F2] space-y-2.5">
                  {demoModeEnabled && <button
                      type="button"
                      onClick={handleEnterLocalDemoMode}
                      className="w-full px-4 py-2.5 text-xs font-semibold text-[#0F172A] bg-[#F8FAFC] hover:bg-slate-100 border border-[#E5E9F2] rounded-xl transition-colors"
                    >
                      Entrar con Cuenta de demostración
                  </button>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div
      data-testid="tech-portal"
      className="min-h-screen flex bg-[#F6F8FB] text-[#0F172A]"
    >
      <DashboardSidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        organizations={organizations}
        activeOrgId={activeOrg.id}
        onSelectOrg={onSelectOrg}
        openTicketsCount={openTicketsCount}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileDrawerOpen}
        onCloseMobile={() => setMobileDrawerOpen(false)}
        operatorName="Administrador"
        operatorRoleLabel={
          supabaseConfigured ? operatorEmail : 'Cuenta de demostración'
        }
        onSignOut={() => void handleSignOut()}
        onOpenPublicPortal={onOpenPublicPortal}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Exact 64px Top Bar (#FFFFFF, border-b #E5E9F2) */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E5E9F2] px-3.5 sm:px-6 lg:px-8 flex items-center justify-between gap-2.5 sm:gap-4 shrink-0">
          {/* Left: Mobile drawer button + Contextual Breadcrumb */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <button
              type="button"
              aria-label="Abrir menú lateral"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#334155] hover:bg-[#F8FAFC] transition-colors shrink-0"
            >
              <Menu className="w-5 h-5" strokeWidth={1.9} />
            </button>

            <nav
              aria-label="Ruta actual"
              data-testid="topbar-workspace-indicator"
              className="flex flex-col justify-center min-w-0 leading-[1.25]"
            >
              <span className="inline-flex items-center gap-2 text-[12px] font-normal text-slate-600 truncate">
                <span>Workspace</span>
                <span className="text-slate-400" aria-hidden="true">
                  /
                </span>
              </span>
              <span className="text-[13px] font-bold text-[#0F172A] truncate">
                {SECTION_BREADCRUMBS[activeSection]}
              </span>
            </nav>
          </div>

          {/* Right: Search + Desktop Portal Cliente + Notification Bell + AD Avatar */}
          <div className="flex items-center justify-end gap-2.5 sm:gap-3.5 min-w-0 flex-1 sm:flex-initial">
            <div className="relative flex-1 max-w-[165px] sm:max-w-none sm:w-64 lg:w-72">
              <Search
                className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                type="search"
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                placeholder="Buscar..."
                aria-label="Buscar solicitudes"
                className="w-full h-9 rounded-xl border border-[#E5E9F2] bg-[#F8FAFC] pl-9 pr-3 lg:pr-12 text-[13px] text-[#0F172A] placeholder:text-[#64748B] focus:bg-white focus:border-[#2563EB] focus:outline-none transition-colors"
              />
              <kbd className="pointer-events-none hidden lg:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[#64748B] bg-white border border-[#E5E9F2] rounded">
                ⌘K
              </kbd>
            </div>

            <button
              type="button"
              onClick={onOpenPublicPortal}
              className="hidden lg:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E5E9F2] bg-white hover:bg-[#F8FAFC] hover:border-[#2563EB] text-xs font-semibold text-[#0F172A] transition-colors whitespace-nowrap shrink-0"
            >
              <span>Portal Cliente</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
            </button>

            <div className="relative shrink-0">
              <button
                type="button"
                aria-label="Notificaciones"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className="relative w-9 h-9 rounded-full hover:bg-[#F8FAFC] flex items-center justify-center text-[#334155] transition-colors"
              >
                <Bell className="w-[19px] h-[19px]" strokeWidth={1.8} aria-hidden="true" />
                {openTicketsCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F97316] ring-2 ring-white"
                  />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-[#E5E9F2] rounded-xl shadow-lg p-3.5 z-40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#0F172A]">
                      Actividad reciente
                    </p>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-[#EFF6FF] text-[#2563EB]">
                      {openTicketsCount} abiertas
                    </span>
                  </div>
                  <div className="divide-y divide-[#E5E9F2] max-h-60 overflow-y-auto">
                    {orgAuditLogs.slice(0, 4).map((log) => (
                      <div key={log.id} className="py-2 text-xs">
                        <p className="font-semibold text-[#0F172A]">
                          {log.actor_label}
                        </p>
                        <p className="text-[#64748B] text-[11px] leading-snug">
                          {log.action} ({log.target_ref})
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <span
              title="Administrador · Cuenta de demostración"
              className="w-9 h-9 rounded-full bg-[#EFF6FF] text-[#2563EB] text-[12px] font-bold flex items-center justify-center shrink-0"
            >
              AD
            </span>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] w-full mx-auto">
          {demoModeEnabled && (
            <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-950">
              DEMO LOCAL · No autentica operadores ni sincroniza cambios con Supabase.
            </div>
          )}
          {!demoModeEnabled && supabaseConfigured && (
            <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950">
              <strong>Persistencia parcial:</strong> tickets, mensajes y pagos usan servicios remotos. La configuración de organización, invitaciones, disponibilidad, dispositivos, sesiones, agentes IA y parte de la bitácora todavía no se sincronizan de forma completa con Supabase; esos cambios pueden quedar solo en este navegador.
            </div>
          )}
          {persistenceError && (
            <div
              role="alert"
              data-testid="persistence-error-banner"
              className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start sm:items-center justify-between gap-4 text-xs text-red-900"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle
                  className="w-4 h-4 text-red-700 shrink-0 mt-0.5 sm:mt-0"
                  aria-hidden="true"
                />
                <span className="font-medium">{persistenceError}</span>
              </div>
              <button
                type="button"
                onClick={onDismissPersistenceError}
                className="font-semibold underline shrink-0"
              >
                Descartar
              </button>
            </div>
          )}

          {activeSection === 'overview' && (
            <DashboardOverview
              organization={activeOrg}
              tickets={orgTickets}
              members={orgMembers}
              sessions={orgSessions}
              aiAgents={orgAiAgents}
              supabaseConfigured={supabaseConfigured}
              searchQuery={globalSearchQuery}
              onNavigateSection={setActiveSection}
              onSelectTicket={(ticketId) => {
                setSelectedTicketId(ticketId);
                setActiveSection('tickets');
              }}
              onOpenNewTicketModal={() => setNewTicketModalOpen(true)}
              onOpenPublicPortal={onOpenPublicPortal}
            />
          )}

          {activeSection === 'tickets' && (
            <TicketsInboxView
              tickets={orgTickets}
              messages={messages}
              aiAgents={orgAiAgents}
              selectedTicketId={selectedTicketId}
              externalSearchQuery={globalSearchQuery}
              onSelectTicket={setSelectedTicketId}
              onStartSession={onStartSession}
              onMarkPaymentPaid={onMarkPaymentPaid}
              onResolveTicket={onResolveTicket}
              onReopenTicket={onReopenTicket}
              onSendTechnicianMessage={onSendTechnicianMessage}
              onInspectConnectionRoom={onInspectConnectionRoom}
            />
          )}

          {activeSection === 'devices' && (
            <DevicesDirectoryView devices={orgDevices} />
          )}

          {activeSection === 'sessions' && (
            <RemoteSessionsView sessions={orgSessions} />
          )}

          {activeSection === 'workforce' && (
            <WorkforceDispatchView
              organization={activeOrg}
              members={orgMembers}
              tickets={orgTickets}
              currentTechId={activeTechId}
              onSelectActiveTech={setActiveTechId}
              onUpdateAvailability={onUpdateMemberAvailability}
              onChangeDispatchMode={onChangeDispatchMode}
              onInviteMember={onInviteMember}
              onClaimTicketAtomically={onClaimTicketAtomically}
            />
          )}

          {activeSection === 'ai_workforce' && (
            <AiWorkforceView
              organization={activeOrg}
              agents={orgAiAgents}
              onToggleAgent={onToggleAiAgent}
              onToggleGovernanceRule={onToggleAiGovernanceRule}
            />
          )}

          {activeSection === 'analytics' && (
            <AnalyticsView tickets={orgTickets} />
          )}

          {activeSection === 'security' && (
            <SecurityAuditView logs={orgAuditLogs} />
          )}

          {activeSection === 'settings' && (
            <OrganizationSettingsView
              organization={activeOrg}
              supabaseConfigured={supabaseConfigured}
              operatorEmail={operatorEmail}
              onSaveSettings={onSaveOrgSettings}
              onOpenSqlModal={() => setSqlModalOpen(true)}
              onSignOut={() => void handleSignOut()}
              onExportOrgData={onExportOrgData}
              onDeletePersonalData={() => {
                onDeletePersonalData?.();
                void handleSignOut();
              }}
            />
          )}
        </main>
      </div>

      {/* Modal "+ Nueva solicitud" (Dashboard V1 Aesthetic) */}
      {newTicketModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-ticket-modal-title"
          className="fixed inset-0 z-50 bg-[#0B1528]/55 backdrop-blur-[1px] flex items-center justify-center p-4"
        >
          <div className="bg-white border border-[#E5E9F2] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="px-6 py-4 border-b border-[#E5E9F2] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                  <Plus className="w-4 h-4" aria-hidden="true" />
                </span>
                <div>
                  <h2
                    id="new-ticket-modal-title"
                    className="text-base font-bold text-[#0F172A]"
                  >
                    Nueva solicitud de soporte
                  </h2>
                  <p className="text-[11px] text-[#64748B]">
                    Genera un ticket con sala RustDesk inmediata en{' '}
                    {activeOrg.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Cerrar modal de nueva solicitud"
                onClick={() => setNewTicketModalOpen(false)}
                className="p-1.5 text-[#64748B] hover:text-[#0F172A] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => void handleQuickTicketSubmit(e)}
              noValidate
              className="p-6 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Cliente o empresa
                  </label>
                  <input
                    type="text"
                    value={qtClientName}
                    onChange={(e) => setQtClientName(e.target.value)}
                    placeholder="Ej. Estudio Contable Vega"
                    className="w-full rounded-xl border border-[#E5E9F2] px-3 py-2 text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Correo de contacto
                  </label>
                  <input
                    type="email"
                    value={qtClientEmail}
                    onChange={(e) => setQtClientEmail(e.target.value)}
                    placeholder="soporte@cliente.com"
                    className="w-full rounded-xl border border-[#E5E9F2] px-3 py-2 text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Categoría
                  </label>
                  <select
                    value={qtCategory}
                    onChange={(e) =>
                      setQtCategory(e.target.value as IssueCategory)
                    }
                    className="w-full rounded-xl border border-[#E5E9F2] bg-white px-2.5 py-2 text-xs text-[#0F172A]"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Sistema Operativo
                  </label>
                  <select
                    value={qtOs}
                    onChange={(e) =>
                      setQtOs(e.target.value as OperatingSystem)
                    }
                    className="w-full rounded-xl border border-[#E5E9F2] bg-white px-2.5 py-2 text-xs text-[#0F172A]"
                  >
                    <option value="Windows">Windows</option>
                    <option value="Mac">Mac</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Nivel / Tarifa
                  </label>
                  <select
                    value={qtTier}
                    onChange={(e) => setQtTier(e.target.value as ServiceTier)}
                    className="w-full rounded-xl border border-[#E5E9F2] bg-white px-2.5 py-2 text-xs text-[#0F172A]"
                  >
                    {SERVICE_TIER_OPTIONS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Descripción del problema
                </label>
                <textarea
                  rows={3}
                  value={qtDescription}
                  onChange={(e) => setQtDescription(e.target.value)}
                  placeholder="Describe los síntomas o el error reportado..."
                  className="w-full rounded-xl border border-[#E5E9F2] px-3 py-2 text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center gap-2 text-[11px] text-[#1E40AF]">
                <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  AI Receptionist generará el pre-diagnóstico inicial y abrirá
                  el enlace de conexión RustDesk automáticamente.
                </span>
              </div>

              {qtError && (
                <p role="alert" className="text-xs font-medium text-[#DC2626]">
                  {qtError}
                </p>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setNewTicketModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#475569] bg-white border border-[#E5E9F2] hover:bg-[#F8FAFC] rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={qtSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-400 rounded-xl transition-colors shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {qtSubmitting ? 'Creando ticket...' : 'Crear solicitud'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supabase SQL Schema Modal */}
      {sqlModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sql-modal-title"
          className="fixed inset-0 z-50 bg-[#0B1528]/60 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-[#E5E9F2] rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-[#E5E9F2] flex items-center justify-between gap-4">
              <div>
                <h2
                  id="sql-modal-title"
                  className="text-base font-bold text-[#0F172A]"
                >
                  Esquema SQL Multiempresa para Supabase (schema.sql)
                </h2>
                <p className="text-xs text-[#64748B]">
                  organizations, organization_members, technician_profiles,
                  tickets, claim_ticket_atomically RPC y RLS
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{copiedSql ? 'SQL Copiado' : 'Copiar SQL'}</span>
                </button>
                <button
                  type="button"
                  aria-label="Cerrar visor de esquema SQL"
                  onClick={() => setSqlModalOpen(false)}
                  className="p-1.5 text-[#64748B] hover:text-[#0F172A] rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <pre className="p-5 overflow-auto text-xs font-mono leading-relaxed text-[#0F172A] bg-[#F8FAFC] flex-1">
              {schemaSql}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
