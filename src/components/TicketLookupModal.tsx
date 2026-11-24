import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Search, Ticket, X } from 'lucide-react';
import type { SupportTicket } from '../types/support';
import { getTicketStatusLabel } from '../utils/ticketLogic';

interface TicketLookupModalProps {
  isOpen: boolean;
  recentTickets: SupportTicket[];
  onClose: () => void;
  onSelectTicketCode: (ticketCode: string) => void;
}

const TICKET_CODE_REGEX = /^RS-[A-F0-9]{4,}$/i;

export function TicketLookupModal({
  isOpen,
  recentTickets,
  onClose,
  onSelectTicketCode,
}: TicketLookupModalProps) {
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = codeInput.trim().toUpperCase();
    const normalized = /^[A-F0-9]{4,}$/i.test(trimmed) ? `RS-${trimmed}` : trimmed;
    if (!TICKET_CODE_REGEX.test(normalized)) {
      setError('Ingresa un código válido con formato RS-A3F9 (o los caracteres de tu ticket).');
      return;
    }
    setError(null);
    setCodeInput('');
    onSelectTicketCode(normalized);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-lookup-title"
      data-testid="ticket-lookup-modal"
      className="fixed inset-0 z-50 bg-[#0B192C]/65 backdrop-blur-[1px] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-fade-up">
        <div className="px-5 py-4 bg-[#0B192C] text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-white/10 text-[#10B981] flex items-center justify-center shrink-0">
              <Ticket className="w-4 h-4" aria-hidden="true" />
            </span>
            <div>
              <h2 id="ticket-lookup-title" className="text-sm font-bold">
                Retomar mi ticket de soporte
              </h2>
              <p className="text-[11px] text-slate-300">
                Vuelve a tu Sala de Conexión segura con tu código RS-XXXX
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar buscador de ticket"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <div>
              <label
                htmlFor="resume-ticket-code-input"
                className="block text-xs font-semibold text-[#0B192C] mb-1.5"
              >
                Código de ticket
              </label>
              <div className="relative">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  ref={inputRef}
                  id="resume-ticket-code-input"
                  data-testid="resume-ticket-code-input"
                  type="text"
                  autoComplete="off"
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(e.target.value.toUpperCase());
                    if (error) setError(null);
                  }}
                  placeholder="Ej. RS-4821"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 font-mono text-base sm:text-sm text-[#0B192C] placeholder:font-sans placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              {error && (
                <p role="alert" className="text-xs text-red-600 mt-1.5">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold shadow-sm shadow-blue-600/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2563EB]"
            >
              <span>Abrir mi Sala Segura</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>

          {recentTickets.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Tus solicitudes recientes en este navegador
              </p>
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {recentTickets.slice(0, 3).map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => onSelectTicketCode(ticket.ticket_code)}
                    className="w-full rounded-xl border border-slate-200 hover:border-[#2563EB] bg-slate-50/70 hover:bg-blue-50/40 px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#0B192C] group-hover:text-[#2563EB]">
                          {ticket.ticket_code}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                          {getTicketStatusLabel(ticket.status)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 truncate mt-0.5">
                        {ticket.category} · {ticket.os_type}
                      </p>
                    </div>
                    <ArrowRight
                      className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB] shrink-0"
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
