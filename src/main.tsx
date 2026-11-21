import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AppErrorBoundary } from './components/AppErrorBoundary.tsx';
import './index.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );

  const clearBootTimer = (
    window as unknown as { __RS365_CLEAR_BOOT_TIMER__?: () => void }
  ).__RS365_CLEAR_BOOT_TIMER__;
  if (typeof clearBootTimer === 'function') {
    clearBootTimer();
  }
} else {
  console.error('[Remote Support 365] No se encontró el contenedor #root en index.html.');
}
