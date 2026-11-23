import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  HardDriveDownload,
  KeyRound,
  Loader2,
  Lock,
  MonitorCheck,
  Share2,
  ShieldCheck,
  Trash2,
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
import type { LegalDocTab } from './LegalDocsModal';
import {
  CardNetworkBadges,
  GooglePayLogo,
  PayPalLogo,
  StripeLogo,
} from './PaymentBrandLogos';

interface ConnectionRoomProps {
  ticket: SupportTicket;
  messages: TicketMessage[];
  persistenceError?: string | null;
  onDismissError?: () => void;
  onMarkAgentDownloaded: (ticketId: string, agentType: AgentInstallType) => Promise<void>;
  onSaveRustDeskId: (
    ticketId: string,
    rustdeskId: string,
    consentAccepted: boolean
  ) => Promise<boolean | void>;
  onConfirmPayment: (ticketId: string) => Promise<void>;
  onSendClientMessage: (ticketId: string, messageText: string) => Promise<void>;
  onResetToNewTicket: () => void;
  onOpenLegalDoc?: (tab: LegalDocTab) => void;
  onExportClientData?: (ticketId: string) => void;
  onAnonymizeClientData?: (ticketId: string) => Promise<boolean | void>;
}

function isEmbeddedInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function ConnectionRoom({
  ticket,
  messages,
  persistenceError,
  onDismissError,
  onMarkAgentDownloaded,
  onSaveRustDeskId,
  onConfirmPayment,
  onSendClientMessage,
  onResetToNewTicket,
  onOpenLegalDoc,
  onExportClientData,
  onAnonymizeClientData,
}: ConnectionRoomProps) {
  const [rustdeskInput, setRustdeskInput] = useState(
    ticket.rustdesk_id ? formatRustDeskId(ticket.rustdesk_id) : ''
  );
  const [consentChecked, setConsentChecked] = useState<boolean>(
    ticket.consent_accepted
  );
  const [idError, setIdError] = useState<string | null>(null);
  const [idSavedNotice, setIdSavedNotice] = useState(false);
  const [isSavingRustDeskId, setIsSavingRustDeskId] = useState(false);

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
  const isMonthlyPlan =
    ticket.billing_mode === 'pyme_monthly' || ticket.service_tier.startsWith('Pyme ');

  const [addonPerformance, setAddonPerformance] = useState(false);
  const [paidAmountUsd, setPaidAmountUsd] = useState<number | null>(null);
  const computedTotalUsd = isMonthlyPlan
    ? tierPrice
    : tierPrice + (addonPerformance ? 12 : 0);
  const displayedPaidUsd = paidAmountUsd ?? computedTotalUsd;
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [processingMethod, setProcessingMethod] = useState<
    'google_pay' | 'paypal' | 'stripe' | 'card' | null
  >(null);
  const [pendingExternalCheckout, setPendingExternalCheckout] = useState<{
    gateway: 'stripe' | 'paypal';
    sessionId?: string;
    orderId?: string;
    url: string;
    methodLabel: string;
  } | null>(null);
  const [isVerifyingExternal, setIsVerifyingExternal] = useState(false);
  const processedReturnKeyRef = useRef<string | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);
  const [confirmAnonymizeOpen, setConfirmAnonymizeOpen] = useState(false);
  const [privacyActionNotice, setPrivacyActionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const paymentParam = params.get('payment');
    const gatewayParam = params.get('gateway');
    const sessionId = params.get('session_id');
    const paypalToken = params.get('token') ?? params.get('orderId');

    if (!paymentParam) return;

    const cleanUrl = () => {
      window.history.replaceState({}, '', window.location.pathname);
    };

    if (ticket.payment_status === 'paid') {
      cleanUrl();
      return;
    }

    const returnKey = `${ticket.id}:${paymentParam}:${gatewayParam ?? ''}:${sessionId ?? paypalToken ?? ''}`;
    if (processedReturnKeyRef.current === returnKey) return;
    processedReturnKeyRef.current = returnKey;

    if (paymentParam === 'canceled') {
      setPaymentError(
        'El pago fue cancelado antes de completarse. Puedes intentarlo nuevamente cuando estés listo.'
      );
      cleanUrl();
      return;
    }

    if (paymentParam === 'success') {
      if ((gatewayParam === 'stripe' || !gatewayParam) && sessionId) {
        setIsProcessingPayment(true);
        setProcessingMethod('stripe');
        setPaymentError(null);
        void fetch(
          `/api/payments/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}&ticket_code=${encodeURIComponent(ticket.ticket_code)}`,
          {
            headers: {
              'x-ticket-token': ticket.client_session_token,
            },
          }
        )
          .then(async (res) => {
            const data = (await res.json()) as {
              verified?: boolean;
              amountUsd?: number;
              error?: string;
            };
            if (!res.ok || !data.verified) {
              setPaymentError(
                data.error ??
                  'Stripe no confirmó el pago todavía. Inténtalo nuevamente.'
              );
              return;
            }
            if (typeof data.amountUsd === 'number' && Number.isFinite(data.amountUsd)) {
              setPaidAmountUsd(data.amountUsd);
            }
            await onConfirmPayment(ticket.id);
            setPendingExternalCheckout(null);
            setPaymentSuccessNotice(
              'Pago confirmado y verificado con Stripe. Tu Sala de Conexión ya está habilitada.'
            );
          })
          .catch(() => {
            setPaymentError(
              'No se pudo verificar la sesión de pago con Stripe.'
            );
          })
          .finally(() => {
            cleanUrl();
            setIsProcessingPayment(false);
            setProcessingMethod(null);
          });
      } else if (gatewayParam === 'paypal' && paypalToken) {
        setIsProcessingPayment(true);
        setProcessingMethod('paypal');
        setPaymentError(null);
        void fetch('/api/payments/paypal/capture-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-ticket-token': ticket.client_session_token,
          },
          body: JSON.stringify({
            orderId: paypalToken,
            ticketCode: ticket.ticket_code,
            sessionToken: ticket.client_session_token,
          }),
        })
          .then(async (res) => {
            const data = (await res.json()) as {
              verified?: boolean;
              status?: string;
              amountUsd?: number;
              error?: string;
            };
            if (!res.ok || !data.verified || data.status !== 'COMPLETED') {
              setPaymentError(
                data.error ??
                  'PayPal no completó la captura del pago. Inténtalo nuevamente.'
              );
              return;
            }
            if (typeof data.amountUsd === 'number' && Number.isFinite(data.amountUsd)) {
              setPaidAmountUsd(data.amountUsd);
            }
            await onConfirmPayment(ticket.id);
            setPendingExternalCheckout(null);
            setPaymentSuccessNotice(
              'Pago confirmado y capturado con PayPal. Tu Sala de Conexión ya está habilitada.'
            );
          })
          .catch(() => {
            setPaymentError('No se pudo capturar la orden de PayPal.');
          })
          .finally(() => {
            cleanUrl();
            setIsProcessingPayment(false);
            setProcessingMethod(null);
          });
      } else {
        cleanUrl();
      }
    }
  }, [ticket.id, ticket.ticket_code, ticket.client_session_token, ticket.payment_status, onConfirmPayment]);

  const handleShareReferral = async () => {
    const shareUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/portal?ref=${encodeURIComponent(ticket.ticket_code)}`
        : `https://remotesupport365.com/portal?ref=${encodeURIComponent(ticket.ticket_code)}`;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Remote Support 365 — soporte técnico remoto',
          text: 'Conoce las tarifas vigentes y solicita soporte técnico remoto para tu equipo.',
          url: shareUrl,
        });
        setReferralCopied(true);
        window.setTimeout(() => setReferralCopied(false), 3000);
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
    }
    setReferralCopied(true);
    window.setTimeout(() => setReferralCopied(false), 3000);
  };

  const handleVerifyPendingCheckout = async () => {
    if (!pendingExternalCheckout || isVerifyingExternal) return;
    setIsVerifyingExternal(true);
    setPaymentError(null);
    try {
      if (pendingExternalCheckout.gateway === 'stripe') {
        if (!pendingExternalCheckout.sessionId) {
          setPaymentError(
            'No hay identificador de sesión de Stripe para verificar. Inicia el pago nuevamente.'
          );
          return;
        }
        const res = await fetch(
          `/api/payments/stripe/verify-session?session_id=${encodeURIComponent(
            pendingExternalCheckout.sessionId
          )}&ticket_code=${encodeURIComponent(ticket.ticket_code)}`,
          {
            headers: {
              'x-ticket-token': ticket.client_session_token,
            },
          }
        );
        const data = (await res.json()) as {
          verified?: boolean;
          payment_status?: string;
          amountUsd?: number;
          error?: string;
        };
        if (!res.ok || !data.verified) {
          setPaymentError(
            data.error ??
              'El pago aún figura pendiente en Stripe. Complétalo en la pestaña abierta y vuelve a pulsar "Ya completé el pago · Verificar ahora".'
          );
          return;
        }
        if (typeof data.amountUsd === 'number' && Number.isFinite(data.amountUsd)) {
          setPaidAmountUsd(data.amountUsd);
        }
        setPendingExternalCheckout(null);
        await onConfirmPayment(ticket.id);
        setPaymentSuccessNotice(
          `Pago verificado con ${pendingExternalCheckout.methodLabel}. Tu Sala de Conexión ya está habilitada.`
        );
      } else if (pendingExternalCheckout.gateway === 'paypal') {
        if (!pendingExternalCheckout.orderId) {
          setPaymentError(
            'No hay identificador de orden de PayPal para verificar.'
          );
          return;
        }
        const res = await fetch('/api/payments/paypal/capture-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-ticket-token': ticket.client_session_token,
          },
          body: JSON.stringify({
            orderId: pendingExternalCheckout.orderId,
            ticketCode: ticket.ticket_code,
            sessionToken: ticket.client_session_token,
          }),
        });
        const data = (await res.json()) as {
          verified?: boolean;
          status?: string;
          amountUsd?: number;
          error?: string;
        };
        if (!res.ok || !data.verified || data.status !== 'COMPLETED') {
          setPaymentError(
            data.error ??
              'PayPal aún no reporta la orden aprobada. Completa la aprobación en la pestaña abierta e inténtalo de nuevo.'
          );
          return;
        }
        if (typeof data.amountUsd === 'number' && Number.isFinite(data.amountUsd)) {
          setPaidAmountUsd(data.amountUsd);
        }
        setPendingExternalCheckout(null);
        await onConfirmPayment(ticket.id);
        setPaymentSuccessNotice(
          'Pago verificado con PayPal. Tu Sala de Conexión ya está habilitada.'
        );
      }
    } catch {
      setPaymentError(
        'Error de red al verificar el pago externo. Inténtalo nuevamente.'
      );
    } finally {
      setIsVerifyingExternal(false);
    }
  };

  const handleExecutePayment = async (
    method: 'google_pay' | 'paypal' | 'stripe',
    isDirectCard = false
  ) => {
    setIsProcessingPayment(true);
    setProcessingMethod(isDirectCard ? 'card' : method);
    setPaymentError(null);
    try {
      if (method === 'stripe' || method === 'google_pay') {
        const res = await fetch('/api/payments/stripe/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketCode: ticket.ticket_code,
            sessionToken: ticket.client_session_token,
            serviceTier: ticket.service_tier,
            addonPerformance: !isMonthlyPlan && addonPerformance,
          }),
        });
        const data = (await res.json()) as {
          success?: boolean;
          mode?: 'sandbox' | 'live';
          verified?: boolean;
          sessionId?: string;
          url?: string | null;
          amountUsd?: number;
          error?: string;
        };

        if (!res.ok || !data.success) {
          setPaymentError(
            data.error ?? 'No se pudo iniciar la sesión segura de pago.'
          );
          return;
        }

        if (data.mode === 'live') {
          if (!data.url) {
            setPaymentError(
              'Stripe no devolvió una URL de Checkout válida. Inténtalo nuevamente.'
            );
            return;
          }

          if (isEmbeddedInIframe()) {
            const methodLabel =
              method === 'google_pay'
                ? 'Google Pay'
                : isDirectCard
                ? 'Tarjeta (Stripe Checkout)'
                : 'Stripe Checkout';
            setPendingExternalCheckout({
              gateway: 'stripe',
              sessionId: data.sessionId,
              url: data.url,
              methodLabel,
            });
            return;
          }

          window.location.assign(data.url);
          return;
        }

        if (data.verified === true) {
          setPaidAmountUsd(
            typeof data.amountUsd === 'number' && Number.isFinite(data.amountUsd)
              ? data.amountUsd
              : computedTotalUsd
          );
          await onConfirmPayment(ticket.id);
          setPaymentSuccessNotice(
            `Pago confirmado en modo sandbox (${
              method === 'google_pay' ? 'Google Pay' : 'Stripe'
            }). Tu Sala de Conexión ya está habilitada.`
          );
          return;
        }

        setPaymentError('El pago no pudo ser verificado.');
      } else if (method === 'paypal') {
        const orderRes = await fetch('/api/payments/paypal/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketCode: ticket.ticket_code,
            sessionToken: ticket.client_session_token,
            serviceTier: ticket.service_tier,
            addonPerformance: !isMonthlyPlan && addonPerformance,
          }),
        });
        const orderData = (await orderRes.json()) as {
          success?: boolean;
          mode?: 'sandbox' | 'live';
          orderId?: string;
          approvalUrl?: string | null;
          amountUsd?: number;
          error?: string;
        };

        if (!orderRes.ok || !orderData.success || !orderData.orderId) {
          setPaymentError(
            orderData.error ?? 'No se pudo iniciar la orden de PayPal.'
          );
          return;
        }

        if (orderData.mode === 'live') {
          if (!orderData.approvalUrl) {
            setPaymentError(
              'PayPal no devolvió enlace de aprobación. Inténtalo nuevamente.'
            );
            return;
          }

          if (isEmbeddedInIframe()) {
            setPendingExternalCheckout({
              gateway: 'paypal',
              orderId: orderData.orderId,
              url: orderData.approvalUrl,
              methodLabel: 'PayPal',
            });
            return;
          }

          window.location.assign(orderData.approvalUrl);
          return;
        }

        const captureRes = await fetch('/api/payments/paypal/capture-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-ticket-token': ticket.client_session_token,
          },
          body: JSON.stringify({
            orderId: orderData.orderId,
            ticketCode: ticket.ticket_code,
            sessionToken: ticket.client_session_token,
          }),
        });
        const captureData = (await captureRes.json()) as {
          success?: boolean;
          verified?: boolean;
          status?: string;
          amountUsd?: number;
          error?: string;
        };

        if (
          !captureRes.ok ||
          !captureData.success ||
          !captureData.verified ||
          captureData.status !== 'COMPLETED'
        ) {
          setPaymentError(
            captureData.error ??
              'No se pudo confirmar la captura del pago en PayPal.'
          );
          return;
        }

        setPaidAmountUsd(
          typeof captureData.amountUsd === 'number' && Number.isFinite(captureData.amountUsd)
            ? captureData.amountUsd
            : typeof orderData.amountUsd === 'number' && Number.isFinite(orderData.amountUsd)
            ? orderData.amountUsd
            : computedTotalUsd
        );
        await onConfirmPayment(ticket.id);
        setPaymentSuccessNotice(
          'Pago confirmado en modo sandbox (PayPal). Tu Sala de Conexión ya está habilitada.'
        );
      }
    } catch {
      setPaymentError('Error de red al procesar el pago. Inténtalo nuevamente.');
    } finally {
      setIsProcessingPayment(false);
      setProcessingMethod(null);
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
    if (isSavingRustDeskId) return;
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
    setIsSavingRustDeskId(true);
    try {
      const saved = await onSaveRustDeskId(ticket.id, validation.normalized, true);
      setIdSavedNotice(saved !== false);
    } finally {
      setIsSavingRustDeskId(false);
    }
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

        {/* 3-Step Visual Onboarding Progress Stepper */}
        <ol
          aria-label="Progreso de conexión"
          data-testid="room-progress-stepper"
          className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white border border-slate-200 rounded-xl p-3 text-xs"
        >
          {[
            {
              num: 1,
              label: 'Confirmar pago',
              done: ticket.payment_status === 'paid',
              active: ticket.payment_status !== 'paid',
            },
            {
              num: 2,
              label: 'Descargar RustDesk',
              done: Boolean(ticket.agent_downloaded || ticket.rustdesk_id),
              active:
                ticket.payment_status === 'paid' &&
                !ticket.agent_downloaded &&
                !ticket.rustdesk_id,
            },
            {
              num: 3,
              label: 'Vincular ID y conectar',
              done: Boolean(ticket.rustdesk_id && ticket.consent_accepted),
              active:
                ticket.payment_status === 'paid' &&
                Boolean(ticket.agent_downloaded) &&
                !(ticket.rustdesk_id && ticket.consent_accepted),
            },
          ].map((step) => (
            <li
              key={step.num}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors ${
                step.done
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : step.active
                  ? 'bg-blue-50/70 border-blue-200 text-[#0B192C]'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                  step.done
                    ? 'bg-emerald-600 text-white'
                    : step.active
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {step.done ? '✓' : step.num}
              </span>
              <span className="font-semibold truncate">{step.label}</span>
            </li>
          ))}
        </ol>

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
                <p className="text-xs text-slate-300">
                  Tarifa vigente
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <p className="font-mono tabular-nums text-xl font-bold text-[#10B981]">
                    ${tierPrice} USD
                  </p>
                </div>
              </div>
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
                <p className="text-[11px] text-slate-300">Organización responsable</p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {ticket.organization_name}
                </p>
                <p className="text-xs text-slate-300 mt-0.5">
                  Se registran eventos técnicos seleccionados de esta operación.
                </p>
              </div>
            </div>

            <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-4 flex items-start gap-3">
              <UserCheck
                className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <p className="text-[11px] text-slate-300">Técnico asignado al equipo</p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {ticket.assigned_technician_name ?? 'En cola prioritaria de despacho'}
                </p>
                <p className="text-xs text-slate-300 mt-0.5">
                  {ticket.assigned_technician_name
                    ? `${ticket.assigned_technician_specialty ?? 'Especialista Verificado'} · Asignación atómica confirmada`
                    : 'El primer especialista disponible tomará tu ticket'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Multi-Method Checkout Block when Payment is Pending */}
        {ticket.payment_status === 'pending' && ticket.status !== 'resolved' && (
          <div
            data-testid="professional-checkout-module"
            className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div>
                <p className="text-xs font-semibold text-[#2563EB]">
                  Pasarela Segura · Confirmación de Pago
                </p>
                <h2 className="text-xl font-bold text-[#0B192C] mt-1">
                  Completa tu pago para habilitar la conexión en vivo
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Ticket <span className="font-mono font-semibold">{ticket.ticket_code}</span> · {ticket.service_tier}
                </p>
              </div>
              <div className="text-left md:text-right bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 shrink-0">
                <p className="text-[11px] text-slate-600 font-medium">Total a pagar</p>
                <p className="font-mono tabular-nums text-2xl font-bold text-emerald-700">
                  USD ${computedTotalUsd.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Summary & Upsell Addons */}
              <div className="lg:col-span-6 space-y-5">
                <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0B192C]">
                    Resumen del Servicio
                  </h3>
                  <div className="space-y-2 text-xs text-slate-700">
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-200/70">
                      <span>{ticket.service_tier} ({ticket.category})</span>
                      <div className="flex items-baseline gap-2 font-mono tabular-nums">
                        <span className="font-semibold text-[#0B192C]">
                          ${tierPrice}.00 USD
                        </span>
                      </div>
                    </div>
                    {!isMonthlyPlan && (
                      <div className="flex items-start gap-2.5 pt-2">
                        <input
                          type="checkbox"
                          id="addon-performance"
                          checked={addonPerformance}
                          onChange={(e) => setAddonPerformance(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                        />
                        <label htmlFor="addon-performance" className="cursor-pointer text-xs text-slate-700 leading-snug">
                          <strong>+ Optimización profunda de rendimiento</strong> (+ $12.00 USD)
                          <span className="block text-[11px] text-slate-500">Eliminación de archivos basura, optimización de inicio y servicios.</span>
                        </label>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/80 font-semibold text-[#0B192C]">
                      <span>Total a pagar</span>
                      <span className="font-mono tabular-nums">
                        ${computedTotalUsd.toFixed(2)} USD{isMonthlyPlan ? '/mes' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-1.5">
                  <p className="font-semibold">Garantía de resolución y reembolsos</p>
                  <p className="leading-relaxed">
                    Garantía de resolución: si el problema técnico no puede resolverse en sesión, gestionamos el reembolso conforme a nuestra{' '}
                    <button
                      type="button"
                      onClick={() => onOpenLegalDoc?.('refunds')}
                      className="font-semibold text-[#2563EB] hover:underline"
                    >
                      Política de Reembolsos
                    </button>
                    .
                  </p>
                </div>

                {ticket.billing_mode === 'pyme_monthly' && (
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 space-y-1">
                    <p className="font-semibold">
                      Información de facturación mensual
                    </p>
                    <p className="leading-relaxed">
                      Este plan tiene facturación mensual recurrente. Para gestionar la renovación o cancelación, contacta a soporte antes del siguiente ciclo; la cancelación automática desde esta sala aún no está disponible.
                    </p>
                  </div>
                )}
              </div>

                {/* Right Column: Payment Methods or External Checkout Waiting Panel */}
              <div className="lg:col-span-6 space-y-5">
                {pendingExternalCheckout ? (
                  <div
                    data-testid="external-checkout-waiting-panel"
                    className="rounded-xl border border-blue-200 bg-blue-50/70 p-5 space-y-4"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[#1D4ED8]">
                        Pasarela Segura Lista ({pendingExternalCheckout.methodLabel})
                      </p>
                      <h3 className="text-base font-bold text-[#0B192C]">
                        Abre la pasarela cifrada y luego confirma tu pago aquí
                      </h3>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        Para evitar bloqueos dentro del marco de vista previa, abre el
                        checkout seguro en una nueva pestaña. Al completar el pago, pulsa
                        el botón de verificación.
                      </p>
                    </div>

                    {paymentError && (
                      <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {paymentError}
                      </p>
                    )}

                    <div className="space-y-2.5">
                      <a
                        href={pendingExternalCheckout.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-11 inline-flex items-center justify-center gap-2 px-4 text-xs sm:text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors shadow-xs"
                      >
                        <span>Abrir pasarela segura en nueva pestaña</span>
                        <ExternalLink className="w-4 h-4" aria-hidden="true" />
                      </a>

                      <button
                        type="button"
                        disabled={isVerifyingExternal}
                        onClick={() => void handleVerifyPendingCheckout()}
                        className="w-full h-11 inline-flex items-center justify-center gap-2 px-4 text-xs sm:text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-700/70 rounded-lg transition-colors shadow-xs cursor-pointer"
                      >
                        {isVerifyingExternal ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                            <span>Verificando pago...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                            <span>Ya completé el pago · Verificar ahora</span>
                          </>
                        )}
                      </button>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setPendingExternalCheckout(null);
                            setPaymentError(null);
                          }}
                          className="text-xs font-medium text-slate-600 hover:text-[#0B192C] underline"
                        >
                          Elegir otro método
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Primary PCI-DSS Hosted Stripe Card Checkout */}
                    <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 space-y-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B192C]">
                          <CreditCard className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                          <span>Tarjeta débito / crédito vía Stripe (PCI-DSS)</span>
                        </span>
                        <CardNetworkBadges />
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Ingresas tu tarjeta directamente en la pasarela cifrada de Stripe
                        sin almacenar datos bancarios en este sitio.
                      </p>

                      {paymentError && (
                        <p role="alert" className="text-xs font-medium text-red-700">
                          {paymentError}
                        </p>
                      )}

                      <button
                        type="button"
                        disabled={isProcessingPayment}
                        onClick={() => void handleExecutePayment('stripe', true)}
                        className="w-full h-12 inline-flex items-center justify-center gap-2 px-5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-400 rounded-lg transition-colors whitespace-nowrap shadow-sm cursor-pointer disabled:cursor-not-allowed"
                      >
                        {processingMethod === 'card' || processingMethod === 'stripe' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                            <span>Abriendo pasarela segura...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" aria-hidden="true" />
                            <span>
                              {`Pagar con tarjeta / Stripe · $${computedTotalUsd.toFixed(2)} USD`}
                            </span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Subtle Divider */}
                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-slate-200" />
                      <span className="flex-shrink mx-3.5 text-slate-600 text-[11px] font-medium">
                        o paga rápido con billetera digital
                      </span>
                      <div className="flex-grow border-t border-slate-200" />
                    </div>

                    <div className={`grid gap-2.5 ${!isMonthlyPlan ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                      <button
                        type="button"
                        disabled={isProcessingPayment}
                        onClick={() => void handleExecutePayment('google_pay')}
                        aria-label={`Pagar $${computedTotalUsd.toFixed(2)} USD con Google Pay`}
                        className="w-full h-11 bg-black hover:bg-neutral-900 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                      >
                        {processingMethod === 'google_pay' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                            <span className="text-xs font-semibold">Conectando...</span>
                          </>
                        ) : (
                          <GooglePayLogo variant="dark" />
                        )}
                      </button>

                      {!isMonthlyPlan && (
                        <button
                          type="button"
                          disabled={isProcessingPayment}
                          onClick={() => void handleExecutePayment('paypal')}
                          aria-label={`Pagar $${computedTotalUsd.toFixed(2)} USD con PayPal`}
                          className="w-full h-11 bg-[#FFC439] hover:bg-[#F5BA2E] text-[#003087] font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                        >
                          {processingMethod === 'paypal' ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-[#003087]" aria-hidden="true" />
                              <span className="text-xs font-bold">Abriendo PayPal...</span>
                            </>
                          ) : (
                            <PayPalLogo />
                          )}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment Confirmed Green Banner */}
        {ticket.payment_status === 'paid' && ticket.status !== 'resolved' && (
          <div
            data-testid="payment-confirmed-banner"
            className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold text-emerald-950">
                  Pago confirmado y verificado · {ticket.service_tier}
                </p>
                <p className="text-xs text-emerald-800 mt-0.5">
                  {paymentSuccessNotice ??
                    'Tu ticket está habilitado para atención prioritaria. Descarga el agente RustDesk y comparte tu ID de 9 dígitos abajo.'}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-emerald-300 font-mono text-xs font-semibold text-emerald-800 shrink-0 self-start sm:self-center">
              PAGADO · USD ${displayedPaidUsd.toFixed(2)}
            </span>
          </div>
        )}

        {/* AI Pre-Diagnosis Transparency Card */}
        {ticket.ai_diagnosis_summary && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-[#0B192C]">
                Pre-diagnóstico técnico adjunto al ticket
              </p>
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[11px] font-semibold text-[#1D4ED8]">
                ✦ Generado por IA · Revisado por especialista
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {ticket.ai_diagnosis_summary}
            </p>
          </div>
        )}

        {/* Resolution Banner when resolved */}
        {ticket.status === 'resolved' && (
          <div
            data-testid="client-resolved-banner"
            className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                <span>Ticket Resuelto · Sesión Remota Finalizada</span>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-white border border-emerald-300 text-[11px] font-semibold text-emerald-800">
                ✦ Generado por IA · Revisado por especialista
              </span>
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

              {/* Recommended Installer based on Plan Mode */}
              {!isMonthlyPlan ? (
                <>
                  <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-semibold text-emerald-700">
                        Recomendado para tu ticket · Sin instalación
                      </p>
                      <p className="font-mono text-sm font-semibold text-[#0B192C] break-words">
                        {tempAgentMeta.fileName}
                      </p>
                      <p className="text-xs text-slate-600">{tempAgentMeta.sizeLabel}</p>
                      <p className="text-xs text-slate-600">{tempAgentMeta.shaHint}</p>
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

                  <details className="rounded-xl bg-white border border-slate-200 p-3.5 text-xs">
                    <summary className="cursor-pointer font-semibold text-slate-600 hover:text-[#0B192C]">
                      ¿Prefieres el Agente Instalado (Plan Mensual Pyme)?
                    </summary>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-mono font-semibold text-[#0B192C] break-words">
                          {installedAgentMeta.fileName}
                        </p>
                        <p className="text-slate-600">{installedAgentMeta.sizeLabel}</p>
                      </div>
                      <a
                        href={installedInstallerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => void onMarkAgentDownloaded(ticket.id, 'installed')}
                        className="inline-flex items-center justify-center gap-2 px-3.5 py-2 font-semibold rounded-lg bg-white text-[#0B192C] border border-slate-300 hover:bg-slate-50 transition-colors shrink-0"
                      >
                        <HardDriveDownload className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>Descargar Agente Instalado</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" aria-hidden="true" />
                      </a>
                    </div>
                  </details>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-semibold text-emerald-700">
                        Recomendado para Plan Mensual Pyme · Acceso Desatendido
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
                          : 'bg-[#2563EB] text-white hover:bg-blue-500'
                      }`}
                    >
                      <HardDriveDownload className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span className="break-words">
                        Descargar {installedAgentMeta.fileName}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-80" aria-hidden="true" />
                    </a>
                  </div>

                  <details className="rounded-xl bg-white border border-slate-200 p-3.5 text-xs">
                    <summary className="cursor-pointer font-semibold text-slate-600 hover:text-[#0B192C]">
                      ¿Prefieres usar el Agente Temporal sin instalación?
                    </summary>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-mono font-semibold text-[#0B192C] break-words">
                          {tempAgentMeta.fileName}
                        </p>
                        <p className="text-slate-600">{tempAgentMeta.sizeLabel}</p>
                      </div>
                      <a
                        href={tempInstallerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => void onMarkAgentDownloaded(ticket.id, 'temporary')}
                        className="inline-flex items-center justify-center gap-2 px-3.5 py-2 font-semibold rounded-lg bg-white text-[#0B192C] border border-slate-300 hover:bg-slate-50 transition-colors shrink-0"
                      >
                        <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>Descargar Agente Temporal</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" aria-hidden="true" />
                      </a>
                    </div>
                  </details>
                </>
              )}

              {/* Public Network Ready-to-Connect Info Card */}
              <div
                data-testid="rustdesk-relay-instructions"
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-[#0B192C]">
                  <ShieldCheck className="w-4 h-4 text-[#10B981]" aria-hidden="true" />
                  <span>Conexión Directa sin Configuración Adicional</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Al usar el instalador oficial de RustDesk,{' '}
                  <strong>no necesitas configurar ningún servidor ni clave adicional</strong>:
                  solo abre el programa descargado, copia tu ID de 9 dígitos y pégalo abajo en
                  el Paso 2.
                </p>
              </div>
            </div>

            {/* Step 2: 9-digit RustDesk ID + Explicit Access Consent */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#2563EB]">
                  Paso 2 · Vinculación Remota y Consentimiento
                </span>
                <Lock className="w-4 h-4 text-slate-500" aria-hidden="true" />
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
                      className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <input
                      id="rustdesk-id-input"
                      type="text"
                      inputMode="numeric"
                      value={rustdeskInput}
                      onChange={(e) => handleRustDeskInputChange(e.target.value)}
                      placeholder="Ej. 123 456 789"
                      className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-3 font-mono tabular-nums text-lg tracking-wider text-[#0B192C] placeholder:text-slate-500 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
                    />
                  </div>
                </div>

                {/* Explicit Access Consent Panel */}
                <div className="p-4 rounded-lg bg-[#F8FAFC] border border-slate-200 space-y-2">
                  <div className="flex items-start gap-3">
                    <input
                      id="connection-remote-consent"
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => {
                        setConsentChecked(e.target.checked);
                        if (idError) setIdError(null);
                      }}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 leading-relaxed">
                      <label htmlFor="connection-remote-consent" className="cursor-pointer">
                        <strong>Consentimiento explícito de acceso remoto:</strong> Autorizo a{' '}
                        <span className="font-semibold text-[#0B192C]">
                          {ticket.organization_name}
                        </span>{' '}
                        y al especialista asignado a visualizar y operar mi equipo de forma
                        supervisada. Puedo finalizar o revocar la sesión en cualquier
                        momento. La sesión está protegida por nuestro{' '}
                      </label>
                      <button
                        type="button"
                        onClick={() => onOpenLegalDoc?.('nda')}
                        data-testid="connection-legal-nda-link"
                        className="font-semibold text-[#2563EB] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
                      >
                        Acuerdo de Confidencialidad para Clientes (NDA)
                      </button>
                      .
                    </span>
                  </div>
                </div>

                {idError && (
                  <p role="alert" className="text-xs font-medium text-red-700">
                    {idError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSavingRustDeskId}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap"
                >
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {isSavingRustDeskId ? 'Vinculando...' : 'Vincular ID y Autorizar Acceso'}
                  </span>
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

          {/* Right Column: Live Synchronized Chat + Viral Referral */}
          <div className="lg:col-span-5 space-y-5">
            <TicketChatPanel
              ticketCode={ticket.ticket_code}
              messages={messages}
              currentRole="client"
              disabled={ticket.status === 'resolved'}
              onSendMessage={(text) => onSendClientMessage(ticket.id, text)}
            />

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-emerald-700">
                  Comparte Remote Support 365
                </p>
                <span className="font-mono text-[11px] text-slate-600">
                  ?ref={ticket.ticket_code}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                ¿Necesitas soporte técnico? Comparte el enlace para que un colega o familiar
                conozca el servicio y sus tarifas vigentes.
              </p>
              <button
                type="button"
                onClick={() => void handleShareReferral()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#0B192C] bg-[#F8FAFC] hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors whitespace-nowrap"
              >
                {referralCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                    <span>Enlace de invitación copiado</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                    <span>Compartir enlace de soporte</span>
                  </>
                )}
              </button>
            </div>

            {/* GDPR / LOPDP Data Portability, Erasure & 1-Click Cancellation */}
            <details
              data-testid="room-privacy-controls"
              className="bg-white border border-slate-200 rounded-xl p-4"
            >
              <summary className="cursor-pointer list-none flex items-center justify-between gap-2 text-xs font-bold text-[#0B192C]">
                <span>Privacidad y control de datos (GDPR / LOPDP)</span>
                <span className="text-[11px] font-medium text-[#2563EB]">Ver opciones</span>
              </summary>

              <div className="mt-3.5 pt-3.5 border-t border-slate-100 space-y-3.5">
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenLegalDoc?.('nda')}
                    className="text-[11px] font-semibold text-[#2563EB] hover:underline"
                  >
                    Leer Confidencialidad (NDA)
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenLegalDoc?.('privacy')}
                    className="text-[11px] font-semibold text-[#2563EB] hover:underline"
                  >
                    Leer Política de Privacidad
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  No hay una política automática de eliminación configurada en esta versión.
                  Algunas funciones de IA procesan texto del incidente mediante un proveedor
                  externo; evita incluir credenciales o datos innecesarios.
                </p>

                <div className="space-y-2">
                  {onExportClientData && (
                    <button
                      type="button"
                      onClick={() => {
                        onExportClientData(ticket.id);
                        setPrivacyActionNotice(
                          'Archivo JSON con tus datos exportado correctamente.'
                        );
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-[#0B192C] bg-[#F8FAFC] hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
                      <span>Descargar mis datos (JSON)</span>
                    </button>
                  )}

                  {onAnonymizeClientData && !ticket.anonymized_at && (
                    confirmAnonymizeOpen ? (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200 space-y-2 text-xs">
                        <p className="font-semibold text-red-900">
                          ¿Confirmas anonimizar tu nombre, correo e ID RustDesk de este
                          ticket?
                        </p>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmAnonymizeOpen(false)}
                            className="px-3 py-1 font-medium text-slate-700 bg-white border border-slate-300 rounded-md"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void onAnonymizeClientData(ticket.id).then((ok) => {
                                setConfirmAnonymizeOpen(false);
                                if (ok !== false) {
                                  setPrivacyActionNotice(
                                    'Tus datos personales fueron anonimizados y registrados en auditoría.'
                                  );
                                }
                              });
                            }}
                            className="px-3 py-1 font-semibold text-white bg-red-700 hover:bg-red-800 rounded-md"
                          >
                            Confirmar eliminación
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmAnonymizeOpen(true)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Eliminar mis datos personales</span>
                      </button>
                    )
                  )}

                  {ticket.anonymized_at && (
                    <p className="text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2">
                      Datos personales anonimizados el{' '}
                      {new Date(ticket.anonymized_at).toLocaleDateString('es-ES')}.
                    </p>
                  )}

                  {privacyActionNotice && (
                    <p className="text-xs font-medium text-emerald-700">
                      {privacyActionNotice}
                    </p>
                  )}
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </section>
  );
}
