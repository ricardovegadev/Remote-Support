# 00 · ELEPHANT MEMORY — Verdad Única del Proyecto (Remote Support 365)

> **Propósito:** Fuente canónica y persistente de arquitectura, diseño, catálogo comercial, integraciones y reglas legales de **Remote Support 365**. Debe consultarse antes de cualquier modificación y actualizarse al cierre de cada iteración.

---

## 1. Identidad y Stack Técnico Inmutable

- **Producto:** Remote Support 365 — Plataforma SaaS multiempresa de asistencia técnica remota bajo demanda con triaje por IA, sala de conexión en vivo y Centro de Operaciones.
- **Frontend:** React `19.0.1` + TypeScript (`tsc --noEmit` estricto) + Vite `8.3.0` + Tailwind CSS v4 (`@tailwindcss/vite`, `@import "tailwindcss";` en `src/index.css`) + `lucide-react`.
- **Backend / BFF:** Express `4.21.2` en `server.ts` (`tsx server.ts` en dev con `vite.middlewares`, puerto `3000`; `vite.config.ts` habilita `allowedHosts: true` para dominios `*.run.app` y desactiva `server.hmr = false` en Cloud Run / vista previa para evitar bloqueos 403 y errores WebSocket). SDK oficial `stripe` en servidor.
- **Base de Datos y Realtime:** Supabase (PostgreSQL + RLS + Realtime + Auth) con fallback automático a `localStorage` cuando `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` no están configuradas (`src/lib/supabaseClient.ts`, `src/services/supportAdapter.ts`, `supabase/schema.sql`).
- **Inteligencia Artificial:** `@google/genai` exclusivamente en servidor (`server.ts`) con modelo oficial **`gemini-2.5-flash`** en `/api/ai/receptionist`, `/api/ai/report` y `/api/ai/assistant`, más fallback determinista si falta `GEMINI_API_KEY`.
- **Variables de Entorno Activas (`.env.example`):**
  - Obligatorias/Runtime: `GEMINI_API_KEY` (servidor), `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (cliente, opcionales para modo demo).
  - Opcionales: `VITE_RUSTDESK_WINDOWS_URL`, `VITE_RUSTDESK_MAC_URL`, `STRIPE_SECRET_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE` (`sandbox` | `live`). No existen variables obligatorias residuales de servidor/clave RustDesk.

---

## 2. Paleta Corporativa y Estética Aprobada

| Token | Hex | Uso Principal |
| :--- | :--- | :--- |
| **Navy Profundo** | `#0B192C` / `#0B1528` | Hero, header corporativo, tarjetas Pyme Pro, sidebar de operaciones |
| **Azul Eléctrico** | `#2563EB` | CTAs primarios, enlaces activos, plan destacado `Optimización $29` |
| **Verde Esmeralda** | `#10B981` (`emerald-700` en textos claros AA) | Garantías, estado conectado, descuentos y verificaciones de seguridad |
| **Fondo Claro** | `#F8FAFC` / `#F6F8FB` | Superficie principal de portal, tarjetas limpias y formularios |

- **Tipografía:** `Plus Jakarta Sans` (display), `Inter` (UI/body) y `JetBrains Mono` (`tabular-nums` en precios, códigos `RS-XXXX` e IDs de 9 dígitos).
- **Responsividad y Dispositivos Objetivo:** Mobile-first validado para **Desktop**, **Lenovo Tab P12** (tablet alta resolución) y **Motorola Signature** (móvil). Barra de scroll del sidebar (`DashboardSidebar`) transparente (`.scrollbar-transparent`).
- **Accesibilidad WCAG AA:** Contraste ≥ 4.5:1 en superficies claras y oscuras, cierre con `Escape` en modales, atributos `alt` descriptivos e indicadores globales `:focus-visible`.

---

## 3. Catálogo Comercial y Especialidades Vigentes (Separación Estricta)

Definido en `src/types/support.ts`, `src/utils/ticketLogic.ts` y replicado en `src/services/aiService.ts`, `server.ts`, `src/components/LandingSections.tsx`, `src/components/DiagnosticWizard.tsx` y `supabase/schema.sql`:

1. **Catálogo Oficial de 10 Especialidades Remotas (Etapa 1 · Con retrocompatibilidad para categorías heredadas):**
   - **Express ($15 USD):** `Aplicaciones que no arrancan`, `Problemas de Wi-Fi o red`, `Errores de Microsoft 365 y Outlook`, `Configuración de impresoras`.
   - **Optimización ($29 USD):** `Windows lento o bajo rendimiento`, `Eliminación de malware y virus`, `Actualizaciones de Windows`.
   - **Avanzado ($39 USD):** `Pantallazos azules (BSOD)`, `Recuperación de archivos`, `VPN y acceso remoto`.
   - **Especialidades Workforce (`TechnicianSpecialty`):** `'Windows & BSOD'`, `'Microsoft 365 & Outlook'`, `'Impresoras'`, `'Redes & VPN'`, `'Seguridad & Malware'`, `'Recuperación de Datos'`.
   - **Pilares Operativos Visibles (sin métricas ficticias):** Help Desk con tickets `RS-XXXX`, especialistas certificados (`Microsoft · CompTIA · ITIL`), motor remoto **RustDesk** (equivalente a TeamViewer/AnyDesk/RDP, agente temporal o fijo Pyme), cobertura **24/7 para particulares y Pyme**, y SLA objetivo por nivel.
2. **Asistencia Puntual Bajo Demanda (Pago único por incidente resuelto):**
   - **Express:** ~~$25 USD~~ → **$15 USD** (`40% OFF`) — Impresoras, correo Outlook/365, Wi-Fi/red, apps que no arrancan.
   - **Optimización (Recomendado):** ~~$40 USD~~ → **$29 USD** (`28% OFF`) — Windows lento, eliminación de malware/virus y actualizaciones fallidas.
   - **Avanzado:** ~~$55 USD~~ → **$39 USD** (`29% OFF`) — Pantallazos azules (BSOD), recuperación de archivos y VPN/acceso remoto.
   - **Complementos opcionales en Checkout (`ConnectionRoom.tsx`):** Optimización profunda (`+$12 USD`) y Respaldo crítico en la nube (`+$9 USD`).
3. **Planes Mensuales Pyme (Acceso desatendido y SLA · `ServiceTier` nativo en Wizard, Checkout y `supabase/schema.sql`):**
   - **Pyme Esencial (`'Pyme Esencial $39/mes'`):** ~~$59 USD~~ → **$39 USD / mes** (Hasta 5 equipos, agente instalado, SLA < 15 min).
   - **Pyme Corporativo (`'Pyme Corporativo $79/mes'`):** ~~$99 USD~~ → **$79 USD / mes** (Hasta 15 equipos, SLA < 10 min).
   - *Regla comercial:* Aviso explícito de renovación automática mensual y cancelación en 1 clic sin penalizaciones antes del pago.
4. **Planes SaaS Multiempresa (Pestaña separada `"Para Empresas de Soporte (SaaS)"`):**
   - **Starter MSP:** **$29 USD / mes** (hasta 3 técnicos internos).
   - **Growth Helpdesk:** **$49 USD / mes** (hasta 10 técnicos + freelancers + asignación RPC + 6 agentes IA).
   - **Scale Marketplace:** **$79 USD / mes** (ilimitado + Red Global de Desborde 24/7 + relay dedicado).

---

## 4. Integraciones Activas y Arquitectura de Módulos

- **RustDesk (Flujo Red Pública sin Configuración Manual):**
  - En `ConnectionRoom.tsx` (Etapa 1), los botones de descarga apuntan dinámicamente a `/api/rustdesk/official-download` en `server.ts` (o `VITE_RUSTDESK_WINDOWS_URL` / `VITE_RUSTDESK_MAC_URL` si están definidos).
  - Instrucción explícita al cliente: **no necesita configurar ningún servidor ni clave adicional**; solo abrir el ejecutable oficial, copiar su ID de 9 dígitos y pegarlo en el Paso 2.
  - Lanzamiento directo para técnicos: `rustdesk://connection/new/[9_DIGITS]`.
- **Checkout Fintech PCI-DSS (`src/components/PaymentBrandLogos.tsx` + `ConnectionRoom.tsx` + `LandingSections.tsx`):**
  - Express Checkout apilado (`h-12`) con logotipos vectoriales SVG oficiales: **Google Pay (`G Pay`)**, **PayPal** y **Stripe** (sin botón "Link", cumpliendo ADR-02).
  - Pago con tarjeta **100% PCI-DSS mediante Stripe Checkout hospedado** (`Pagar con tarjeta`, insignias **VISA · MC · AMEX** de `CardNetworkBadges`, sin capturar ni almacenar PAN/CVC/expiración en el estado de React).
  - Endpoints reales en `server.ts`: `POST /api/payments/stripe/create-session`, `GET /api/payments/stripe/verify-session`, `POST /api/payments/paypal/create-order` (OAuth2 + `/v2/checkout/orders`) y `POST /api/payments/paypal/capture-order` con verificación estricta al retorno (`verified === true`) y fallback explícito a modo sandbox cuando faltan credenciales.
- **Supabase Multi-Tenant (`supabase/schema.sql` + `src/services/supportAdapter.ts`):**
  - Claves primarias y semillas en formato **UUID v4 RFC 4122** válido (`isValidUuid`).
  - Toma atómica de tickets sin colisiones vía RPC `claim_ticket_atomically`.
  - Trazabilidad explícita hacia el cliente: `tickets.organization_name` persistido e hidratado desde `organizations`, sincronización de `organizations` y `organization_members` (combinados con `technician_profiles`) en sesiones de operador, junto con `assigned_technician_name` y `assigned_technician_specialty`.
- **Blindaje Legal, Privacidad y Transparencia IA (GDPR / LOPDP):**
  - **Restricción +18:** Validación estricta por fecha de nacimiento en `AuthModal`, `TechPortalView` (registro) y `DiagnosticWizard` (Paso 3). Bloquea menores con `"Remote Support 365 está disponible únicamente para personas mayores de 18 años."`
  - **Consentimiento explícito:** Casillas legal y marketing siempre **desmarcadas por defecto**; registro de `terms_accepted_at`, `terms_version` (`v1.0-2026`), `marketing_opt_in` e `is_adult_verified` en `tickets`, `profiles` y `audit_logs`.
  - **Documentación y Cookies:** `LegalDocsModal` (4 pestañas: Privacidad, Términos, Reembolsos/Cancelación, Contacto/DMCA) y `CookieConsentBanner` (`rs365_cookie_consent`) con bloqueo previo a rastreadores no esenciales.
  - **Derechos ARCO y Cancelación 1 Clic:** Exportación JSON (`Descargar mis datos (JSON)`), anonimización con confirmación en línea (`Eliminar mis datos personales`) y cancelación en 1 clic (`Cancelar renovación automática`) en `ConnectionRoom`, `AuthModal` y `OrganizationSettingsView`.
  - **Transparencia IA:** Distintivo visible `✦ Generado por IA · Revisado por especialista` en todas las salidas de `AI Receptionist`, `AI Technician Assistant` y `AI Report Generator`.

---

## 5. Mapa Rápido de Archivos Clave

- `server.ts` — Servidor Express BFF, endpoints `/api/ai/*`, `/api/rustdesk/official-download`, `/api/payments/*` y middleware Vite.
- `vite.config.ts` — Alias `@` y desactivación automática de HMR en Cloud Run / vista previa.
- `supabase/schema.sql` — Esquema PostgreSQL, RLS multi-tenant, RPC `claim_ticket_atomically` y columnas legales/edad/suscripción.
- `src/App.tsx` — Enrutamiento (`/portal`, `/sesion/:code`, `/dashboard`), estado global, overlays legales y handlers GDPR.
- `src/types/support.ts` — Contratos TypeScript de dominio, tickets, organizaciones, perfiles y cookies.
- `src/utils/ticketLogic.ts` & `src/utils/ticketLogic.test.ts` — Reglas puras de negocio, tarifas, validación `+18`, UUID y 13 pruebas unitarias (`npm test`).
- `src/utils/cookieConsent.ts` — Persistencia de preferencias de cookies (`v1.0-2026`).
- `src/services/supportAdapter.ts` & `src/services/aiService.ts` — Persistencia híbrida Supabase/localStorage, portabilidad JSON, anonimización y cliente BFF de IA.
- `src/components/PaymentBrandLogos.tsx` — SVGs oficiales de Google Pay, PayPal, Stripe, VISA, Mastercard y AMEX.
- `src/components/HeroSection.tsx`, `DiagnosticWizard.tsx`, `LandingSections.tsx`, `ConnectionRoom.tsx`, `Header.tsx`, `Footer.tsx`, `AuthModal.tsx`, `LegalDocsModal.tsx`, `CookieConsentBanner.tsx`.
- `src/components/TechPortalView.tsx` & `src/components/dashboard/*` — Centro de Operaciones multiempresa y gobierno de agentes AI Workforce.

---

## 6. Estado de Seguridad, CI/CD y Equipo de Agentes (Actualizado 2026-11-22)

- **Seguridad Backend & Supabase (Fases 1–3 aplicadas y migradas a producción):**
  - `POST /api/ai/report`, `POST /api/ai/assistant` y `POST /api/operator/tickets` protegidos con `requireOperatorAuth` (JWT de Supabase + rol activo de operador/admin).
  - `stripe/create-session`, `stripe/verify-session`, `paypal/create-order` y `paypal/capture-order` validan el token de sala con `crypto.timingSafeEqual`.
  - Webhook de Stripe (`/api/payments/stripe/webhook`) exento del rate limiter de usuario, con soporte para `charge.refunded` e `idempotencyKey` en checkout.
  - `GET /api/rustdesk/official-download` con caché en memoria de 15 minutos y soporte Apple Silicon (`aarch64`).
  - Rutas `/api/*` desconocidas devuelven `404` JSON.
  - `supabase/migrations/20261121000000_security_and_schema_alignment.sql` aplicada en producción: `profiles` con `GRANT UPDATE` por columna (sin `role`, `is_verified` ni `is_adult_verified`), `anon` sin `INSERT` directo en `tickets`, `claim_ticket_atomically` corregido con `LEFT JOIN technician_profiles`, `update_ticket_as_staff` y `update_own_ticket_as_authenticated` desplegados.
  - `supabase/schema.sql` ya **no** se empaqueta en el bundle público del cliente (`TechPortalView` usa guía de despliegue).
- **Repositorio GitHub (`ricardovegadev/Remote-Support`):**
  - Visibilidad: **Private**, `delete_branch_on_merge: true`, **Secret Scanning**, **Push Protection**, **Dependabot alerts** y **Dependabot security updates** activos.
  - Workflows activos: `.github/workflows/ci.yml` (`Lint, Test & Build` en Node 24) y `.github/workflows/supabase-migrations.yml` (`supabase db push --remote --yes` automático en `main` para `supabase/migrations/**`).
  - Gestor único: `npm` (`package-lock.json`; `bun.lock` y activos muertos eliminados).
- **Equipo de Agentes Especializados (Skills en Antigravity):**
  - `rs365-qa-auditor` (solo lectura: QA, seguridad y contratos API↔UI).
  - `rs365-supabase-architect` (migraciones SQL, RLS y RPCs; requiere aprobación antes de push a `main`).
  - `rs365-ui-polish` (React 19, Tailwind 4, WCAG, responsive y previews reales autocontenidos).
  - `rs365-tech-ceo` (orquestador: consolida reportes en 3–4 decisiones prioritarias por impacto y riesgo).

