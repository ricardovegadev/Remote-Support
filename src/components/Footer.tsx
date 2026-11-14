import { ShieldCheck } from 'lucide-react';

interface FooterProps {
  onNavigateSection: (sectionId: string) => void;
}

export function Footer({ onNavigateSection }: FooterProps) {
  return (
    <footer className="bg-[#061224] text-slate-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-sm font-bold text-white">
            <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span>Remote Support 365</span>
          </div>
          <p className="text-xs text-slate-400">
            Asistencia técnica remota bajo demanda · Conexiones cifradas de un solo uso
          </p>
        </div>

        <nav
          aria-label="Enlaces del pie de página"
          className="flex flex-wrap items-center gap-6 text-xs"
        >
          <a
            href="#como-funciona"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('como-funciona');
            }}
            className="hover:text-white transition-colors"
          >
            Cómo funciona
          </a>
          <a
            href="#servicios"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('servicios');
            }}
            className="hover:text-white transition-colors"
          >
            Servicios
          </a>
          <a
            href="#planes-empresas"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('planes-empresas');
            }}
            className="hover:text-white transition-colors"
          >
            Planes Empresas
          </a>
          <span className="text-slate-600">·</span>
          <span>© 2026 Remote Support 365</span>
        </nav>
      </div>
    </footer>
  );
}
