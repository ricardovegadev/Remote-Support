import { Award, DollarSign, TrendingUp } from 'lucide-react';
import {
  computeNetCommissionBreakdown,
  getConfiguredCommissionTier,
  getConfiguredTierPriceUsd,
} from '../../config/businessConfig';
import { useBusinessConfig } from '../../hooks/useBusinessConfig';
import type { SupportTicket } from '../../types/support';
import { getServiceTierPriceUsd } from '../../utils/ticketLogic';
import { TechnicianEarningsCalculator } from '../TechnicianEarningsCalculator';

interface TechnicianEarningsCardProps {
  tickets: SupportTicket[];
  technicianName?: string;
}

export function TechnicianEarningsCard({
  tickets,
  technicianName = 'Especialista',
}: TechnicianEarningsCardProps) {
  const businessConfig = useBusinessConfig();
  const resolvedPaidTickets = tickets.filter(
    (t) => t.status === 'resolved' && t.payment_status === 'paid'
  );
  const resolvedCount = resolvedPaidTickets.length;
  const tier = getConfiguredCommissionTier(resolvedCount, businessConfig);

  const nextTier = businessConfig.commissionTiers.find(
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

  const totals = resolvedPaidTickets.reduce(
    (acc, ticket) => {
      const price =
        getConfiguredTierPriceUsd(
          ticket.service_tier,
          ticket.billing_mode,
          businessConfig
        ) ?? getServiceTierPriceUsd(ticket.service_tier);
      const item = computeNetCommissionBreakdown({
        grossUsd: price,
        commissionPercent: tier.commissionPercent,
        feeConfig: businessConfig.feeConfig,
      });
      return {
        grossUsd: acc.grossUsd + item.grossUsd,
        deductionsUsd:
          acc.deductionsUsd + item.paymentFeeUsd + item.operationalCostUsd,
        netDistributableUsd: acc.netDistributableUsd + item.netDistributableUsd,
        technicianPayoutUsd: acc.technicianPayoutUsd + item.technicianPayoutUsd,
      };
    },
    {
      grossUsd: 0,
      deductionsUsd: 0,
      netDistributableUsd: 0,
      technicianPayoutUsd: 0,
    }
  );

  const minCommissionPct =
    businessConfig.commissionTiers[0]?.commissionPercent ?? 65;
  const maxCommissionPct =
    businessConfig.commissionTiers[businessConfig.commissionTiers.length - 1]
      ?.commissionPercent ?? 85;

  return (
    <div
      data-testid="technician-earnings-card"
      className="bg-white border border-[#E5E9F2] rounded-xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#059669]">
              Escala de Comisiones {minCommissionPct}% – {maxCommissionPct}% sobre neto
            </p>
            <h3 className="text-base font-bold text-[#0F172A]">
              Mis Ganancias y Nivel · {technicianName}
            </h3>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-xs font-bold text-[#1D4ED8] self-start sm:self-auto">
          <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
          {tier.label} · {tier.commissionPercent}%
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-[#F8FAFC] border border-[#E5E9F2] p-3.5">
          <p className="text-[11px] font-medium text-[#64748B]">
            Casos resueltos y liquidados
          </p>
          <p className="font-display tabular-nums text-xl font-bold text-[#0F172A] mt-1">
            {resolvedCount}
          </p>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            Rango actual: {tier.rangeLabel}
          </p>
        </div>

        <div className="rounded-xl bg-[#F8FAFC] border border-[#E5E9F2] p-3.5">
          <p className="text-[11px] font-medium text-[#64748B]">
            Ganancia neta estimada ({tier.commissionPercent}% del neto)
          </p>
          <p className="font-display tabular-nums text-xl font-bold text-[#059669] mt-1 inline-flex items-center gap-1">
            <DollarSign className="w-4 h-4" aria-hidden="true" />
            {totals.technicianPayoutUsd.toFixed(2)} USD
          </p>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            Bruto ${totals.grossUsd.toFixed(2)} − pasarela/operativo $
            {totals.deductionsUsd.toFixed(2)} = neto $
            {totals.netDistributableUsd.toFixed(2)} USD
          </p>
        </div>

        <div className="rounded-xl bg-[#F8FAFC] border border-[#E5E9F2] p-3.5 flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-medium text-[#64748B]">
              {nextTier
                ? `Próximo nivel: ${nextTier.label} (${nextTier.commissionPercent}%)`
                : `Nivel máximo alcanzado (${maxCommissionPct}%)`}
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

      <TechnicianEarningsCalculator
        defaultCommissionPercent={tier.commissionPercent}
        variant="dashboard"
      />
    </div>
  );
}
