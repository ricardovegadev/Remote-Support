import type { CookieConsentPreferences } from '../types/support';

export const COOKIE_CONSENT_STORAGE_KEY = 'rs365_cookie_consent';
export const COOKIE_CONSENT_VERSION = 'v1.0-2026';

export function readCookieConsent(): CookieConsentPreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
      return null;
    }
    const record = parsed as Partial<CookieConsentPreferences>;
    if (typeof record.analytics !== 'boolean') {
      window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
      return null;
    }
    return {
      essential: true,
      analytics: record.analytics,
      marketing: Boolean(record.marketing),
      updatedAt:
        typeof record.updatedAt === 'string' && record.updatedAt
          ? record.updatedAt
          : new Date().toISOString(),
      version:
        typeof record.version === 'string' && record.version
          ? record.version
          : COOKIE_CONSENT_VERSION,
    };
  } catch {
    try {
      window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
    } catch {
      // Ignore storage removal errors
    }
    return null;
  }
}

export const loadCookieConsent = readCookieConsent;

export function saveCookieConsent(
  prefs: Pick<CookieConsentPreferences, 'analytics' | 'marketing'>
): CookieConsentPreferences {
  const next: CookieConsentPreferences = {
    essential: true,
    analytics: prefs.analytics,
    marketing: prefs.marketing,
    updatedAt: new Date().toISOString(),
    version: COOKIE_CONSENT_VERSION,
  };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        COOKIE_CONSENT_STORAGE_KEY,
        JSON.stringify(next)
      );
      window.dispatchEvent(
        new CustomEvent('rs365:cookie-consent-updated', { detail: next })
      );
    } catch {
      // Ignore storage errors
    }
  }
  return next;
}

/**
 * Blocks any non-essential tracker or analytics initialization until explicit consent is granted.
 */
export function hasAnalyticsConsent(): boolean {
  const consent = readCookieConsent();
  return Boolean(consent?.analytics);
}

export function hasMarketingConsent(): boolean {
  const consent = readCookieConsent();
  return Boolean(consent?.marketing);
}
