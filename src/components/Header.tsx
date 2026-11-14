import { useState } from 'react';
import { Menu, ShieldCheck, X } from 'lucide-react';
import type { AppView } from '../types/support';

interface HeaderProps {
  activeView: AppView;
  onNavigateSection: (sectionId: string) => void;
  onOpenTechPortal: () => void;
  onReturnHome: () => void;
}

const NAV_ITEMS = [
  { id: 'diagnostico', label: 'Diagnóstico' },
  { id: 'como-funciona', label: 'Cómo funciona' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'planes-empresas', label: 'Planes y SaaS' },
];

export function Header({
  activeView,
  onNavigateSection,
  onOpenTechPortal,
  onReturnHome,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (sectionId: string) => {
    setMobileMenuOpen(false);
    onNavigateSection(sectionId);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#inicio"
          onClick={(e) => {
            e.preventDefault();
            setMobileMenuOpen(false);
            onReturnHome();
          }}
          className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#0B192C] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-md py-1"
        >
          <span
            aria-hidden="true"
            className="w-8 h-8 rounded-lg bg-[#0B192C] text-[#10B981] flex items-center justify-center shrink-0"
          >
            <ShieldCheck className="w-4 h-4" strokeWidth={2.2} />
          </span>
          <span>Remote Support 365</span>
        </a>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Navegación principal"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(item.id);
              }}
              className="hover:text-[#0B192C] underline-offset-4 hover:underline transition-colors duration-150 whitespace-nowrap shrink-0 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Single primary header action + mobile menu button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenTechPortal();
            }}
            className={`hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 ${
              activeView === 'tech_portal'
                ? 'bg-[#10B981] text-white'
                : 'bg-[#0B192C] text-white hover:bg-[#0F172A]'
            }`}
          >
            Centro de Operaciones
          </button>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
          <nav aria-label="Navegación móvil" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.id);
                }}
                className="px-3 py-2.5 text-sm font-medium text-slate-700 hover:text-[#0B192C] hover:bg-slate-50 rounded-lg transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenTechPortal();
              }}
              className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-[#0B192C] hover:bg-[#0F172A] rounded-lg transition-colors"
            >
              Centro de Operaciones
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
