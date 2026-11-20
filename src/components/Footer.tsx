import { ShieldCheck } from 'lucide-react';
import type { LegalDocTab } from './LegalDocsModal';
import { ScrollReveal } from './ScrollReveal';

interface FooterProps {
  onNavigateSection: (sectionId: string) => void;
  onOpenLegalDoc: (tab: LegalDocTab) => void;
  onOpenCookieSettings: () => void;
}

export function Footer({
  onNavigateSection,
  onOpenLegalDoc,
  onOpenCookieSettings,
}: FooterProps) {
  return (
    <footer className="bg-[#0B1528] text-slate-300 border-t border-slate-800/90">
      <ScrollReveal className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-sm font-bold text-white">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" aria-hidden="true" />
              <span>Remote Support 365</span>
            </div>
            <p className="text-xs text-slate-300">
              Asistencia técnica remota bajo demanda · Solo mayores de 18 años (+18) ·
              Conexiones cifradas supervisadas
            </p>
          </div>

          <nav
            aria-label="Enlaces del pie de página"
            className="flex flex-wrap items-center gap-5 text-xs"
          >
            <a
              href="#como-funciona"
              onClick={(e) => {
                e.preventDefault();
                onNavigateSection('como-funciona');
              }}
              className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded px-1 py-0.5"
            >
              Cómo funciona
            </a>
            <a
              href="#servicios"
              onClick={(e) => {
                e.preventDefault();
                onNavigateSection('servicios');
              }}
              className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded px-1 py-0.5"
            >
              Servicios
            </a>
            <a
              href="#planes-empresas"
              onClick={(e) => {
                e.preventDefault();
                onNavigateSection('planes-empresas');
              }}
              className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded px-1 py-0.5"
            >
              Planes Empresas
            </a>
          </nav>
        </div>

        {/* Legal & Compliance Strip */}
        <div className="pt-5 border-t border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
          <div
            aria-label="Documentación legal y privacidad"
            className="flex flex-wrap items-center gap-x-5 gap-y-2"
          >
            <button
              type="button"
              onClick={() => onOpenLegalDoc('privacy')}
              className="text-slate-300 hover:text-white underline-offset-4 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
            >
              Política de Privacidad
            </button>
            <button
              type="button"
              onClick={() => onOpenLegalDoc('terms')}
              className="text-slate-300 hover:text-white underline-offset-4 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
            >
              Términos y Condiciones
            </button>
            <button
              type="button"
              onClick={() => onOpenLegalDoc('refunds')}
              className="text-slate-300 hover:text-white underline-offset-4 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
            >
              Reembolsos y Cancelación
            </button>
            <button
              type="button"
              onClick={() => onOpenLegalDoc('contact')}
              className="text-slate-300 hover:text-white underline-offset-4 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
            >
              Contacto y DMCA
            </button>
            <button
              type="button"
              onClick={onOpenCookieSettings}
              className="text-emerald-400 hover:text-emerald-300 font-medium underline-offset-4 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
            >
              Preferencias de cookies
            </button>
          </div>

          <p className="text-slate-400 shrink-0">
            © 2026 Remote Support 365 · v1.0-2026
          </p>
        </div>
      </ScrollReveal>
    </footer>
  );
}
