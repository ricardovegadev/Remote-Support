import { useState } from 'react';
import { ChevronDown, HelpCircle, ShieldCheck } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: '¿Cómo funciona la conexión remota con RustDesk?',
    answer:
      'Utilizamos un cliente portable seguro (equivalente a TeamViewer o AnyDesk) que no requiere instalación permanente para emergencias puntuales. Al abrir el ejecutable oficial, obtienes un número de 9 dígitos y contraseña temporal que solo tú controlas. El especialista se conecta de forma cifrada TLS 1.3 y puedes cortar el acceso en cualquier momento con un solo clic.',
  },
  {
    question: '¿Debo proporcionar contraseñas o datos bancarios por chat?',
    answer:
      'Nunca. Por motivos estrictos de seguridad y cumplimiento normativo (GDPR / LOPDP), ningún técnico ni asistente de IA te solicitará contraseñas, claves de acceso maestro ni datos de tarjetas de crédito por el chat de la sala.',
  },
  {
    question: '¿Qué pasa si el problema técnico no se puede resolver en sesión?',
    answer:
      'Ofrecemos una Garantía de Resolución clara. Si el problema técnico diagnosticado no puede ser resuelto durante la sesión remota, gestionamos la revisión por un especialista senior o la devolución del importe conforme a nuestra Política de Reembolsos y Cancelación.',
  },
  {
    question: '¿Cómo se calculan las tarifas y hay cobros ocultos?',
    answer:
      'Nuestras tarifas de asistencia puntual bajo demanda son de precio fijo visible antes de contratar (Express $15 USD, Optimización $29 USD, Avanzado $39 USD) y los planes mensuales Pyme ($39/$79 USD/mes). No existen cobros ocultos ni suscripciones automáticas no informadas.',
  },
  {
    question: '¿Puedo solicitar soporte para computadoras Windows, Mac y Linux?',
    answer:
      'Sí. Atendemos incidencias en sistemas operativos Windows (10/11), macOS y distribuciones Linux, además de problemas de red, impresoras, Microsoft 365, Outlook y VPN.',
  },
  {
    question: '¿Cómo funciona la facturación y qué métodos de pago aceptan?',
    answer:
      'Procesamos los pagos de forma 100% segura mediante pasarelas PCI-DSS (Stripe Checkout con tarjetas VISA, Mastercard y American Express, además de PayPal y Google Pay). Recibes un comprobante y un informe técnico detallado al finalizar cada sesión.',
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="scroll-mt-20 py-16 sm:py-20 bg-white border-b border-slate-200/80"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-xs font-semibold text-[#2563EB]">
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Preguntas Frecuentes</span>
            </span>
            <h2
              id="faq-heading"
              className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#0B1528]"
            >
              Todo lo que necesitas saber antes de empezar
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Resolvemos tus dudas sobre seguridad, proceso de conexión remota, garantías y tarifas.
            </p>
          </div>
        </ScrollReveal>

        <div className="space-y-3.5">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <ScrollReveal key={item.question} delayMs={index * 60}>
                <div
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? 'border-[#2563EB] bg-blue-50/20 shadow-md shadow-blue-900/5'
                      : 'border-slate-200/90 bg-[#F8FAFC]/80 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(index)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${index}`}
                    className="w-full min-h-[52px] px-5 sm:px-6 py-4 flex items-center justify-between gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  >
                    <span className="text-sm sm:text-base font-semibold text-[#0B1528] leading-snug">
                      {item.question}
                    </span>
                    <span
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 ${
                        isOpen ? 'bg-[#2563EB] text-white rotate-180' : 'bg-slate-200/70 text-slate-700'
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" aria-hidden="true" />
                    </span>
                  </button>

                  {isOpen && (
                    <div
                      id={`faq-answer-${index}`}
                      className="px-5 sm:px-6 pb-5 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100 animate-fade-up"
                    >
                      {item.answer}
                    </div>
                  )}
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        <ScrollReveal delayMs={150}>
          <div className="mt-10 text-center rounded-2xl bg-[#F8FAFC] border border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-left">
              <span className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-bold text-[#0B1528]">¿Tienes otra consulta específica?</p>
                <p className="text-xs text-slate-600">Nuestro asistente IA de triaje te responde al instante en el diagnóstico guiado.</p>
              </div>
            </div>
            <a
              href="#diagnostico"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#0B1528] hover:bg-[#132544] text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
            >
              Iniciar diagnóstico
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
