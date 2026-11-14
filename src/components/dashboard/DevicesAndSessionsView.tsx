import { useState } from 'react';
import {
  Activity,
  ExternalLink,
  Laptop,
  MonitorSmartphone,
  Search,
} from 'lucide-react';
import type { ClientDevice, RemoteSessionRecord } from '../../types/support';
import {
  buildRustDeskDeepLink,
  formatRustDeskId,
  getInitials,
} from '../../utils/ticketLogic';

interface DevicesViewProps {
  devices: ClientDevice[];
}

export function DevicesDirectoryView({ devices }: DevicesViewProps) {
  const [search, setSearch] = useState('');

  const filtered = devices.filter((dev) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      dev.client_name.toLowerCase().includes(q) ||
      dev.device_name.toLowerCase().includes(q) ||
      dev.rustdesk_id.includes(q)
    );
  });

  return (
    <div data-testid="devices-directory-view" className="space-y-6">
      <div className="bg-white border border-[#E5E9F2] rounded-xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#2563EB]">
            INVENTARIO DE AGENTES
          </p>
          <h2 className="text-lg font-bold text-[#0F172A] mt-0.5">
            Clientes y dispositivos registrados
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Diferencia equipos con Agente Instalado desatendido (PyME) y sesiones
            con Agente Temporal.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar equipo, empresa o ID..."
            className="w-full rounded-full border border-[#E5E9F2] bg-[#F8FAFC] pl-10 pr-4 py-2 text-xs text-[#0F172A] focus:bg-white focus:border-[#2563EB] focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((dev) => {
          const deepLink = buildRustDeskDeepLink(dev.rustdesk_id);
          return (
            <div
              key={dev.id}
              className="bg-white border border-[#E5E9F2] rounded-xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#2563EB] text-xs font-bold flex items-center justify-center shrink-0">
                      {getInitials(dev.client_name)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-bold text-[#0F172A] truncate flex items-center gap-1.5">
                        <Laptop
                          className="w-3.5 h-3.5 text-[#2563EB] shrink-0"
                          aria-hidden="true"
                        />
                        <span className="truncate">{dev.device_name}</span>
                      </p>
                      <p className="text-[11px] text-[#64748B] truncate">
                        {dev.os_type} · {dev.plan_name}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                      dev.is_online
                        ? 'bg-[#D1FAE5] text-[#059669]'
                        : 'bg-slate-100 text-[#64748B]'
                    }`}
                  >
                    {dev.is_online ? 'En línea' : 'Desconectado'}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">
                    {dev.client_name}
                  </p>
                  <p className="text-xs text-[#64748B]">{dev.client_email}</p>
                </div>

                <div>
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      dev.agent_type === 'installed'
                        ? 'bg-[#DBEAFE] text-[#1D4ED8]'
                        : 'bg-[#E0F2FE] text-[#0284C7]'
                    }`}
                  >
                    {dev.agent_type === 'installed'
                      ? 'Agente Instalado (Desatendido)'
                      : 'Agente Temporal'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E9F2] flex items-center justify-between gap-3">
                <span className="font-mono tabular-nums text-xs font-semibold text-[#0F172A]">
                  {formatRustDeskId(dev.rustdesk_id)}
                </span>
                {deepLink && (
                  <a
                    href={deepLink}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors whitespace-nowrap"
                  >
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Conectar</span>
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white border border-[#E5E9F2] rounded-xl p-10 text-center space-y-2 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <MonitorSmartphone
            className="w-8 h-8 text-[#94A3B8] mx-auto"
            aria-hidden="true"
          />
          <p className="text-sm font-semibold text-[#0F172A]">
            Sin dispositivos encontrados
          </p>
          <p className="text-xs text-[#64748B]">
            Ajusta tu búsqueda o instala el agente Host en el equipo del cliente.
          </p>
        </div>
      )}
    </div>
  );
}

interface SessionsViewProps {
  sessions: RemoteSessionRecord[];
}

export function RemoteSessionsView({ sessions }: SessionsViewProps) {
  const activeCount = sessions.filter((s) => s.status === 'active').length;

  return (
    <div data-testid="remote-sessions-view" className="space-y-6">
      <div className="bg-white border border-[#E5E9F2] rounded-xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#2563EB]">
            TELEMETRÍA RUSTDESK
          </p>
          <h2 className="text-lg font-bold text-[#0F172A] mt-0.5">
            Monitor de sesiones remotas
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Trazabilidad de túneles activos, técnico conectado, tipo de agente y
            duración total.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#D1FAE5] text-[#059669] self-start sm:self-auto">
          <Activity className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="font-mono tabular-nums">
            {activeCount} {activeCount === 1 ? 'sesión activa' : 'sesiones activas'}
          </span>
        </span>
      </div>

      {/* Mobile Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
        {sessions.map((ses) => (
          <div
            key={ses.id}
            className="bg-white border border-[#E5E9F2] rounded-xl p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-2 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono tabular-nums font-bold text-[#0F172A]">
                {ses.ticket_code}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                  ses.status === 'active'
                    ? 'bg-[#D1FAE5] text-[#059669]'
                    : 'bg-slate-100 text-[#64748B]'
                }`}
              >
                {ses.status === 'active' ? 'Activa ahora' : 'Finalizada'}
              </span>
            </div>
            <p className="text-sm font-semibold text-[#0F172A]">
              {ses.client_name}
            </p>
            <p className="text-[#64748B]">Técnico: {ses.technician_name}</p>
            <p className="font-mono tabular-nums text-[#64748B]">
              RustDesk {formatRustDeskId(ses.rustdesk_id)} ·{' '}
              {ses.duration_minutes} min
            </p>
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white border border-[#E5E9F2] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.03)] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E5E9F2] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              <th className="py-3 px-4">Ticket</th>
              <th className="py-3 px-4">Cliente</th>
              <th className="py-3 px-4">Técnico</th>
              <th className="py-3 px-4">RustDesk ID</th>
              <th className="py-3 px-4">Agente</th>
              <th className="py-3 px-4">Duración</th>
              <th className="py-3 px-4">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E9F2] text-xs">
            {sessions.map((ses) => (
              <tr key={ses.id} className="hover:bg-[#F8FAFC] transition-colors">
                <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-[#0F172A]">
                  {ses.ticket_code}
                </td>
                <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                  {ses.client_name}
                </td>
                <td className="py-3.5 px-4 text-[#475569]">
                  {ses.technician_name}
                </td>
                <td className="py-3.5 px-4 font-mono tabular-nums text-[#475569]">
                  {formatRustDeskId(ses.rustdesk_id)}
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      ses.agent_type === 'installed'
                        ? 'bg-[#DBEAFE] text-[#1D4ED8]'
                        : 'bg-[#E0F2FE] text-[#0284C7]'
                    }`}
                  >
                    {ses.agent_type === 'installed'
                      ? 'Agente Instalado'
                      : 'Agente Temporal'}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono tabular-nums text-[#475569]">
                  {ses.duration_minutes} min
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      ses.status === 'active'
                        ? 'bg-[#D1FAE5] text-[#059669]'
                        : 'bg-slate-100 text-[#64748B]'
                    }`}
                  >
                    {ses.status === 'active' ? 'Activa ahora' : 'Finalizada'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
