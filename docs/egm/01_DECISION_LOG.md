# 01 · DECISION LOG (ADR) — Decisiones Arquitectónicas Inmutables

> **Regla de Oro:** Ninguna iteración futura ni sesión asistida por IA puede revertir estas decisiones sin una aprobación explícita del propietario del producto y la creación de un nuevo ADR que sustituya al anterior.

---

## ADR-01 · Flujo de Descarga Oficial de RustDesk sin Blobs Sintéticos ni Variables Obligatorias
- **Estado:** Aceptado e Inmutable
- **Decisión:** Utilizar exclusivamente el endpoint del servidor `/api/rustdesk/official-download` (con override opcional vía `VITE_RUSTDESK_WINDOWS_URL` / `VITE_RUSTDESK_MAC_URL`) para entregar instaladores reales de RustDesk en red pública.
- **Prohibido:** Generar archivos `Blob` sintéticos/falsos en el navegador o exigir variables de entorno obligatorias de servidor/clave RustDesk (`relay`/`key`) en la Etapa 1 del cliente.
- **Justificación:** El cliente final solo debe abrir el ejecutable oficial, copiar su ID de 9 dígitos y pegarlo en el Paso 2 sin fricción técnica ni bloqueos de red.

---

## ADR-02 · Métodos de Pago Oficiales sin "Link" en el Checkout
- **Estado:** Aceptado e Inmutable
- **Decisión:** Mantener el checkout expreso apilado con **Google Pay (`G Pay`) + PayPal + Stripe** más el formulario directo de **Tarjeta (`VISA / MC / AMEX`)**, usando los logotipos vectoriales SVG oficiales de `src/components/PaymentBrandLogos.tsx`.
- **Prohibido:** Introducir "Link" como método o botón de pago en el checkout o sustituir los SVGs de marca por texto plano.
- **Justificación:** Maximiza la confianza fintech, la conversión móvil y la claridad de marca en la Sala de Conexión (`/sesion/:code`) y el Portal Público.

---

## ADR-03 · UUIDs v4 RFC 4122 Obligatorios en Esquema, Semillas y Entidades
- **Estado:** Aceptado e Inmutable
- **Decisión:** Toda entidad persistida (`organizations`, `tickets`, `organization_members`, `profiles`, `audit_logs`, `ticket_messages`) debe usar identificadores **UUID v4 RFC 4122** válidos (`generateUuid()` e `isValidUuid()` en `src/utils/ticketLogic.ts`).
- **Prohibido:** Usar IDs legibles en texto plano como `'org-1'`, `'tech-1'` o `'ticket-demo-1'` en datos semilla o payloads hacia Supabase.
- **Justificación:** Evita errores `22P02` (`invalid input syntax for type uuid`) en PostgreSQL, políticas RLS y llamadas RPC como `claim_ticket_atomically`.

---

## ADR-04 · Modelo Oficial `gemini-2.5-flash` en `server.ts` con Fallback Determinista
- **Estado:** Aceptado e Inmutable
- **Decisión:** Los 3 endpoints de IA en `server.ts` (`/api/ai/receptionist`, `/api/ai/report` y `/api/ai/assistant`) deben usar el identificador de modelo activo **`gemini-2.5-flash`** a través de `@google/genai` en el servidor, manteniendo una respuesta fallback determinista cuando `GEMINI_API_KEY` no esté presente o falle.
- **Prohibido:** Exponer `GEMINI_API_KEY` en el cliente (`VITE_*`), llamar a Gemini desde el navegador o usar identificadores de modelo experimentales/inválidos en `server.ts`.
- **Justificación:** Garantiza seguridad de credenciales, resiliencia operativa ante cuotas o ausencia de clave y etiquetado transparente (`✦ Generado por IA · Revisado por especialista`).

---

## ADR-05 · Prohibición de Casillas Pre-Marcadas y Bloqueo Estricto de Menores de 18 Años
- **Estado:** Aceptado e Inmutable
- **Decisión:** Todas las casillas legales (Términos, Privacidad, Reembolsos) y de marketing deben iniciar **desmarcadas por defecto (`false`)**, y todo flujo de registro o emisión de ticket (`AuthModal`, `TechPortalView`, `DiagnosticWizard`) debe exigir fecha de nacimiento verificando **edad ≥ 18 años** antes de persistir datos.
- **Prohibido:** Pre-marcar consentimientos (`defaultChecked` / `true` inicial), omitir la validación de fecha de nacimiento `+18` o eliminar las herramientas de portabilidad JSON, borrado/anonimización ARCO y cancelación en 1 clic.
- **Justificación:** Cumplimiento obligatorio GDPR / LOPDP, validez contractual del consentimiento de acceso remoto y trazabilidad legal auditada (`terms_accepted_at`, `terms_version`, `is_adult_verified`).
