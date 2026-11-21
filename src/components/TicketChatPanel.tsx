import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import type { MessageSenderRole, TicketMessage } from '../types/support';

interface TicketChatPanelProps {
  ticketCode: string;
  messages: TicketMessage[];
  currentRole: MessageSenderRole;
  onSendMessage: (messageText: string) => void;
  disabled?: boolean;
}

export function TicketChatPanel({
  ticketCode,
  messages,
  currentRole,
  onSendMessage,
  disabled = false,
}: TicketChatPanelProps) {
  const [draftMessage, setDraftMessage] = useState('');
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draftMessage.trim();
    if (!trimmed || disabled) return;
    onSendMessage(trimmed);
    setDraftMessage('');
  };

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
      <div className="p-4 space-y-3 h-72 overflow-y-auto bg-[#F8FAFC]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <p className="text-xs font-medium text-slate-600">
              Aún no hay mensajes en esta sesión.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {currentRole === 'client'
                ? 'Escribe aquí si necesitas ayuda para ubicar tu ID de 9 dígitos.'
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

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
      >
        <label htmlFor={`chat-input-${currentRole}`} className="sr-only">
          Escribir mensaje en el chat de soporte
        </label>
        <input
          id={`chat-input-${currentRole}`}
          type="text"
          disabled={disabled}
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
          disabled={disabled || draftMessage.trim().length === 0}
          aria-label="Enviar mensaje"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-500 disabled:bg-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Send className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Enviar</span>
        </button>
      </form>
    </div>
  );
}
