import type {
  AiAgentConfig,
  ClientDevice,
  Organization,
  RemoteSessionRecord,
  SupportTicket,
} from '../types/support';

export interface OperationalTelemetrySnapshot {
  totalTickets: number;
  paidTickets: number;
  resolvedTickets: number;
  activeSessionsCount: number;
  avgSessionDurationMin: number;
  onlineDevicesCount: number;
  totalDevicesCount: number;
  installedAgentRatioPct: number;
  aiCreditsUsed: number;
  aiCreditsQuota: number;
  aiQuotaUtilizationPct: number;
  osBreakdown: Array<{ os: string; count: number; pct: number }>;
}

export function computeOperationalTelemetry(params: {
  tickets: SupportTicket[];
  sessions: RemoteSessionRecord[];
  devices: ClientDevice[];
  aiAgents: AiAgentConfig[];
  organization: Organization;
}): OperationalTelemetrySnapshot {
  const { tickets, sessions, devices, aiAgents, organization } = params;

  const totalTickets = tickets.length;
  const paidTickets = tickets.filter((t) => t.payment_status === 'paid').length;
  const resolvedTickets = tickets.filter((t) => t.status === 'resolved').length;
  const activeSessionsCount = sessions.filter(
    (s) => s.status === 'active'
  ).length;

  const avgSessionDurationMin =
    sessions.length > 0
      ? Math.round(
          sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) /
            sessions.length
        )
      : 0;

  const onlineDevicesCount = devices.filter((d) => d.is_online).length;
  const totalDevicesCount = devices.length;
  const installedCount =
    tickets.filter((t) => t.agent_type === 'installed').length +
    devices.filter((d) => d.agent_type === 'installed').length;
  const agentTotal = tickets.length + devices.length;
  const installedAgentRatioPct =
    agentTotal > 0 ? Math.round((installedCount / agentTotal) * 100) : 0;

  const creditsFromAgents = aiAgents.reduce(
    (sum, a) => sum + (a.credits_used || 0),
    0
  );
  const aiCreditsUsed = Math.max(
    organization.ai_credits_used || 0,
    creditsFromAgents
  );
  const aiCreditsQuota = Math.max(1, organization.ai_credits_monthly || 500);
  const aiQuotaUtilizationPct = Math.min(
    100,
    Math.round((aiCreditsUsed / aiCreditsQuota) * 100)
  );

  const osCounts = new Map<string, number>();
  for (const t of tickets) {
    osCounts.set(t.os_type, (osCounts.get(t.os_type) ?? 0) + 1);
  }
  const osBreakdown = Array.from(osCounts.entries())
    .map(([os, count]) => ({
      os,
      count,
      pct: totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalTickets,
    paidTickets,
    resolvedTickets,
    activeSessionsCount,
    avgSessionDurationMin,
    onlineDevicesCount,
    totalDevicesCount,
    installedAgentRatioPct,
    aiCreditsUsed,
    aiCreditsQuota,
    aiQuotaUtilizationPct,
    osBreakdown,
  };
}
