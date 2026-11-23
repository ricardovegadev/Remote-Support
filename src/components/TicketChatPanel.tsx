import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import type { MessageSenderRole, TicketMessage } from '../types/support';

interface TicketChatPanelProps {
  ticketCode: string;
  messages: TicketMessage[];
  currentRole: MessageSenderRole;
  onSendMessage: (messageText: string) => Promise<boolean | void> | void;
  disabled?: boolean;
}

function getContextualClientQuickReplies(messages: TicketMessage[]): string[] {
  const lastTechMessage = [...messages]
    .reverse()
    .find((m) => m.sender_role === 'technician')?.message;

  if (!lastTechMessage) {
    return [
      'Hola, ya estoy listo para empezar',
      'Necesito ayuda para encontrar mi ID',
      'Ya descargué el programa',
    ];
  }

  const lower = lastTechMessage.toLowerCase();

  if (
    lower.includes('id') ||
    lower.includes('rustdesk') ||
    lower.includes('9 dígito') ||
    lower.includes('9 digito') ||
    lower.includes('descarg') ||
    lower.includes('código') ||
    lower.includes('codigo')
  ) {
    return [
      'Ya abrí RustDesk, te envío mi ID',
      'Necesito ayuda para ubicar mi ID',
      'Ya acepté la conexión en pantalla',
    ];
  }

  if (
    lower.includes('acept') ||
    lower.includes('permiso') ||
    lower.includes('ventana') ||
    lower.includes('pantalla') ||
    lower.includes('solicitud') ||
    lower.includes('conect')
  ) {
    return [
      'Ya acepté el permiso',
      'No me aparece la ventana todavía',
      'Un momento, ya lo reviso',
    ];
  }

  if (
    lower.includes('reinic') ||
    lower.includes('prueba') ||
    lower.includes('probar') ||
    lower.includes('verific') ||
    lower.includes('listo') ||
    lower.includes('resuelto') ||
    lower.includes('funciona')
  ) {
    return [
      'Ya quedó funcionando, ¡gracias!',
      'Sigo viendo el mismo problema',
      'Voy a reiniciar y te aviso',
    ];
  }

  if (lower.includes('pago') || lower.includes('comprobante') || lower.includes('tarifa')) {
    return [
      'Ya realicé el pago',
      'Tengo una duda con el pago',
      'Listo para iniciar la sesión',
    ];
  }

  return [
    'Sí, estoy frente al equipo',
    'Listo, puedes continuar',
    'Un momento por favor',
    '¿Cuál es el siguiente paso?',
  ];
}

export function TicketChatPanel({
  ticketCode,
  messages,
  currentRole,
  onSendMessage,
  disabled = false,
}: TicketChatPanelProps) {
  const [draftMessage, setDraftMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length]);

  const sendMessageText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || disabled || isSending) return;
    setIsSending(true);
    try {
      const result = await onSendMessage(trimmed);
      if (result !== false) {
        setDraftMessage('');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessageText(draftMessage);
  };

  const clientQuickReplies =
    currentRole === 'client' && !disabled
      ? getContextualClientQuickReplies(messages)
      : [];

  return (
    <div
      data-testid={`ticket-chat-${currentRole}`}
      className="bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#0B192C]" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-[#0B192C]">
            Chat en vivo · {ticketCode}
          </h3>
        </div>
        <span className="font-mono tabular-nums text-xs text-slate-500">
          {messages.length} {messages.length === 1 ? 'mensaje' : 'mensajes'}
        </span>
      </div>

      {/* Messages Feed */}
      <div className="p-4 space-y-3 h-72 overflow-y-auto chat-scroll-hover bg-[#F8FAFC]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <p className="text-xs font-medium text-slate-600">
              Aún no hay mensajes en esta sesión.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {currentRole === 'client'
                ? 'Escribe aquí o usa una respuesta rápida si necesitas ayuda para ubicar tu ID.'
                : 'Envía un saludo o confirma al cliente que estás listo para conectarte.'}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.sender_role === 'system') {
              return (
                <div key={msg.id} className="text-center py-1">
                  <span className="text-[11px] text-slate-500">
                    {msg.message}
                  </span>
                </div>
              );
            }

            const isOwn = msg.sender_role === currentRole;
            const senderLabel =
              msg.sender_role === 'technician' ? 'Técnico Especialista' : 'Cliente';
            const timeLabel = new Date(msg.created_at).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1">
                  <span className="font-medium text-slate-700">{senderLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{timeLabel}</span>
                </div>
                <div
                  className={`max-w-[85%] rounded-lg px-3.5 py-2 text-xs leading-relaxed ${
                    isOwn
                      ? 'bg-[#0B192C] text-white'
                      : 'bg-white border border-slate-200 text-slate-800'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      {/* Contextual Quick Replies for Client */}
      {clientQuickReplies.length > 0 && (
        <div
          aria-label="Respuestas rápidas sugeridas"
          className="px-3 pt-2.5 pb-1 border-t border-slate-100 bg-white flex flex-wrap items-center gap-1.5"
        >
          {clientQuickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              disabled={isSending}
              onClick={() => void sendMessageText(reply)}
              className="px-2.5 py-1 rounded-full border border-blue-200/80 bg-blue-50/50 hover:bg-[#2563EB] hover:border-[#2563EB] hover:text-white text-[11px] font-medium text-[#1D4ED8] transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="p-3 border-t border-slate-200/80 bg-white flex items-center gap-2"
      >
        <label htmlFor={`chat-input-${currentRole}`} className="sr-only">
          Escribir mensaje en el chat de soporte
        </label>
        <input
          id={`chat-input-${currentRole}`}
          type="text"
          disabled={disabled || isSending}
          value={draftMessage}
          onChange={(e) => setDraftMessage(e.target.value)}
          placeholder={
            disabled
              ? 'Ticket cerrado'
              : currentRole === 'client'
              ? 'Escribe un mensaje al técnico...'
              : 'Responder al cliente...'
          }
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-500 focus:border-[#2563EB] focus:outline-none disabled:bg-slate-100"
        />
        <button
          type="submit"
          disabled={disabled || isSending || draftMessage.trim().length === 0}
          aria-label="Enviar mensaje"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-500 disabled:bg-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Send className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{isSending ? 'Enviando...' : 'Enviar'}</span>
        </button>
      </form>
    </div>
  );
}
