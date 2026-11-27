import { useEffect, useState } from 'react';

interface NavSection {
  id: string;
  label: string;
}

const SECTIONS: NavSection[] = [
  { id: 'hero', label: 'Inicio' },
  { id: 'diagnostico', label: 'Diagnóstico IA' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'faq', label: 'Preguntas Frecuentes' },
];

export function StickySectionNav() {
  const [activeId, setActiveId] = useState<string>('hero');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight * 0.35;
      for (const section of SECTIONS) {
        const el = document.getElementById(section.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveId(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav
      aria-label="Navegación rápida de secciones"
      className="fixed right-6 top-1/2 -translate-y-1/2 z-45 hidden lg:flex flex-col items-center gap-3 bg-white/85 backdrop-blur-md border border-slate-200/80 rounded-full py-4 px-2 shadow-xl shadow-slate-900/8 pointer-events-auto"
    >
      {SECTIONS.map((section) => {
        const isActive = activeId === section.id;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => scrollToSection(section.id)}
            title={section.label}
            aria-label={`Ir a ${section.label}`}
            className={`group relative flex items-center justify-center w-3.5 h-3.5 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
              isActive
                ? 'bg-[#2563EB] scale-125 ring-4 ring-blue-100'
                : 'bg-slate-300 hover:bg-slate-400'
            }`}
          >
            {/* Tooltip on hover */}
            <span className="absolute right-full mr-3 px-2.5 py-1 rounded-lg bg-[#0B1528] text-white text-[11px] font-semibold tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-md pointer-events-none">
              {section.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
