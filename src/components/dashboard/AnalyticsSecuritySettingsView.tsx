import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Copy,
  Cpu,
  CreditCard,
  Database,
  Download,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Link2,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import { FEATURE_FLAGS } from '../../config/features';
import {
  computeOperationalTelemetry,
  fetchServerTelemetrySummary,
  type ServerTelemetrySummary,
  type TelemetryEvent,
} from '../../services/telemetryService';
import type {
  AiAgentConfig,
  AuditLogEntry,
  ClientDevice,
  Organization,
  OrganizationMember,
  RemoteSessionRecord,
  SupportTicket,
} from '../../types/support';
import {
  canChangeTeamMemberRole,
  canInviteTeamRole,
  canManageMemberRole,
  canToggleTeamMemberStatus,
  getRoleLabel,
  hasPermission,
  RBAC_PERMISSION_CATALOG,
  type OrganizationRole,
} from '../../utils/rbac';
import { getConfiguredTierPriceUsd } from '../../config/businessConfig';
import { useBusinessConfig } from '../../hooks/useBusinessConfig';
import {
  getServiceTierPriceUsd,
  isValidEmail,
} from '../../utils/ticketLogic';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabaseClient';
import { supportAdapter } from '../../services/supportAdapter';
import { createDirectTeamInvite } from '../../services/technicianApplicationService';

export function AnalyticsView({
  tickets,
  sessions = [],
  devices = [],
  aiAgents = [],
  organization,
}: {
  tickets: SupportTicket[];
  sessions?: RemoteSessionRecord[];
  devices?: ClientDevice[];
  aiAgents?: AiAgentConfig[];
  organization?: Organization;
}) {
  const businessConfig = useBusinessConfig();
  const [serverSummary, setServerSummary] =
    useState<ServerTelemetrySummary | null>(null);
  const [localEvents, setLocalEvents] = useState<TelemetryEvent[]>([]);
  const [telemetryLoading, setTelemetryLoading] = useState(false);

  const loadTelemetry = useCallback(async () => {
    setTelemetryLoading(true);
    const result = await fetchServerTelemetrySummary();
    setServerSummary(result.summary);
    setLocalEvents(result.localEvents);
    setTelemetryLoading(false);
  }, []);

  useEffect(() => {
    void loadTelemetry();
  }, [loadTelemetry]);

  const paidRevenue = tickets
    .filter((t) => t.payment_status === 'paid')
    .reduce(
      (sum, t) =>
        sum +
        (getConfiguredTierPriceUsd(t.service_tier, t.billing_mode, businessConfig) ??
          getServiceTierPriceUsd(t.service_tier)),
      0
    );
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;
  const resolutionRate =
    tickets.length > 0 ? Math.round((resolvedCount / tickets.length) * 100) : 0;

  const categories = Array.from(new Set(tickets.map((t) => t.category)));

  const fallbackOrg: Organization = organization ?? {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Remote Support 365',
    slug: 'remote-support-365',
    plan_tier: 'internal_hq',
    dispatch_mode: 'smart',
    rustdesk_relay_domain: '',
    payment_gateway: 'stripe_paypal',
    ai_credits_monthly: 500,
    ai_credits_used: 0,
    created_at: new Date().toISOString(),
  };

  const opTelemetry = computeOperationalTelemetry({
    tickets,
    sessions,
    devices,
    aiAgents,
    organization: fallbackOrg,
  });

  const combinedEvents =
    serverSummary && serverSummary.recentEvents.length > 0
      ? serverSummary.recentEvents
      : localEvents;

  return (
    <div data-testid="analytics-view" className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E5E9F2] rounded-xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-medium text-[#64748B]">
            Ingresos confirmados
          </p>
          <p className="font-mono tabular-nums text-2xl font-bold text-[#0F172A] mt-1.5">
            ${paidRevenue} USD
          </p>
          <p className="text-[11px] text-[#64748B] mt-1">
            Tickets liquidados en el periodo
          </p>
        </div>

        <div className="bg-white border border-[#E5E9F2] rounded-xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-medium text-[#64748B]">
            Tasa de resolución
          </p>
          <p className="font-mono tabular-nums text-2xl font-bold text-[#059669] mt-1.5">
            {resolutionRate}%
          </p>
          <p className="text-[11px] text-[#64748B] mt-1">
            {resolvedCount} de {tickets.length} casos cerrados
          </p>
        </div>

        <div className="bg-white border border-[#E5E9F2] rounded-xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <p className="text-xs font-medium text-[#64748B]">
            Tickets pagados
          </p>
          <p className="font-mono tabular-nums text-2xl font-bold text-[#2563EB] mt-1.5">
            {tickets.filter((t) => t.payment_status === 'paid').length} / {tickets.length}
          </p>
          <p className="text-[11px] text-[#64748B] mt-1">
            Confirmados en pasarela o periodo actual
          </p>
        </div>
      </div>

      {/* Telemetría Operativa y Salud del Sistema (Fase 3) */}
      <div
        data-testid="telemetry-panel"
        className="bg-white border border-[#E5E9F2] rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#0F172A]">
                  Telemetría operativa y salud BFF
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    serverSummary?.status === 'degraded'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-[#D1FAE5] text-[#059669]'
                  }`}
                >
                  {serverSummary?.status === 'degraded' ? 'Degradado' : 'En línea'}
                </span>
                {!isSupabaseConfigured() && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-900">
                    DEMO
                  </span>
                )}
              </div>
              <p className="text-xs text-[#64748B]">
                En memoria (instancia actual) de sesiones RustDesk, cuota IA, dispositivos y eventos RBAC.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadTelemetry()}
            disabled={telemetryLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E9F2] bg-[#F8FAFC] hover:bg-[#EFF6FF] text-xs font-semibold text-[#0F172A] transition-colors disabled:opacity-60 self-start sm:self-auto"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${telemetryLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            Actualizar telemetría
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl bg-[#F8FAFC] border border-[#E5E9F2] p-3.5">
            <p className="text-[11px] font-medium text-[#64748B]">
              Cuota créditos IA
            </p>
            <p className="font-mono tabular-nums text-lg font-bold text-[#0F172A] mt-1">
              {opTelemetry.aiCreditsUsed} / {opTelemetry.aiCreditsQuota}
            </p>
            <p className="text-[11px] text-[#2563EB] font-semibold mt-0.5">
              {opTelemetry.aiQuotaUtilizationPct}% utilizado
            </p>
          </div>

          <div className="rounded-xl bg-[#F8FAFC] border border-[#E5E9F2] p-3.5">
            <p className="text-[11px] font-medium text-[#64748B]">
              Duración media sesión
            </p>
            <p className="font-mono tabular-nums text-lg font-bold text-[#0F172A] mt-1">
              {opTelemetry.avgSessionDurationMin} min
            </p>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              {opTelemetry.activeSessionsCount} activas · {opTelemetry.installedAgentRatioPct}% agente fijo
            </p>
          </div>

          <div className="rounded-xl bg-[#F8FAFC] border border-[#E5E9F2] p-3.5">
            <p className="text-[11px] font-medium text-[#64748B]">
              Equipos monitoreados
            </p>
            <p className="font-mono tabular-nums text-lg font-bold text-[#059669] mt-1">
              {opTelemetry.onlineDevicesCount} / {opTelemetry.totalDevicesCount}
            </p>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Agentes RustDesk en línea
            </p>
          </div>

          <div className="rounded-xl bg-[#F8FAFC] border border-[#E5E9F2] p-3.5">
            <p className="text-[11px] font-medium text-[#64748B]">
              Latencia IA · En memoria (instancia actual)
            </p>
            <p className="font-mono tabular-nums text-lg font-bold text-[#0F172A] mt-1">
              {serverSummary ? `${serverSummary.metrics.avgAiLatencyMs} ms` : 'N/D'}
            </p>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              {serverSummary
                ? `Uptime ${Math.floor(serverSummary.uptimeSeconds / 60)}m · RBAC ${serverSummary.metrics.rbacDeniedCount} bloqueos`
                : 'Sin conexión al endpoint de telemetría BFF'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[#E5E9F2] p-4 space-y-3">
            <p className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
              Distribución por Sistema Operativo
            </p>
            {opTelemetry.osBreakdown.length === 0 ? (
              <p className="text-xs text-[#64748B]">Sin tickets registrados.</p>
            ) : (
              <div className="space-y-2">
                {opTelemetry.osBreakdown.map((row) => (
                  <div key={row.os} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-semibold text-[#0F172A]">{row.os}</span>
                      <span className="font-mono tabular-nums text-[#64748B]">
                        {row.count} ({row.pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#EFF6FF] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2563EB] rounded-full"
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#E5E9F2] p-4 space-y-2.5">
            <p className="text-xs font-bold text-[#0F172A]">
              Flujo reciente de telemetría
            </p>
            {combinedEvents.length === 0 ? (
              <p className="text-xs text-[#64748B] py-2">
                Sin eventos recientes capturados en esta sesión.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {combinedEvents.slice(0, 8).map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between gap-2 text-[11px] py-1 border-b border-[#F1F5F9] last:border-b-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                          ev.status === 'error'
                            ? 'bg-red-100 text-red-700'
                            : ev.status === 'warn'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-[#EFF6FF] text-[#2563EB]'
                        }`}
                      >
                        {ev.category}
                      </span>
                      <span className="font-medium text-[#0F172A] truncate">
                        {ev.name}
                      </span>
                    </div>
                    <span className="font-mono tabular-nums text-[#64748B] shrink-0">
                      {ev.latencyMs !== undefined ? `${ev.latencyMs}ms` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#E5E9F2] rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-4">
        <h3 className="text-base font-bold text-[#0F172A]">
          Rendimiento e ingresos por categoría
        </h3>
        {categories.length === 0 ? (
          <p className="text-xs text-[#64748B] py-4 text-center">
            Aún no hay tickets registrados en esta organización para mostrar métricas por categoría.
          </p>
        ) : (
          <div className="space-y-3.5">
            {categories.map((cat) => {
              const catTickets = tickets.filter((t) => t.category === cat);
              const catRev = catTickets
                .filter((t) => t.payment_status === 'paid')
                .reduce(
                  (s, t) =>
                    s +
                    (getConfiguredTierPriceUsd(t.service_tier, t.billing_mode, businessConfig) ??
                      getServiceTierPriceUsd(t.service_tier)),
                  0
                );
              const pct =
                tickets.length > 0
                  ? Math.round((catTickets.length / tickets.length) * 100)
                  : 0;
              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#0F172A]">{cat}</span>
                    <span className="font-mono tabular-nums text-[#64748B]">
                      {catTickets.length} tickets · ${catRev} USD
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#EFF6FF] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2563EB] rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function SecurityAuditView({
  logs,
  members = [],
  operatorRole = 'owner',
  onUpdateMemberRole,
  demoMode = false,
  onChangeDemoRole,
}: {
  logs: AuditLogEntry[];
  members?: OrganizationMember[];
  operatorRole?: OrganizationRole;
  onUpdateMemberRole?: (memberId: string, nextRole: OrganizationRole) => void;
  demoMode?: boolean;
  onChangeDemoRole?: (role: OrganizationRole) => void;
}) {
  const actorBadge = (type: AuditLogEntry['actor_type']) => {
    switch (type) {
      case 'technician':
        return 'bg-[#DBEAFE] text-[#1D4ED8]';
      case 'ai_agent':
        return 'bg-[#EEF2FF] text-[#4F46E5]';
      case 'client':
        return 'bg-[#D1FAE5] text-[#059669]';
      case 'system':
        return 'bg-slate-100 text-[#64748B]';
    }
  };

  const canManageRbac = hasPermission(operatorRole, 'rbac:manage');

  return (
    <div data-testid="security-audit-view" className="space-y-6">
      {/* Gobierno RBAC (Fase 3) */}
      <div
        data-testid="rbac-governance-panel"
        className="bg-white border border-[#E5E9F2] rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <span className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">
                Gobierno RBAC y control de privilegios
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Matriz de acceso mínimo por rol ({getRoleLabel(operatorRole)}) aplicada en Sidebar, acciones operativas y API del servidor.
              </p>
            </div>
          </div>

          {demoMode && onChangeDemoRole && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <label
                htmlFor="demo-rbac-role-select"
                className="text-[11px] font-semibold text-[#64748B]"
              >
                Simular rol:
              </label>
              <select
                id="demo-rbac-role-select"
                value={operatorRole}
                onChange={(e) =>
                  onChangeDemoRole(e.target.value as OrganizationRole)
                }
                className="px-2.5 py-1.5 rounded-lg border border-[#E5E9F2] bg-[#F8FAFC] text-xs font-semibold text-[#0F172A]"
              >
                <option value="owner">Owner · Propietario</option>
                <option value="admin">Admin · Operaciones</option>
                <option value="technician">Técnico Especialista</option>
              </select>
            </div>
          )}
        </div>

        {/* Matriz de permisos */}
        <div className="overflow-x-auto border border-[#E5E9F2] rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E5E9F2] text-[#64748B]">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Permiso</th>
                <th className="py-2.5 px-3 font-semibold">Dominio</th>
                <th className="py-2.5 px-3 font-semibold text-center">Owner</th>
                <th className="py-2.5 px-3 font-semibold text-center">Admin</th>
                <th className="py-2.5 px-3 font-semibold text-center">Técnico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E9F2]">
              {RBAC_PERMISSION_CATALOG.map((perm) => (
                <tr key={perm.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-2 px-3">
                    <p className="font-semibold text-[#0F172A]">{perm.label}</p>
                    <p className="text-[11px] text-[#64748B]">{perm.description}</p>
                  </td>
                  <td className="py-2 px-3 text-[#475569] whitespace-nowrap">
                    {perm.domain}
                  </td>
                  {(['owner', 'admin', 'technician'] as const).map((r) => {
                    const allowed = hasPermission(r, perm.id);
                    return (
                      <td key={r} className="py-2 px-3 text-center">
                        {allowed ? (
                          <CheckCircle2
                            className="w-4 h-4 text-[#059669] inline-block"
                            aria-label={`${r}: permitido`}
                          />
                        ) : (
                          <Lock
                            className="w-3.5 h-3.5 text-slate-300 inline-block"
                            aria-label={`${r}: restringido`}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Gobierno de miembros */}
        {members.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
              Miembros de la organización y asignación de rol
            </p>
            <div className="divide-y divide-[#E5E9F2] border border-[#E5E9F2] rounded-xl overflow-hidden">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-white"
                >
                  <div>
                    <p className="font-semibold text-[#0F172A]">
                      {member.full_name}
                    </p>
                    <p className="text-[11px] text-[#64748B]">
                      {member.email} · {member.member_type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      aria-label={`Rol RBAC para ${member.full_name}`}
                      disabled={
                        !canManageRbac ||
                        !onUpdateMemberRole ||
                        (member.role === 'owner' && operatorRole !== 'owner')
                      }
                      value={member.role}
                      onChange={(e) => {
                        const nextRole = e.target.value as OrganizationRole;
                        if (
                          onUpdateMemberRole &&
                          canManageMemberRole(operatorRole, member.role, nextRole)
                        ) {
                          onUpdateMemberRole(member.id, nextRole);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-[#E5E9F2] bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] disabled:opacity-60"
                    >
                      <option value="owner" disabled={operatorRole !== 'owner'}>
                        Owner
                      </option>
                      <option value="admin">Admin</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="technician">Especialista</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-[#E5E9F2] rounded-xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex items-start gap-3.5">
        <span className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
          <ShieldAlert className="w-5 h-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-[#0F172A]">
            Bitácora inmutable de seguridad y auditoría
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Registro verificable de enlaces RustDesk, consentimientos explícitos,
            asignaciones de tickets, cambios RBAC y acciones de agentes IA.
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#E5E9F2] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.03)] overflow-hidden">
        {logs.length === 0 ? (
          <p className="p-8 text-center text-xs text-[#64748B]">
            No hay eventos de auditoría registrados todavía en esta organización.
          </p>
        ) : (
          <div className="divide-y divide-[#E5E9F2]">
            {logs.map((entry) => (
              <div
                key={entry.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-[#F8FAFC] transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${actorBadge(
                        entry.actor_type
                      )}`}
                    >
                      {entry.actor_type}
                    </span>
                    <span className="font-semibold text-[#0F172A]">
                      {entry.actor_label}
                    </span>
                    <span className="text-[#475569]">{entry.action}</span>
                  </div>
                  <p className="text-[#64748B] font-mono tabular-nums text-[11px]">
                    Referencia: {entry.target_ref}
                  </p>
                </div>
                <span className="font-mono tabular-nums text-[#64748B] shrink-0">
                  {new Date(entry.created_at).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface OrganizationSettingsViewProps {
  organization: Organization;
  supabaseConfigured: boolean;
  operatorEmail: string;
  operatorRole?: OrganizationRole;
  operatorUserId?: string | null;
  members?: OrganizationMember[];
  onSaveSettings: (
    patch: Partial<
      Pick<Organization, 'name' | 'rustdesk_relay_domain' | 'payment_gateway'>
    >
  ) => void;
  onUpdateMemberRole?: (
    memberId: string,
    nextRole: OrganizationRole
  ) => Promise<{ ok: boolean; error?: string }> | void;
  onToggleMemberStatus?: (
    memberId: string,
    nextStatus: 'active' | 'suspended'
  ) => Promise<{ ok: boolean; error?: string }> | void;
  onRecordTeamInviteAudit?: (summary: {
    fullName: string;
    email: string;
    role: string;
  }) => void;
  onOpenSqlModal: () => void;
  onSignOut: () => void;
  onExportOrgData?: (verifiedExportPayload?: unknown) => void;
  onDeletePersonalData?: (verified?: boolean) => void;
}

export function OrganizationSettingsView({
  organization,
  supabaseConfigured,
  operatorEmail,
  operatorRole = 'technician',
  operatorUserId = null,
  members = [],
  onSaveSettings,
  onUpdateMemberRole,
  onToggleMemberStatus,
  onRecordTeamInviteAudit,
  onOpenSqlModal,
  onSignOut,
  onExportOrgData,
  onDeletePersonalData,
}: OrganizationSettingsViewProps) {
  const [orgName, setOrgName] = useState(organization.name);
  const [relayDomain, setRelayDomain] = useState(
    organization.rustdesk_relay_domain
  );
  const [gateway, setGateway] = useState(organization.payment_gateway);
  const [savedNotice, setSavedNotice] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [privacyNotice, setPrivacyNotice] = useState<string | null>(null);
  const [otpChallenge, setOtpChallenge] = useState<{
    action: 'export' | 'erase';
    challengeId: string;
    maskedEmail: string;
    devOtpPreview?: string;
  } | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Seguridad de mi cuenta (Cambio de contraseña)
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Equipo y Roles (Owner / Admin)
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'supervisor'>('supervisor');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [generatedInvite, setGeneratedInvite] = useState<{
    url: string;
    fullName: string;
    email: string;
    role: 'admin' | 'supervisor';
    expiresAt?: string;
  } | null>(null);
  const [copiedInviteUrl, setCopiedInviteUrl] = useState(false);
  const [memberActionBusyId, setMemberActionBusyId] = useState<string | null>(null);
  const [teamFeedback, setTeamFeedback] = useState<{
    type: 'ok' | 'error';
    message: string;
  } | null>(null);

  const canViewTeamSection =
    operatorRole === 'owner' || operatorRole === 'admin';
  const isOwner = operatorRole === 'owner';
  const canInviteAdminOrSupervisor = canInviteTeamRole(operatorRole, 'admin');

  useEffect(() => {
    setOrgName(organization.name);
    setRelayDomain(organization.rustdesk_relay_domain);
    setGateway(organization.payment_gateway);
    setSavedNotice(false);
    setGeneratedInvite(null);
    setTeamFeedback(null);
  }, [
    organization.id,
    organization.name,
    organization.rustdesk_relay_domain,
    organization.payment_gateway,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      name: orgName.trim() || organization.name,
      rustdesk_relay_domain:
        relayDomain.trim() || organization.rustdesk_relay_domain,
      payment_gateway: gateway,
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2500);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Las contraseñas no coinciden. Verifica ambos campos.');
      return;
    }

    if (!supabaseConfigured) {
      setPasswordSuccess(
        'Modo local activo: la validación pasó correctamente. Configura Supabase Auth para persistir el cambio de contraseña en la nube.'
      );
      setNewPassword('');
      setConfirmNewPassword('');
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setPasswordError('No se pudo conectar con el servicio de autenticación.');
      return;
    }

    setPasswordBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        setPasswordError(
          `No se pudo actualizar la contraseña: ${error.message}`
        );
        return;
      }
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordSuccess(
        'Contraseña actualizada correctamente. Tu sesión sigue protegida.'
      );
    } catch {
      setPasswordError('Error de red al actualizar tu contraseña.');
    } finally {
      setPasswordBusy(false);
    }
  };

  const handleTeamInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setCopiedInviteUrl(false);

    if (!canInviteAdminOrSupervisor) {
      setInviteError('Solo el propietario (Owner) puede invitar administradores o supervisores.');
      return;
    }
    if (inviteFullName.trim().length < 2) {
      setInviteError('Ingresa el nombre completo (mínimo 2 caracteres).');
      return;
    }
    if (!isValidEmail(inviteEmail)) {
      setInviteError('Ingresa un correo electrónico válido.');
      return;
    }

    setInviteBusy(true);
    try {
      const res = await createDirectTeamInvite({
        fullName: inviteFullName.trim(),
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        organizationId: organization.id,
        actorRole: operatorRole,
      });
      if (!res.ok || !res.inviteUrl) {
        setInviteError(
          res.error ?? 'No se pudo generar el enlace de invitación.'
        );
        return;
      }
      setGeneratedInvite({
        url: res.inviteUrl,
        fullName: inviteFullName.trim(),
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        expiresAt: res.expiresAt,
      });
      onRecordTeamInviteAudit?.({
        fullName: inviteFullName.trim(),
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      });
      setInviteFullName('');
      setInviteEmail('');
    } finally {
      setInviteBusy(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!generatedInvite?.url) return;
    try {
      await navigator.clipboard.writeText(generatedInvite.url);
      setCopiedInviteUrl(true);
      window.setTimeout(() => setCopiedInviteUrl(false), 2500);
    } catch {
      setInviteError('No se pudo copiar automáticamente. Copia el enlace manualmente.');
    }
  };

  const handleRoleChange = async (
    member: OrganizationMember,
    nextRole: OrganizationRole
  ) => {
    setTeamFeedback(null);
    const isSelfOwner =
      member.role === 'owner' ||
      (Boolean(operatorUserId) && member.user_id === operatorUserId);
    if (
      isSelfOwner ||
      !canChangeTeamMemberRole(operatorRole, member.role, nextRole)
    ) {
      setTeamFeedback({
        type: 'error',
        message: 'Bloqueo de seguridad: no está permitido degradar o modificar el rol del propietario (Owner).',
      });
      return;
    }
    if (!onUpdateMemberRole) return;
    setMemberActionBusyId(member.id);
    try {
      const result = await onUpdateMemberRole(member.id, nextRole);
      if (result && !result.ok) {
        setTeamFeedback({
          type: 'error',
          message: result.error ?? 'No se pudo actualizar el rol.',
        });
      } else {
        setTeamFeedback({
          type: 'ok',
          message: `Rol de ${member.full_name} actualizado a ${getRoleLabel(nextRole)}.`,
        });
      }
    } finally {
      setMemberActionBusyId(null);
    }
  };

  const handleStatusToggle = async (member: OrganizationMember) => {
    setTeamFeedback(null);
    const isSelfOwner =
      member.role === 'owner' ||
      (Boolean(operatorUserId) && member.user_id === operatorUserId);
    if (isSelfOwner || !canToggleTeamMemberStatus(operatorRole, member.role)) {
      setTeamFeedback({
        type: 'error',
        message: 'Bloqueo de seguridad: no está permitido suspender al propietario (Owner).',
      });
      return;
    }
    if (!onToggleMemberStatus) return;
    const nextStatus: 'active' | 'suspended' =
      member.status === 'suspended' ? 'active' : 'suspended';
    setMemberActionBusyId(member.id);
    try {
      const result = await onToggleMemberStatus(member.id, nextStatus);
      if (result && !result.ok) {
        setTeamFeedback({
          type: 'error',
          message: result.error ?? 'No se pudo cambiar el estado de acceso.',
        });
      } else {
        setTeamFeedback({
          type: 'ok',
          message:
            nextStatus === 'suspended'
              ? `Acceso suspendido para ${member.full_name}.`
              : `Acceso reactivado para ${member.full_name}.`,
        });
      }
    } finally {
      setMemberActionBusyId(null);
    }
  };

  const roleBadgeLabel = (role: OrganizationRole) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'admin':
        return 'Admin';
      case 'supervisor':
        return 'Supervisor';
      case 'technician':
        return 'Especialista';
    }
  };

  const roleBadgeClass = (role: OrganizationRole) => {
    switch (role) {
      case 'owner':
        return 'bg-[#0B192C] text-white';
      case 'admin':
        return 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]';
      case 'supervisor':
        return 'bg-amber-50 text-amber-900 border border-amber-200';
      case 'technician':
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  return (
    <div data-testid="org-settings-view" className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#E5E9F2] rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-5"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#2563EB]">
            {FEATURE_FLAGS.ENABLE_SAAS_MULTITENANT
              ? 'CONFIGURACIÓN MULTI-TENANT'
              : 'CONFIGURACIÓN OPERATIVA'}
          </p>
          <h2 className="text-lg font-bold text-[#0F172A] mt-0.5">
            {FEATURE_FLAGS.ENABLE_SAAS_MULTITENANT
              ? 'Parámetros de la organización'
              : 'Parámetros de la plataforma'}
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Configura el nombre del espacio de trabajo, relay RustDesk dedicado y
            pasarela de pagos (Stripe / PayPal).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="org-settings-name"
              className="block text-xs font-semibold text-[#0F172A] mb-1.5"
            >
              {FEATURE_FLAGS.ENABLE_SAAS_MULTITENANT
                ? 'Nombre de la Organización'
                : 'Nombre del espacio operativo'}
            </label>
            <input
              id="org-settings-name"
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full rounded-xl border border-[#E5E9F2] px-3.5 py-2.5 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="org-settings-relay"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A] mb-1.5"
            >
              <Globe className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
              <span>Dominio Relay de RustDesk</span>
            </label>
            <input
              id="org-settings-relay"
              type="text"
              value={relayDomain}
              onChange={(e) => setRelayDomain(e.target.value)}
              className="w-full rounded-xl border border-[#E5E9F2] px-3.5 py-2.5 text-sm font-mono text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="org-settings-gateway"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A] mb-1.5"
            >
              <CreditCard
                className="w-3.5 h-3.5 text-[#059669]"
                aria-hidden="true"
              />
              <span>Pasarela de Pagos</span>
            </label>
            <select
              id="org-settings-gateway"
              value={gateway}
              onChange={(e) =>
                setGateway(
                  e.target.value as 'stripe' | 'paypal' | 'stripe_paypal'
                )
              }
              className="w-full rounded-xl border border-[#E5E9F2] px-3.5 py-2.5 text-sm bg-white text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
            >
              <option value="stripe_paypal">Stripe + PayPal (Habilitados)</option>
              <option value="stripe">Solo Stripe</option>
              <option value="paypal">Solo PayPal</option>
            </select>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E9F2] text-xs">
            <p className="text-[#64748B]">Motor de Base de Datos</p>
            <p className="font-semibold text-[#0F172A] mt-1">
              {supabaseConfigured
                ? FEATURE_FLAGS.ENABLE_SAAS_MULTITENANT
                  ? 'Supabase PostgreSQL + RLS Multiempresa Activo'
                  : 'Supabase PostgreSQL + RLS Activo'
                : 'Modo Demo Local (Fallback en memoria + BroadcastChannel)'}
            </p>
            <p className="text-[#64748B] mt-0.5">Operador: {operatorEmail}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E5E9F2]">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-colors shadow-sm"
            >
              Guardar configuración
            </button>

            <button
              type="button"
              onClick={onOpenSqlModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#0F172A] bg-white border border-[#E5E9F2] hover:bg-[#F8FAFC] rounded-xl transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
              <span>Ver / Copiar schema.sql</span>
            </button>

            <button
              type="button"
              onClick={onSignOut}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] bg-white border border-[#E5E9F2] hover:bg-[#F8FAFC] rounded-xl transition-colors"
            >
              Cerrar sesión
            </button>
          </div>

          {savedNotice && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#059669]">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              <span>Cambios guardados</span>
            </span>
          )}
        </div>
      </form>

      {/* Seguridad de mi cuenta — Cambio de contraseña */}
      <form
        data-testid="account-security-password-card"
        onSubmit={(e) => void handlePasswordUpdate(e)}
        noValidate
        className="bg-white border border-[#E5E9F2] rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-5"
      >
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
            <KeyRound className="w-4 h-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#2563EB]">
              CREDENCIALES DE ACCESO
            </p>
            <h3 className="text-base font-bold text-[#0F172A] mt-0.5">
              Seguridad de mi cuenta
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Actualiza la contraseña de tu cuenta autenticada ({operatorEmail || 'operador'}).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="account-new-password"
              className="block text-xs font-semibold text-[#0F172A] mb-1.5"
            >
              Nueva contraseña (mín. 8 caracteres)
            </label>
            <div className="relative">
              <input
                id="account-new-password"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-xl border border-[#E5E9F2] bg-white pl-3.5 pr-10 py-2.5 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                aria-label={
                  showNewPassword
                    ? 'Ocultar nueva contraseña'
                    : 'Mostrar nueva contraseña'
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="account-confirm-password"
              className="block text-xs font-semibold text-[#0F172A] mb-1.5"
            >
              Confirmar nueva contraseña
            </label>
            <div className="relative">
              <input
                id="account-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Repite tu nueva contraseña"
                className="w-full rounded-xl border border-[#E5E9F2] bg-white pl-3.5 pr-10 py-2.5 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={
                  showConfirmPassword
                    ? 'Ocultar confirmación de contraseña'
                    : 'Mostrar confirmación de contraseña'
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {passwordError && (
          <div
            role="alert"
            className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-medium text-red-800"
          >
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div
            role="status"
            className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs font-medium text-emerald-900 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#E5E9F2]">
          <p className="text-[11px] text-[#64748B]">
            Recomendamos combinar letras mayúsculas, minúsculas y números.
          </p>
          <button
            type="submit"
            disabled={passwordBusy}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 rounded-xl transition-colors shadow-sm whitespace-nowrap"
          >
            {passwordBusy ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </div>
      </form>

      {/* Equipo y Roles (Visible únicamente para Owner y Admin) */}
      {canViewTeamSection && (
        <div
          data-testid="team-and-roles-section"
          className="bg-white border border-[#E5E9F2] rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#2563EB]">
                  GOBIERNO DE ACCESOS
                </p>
                <h3 className="text-base font-bold text-[#0F172A] mt-0.5">
                  Equipo y Roles
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Miembros vinculados a {organization.name}.{' '}
                  {isOwner
                    ? 'Como propietario puedes invitar administradores/supervisores, cambiar roles o suspender accesos.'
                    : 'Vista de consulta operativa. Solo el Owner puede modificar roles o emitir invitaciones administrativas.'}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F8FAFC] border border-[#E5E9F2] text-[11px] font-semibold text-[#0F172A] self-start sm:self-auto shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
              <span>{members.length} miembros</span>
            </span>
          </div>

          {/* Invitar Administrador o Supervisor (Solo Owner) */}
          {canInviteAdminOrSupervisor && (
            <form
              onSubmit={(e) => void handleTeamInviteSubmit(e)}
              noValidate
              className="rounded-xl bg-[#F8FAFC] border border-[#E5E9F2] p-4 space-y-3"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A]">
                <UserPlus className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                <span>Invitar Administrador o Supervisor (Enlace único · 72 h)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4">
                  <label
                    htmlFor="team-invite-name"
                    className="block text-[11px] font-semibold text-[#0F172A] mb-1"
                  >
                    Nombre completo
                  </label>
                  <input
                    id="team-invite-name"
                    type="text"
                    value={inviteFullName}
                    onChange={(e) => setInviteFullName(e.target.value)}
                    placeholder="Ej. Laura Mendoza"
                    className="w-full rounded-lg border border-[#E5E9F2] bg-white px-3 py-2 text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label
                    htmlFor="team-invite-email"
                    className="block text-[11px] font-semibold text-[#0F172A] mb-1"
                  >
                    Correo electrónico
                  </label>
                  <input
                    id="team-invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="laura@empresa.com"
                    className="w-full rounded-lg border border-[#E5E9F2] bg-white px-3 py-2 text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="team-invite-role"
                    className="block text-[11px] font-semibold text-[#0F172A] mb-1"
                  >
                    Rol
                  </label>
                  <select
                    id="team-invite-role"
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(e.target.value as 'admin' | 'supervisor')
                    }
                    className="w-full rounded-lg border border-[#E5E9F2] bg-white px-2.5 py-2 text-xs font-semibold text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                  >
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={inviteBusy}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{inviteBusy ? 'Generando...' : 'Generar enlace'}</span>
                  </button>
                </div>
              </div>

              {inviteError && (
                <p role="alert" className="text-xs font-medium text-[#DC2626]">
                  {inviteError}
                </p>
              )}

              {generatedInvite && (
                <div
                  data-testid="generated-team-invite-box"
                  className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 space-y-2 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-emerald-900">
                      Enlace de invitación creado para {generatedInvite.fullName} (
                      {generatedInvite.role === 'admin' ? 'Admin' : 'Supervisor'}) · Válido 72 h
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleCopyInviteLink()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B192C] hover:bg-slate-800 text-white text-[11px] font-semibold transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{copiedInviteUrl ? '¡Enlace copiado!' : 'Copiar enlace'}</span>
                    </button>
                  </div>
                  <p className="font-mono text-[11px] text-emerald-950 bg-white/80 border border-emerald-200 rounded px-2.5 py-1.5 break-all">
                    {generatedInvite.url}
                  </p>
                  <p className="text-[11px] text-emerald-800">
                    Envía este enlace privado por correo o WhatsApp. Es de un solo uso y caduca automáticamente en 72 horas.
                  </p>
                </div>
              )}
            </form>
          )}

          {teamFeedback && (
            <div
              role={teamFeedback.type === 'error' ? 'alert' : 'status'}
              className={`rounded-xl px-3.5 py-2.5 text-xs font-medium border ${
                teamFeedback.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              {teamFeedback.message}
            </div>
          )}

          {/* Lista de miembros */}
          <div className="overflow-x-auto border border-[#E5E9F2] rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5E9F2] text-[#64748B]">
                  <th className="py-2.5 px-3.5 font-semibold">Miembro</th>
                  <th className="py-2.5 px-3.5 font-semibold">Rol</th>
                  <th className="py-2.5 px-3.5 font-semibold">Estado</th>
                  {isOwner && (
                    <th className="py-2.5 px-3.5 font-semibold text-right">
                      Gestión de acceso
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9F2]">
                {members.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isOwner ? 4 : 3}
                      className="py-6 text-center text-[#64748B]"
                    >
                      No hay miembros registrados en esta organización todavía.
                    </td>
                  </tr>
                ) : (
                  members.map((member) => {
                    const isProtectedOwner =
                      member.role === 'owner' ||
                      (Boolean(operatorUserId) && member.user_id === operatorUserId);
                    const isSuspended = member.status === 'suspended';
                    const isBusy = memberActionBusyId === member.id;
                    return (
                      <tr
                        key={member.id}
                        data-testid={`team-member-row-${member.id}`}
                        className="hover:bg-[#F8FAFC]/70"
                      >
                        <td className="py-3 px-3.5">
                          <p className="font-semibold text-[#0F172A]">
                            {member.full_name}
                          </p>
                          <p className="text-[11px] text-[#64748B] font-mono">
                            {member.email}
                          </p>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${roleBadgeClass(
                              member.role
                            )}`}
                          >
                            {roleBadgeLabel(member.role)}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              isSuspended
                                ? 'bg-red-100 text-red-800'
                                : member.status === 'invited'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isSuspended
                              ? 'Suspendido'
                              : member.status === 'invited'
                              ? 'Invitado'
                              : 'Activo'}
                          </span>
                        </td>
                        {isOwner && (
                          <td className="py-3 px-3.5 text-right whitespace-nowrap">
                            {isProtectedOwner ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-[#475569] text-[11px] font-semibold">
                                <Lock className="w-3 h-3" aria-hidden="true" />
                                <span>Propietario protegido</span>
                              </span>
                            ) : (
                              <div className="inline-flex items-center justify-end gap-2">
                                <select
                                  aria-label={`Cambiar rol de ${member.full_name}`}
                                  disabled={isBusy}
                                  value={member.role}
                                  onChange={(e) =>
                                    void handleRoleChange(
                                      member,
                                      e.target.value as OrganizationRole
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-lg border border-[#E5E9F2] bg-white text-xs font-semibold text-[#0F172A] focus:border-[#2563EB] focus:outline-none disabled:opacity-50"
                                >
                                  <option value="admin">Admin</option>
                                  <option value="supervisor">Supervisor</option>
                                  <option value="technician">Especialista</option>
                                </select>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => void handleStatusToggle(member)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 ${
                                    isSuspended
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                  }`}
                                >
                                  {isSuspended ? (
                                    <>
                                      <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                                      <span>Reactivar</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserX className="w-3.5 h-3.5" aria-hidden="true" />
                                      <span>Suspender</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SaaS billing status & data portability */}
      <div
        className={
          FEATURE_FLAGS.ENABLE_SAAS_MULTITENANT
            ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
            : 'grid grid-cols-1 gap-6'
        }
      >
        {FEATURE_FLAGS.ENABLE_SAAS_MULTITENANT && (
          <div
            data-testid="org-subscription-card"
            className="bg-white border border-[#E5E9F2] rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-4"
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#2563EB]">
                PLAN DE ORGANIZACIÓN
              </p>
              <h3 className="text-base font-bold text-[#0F172A] mt-0.5">
                Plan de la organización
              </h3>
              <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                Plan activo:{' '}
                <strong className="text-[#0F172A] font-mono">
                  {organization.plan_tier}
                </strong>
                . El estado de cobro no está sincronizado con una pasarela en esta versión.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
              La etiqueta del plan es informativa. Todavía no hay portal de facturación para consultar cargos o cancelar una renovación.
            </div>
          </div>
        )}

        <div
          data-testid="org-gdpr-card"
          className="bg-white border border-[#E5E9F2] rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-4"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#059669]">
              DERECHOS GDPR / LOPDP
            </p>
            <h3 className="text-base font-bold text-[#0F172A] mt-0.5">
              Portabilidad y supresión de datos
            </h3>
            <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
              Exporta tu historial de operación en JSON o solicita la anonimización de
              tus datos personales de operador.
            </p>
          </div>

          {otpChallenge ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (otpBusy) return;
                setOtpBusy(true);
                setOtpError(null);
                void (async () => {
                  try {
                    const supabase = supabaseConfigured ? getSupabaseClient() : null;
                    const sessionRes = supabase ? await supabase.auth.getSession() : null;
                    const accessToken = sessionRes?.data.session?.access_token ?? null;
                    if (otpChallenge.action === 'export') {
                      const verifyRes = await supportAdapter.exportPrivacyDataWithOtp({
                        challengeId: otpChallenge.challengeId,
                        otpCode: otpInput,
                        email: operatorEmail,
                        accessToken,
                      });
                      if (!verifyRes.ok) {
                        setOtpError(verifyRes.error ?? 'Código OTP inválido.');
                        return;
                      }
                      onExportOrgData?.(verifyRes.exportPayload);
                      setOtpChallenge(null);
                      setOtpInput('');
                      setPrivacyNotice('Verificación OTP completada. Datos exportados en formato JSON.');
                    } else {
                      const verifyRes = await supportAdapter.erasePrivacyDataWithOtp({
                        challengeId: otpChallenge.challengeId,
                        otpCode: otpInput,
                        email: operatorEmail,
                        accessToken,
                      });
                      if (!verifyRes.ok) {
                        setOtpError(verifyRes.error ?? 'Código OTP inválido.');
                        return;
                      }
                      onDeletePersonalData?.(true);
                      setOtpChallenge(null);
                      setConfirmDeleteOpen(false);
                    }
                  } finally {
                    setOtpBusy(false);
                  }
                })();
              }}
              className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E9F2] space-y-2.5 text-xs"
            >
              <p className="font-semibold text-[#0F172A]">
                Código OTP enviado a <span className="font-mono">{otpChallenge.maskedEmail}</span>
              </p>
              {otpChallenge.devOtpPreview && (
                <p className="text-[11px] font-mono bg-amber-50 border border-amber-200 text-amber-950 rounded px-2 py-1">
                  Sandbox OTP: {otpChallenge.devOtpPreview}
                </p>
              )}
              <div>
                <label htmlFor="org-privacy-otp-input" className="block text-[11px] font-medium text-[#475569] mb-1">
                  Ingresa el código de 6 dígitos
                </label>
                <input
                  id="org-privacy-otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full max-w-xs rounded-lg border border-[#E5E9F2] bg-white px-3 py-1.5 font-mono text-sm tracking-widest text-[#0F172A]"
                />
              </div>
              {otpError && (
                <p role="alert" className="text-[11px] font-medium text-[#DC2626]">{otpError}</p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOtpChallenge(null);
                    setOtpInput('');
                    setOtpError(null);
                  }}
                  className="px-3 py-1.5 font-medium text-[#475569] bg-white border border-[#E5E9F2] rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={otpBusy || otpInput.length !== 6}
                  className="px-3 py-1.5 font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-400 rounded-lg"
                >
                  {otpBusy
                    ? 'Verificando...'
                    : otpChallenge.action === 'export'
                    ? 'Verificar y descargar'
                    : 'Verificar y eliminar'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2.5">
                {onExportOrgData && (
                  <button
                    type="button"
                    disabled={otpBusy}
                    onClick={() => {
                      setOtpBusy(true);
                      setOtpError(null);
                      setPrivacyNotice(null);
                      void (async () => {
                        try {
                          const supabase = supabaseConfigured ? getSupabaseClient() : null;
                          const sessionRes = supabase ? await supabase.auth.getSession() : null;
                          const accessToken = sessionRes?.data.session?.access_token ?? null;
                          const res = await supportAdapter.requestPrivacyOtp({
                            action: 'export',
                            email: operatorEmail,
                            accessToken,
                          });
                          if (!res.ok || !res.challengeId) {
                            setOtpError(res.error ?? 'No se pudo enviar el código OTP.');
                            return;
                          }
                          setOtpInput('');
                          setOtpChallenge({
                            action: 'export',
                            challengeId: res.challengeId,
                            maskedEmail: res.maskedEmail ?? '***',
                            devOtpPreview: res.devOtpPreview,
                          });
                        } finally {
                          setOtpBusy(false);
                        }
                      })();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#0F172A] bg-white hover:bg-[#F8FAFC] border border-[#E5E9F2] rounded-xl transition-colors disabled:opacity-60"
                  >
                    <Download className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
                    <span>Descargar mis datos (JSON)</span>
                  </button>
                )}

                {onDeletePersonalData && !confirmDeleteOpen && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#DC2626] bg-white hover:bg-red-50 border border-red-200 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Eliminar mis datos personales</span>
                  </button>
                )}
              </div>

              {confirmDeleteOpen && onDeletePersonalData && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 space-y-2.5 text-xs">
                  <p className="font-semibold text-red-900">
                    Para eliminar y anonimizar tus datos personales enviaremos un código OTP a tu correo.
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteOpen(false)}
                      className="px-3 py-1.5 font-medium text-[#475569] bg-white border border-[#E5E9F2] rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={otpBusy}
                      onClick={() => {
                        setOtpBusy(true);
                        setOtpError(null);
                        void (async () => {
                          try {
                            const supabase = supabaseConfigured ? getSupabaseClient() : null;
                            const sessionRes = supabase ? await supabase.auth.getSession() : null;
                            const accessToken = sessionRes?.data.session?.access_token ?? null;
                            const res = await supportAdapter.requestPrivacyOtp({
                              action: 'erase',
                              email: operatorEmail,
                              accessToken,
                            });
                            if (!res.ok || !res.challengeId) {
                              setOtpError(res.error ?? 'No se pudo enviar el código OTP.');
                              return;
                            }
                            setOtpInput('');
                            setConfirmDeleteOpen(false);
                            setOtpChallenge({
                              action: 'erase',
                              challengeId: res.challengeId,
                              maskedEmail: res.maskedEmail ?? '***',
                              devOtpPreview: res.devOtpPreview,
                            });
                          } finally {
                            setOtpBusy(false);
                          }
                        })();
                      }}
                      className="px-3 py-1.5 font-semibold text-white bg-red-700 hover:bg-red-800 disabled:bg-slate-400 rounded-lg"
                    >
                      Enviar código OTP
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {!otpChallenge && otpError && (
            <p role="alert" className="text-xs font-medium text-[#DC2626]">{otpError}</p>
          )}

          {privacyNotice && (
            <p className="text-xs font-medium text-[#059669]">{privacyNotice}</p>
          )}
        </div>
      </div>
    </div>
  );
}
