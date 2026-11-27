import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  HardDriveDownload,
  KeyRound,
  Loader2,
  Lock,
  MonitorCheck,
  OctagonX,
  Printer,
  Receipt,
  Share2,
  ShieldCheck,
  Star,
  Trash2,
  UserCheck,
} from 'lucide-react';
import type {
  AgentInstallType,
  SupportTicket,
  TicketMessage,
} from '../types/support';
import {
  formatCategoryForOs,
  formatElapsedSessionDuration,
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
import { ResolutionFeedbackCard } from './ResolutionFeedbackCard';
import type { LegalDocTab } from './LegalDocsModal';
import {
  CardNetworkBadges,
  GooglePayLogo,
  PayPalLogo,
  StripeLogo,
} from './PaymentBrandLogos';

import { getConfiguredTierPriceUsd } from '../config/businessConfig';
import { useBusinessConfig } from '../hooks/useBusinessConfig';
import { supportAdapter } from '../services/supportAdapter';

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
  onConfirmPayment: (ticketId: string) => Promise<boolean | void>;
  onSendClientMessage: (ticketId: string, messageText: string) => Promise<void>;
  onResetToNewTicket: () => void;
  onOpenLegalDoc?: (tab: LegalDocTab) => void;
  onExportClientData?: (ticketId: string, verifiedExportPayload?: unknown) => void;
  onAnonymizeClientData?: (ticketId: string, anonymizedAt?: string) => Promise<boolean | void>;
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
  const businessConfig = useBusinessConfig();
  const tierPrice =
    getConfiguredTierPriceUsd(
      ticket.service_tier,
      ticket.billing_mode,
      businessConfig
    ) ?? getServiceTierPriceUsd(ticket.service_tier);
  const isMonthlyPlan =
    ticket.billing_mode === 'pyme_monthly' || ticket.service_tier.startsWith('Pyme ');

  const [paidAmountUsd, setPaidAmountUsd] = useState<number | null>(null);
  const computedTotalUsd = tierPrice;
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
  const [privacyOtpChallenge, setPrivacyOtpChallenge] = useState<{
    action: 'export' | 'erase';
    challengeId: string;
    maskedEmail: string;
    devOtpPreview?: string;
  } | null>(null);
  const [privacyOtpInput, setPrivacyOtpInput] = useState('');
  const [privacyOtpBusy, setPrivacyOtpBusy] = useState(false);
  const [privacyOtpError, setPrivacyOtpError] = useState<string | null>(null);

  type RoomStepKey = 'pay' | 'download' | 'link';
  const currentActiveStep: RoomStepKey =
    ticket.payment_status !== 'paid'
      ? 'pay'
      : !ticket.agent_downloaded && !ticket.rustdesk_id
      ? 'download'
      : 'link';

  const [expandedStep, setExpandedStep] = useState<RoomStepKey>(currentActiveStep);
  const prevAutoStepRef = useRef<RoomStepKey>(currentActiveStep);

  useEffect(() => {
    if (prevAutoStepRef.current !== currentActiveStep) {
      prevAutoStepRef.current = currentActiveStep;
      setExpandedStep(currentActiveStep);
    }
  }, [currentActiveStep]);

  const isSessionActiveBarVisible =
    ticket.status !== 'resolved' &&
    (ticket.status === 'in_progress' ||
      (ticket.payment_status === 'paid' &&
        Boolean(ticket.rustdesk_id && ticket.consent_accepted)));

  const sessionStartedAtIso =
    ticket.claimed_at ?? ticket.consent_accepted_at ?? ticket.created_at;
  const [elapsedLabel, setElapsedLabel] = useState<string>(() =>
    formatElapsedSessionDuration(sessionStartedAtIso)
  );
  const [disconnectPanelOpen, setDisconnectPanelOpen] = useState(false);
  const [disconnectAlertSent, setDisconnectAlertSent] = useState(false);
  const [isSendingDisconnectAlert, setIsSendingDisconnectAlert] = useState(false);

  useEffect(() => {
    if (!isSessionActiveBarVisible) {
      setDisconnectPanelOpen(false);
      return;
    }
    setElapsedLabel(formatElapsedSessionDuration(sessionStartedAtIso));
    const timerId = window.setInterval(() => {
      setElapsedLabel(formatElapsedSessionDuration(sessionStartedAtIso));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [isSessionActiveBarVisible, sessionStartedAtIso]);

  const handleRequestCutAccessAlert = async () => {
    if (isSendingDisconnectAlert) return;
    setIsSendingDisconnectAlert(true);
    try {
      await onSendClientMessage(
        ticket.id,
        'El cliente solicitó cortar el acceso remoto de inmediato.'
      );
      setDisconnectAlertSent(true);
    } finally {
      setIsSendingDisconnectAlert(false);
    }
  };

  const pollWebhookSettlement = async (
    gateway: 'stripe' | 'paypal',
    refId: string
  ): Promise<boolean> => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
      if (gateway === 'stripe') {
        const checkRes = await fetch(
          `/api/payments/stripe/verify-session?session_id=${encodeURIComponent(refId)}&ticket_code=${encodeURIComponent(ticket.ticket_code)}`,
          { headers: { 'x-ticket-token': ticket.client_session_token } }
        );
        const checkData = (await checkRes.json().catch(() => null)) as {
          verified?: boolean;
          webhookConfirmed?: boolean;
        } | null;
        if (checkRes.ok && (checkData?.verified || checkData?.webhookConfirmed)) {
          return true;
        }
      } else {
        const authRes = await supportAdapter.fetchAuthorizedRoomTicket(
          ticket.ticket_code,
          ticket.client_session_token
        );
        if (authRes.ok && authRes.ticket?.payment_status === 'paid') {
          return true;
        }
      }
    }
    return false;
  };

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
              webhookConfirmed?: boolean;
              stripeCheckoutPaid?: boolean;
              amountUsd?: number;
              error?: string;
            };
            if (!res.ok) {
              setPaymentError(
                data.error ??
                  'Stripe no confirmó el pago todavía. Inténtalo nuevamente.'
              );
              return;
            }
            let settled = Boolean(data.verified);
            if (!settled && data.stripeCheckoutPaid) {
              setPaymentSuccessNotice(
                'Pago recibido · Esperando confirmación del webhook firmado de Stripe...'
              );
              settled = await pollWebhookSettlement('stripe', sessionId);
            }
            if (!settled) {
              setPaymentSuccessNotice(null);
              setPaymentError(
                data.error ??
                  'Pago recibido en Stripe; el webhook firmado aún está en tránsito. Verifica nuevamente en unos segundos.'
              );
              return;
            }
            if (typeof data.amountUsd === 'number' && Number.isFinite(data.amountUsd)) {
              setPaidAmountUsd(data.amountUsd);
            }
            await onConfirmPayment(ticket.id);
            setPendingExternalCheckout(null);
            setPaymentSuccessNotice(
              'Pago confirmado por webhook firmado de Stripe. Tu Sala de Conexión ya está habilitada.'
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
              webhookConfirmed?: boolean;
              captured?: boolean;
              status?: string;
              amountUsd?: number;
              error?: string;
            };
            if (!res.ok || data.status !== 'COMPLETED') {
              setPaymentError(
                data.error ??
                  'PayPal no completó la captura del pago. Inténtalo nuevamente.'
              );
              return;
            }
            let settled = Boolean(data.verified);
            if (!settled && data.captured) {
              setPaymentSuccessNotice(
                'Pago capturado · Esperando confirmación del webhook firmado de PayPal...'
              );
              settled = await pollWebhookSettlement('paypal', paypalToken);
            }
            if (!settled) {
              setPaymentSuccessNotice(null);
              setPaymentError(
                data.error ??
                  'Captura recibida en PayPal; el webhook firmado aún está en tránsito. Verifica nuevamente en unos segundos.'
              );
              return;
            }
            if (typeof data.amountUsd === 'number' && Number.isFinite(data.amountUsd)) {
              setPaidAmountUsd(data.amountUsd);
            }
            await onConfirmPayment(ticket.id);
            setPendingExternalCheckout(null);
            setPaymentSuccessNotice(
              'Pago confirmado por webhook firmado de PayPal. Tu Sala de Conexión ya está habilitada.'
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
          stripeCheckoutPaid?: boolean;
          payment_status?: string;
          amountUsd?: number;
          error?: string;
        };
        if (!res.ok) {
          setPaymentError(
            data.error ??
              'El pago aún figura pendiente en Stripe. Complétalo en la pestaña abierta y vuelve a pulsar "Ya completé el pago · Verificar ahora".'
          );
          return;
        }
        let settled = Boolean(data.verified);
        if (!settled && data.stripeCheckoutPaid) {
          setPaymentSuccessNotice(
            'Pago recibido · Esperando confirmación del webhook firmado de Stripe...'
          );
          settled = await pollWebhookSettlement('stripe', pendingExternalCheckout.sessionId);
        }
        if (!settled) {
          setPaymentSuccessNotice(null);
          setPaymentError(
            data.error ??
              'Pago recibido en Stripe; esperando la confirmación del webhook firmado. Vuelve a verificar en unos segundos.'
          );
          return;
        }
        if (typeof data.amountUsd === 'number' && Number.isFinite(data.amountUsd)) {
          setPaidAmountUsd(data.amountUsd);
        }
        setPendingExternalCheckout(null);
        await onConfirmPayment(ticket.id);
        setPaymentSuccessNotice(
          `Pago verificado por webhook con ${pendingExternalCheckout.methodLabel}. Tu Sala de Conexión ya está habilitada.`
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
          captured?: boolean;
          status?: string;
          amountUsd?: number;
          error?: string;
        };
        if (!res.ok || data.status !== 'COMPLETED') {
          setPaymentError(
            data.error ??
              'PayPal aún no reporta la orden aprobada. Completa la aprobación en la pestaña abierta e inténtalo de nuevo.'
          );
          return;
        }
        let settled = Boolean(data.verified);
        if (!settled && data.captured) {
          setPaymentSuccessNotice(
            'Pago capturado · Esperando confirmación del webhook firmado de PayPal...'
          );
          settled = await pollWebhookSettlement('paypal', pendingExternalCheckout.orderId);
        }
        if (!settled) {
          setPaymentSuccessNotice(null);
          setPaymentError(
            data.error ??
              'Captura recibida en PayPal; esperando confirmación del webhook firmado. Verifica nuevamente en unos segundos.'
          );
          return;
        }
        if (typeof data.amountUsd === 'number' && Number.isFinite(data.amountUsd)) {
          setPaidAmountUsd(data.amountUsd);
        }
        setPendingExternalCheckout(null);
        await onConfirmPayment(ticket.id);
        setPaymentSuccessNotice(
          'Pago verificado por webhook con PayPal. Tu Sala de Conexión ya está habilitada.'
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

        const whRes = await fetch('/api/payments/sandbox/dispatch-webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-ticket-token': ticket.client_session_token,
          },
          body: JSON.stringify({
            ticketCode: ticket.ticket_code,
            gateway: 'stripe',
            sessionId: data.sessionId,
          }),
        });
        if (!whRes.ok) {
          const whErr = (await whRes.json().catch(() => null)) as { error?: string } | null;
          setPaymentError(whErr?.error ?? 'El webhook firmado sandbox rechazó el pago.');
          return;
        }

        setPaidAmountUsd(
          typeof data.amountUsd === 'number' && Number.isFinite(data.amountUsd)
            ? data.amountUsd
            : computedTotalUsd
        );
        const confirmed = await onConfirmPayment(ticket.id);
        if (confirmed === false) return;
        setPaymentSuccessNotice(
          `Pago confirmado por webhook firmado sandbox (${
            method === 'google_pay' ? 'Google Pay' : 'Stripe'
          }). Tu Sala de Conexión ya está habilitada.`
        );
      } else if (method === 'paypal') {
        const orderRes = await fetch('/api/payments/paypal/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketCode: ticket.ticket_code,
            sessionToken: ticket.client_session_token,
            serviceTier: ticket.service_tier,
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

        const whRes = await fetch('/api/payments/sandbox/dispatch-webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-ticket-token': ticket.client_session_token,
          },
          body: JSON.stringify({
            ticketCode: ticket.ticket_code,
            gateway: 'paypal',
            orderId: orderData.orderId,
          }),
        });
        if (!whRes.ok) {
          const whErr = (await whRes.json().catch(() => null)) as { error?: string } | null;
          setPaymentError(whErr?.error ?? 'El webhook firmado sandbox de PayPal rechazó el pago.');
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
              'No se pudo confirmar la liquidación del pago vía webhook de PayPal.'
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
        const confirmed = await onConfirmPayment(ticket.id);
        if (confirmed === false) return;
        setPaymentSuccessNotice(
          'Pago confirmado por webhook firmado sandbox (PayPal). Tu Sala de Conexión ya está habilitada.'
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

        {/* Sticky Active Session Bar (Technician + Elapsed Time + Red Cut Access Button) */}
        {isSessionActiveBarVisible && (
          <div
            data-testid="active-session-sticky-bar"
            className="sticky top-16 z-30 rounded-xl bg-[#0B1528] text-white border border-slate-700/90 shadow-lg px-4 py-3 space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                <span className="inline-flex items-center gap-2 font-semibold text-white">
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    {ticket.status === 'in_progress'
                      ? 'Sesión remota activa'
                      : 'Conexión lista'}
                  </span>
                </span>
                <span className="text-slate-300">
                  Técnico:{' '}
                  <strong className="text-white">
                    {ticket.assigned_technician_name ?? 'Especialista asignado'}
                  </strong>
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-200 tabular-nums font-semibold">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  <span data-testid="active-session-elapsed-time">{elapsedLabel}</span>
                </span>
              </div>

              <button
                type="button"
                data-testid="cut-access-button"
                aria-expanded={disconnectPanelOpen}
                onClick={() => setDisconnectPanelOpen((prev) => !prev)}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <OctagonX className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Cortar acceso</span>
              </button>
            </div>

            {disconnectPanelOpen && (
              <div
                data-testid="disconnect-access-panel"
                className="rounded-lg bg-red-950/60 border border-red-400/40 p-3.5 text-xs text-red-50 space-y-2.5"
              >
                <p className="font-semibold text-white">
                  Cómo cortar el acceso remoto de inmediato en tu equipo:
                </p>
                <p className="text-red-100 leading-relaxed">
                  1) Haz clic en <strong>Desconectar</strong> dentro de la ventana de RustDesk o cierra completamente la aplicación RustDesk en tu equipo. Esto revoca el acceso al instante.
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isSendingDisconnectAlert || disconnectAlertSent}
                    onClick={() => void handleRequestCutAccessAlert()}
                    className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-900/70 text-white font-semibold transition-colors"
                  >
                    <OctagonX className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>
                      {disconnectAlertSent
                        ? 'Aviso de corte enviado al técnico'
                        : isSendingDisconnectAlert
                        ? 'Enviando aviso...'
                        : 'Notificar corte al técnico en el chat'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisconnectPanelOpen(false)}
                    className="min-h-[44px] px-3 py-2 text-xs font-semibold text-red-100 hover:text-white underline"
                  >
                    Cerrar aviso
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3-Step Visual Onboarding Progress Stepper (Interactive) */}
        {ticket.status !== 'resolved' && (
          <ol
            aria-label="Progreso de conexión"
            data-testid="room-progress-stepper"
            className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white border border-slate-200 rounded-xl p-3 text-xs"
          >
            {(
              [
                {
                  key: 'pay' as const,
                  num: 1,
                  label: 'Pagar',
                  done: ticket.payment_status === 'paid',
                },
                {
                  key: 'download' as const,
                  num: 2,
                  label: 'Descargar RustDesk',
                  done: Boolean(ticket.agent_downloaded || ticket.rustdesk_id),
                },
                {
                  key: 'link' as const,
                  num: 3,
                  label: 'Vincular ID',
                  done: Boolean(ticket.rustdesk_id && ticket.consent_accepted),
                },
              ]
            ).map((step) => {
              const isExpanded = expandedStep === step.key;
              return (
                <li key={step.key}>
                  <button
                    type="button"
                    onClick={() => setExpandedStep(step.key)}
                    aria-current={isExpanded ? 'step' : undefined}
                    className={`w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors text-left ${
                      step.done
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : isExpanded
                        ? 'bg-blue-50/80 border-blue-300 text-[#0B192C]'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 tabular-nums ${
                        step.done
                          ? 'bg-emerald-600 text-white'
                          : isExpanded
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {step.done ? '✓' : step.num}
                    </span>
                    <span className="font-semibold truncate">{step.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}

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
                  <p className="font-display tabular-nums text-xl font-bold text-[#10B981]">
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
              <div className="space-y-1.5">
                <p className="text-[11px] text-slate-300">Especialista asignado al equipo</p>
                <p className="text-sm font-semibold text-white">
                  {ticket.assigned_technician_name ?? 'Buscando especialista disponible...'}
                </p>
                {ticket.assigned_technician_name && (
                  <div
                    data-testid="assigned-technician-trust-signals"
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-slate-200"
                  >
                    {ticket.assigned_technician_verified !== false && (
                      <span className="inline-flex items-center gap-1 text-emerald-300 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>Identidad verificada</span>
                      </span>
                    )}
                    {typeof ticket.assigned_technician_sessions_count === 'number' && (
                      <span className="inline-flex items-center gap-1 tabular-nums text-slate-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-300 shrink-0" aria-hidden="true" />
                        <span>
                          {ticket.assigned_technician_sessions_count > 0
                            ? `${ticket.assigned_technician_sessions_count} sesiones completadas`
                            : 'En período supervisado inicial'}
                        </span>
                      </span>
                    )}
                    {typeof ticket.assigned_technician_rating === 'number' &&
                      ticket.assigned_technician_rating > 0 && (
                        <span className="inline-flex items-center gap-1 tabular-nums text-amber-300 font-medium">
                          <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300 shrink-0" aria-hidden="true" />
                          <span>Calificación {ticket.assigned_technician_rating.toFixed(1)}/5</span>
                        </span>
                      )}
                  </div>
                )}
                <p className="text-xs text-slate-300">
                  {ticket.assigned_technician_name
                    ? `${ticket.assigned_technician_specialty ?? 'Especialista Verificado'} · Nunca te pediremos contraseñas bancarias ni códigos 2FA. Cierra o desconecta RustDesk para cortar el acceso al instante.`
                    : 'El primer especialista certificado disponible atenderá tu solicitud en cuanto esté disponible.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ORDERED CLOSURE FLOW: 1) Resumen de lo hecho -> 2) Comprobante -> 3) Evaluación -> 4) Referido */}
        {ticket.status === 'resolved' && (
          <div data-testid="client-closure-flow" className="space-y-6">
            {/* 1. Resumen de lo hecho */}
            <div
              data-testid="client-resolved-banner"
              className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-950 font-bold text-base">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                  <span>1. Resumen de lo realizado · Sesión finalizada</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-white border border-emerald-300 text-[11px] font-semibold text-emerald-800">
                    ✦ Generado por IA
                  </span>
                  {ticket.human_reviewed_at && ticket.human_reviewed_by && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-white border border-emerald-300 text-[11px] font-semibold text-emerald-900">
                      Revisado por {ticket.human_reviewed_by}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs sm:text-sm text-emerald-950 whitespace-pre-line leading-relaxed pt-1">
                {ticket.resolution_notes ||
                  'El soporte remoto concluyó y la sesión fue cerrada correctamente.'}
              </p>
            </div>

            {/* 2. Comprobante */}
            <div
              data-testid="client-closure-receipt"
              className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-lg bg-slate-100 text-[#0B192C] flex items-center justify-center shrink-0">
                    <Receipt className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-[#0B192C]">
                      2. Comprobante del servicio
                    </h2>
                    <p className="text-xs text-slate-600">
                      Respaldo del ticket{' '}
                      <span className="font-mono font-semibold text-[#0B192C]">
                        {ticket.ticket_code}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-[#0B192C] bg-[#F8FAFC] hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Printer className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                  <span>Imprimir / Guardar comprobante</span>
                </button>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <dt className="text-slate-500">Ticket</dt>
                  <dd className="font-mono font-semibold text-[#0B192C] mt-0.5">
                    {ticket.ticket_code}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Servicio contratado</dt>
                  <dd className="font-semibold text-[#0B192C] mt-0.5">
                    {ticket.service_tier}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Estado de pago</dt>
                  <dd className="font-semibold text-emerald-700 mt-0.5 tabular-nums">
                    {getPaymentStatusLabel(ticket.payment_status)} · USD $
                    {displayedPaidUsd.toFixed(2)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Fecha de cierre</dt>
                  <dd className="font-semibold text-[#0B192C] mt-0.5 tabular-nums">
                    {new Date(ticket.resolved_at ?? ticket.created_at).toLocaleDateString(
                      'es-ES',
                      { year: 'numeric', month: 'short', day: 'numeric' }
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* 3. Calificación y garantía */}
            <ResolutionFeedbackCard ticket={ticket} />

            {/* 4. Referido (después del resumen y comprobante) */}
            <div
              data-testid="client-closure-referral"
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold text-emerald-700">
                    Comparte Remote Support 365
                  </p>
                  <span className="font-mono text-[11px] text-slate-600">
                    ?ref={ticket.ticket_code}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Si el soporte te resultó útil, comparte este enlace con un colega o familiar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleShareReferral()}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#0B192C] bg-[#F8FAFC] hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
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
          </div>
        )}

        {/* AI Pre-Diagnosis Transparency Card */}
        {ticket.ai_diagnosis_summary && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-[#0B192C]">
                Pre-diagnóstico técnico adjunto al ticket
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[11px] font-semibold text-[#1D4ED8]">
                  ✦ Generado por IA
                </span>
                {ticket.human_reviewed_at && ticket.human_reviewed_by && (
                  <span
                    data-testid="human-reviewed-badge"
                    className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800"
                  >
                    Revisado por {ticket.human_reviewed_by}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {ticket.ai_diagnosis_summary}
            </p>
          </div>
        )}

        {/* Main Workspace: Left (Single Active Step Accordion: Pagar -> Descargar -> Vincular) & Right (Live Chat + Privacy) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {ticket.status !== 'resolved' && (
            <div className="lg:col-span-7 space-y-4">
              {/* STEP 1: PAGAR */}
              <div
                data-testid="room-step-pay"
                className={`bg-white border rounded-xl overflow-hidden transition-colors ${
                  expandedStep === 'pay'
                    ? 'border-[#2563EB] shadow-sm'
                    : 'border-slate-200'
                }`}
              >
                <button
                  type="button"
                  aria-expanded={expandedStep === 'pay'}
                  onClick={() => setExpandedStep('pay')}
                  className="w-full min-h-[56px] px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 tabular-nums ${
                        ticket.payment_status === 'paid'
                          ? 'bg-emerald-600 text-white'
                          : expandedStep === 'pay'
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {ticket.payment_status === 'paid' ? '✓' : '1'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0B192C] truncate">
                        Paso 1 · Confirmar pago
                      </p>
                      <p className="text-xs text-slate-600 truncate tabular-nums">
                        {ticket.payment_status === 'paid'
                          ? `Pagado y verificado · USD $${displayedPaidUsd.toFixed(2)}`
                          : `Pendiente · USD $${computedTotalUsd.toFixed(2)} (${ticket.service_tier})`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        ticket.payment_status === 'paid'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {ticket.payment_status === 'paid' ? 'Completado' : 'Activo'}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 transition-transform ${
                        expandedStep === 'pay' ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                </button>

                {expandedStep === 'pay' && (
                  <div className="px-5 pb-6 pt-2 border-t border-slate-100 space-y-5">
                    {ticket.payment_status === 'pending' ? (
                      <div
                        data-testid="professional-checkout-module"
                        className="space-y-5"
                      >
                        <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-[#0B192C]">
                              {ticket.service_tier} ({formatCategoryForOs(ticket.category, ticket.os_type)})
                            </span>
                            <span className="font-bold text-emerald-700 tabular-nums text-base">
                              USD ${computedTotalUsd.toFixed(2)}
                              {isMonthlyPlan ? '/mes' : ''}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
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
                          {ticket.billing_mode === 'pyme_monthly' && (
                            <p className="text-xs text-blue-900 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 leading-relaxed">
                              Plan mensual recurrente. Para gestionar renovación o cancelación, contacta a soporte antes del siguiente ciclo.
                            </p>
                          )}
                        </div>

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
                                Abre el checkout seguro en una nueva pestaña. Al completar el pago, pulsa el botón de verificación.
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
                                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 text-xs sm:text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors shadow-xs"
                              >
                                <span>Abrir pasarela segura en nueva pestaña</span>
                                <ExternalLink className="w-4 h-4" aria-hidden="true" />
                              </a>

                              <button
                                type="button"
                                disabled={isVerifyingExternal}
                                onClick={() => void handleVerifyPendingCheckout()}
                                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 text-xs sm:text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-700/70 rounded-lg transition-colors shadow-xs cursor-pointer"
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
                                  className="min-h-[44px] text-xs font-medium text-slate-600 hover:text-[#0B192C] underline"
                                >
                                  Elegir otro método
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 space-y-3.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B192C]">
                                  <CreditCard className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                                  <span>Tarjeta débito / crédito vía Stripe (PCI-DSS)</span>
                                </span>
                                <CardNetworkBadges />
                              </div>

                              <p className="text-[11px] text-slate-600 leading-relaxed">
                                Ingresas tu tarjeta directamente en la pasarela cifrada de Stripe sin almacenar datos bancarios en este sitio.
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
                                className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-400 rounded-lg transition-colors whitespace-nowrap shadow-sm cursor-pointer disabled:cursor-not-allowed"
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
                                className="w-full min-h-[44px] bg-black hover:bg-neutral-900 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
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
                                  className="w-full min-h-[44px] bg-[#FFC439] hover:bg-[#F5BA2E] text-[#003087] font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
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
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        data-testid="payment-confirmed-banner"
                        className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                                'Tu ticket está habilitado para atención prioritaria.'}
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-emerald-300 tabular-nums text-xs font-semibold text-emerald-800 shrink-0 self-start sm:self-center">
                          PAGADO · USD ${displayedPaidUsd.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* STEP 2: DESCARGAR */}
              <div
                data-testid="room-step-download"
                className={`bg-white border rounded-xl overflow-hidden transition-colors ${
                  expandedStep === 'download'
                    ? 'border-[#2563EB] shadow-sm'
                    : 'border-slate-200'
                }`}
              >
                <button
                  type="button"
                  aria-expanded={expandedStep === 'download'}
                  onClick={() => setExpandedStep('download')}
                  className="w-full min-h-[56px] px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 tabular-nums ${
                        ticket.agent_downloaded || ticket.rustdesk_id
                          ? 'bg-emerald-600 text-white'
                          : expandedStep === 'download'
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {ticket.agent_downloaded || ticket.rustdesk_id ? '✓' : '2'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0B192C] truncate">
                        Paso 2 · Descargar agente RustDesk ({ticket.os_type})
                      </p>
                      <p className="text-xs text-slate-600 truncate">
                        {ticket.agent_downloaded
                          ? ticket.agent_type === 'installed'
                            ? 'Agente Instalado descargado'
                            : 'Agente Temporal descargado'
                          : 'Descarga directa sin configurar servidores'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        ticket.agent_downloaded || ticket.rustdesk_id
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : expandedStep === 'download'
                          ? 'bg-blue-50 text-[#1D4ED8] border border-blue-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {ticket.agent_downloaded || ticket.rustdesk_id
                        ? 'Completado'
                        : expandedStep === 'download'
                        ? 'Activo'
                        : 'Siguiente'}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 transition-transform ${
                        expandedStep === 'download' ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                </button>

                {expandedStep === 'download' && (
                  <div className="px-5 pb-6 pt-3 border-t border-slate-100 space-y-4">
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Para incidencias puntuales usa el <strong>Agente Temporal</strong> sin instalación. Si cuentas con un plan mensual Pyme, usa el <strong>Agente Instalado</strong>.
                    </p>

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
                            className={`min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-colors text-center sm:whitespace-nowrap shrink-0 max-w-full ${
                              ticket.agent_downloaded && ticket.agent_type === 'temporary'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                : 'bg-[#2563EB] text-white hover:bg-[#1D4ED8]'
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
                              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-3.5 py-2 font-semibold rounded-lg bg-white text-[#0B192C] border border-slate-300 hover:bg-slate-50 transition-colors shrink-0"
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
                            className={`min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-colors text-center sm:whitespace-nowrap shrink-0 max-w-full ${
                              ticket.agent_downloaded && ticket.agent_type === 'installed'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                : 'bg-[#2563EB] text-white hover:bg-[#1D4ED8]'
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
                              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-3.5 py-2 font-semibold rounded-lg bg-white text-[#0B192C] border border-slate-300 hover:bg-slate-50 transition-colors shrink-0"
                            >
                              <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                              <span>Descargar Agente Temporal</span>
                              <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" aria-hidden="true" />
                            </a>
                          </div>
                        </details>
                      </>
                    )}

                    <div
                      data-testid="rustdesk-relay-instructions"
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#0B192C]">
                        <ShieldCheck className="w-4 h-4 text-[#10B981]" aria-hidden="true" />
                        <span>Conexión Directa sin Configuración Adicional</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Solo abre el programa descargado, copia tu ID de 9 dígitos y pégalo en el Paso 3.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 3: VINCULAR */}
              <div
                data-testid="room-step-link"
                className={`bg-white border rounded-xl overflow-hidden transition-colors ${
                  expandedStep === 'link'
                    ? 'border-[#2563EB] shadow-sm'
                    : 'border-slate-200'
                }`}
              >
                <button
                  type="button"
                  aria-expanded={expandedStep === 'link'}
                  onClick={() => setExpandedStep('link')}
                  className="w-full min-h-[56px] px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 tabular-nums ${
                        ticket.rustdesk_id && ticket.consent_accepted
                          ? 'bg-emerald-600 text-white'
                          : expandedStep === 'link'
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {ticket.rustdesk_id && ticket.consent_accepted ? '✓' : '3'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0B192C] truncate">
                        Paso 3 · Vincular ID de RustDesk y autorizar acceso
                      </p>
                      <p className="text-xs text-slate-600 truncate">
                        {ticket.rustdesk_id && ticket.consent_accepted ? (
                          <>
                            ID vinculado:{' '}
                            <span className="font-mono font-semibold text-[#0B192C]">
                              {formatRustDeskId(ticket.rustdesk_id)}
                            </span>
                          </>
                        ) : (
                          'Ingresa tu ID de 9 dígitos y confirma el consentimiento'
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        ticket.rustdesk_id && ticket.consent_accepted
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : expandedStep === 'link'
                          ? 'bg-blue-50 text-[#1D4ED8] border border-blue-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {ticket.rustdesk_id && ticket.consent_accepted
                        ? 'Vinculado'
                        : expandedStep === 'link'
                        ? 'Activo'
                        : 'Siguiente'}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 transition-transform ${
                        expandedStep === 'link' ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                </button>

                {expandedStep === 'link' && (
                  <div className="px-5 pb-6 pt-3 border-t border-slate-100 space-y-4">
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Al abrir el agente verás un número de 9 dígitos bajo &ldquo;Su ID&rdquo;. Ingrésalo aquí para habilitar la conexión directa del especialista.
                    </p>

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
                            className="w-full min-h-[48px] rounded-lg border border-slate-300 pl-10 pr-4 py-3 font-mono tabular-nums text-lg tracking-wider text-[#0B192C] placeholder:text-slate-500 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
                          />
                        </div>
                      </div>

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
                              y al especialista asignado a visualizar y operar mi equipo de forma supervisada. Puedo finalizar o revocar la sesión en cualquier momento. La sesión está protegida por nuestro{' '}
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
                        className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap"
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
                            Consentimiento registrado y enviado en tiempo real al Centro de Operaciones. Mantén el agente abierto para aceptar la conexión.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right Column (or Full Width when resolved): Live Synchronized Chat + Privacy */}
          <div className={`${ticket.status === 'resolved' ? 'lg:col-span-12' : 'lg:col-span-5'} space-y-5`}>
            <TicketChatPanel
              ticketCode={ticket.ticket_code}
              messages={messages}
              currentRole="client"
              disabled={ticket.status === 'resolved'}
              onSendMessage={(text) => onSendClientMessage(ticket.id, text)}
            />

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

                <div className="space-y-2.5">
                  {privacyOtpChallenge ? (
                    <form
                      data-testid="room-privacy-otp-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (privacyOtpBusy) return;
                        setPrivacyOtpBusy(true);
                        setPrivacyOtpError(null);
                        void (async () => {
                          try {
                            if (privacyOtpChallenge.action === 'export') {
                              const verifyRes = await supportAdapter.exportPrivacyDataWithOtp({
                                challengeId: privacyOtpChallenge.challengeId,
                                otpCode: privacyOtpInput,
                                ticketCode: ticket.ticket_code,
                                sessionToken: ticket.client_session_token,
                              });
                              if (!verifyRes.ok) {
                                setPrivacyOtpError(verifyRes.error ?? 'Código OTP inválido.');
                                return;
                              }
                              onExportClientData?.(ticket.id, verifyRes.exportPayload);
                              setPrivacyOtpChallenge(null);
                              setPrivacyOtpInput('');
                              setPrivacyActionNotice(
                                'Verificación OTP completada. Archivo JSON con tus datos exportado.'
                              );
                            } else {
                              const verifyRes = await supportAdapter.erasePrivacyDataWithOtp({
                                challengeId: privacyOtpChallenge.challengeId,
                                otpCode: privacyOtpInput,
                                ticketCode: ticket.ticket_code,
                                sessionToken: ticket.client_session_token,
                              });
                              if (!verifyRes.ok || !verifyRes.anonymizedAt) {
                                setPrivacyOtpError(verifyRes.error ?? 'Código OTP inválido.');
                                return;
                              }
                              await onAnonymizeClientData?.(ticket.id, verifyRes.anonymizedAt);
                              setPrivacyOtpChallenge(null);
                              setConfirmAnonymizeOpen(false);
                              setPrivacyOtpInput('');
                              setPrivacyActionNotice(
                                'Verificación OTP completada. Tus datos personales fueron anonimizados.'
                              );
                            }
                          } finally {
                            setPrivacyOtpBusy(false);
                          }
                        })();
                      }}
                      className="p-3 rounded-lg bg-[#F8FAFC] border border-slate-300 space-y-2.5 text-xs"
                    >
                      <p className="font-semibold text-[#0B192C]">
                        Código de verificación enviado a{' '}
                        <span className="font-mono">{privacyOtpChallenge.maskedEmail}</span>
                      </p>
                      {privacyOtpChallenge.devOtpPreview && (
                        <p
                          data-testid="room-privacy-dev-otp"
                          className="text-[11px] font-mono bg-amber-50 border border-amber-200 text-amber-950 rounded px-2 py-1"
                        >
                          Sandbox OTP: {privacyOtpChallenge.devOtpPreview}
                        </p>
                      )}
                      <div>
                        <label
                          htmlFor="room-privacy-otp-input"
                          className="block text-[11px] font-medium text-slate-700 mb-1"
                        >
                          Ingresa el código OTP de 6 dígitos
                        </label>
                        <input
                          id="room-privacy-otp-input"
                          data-testid="room-privacy-otp-input"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={privacyOtpInput}
                          onChange={(e) => setPrivacyOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm tracking-widest text-[#0B192C] focus:border-[#2563EB] focus:outline-none"
                        />
                      </div>
                      {privacyOtpError && (
                        <p role="alert" className="text-[11px] font-medium text-red-700">
                          {privacyOtpError}
                        </p>
                      )}
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPrivacyOtpChallenge(null);
                            setPrivacyOtpInput('');
                            setPrivacyOtpError(null);
                          }}
                          className="px-3 py-1 font-medium text-slate-700 bg-white border border-slate-300 rounded-md"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={privacyOtpBusy || privacyOtpInput.length !== 6}
                          className="px-3 py-1 font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-400 rounded-md"
                        >
                          {privacyOtpBusy
                            ? 'Verificando...'
                            : privacyOtpChallenge.action === 'export'
                            ? 'Verificar y descargar'
                            : 'Verificar y eliminar'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      {onExportClientData && (
                        <button
                          type="button"
                          disabled={privacyOtpBusy}
                          onClick={() => {
                            setPrivacyOtpBusy(true);
                            setPrivacyOtpError(null);
                            setPrivacyActionNotice(null);
                            void supportAdapter
                              .requestPrivacyOtp({
                                action: 'export',
                                ticketCode: ticket.ticket_code,
                                sessionToken: ticket.client_session_token,
                              })
                              .then((res) => {
                                if (!res.ok || !res.challengeId) {
                                  setPrivacyOtpError(res.error ?? 'No se pudo enviar el código OTP.');
                                  return;
                                }
                                setPrivacyOtpInput('');
                                setPrivacyOtpChallenge({
                                  action: 'export',
                                  challengeId: res.challengeId,
                                  maskedEmail: res.maskedEmail ?? '***',
                                  devOtpPreview: res.devOtpPreview,
                                });
                              })
                              .finally(() => setPrivacyOtpBusy(false));
                          }}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-[#0B192C] bg-[#F8FAFC] hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors disabled:opacity-60"
                        >
                          <Download className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
                          <span>Descargar mis datos (JSON)</span>
                        </button>
                      )}

                      {onAnonymizeClientData && !ticket.anonymized_at && (
                        confirmAnonymizeOpen ? (
                          <div className="p-3 rounded-lg bg-red-50 border border-red-200 space-y-2 text-xs">
                            <p className="font-semibold text-red-900">
                              Para anonimizar tu nombre, correo e ID RustDesk enviaremos un
                              código de verificación OTP a tu correo.
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
                                disabled={privacyOtpBusy}
                                onClick={() => {
                                  setPrivacyOtpBusy(true);
                                  setPrivacyOtpError(null);
                                  setPrivacyActionNotice(null);
                                  void supportAdapter
                                    .requestPrivacyOtp({
                                      action: 'erase',
                                      ticketCode: ticket.ticket_code,
                                      sessionToken: ticket.client_session_token,
                                    })
                                    .then((res) => {
                                      if (!res.ok || !res.challengeId) {
                                        setPrivacyOtpError(res.error ?? 'No se pudo enviar el código OTP.');
                                        return;
                                      }
                                      setPrivacyOtpInput('');
                                      setConfirmAnonymizeOpen(false);
                                      setPrivacyOtpChallenge({
                                        action: 'erase',
                                        challengeId: res.challengeId,
                                        maskedEmail: res.maskedEmail ?? '***',
                                        devOtpPreview: res.devOtpPreview,
                                      });
                                    })
                                    .finally(() => setPrivacyOtpBusy(false));
                                }}
                                className="px-3 py-1 font-semibold text-white bg-red-700 hover:bg-red-800 disabled:bg-slate-400 rounded-md"
                              >
                                Enviar código OTP al correo
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
                    </>
                  )}

                  {!privacyOtpChallenge && privacyOtpError && (
                    <p role="alert" className="text-xs font-medium text-red-700">
                      {privacyOtpError}
                    </p>
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
