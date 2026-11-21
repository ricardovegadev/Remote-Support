import { useEffect } from 'react';
import {
  FileText,
  Lock,
  Mail,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { LEGAL_TERMS_VERSION } from '../utils/ticketLogic';

export type LegalDocTab = 'privacy' | 'terms' | 'refunds' | 'contact';

interface LegalDocsModalProps {
  isOpen: boolean;
  activeTab: LegalDocTab;
  onSelectTab: (tab: LegalDocTab) => void;
  onClose: () => void;
}

const TABS: Array<{ id: LegalDocTab; label: string; icon: typeof Lock }> = [
  { id: 'privacy', label: 'Política de Privacidad', icon: Lock },
  { id: 'terms', label: 'Términos y Condiciones', icon: FileText },
  { id: 'refunds', label: 'Reembolsos y Cancelación', icon: RotateCcw },
  { id: 'contact', label: 'Contacto y DMCA', icon: Mail },
];

export function LegalDocsModal({
  isOpen,
  activeTab,
  onSelectTab,
  onClose,
}: LegalDocsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      data-testid="legal-docs-modal"
      className="fixed inset-0 z-50 bg-[#0B192C]/65 backdrop-blur-[1px] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0B192C] text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#10B981] shrink-0" aria-hidden="true" />
            <div>
              <h2 id="legal-modal-title" className="text-base font-bold">
                Centro de Transparencia Legal y Privacidad
              </h2>
              <p className="text-xs text-slate-300">
                Versión vigente {LEGAL_TERMS_VERSION} · Cumplimiento GDPR / LOPDP
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar documentación legal"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div
          role="tablist"
          aria-label="Documentos legales de Remote Support 365"
          className="px-6 pt-3 pb-0 bg-[#F8FAFC] border-b border-slate-200 flex flex-wrap gap-2 shrink-0"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-t-md ${
                  active
                    ? 'border-[#2563EB] text-[#0B192C] bg-white'
                    : 'border-transparent text-slate-600 hover:text-[#0B192C]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm text-slate-700 leading-relaxed flex-1">
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-[#0B192C]">
                Política de Privacidad y Protección de Datos
              </h3>

              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 text-xs leading-relaxed">
                <strong>Uso de herramientas de IA:</strong> algunas funciones pueden enviar
                el texto del incidente a Google Gemini API para generar asistencia. No
                incluyas contraseñas, códigos de acceso ni datos innecesarios. Revisa las
                condiciones del proveedor; esta aplicación no configura ni acredita por sí
                sola sus políticas de retención o entrenamiento.
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-[#0B192C]">
                  1. Minimización de datos y verificación de edad (+18)
                </h4>
                <p className="text-xs text-slate-600">
                  Recopilamos estrictamente los datos necesarios para prestar soporte
                  técnico remoto: nombre completo, correo electrónico, fecha de nacimiento
                  (para una declaración de mayoría de edad +18; el formulario no verifica
                  identidad ni edad mediante documentos), sistema
                  operativo, descripción técnica del incidente e identificador temporal de
                  9 dígitos de RustDesk. No realizamos grabaciones de pantalla ni acceso
                  en segundo plano sin tu consentimiento explícito en la sala de sesión.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-[#0B192C]">
                  2. Conservación y solicitudes de privacidad
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
                  <li>
                    <strong>Tickets y mensajes:</strong> el producto no aplica actualmente
                    un plazo automático de eliminación verificable. La conservación puede
                    depender de la operación y obligaciones aplicables.
                  </li>
                  <li>
                    <strong>Registros de auditoría:</strong> no existe una purga automática
                    por antigüedad implementada en esta versión.
                  </li>
                  <li>
                    <strong>Solicitudes:</strong> puedes pedir acceso, corrección o
                    anonimización en los canales de contacto. La exportación disponible
                    cubre los datos mostrados por la aplicación y la anonimización del
                    ticket no elimina automáticamente todos los registros o cuentas.
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-[#0B192C]">
                  3. Subencargados de tratamiento autorizados
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-slate-200">
                    <p className="font-semibold text-[#0B192C]">Supabase</p>
                    <p className="text-slate-600">
                      Base de datos PostgreSQL, autenticación y almacenamiento cifrado.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-slate-200">
                    <p className="font-semibold text-[#0B192C]">Stripe &amp; PayPal</p>
                    <p className="text-slate-600">
                      Procesamiento seguro de pagos y facturación bajo estándar PCI-DSS.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-slate-200">
                    <p className="font-semibold text-[#0B192C]">Google Gemini API</p>
                    <p className="text-slate-600">
                      Puede procesar texto de incidencias para generar asistencia; revisa
                      las condiciones vigentes del proveedor.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-slate-200">
                    <p className="font-semibold text-[#0B192C]">RustDesk</p>
                    <p className="text-slate-600">
                      Herramienta de conexión remota. El cifrado y la retención dependen
                      de la configuración e infraestructura utilizadas.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-[#0B192C]">
                Términos y Condiciones de Uso
              </h3>

              <div className="space-y-2">
                <h4 className="font-semibold text-[#0B192C]">
                  1. Requisito obligatorio de mayoría de edad (+18 años)
                </h4>
                <p className="text-xs text-slate-600">
                  Remote Support 365 está disponible únicamente para personas mayores de 18
                  años con capacidad legal para contratar servicios y autorizar acceso
                  remoto sobre equipos propios o corporativos debidamente autorizados.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-[#0B192C]">
                  2. Alcance del soporte remoto supervisado
                </h4>
                <p className="text-xs text-slate-600">
                  Toda sesión remota bajo demanda requiere que el cliente descargue
                  voluntariamente el agente, ingrese su ID de 9 dígitos y marque la casilla
                  de consentimiento explícito dentro de la Sala de Conexión. El cliente
                  observa cada acción en pantalla en tiempo real y puede revocar o cerrar
                  el programa en cualquier instante.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-[#0B192C]">
                  3. Responsabilidad sobre copias de seguridad
                </h4>
                <p className="text-xs text-slate-600">
                  Antes de autorizar reparaciones de sistema operativo, limpieza profunda o
                  migraciones, el cliente es responsable de mantener copias de seguridad
                  actualizadas de documentos críticos o bases de datos locales.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-[#0B192C]">
                  4. Disponibilidad realista del servicio
                </h4>
                <p className="text-xs text-slate-600">
                  Prestamos soporte continuo sujeto a disponibilidad de especialistas en
                  cola y ventanas de mantenimiento programado. Los tiempos de respuesta
                  estimados son referenciales y pueden variar ante incidentes masivos de
                  red o hardware físico dañado no reparable de forma remota.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'refunds' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-[#0B192C]">
                Información de Reembolsos y Cancelación
              </h3>

              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-950 space-y-1.5">
                <p className="font-semibold">
                  Solicitudes de reembolso
                </p>
                <p>
                  El pago se procesa antes de prestar la asistencia. Esta aplicación no
                  emite reembolsos automáticamente. Para solicitar una revisión, escribe
                  a soporte con el código del ticket y el comprobante; la elegibilidad,
                  decisión y plazos dependen de los términos aplicables y del procesador.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-[#0B192C]">
                  Planes de suscripción
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
                  <li>
                    La aplicación no ofrece actualmente un portal de autoservicio para
                    cancelar. Contacta a soporte para solicitar la cancelación de futuras
                    renovaciones y conservar el comprobante de la solicitud.
                  </li>
                  <li>
                    Revisa la periodicidad y condiciones que muestra el procesador de pago
                    antes de confirmar la suscripción.
                  </li>
                  <li>
                    La fecha efectiva y el estado de acceso deben confirmarse con soporte;
                    el panel actual no sincroniza el ciclo de suscripción.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-[#0B192C]">
                Contacto Corporativo y Canal DMCA
              </h3>
              <p className="text-xs text-slate-600">
                Para consultas operativas, ejercicio de derechos de privacidad
                (GDPR/LOPDP) o reclamaciones legales y de propiedad intelectual, utiliza
                nuestros canales oficiales:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-4 rounded-lg bg-[#F8FAFC] border border-slate-200 space-y-1">
                  <p className="font-semibold text-[#0B192C]">Soporte Técnico</p>
                  <a
                    href="mailto:soporte@remotesupport365.com"
                    className="font-mono text-[#2563EB] hover:underline break-all"
                  >
                    soporte@remotesupport365.com
                  </a>
                  <p className="text-slate-600 pt-1">
                    Incidencias de tickets, pagos y reembolsos.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-[#F8FAFC] border border-slate-200 space-y-1">
                  <p className="font-semibold text-[#0B192C]">Delegado de Privacidad</p>
                  <a
                    href="mailto:privacidad@remotesupport365.com"
                    className="font-mono text-[#2563EB] hover:underline break-all"
                  >
                    privacidad@remotesupport365.com
                  </a>
                  <p className="text-slate-600 pt-1">
                    Portabilidad, rectificación y supresión de datos.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-[#F8FAFC] border border-slate-200 space-y-1">
                  <p className="font-semibold text-[#0B192C]">Legal y Canal DMCA</p>
                  <a
                    href="mailto:legal@remotesupport365.com"
                    className="font-mono text-[#2563EB] hover:underline break-all"
                  >
                    legal@remotesupport365.com
                  </a>
                  <p className="text-slate-600 pt-1">
                    Notificaciones de propiedad intelectual y cumplimiento.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-[#0B192C]">
                  Procedimiento de Reclamación DMCA / Propiedad Intelectual
                </p>
                <p>
                  Envía una notificación escrita a{' '}
                  <span className="font-mono font-semibold text-[#0B192C]">
                    legal@remotesupport365.com
                  </span>{' '}
                  indicando: (1) firma física o electrónica del titular, (2)
                  identificación de la obra protegida y ubicación específica del material,
                  y (3) datos de contacto y declaración de buena fe.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#F8FAFC] border-t border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <p className="text-xs text-slate-600">
            Documento normativo {LEGAL_TERMS_VERSION} · Remote Support 365
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#0B192C] hover:bg-[#0F172A] rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
