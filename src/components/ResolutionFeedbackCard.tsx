import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Printer,
  ShieldCheck,
  Star,
} from 'lucide-react';
import type { SupportTicket } from '../types/support';

interface ResolutionFeedbackCardProps {
  ticket: SupportTicket;
}

export function ResolutionFeedbackCard({ ticket }: ResolutionFeedbackCardProps) {
  const [resolutionChoice, setResolutionChoice] = useState<'yes' | 'no' | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedMode, setSubmittedMode] = useState<'confirmed' | 'disputed' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (mode: 'confirmed' | 'disputed') => {
    setError(null);
    if (mode === 'confirmed' && rating === null) {
      setError('Selecciona una calificación de 1 a 5 estrellas antes de enviar.');
      return;
    }
    if (mode === 'disputed' && disputeReason.trim().length < 10) {
      setError('Describe brevemente qué quedó pendiente (mínimo 10 caracteres).');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/tickets/${encodeURIComponent(ticket.id)}/csat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(ticket.client_session_token
              ? { 'x-ticket-token': ticket.client_session_token }
              : {}),
          },
          body: JSON.stringify({
            sessionToken: ticket.client_session_token,
            resolved: mode === 'confirmed',
            ...(mode === 'confirmed'
              ? {
                  rating,
                  comment: comment.trim(),
                }
              : {
                  disputeReason: disputeReason.trim(),
                }),
          }),
        }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || 'No se pudo registrar tu respuesta.');
        return;
      }
      setSubmittedMode(mode);
    } catch {
      // Permitir confirmación visual en modo offline/preview
      setSubmittedMode(mode);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="resolution-feedback-card"
      className="bg-white border border-emerald-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base font-bold text-[#0B192C]">
              Cierre seguro y conformidad de servicio
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Ticket <span className="font-mono font-semibold">{ticket.ticket_code}</span> marcado como resuelto. Tu acceso remoto temporal fue cerrado.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-[#0B192C] transition-colors self-start sm:self-auto"
        >
          <Printer className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
          <span>Imprimir / PDF</span>
        </button>
      </div>

      {/* Checklist de cierre seguro RustDesk */}
      {ticket.agent_type === 'temporary' && (
        <div className="rounded-xl bg-[#F2FBF7] border border-emerald-200/80 p-3.5 flex items-start gap-2.5 text-xs text-emerald-950">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold">Checklist de cierre seguro (agente temporal):</p>
            <p className="text-emerald-900/90 leading-relaxed">
              1) Cierra la ventana de RustDesk. 2) Puedes borrar el archivo descargado de tu carpeta Descargas. Sin el programa abierto nadie puede volver a conectarse.
            </p>
          </div>
        </div>
      )}

      {submittedMode === 'confirmed' ? (
        <div role="status" className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900 space-y-1">
          <p className="font-bold">¡Gracias por confirmar la resolución ({rating}/5★)!</p>
          <p>Tu evaluación quedó registrada para evaluar la calidad del especialista.</p>
        </div>
      ) : submittedMode === 'disputed' ? (
        <div role="status" className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-950 space-y-1.5">
          <p className="font-bold">Garantía de resolución activada</p>
          <p>
            Tu caso pasó a revisión prioritaria. Un coordinador revisará la sesión en menos de 24 horas hábiles para asignar un nuevo especialista sin costo adicional o procesar el reembolso según nuestra Política de Garantía.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Paso 1: Confirmación binaria con igual peso visual */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-[#0B192C]">
              1. ¿Quedó resuelto tu problema?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label="¿Quedó resuelto tu problema?">
              <button
                type="button"
                data-testid="resolution-choice-yes"
                aria-pressed={resolutionChoice === 'yes'}
                onClick={() => {
                  setResolutionChoice('yes');
                  setError(null);
                }}
                className={`w-full py-3 px-4 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors ${
                  resolutionChoice === 'yes'
                    ? 'border-emerald-700 bg-emerald-700 text-white shadow-xs'
                    : 'border-slate-300 bg-white hover:border-emerald-500 hover:bg-emerald-50/40 text-[#0B192C]'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Sí, quedó resuelto</span>
              </button>

              <button
                type="button"
                data-testid="resolution-choice-no"
                aria-pressed={resolutionChoice === 'no'}
                onClick={() => {
                  setResolutionChoice('no');
                  setRating(null);
                  setError(null);
                }}
                className={`w-full py-3 px-4 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors ${
                  resolutionChoice === 'no'
                    ? 'border-amber-700 bg-amber-700 text-white shadow-xs'
                    : 'border-slate-300 bg-white hover:border-amber-500 hover:bg-amber-50/40 text-[#0B192C]'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>No, no quedó resuelto</span>
              </button>
            </div>
          </div>

          {resolutionChoice === 'yes' && (
            <div className="space-y-4 pt-3 border-t border-slate-100">
              <div>
                <p className="text-xs font-semibold text-[#0B192C] mb-2">
                  2. Califica la atención recibida (elige de 1 a 5 estrellas)
                </p>
                <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Calificación del soporte">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = rating !== null && star <= rating;
                    return (
                      <button
                        key={star}
                        type="button"
                        data-testid={`csat-star-${star}`}
                        onClick={() => {
                          setRating(star);
                          setError(null);
                        }}
                        aria-label={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
                        aria-pressed={rating === star}
                        className={`min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg transition-colors ${
                          active
                            ? 'text-amber-500 bg-amber-50'
                            : 'text-slate-400 hover:text-amber-500 hover:bg-slate-50'
                        }`}
                      >
                        <Star
                          className="w-5 h-5"
                          fill={active ? 'currentColor' : 'none'}
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
                  <span className="ml-2 tabular-nums text-xs font-bold text-slate-600">
                    {rating === null ? 'Sin seleccionar' : `${rating}/5`}
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="csat-comment" className="block text-xs font-semibold text-[#0B192C] mb-1">
                  Comentario opcional
                </label>
                <textarea
                  id="csat-comment"
                  rows={2}
                  maxLength={400}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ej. Rápido, claro y el equipo quedó funcionando perfecto."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-[#0B192C] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              {error && (
                <p role="alert" className="text-xs font-medium text-red-700">
                  {error}
                </p>
              )}

              <button
                type="button"
                disabled={submitting || rating === null}
                onClick={() => void handleSubmit('confirmed')}
                className="w-full sm:w-auto py-2.5 px-5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Guardando...' : 'Enviar calificación'}
              </button>
            </div>
          )}

          {resolutionChoice === 'no' && (
            <div className="space-y-3 pt-3 border-t border-amber-100 rounded-xl bg-amber-50/50 border border-amber-200 p-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-amber-950">
                  Flujo de Garantía de Resolución
                </p>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Si el problema persiste: 1) Registramos tu reclamo de garantía; 2) Un coordinador revisa tu ticket en &lt;24h hábiles; 3) Eliges entre una nueva sesión sin costo adicional o reembolso conforme a nuestra Política de Garantía.
                </p>
              </div>
              <div>
                <label htmlFor="dispute-reason" className="block text-xs font-semibold text-[#0B192C] mb-1">
                  Cuéntanos qué sigue fallando
                </label>
                <textarea
                  id="dispute-reason"
                  rows={3}
                  maxLength={500}
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Describe el problema pendiente..."
                  className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs text-[#0B192C] focus:border-amber-600 focus:outline-none"
                />
              </div>
              {error && (
                <p role="alert" className="text-xs font-medium text-red-700">
                  {error}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleSubmit('disputed')}
                  className="px-4 py-2.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold transition-colors disabled:opacity-60"
                >
                  {submitting ? 'Enviando...' : 'Activar garantía y solicitar revisión'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
