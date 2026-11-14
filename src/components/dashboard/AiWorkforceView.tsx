import { Bot, ShieldCheck, Sparkles } from 'lucide-react';
import type { AiAgentConfig, Organization } from '../../types/support';

interface AiWorkforceViewProps {
  organization: Organization;
  agents: AiAgentConfig[];
  onToggleAgent: (agentId: string) => void;
  onToggleGovernanceRule: (agentId: string, ruleId: string) => void;
}

export function AiWorkforceView({
  organization,
  agents,
  onToggleAgent,
  onToggleGovernanceRule,
}: AiWorkforceViewProps) {
  const totalCreditsUsed = agents.reduce((acc, a) => acc + a.credits_used, 0);
  const creditsLimit = organization.ai_credits_monthly;
  const remainingCredits = Math.max(0, creditsLimit - totalCreditsUsed);
  const usagePct = Math.min(
    100,
    Math.round((totalCreditsUsed / creditsLimit) * 100)
  );

  return (
    <div data-testid="ai-workforce-view" className="space-y-6">
      {/* AI Credits Meter & Governance Header (Clean Dashboard V1 White Card) */}
      <div className="bg-white border border-[#E5E9F2] rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-7 space-y-2">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#2563EB]">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>AI WORKFORCE 365 · AGENTES DIGITALES</span>
          </p>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">
            Orquestación y gobernanza de agentes IA
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
            Activa cada agente digital según las políticas de {organization.name}{' '}
            y controla sus reglas de priorización y escalamiento humano.
          </p>
        </div>

        <div className="lg:col-span-5 bg-[#F8FAFC] border border-[#E5E9F2] rounded-xl p-5 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium text-[#64748B]">
              Créditos de IA disponibles
            </span>
            <span className="font-mono tabular-nums text-lg font-bold text-[#0F172A]">
              {remainingCredits.toLocaleString('es-ES')}
            </span>
          </div>

          <div className="w-full h-2.5 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2563EB] rounded-full transition-all"
              style={{ width: `${usagePct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[#64748B]">
            <span>Consumidos: {totalCreditsUsed.toLocaleString('es-ES')}</span>
            <span>Cupo mensual: {creditsLimit.toLocaleString('es-ES')}</span>
          </div>
        </div>
      </div>

      {/* 6 Digital Agents Grid matching KPI Card Language */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {agents.map((agent) => (
          <div
            key={agent.id}
            data-testid={`ai-agent-card-${agent.agent_key}`}
            className="bg-white border border-[#E5E9F2] rounded-xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between gap-5"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      agent.is_enabled
                        ? 'bg-[#EFF6FF] text-[#2563EB]'
                        : 'bg-slate-100 text-[#64748B]'
                    }`}
                  >
                    <Bot className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">
                      {agent.agent_name}
                    </h3>
                    <p className="text-[11px] text-[#64748B] font-mono tabular-nums mt-0.5">
                      {agent.credits_used} créditos este mes
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={agent.is_enabled}
                  onClick={() => onToggleAgent(agent.id)}
                  className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-colors whitespace-nowrap shrink-0 ${
                    agent.is_enabled
                      ? 'bg-[#D1FAE5] text-[#059669] hover:bg-emerald-200/70'
                      : 'bg-slate-100 text-[#64748B] hover:bg-slate-200'
                  }`}
                >
                  {agent.is_enabled ? 'Activo' : 'Pausado'}
                </button>
              </div>

              <p className="text-xs text-[#475569] leading-relaxed">
                {agent.role_description}
              </p>
            </div>

            <div className="pt-4 border-t border-[#E5E9F2] space-y-2">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0F172A]">
                <ShieldCheck
                  className="w-3.5 h-3.5 text-[#2563EB]"
                  aria-hidden="true"
                />
                <span>Reglas de gobernanza</span>
              </p>

              {agent.governance_rules.map((rule) => (
                <label
                  key={rule.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E5E9F2] cursor-pointer text-xs text-[#334155]"
                >
                  <span>{rule.label}</span>
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => onToggleGovernanceRule(agent.id, rule.id)}
                    className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] shrink-0"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
