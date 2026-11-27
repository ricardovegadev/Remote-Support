import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { computeNetCommissionBreakdown } from '../config/businessConfig';
import { useBusinessConfig } from '../hooks/useBusinessConfig';

interface TechnicianEarningsCalculatorProps {
  defaultCommissionPercent?: number;
  variant?: 'public' | 'dashboard';
}

interface CalcServiceOption {
  id: string;
  label: string;
  priceUsd: number;
  suffix: string;
}

export function TechnicianEarningsCalculator({
  defaultCommissionPercent,
  variant = 'public',
}: TechnicianEarningsCalculatorProps) {
  const config = useBusinessConfig();

  const serviceOptions = useMemo<CalcServiceOption[]>(() => {
    const oneTime = config.serviceTiers.map((tier) => ({
      id: tier.id,
      label: tier.id.split(' $')[0],
      priceUsd: tier.priceUsd,
      suffix: 'incidente',
    }));
    const pyme = config.pymePlans.map((plan) => ({
      id: plan.serviceTier,
      label: plan.name,
      priceUsd: plan.priceUsd,
      suffix: 'mes',
    }));
    return [...oneTime, ...pyme];
  }, [config.serviceTiers, config.pymePlans]);

  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    () => serviceOptions[1]?.id ?? serviceOptions[0]?.id ?? 'Optimización $29'
  );
  const [selectedCommissionPct, setSelectedCommissionPct] = useState<number>(
    () =>
      defaultCommissionPercent ??
      config.commissionTiers[0]?.commissionPercent ??
      65
  );
  const [monthlyTickets, setMonthlyTickets] = useState<number>(20);

  const activeService =
    serviceOptions.find((item) => item.id === selectedServiceId) ??
    serviceOptions[0];

  const activeTier =
    config.commissionTiers.find(
      (tier) => tier.commissionPercent === selectedCommissionPct
    ) ?? config.commissionTiers[0];

  const breakdown = useMemo(
    () =>
      computeNetCommissionBreakdown({
        grossUsd: activeService?.priceUsd ?? 29,
        commissionPercent: activeTier?.commissionPercent ?? 65,
        feeConfig: config.feeConfig,
      }),
    [activeService?.priceUsd, activeTier?.commissionPercent, config.feeConfig]
  );

  const safeMonthlyCount = Number.isFinite(monthlyTickets)
    ? Math.max(1, Math.min(500, Math.floor(monthlyTickets)))
    : 1;
  const monthlyNetUsd = Number(
    (breakdown.technicianPayoutUsd * safeMonthlyCount).toFixed(2)
  );

  return (
    <div
      data-testid="technician-earnings-calculator"
      className={`rounded-2xl border p-5 sm:p-6 space-y-5 ${
        variant === 'dashboard'
          ? 'bg-[#F8FAFC] border-[#E5E9F2]'
          : 'bg-[#F8FAFC] border-slate-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-blue-200 text-[#1D4ED8] flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold text-[#1D4ED8]">
              Simulador de ganancia neta por ticket
            </p>
            <h3 className="text-base font-bold text-[#0B192C]">
              Calculadora de comisión sobre neto
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Calculado sobre el ingreso neto tras descontar pasarela de pagos (
              <span className="tabular-nums font-medium">
                {config.feeConfig.paymentFeePercent}% + $
                {config.feeConfig.paymentFeeFixedUsd.toFixed(2)}
              </span>
              ) y costo operativo por ticket (
              <span className="tabular-nums font-medium">
                ${config.feeConfig.operationalCostUsd.toFixed(2)} USD
              </span>
              ).
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 space-y-4">
          {/* Ticket tier selector */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#0B192C]">
              1. Tipo de ticket o plan atendido
            </span>
            <div
              role="radiogroup"
              aria-label="Tipo de ticket para simular ganancia"
              className="grid grid-cols-2 sm:grid-cols-3 gap-2"
            >
              {serviceOptions.map((option) => {
                const selected = activeService?.id === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-testid={`calc-tier-${option.id}`}
                    onClick={() => setSelectedServiceId(option.id)}
                    className={`min-h-[44px] rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                      selected
                        ? 'border-[#2563EB] bg-blue-50 text-[#0B192C] ring-1 ring-[#2563EB]'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-xs font-semibold truncate">
                      {option.label}
                    </span>
                    <span className="block tabular-nums text-xs font-bold text-[#1D4ED8]">
                      ${option.priceUsd} USD
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Commission level selector */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#0B192C]">
              2. Tu nivel mensual de comisión
            </span>
            <div
              role="radiogroup"
              aria-label="Nivel de comisión del técnico"
              className="grid grid-cols-2 sm:grid-cols-4 gap-2"
            >
              {config.commissionTiers.map((tier) => {
                const selected = activeTier?.id === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-testid={`calc-level-${tier.id}`}
                    onClick={() =>
                      setSelectedCommissionPct(tier.commissionPercent)
                    }
                    className={`min-h-[44px] rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                      selected
                        ? 'border-[#0B192C] bg-[#0B192C] text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-[11px] font-semibold truncate">
                      {tier.label}
                    </span>
                    <span className="block tabular-nums text-sm font-bold">
                      {tier.commissionPercent}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monthly volume estimator */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
            <div>
              <label
                htmlFor="calc-monthly-tickets"
                className="block text-xs font-semibold text-[#0B192C]"
              >
                3. Volumen mensual simulado (tickets)
              </label>
              <p className="text-[11px] text-slate-600">
                Ajusta para proyectar tu ingreso mensual estimado.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="calc-monthly-tickets"
                data-testid="calc-monthly-tickets-input"
                type="number"
                min={1}
                max={500}
                value={safeMonthlyCount}
                onChange={(e) => {
                  const parsed = Number(e.target.value);
                  setMonthlyTickets(Number.isFinite(parsed) ? parsed : 1);
                }}
                className="w-24 min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm tabular-nums font-bold text-[#0B192C] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <span className="text-xs text-slate-600">tickets/mes</span>
            </div>
          </div>
        </div>

        {/* Breakdown summary card */}
        <div className="lg:col-span-5 rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-[#0B192C]">
              Desglose por ticket
            </span>
            <span className="text-xs font-semibold text-slate-600">
              {activeService?.label}
            </span>
          </div>

          <dl className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-600">Tarifa cobrada al cliente</dt>
              <dd
                data-testid="calc-gross-usd"
                className="tabular-nums font-semibold text-[#0B192C]"
              >
                ${breakdown.grossUsd.toFixed(2)} USD
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-600">
                − Comisión pasarela ({config.feeConfig.paymentFeePercent}% + $
                {config.feeConfig.paymentFeeFixedUsd.toFixed(2)})
              </dt>
              <dd
                data-testid="calc-payment-fee-usd"
                className="tabular-nums text-slate-700"
              >
                -${breakdown.paymentFeeUsd.toFixed(2)} USD
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-600">
                − Costo operativo por ticket
              </dt>
              <dd
                data-testid="calc-op-cost-usd"
                className="tabular-nums text-slate-700"
              >
                -${breakdown.operationalCostUsd.toFixed(2)} USD
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 font-semibold">
              <dt className="text-[#0B192C]">= Base neta distribuible</dt>
              <dd
                data-testid="calc-net-base-usd"
                className="tabular-nums text-[#0B192C]"
              >
                ${breakdown.netDistributableUsd.toFixed(2)} USD
              </dd>
            </div>

            <div className="flex items-center justify-between gap-2 text-emerald-800">
              <dt className="font-semibold">
                × Participación {activeTier?.label} ({breakdown.commissionPercent}
                %)
              </dt>
              <dd className="tabular-nums font-semibold">
                {breakdown.commissionPercent}%
              </dd>
            </div>
          </dl>

          <div className="rounded-xl bg-[#ECFDF5] border border-emerald-200 p-3.5 space-y-1">
            <p className="text-[11px] font-semibold text-emerald-900">
              Tu ganancia neta estimada por ticket
            </p>
            <p
              data-testid="calc-tech-payout-usd"
              className="font-display tabular-nums text-2xl font-extrabold text-emerald-800"
            >
              ${breakdown.technicianPayoutUsd.toFixed(2)} USD
            </p>
            <p className="text-[11px] text-emerald-900">
              Proyección con{' '}
              <span className="tabular-nums font-semibold">{safeMonthlyCount}</span>{' '}
              tickets:{' '}
              <strong
                data-testid="calc-monthly-payout-usd"
                className="tabular-nums"
              >
                ${monthlyNetUsd.toFixed(2)} USD/mes
              </strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
