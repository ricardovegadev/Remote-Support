import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Cookie, Settings2, ShieldCheck, X } from 'lucide-react';
import type { CookieConsentPreferences } from '../types/support';
import {
  readCookieConsent,
  saveCookieConsent,
} from '../utils/cookieConsent';

interface CookieConsentBannerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPrivacyPolicy: () => void;
}

export function CookieConsentBanner({
  isOpen,
  onClose,
  onOpenPrivacyPolicy,
}: CookieConsentBannerProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCollapsed(false);
    const saved = readCookieConsent();
    if (saved) {
      setAnalyticsEnabled(saved.analytics);
      setMarketingEnabled(saved.marketing);
    } else {
      setAnalyticsEnabled(false);
      setMarketingEnabled(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showConfig) {
        setShowConfig(false);
      } else if (readCookieConsent()) {
        onClose();
      } else {
        setCollapsed(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, showConfig, onClose]);

  if (!isOpen) return null;

  const handleAcceptAll = () => {
    saveCookieConsent({ analytics: true, marketing: true });
    setShowConfig(false);
    setCollapsed(false);
    onClose();
  };

  const handleEssentialOnly = () => {
    saveCookieConsent({ analytics: false, marketing: false });
    setShowConfig(false);
    setCollapsed(false);
    onClose();
  };

  const handleSaveCustom = () => {
    saveCookieConsent({
      analytics: analyticsEnabled,
      marketing: marketingEnabled,
    });
    setShowConfig(false);
    setCollapsed(false);
    onClose();
  };

  const savedExisting: CookieConsentPreferences | null = readCookieConsent();

  if (collapsed) {
    return (
      <div
        role="region"
        aria-label="Aviso de cookies contraído"
        data-testid="cookie-consent-banner"
        className="fixed bottom-3 left-3 z-50"
      >
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-expanded="false"
          className="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/95 backdrop-blur-md border border-slate-300 shadow-lg text-xs font-semibold text-[#0B192C] hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
        >
          <Cookie className="w-4 h-4 text-[#0B192C]" aria-hidden="true" />
          <span>Cookies</span>
          <ChevronUp className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <aside
      role="region"
      aria-label="Aviso y preferencias de cookies"
      data-testid="cookie-consent-banner"
      className="fixed bottom-3 left-3 right-3 z-50 max-w-3xl mx-auto bg-white/95 backdrop-blur-md border border-slate-300 rounded-xl shadow-xl px-3.5 sm:px-4 py-3 text-slate-800"
    >
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-start sm:items-center justify-between gap-2.5 min-w-0">
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-[#0B192C] text-[#10B981] flex items-center justify-center shrink-0">
                <Cookie className="w-4 h-4" aria-hidden="true" />
              </span>
              <p className="text-xs text-slate-700 leading-snug">
                <strong className="text-[#0B192C]">Cookies esenciales activas</strong> para tu sesión{' '}
                <span className="font-mono text-[11px]">/sesion/RS-XXXX</span>. Sin rastreo sin tu permiso.{' '}
                <button
                  type="button"
                  onClick={onOpenPrivacyPolicy}
                  className="font-semibold text-[#2563EB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
                >
                  Privacidad
                </button>
                .
              </p>
            </div>

            <div className="sm:hidden shrink-0 -mt-1 -mr-1">
              {savedExisting ? (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar preferencias de cookies"
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-slate-500 hover:text-[#0B192C] hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  aria-label="Contraer aviso de cookies"
                  title="Contraer aviso"
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-slate-500 hover:text-[#0B192C] hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-1.5 w-full sm:w-auto sm:shrink-0">
            <button
              type="button"
              onClick={() => setShowConfig((prev) => !prev)}
              aria-expanded={showConfig}
              className="min-h-[44px] sm:min-h-[36px] inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors whitespace-nowrap"
            >
              <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{showConfig ? 'Ocultar' : 'Configurar'}</span>
            </button>

            <button
              type="button"
              onClick={handleEssentialOnly}
              className="min-h-[44px] sm:min-h-[36px] px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-[#0B192C] bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors whitespace-nowrap"
            >
              Solo esenciales
            </button>

            <button
              type="button"
              onClick={handleAcceptAll}
              className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 text-xs font-semibold text-white bg-[#0B192C] hover:bg-[#0F172A] rounded-lg transition-colors whitespace-nowrap"
            >
              Aceptar
            </button>

            <div className="hidden sm:block">
              {savedExisting ? (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar preferencias de cookies"
                  className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-slate-500 hover:text-[#0B192C] hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  aria-label="Contraer aviso de cookies"
                  title="Contraer aviso"
                  className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-slate-500 hover:text-[#0B192C] hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>

        {showConfig && (
          <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between gap-4 text-xs">
              <div>
                <p className="font-semibold text-[#0B192C]">
                  Cookies esenciales (siempre activas)
                </p>
                <p className="text-slate-600">
                  Seguridad de sesión, autenticación y persistencia local del ticket.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                Activas
              </span>
            </div>

            <div className="flex items-start justify-between gap-4 pt-2 border-t border-slate-200 text-xs">
              <label htmlFor="cookie-analytics-optin" className="cursor-pointer">
                <span className="block font-semibold text-[#0B192C]">
                  Analítica técnica de rendimiento
                </span>
                <span className="block text-slate-600">
                  Mide tiempos de carga y estabilidad sin identificar datos personales.
                </span>
              </label>
              <input
                id="cookie-analytics-optin"
                type="checkbox"
                checked={analyticsEnabled}
                onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
              />
            </div>

            <div className="flex items-start justify-between gap-4 pt-2 border-t border-slate-200 text-xs">
              <label htmlFor="cookie-marketing-optin" className="cursor-pointer">
                <span className="block font-semibold text-[#0B192C]">
                  Preferencias y atribución de campañas
                </span>
                <span className="block text-slate-600">
                  Recuerda códigos de invitación y descuentos aplicados en el portal.
                </span>
              </label>
              <input
                id="cookie-marketing-optin"
                type="checkbox"
                checked={marketingEnabled}
                onChange={(e) => setMarketingEnabled(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
              />
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={handleSaveCustom}
                className="min-h-[44px] sm:min-h-[36px] px-4 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors"
              >
                Guardar preferencias
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
