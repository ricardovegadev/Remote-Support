import { getSupabaseClient } from '../lib/supabaseClient';
import { supportAdapter } from './supportAdapter';
import type {
  AiReceptionistTriage,
  IssueCategory,
  OperatingSystem,
  ServiceTier,
  SupportTicket,
} from '../types/support';
import {
  buildTechnicalResolutionSummary,
  deriveInitialDiagnosisSummary,
  getSuggestedTierForCategory,
} from '../utils/ticketLogic';

async function buildOperatorAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
    }
  } catch {
    // Fallback sin cabecera Authorization en modo local
  }
  return headers;
}

function buildFriendlyFallbackTriage(input: {
  category: IssueCategory;
  osType: OperatingSystem;
  description: string;
}): AiReceptionistTriage {
  const lower = `${input.category} ${input.description}`.toLowerCase();
  const isOutlook = lower.includes('outlook') || lower.includes('correo');
  const isOneDrive = lower.includes('onedrive') || lower.includes('sincroniz');
  const isM365 = lower.includes('microsoft 365') || lower.includes('office') || lower.includes('licencia');
  const isSlow = lower.includes('lento') || lower.includes('lenta') || lower.includes('bloquead') || lower.includes('congela');
  const isNetwork = lower.includes('wi-fi') || lower.includes('wifi') || lower.includes('impresora') || lower.includes('red');
  const isMalware = lower.includes('virus') || lower.includes('malware') || lower.includes('emergente') || lower.includes('anuncio');

  let preDiagnosis = `Entendido. Podemos ayudarte a resolver este fallo en tu equipo ${input.osType} de forma segura. Primero prueba estos pasos rápidos; si continúa igual, un especialista puede conectarse contigo y dejarlo funcionando en ~25 minutos.`;
  let selfServiceSteps = [
    'Reinicia el equipo para descartar un bloqueo temporal.',
    'Comprueba si el problema ocurre solo en una aplicación o en todo el equipo.',
  ];

  if (isOutlook) {
    preDiagnosis = `Entendido, cuando Outlook no abre o se queda cargando suele deberse a un bloqueo del perfil o de la sesión de tu cuenta en ${input.osType}. Prueba estos dos pasos rápidos; si sigue igual, un especialista lo repara contigo en minutos sin perder tus correos.`;
    selfServiceSteps = [
      'Cierra Outlook por completo y vuelve a abrirlo manteniendo presionada la tecla Ctrl para iniciar en modo seguro.',
      'Abre tu navegador y verifica si puedes entrar a tu correo web (outlook.office.com) para confirmar que tu cuenta está activa.',
    ];
  } else if (isOneDrive) {
    preDiagnosis = `Cuando OneDrive se detiene o no sincroniza en ${input.osType}, normalmente se resuelve reconectando la sesión o liberando un archivo bloqueado. Prueba estas comprobaciones rápidas antes de escalar:`;
    selfServiceSteps = [
      'Haz clic en el icono de la nube de OneDrive en la barra de tareas y revisa si te pide iniciar sesión o muestra algún archivo en pausa.',
      'Verifica que tengas espacio libre suficiente en el disco de tu equipo y conexión estable a internet.',
    ];
  } else if (isM365) {
    preDiagnosis = `Los avisos de cuenta, activación o cierres en Microsoft 365 suelen corregirse actualizando tu sesión o reparando las aplicaciones en ${input.osType}. Puedes probar esto primero:`;
    selfServiceSteps = [
      'Cierra sesión en la aplicación de Office (Word, Excel u Outlook), reinicia el programa y vuelve a iniciar sesión con tu cuenta.',
      'Comprueba en account.microsoft.com que tu suscripción de Microsoft 365 figure activa.',
    ];
  } else if (isSlow) {
    preDiagnosis = `Cuando un equipo ${input.osType} se vuelve lento o se congela, suele haber programas en segundo plano consumiendo memoria o actualizaciones pendientes. Prueba estos dos pasos rápidos:`;
    selfServiceSteps = [
      'Guarda tu trabajo, cierra las pestañas y programas que no estés usando y reinicia el equipo (evita solo suspenderlo).',
      'Comprueba si el disco principal tiene al menos 15 % de espacio libre disponible.',
    ];
  } else if (isNetwork) {
    preDiagnosis = `Los cortes de Wi-Fi o impresoras sin conexión en ${input.osType} suelen solucionarse reiniciando el enlace de red o la cola de impresión. Prueba esto antes de solicitar conexión remota:`;
    selfServiceSteps = [
      'Apaga y vuelve a encender el Wi-Fi de tu equipo (o reinicia tu router/impresora esperando 20 segundos).',
      'Confirma si otros dispositivos (como tu celular) navegan con normalidad en la misma red.',
    ];
  } else if (isMalware) {
    preDiagnosis = `Si ves ventanas emergentes o anuncios sospechosos en tu ${input.osType}, lo más seguro es revisar extensiones del navegador y ejecutar una limpieza guiada sin instalar programas desconocidos. Prueba esto primero:`;
    selfServiceSteps = [
      'No hagas clic en los avisos ni descargues limpiadores de anuncios emergentes.',
      'Revisa las extensiones instaladas en tu navegador (Chrome/Edge) y desactiva cualquiera que no reconozcas.',
    ];
  }

  return {
    followUpQuestions: [
      '¿Con qué frecuencia ocurre?',
      '¿Empezó después de una actualización o cambio reciente?',
      '¿Es tu equipo personal o de empresa?',
    ],
    selfServiceSteps,
    needsRemoteSpecialist: true,
    preDiagnosis,
    suggestedCategory: input.category,
    suggestedTier: getSuggestedTierForCategory(input.category) as ServiceTier,
    estimatedMinutes: 25,
    confidenceNote:
      deriveInitialDiagnosisSummary(input.category, input.osType, input.description),
    source: 'fallback',
  };
}

export async function runAiReceptionistTriage(input: {
  category: IssueCategory;
  osType: OperatingSystem;
  description: string;
  followUpAnswers?: Array<{ question: string; answer: string }>;
  organizationId?: string;
}): Promise<AiReceptionistTriage> {
  try {
    const res = await fetch('/api/ai/receptionist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = (await res.json()) as AiReceptionistTriage & {
      creditsCharged?: number;
    };
    if (data.source === 'gemini' || data.creditsCharged) {
      supportAdapter.incrementAiAgentCredits(
        input.organizationId,
        'ai_receptionist',
        data.creditsCharged ?? 1
      );
    }
    return data;
  } catch {
    return buildFriendlyFallbackTriage(input);
  }
}

export async function runAiReportGenerator(
  ticket: SupportTicket,
  rawNotes: string,
  options?: { includePreventive?: boolean }
): Promise<{ report: string; source: 'gemini' | 'fallback' }> {
  const includePreventive = options?.includePreventive !== false;
  try {
    const headers = await buildOperatorAuthHeaders();
    const res = await fetch('/api/ai/report', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        organizationId: ticket.organization_id,
        ticketCode: ticket.ticket_code,
        clientName: ticket.client_name,
        category: ticket.category,
        osType: ticket.os_type,
        serviceTier: ticket.service_tier,
        problemDescription: ticket.problem_description,
        aiDiagnosis: ticket.ai_diagnosis_summary,
        rawNotes,
        includePreventive,
      }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      report: string;
      source: 'gemini' | 'fallback';
      creditsCharged?: number;
    };
    if (data.source === 'gemini' || data.creditsCharged) {
      supportAdapter.incrementAiAgentCredits(
        ticket.organization_id,
        'ai_report_generator',
        data.creditsCharged ?? 1
      );
    }
    return { report: data.report, source: data.source };
  } catch {
    return {
      report: buildTechnicalResolutionSummary(ticket, rawNotes, includePreventive),
      source: 'fallback',
    };
  }
}

export async function runAiTechnicianAssistant(ticket: SupportTicket): Promise<{
  checklist: string[];
  diagnosticSummary: string;
  source: 'gemini' | 'fallback';
}> {
  try {
    const headers = await buildOperatorAuthHeaders();
    const res = await fetch('/api/ai/assistant', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        organizationId: ticket.organization_id,
        category: ticket.category,
        osType: ticket.os_type,
        problemDescription: ticket.problem_description,
      }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      checklist: string[];
      diagnosticSummary: string;
      source: 'gemini' | 'fallback';
      creditsCharged?: number;
    };
    if (data.source === 'gemini' || data.creditsCharged) {
      supportAdapter.incrementAiAgentCredits(
        ticket.organization_id,
        'ai_technician_assistant',
        data.creditsCharged ?? 1
      );
    }
    return {
      checklist: data.checklist,
      diagnosticSummary: data.diagnosticSummary,
      source: data.source,
    };
  } catch {
    return {
      checklist: [
        'Validar estado de servicios críticos y registros recientes del sistema.',
        'Comprobar conectividad de red, DNS y credenciales activas.',
        'Ejecutar prueba de verificación en vivo junto al cliente antes de cerrar.',
      ],
      diagnosticSummary: ticket.ai_diagnosis_summary,
      source: 'fallback',
    };
  }
}
