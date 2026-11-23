import { useEffect, useState } from 'react';
import { Menu, ShieldCheck, Ticket, UserCircle2, X } from 'lucide-react';
import { FEATURE_FLAGS } from '../config/features';
import type { AppView, UserAccountProfile } from '../types/support';

interface HeaderProps {
  activeView: AppView;
  currentUser: UserAccountProfile | null;
  onNavigateSection: (sectionId: string) => void;
  onOpenTechPortal: () => void;
  onOpenAuthModal: () => void;
  onOpenTicketLookup?: () => void;
  onOpenTechnicianApply?: () => void;
  onReturnHome: () => void;
}

const NAV_ITEMS = [
  { id: 'diagnostico', label: 'Diagnóstico' },
  { id: 'como-funciona', label: 'Cómo funciona' },
  { id: 'servicios', label: 'Servicios' },
  {
    id: 'planes-empresas',
    label: FEATURE_FLAGS.ENABLE_SAAS_MULTITENANT
      ? 'Planes y SaaS'
      : 'Planes y Tarifas',
  },
];

export function Header({
  activeView,
  currentUser,
  onNavigateSection,
  onOpenTechPortal,
  onOpenAuthModal,
  onOpenTicketLookup,
  onOpenTechnicianApply,
  onReturnHome,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const handleNavClick = (sectionId: string) => {
    setMobileMenuOpen(false);
    onNavigateSection(sectionId);
  };

  const userShortLabel = currentUser
    ? String(currentUser.full_name ?? '').trim().split(/\s+/)[0] || 'Mi Cuenta'
    : 'Acceder';

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_12px_rgba(11,21,40,0.04)]">
      <div className="max-w-7xl 2xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-6 xl:px-8 h-16 flex items-center justify-between gap-3 lg:gap-4">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#inicio"
          onClick={(e) => {
            e.preventDefault();
            setMobileMenuOpen(false);
            onReturnHome();
          }}
          className="inline-flex items-center gap-2 text-base xl:text-lg font-bold tracking-tight text-[#0B1528] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-md py-1 group"
        >
          <span
            aria-hidden="true"
            className="w-8 h-8 rounded-lg bg-[#0B1528] text-[#10B981] flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 ease-out-expo group-hover:scale-105"
          >
            <ShieldCheck className="w-4 h-4" strokeWidth={2.2} />
          </span>
          <span>Remote Support 365</span>
        </a>

        {/* Zone 2: Clean single-line navigation links with animated underline */}
        <nav
          aria-label="Navegación principal"
          className="hidden lg:flex items-center gap-3 xl:gap-5 text-[13px] xl:text-sm font-medium text-slate-700"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(item.id);
              }}
              className="relative py-1 whitespace-nowrap shrink-0 text-slate-700 hover:text-[#0B1528] transition-colors duration-200 ease-out-expo after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 hover:after:scale-x-100 after:bg-[#2563EB] after:rounded-full after:transition-transform after:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
            >
              {item.label}
            </a>
          ))}
          {FEATURE_FLAGS.ENABLE_TECHNICIAN_RECRUITMENT && onOpenTechnicianApply && (
            <a
              href="/postular"
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                onOpenTechnicianApply();
              }}
              data-testid="header-tech-apply-link"
              aria-current={activeView === 'technician_apply' ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                activeView === 'technician_apply'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200/90 hover:bg-emerald-100'
              }`}
            >
              <span>Sé Técnico</span>
            </a>
          )}
        </nav>

        {/* Zone 3: Account access + Primary Diagnostic CTA + Secondary Tech Portal + Mobile Menu Button */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenTicketLookup && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenTicketLookup();
              }}
              data-testid="header-ticket-lookup-button"
              className="hidden md:inline-flex lg:hidden xl:inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-[#0B1528] hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              <Ticket className="w-3.5 h-3.5 text-[#10B981]" aria-hidden="true" />
              <span>Mi ticket</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenTechPortal();
            }}
            className="hidden 2xl:inline-flex items-center justify-center px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-[#0B1528] hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            Centro de Operaciones
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenAuthModal();
            }}
            data-testid="header-auth-button"
            className="hidden sm:inline-flex items-center justify-center gap-1.5 px-2.5 xl:px-3 py-2 text-xs font-semibold text-[#0B1528] bg-white hover:bg-slate-50 border border-slate-300/90 hover:border-slate-400 rounded-lg shadow-xs active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            <UserCircle2 className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
            <span>{userShortLabel}</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('diagnostico')}
            data-testid="header-start-diagnostic"
            className="hidden sm:inline-flex items-center justify-center px-3 xl:px-4 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-xs active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
          >
            Iniciar diagnóstico
          </button>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md px-4 py-4 space-y-3 animate-fade-up">
          <nav aria-label="Navegación móvil" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.id);
                }}
                className="px-3 py-2.5 text-sm font-medium text-slate-700 hover:text-[#0B1528] hover:bg-slate-50 rounded-lg transition-colors"
              >
                {item.label}
              </a>
            ))}
            {FEATURE_FLAGS.ENABLE_TECHNICIAN_RECRUITMENT && onOpenTechnicianApply && (
              <a
                href="/postular"
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  onOpenTechnicianApply();
                }}
                data-testid="mobile-tech-apply-link"
                className="px-3 py-2.5 text-sm font-semibold text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200/80 rounded-lg transition-colors"
              >
                Sé Técnico (Gana 65% – 85%)
              </a>
            )}
          </nav>
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <button
              type="button"
              onClick={() => handleNavClick('diagnostico')}
              className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors"
            >
              Iniciar diagnóstico gratuito
            </button>
            {onOpenTicketLookup && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenTicketLookup();
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#0B1528] bg-emerald-50/70 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-colors"
              >
                <Ticket className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                <span>Retomar mi ticket (RS-XXXX)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuthModal();
              }}
              className="w-full px-4 py-2.5 text-sm font-semibold text-[#0B1528] bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors"
            >
              {currentUser ? `Cuenta (${userShortLabel})` : 'Acceder / Registrarse (+18)'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenTechPortal();
              }}
              className="w-full px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-[#0B1528] bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Centro de Operaciones (Técnicos)
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
