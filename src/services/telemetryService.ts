import { getSupabaseClient } from '../lib/supabaseClient';
export {
  computeOperationalTelemetry,
  type OperationalTelemetrySnapshot,
} from '../utils/telemetryLogic';

export interface TelemetryEvent {
  id: string;
  category: 'ai' | 'rustdesk' | 'payment' | 'rbac' | 'system';
  name: string;
  status: 'ok' | 'warn' | 'error';
  latencyMs?: number;
  metadata?: Record<string, string | number | boolean>;
  createdAt: string;
}

export interface ServerTelemetrySummary {
  status: 'healthy' | 'degraded';
  uptimeSeconds: number;
  nodeVersion: string;
  paymentsMode: string;
  geminiConfigured: boolean;
  supabaseConfigured: boolean;
  gmailConfigured: boolean;
  rustdeskCacheWarm: boolean;
  metrics: {
    totalRequestsTracked: number;
    aiRequestsCount: number;
    aiFallbackCount: number;
    avgAiLatencyMs: number;
    rustdeskDownloadCount: number;
    paymentIntentsCount: number;
    rbacDeniedCount: number;
  };
  recentEvents: TelemetryEvent[];
  collectedAt: string;
}

const LOCAL_TELEMETRY_KEY = 'rs365_telemetry_events_v1';

function readLocalTelemetryEvents(): TelemetryEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(LOCAL_TELEMETRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TelemetryEvent[]) : [];
  } catch {
    return [];
  }
}

function writeLocalTelemetryEvents(events: TelemetryEvent[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      LOCAL_TELEMETRY_KEY,
      JSON.stringify(events.slice(0, 40))
    );
  } catch {
    // Ignore storage quota errors
  }
}

export async function recordTelemetryEvent(
  event: Omit<TelemetryEvent, 'id' | 'createdAt'>
): Promise<void> {
  const fullEvent: TelemetryEvent = {
    ...event,
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `tel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };

  const existing = readLocalTelemetryEvents();
  writeLocalTelemetryEvents([fullEvent, ...existing]);

  if (typeof fetch === 'undefined') return;
  try {
    const supabase = getSupabaseClient();
    const token = supabase
      ? (await supabase.auth.getSession()).data.session?.access_token
      : undefined;
    await fetch('/api/telemetry/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(fullEvent),
      keepalive: true,
    });
  } catch {
    // Telemetry must never break user flows
  }
}

export async function fetchServerTelemetrySummary(): Promise<{
  summary: ServerTelemetrySummary | null;
  localEvents: TelemetryEvent[];
}> {
  const localEvents = readLocalTelemetryEvents();
  try {
    const supabase = getSupabaseClient();
    const token = supabase
      ? (await supabase.auth.getSession()).data.session?.access_token
      : undefined;
    const res = await fetch('/api/telemetry/summary', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      return { summary: null, localEvents };
    }
    const summary = (await res.json()) as ServerTelemetrySummary;
    return { summary, localEvents };
  } catch {
    return { summary: null, localEvents };
  }
}
