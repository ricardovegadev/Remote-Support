import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Database,
  Download,
  Globe,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import type {
  AuditLogEntry,
  Organization,
  SupportTicket,
} from '../../types/support';
import { getServiceTierPriceUsd } from '../../utils/ticketLogic';

export function AnalyticsView({ tickets }: { tickets: SupportTicket[] }) {
  const paidRevenue = tickets
    .filter((t) => t.payment_status === 'paid')
    .reduce((sum, t) => sum + getServiceTierPriceUsd(t.service_tier), 0);
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;
  const resolutionRate =
    tickets.length > 0 ? Math.round((resolvedCount / tickets.length) * 100) : 0;

  const categories = Array.from(new Set(tickets.map((t) => t.category)));

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
                .reduce((s, t) => s + getServiceTierPriceUsd(t.service_tier), 0);
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

export function SecurityAuditView({ logs }: { logs: AuditLogEntry[] }) {
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

  return (
    <div data-testid="security-audit-view" className="space-y-6">
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
            despachos atómicos y acciones de agentes IA.
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
  onSaveSettings: (
    patch: Partial<
      Pick<Organization, 'name' | 'rustdesk_relay_domain' | 'payment_gateway'>
    >
  ) => void;
  onOpenSqlModal: () => void;
  onSignOut: () => void;
  onExportOrgData?: () => void;
  onDeletePersonalData?: () => void;
}

export function OrganizationSettingsView({
  organization,
  supabaseConfigured,
  operatorEmail,
  onSaveSettings,
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

  useEffect(() => {
    setOrgName(organization.name);
    setRelayDomain(organization.rustdesk_relay_domain);
    setGateway(organization.payment_gateway);
    setSavedNotice(false);
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

  return (
    <div data-testid="org-settings-view" className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#E5E9F2] rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-5"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#2563EB]">
            CONFIGURACIÓN MULTI-TENANT
          </p>
          <h2 className="text-lg font-bold text-[#0F172A] mt-0.5">
            Parámetros de la organización
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
              Nombre de la Organización
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
                ? 'Supabase PostgreSQL + RLS Multiempresa Activo'
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

      {/* SaaS billing status & data portability */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          <div className="flex flex-wrap items-center gap-2.5">
            {onExportOrgData && (
              <button
                type="button"
                onClick={() => {
                  onExportOrgData();
                  setPrivacyNotice('Datos exportados en formato JSON.');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#0F172A] bg-white hover:bg-[#F8FAFC] border border-[#E5E9F2] rounded-xl transition-colors"
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
                ¿Confirmas eliminar y anonimizar tus datos personales de operador y cerrar
                sesión?
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
                  onClick={() => {
                    onDeletePersonalData();
                    setConfirmDeleteOpen(false);
                  }}
                  className="px-3 py-1.5 font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg"
                >
                  Confirmar eliminación
                </button>
              </div>
            </div>
          )}

          {privacyNotice && (
            <p className="text-xs font-medium text-[#059669]">{privacyNotice}</p>
          )}
        </div>
      </div>
    </div>
  );
}
