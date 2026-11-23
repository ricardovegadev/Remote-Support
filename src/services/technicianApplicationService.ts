import { getSupabaseClient } from '../lib/supabaseClient';
import {
  loadTechnicianApplications,
  saveTechnicianApplication,
} from './supportAdapter';
import type {
  TechnicianApplication,
  TechnicianSpecialty,
  UserAccountProfile,
  WorkModality,
} from '../types/support';

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
    // Fallback local
  }
  return headers;
}

export async function submitTechnicianApplicationToServer(
  application: TechnicianApplication
): Promise<{
  ok: boolean;
  persistedRemotely: boolean;
  application: TechnicianApplication;
  error?: string;
}> {
  // Respaldo inmediato en navegador para modo offline / preview
  saveTechnicianApplication(application);

  try {
    const res = await fetch('/api/technicians/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...application,
        nda_signature_name: application.nda_signed_name,
        timed_out: application.elapsed_seconds >= 900,
      }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      return {
        ok: true,
        persistedRemotely: false,
        application,
        error: payload.error,
      };
    }
    const data = (await res.json()) as {
      success?: boolean;
      application?: Partial<TechnicianApplication>;
    };
    const merged: TechnicianApplication = {
      ...application,
      ...(data.application ?? {}),
    };
    saveTechnicianApplication(merged);
    return {
      ok: true,
      persistedRemotely: true,
      application: merged,
    };
  } catch {
    return {
      ok: true,
      persistedRemotely: false,
      application,
    };
  }
}

export async function fetchTechnicianApplicationsForAdmin(): Promise<{
  applications: TechnicianApplication[];
  gmailConfigured: boolean;
  source: 'server' | 'local';
}> {
  const localApps = loadTechnicianApplications();
  try {
    const headers = await buildOperatorAuthHeaders();
    const res = await fetch('/api/admin/technician-applications', { headers });
    if (!res.ok) {
      return {
        applications: localApps,
        gmailConfigured: false,
        source: 'local',
      };
    }
    const data = (await res.json()) as {
      applications?: TechnicianApplication[];
      gmailConfigured?: boolean;
    };
    const remote = Array.isArray(data.applications) ? data.applications : [];
    const byId = new Map<string, TechnicianApplication>();
    for (const app of localApps) byId.set(app.id, app);
    for (const app of remote) {
      byId.set(app.id, {
        ...(byId.get(app.id) ?? ({} as TechnicianApplication)),
        ...app,
        nda_signed_name:
          app.nda_signed_name ||
          (app as TechnicianApplication & { nda_signature_name?: string }).nda_signature_name ||
          '',
      });
    }
    return {
      applications: Array.from(byId.values()).sort((a, b) =>
        b.created_at.localeCompare(a.created_at)
      ),
      gmailConfigured: Boolean(data.gmailConfigured),
      source: 'server',
    };
  } catch {
    return {
      applications: localApps,
      gmailConfigured: false,
      source: 'local',
    };
  }
}

export async function decideTechnicianApplication(
  application: TechnicianApplication,
  decision: 'approved' | 'rejected',
  reviewerNotes?: string
): Promise<{
  ok: boolean;
  application: TechnicianApplication;
  emailDeliveryStatus: 'sent' | 'simulated' | 'failed';
  debugRegisterUrl?: string;
  error?: string;
}> {
  try {
    const headers = await buildOperatorAuthHeaders();
    const res = await fetch(
      `/api/admin/technician-applications/${encodeURIComponent(application.id)}/decision`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ decision, reviewerNotes }),
      }
    );
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      application?: Partial<TechnicianApplication>;
      emailDeliveryStatus?: 'sent' | 'simulated' | 'failed';
      debugRegisterUrl?: string;
      error?: string;
    };
    if (res.ok && data.success) {
      const updated: TechnicianApplication = {
        ...application,
        ...(data.application ?? {}),
        status: decision,
        email_delivery_status: data.emailDeliveryStatus ?? 'simulated',
        debug_register_url: data.debugRegisterUrl,
      };
      saveTechnicianApplication(updated);
      return {
        ok: true,
        application: updated,
        emailDeliveryStatus: data.emailDeliveryStatus ?? 'simulated',
        debugRegisterUrl: data.debugRegisterUrl,
      };
    }
  } catch {
    // Fallback local preview
  }

  // Fallback local/preview: genera token local de prueba
  const nowIso = new Date().toISOString();
  const fakeToken = Array.from(
    globalThis.crypto.getRandomValues(new Uint8Array(32)),
    (b) => b.toString(16).padStart(2, '0')
  ).join('');
  const debugUrl =
    decision === 'approved'
      ? `${window.location.origin}/registro-tecnico?token=${fakeToken}`
      : undefined;
  const updated: TechnicianApplication = {
    ...application,
    status: decision,
    reviewer_notes: reviewerNotes ?? null,
    reviewed_at: nowIso,
    email_delivery_status: 'simulated',
    debug_register_url: debugUrl,
  };
  saveTechnicianApplication(updated);
  return {
    ok: true,
    application: updated,
    emailDeliveryStatus: 'simulated',
    debugRegisterUrl: debugUrl,
  };
}

export interface VerifiedTechnicianInvite {
  full_name: string;
  email: string;
  country: string;
  modality: WorkModality;
  specialties: TechnicianSpecialty[];
  nda_version: string;
  invite_expires_at: string | null;
}

export async function verifyTechnicianInviteToken(token: string): Promise<{
  ok: boolean;
  code?: 'invalid' | 'not_found' | 'used' | 'expired' | 'not_approved';
  invite?: VerifiedTechnicianInvite;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/technicians/invite/${encodeURIComponent(token)}`);
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      code?: 'invalid' | 'not_found' | 'used' | 'expired' | 'not_approved';
      invite?: VerifiedTechnicianInvite;
      error?: string;
    };
    if (res.ok && data.success && data.invite) {
      return { ok: true, invite: data.invite };
    }
    return {
      ok: false,
      code: data.code ?? 'invalid',
      error: data.error ?? 'Enlace de invitación inválido o expirado.',
    };
  } catch {
    return {
      ok: false,
      code: 'invalid',
      error: 'No se pudo verificar el enlace con el servidor.',
    };
  }
}

export async function completeTechnicianRegistration(input: {
  token: string;
  password: string;
  confirmNda: boolean;
}): Promise<{
  ok: boolean;
  profile?: UserAccountProfile;
  specialties?: TechnicianSpecialty[];
  modality?: WorkModality;
  error?: string;
}> {
  try {
    const res = await fetch('/api/technicians/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      profile?: UserAccountProfile;
      specialties?: TechnicianSpecialty[];
      modality?: WorkModality;
      error?: string;
    };
    if (res.ok && data.success && data.profile) {
      return {
        ok: true,
        profile: data.profile,
        specialties: data.specialties,
        modality: data.modality,
      };
    }
    return {
      ok: false,
      error: data.error ?? 'No se pudo completar el registro técnico.',
    };
  } catch {
    return {
      ok: false,
      error: 'Error de conexión al registrar tu cuenta.',
    };
  }
}
