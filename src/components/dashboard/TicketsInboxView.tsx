import { useEffect, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  runAiReportGenerator,
  runAiTechnicianAssistant,
} from '../../services/aiService';
import type {
  AiAgentConfig,
  ResolutionOutcome,
  SupportTicket,
  TicketMessage,
  TicketStatus,
} from '../../types/support';
import type { OrganizationRole } from '../../utils/rbac';
import {
  buildRustDeskDeepLink,
  buildTechnicalResolutionSummary,
  deriveTicketPriority,
  formatCategoryForOs,
  formatRustDeskId,
  getInitials,
  getPaymentStatusLabel,
  getPriorityMeta,
  getServiceTierPriceUsd,
  getStatusBadgeClass,
  getTicketStatusLabel,
  sortTicketsByUrgencyAndSla,
} from '../../utils/ticketLogic';
import { TicketChatPanel } from '../TicketChatPanel';

interface TicketsInboxViewProps {
  organizationId?: string;
  tickets: SupportTicket[];
  messages: TicketMessage[];
  aiAgents?: AiAgentConfig[];
  operatorRole?: OrganizationRole;
  selectedTicketId: string | null;
  externalSearchQuery?: string;
  onSelectTicket: (ticketId: string) => void;
  onStartSession: (ticketId: string) => Promise<void>;
  onMarkPaymentPaid: (ticketId: string) => Promise<boolean | void>;
  onMarkHumanReviewed?: (ticketId: string) => Promise<void>;
  onResolveTicket: (ticketId: string, resolutionNotes: string) => Promise<void>;
  onAutoCaptureTicket?: (ticketId: string) => Promise<void>;
  onVoidAuthorizationTicket?: (
    ticketId: string,
    outcome: Exclude<ResolutionOutcome, 'resolved'>
  ) => Promise<void>;
  onReopenTicket: (ticketId: string) => Promise<void>;
  onSendTechnicianMessage: (ticketId: string, text: string) => Promise<void>;
  onInspectConnectionRoom: (ticket: SupportTicket) => void;
}

export function TicketsInboxView({
  organizationId,
  tickets,
  messages,
  aiAgents = [],
  operatorRole = 'technician',
  selectedTicketId,
  externalSearchQuery = '',
  onSelectTicket,
  onStartSession,
  onMarkPaymentPaid,
  onMarkHumanReviewed,
  onResolveTicket,
  onAutoCaptureTicket,
  onVoidAuthorizationTicket,
  onReopenTicket,
  onSendTechnicianMessage,
  onInspectConnectionRoom,
}: TicketsInboxViewProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery);
  const [copiedId, setCopiedId] = useState(false);
  const [resolutionDraft, setResolutionDraft] = useState('');
  const [closureError, setClosureError] = useState<string | null>(null);
  const [confirmingClosure, setConfirmingClosure] = useState(false);
  const [isMutatingTicket, setIsMutatingTicket] = useState(false);
  const [voidOutcome, setVoidOutcome] =
    useState<Exclude<ResolutionOutcome, 'resolved'>>('software_unresolved');
  const [isProcessingPaymentAction, setIsProcessingPaymentAction] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantData, setAssistantData] = useState<{
    checklist: string[];
    diagnosticSummary: string;
  } | null>(null);
  const isAdminOrOwner = operatorRole === 'owner' || operatorRole === 'admin';

  useEffect(() => {
    setSearchQuery(externalSearchQuery);
  }, [externalSearchQuery]);

  useEffect(() => {
    setStatusFilter('all');
    setSearchQuery(externalSearchQuery);
    setConfirmingClosure(false);
    setClosureError(null);
    setAssistantData(null);
  }, [organizationId]);

  const filteredTickets = sortTicketsByUrgencyAndSla(
    tickets.filter((ticket) => {
      const matchesStatus =
        statusFilter === 'all' || ticket.status === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        ticket.ticket_code.toLowerCase().includes(q) ||
        ticket.client_name.toLowerCase().includes(q) ||
        ticket.category.toLowerCase().includes(q) ||
        ticket.problem_description.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    })
  );

  const activeTicket =
    tickets.find((t) => t.id === selectedTicketId) ?? filteredTickets[0] ?? null;

  useEffect(() => {
    if (!activeTicket) {
      setResolutionDraft('');
      setClosureError(null);
      setConfirmingClosure(false);
      setAssistantData(null);
      return;
    }
    setResolutionDraft(activeTicket.resolution_notes ?? '');
    setClosureError(null);
    setConfirmingClosure(false);
    setCopiedId(false);
    setAssistantData(null);
  }, [activeTicket?.id]);

  const activeTicketMessages = activeTicket
    ? messages.filter((m) => m.ticket_id === activeTicket.id)
    : [];

  const formattedRustDesk = activeTicket?.rustdesk_id
    ? formatRustDeskId(activeTicket.rustdesk_id)
    : null;
  const rustdeskDeepLink = buildRustDeskDeepLink(activeTicket?.rustdesk_id);

  const assistantAgent = aiAgents.find(
    (a) => a.agent_key === 'ai_technician_assistant'
  );
  const assistantEnabled = assistantAgent ? assistantAgent.is_enabled : true;

  const reportAgent = aiAgents.find(
    (a) => a.agent_key === 'ai_report_generator'
  );
  const reportGeneratorEnabled = reportAgent ? reportAgent.is_enabled : true;
  const includePreventiveRule =
    reportAgent?.governance_rules.find((r) => r.id === 'r-rep-1')?.enabled ??
    true;

  const handleCopyRustDeskId = async (rawId: string) => {
    let copied = false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(rawId);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied && typeof document !== 'undefined') {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = rawId;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        copied = false;
      }
    }

    setCopiedId(true);
    window.setTimeout(() => setCopiedId(false), 2200);
  };

  const handleGenerateAiReport = async () => {
    if (!activeTicket) return;
    setReportLoading(true);
    setClosureError(null);
    try {
      if (!reportGeneratorEnabled) {
        setResolutionDraft(
          buildTechnicalResolutionSummary(
            activeTicket,
            resolutionDraft,
            includePreventiveRule
          )
        );
        return;
      }
      const res = await runAiReportGenerator(activeTicket, resolutionDraft, {
        includePreventive: includePreventiveRule,
      });
      setResolutionDraft(res.report);
    } finally {
      setReportLoading(false);
    }
  };

  const handleAskTechnicianAssistant = async () => {
    if (!activeTicket || !assistantEnabled) return;
    setAssistantLoading(true);
    try {
      const res = await runAiTechnicianAssistant(activeTicket);
      setAssistantData({
        checklist: res.checklist,
        diagnosticSummary: res.diagnosticSummary,
      });
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleRequestClosureConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket) return;
    if (resolutionDraft.trim().length < 10) {
      setClosureError(
        'Describe brevemente qué se reparó o genera el informe con AI Report Generator.'
      );
      return;
    }
    setClosureError(null);
    setConfirmingClosure(true);
  };

  const handleConfirmCloseTicket = async () => {
    if (!activeTicket) return;
    setIsMutatingTicket(true);
    try {
      let finalReport = resolutionDraft.trim();
      if (!finalReport.includes('INFORME TÉCNICO')) {
        if (!reportGeneratorEnabled) {
          finalReport = buildTechnicalResolutionSummary(
            activeTicket,
            finalReport,
            includePreventiveRule
          );
        } else {
          const aiRes = await runAiReportGenerator(activeTicket, finalReport, {
            includePreventive: includePreventiveRule,
          });
          finalReport = aiRes.report;
        }
        setResolutionDraft(finalReport);
      }
      await onResolveTicket(activeTicket.id, finalReport);
      setConfirmingClosure(false);
    } finally {
      setIsMutatingTicket(false);
    }
  };

  return (
    <div data-testid="tickets-inbox-view" className="space-y-6">
      {/* Page Intro + Filter Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Filtrar solicitudes por estado"
          className="flex flex-wrap items-center gap-2"
        >
          {(
            [
              { id: 'all', label: 'Todos' },
              { id: 'ready_to_connect', label: 'Listos para conectar' },
              { id: 'in_progress', label: 'En curso' },
              { id: 'pending_client_confirmation', label: 'Esperando confirmación' },
              { id: 'waiting_payment', label: 'Pendiente' },
              { id: 'resolved', label: 'Resueltos' },
              { id: 'refunded', label: 'Anulados' },
            ] as const
          ).map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(tab.id)}
                className={`min-h-[44px] sm:min-h-0 px-3.5 py-2 sm:py-1.5 text-xs font-semibold rounded-full border transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-sm'
                    : 'bg-white text-[#64748B] border-[#E5E9F2] hover:text-[#0F172A] hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full xl:w-80">
          <Search
            className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Filtrar solicitudes por código, cliente o falla"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar RS-XXXX, cliente o falla..."
            className="w-full min-h-[44px] sm:min-h-0 rounded-full border border-[#E5E9F2] bg-white pl-10 pr-4 py-2 text-xs text-[#0F172A] placeholder:text-slate-500 focus:border-[#2563EB] focus:outline-none"
          />
        </div>
      </div>

      {/* Master-Detail Split View */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left List */}
        <div className="xl:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1 text-[11px] text-[#64748B]">
            <span className="font-semibold text-[#0F172A]">
              Cola priorizada por urgencia y SLA
            </span>
            <span className="tabular-nums">{filteredTickets.length} solicitudes</span>
          </div>
          {filteredTickets.length === 0 ? (
            <div className="bg-white border border-[#E5E9F2] rounded-xl p-8 text-center text-xs text-[#64748B] shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
              No hay solicitudes que coincidan con este filtro.
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const isSelected = activeTicket?.id === ticket.id;
              const priorityMeta = getPriorityMeta(
                deriveTicketPriority(ticket)
              );
              return (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => onSelectTicket(ticket.id)}
                  className={`w-full text-left rounded-xl border p-4 space-y-3 transition-all shadow-[0_1px_3px_rgba(15,23,42,0.03)] ${
                    isSelected
                      ? 'bg-white border-[#2563EB] ring-2 ring-[#2563EB]/15'
                      : 'bg-white border-[#E5E9F2] hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] text-[#1D4ED8] text-xs font-bold flex items-center justify-center shrink-0">
                        {getInitials(ticket.client_name)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0F172A] truncate">
                          {ticket.client_name}
                        </p>
                        <p className="text-[11px] font-medium text-[#64748B]">
                          <span className="font-mono font-semibold text-[#0F172A]">
                            {ticket.ticket_code}
                          </span>{' '}
                          · {ticket.os_type}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0 ${priorityMeta.badgeClass}`}
                    >
                      {priorityMeta.label}
                    </span>
                  </div>

                  <p className="text-xs text-[#475569] line-clamp-2 leading-relaxed">
                    {ticket.problem_description}
                  </p>

                  <div className="pt-2.5 border-t border-[#E5E9F2] flex items-center justify-between gap-2 text-[11px]">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-semibold ${getStatusBadgeClass(
                        ticket.status
                      )}`}
                    >
                      {getTicketStatusLabel(ticket.status)}
                    </span>
                    <span
                      className={
                        ticket.rustdesk_id
                          ? 'font-mono tabular-nums text-[#475569]'
                          : 'text-[#64748B]'
                      }
                    >
                      {ticket.rustdesk_id
                        ? formatRustDeskId(ticket.rustdesk_id)
                        : 'Sin ID RustDesk'}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right Workspace */}
        {activeTicket && (
          <div className="xl:col-span-7 space-y-6">
            <div className="bg-white border border-[#E5E9F2] rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#E5E9F2]">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono tabular-nums text-xs font-bold text-[#2563EB]">
                      {activeTicket.ticket_code}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        getPriorityMeta(deriveTicketPriority(activeTicket))
                          .badgeClass
                      }`}
                    >
                      {
                        getPriorityMeta(deriveTicketPriority(activeTicket))
                          .label
                      }
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getStatusBadgeClass(
                        activeTicket.status
                      )}`}
                    >
                      {getTicketStatusLabel(activeTicket.status)}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-[#0F172A]">
                    {activeTicket.client_name}
                  </h2>

                  <p className="text-xs text-[#64748B]">
                    {activeTicket.client_email} · {activeTicket.os_type} ·{' '}
                    {formatCategoryForOs(activeTicket.category, activeTicket.os_type)} ·{' '}
                    {activeTicket.service_tier} ($
                    {getServiceTierPriceUsd(activeTicket.service_tier)} USD ·{' '}
                    {getPaymentStatusLabel(activeTicket.payment_status)})
                    {activeTicket.assigned_technician_name
                      ? ` · Técnico: ${activeTicket.assigned_technician_name}`
                      : ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onInspectConnectionRoom(activeTicket)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F172A] bg-[#F8FAFC] border border-[#E5E9F2] hover:border-[#2563EB] rounded-lg transition-colors self-start whitespace-nowrap"
                >
                  <span>Sala /sesion/{activeTicket.ticket_code}</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    Problema reportado
                  </h3>
                  <p className="text-sm text-[#0F172A] mt-1 leading-relaxed">
                    {activeTicket.problem_description}
                  </p>
                </div>

                {/* AI Receptionist + Technician Assistant Box */}
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E9F2] space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#0F172A]">
                      <span className="inline-flex items-center gap-1.5">
                        <Sparkles
                          className="w-3.5 h-3.5 text-[#2563EB]"
                          aria-hidden="true"
                        />
                        <span>Diagnóstico AI Receptionist</span>
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[10px] font-semibold text-[#1D4ED8]">
                        ✦ Generado por IA
                      </span>
                      {activeTicket.human_reviewed_at && activeTicket.human_reviewed_by && (
                        <span
                          data-testid="inbox-human-reviewed-badge"
                          className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-800"
                        >
                          Revisado por {activeTicket.human_reviewed_by}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {onMarkHumanReviewed && !activeTicket.human_reviewed_at && (
                        <button
                          type="button"
                          data-testid="mark-human-reviewed-btn"
                          onClick={() => void onMarkHumanReviewed(activeTicket.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Marcar como revisado</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={assistantLoading || !assistantEnabled}
                        onClick={() => void handleAskTechnicianAssistant()}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] disabled:text-slate-500"
                      >
                        {assistantLoading ? (
                          <Loader2
                            className="w-3.5 h-3.5 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Bot className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>
                          {assistantEnabled
                            ? 'AI Technician Assistant'
                            : 'Asistente IA pausado'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#475569] leading-relaxed">
                    {activeTicket.ai_diagnosis_summary}
                  </p>

                  {assistantData && (
                    <div className="mt-2 pt-2.5 border-t border-[#E5E9F2] space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-[#0F172A]">
                          Checklist sugerido:
                        </p>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[10px] font-semibold text-[#1D4ED8]">
                          ✦ Generado por IA
                        </span>
                      </div>
                      <ul className="space-y-1 text-xs text-[#475569] list-disc pl-4">
                        {assistantData.checklist.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Soft-Blue RustDesk 9-Digit Connection Box (Dashboard V1 Style) */}
              <div className="p-5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[#1E40AF]">
                      ID de RustDesk del Cliente (
                      {activeTicket.agent_type === 'installed'
                        ? 'Host Instalado'
                        : 'Agente Temporal'}
                      )
                    </p>
                    <p className="font-mono tabular-nums text-2xl font-bold tracking-wider text-[#0F172A] mt-0.5">
                      {formattedRustDesk ?? 'Pendiente de registro'}
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                      activeTicket.status
                    )}`}
                  >
                    {getTicketStatusLabel(activeTicket.status)}
                  </span>
                </div>

                {formattedRustDesk && rustdeskDeepLink ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyRustDeskId(activeTicket.rustdesk_id ?? '')
                        }
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#0F172A] bg-white hover:bg-slate-50 border border-[#BFDBFE] rounded-xl transition-colors whitespace-nowrap"
                      >
                        <Copy className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                        <span>
                          {copiedId ? '¡Copiado!' : 'Copiar ID'}
                        </span>
                      </button>

                      <a
                        href={rustdeskDeepLink}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-colors whitespace-nowrap shadow-sm"
                      >
                        <ExternalLink className="w-4 h-4" aria-hidden="true" />
                        <span>Conectar vía RustDesk</span>
                      </a>
                    </div>
                    <p className="text-[11px] text-[#1E3A8A]">
                      ¿Sin cliente RustDesk en este navegador o en móvil? Usa «Copiar ID» y pégalo manualmente en la app oficial de RustDesk.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-[#1E3A8A]">
                    El cliente aún no vincula su ID de 9 dígitos en{' '}
                    <span className="font-mono font-semibold">
                      /sesion/{activeTicket.ticket_code}
                    </span>
                    .
                  </p>
                )}

                <div className="pt-3 border-t border-[#BFDBFE] flex flex-wrap items-center gap-2.5">
                  {activeTicket.payment_status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => void onMarkPaymentPaid(activeTicket.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-[#0F172A] bg-white border border-[#BFDBFE] hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      Verificar estado de pago
                    </button>
                  )}
                  {activeTicket.status !== 'in_progress' &&
                    activeTicket.status !== 'pending_client_confirmation' &&
                    activeTicket.status !== 'resolved' &&
                    activeTicket.status !== 'refunded' && (
                      <button
                        type="button"
                        onClick={() => void onStartSession(activeTicket.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#059669] bg-[#D1FAE5] hover:bg-emerald-200/70 rounded-lg transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Iniciar Sesión Activa</span>
                      </button>
                    )}
                </div>

                {/* Controles administrativos de Pre-Autorización / Captura 48 h / Void (ADR-06) */}
                {isAdminOrOwner &&
                  (activeTicket.payment_status === 'authorized' ||
                    activeTicket.status === 'pending_client_confirmation') &&
                  activeTicket.status !== 'resolved' &&
                  activeTicket.status !== 'refunded' && (
                    <div
                      data-testid="admin-payment-hold-controls"
                      className="pt-3 border-t border-[#BFDBFE] space-y-2.5"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#1E40AF]">
                        Gestión de retención pre-autorizada (Admin)
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {onAutoCaptureTicket && (
                          <button
                            type="button"
                            disabled={isProcessingPaymentAction}
                            data-testid="admin-auto-capture-btn"
                            onClick={async () => {
                              setIsProcessingPaymentAction(true);
                              try {
                                await onAutoCaptureTicket(activeTicket.id);
                              } finally {
                                setIsProcessingPaymentAction(false);
                              }
                            }}
                            className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 rounded-lg transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Capturar pago (Auto-captura 48 h)</span>
                          </button>
                        )}
                      </div>

                      {onVoidAuthorizationTicket && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                          <select
                            aria-label="Motivo de anulación de retención"
                            value={voidOutcome}
                            onChange={(e) =>
                              setVoidOutcome(
                                e.target.value as Exclude<ResolutionOutcome, 'resolved'>
                              )
                            }
                            className="rounded-lg border border-[#BFDBFE] bg-white px-2.5 py-1.5 text-xs text-[#0F172A]"
                          >
                            <option value="software_unresolved">
                              Incidencia de software no resuelta
                            </option>
                            <option value="hardware_fault">
                              Falla física de hardware
                            </option>
                            <option value="client_absent">
                              Cliente ausente / sin respuesta
                            </option>
                          </select>
                          <button
                            type="button"
                            disabled={isProcessingPaymentAction}
                            data-testid="admin-void-auth-btn"
                            onClick={async () => {
                              setIsProcessingPaymentAction(true);
                              try {
                                await onVoidAuthorizationTicket(
                                  activeTicket.id,
                                  voidOutcome
                                );
                              } finally {
                                setIsProcessingPaymentAction(false);
                              }
                            }}
                            className="min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <span>No resuelto — Anular retención ($0 comisión)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </div>

            {/* Live Chat + AI Report Generator Closure */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <TicketChatPanel
                ticketCode={activeTicket.ticket_code}
                messages={activeTicketMessages}
                currentRole="technician"
                disabled={activeTicket.status === 'resolved'}
                onSendMessage={(text) =>
                  void onSendTechnicianMessage(activeTicket.id, text)
                }
              />

              <form
                onSubmit={handleRequestClosureConfirmation}
                noValidate
                data-testid="ticket-closure-form"
                className="bg-white border border-[#E5E9F2] rounded-xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <FileText
                      className="w-4 h-4 text-[#2563EB] shrink-0"
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-bold text-[#0F172A]">
                      Cierre e Informe IA
                    </h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[10px] font-semibold text-[#1D4ED8]">
                      ✦ Generado por IA
                    </span>
                    {activeTicket.human_reviewed_at && activeTicket.human_reviewed_by && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-800">
                        Revisado por {activeTicket.human_reviewed_by}
                      </span>
                    )}
                  </div>

                  {activeTicket.status !== 'resolved' && (
                    <button
                      type="button"
                      disabled={reportLoading}
                      onClick={() => void handleGenerateAiReport()}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] whitespace-nowrap"
                    >
                      {reportLoading ? (
                        <Loader2
                          className="w-3.5 h-3.5 animate-spin shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <Sparkles
                          className="w-3.5 h-3.5 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span>
                        {reportLoading
                          ? 'Generando...'
                          : reportGeneratorEnabled
                          ? 'AI Report Generator'
                          : 'Plantilla manual (IA pausada)'}
                      </span>
                    </button>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="resolution-notes"
                    className="block text-xs font-medium text-[#64748B] mb-1.5"
                  >
                    Resumen técnico de resolución para el cliente
                  </label>
                  <textarea
                    id="resolution-notes"
                    rows={5}
                    value={resolutionDraft}
                    disabled={activeTicket.status === 'resolved'}
                    onChange={(e) => {
                      setResolutionDraft(e.target.value);
                      if (closureError) setClosureError(null);
                    }}
                    placeholder="Describe las acciones ejecutadas o genera el informe automático..."
                    className="w-full rounded-xl border border-[#E5E9F2] px-3.5 py-2.5 text-xs text-[#0F172A] placeholder:text-slate-500 focus:border-[#2563EB] focus:outline-none disabled:bg-[#F8FAFC] disabled:text-[#64748B]"
                  />
                  {closureError && (
                    <p
                      role="alert"
                      className="mt-1.5 text-xs font-medium text-[#DC2626]"
                    >
                      {closureError}
                    </p>
                  )}
                </div>

                {activeTicket.status === 'resolved' || activeTicket.status === 'refunded' ? (
                  <div className="pt-2 border-t border-[#E5E9F2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div
                        className={`flex items-center gap-2 text-xs font-semibold ${
                          activeTicket.status === 'refunded'
                            ? 'text-slate-700'
                            : 'text-[#059669]'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                        <span>
                          {activeTicket.status === 'refunded'
                            ? 'Ticket anulado · Retención liberada ($0 comisión)'
                            : 'Ticket Resuelto y confirmado'}
                        </span>
                      </div>
                      {typeof activeTicket.client_rating === 'number' && (
                        <p className="text-[11px] text-slate-600 tabular-nums">
                          Evaluación del cliente: <strong>{activeTicket.client_rating}★</strong>
                          {activeTicket.client_feedback
                            ? ` · «${activeTicket.client_feedback}»`
                            : ''}
                        </p>
                      )}
                    </div>

                    {activeTicket.status === 'resolved' && (
                      <button
                        type="button"
                        disabled={isMutatingTicket}
                        onClick={() => void onReopenTicket(activeTicket.id)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F172A] bg-[#F8FAFC] hover:bg-slate-100 border border-[#E5E9F2] rounded-lg transition-colors whitespace-nowrap"
                      >
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Reabrir</span>
                      </button>
                    )}
                  </div>
                ) : activeTicket.status === 'pending_client_confirmation' ? (
                  <div
                    data-testid="pending-client-confirmation-notice"
                    className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200 space-y-2"
                  >
                    <p className="text-xs font-bold text-indigo-950">
                      Esperando confirmación y evaluación 1–5★ del cliente
                    </p>
                    <p className="text-[11px] text-indigo-900 leading-relaxed">
                      El informe ya está visible en la Sala de Conexión del cliente. El cobro se capturará al confirmar o por auto-captura tras 48 h
                      {activeTicket.auto_capture_at
                        ? ` (${new Date(activeTicket.auto_capture_at).toLocaleString('es-EC', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })})`
                        : ''}
                      .
                    </p>
                  </div>
                ) : confirmingClosure ? (
                  <div
                    data-testid="closure-confirm-bar"
                    className="p-4 rounded-xl bg-[#FEF3C7]/60 border border-[#FDE68A] space-y-3"
                  >
                    <p className="text-xs font-semibold text-[#92400E]">
                      ¿Enviar resolución del ticket {activeTicket.ticket_code} para
                      doble confirmación del cliente (ventana de 48 h)?
                    </p>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={isMutatingTicket}
                        onClick={() => setConfirmingClosure(false)}
                        className="px-3 py-1.5 text-xs font-medium text-[#475569] bg-white border border-[#E5E9F2] hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={isMutatingTicket}
                        onClick={() => void handleConfirmCloseTicket()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-400 rounded-lg transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>
                          {isMutatingTicket
                            ? 'Enviando...'
                            : 'Enviar para confirmación'}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="submit"
                    data-testid="resolve-incident-btn"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-colors shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>Resolver incidencia</span>
                  </button>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
