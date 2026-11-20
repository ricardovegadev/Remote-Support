import { useEffect, useState } from 'react';
import { Cookie, Settings2, ShieldCheck, X } from 'lucide-react';
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
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
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
    if (!isOpen || !showConfig) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowConfig(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, showConfig]);

  if (!isOpen) return null;

  const handleAcceptAll = () => {
    saveCookieConsent({ analytics: true, marketing: true });
    setShowConfig(false);
    onClose();
  };

  const handleEssentialOnly = () => {
    saveCookieConsent({ analytics: false, marketing: false });
    setShowConfig(false);
    onClose();
  };

  const handleSaveCustom = () => {
    saveCookieConsent({
      analytics: analyticsEnabled,
      marketing: marketingEnabled,
    });
    setShowConfig(false);
    onClose();
  };

  const savedExisting: CookieConsentPreferences | null = readCookieConsent();

  return (
    <aside
      role="region"
      aria-label="Aviso y preferencias de cookies"
      data-testid="cookie-consent-banner"
      className="fixed bottom-4 left-4 right-4 z-50 max-w-4xl mx-auto bg-white border border-slate-300 rounded-xl shadow-2xl p-5 sm:p-6 text-slate-800"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-lg bg-[#0B192C] text-[#10B981] flex items-center justify-center shrink-0 mt-0.5">
              <Cookie className="w-4 h-4" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-bold text-[#0B192C]">
                Privacidad y control de cookies (sin rastreo previo al consentimiento)
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Usamos cookies estrictamente esenciales para tu sala cifrada{' '}
                <span className="font-mono">/sesion/RS-XXXX</span>. Ningún tracker de
                analítica ni marketing se activa hasta que elijas aceptarlo. Consulta la{' '}
                <button
                  type="button"
                  onClick={onOpenPrivacyPolicy}
                  className="font-semibold text-[#2563EB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
                >
                  Política de Privacidad
                </button>
                .
              </p>
            </div>
          </div>

          {savedExisting && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar preferencias de cookies"
              className="p-1 text-slate-500 hover:text-[#0B192C] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {showConfig && (
          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-slate-200 space-y-3">
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

            <label className="flex items-start justify-between gap-4 pt-2 border-t border-slate-200 text-xs cursor-pointer">
              <div>
                <p className="font-semibold text-[#0B192C]">
                  Analítica técnica de rendimiento
                </p>
                <p className="text-slate-600">
                  Mide tiempos de carga y estabilidad sin identificar datos personales.
                </p>
              </div>
              <input
                type="checkbox"
                checked={analyticsEnabled}
                onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
              />
            </label>

            <label className="flex items-start justify-between gap-4 pt-2 border-t border-slate-200 text-xs cursor-pointer">
              <div>
                <p className="font-semibold text-[#0B192C]">
                  Preferencias y atribución de campañas
                </p>
                <p className="text-slate-600">
                  Recuerda códigos de invitación y descuentos aplicados en el portal.
                </p>
              </div>
              <input
                type="checkbox"
                checked={marketingEnabled}
                onChange={(e) => setMarketingEnabled(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
              />
            </label>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          {showConfig ? (
            <button
              type="button"
              onClick={handleSaveCustom}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              Guardar preferencias
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfig(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Configurar cookies</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleEssentialOnly}
            className="px-4 py-2 text-xs font-semibold text-[#0B192C] bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            Solo esenciales
          </button>

          <button
            type="button"
            onClick={handleAcceptAll}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#0B192C] hover:bg-[#0F172A] rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            Aceptar todas
          </button>
        </div>
      </div>
    </aside>
  );
}
