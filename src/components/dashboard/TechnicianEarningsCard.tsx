import { Award, DollarSign, TrendingUp } from 'lucide-react';
import type { SupportTicket } from '../../types/support';
import {
  getServiceTierPriceUsd,
  getTechnicianCommissionTier,
  TECHNICIAN_COMMISSION_TIERS,
} from '../../utils/ticketLogic';

interface TechnicianEarningsCardProps {
  tickets: SupportTicket[];
  technicianName?: string;
}

export function TechnicianEarningsCard({
  tickets,
  technicianName = 'Especialista',
}: TechnicianEarningsCardProps) {
  const resolvedPaidTickets = tickets.filter(
    (t) => t.status === 'resolved' && t.payment_status === 'paid'
  );
  const resolvedCount = resolvedPaidTickets.length;
  const tier = getTechnicianCommissionTier(resolvedCount);

  const nextTier = TECHNICIAN_COMMISSION_TIERS.find(
    (t) => t.minIncidents > resolvedCount
  );
  const progressPct = nextTier
    ? Math.min(
        100,
        Math.round(
          ((resolvedCount - tier.minIncidents) /
            Math.max(1, nextTier.minIncidents - tier.minIncidents)) *
            100
        )
      )
    : 100;

  const grossUsd = resolvedPaidTickets.reduce(
    (sum, t) => sum + getServiceTierPriceUsd(t.service_tier),
    0
  );
  const technicianPayoutUsd = Math.round(
    (grossUsd * tier.commissionPercent) / 100
  );

  return (
    <div
      data-testid="technician-earnings-card"
      className="bg-white border border-[#E5E9F2] rounded-xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#059669]">
              Escala de Comisiones 65% – 85%
            </p>
            <h3 className="text-base font-bold text-[#0F172A]">
              Mis Ganancias y Nivel · {technicianName}
            </h3>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-xs font-bold text-[#1D4ED8] self-start sm:self-auto">
          <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
          Nivel {tier.label} · {tier.commissionPercent}%
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-[#F8FAFC] border border-[#E5E9F2] p-3.5">
          <p className="text-[11px] font-medium text-[#64748B]">
            Casos resueltos y liquidados
          </p>
          <p className="font-mono tabular-nums text-xl font-bold text-[#0F172A] mt-1">
            {resolvedCount}
          </p>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            Rango actual: {tier.rangeLabel}
          </p>
        </div>

        <div className="rounded-xl bg-[#F8FAFC] border border-[#E5E9F2] p-3.5">
          <p className="text-[11px] font-medium text-[#64748B]">
            Comisión neta estimada ({tier.commissionPercent}%)
          </p>
          <p className="font-mono tabular-nums text-xl font-bold text-[#059669] mt-1 inline-flex items-center gap-1">
            <DollarSign className="w-4 h-4" aria-hidden="true" />
            {technicianPayoutUsd} USD
          </p>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            Sobre ${grossUsd} USD facturados
          </p>
        </div>

        <div className="rounded-xl bg-[#F8FAFC] border border-[#E5E9F2] p-3.5 flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-medium text-[#64748B]">
              {nextTier
                ? `Próximo nivel: ${nextTier.label} (${nextTier.commissionPercent}%)`
                : 'Nivel máximo alcanzado (85%)'}
            </p>
            <p className="text-[11px] font-semibold text-[#0F172A] mt-1">
              {nextTier
                ? `Faltan ${Math.max(0, nextTier.minIncidents - resolvedCount)} incidentes`
                : 'Comisión máxima Élite activa'}
            </p>
          </div>
          <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-[#10B981] rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
