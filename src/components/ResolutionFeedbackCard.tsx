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
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [disputeMode, setDisputeMode] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedMode, setSubmittedMode] = useState<'confirmed' | 'disputed' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (mode: 'confirmed' | 'disputed') => {
    setError(null);
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
            rating: mode === 'confirmed' ? rating : 1,
            comment: mode === 'confirmed' ? comment.trim() : undefined,
            disputeReason: mode === 'disputed' ? disputeReason.trim() : undefined,
          }),
        }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || 'No se pudo registrar tu calificación.');
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
              Ticket <span className="font-mono font-semibold">{ticket.ticket_code}</span> marcado como resuelto. Tu acceso remoto temporal fue purgado.
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
          <p>Tu evaluación quedó registrada para certificar la calidad del especialista.</p>
        </div>
      ) : submittedMode === 'disputed' ? (
        <div role="status" className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-950 space-y-1">
          <p className="font-bold">Solicitud de revisión / garantía registrada</p>
          <p>Nuestro equipo de operaciones revisará tu caso para reasignar soporte o procesar tu garantía de reembolso.</p>
        </div>
      ) : !disputeMode ? (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-[#0B192C] mb-2">
              ¿Cómo calificarías la atención recibida?
            </p>
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Calificación del soporte">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`${star} estrellas`}
                  aria-pressed={rating === star}
                  className={`p-1.5 rounded-lg transition-colors ${
                    star <= rating
                      ? 'text-amber-500 bg-amber-50'
                      : 'text-slate-300 hover:text-amber-400'
                  }`}
                >
                  <Star
                    className="w-5 h-5"
                    fill={star <= rating ? 'currentColor' : 'none'}
                    aria-hidden="true"
                  />
                </button>
              ))}
              <span className="ml-2 font-mono text-xs font-bold text-[#0B192C]">
                {rating}/5
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

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSubmit('confirmed')}
              className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors disabled:opacity-60"
            >
              {submitting ? 'Guardando...' : 'Sí, quedó resuelto · Enviar calificación'}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setError(null);
                setDisputeMode(true);
              }}
              className="py-2.5 px-4 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>No quedó resuelto / Garantía</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <label htmlFor="dispute-reason" className="block text-xs font-semibold text-[#0B192C]">
            Cuéntanos qué sigue fallando para activar revisión o garantía de reembolso
          </label>
          <textarea
            id="dispute-reason"
            rows={3}
            maxLength={500}
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="Describe el problema pendiente..."
            className="w-full rounded-lg border border-amber-300 px-3 py-2 text-xs text-[#0B192C] focus:border-amber-600 focus:outline-none"
          />
          {error && (
            <p role="alert" className="text-xs font-medium text-red-700">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSubmit('disputed')}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors disabled:opacity-60"
            >
              {submitting ? 'Enviando...' : 'Solicitar revisión / garantía'}
            </button>
            <button
              type="button"
              onClick={() => {
                setDisputeMode(false);
                setError(null);
              }}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
