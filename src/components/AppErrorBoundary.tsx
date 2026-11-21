import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export function clearLocalSupportStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('rs365_')) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors
  }

  try {
    const sessionKeys: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (key && key.startsWith('rs365_')) {
        sessionKeys.push(key);
      }
    }
    for (const key of sessionKeys) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Ignore sessionStorage errors
  }
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || String(error || 'Error inesperado de renderizado.'),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Remote Support 365 ErrorBoundary]', error, info);
  }

  handleResetLocalData = (): void => {
    clearLocalSupportStorage();
    this.setState({ hasError: false, errorMessage: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleGoHome = (): void => {
    clearLocalSupportStorage();
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center p-4">
          <div
            role="alert"
            data-testid="error-boundary-box"
            className="max-w-lg w-full bg-white border border-red-200 rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-4"
          >
            <div className="w-12 h-12 rounded-xl bg-[#0B192C] text-white flex items-center justify-center mx-auto font-bold text-lg">
              RS
            </div>
            <div className="space-y-2">
              <h1 className="text-lg font-bold text-[#0B192C]">
                Error al renderizar la interfaz
              </h1>
              <p className="text-xs text-slate-600 leading-relaxed">
                {import.meta.env.PROD
                  ? 'Ocurrió un inconveniente inesperado al mostrar esta vista. Puedes recargar o restablecer los datos locales para continuar.'
                  : 'La aplicación capturó una excepción en tiempo de ejecución para evitar una pantalla en blanco.'}
              </p>
              {!import.meta.env.PROD && (
                <div className="text-left text-xs font-mono text-red-800 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 break-words">
                  {this.state.errorMessage ?? 'Error desconocido en el cliente.'}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={this.handleResetLocalData}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-colors"
              >
                Restablecer datos locales
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-4 py-2.5 text-xs font-semibold text-[#0B192C] bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Ir al inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
