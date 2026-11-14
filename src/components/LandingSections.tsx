import { useState } from 'react';
import { ArrowRight, Building2, Check, Layers, Shield, Users } from 'lucide-react';
import type { IssueCategory, ServiceTier } from '../types/support';
import {
  CATEGORY_OPTIONS,
  FIXED_SERVICE_PRICE_USD,
  isValidEmail,
  PYME_PLANS,
  SAAS_PLANS,
  SERVICE_TIER_OPTIONS,
} from '../utils/ticketLogic';

interface LandingSectionsProps {
  onSelectCategoryForWizard: (
    category: IssueCategory,
    serviceTier?: ServiceTier
  ) => void;
  onSubmitEnterpriseLead: (lead: {
    companyName: string;
    contactEmail: string;
    teamSize: string;
    planInterest?: string;
  }) => void;
}

export function LandingSections({
  onSelectCategoryForWizard,
  onSubmitEnterpriseLead,
}: LandingSectionsProps) {
  const [pricingAudience, setPricingAudience] = useState<'clients' | 'saas'>('clients');
  const [companyName, setCompanyName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [teamSize, setTeamSize] = useState('3–10 técnicos internos');
  const [selectedSaasPlan, setSelectedSaasPlan] = useState('Growth Helpdesk ($49/mes)');
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  const handleEnterpriseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (companyName.trim().length < 2) {
      setLeadError('Ingresa el nombre de tu empresa de soporte o departamento TI.');
      return;
    }
    if (!isValidEmail(contactEmail)) {
      setLeadError('Ingresa un correo corporativo válido.');
      return;
    }
    setLeadError(null);
    onSubmitEnterpriseLead({
      companyName: companyName.trim(),
      contactEmail: contactEmail.trim(),
      teamSize,
      planInterest: selectedSaasPlan,
    });
    setLeadSubmitted(true);
    setCompanyName('');
    setContactEmail('');
  };

  return (
    <>
      {/* Cómo funciona */}
      <section
        id="como-funciona"
        className="scroll-mt-20 py-16 bg-white border-b border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-semibold text-[#10B981] tracking-wide">
              Cómo funciona
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B192C] mt-1">
              Protocolo remoto seguro en tres pasos claros
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
              Sin visitas presenciales ni accesos ocultos. Visualizas qué organización y
              qué técnico atiende tu equipo en tiempo real.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-slate-200 pt-8">
            <div className="space-y-2.5">
              <p className="font-mono tabular-nums text-xs font-semibold text-[#2563EB]">
                01. Triaje AI Receptionist
              </p>
              <h3 className="text-lg font-semibold text-[#0B192C]">
                Pre-diagnóstico y Ticket único
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Describe la falla en Windows o Mac, responde 3 preguntas rápidas de IA y
                obtén tu código de sesión (ej. RS-1027) desde ${FIXED_SERVICE_PRICE_USD}{' '}
                USD.
              </p>
            </div>

            <div className="space-y-2.5">
              <p className="font-mono tabular-nums text-xs font-semibold text-[#2563EB]">
                02. Doble Agente RustDesk
              </p>
              <h3 className="text-lg font-semibold text-[#0B192C]">
                Agente temporal o instalado
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Descarga el cliente portable sin instalación para emergencias puntuales o el
                agente fijo desatendido si perteneces a un plan mensual Pyme.
              </p>
            </div>

            <div className="space-y-2.5">
              <p className="font-mono tabular-nums text-xs font-semibold text-[#2563EB]">
                03. Resolución Auditada
              </p>
              <h3 className="text-lg font-semibold text-[#0B192C]">
                Reparación en vivo e informe IA
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Aceptas el consentimiento de acceso, sigues la reparación en vivo por chat y
                recibes el informe técnico generado automáticamente al cierre.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Servicios */}
      <section
        id="servicios"
        className="scroll-mt-20 py-16 bg-[#F8FAFC] border-b border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold text-[#10B981] tracking-wide">
                Servicios Especializados
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B192C] mt-1">
                Cobertura técnica para incidencias críticas diarias
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Haz clic en un servicio para preseleccionarlo en el asistente
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
            {CATEGORY_OPTIONS.map((service, index) => {
              const spanClass = index < 2 ? 'md:col-span-3' : 'md:col-span-2';
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => onSelectCategoryForWizard(service.id)}
                  className={`${spanClass} text-left bg-white border border-slate-200 hover:border-[#2563EB] rounded-xl p-6 transition-colors duration-150 flex flex-col justify-between gap-5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <span className="font-mono tabular-nums text-xs text-slate-500">
                        0{index + 1}. {service.typicalResolutionTime}
                      </span>
                      <ArrowRight
                        className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB] transition-colors"
                        aria-hidden="true"
                      />
                    </div>
                    <h3 className="text-base font-semibold text-[#0B192C]">
                      {service.label}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                      {service.summary}
                    </p>
                  </div>

                  <p className="text-xs text-slate-500 pt-3 border-t border-slate-100">
                    {service.examples.join(' · ')}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Planes: Separación Explícita Clientes Finales vs Empresas de Soporte (SaaS) */}
      <section
        id="planes-empresas"
        className="scroll-mt-20 py-16 bg-white border-b border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold text-[#2563EB] tracking-wide">
                Planes y Arquitectura de Escala
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B192C] mt-1">
                Tarifas claras para clientes finales o plataforma SaaS para tu firma TI
              </h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Opera con asistencia puntual por incidente, cobertura mensual para PyMEs o
                habilita tu propio tenant multiempresa con AI Workforce 365.
              </p>
            </div>

            {/* Segmented Control Switch */}
            <div
              role="tablist"
              aria-label="Seleccionar audiencia de planes"
              className="inline-flex items-center p-1 bg-slate-100 border border-slate-200 rounded-lg self-start lg:self-auto"
            >
              <button
                type="button"
                role="tab"
                aria-selected={pricingAudience === 'clients'}
                onClick={() => setPricingAudience('clients')}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  pricingAudience === 'clients'
                    ? 'bg-[#0B192C] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#0B192C]'
                }`}
              >
                <Users className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Para Clientes Finales</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={pricingAudience === 'saas'}
                onClick={() => setPricingAudience('saas')}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  pricingAudience === 'saas'
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#0B192C]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Para Empresas de Soporte (SaaS)</span>
              </button>
            </div>
          </div>

          {pricingAudience === 'clients' ? (
            <div data-testid="plans-clients-panel" className="space-y-8">
              {/* Row 1: One-Time Tiers ($25 / $40 / $55) */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-4">
                  Asistencia Puntual Bajo Demanda (Pago único por incidente resuelto)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {SERVICE_TIER_OPTIONS.map((tier) => (
                    <div
                      key={tier.id}
                      className="border border-slate-200 rounded-xl p-6 bg-white flex flex-col justify-between gap-5"
                    >
                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          Sesión Única Temporal
                        </p>
                        <h3 className="text-lg font-semibold text-[#0B192C] mt-1">
                          {tier.id.split(' $')[0]}
                        </h3>
                        <p className="font-mono tabular-nums text-2xl font-bold text-[#0B192C] mt-3">
                          ${tier.priceUsd} USD{' '}
                          <span className="text-xs font-sans font-normal text-slate-500">
                            / incidente
                          </span>
                        </p>
                        <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                          {tier.summary}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectCategoryForWizard('Otro', tier.id)}
                        className="w-full px-4 py-2.5 text-xs font-semibold text-[#0B192C] border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        Solicitar {tier.id}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 2: Pyme Monthly Plans ($99 / $199) */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-4">
                  Planes Pyme Mensuales (Acceso desatendido y SLA garantizado)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {PYME_PLANS.map((plan, index) => {
                    const isPrimary = index === 1;
                    return (
                      <div
                        key={plan.id}
                        className={`rounded-xl p-6 flex flex-col justify-between gap-5 border ${
                          isPrimary
                            ? 'bg-[#0B192C] text-white border-[#0B192C]'
                            : 'bg-[#F8FAFC] text-[#0B192C] border-slate-200'
                        }`}
                      >
                        <div>
                          <p
                            className={`text-xs font-medium ${
                              isPrimary ? 'text-[#10B981]' : 'text-[#2563EB]'
                            }`}
                          >
                            {plan.devicesLimit}
                          </p>
                          <h3 className="text-lg font-semibold mt-1">{plan.name}</h3>
                          <p className="font-mono tabular-nums text-2xl font-bold mt-3">
                            ${plan.priceUsd} USD{' '}
                            <span
                              className={`text-xs font-sans font-normal ${
                                isPrimary ? 'text-slate-300' : 'text-slate-500'
                              }`}
                            >
                              / mes
                            </span>
                          </p>
                          <p
                            className={`text-xs mt-2 leading-relaxed ${
                              isPrimary ? 'text-slate-300' : 'text-slate-600'
                            }`}
                          >
                            {plan.summary}
                          </p>
                          <ul
                            className={`mt-4 space-y-2 text-xs ${
                              isPrimary ? 'text-slate-200' : 'text-slate-700'
                            }`}
                          >
                            {plan.features.map((feat) => (
                              <li key={feat} className="flex items-start gap-2">
                                <Check
                                  className="w-4 h-4 text-[#10B981] shrink-0"
                                  aria-hidden="true"
                                />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div
                          className={`pt-3 border-t flex items-center justify-between gap-4 text-xs ${
                            isPrimary
                              ? 'border-slate-700 text-slate-300'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-[#10B981]" aria-hidden="true" />
                            <span>Incluye Agente Host Instalado</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => onSelectCategoryForWizard('Otro', 'Avanzado $55')}
                            className={`px-3.5 py-2 font-semibold rounded-lg transition-colors whitespace-nowrap ${
                              isPrimary
                                ? 'bg-[#10B981] text-white hover:bg-emerald-500'
                                : 'bg-[#0B192C] text-white hover:bg-[#0F172A]'
                            }`}
                          >
                            Activar Plan
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* SaaS Tab: $29 - $79/mes for IT Support Companies + Tenant Request Form */
            <div data-testid="plans-saas-panel" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-5">
                {SAAS_PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className={`rounded-xl p-6 flex flex-col justify-between gap-5 border ${
                      plan.highlighted
                        ? 'bg-[#0B192C] text-white border-[#0B192C]'
                        : 'bg-white text-[#0B192C] border-slate-200'
                    }`}
                  >
                    <div>
                      <p
                        className={`text-xs font-medium ${
                          plan.highlighted ? 'text-[#10B981]' : 'text-[#2563EB]'
                        }`}
                      >
                        {plan.seats}
                      </p>
                      <h3 className="text-lg font-semibold mt-1">{plan.name}</h3>
                      <p className="font-mono tabular-nums text-2xl font-bold mt-3">
                        ${plan.priceUsd} USD{' '}
                        <span
                          className={`text-xs font-sans font-normal ${
                            plan.highlighted ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          / mes
                        </span>
                      </p>
                      <p
                        className={`text-xs mt-2 leading-relaxed ${
                          plan.highlighted ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        {plan.summary}
                      </p>

                      <ul
                        className={`mt-4 space-y-2 text-xs ${
                          plan.highlighted ? 'text-slate-200' : 'text-slate-700'
                        }`}
                      >
                        {plan.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-2">
                            <Check
                              className="w-4 h-4 text-[#10B981] shrink-0"
                              aria-hidden="true"
                            />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSaasPlan(`${plan.name} ($${plan.priceUsd}/mes)`)
                      }
                      className={`w-full px-4 py-2.5 text-xs font-semibold rounded-lg transition-colors ${
                        plan.highlighted
                          ? 'bg-[#2563EB] text-white hover:bg-blue-500'
                          : 'border border-slate-300 text-[#0B192C] hover:bg-slate-50'
                      }`}
                    >
                      Elegir {plan.name}
                    </button>
                  </div>
                ))}
              </div>

              {/* Right: B2B SaaS Tenant Onboarding Form */}
              <div className="lg:col-span-4 bg-[#F8FAFC] border border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-2.5 mb-3">
                  <Building2 className="w-5 h-5 text-[#0B192C]" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-[#0B192C]">
                    Crear Tenant SaaS MSP
                  </h3>
                </div>
                <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                  Habilita tu organización multiempresa con AI Workforce 365, freelancers
                  invitados y relay RustDesk propio.
                </p>

                {leadSubmitted ? (
                  <div
                    data-testid="enterprise-lead-confirmed"
                    className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2"
                  >
                    <p className="text-sm font-semibold text-emerald-800">
                      Solicitud SaaS registrada
                    </p>
                    <p className="text-xs text-emerald-900/80 leading-relaxed">
                      Hemos registrado tu interés para{' '}
                      <strong>{selectedSaasPlan}</strong>. Nuestro equipo aprovisionará tu
                      espacio multi-tenant.
                    </p>
                    <button
                      type="button"
                      onClick={() => setLeadSubmitted(false)}
                      className="text-xs font-semibold text-emerald-800 underline pt-1"
                    >
                      Enviar otra solicitud
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleEnterpriseSubmit} noValidate className="space-y-4">
                    <div>
                      <label
                        htmlFor="b2b-company"
                        className="block text-xs font-semibold text-[#0B192C] mb-1"
                      >
                        Empresa de soporte o MSP
                      </label>
                      <input
                        id="b2b-company"
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Ej. Andes IT Managed Services"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="b2b-email"
                        className="block text-xs font-semibold text-[#0B192C] mb-1"
                      >
                        Correo del administrador
                      </label>
                      <input
                        id="b2b-email"
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="admin@tuempresa-it.com"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="b2b-plan"
                        className="block text-xs font-semibold text-[#0B192C] mb-1"
                      >
                        Plan SaaS seleccionado
                      </label>
                      <select
                        id="b2b-plan"
                        value={selectedSaasPlan}
                        onChange={(e) => setSelectedSaasPlan(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
                      >
                        <option value="Starter MSP ($29/mes)">Starter MSP ($29/mes)</option>
                        <option value="Growth Helpdesk ($49/mes)">
                          Growth Helpdesk ($49/mes)
                        </option>
                        <option value="Scale Marketplace ($79/mes)">
                          Scale Marketplace ($79/mes)
                        </option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="b2b-size"
                        className="block text-xs font-semibold text-[#0B192C] mb-1"
                      >
                        Tamaño del equipo técnico
                      </label>
                      <select
                        id="b2b-size"
                        value={teamSize}
                        onChange={(e) => setTeamSize(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
                      >
                        <option value="1–3 técnicos internos">1–3 técnicos internos</option>
                        <option value="3–10 técnicos internos">3–10 técnicos internos</option>
                        <option value="10+ técnicos + Freelancers">
                          10+ técnicos + Freelancers
                        </option>
                      </select>
                    </div>

                    {leadError && (
                      <p role="alert" className="text-xs font-medium text-red-700">
                        {leadError}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-500 rounded-lg transition-colors"
                    >
                      Solicitar Alta SaaS
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
