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

export async function runAiReceptionistTriage(input: {
  category: IssueCategory;
  osType: OperatingSystem;
  description: string;
  followUpAnswers?: Array<{ question: string; answer: string }>;
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
    const data = (await res.json()) as AiReceptionistTriage;
    return data;
  } catch {
    return {
      followUpQuestions: [
        '¿El problema ocurre de forma continua o intermitente?',
        '¿Realizaste algún cambio o actualización reciente en el equipo?',
        '¿Tienes permisos de administrador local en la sesión actual?',
      ],
      selfServiceSteps: [
        'Reinicia el equipo para descartar un bloqueo temporal de memoria o servicios.',
        'Verifica si el fallo se repite con otras aplicaciones o solo en un programa puntual.',
      ],
      needsRemoteSpecialist: true,
      preDiagnosis: deriveInitialDiagnosisSummary(
        input.category,
        input.osType,
        input.description
      ),
      suggestedCategory: input.category,
      suggestedTier: getSuggestedTierForCategory(input.category) as ServiceTier,
      estimatedMinutes: 25,
      confidenceNote:
        'Pre-diagnóstico preparado automáticamente para el técnico asignado.',
      source: 'fallback',
    };
  }
}

export async function runAiReportGenerator(
  ticket: SupportTicket,
  rawNotes: string,
  options?: { includePreventive?: boolean }
): Promise<{ report: string; source: 'gemini' | 'fallback' }> {
  const includePreventive = options?.includePreventive !== false;
  try {
    const res = await fetch('/api/ai/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
    return (await res.json()) as { report: string; source: 'gemini' | 'fallback' };
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
    const res = await fetch('/api/ai/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: ticket.category,
        osType: ticket.os_type,
        problemDescription: ticket.problem_description,
      }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return (await res.json()) as {
      checklist: string[];
      diagnosticSummary: string;
      source: 'gemini' | 'fallback';
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
