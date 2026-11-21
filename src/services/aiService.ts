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
