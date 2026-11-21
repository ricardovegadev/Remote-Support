import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorDetails {
  message: string;
  location?: string;
}

function isIgnorableViteHmrError(message: string, source?: string): boolean {
  const text = `${message} ${source ?? ''}`;
  return /WebSocket closed without opened|failed to connect to websocket|vite-hmr|@vite\/client/i.test(
    text
  );
}

function renderGlobalErrorOverlay(details: ErrorDetails): void {
  if (typeof document === 'undefined' || !document.body) return;

  const existing = document.getElementById('rs365-global-error-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'rs365-global-error-overlay';
  overlay.setAttribute('role', 'alert');
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,0.82);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Inter,system-ui,sans-serif;';

  const card = document.createElement('div');
  card.style.cssText =
    'max-width:560px;width:100%;background:#FFFFFF;border:2px solid #DC2626;border-radius:16px;padding:24px;box-shadow:0 16px 40px rgba(0,0,0,0.28);text-align:left;';

  const title = document.createElement('h1');
  title.textContent = 'Error de ejecución en el cliente';
  title.style.cssText =
    'font-size:18px;font-weight:700;color:#991B1B;margin:0 0 8px 0;';

  const desc = document.createElement('p');
  desc.textContent =
    'Se detectó una excepción en tiempo de ejecución. Detalle técnico:';
  desc.style.cssText = 'font-size:13px;color:#475569;margin:0 0 12px 0;';

  const pre = document.createElement('pre');
  pre.textContent = details.location
    ? `${details.message}\nOrigen: ${details.location}`
    : details.message;
  pre.style.cssText =
    'font-size:12px;color:#7F1D1D;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:10px;padding:12px;white-space:pre-wrap;word-break:break-word;margin:0 0 16px 0;font-family:JetBrains Mono,monospace;';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Restablecer datos locales de Remote Support 365';
  btn.style.cssText =
    'background:#DC2626;color:#FFFFFF;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:600;cursor:pointer;';
  btn.onclick = () => {
    try {
      clearRemoteSupportLocalState();
      // Non-Remote Support session data is preserved.
    } catch {
      // Ignore storage errors
    }
    window.location.reload();
  };

  card.appendChild(title);
  card.appendChild(desc);
  card.appendChild(pre);
  card.appendChild(btn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event: ErrorEvent) => {
    const message = event.message || event.error?.message || 'Error de script';
    const location = event.filename
      ? `${event.filename}:${event.lineno ?? 0}:${event.colno ?? 0}`
      : undefined;
    if (isIgnorableViteHmrError(message, event.filename)) return;
    console.error('[Remote Support 365 Global Error]', message, location, event.error);
    renderGlobalErrorOverlay({ message, location });
  });

  window.addEventListener(
    'unhandledrejection',
    (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
          ? reason
          : 'Promesa rechazada sin manejar';
      if (isIgnorableViteHmrError(message)) return;
      console.error('[Remote Support 365 UnhandledRejection]', reason);
      renderGlobalErrorOverlay({ message });
    }
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

function clearRemoteSupportLocalState(): void {
  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith('rs365_')) window.localStorage.removeItem(key);
  }
  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index);
    if (key?.startsWith('rs365_')) window.sessionStorage.removeItem(key);
  }
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage:
        error?.message || String(error || 'Error inesperado de renderizado.'),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Remote Support 365 ErrorBoundary]', error, info);
  }

  handleClearAndReload = (): void => {
    try {
      clearRemoteSupportLocalState();
      // Non-Remote Support session data is preserved.
    } catch {
      // Ignore storage errors
    }
    this.setState({ hasError: false, errorMessage: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          data-testid="root-error-boundary"
          style={{
            minHeight: '100vh',
            backgroundColor: '#F6F8FB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '540px',
              width: '100%',
              backgroundColor: '#FFFFFF',
              border: '2px solid #DC2626',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)',
              textAlign: 'left',
            }}
          >
            <h1
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#991B1B',
                margin: '0 0 8px 0',
              }}
            >
              Error de renderizado en Remote Support 365
            </h1>
            <p
              style={{
                fontSize: '13px',
                color: '#475569',
                margin: '0 0 12px 0',
              }}
            >
              Se capturó un error al renderizar la interfaz. Limpia la caché local
              para restablecer el estado:
            </p>
            <pre
              style={{
                fontSize: '12px',
                color: '#7F1D1D',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '10px',
                padding: '12px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: '0 0 16px 0',
              }}
            >
              {this.state.errorMessage ?? 'Error desconocido'}
            </pre>
            <button
              type="button"
              onClick={this.handleClearAndReload}
              style={{
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Limpiar caché local y recargar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  renderGlobalErrorOverlay({
    message: 'No se encontró el elemento contenedor #root en index.html.',
    location: 'src/main.tsx',
  });
} else {
  try {
    if (typeof App !== 'function') {
      throw new Error(
        'El módulo ./App.tsx no exportó un componente React válido por defecto.'
      );
    }
    createRoot(rootElement).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
    const clearBootTimer = (
      window as unknown as { __RS365_CLEAR_BOOT_TIMER__?: () => void }
    ).__RS365_CLEAR_BOOT_TIMER__;
    if (typeof clearBootTimer === 'function') {
      clearBootTimer();
    }
  } catch (err) {
    renderGlobalErrorOverlay({
      message:
        err instanceof Error ? err.message : String(err ?? 'Error al montar App'),
      location: 'src/main.tsx',
    });
  }
}
