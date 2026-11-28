import { CheckCircle2, Clock, CreditCard, ShieldCheck } from 'lucide-react';
import type { SupportTicket } from '../types/support';

interface ConnectionTimelineProps {
  ticket: SupportTicket;
}

export function ConnectionTimeline({ ticket }: ConnectionTimelineProps) {
  const formatTs = (isoStr: string | null | undefined): string => {
    if (!isoStr) return 'Pendiente';
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return 'Registrado';
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) + ' · ' + date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  const isCreatedDone = Boolean(ticket.created_at);
  const isAuthorizedDone = ticket.payment_status === 'authorized' || ticket.payment_status === 'paid' || ticket.status === 'in_progress' || ticket.status === 'resolved' || ticket.status === 'pending_client_confirmation';
  const isResolvedDone = ticket.status === 'resolved' || ticket.status === 'pending_client_confirmation';
  const isPaidDone = ticket.payment_status === 'paid';

  const steps = [
    {
      id: 'created',
      title: 'Ticket Creado',
      description: 'Solicitud registrada y asignada en cola',
      time: formatTs(ticket.created_at),
      done: isCreatedDone,
      icon: Clock,
    },
    {
      id: 'authorized',
      title: 'Pre-autorización de Pago',
      description: 'Retención temporal segura en pasarela (Stripe/PayPal)',
      time: formatTs(ticket.consent_accepted_at ?? ticket.created_at),
      done: isAuthorizedDone,
      icon: CreditCard,
    },
    {
      id: 'resolved',
      title: 'Incidencia Resuelta',
      description: 'Diagnóstico completado y doble confirmación',
      time: formatTs(ticket.resolved_at),
      done: isResolvedDone,
      icon: ShieldCheck,
    },
    {
      id: 'paid',
      title: 'Pago Capturado & Garantía',
      description: isPaidDone ? 'Pago capturado definitivamente (Custodia 48h)' : 'Pendiente de confirmación o captura',
      time: formatTs(ticket.client_confirmed_at ?? (ticket.payment_status === 'paid' ? ticket.resolved_at : null)),
      done: isPaidDone,
      icon: CheckCircle2,
    },
  ];

  return (
    <div
      data-testid="connection-timeline"
      className="bg-white border border-[#E5E9F2] rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <h4 className="text-sm font-bold text-[#0F172A]">
            Línea de Tiempo del Servicio y Transparencia de Caja
          </h4>
          <p className="text-xs text-[#64748B]">
            Seguimiento de estados en tiempo real para tu ticket #{ticket.ticket_code}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-mono font-semibold text-emerald-800 self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Garantía 48h Activa</span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`relative p-4 rounded-xl border transition-all ${
                step.done
                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                  : 'bg-[#F8FAFC] border-slate-200 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    step.done
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-600 tabular-nums">
                  0{idx + 1}
                </span>
              </div>
              <p className="text-xs font-bold text-[#0F172A]">{step.title}</p>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                {step.description}
              </p>
              <p className="text-[11px] font-mono font-semibold text-[#2563EB] mt-2 pt-2 border-t border-slate-200/60">
                {step.time}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
