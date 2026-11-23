import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bot,
  Check,
  ChevronDown,
  Headphones,
  LayoutDashboard,
  LogOut,
  MonitorSmartphone,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldAlert,
  Ticket,
  Users,
  X,
  Zap,
} from 'lucide-react';
import type { DashboardSection, Organization } from '../types/support';
import { getInitials } from '../utils/ticketLogic';

interface DashboardSidebarProps {
  activeSection: DashboardSection;
  onSelectSection: (section: DashboardSection) => void;
  organizations: Organization[];
  activeOrgId: string;
  onSelectOrg: (orgId: string) => void;
  openTicketsCount: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  operatorName?: string;
  operatorRoleLabel?: string;
  onSignOut: () => void;
  onOpenPublicPortal?: () => void;
}

export function DashboardSidebar({
  activeSection,
  onSelectSection,
  organizations,
  activeOrgId,
  onSelectOrg,
  openTicketsCount,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  operatorName = 'Administrador',
  operatorRoleLabel = 'Cuenta de demostración',
  onSignOut,
  onOpenPublicPortal,
}: DashboardSidebarProps) {
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, onCloseMobile]);

  const activeOrg =
    organizations.find((o) => o.id === activeOrgId) ?? organizations[0];

  const navGroups: Array<{
    groupLabel: string;
    items: Array<{
      id: DashboardSection;
      label: string;
      icon: typeof LayoutDashboard;
      badge?: string | number;
      badgeType?: 'count' | 'ai';
    }>;
  }> = [
    {
      groupLabel: 'GENERAL',
      items: [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
        {
          id: 'tickets',
          label: 'Solicitudes y tickets',
          icon: Ticket,
          badge: openTicketsCount,
          badgeType: 'count',
        },
        {
          id: 'devices',
          label: 'Clientes y dispositivos',
          icon: MonitorSmartphone,
        },
        { id: 'sessions', label: 'Sesiones remotas', icon: Activity },
      ],
    },
    {
      groupLabel: 'OPERACIONES',
      items: [
        { id: 'workforce', label: 'Workforce & Dispatch', icon: Users },
        {
          id: 'ai_workforce',
          label: 'AI Workforce',
          icon: Bot,
          badge: 'AI',
          badgeType: 'ai',
        },
        { id: 'analytics', label: 'Informes y analítica', icon: BarChart3 },
      ],
    },
    {
      groupLabel: 'ADMINISTRACIÓN',
      items: [
        { id: 'security', label: 'Seguridad y auditoría', icon: ShieldAlert },
        { id: 'settings', label: 'Configuración', icon: Settings },
      ],
    },
  ];

  const handleNavClick = (section: DashboardSection) => {
    onSelectSection(section);
    onCloseMobile();
  };

  const renderSidebarContent = (isMobile: boolean) => {
    const isCompact = !isMobile && collapsed;

    return (
      <div className="flex flex-col h-full bg-[#0B1528] text-white border-r border-[#16243E] select-none">
        {/* Cabecera */}
        <div
          className={`h-16 px-4 border-b border-[#16243E] flex items-center ${
            isCompact ? 'justify-center' : 'justify-between'
          } gap-2 shrink-0`}
        >
          {!isCompact && (
            <button
              type="button"
              onClick={() => handleNavClick('overview')}
              className="flex items-center gap-3 text-left min-w-0"
            >
              <span
                aria-hidden="true"
                className="w-9 h-9 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
              >
                <Headphones className="w-4 h-4" strokeWidth={2.2} />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block text-[13px] font-bold tracking-[0.04em] text-white truncate">
                  REMOTE SUPPORT
                </span>
                <span className="block text-[10px] font-medium tracking-[0.14em] text-[#94A3B8] truncate mt-0.5">
                  365 · PROFESSIONAL
                </span>
              </span>
            </button>
          )}

          {isMobile ? (
            <button
              type="button"
              aria-label="Cerrar menú lateral"
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#162847] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              aria-label={
                collapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'
              }
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#162847] transition-colors shrink-0"
            >
              {collapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Selector de Espacio de Trabajo */}
        {!isCompact && activeOrg && (
          <div className="px-3.5 pt-4 pb-2 relative">
            <button
              type="button"
              aria-expanded={orgMenuOpen}
              aria-haspopup="listbox"
              onClick={() => setOrgMenuOpen((prev) => !prev)}
              className="w-full rounded-xl bg-[#111E35] hover:bg-[#162847] border border-[#1E2E4A] px-3 py-2.5 flex items-center justify-between gap-2.5 text-left transition-colors"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-[#1B2B48] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {getInitials(activeOrg.name)}
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block text-xs font-semibold text-white truncate">
                    {activeOrg.name}
                  </span>
                  <span className="block text-[11px] text-[#94A3B8] truncate">
                    Espacio de trabajo
                  </span>
                </span>
              </span>
              <ChevronDown
                className={`w-4 h-4 text-[#94A3B8] shrink-0 transition-transform ${
                  orgMenuOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {orgMenuOpen && (
              <div
                role="listbox"
                aria-label="Cambiar espacio de trabajo"
                className="mt-1.5 rounded-xl bg-[#0F1D36] border border-[#1E3256] p-1.5 shadow-xl space-y-0.5 z-30 relative"
              >
                {organizations.map((org) => {
                  const selected = org.id === activeOrg.id;
                  return (
                    <button
                      key={org.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        onSelectOrg(org.id);
                        setOrgMenuOpen(false);
                      }}
                      className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between gap-2 transition-colors ${
                        selected
                          ? 'bg-[#162847] text-white font-semibold'
                          : 'text-[#94A3B8] hover:text-white hover:bg-[#11213D]'
                      }`}
                    >
                      <span className="truncate">{org.name}</span>
                      {selected && (
                        <Check
                          className="w-3.5 h-3.5 text-[#3B82F6] shrink-0"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Navigation Groups */}
        <nav
          aria-label="Navegación del Centro de Operaciones"
          className="flex-1 px-3 py-3 space-y-5 overflow-y-auto scrollbar-transparent"
        >
          {navGroups.map((group) => (
            <div key={group.groupLabel} className="space-y-1">
              {!isCompact && (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#94A3B8]">
                  {group.groupLabel}
                </p>
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    title={isCompact ? item.label : undefined}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center ${
                      isCompact ? 'justify-center px-2' : 'justify-between px-3'
                    } py-2.5 rounded-xl text-[13px] transition-colors border-l-[3px] ${
                      active
                        ? 'bg-[#162C52] border-[#3B82F6] text-white font-semibold shadow-sm'
                        : 'border-transparent text-[#94A3B8] hover:bg-[#11213D] hover:text-white font-medium'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-[#60A5FA]' : 'text-[#94A3B8]'
                        }`}
                        aria-hidden="true"
                      />
                      {!isCompact && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </span>

                    {!isCompact && item.badge !== undefined && (
                      <span
                        className={`font-mono tabular-nums text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          item.badgeType === 'ai'
                            ? 'bg-[#4F46E5]/30 text-[#A5B4FC]'
                            : active
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-[#1B2D4B] text-[#94A3B8]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Pie de Barra Lateral */}
        <div className="p-3.5 border-t border-[#16243E] space-y-3 shrink-0">
          {!isCompact && (
            <div className="rounded-xl bg-[#0F1C33] border border-[#1C2C49] p-3.5 space-y-1.5">
              <Zap className="w-4 h-4 text-[#3B82F6]" aria-hidden="true" />
              <p className="text-xs font-semibold text-white">
                Centro de operaciones
              </p>
              <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                Gestiona soporte, equipos y automatizaciones desde un solo lugar.
              </p>
            </div>
          )}

          {!isCompact && onOpenPublicPortal && (
            <button
              type="button"
              onClick={() => {
                onCloseMobile();
                onOpenPublicPortal();
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#111E35] hover:bg-[#162847] border border-[#1E2E4A] text-xs font-medium text-[#CBD5E1] hover:text-white flex items-center justify-between transition-colors"
            >
              <span>Portal Cliente público</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#60A5FA]" aria-hidden="true" />
            </button>
          )}

          <div
            className={`flex items-center ${
              isCompact ? 'justify-center' : 'justify-between'
            } gap-2 px-1`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-full bg-[#1E2E4A] text-white text-xs font-bold flex items-center justify-center shrink-0">
                {getInitials(operatorName)}
              </span>
              {!isCompact && (
                <div className="min-w-0 leading-tight">
                  <p className="text-xs font-semibold text-white truncate">
                    {operatorName}
                  </p>
                  <p className="text-[11px] text-[#94A3B8] truncate">
                    {operatorRoleLabel}
                  </p>
                </div>
              )}
            </div>

            {!isCompact && (
              <button
                type="button"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                onClick={onSignOut}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#162847] transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Collapsible Sidebar (260px exact width) */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 transition-all duration-200 ${
          collapsed ? 'w-20' : 'w-[260px]'
        }`}
      >
        <div className="sticky top-0 h-screen">
          {renderSidebarContent(false)}
        </div>
      </aside>

      {/* Mobile/Tablet Touch Drawer */}
      {mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menú lateral del Centro de Operaciones"
          className="fixed inset-0 z-50 lg:hidden flex"
        >
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-[#0B1528]/60 backdrop-blur-[1px]"
            aria-hidden="true"
          />
          <div className="relative w-[260px] max-w-[85vw] h-full z-10">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
