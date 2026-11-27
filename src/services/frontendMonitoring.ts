export interface FrontendErrorPayload {
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  error?: string;
  stack?: string;
  url: string;
  timestamp: string;
  portal: 'client_portal' | 'operations_center';
}

export interface FrontendPerformancePayload {
  metricName: string;
  value: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
  navigationType?: string;
  url: string;
  timestamp: string;
  portal: 'client_portal' | 'operations_center';
}

let isMonitoringInitialized = false;
let sentryModulePromise: Promise<typeof import('@sentry/react')> | null = null;

function loadSentryIfConfigured(activeDsn?: string): Promise<typeof import('@sentry/react')> | null {
  if (!activeDsn) return null;
  if (!sentryModulePromise) {
    sentryModulePromise = import('@sentry/react');
  }
  return sentryModulePromise;
}

export function initFrontendMonitoring(dsn?: string) {
  if (isMonitoringInitialized) return;
  isMonitoringInitialized = true;

  const activeDsn = dsn || import.meta.env.VITE_SENTRY_DSN;

  const sentryPromise = loadSentryIfConfigured(activeDsn);
  if (sentryPromise && activeDsn) {
    void sentryPromise
      .then((Sentry) => {
        Sentry.init({
          dsn: activeDsn,
          integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration({
              maskAllText: false,
              blockAllMedia: false,
            }),
          ],
          tracesSampleRate: 1.0,
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
          environment: import.meta.env.MODE || 'production',
        });
      })
      .catch((err) => {
        console.warn('[Monitoring] Sentry initialization fallback:', err);
      });
  }

  // Determine current portal context based on pathname
  const getPortalContext = (): 'client_portal' | 'operations_center' => {
    return window.location.pathname.startsWith('/dashboard') ||
      window.location.pathname.startsWith('/portal') ||
      window.location.pathname.includes('tech')
      ? 'operations_center'
      : 'client_portal';
  };

  // Global Error Listener
  window.addEventListener('error', (event) => {
    try {
      const payload: FrontendErrorPayload = {
        message: event.message || 'Uncaught Frontend Error',
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.toString(),
        stack: event.error?.stack,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        portal: getPortalContext(),
      };

      const pendingSentry = loadSentryIfConfigured(activeDsn);
      if (pendingSentry) {
        void pendingSentry.then((Sentry) => {
          Sentry.captureException(event.error || new Error(event.message));
        });
      }

      void sendErrorToBehaviorEndpoint(payload);
    } catch {
      // Prevent recursive error loops
    }
  });

  // Global Unhandled Promise Rejection Listener
  window.addEventListener('unhandledrejection', (event) => {
    try {
      const reason = event.reason;
      const message =
        reason instanceof Error ? reason.message : String(reason || 'Unhandled Promise Rejection');
      const stack = reason instanceof Error ? reason.stack : undefined;

      const payload: FrontendErrorPayload = {
        message,
        error: String(reason),
        stack,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        portal: getPortalContext(),
      };

      const pendingSentry = loadSentryIfConfigured(activeDsn);
      if (pendingSentry) {
        void pendingSentry.then((Sentry) => {
          Sentry.captureException(reason instanceof Error ? reason : new Error(message));
        });
      }

      void sendErrorToBehaviorEndpoint(payload);
    } catch {
      // Prevent recursive loops
    }
  });

  // Observe Core Web Vitals & Load Metrics silently in the background
  if (typeof PerformanceObserver !== 'undefined') {
    try {
      // Paint Timing / LCP
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime?: number };
        if (lastEntry?.startTime) {
          sendPerformanceMetric({
            metricName: 'LCP',
            value: Math.round(lastEntry.startTime),
            rating: lastEntry.startTime < 2500 ? 'good' : lastEntry.startTime < 4000 ? 'needs-improvement' : 'poor',
            url: window.location.href,
            timestamp: new Date().toISOString(),
            portal: getPortalContext(),
          });
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      // Observer not supported or buffered error
    }

    try {
      // Cumulative Layout Shift (CLS)
      let clsScore = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries() as Array<PerformanceEntry & { value?: number; hadRecentInput?: boolean }>) {
          if (!entry.hadRecentInput && typeof entry.value === 'number') {
            clsScore += entry.value;
          }
        }
        sendPerformanceMetric({
          metricName: 'CLS',
          value: Number(clsScore.toFixed(4)),
          rating: clsScore < 0.1 ? 'good' : clsScore < 0.25 ? 'needs-improvement' : 'poor',
          url: window.location.href,
          timestamp: new Date().toISOString(),
          portal: getPortalContext(),
        });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch {
      // CLS observer not supported
    }

    try {
      // Navigation Timing
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navEntry) {
            const loadTime = Math.round(navEntry.loadEventEnd - navEntry.startTime);
            const ttfb = Math.round(navEntry.responseStart - navEntry.requestStart);
            if (loadTime > 0) {
              sendPerformanceMetric({
                metricName: 'PageLoad',
                value: loadTime,
                rating: loadTime < 3000 ? 'good' : loadTime < 6000 ? 'needs-improvement' : 'poor',
                navigationType: navEntry.type,
                url: window.location.href,
                timestamp: new Date().toISOString(),
                portal: getPortalContext(),
              });
            }
            if (ttfb > 0) {
              sendPerformanceMetric({
                metricName: 'TTFB',
                value: ttfb,
                rating: ttfb < 800 ? 'good' : ttfb < 1800 ? 'needs-improvement' : 'poor',
                url: window.location.href,
                timestamp: new Date().toISOString(),
                portal: getPortalContext(),
              });
            }
          }
        }, 500);
      });
    } catch {
      // Navigation timing error
    }
  }
}

export function captureFrontendError(error: Error | string, context?: Record<string, unknown>) {
  try {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    const portal = window.location.pathname.startsWith('/dashboard') ? 'operations_center' : 'client_portal';

    const pendingSentry = loadSentryIfConfigured(import.meta.env.VITE_SENTRY_DSN);
    if (pendingSentry) {
      void pendingSentry
        .then((Sentry) => {
          Sentry.withScope((scope) => {
            if (context) scope.setContext('details', context);
            Sentry.captureException(errorObj);
          });
        })
        .catch(() => {
          // Silent fail if monitoring SDK fails to load
        });
    }

    const payload: FrontendErrorPayload = {
      message: errorObj.message,
      error: errorObj.toString(),
      stack: errorObj.stack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      portal,
    };

    void sendErrorToBehaviorEndpoint(payload);
  } catch {
    // Fail safe
  }
}

async function sendErrorToBehaviorEndpoint(payload: FrontendErrorPayload) {
  try {
    await fetch('/api/monitoring/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silent fail in offline or network drop
  }
}

async function sendPerformanceMetric(payload: FrontendPerformancePayload) {
  try {
    await fetch('/api/monitoring/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silent fail in offline or network drop
  }
}
