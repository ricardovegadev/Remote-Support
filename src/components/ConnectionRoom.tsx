import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  HardDriveDownload,
  KeyRound,
  Lock,
  MonitorCheck,
  Server,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type {
  AgentInstallType,
  SupportTicket,
  TicketMessage,
} from '../types/support';
import {
  formatRustDeskId,
  getAgentDownloadMeta,
  getPaymentStatusLabel,
  getRustDeskInstallerUrl,
  getServiceTierPriceUsd,
  getTicketStatusLabel,
  normalizeRustDeskId,
  validateRustDeskId,
} from '../utils/ticketLogic';
import { TicketChatPanel } from './TicketChatPanel';

interface ConnectionRoomProps {
  ticket: SupportTicket;
  messages: TicketMessage[];
  relayDomain?: string;
  persistenceError?: string | null;
  onDismissError?: () => void;
  onMarkAgentDownloaded: (ticketId: string, agentType: AgentInstallType) => Promise<void>;
  onSaveRustDeskId: (
    ticketId: string,
    rustdeskId: string,
    consentAccepted: boolean
  ) => Promise<void>;
  onConfirmPayment: (ticketId: string) => Promise<void>;
  onSendClientMessage: (ticketId: string, messageText: string) => Promise<void>;
  onResetToNewTicket: () => void;
}

export function ConnectionRoom({
  ticket,
  messages,
  relayDomain = 'relay.remotesupport365.com',
  persistenceError,
  onDismissError,
  onMarkAgentDownloaded,
  onSaveRustDeskId,
  onConfirmPayment,
  onSendClientMessage,
  onResetToNewTicket,
}: ConnectionRoomProps) {
  const [rustdeskInput, setRustdeskInput] = useState(
    ticket.rustdesk_id ? formatRustDeskId(ticket.rustdesk_id) : ''
  );
  const [consentChecked, setConsentChecked] = useState<boolean>(
    ticket.consent_accepted
  );
  const [idError, setIdError] = useState<string | null>(null);
  const [idSavedNotice, setIdSavedNotice] = useState(false);
  const [copiedRelay, setCopiedRelay] = useState(false);

  useEffect(() => {
    if (ticket.rustdesk_id) {
      setRustdeskInput(formatRustDeskId(ticket.rustdesk_id));
    }
    setConsentChecked(ticket.consent_accepted);
  }, [ticket.id, ticket.rustdesk_id, ticket.consent_accepted]);

  const tempAgentMeta = getAgentDownloadMeta(ticket.os_type, 'temporary');
  const installedAgentMeta = getAgentDownloadMeta(ticket.os_type, 'installed');
  const installerEnv = {
    windowsUrl: import.meta.env.VITE_RUSTDESK_WINDOWS_URL as string | undefined,
    macUrl: import.meta.env.VITE_RUSTDESK_MAC_URL as string | undefined,
  };
  const tempInstallerUrl = getRustDeskInstallerUrl(
    ticket.os_type,
    'temporary',
    installerEnv
  );
  const installedInstallerUrl = getRustDeskInstallerUrl(
    ticket.os_type,
    'installed',
    installerEnv
  );
  const tierPrice = getServiceTierPriceUsd(ticket.service_tier);

  const handleCopyRelay = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(relayDomain);
      setCopiedRelay(true);
      window.setTimeout(() => setCopiedRelay(false), 1800);
    }
  };

  const handleRustDeskInputChange = (raw: string) => {
    const digits = normalizeRustDeskId(raw);
    const formatted =
      digits.length > 6
        ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
        : digits.length > 3
        ? `${digits.slice(0, 3)} ${digits.slice(3)}`
        : digits;
    setRustdeskInput(formatted);
    if (idError) setIdError(null);
    if (idSavedNotice) setIdSavedNotice(false);
  };

  const handleSaveRustDeskId = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateRustDeskId(rustdeskInput);
    if (!validation.valid) {
      setIdError(validation.error ?? 'ID inválido.');
      return;
    }
    if (!consentChecked) {
      setIdError(
        'Debes aceptar el consentimiento explícito de acceso remoto supervisado antes de vincular tu ID.'
      );
      return;
    }
    setIdError(null);
    await onSaveRustDeskId(ticket.id, validation.normalized, true);
    setIdSavedNotice(true);
  };

  return (
    <section
      aria-labelledby="connection-room-heading"
      data-testid="connection-room"
      className="py-10 sm:py-12 bg-[#F8FAFC] min-h-[calc(100vh-12rem)]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {persistenceError && (
          <div
            role="alert"
            className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-center justify-between gap-4 text-xs text-red-900"
          >
            <span className="font-medium">{persistenceError}</span>
            {onDismissError && (
              <button
                type="button"
                onClick={onDismissError}
                className="font-semibold underline shrink-0"
              >
                Ocultar
              </button>
            )}
          </div>
        )}

        {/* Top Breadcrumb / Route Context Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            type="button"
            onClick={onResetToNewTicket}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#0B192C] transition-colors self-start"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Volver al inicio / Crear otro ticket</span>
          </button>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="font-mono text-slate-500">
              /sesion/{ticket.ticket_code}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Estado:{' '}
              <strong className="text-[#0B192C]">
                {getTicketStatusLabel(ticket.status)}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Pago:{' '}
              <strong
                className={
                  ticket.payment_status === 'paid'
                    ? 'text-emerald-700'
                    : 'text-amber-700'
                }
              >
                {getPaymentStatusLabel(ticket.payment_status)}
              </strong>
            </span>
          </div>
        </div>

        {/* Ticket Header & Explicit Organization / Technician Traceability */}
        <div className="bg-[#0B192C] text-white rounded-xl p-6 sm:p-8 border border-slate-800 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-xs font-medium text-[#10B981]">
                Sala de Conexión Cifrada del Cliente
              </p>
              <h1
                id="connection-room-heading"
                className="text-2xl sm:text-3xl font-bold tracking-tight mt-1"
              >
                Ticket{' '}
                <span className="font-mono tabular-nums" data-testid="generated-ticket-id">
                  {ticket.ticket_code}
                </span>
              </h1>
              <p className="text-sm text-slate-300 mt-2">
                {ticket.client_name} · {ticket.client_email} · {ticket.os_type} ·{' '}
                {ticket.service_tier}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <div className="bg-[#0F172A] border border-slate-700 rounded-lg px-5 py-3">
                <p className="text-xs text-slate-400">Tarifa del servicio</p>
                <p className="font-mono tabular-nums text-xl font-bold text-[#10B981] mt-0.5">
                  ${tierPrice} USD
                </p>
              </div>

              {ticket.payment_status === 'pending' && ticket.status !== 'resolved' && (
                <button
                  type="button"
                  onClick={() => onConfirmPayment(ticket.id)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap"
                >
                  <CreditCard className="w-4 h-4" aria-hidden="true" />
                  <span>Confirmar Pago (${tierPrice} USD)</span>
                </button>
              )}
            </div>
          </div>

          {/* Explicit Traceability Bar: Organization + Assigned Technician */}
          <div
            data-testid="session-traceability-card"
            className="pt-5 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-4 flex items-start gap-3">
              <Building2
                className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <p className="text-[11px] text-slate-400">Organización responsable</p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {ticket.organization_name}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Operación auditada y sesión cifrada TLS 1.3
                </p>
              </div>
            </div>

            <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-4 flex items-start gap-3">
              <UserCheck
                className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <p className="text-[11px] text-slate-400">Técnico asignado al equipo</p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {ticket.assigned_technician_name ?? 'En cola prioritaria de despacho'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {ticket.assigned_technician_name
                    ? `${ticket.assigned_technician_specialty ?? 'Especialista Verificado'} · Asignación atómica confirmada`
                    : 'El primer especialista certificado disponible tomará tu ticket'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Resolution Banner when resolved */}
        {ticket.status === 'resolved' && (
          <div
            data-testid="client-resolved-banner"
            className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-2"
          >
            <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5 text-[#10B981]" aria-hidden="true" />
              <span>Ticket Resuelto · Sesión Remota Finalizada</span>
            </div>
            {ticket.resolution_notes && (
              <p className="text-xs text-emerald-950 whitespace-pre-line leading-relaxed pt-1">
                {ticket.resolution_notes}
              </p>
            )}
          </div>
        )}

        {/* Main Workspace: Left (Double RustDesk Agent + 9-digit ID + Consent) & Right (Live Chat) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Double RustDesk Agent */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#2563EB]">
                  Paso 1 · Descarga del Agente RustDesk
                </span>
                {ticket.agent_downloaded && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {ticket.agent_type === 'installed'
                        ? 'Agente Instalado descargado'
                        : 'Agente Temporal descargado'}
                    </span>
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-lg font-semibold text-[#0B192C]">
                  Elige el modo de agente para tu equipo ({ticket.os_type})
                </h2>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  Para incidencias puntuales usa el <strong>Agente Temporal</strong> sin
                  instalación. Si cuentas con un plan mensual Pyme, usa el{' '}
                  <strong>Agente Instalado</strong>.
                </p>
              </div>

              {/* Primary: Temporary Quick Agent */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-semibold text-[#10B981]">
                    Opción Principal · Ticket Puntual (Sin instalación)
                  </p>
                  <p className="font-mono text-sm font-semibold text-[#0B192C] break-words">
                    {tempAgentMeta.fileName}
                  </p>
                  <p className="text-xs text-slate-600">{tempAgentMeta.sizeLabel}</p>
                  <p className="text-xs text-slate-500">{tempAgentMeta.shaHint}</p>
                </div>

                <a
                  href={tempInstallerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => void onMarkAgentDownloaded(ticket.id, 'temporary')}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-colors text-center sm:whitespace-nowrap shrink-0 max-w-full ${
                    ticket.agent_downloaded && ticket.agent_type === 'temporary'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : 'bg-[#2563EB] text-white hover:bg-blue-500'
                  }`}
                >
                  <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="break-words">
                    Descargar {tempAgentMeta.fileName}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-80" aria-hidden="true" />
                </a>
              </div>

              {/* Secondary: Installed Unattended Agent */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500">
                    Opción Secundaria · Clientes con Plan Mensual Pyme
                  </p>
                  <p className="font-mono text-sm font-semibold text-[#0B192C] break-words">
                    {installedAgentMeta.fileName}
                  </p>
                  <p className="text-xs text-slate-600">{installedAgentMeta.sizeLabel}</p>
                  <p className="text-xs text-slate-500">{installedAgentMeta.shaHint}</p>
                </div>

                <a
                  href={installedInstallerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => void onMarkAgentDownloaded(ticket.id, 'installed')}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-colors text-center sm:whitespace-nowrap shrink-0 max-w-full ${
                    ticket.agent_downloaded && ticket.agent_type === 'installed'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : 'bg-white text-[#0B192C] border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <HardDriveDownload className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="break-words">
                    Agente Instalado ({installedAgentMeta.fileName})
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" aria-hidden="true" />
                </a>
              </div>

              {/* Relay Server Configuration Box */}
              <div
                data-testid="rustdesk-relay-instructions"
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#0B192C]">
                    <Server className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                    <span>Configuración del Servidor Relay RustDesk</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyRelay}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    {copiedRelay ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Copiar servidor</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Al abrir RustDesk, ve a <strong>Ajustes → Red → Servidor ID / Relay</strong> y
                  coloca:{' '}
                  <code className="font-mono font-semibold text-[#0B192C] bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {relayDomain}
                  </code>{' '}
                  para enrutar tu sesión de forma cifrada con {ticket.organization_name}.
                </p>
              </div>
            </div>

            {/* Step 2: 9-digit RustDesk ID + Explicit Access Consent */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#2563EB]">
                  Paso 2 · Vinculación Remota y Consentimiento
                </span>
                <Lock className="w-4 h-4 text-slate-400" aria-hidden="true" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-[#0B192C]">
                  Pega tu ID de 9 dígitos de RustDesk y autoriza la sesión
                </h2>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  Al abrir el agente verás un número de 9 dígitos bajo &ldquo;Su ID&rdquo;.
                  Ingrésalo aquí para habilitar la conexión directa del técnico.
                </p>
              </div>

              <form onSubmit={handleSaveRustDeskId} noValidate className="space-y-4">
                <div>
                  <label
                    htmlFor="rustdesk-id-input"
                    className="block text-xs font-semibold text-[#0B192C] mb-1.5"
                  >
                    ID de RustDesk (9 dígitos)
                  </label>
                  <div className="relative">
                    <KeyRound
                      className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <input
                      id="rustdesk-id-input"
                      type="text"
                      inputMode="numeric"
                      value={rustdeskInput}
                      onChange={(e) => handleRustDeskInputChange(e.target.value)}
                      placeholder="Ej. 123 456 789"
                      className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-3 font-mono tabular-nums text-lg tracking-wider text-[#0B192C] placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
                    />
                  </div>
                </div>

                {/* Explicit Access Consent Panel */}
                <div className="p-4 rounded-lg bg-[#F8FAFC] border border-slate-200 space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => {
                        setConsentChecked(e.target.checked);
                        if (idError) setIdError(null);
                      }}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                    />
                    <span className="text-xs text-slate-700 leading-relaxed">
                      <strong>Consentimiento explícito de acceso remoto:</strong> Autorizo a{' '}
                      <span className="font-semibold text-[#0B192C]">
                        {ticket.organization_name}
                      </span>{' '}
                      y al especialista asignado a visualizar y operar mi equipo de forma
                      supervisada. Puedo finalizar o revocar la sesión en cualquier
                      momento.
                    </span>
                  </label>
                </div>

                {idError && (
                  <p role="alert" className="text-xs font-medium text-red-700">
                    {idError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#10B981] hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap"
                >
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                  <span>Vincular ID y Autorizar Acceso</span>
                </button>
              </form>

              {(ticket.rustdesk_id || idSavedNotice) && (
                <div
                  data-testid="rustdesk-id-saved-banner"
                  className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-3"
                >
                  <MonitorCheck
                    className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div className="text-xs text-emerald-950 space-y-1">
                    <p className="font-semibold">
                      ID RustDesk vinculado:{' '}
                      <span className="font-mono tabular-nums">
                        {formatRustDeskId(ticket.rustdesk_id)}
                      </span>
                    </p>
                    <p className="text-emerald-900/80">
                      Consentimiento registrado y enviado en tiempo real al Centro de
                      Operaciones. Mantén el agente abierto para aceptar la conexión.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Synchronized Chat */}
          <div className="lg:col-span-5">
            <TicketChatPanel
              ticketCode={ticket.ticket_code}
              messages={messages}
              currentRole="client"
              disabled={ticket.status === 'resolved'}
              onSendMessage={(text) => onSendClientMessage(ticket.id, text)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
