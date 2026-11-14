import { useState } from 'react';
import { ArrowRight, Lock, MonitorCheck } from 'lucide-react';
import heroImg from '../assets/images/hero_remote_support_1794568609518.jpg';

interface HeroSectionProps {
  onStartDiagnostic: () => void;
}

export function HeroSection({ onStartDiagnostic }: HeroSectionProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <section
      id="inicio"
      className="scroll-mt-20 bg-[#0B192C] text-white border-b border-slate-800"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left Column: Focal proposition & single primary CTA */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-xs font-medium tracking-wide text-[#10B981] mb-3">
              Asistencia IT Remota Bajo Demanda · Windows y macOS · Plataforma Multiempresa
            </p>

            <h1
              className="font-bold tracking-tight text-white leading-[1.12] max-w-2xl"
              style={{
                fontSize: 'clamp(2.15rem, 3.6vw, 3.25rem)',
                textWrap: 'balance',
              }}
            >
              Soporte Técnico IT Remoto en Minutos, con Trazabilidad y Control Total
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
              Resolvemos fallas de impresoras, Microsoft 365, lentitud del sistema y redes
              Wi-Fi mediante diagnóstico guiado por AI Receptionist y conexión segura con
              técnicos verificados.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
              <button
                type="button"
                onClick={onStartDiagnostic}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-500 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B192C]"
              >
                <span>Resolver mi Problema Ahora</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Lock className="w-4 h-4 text-[#10B981] shrink-0" aria-hidden="true" />
                <span>Sesión cifrada con código único de 9 dígitos</span>
              </div>
            </div>
          </div>

          {/* Right Column: High-res 16:9 Engineer Workstation Asset */}
          <div className="lg:col-span-6 flex items-stretch">
            <div className="w-full rounded-xl overflow-hidden border border-slate-700/80 bg-[#0F172A] min-h-[260px] lg:min-h-[360px]">
              {!imageFailed ? (
                <img
                  src={heroImg}
                  alt="Especialista de soporte técnico IT remoto monitoreando arquitectura de red en estación de trabajo"
                  referrerPolicy="no-referrer"
                  onError={() => setImageFailed(true)}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="w-full h-full min-h-[280px] bg-gradient-to-br from-[#0F172A] to-[#0B192C] flex flex-col items-center justify-center p-8 text-center">
                  <MonitorCheck
                    className="w-12 h-12 text-[#10B981] mb-3"
                    aria-hidden="true"
                  />
                  <p className="text-sm font-semibold text-white">
                    Centro de Operaciones Remotas · Remote Support 365
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Enlace cifrado extremo a extremo con agente temporal o desatendido.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Operational Strip below Hero Split */}
        <div className="mt-10 pt-8 border-t border-slate-800 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="font-mono tabular-nums text-xl font-semibold text-white">
              &lt; 5 min
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Tiempo promedio hasta enlace remoto
            </p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-xl font-semibold text-[#10B981]">
              Desde $25 USD
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Tarifa transparente por incidente o plan Pyme
            </p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-xl font-semibold text-white">
              Doble Agente
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Temporal sin instalación o Host Pyme
            </p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-xl font-semibold text-white">
              AI + Red Global
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Pre-diagnóstico IA y despacho atómico
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
