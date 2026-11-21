# 03 · SESSION CHANGELOG — Bitácora Cronológica de Remote Support 365

> Registro cronológico inverso (lo más reciente arriba) de los hitos verificados en el proyecto.

---

## [2026-11-20] · v2.4 Reorganización Estructural del Hero (`HeroSection.tsx`) — Carrusel Superior Libre, CTAs Inmediatos y Tarjeta de Asistente de Altura Fija (`h-[340px]`)
### Cambios implementados
- **Reorganización del Layout del Hero (`src/components/HeroSection.tsx`):**
  - Ubicado el carrusel fotográfico de 4 escenas en la parte superior ocupando todo el ancho de forma completamente libre, despejada y sin obstrucciones.
  - Colocados los botones de acción principal (`Iniciar diagnóstico`, `Así funciona`) y las 3 micro-garantías de confianza (`Tú decides cada paso`, `Sin contraseñas por chat`, `Desde $15 USD`) **exclusivamente justo debajo del contenedor del carrusel**.
  - Posicionados debajo de los CTAs el título (`Tu problema IT, un paso más cerca de resolverse.`), el subtítulo empático y la **tarjeta flotante interactiva del asistente** con altura fija estricta (`h-[340px]`).
  - Mantenida la barra inferior de accesos directos por aplicación (`Ayuda para tu día a día`).

### Verificación técnica
- `npm run lint` (`tsc --noEmit`), `npm test` (`12/12`), `npm run build` (`vite build`), y `compile_applet` verificados exitosamente con `0` errores y `0` regresiones.

---

## [2026-11-20] · v2.3 Animaciones del Hero, Carrusel 4 Escenas, Simulación Conversacional en Vivo, Ícono Interactivo `AssistantOrbIcon` y Scroll Reveal por Sección
### Cambios implementados
- **Ícono Interactivo del Asistente (`src/components/AssistantOrbIcon.tsx`):**
  - Creado emblema SVG animado propio con núcleo luminoso azul zafiro, anillos orbitales contrarrotativos y barras armónicas vivas (`idle` / `thinking` / `ready`) en lugar de un ícono genérico de chatbot, integrado en la tarjeta flotante del Hero y en el `DiagnosticWizard`.
- **Hero Animado + Carrusel de 4 Escenas Restaurado (`src/components/HeroSection.tsx`):**
  - Mantenida la estructura luminosa actual (`#F4F7FB` → blanco → `#F8FAFC`) con entrada escalonada (`animate-fade-up`), lavados ambientales con deriva suave (`animate-ambient-drift`) y tarjeta de confianza con flotación sutil (`animate-float-gentle`).
  - Restaurado el carrusel automático de 4 escenas (`hero_warm_specialist`, `hero_remote_support_screens`, `hero_windows_fix_screen`, `hero_clean_workstation`) con crossfade suave, efecto Ken Burns sutil, controles `<` / `>`, pausa al pasar el cursor e indicadores de progreso estilo cápsula sincronizados con la etiqueta inferior.
- **Simulación Conversacional en Vivo en la Tarjeta Demo (`src/components/HeroSection.tsx`):**
  - Animación paso a paso entre 3 escenarios reales (*Outlook*, *Windows lento*, *Impresora Wi-Fi*): burbuja del cliente → indicador animado de escritura (`3 puntos` + estado `thinking` del `AssistantOrbIcon`) → respuesta guiada → botones clicables de acción directa, con pausa automática al hacer hover/focus y selector manual de escenario.
- **Animaciones al Deslizar por Sección (`src/components/ScrollReveal.tsx`, `src/index.css`, `DiagnosticWizard.tsx`, `LandingSections.tsx`, `Footer.tsx`):**
  - Implementado componente ligero `ScrollReveal` basado en `IntersectionObserver` (solo propiedades compositoras `transform` y `opacity`, soporte automático de `prefers-reduced-motion` y revelado inmediato en viewport) aplicado con escalonamiento suave en `#diagnostico`, `#confianza` (escudo con órbita sutil), `#como-funciona`, `#servicios`, `#planes-empresas` y `Footer`.

### Verificación técnica
- `npm run lint` (`tsc --noEmit`), `npm test` (`12/12`), `npm run build` y verificación en Chromium headless (carrusel interactivo, simulación conversacional, desplazamiento por secciones y responsive Desktop/Tablet/Mobile con `0` errores de consola y `0` desbordamiento horizontal).

---

## [2026-11-20] · v2.2 Rediseño Luminoso y Humano del Portal Público (`HeroSection` Editorial Claro, `DiagnosticWizard` Pastel + Chat Blanco y Bloque de Confianza `#F2FBF7`)
### Cambios implementados
- **Hero Editorial Luminoso y Humano (`src/components/HeroSection.tsx`):**
  - Reemplazado el bloque oscuro por un lienzo editorial claro (`bg-gradient-to-b from-[#F4F7FB] via-white to-[#F8FAFC]`) con titular empático en dos tonos (`Tu problema IT, un paso más cerca de resolverse.`), CTAs cálidos (`Iniciar diagnóstico →` y `Así funciona ↓`) y 3 micro-garantías con checks verde esmeralda (`Tú decides cada paso`, `Sin contraseñas por chat`, `Desde $15 USD · Si no lo resolvemos, no pagas`).
  - Integrada fotografía luminosa con luz natural de especialista con auriculares (`hero_warm_specialist_1795208080027.jpg`) + **tarjeta flotante interactiva de conversación en vivo** (*Asistente Remote 365 · Disponible para ayudarte*) con botones clicables (`Nuevo Outlook`, `Outlook clásico`, `Escribir mi problema...`) e insignia flotante `IA primero · Especialista si hace falta — Contexto listo para especialista`.
  - Añadida franja inferior **AYUDA PARA TU DÍA A DÍA** con accesos directos blancos (`Windows`, `Microsoft 365`, `Outlook`, `OneDrive`, `Teams`, `Impresoras y Wi-Fi`).
- **Continuidad Visual en el Asistente (`src/components/DiagnosticWizard.tsx`, `src/App.tsx`):**
  - Eliminada toda cabecera oscura pesada; encabezado luminoso *¿Con qué necesitas ayuda?* con **6 tarjetas amplias con iconos pastel** (*Windows*, *Outlook*, *Microsoft 365*, *OneDrive*, *Teams*, *VPN y conectividad*) y enlace `¿No ves tu problema? Descríbelo con tus propias palabras →`.
  - Tarjeta blanca `rounded-3xl` con sombra suave (`shadow-xl shadow-slate-200/60`) para el chat conversacional `AI Receptionist` (`/api/ai/receptionist`), botón `Hablar con especialista` con retrato de especialista, selector OS 4-Way y transición fluida al Paso 2 de tarifa fija (`$15/$29/$39` y Pyme `$39/$79`), validación obligatoria `+18` y casillas legales sin pre-marcar.
- **Bloque de Confianza Humana (`src/components/LandingSections.tsx`):**
  - Añadida sección `#confianza` en verde menta ultra suave (`bg-[#F2FBF7] rounded-3xl`) con ilustración de escudo verde esmeralda, titular **`Tu equipo. Tus decisiones.`**, 3 garantías de privacidad/control y enlace `Empezar con tranquilidad →`, manteniendo debajo Cómo funciona en 3 pasos, 10 especialidades, tarifas `$15/$29/$39` + Pyme `$39/$79` + pestaña Empresas SaaS, Stripe/PayPal/G Pay y `/dashboard` intactos.

### Verificación técnica
- `npm run lint` (`tsc --noEmit`), `npm test` (`12/12`), `npm run build` y auditoría visual/responsive en Chromium headless para Desktop (`1440x900`), Lenovo Tab P12 (`1280x800` y `800x1280`) y Motorola Signature (`412x915`) con `0` errores de consola y `0` desbordamiento horizontal.

---

## [2026-11-20] · v2.1 Puerta de Entrada Conversacional "IA Primero" (`HeroSection` Híbrido + `DiagnosticWizard` Conversacional en 2 Etapas)
### Cambios implementados
- **Hero Híbrido con Asistente IA en Vivo (`src/components/HeroSection.tsx`, `src/App.tsx`):**
  - Mantenidos el azul marino profundo `#0B1528`, el carrusel de 4 fotografías (incluyendo las estaciones multi-monitor actualizadas) y las 4 cápsulas inferiores (`Help Desk RS-XXXX`, `Desde $15 USD`, `Motor RustDesk`, `24/7 · Certificados`).
  - Integrada la tarjeta interactiva **"Asistente Remote 365 · Disponible"** con mensaje de confianza explícito (*"La IA te guía paso a paso. No controla tu dispositivo ni ejecuta cambios por su cuenta · Sin contraseñas por chat"*), campo de texto directo con envío inmediato y **3 píldoras de síntomas frecuentes** (*"Outlook no abre"*, *"Windows lento"*, *"Wi-Fi o impresora no conecta"*) que desplazan suavemente a `#diagnostico` con el caso precargado.
- **Asistente de Triaje Conversacional IA en 2 Etapas (`src/components/DiagnosticWizard.tsx`):**
  - **Etapa 1 — Conversación y Triaje IA (`AI Receptionist`):** Sustituida la rejilla fría de 10 tarjetas por una ventana de conversación SaaS limpia con avatar del asistente, botón secundario **"Hablar con especialista"** para escalamiento directo, selector táctil de SO (`Windows`, `Mac`, `Linux`, `Mobile`), **6 botones rápidos cotidianos** (*Windows*, *Outlook*, *Microsoft 365*, *OneDrive / Archivos*, *Teams / Apps*, *VPN y Red*) y compositor libre (`maxLength={500}`) con aviso de privacidad (*"No incluyas contraseñas ni códigos de acceso"*).
  - **Autoayuda Segura + Preguntas Breves + Escalamiento (`server.ts`, `src/services/aiService.ts`, `src/types/support.ts`):** Ampliado `/api/ai/receptionist` y su fallback con `selfServiceSteps` (2–3 comprobaciones rápidas seguras antes de escalar, con botón *"¡Me funcionó! Ya quedó resuelto"*) y `needsRemoteSpecialist`, priorizando siempre el síntoma escrito sobre la categoría inicial.
  - **Etapa 2 — Escalamiento Transparente con Tarifa Fija y Generación de Ticket:** Conserva intactos el resumen IA listo para el técnico, tarifas fijas (`$15/$29/$39` y Pyme `$39/$79`), garantía *"Si no lo resolvemos, no pagas"*, validación obligatoria `+18` años, casillas legales/marketing sin pre-marcar y redirección a `/sesion/:code`.
- **Integridad del Portal y `/dashboard`:**
  - Preservada intacta `LandingSections.tsx` (conectando las 10 tarjetas de `#servicios` directamente al triaje conversacional) y sin tocar `TechPortalView.tsx` ni `src/components/dashboard/*`.

### Verificación técnica
- `npm run lint` (`tsc --noEmit`), `npm test` (`tsx --test src/utils/ticketLogic.test.ts`), `npm run build` (`vite build`) y auditoría responsive + flujo interactivo en Chromium headless (Desktop `1440x900`, Lenovo Tab P12 `800x1280` / `1280x800` y Motorola Signature `412x915`) con `0` errores de consola y `0` desbordamiento horizontal.

---

## [2026-11-18] · v2.0 Rediseño Visual y UX del Portal Público (`Header`, `HeroSection`, `DiagnosticWizard`, `LandingSections`, `Footer`) y Selector OS 4-Way
### Cambios implementados
- **Ritmo Visual Alternado y Micro-Animaciones (`src/index.css`, `src/components/Header.tsx`, `src/components/Footer.tsx`):**
  - Alternancia cromática entre secciones (`#0B1528` Hero con retícula técnica `.bg-tech-grid` y resplandor radial eléctrico → `#F4F7FB` Wizard con tarjeta elevada → `#FFFFFF` Cómo funciona → `#F8FAFC` Catálogo de 10 especialidades → `#FFFFFF` Planes y Tarifas → `#0B1528` Footer).
  - Barra `Header` con efecto glassmorphism (`bg-white/90 backdrop-blur-md`), subrayado animado en enlaces y transiciones táctiles (`ease-out-expo`).
  - Utilidades `@keyframes fadeUp` / `.animate-fade-up` en `src/index.css` respetando `@media (prefers-reduced-motion: reduce)`.
- **Hero Sofisticado y Cápsulas Operativas (`src/components/HeroSection.tsx`):**
  - Píldora luminosa de lanzamiento con punto verde pulsante en vivo, resplandor ambiental (`blur-3xl bg-blue-500/15`) detrás del carrusel, overlay glassmorphism oscuro y 4 indicadores operativos encapsulados con iconos Lucide (`Ticket`, `BadgeDollarSign`, `MonitorCheck`, `Award`).
- **Wizard Guiado Rediseñado + Selector OS de 4 Opciones (`src/components/DiagnosticWizard.tsx`, `src/types/support.ts`, `src/utils/ticketLogic.ts`, `server.ts`, `supabase/schema.sql`, `src/services/supportAdapter.ts`):**
  - Cabecera azul marino degradada con badge de `AI Receptionist` en vivo, stepper conectado y barra de progreso animada.
  - Paso 1 con 10 tarjetas cromáticas por categoría semántica, badge de tarifa diferenciado (`Express $15`, `Optimización $29`, `Avanzado $39`), estado activo vibrante y **selector táctil de Sistema Operativo (`Windows`, `Mac`, `Linux`, `Mobile`)** integrado de extremo a extremo hasta la descarga oficial de RustDesk (`/api/rustdesk/official-download`).
  - Paso 2 con chips de síntomas frecuentes en 1 clic por especialidad y tarjeta de pre-diagnóstico IA con acento lateral azul eléctrico (`shadow-[inset_3px_0_0_0_#2563EB]`).
  - Paso 3 preservando validación estricta `+18`, casillas sin pre-marcar, resumen de errores encima del botón de envío y CTA azul eléctrico degradado.
- **Cómo funciona, 10 Soluciones Técnicas y Planes (`src/components/LandingSections.tsx`):**
  - Pasos `01/02/03` con medallones degradados y línea conectora en escritorio; 5 pilares operativos con iconos pastel; 10 tarjetas de servicio con icono temático, tags suaves y flecha animada; tarjeta destacada **Optimización ($29)** con barra superior luminosa y transición suave al alternar pestañas `Clientes Finales` vs `Empresas SaaS`.

### Verificación técnica
- `npm run lint` (`tsc --noEmit`), `npm test` (`tsx --test src/utils/ticketLogic.test.ts`), `npm run build` (`vite build`) y auditoría responsive/consola en Chromium headless para Desktop, Lenovo Tab P12 y Motorola Signature sin desbordamiento horizontal (`scrollWidth <= innerWidth`).

---

## [2026-11-18] · v1.9 Catálogo Oficial de 10 Servicios de Soporte Remoto, Pilares Operativos y Triaje IA Especializado
### Cambios implementados
- **Catálogo de 10 Especialidades Remotas con Retrocompatibilidad (`src/types/support.ts`, `src/utils/ticketLogic.ts`, `supabase/schema.sql`):**
  - Definidas las 10 especialidades de lanzamiento (`LaunchIssueCategory`) con tarifa sugerida (`Express $15`, `Optimización $29`, `Avanzado $39`), tiempo de resolución estimado y protocolos iniciales para `Windows lento o bajo rendimiento`, `Aplicaciones que no arrancan`, `Pantallazos azules (BSOD)`, `Problemas de Wi-Fi o red`, `Errores de Microsoft 365 y Outlook`, `Configuración de impresoras`, `Eliminación de malware y virus`, `Recuperación de archivos`, `Actualizaciones de Windows` y `VPN y acceso remoto`.
  - Mantenida compatibilidad retroactiva (`LegacyIssueCategory`) para tickets previos (`Impresoras`, `Correo/Office`, `Sistema Operativo/Lentitud`, `Redes/Wi-Fi`, `Otro`) tanto en TypeScript como en el constraint `CHECK` de `public.tickets` en `supabase/schema.sql`.
- **UI Comercial y Wizard Guiado (`HeroSection.tsx`, `LandingSections.tsx`, `DiagnosticWizard.tsx`):**
  - Actualizado el Hero y la sección `#como-funciona` con los 5 pilares operativos verificables (Help Desk `RS-XXXX`, especialistas certificados Microsoft/CompTIA/ITIL, motor RustDesk equivalente a TeamViewer/AnyDesk/RDP, cobertura 24/7 para particulares y Pyme, y SLA objetivo por nivel) sin métricas inventadas.
  - Renderizadas las 10 especialidades en `#servicios` y en el Paso 1 del Wizard con preselección automática del nivel sugerido (`getSuggestedTierForCategory`).
- **Triaje IA y Workforce Especializado (`server.ts`, `src/services/aiService.ts`, `src/services/supportAdapter.ts`, `WorkforceDispatchView.tsx`, `App.tsx`, `TechPortalView.tsx`):**
  - Actualizados el prompt, schema JSON y clasificadores fallback de `AI Receptionist` y `AI Technician Assistant` para detectar y asignar los 10 escenarios (BSOD, malware, recuperación de archivos, VPN, Outlook/365, Windows Update, etc.).
  - Actualizadas las especialidades de técnicos a `Windows & BSOD`, `Microsoft 365 & Outlook`, `Impresoras`, `Redes & VPN`, `Seguridad & Malware` y `Recuperación de Datos`, con normalización automática de valores heredados en `localStorage`.

### Verificación técnica
- `npm run lint` (`tsc --noEmit`), `npm test` (incluyendo pruebas del catálogo de 10 servicios y retrocompatibilidad), `npm run build` y verificación visual/consola en Chromium headless sin pantalla en blanco.

---

## [2026-11-18] · v1.8 Auditoría Forense de Vista Previa (`vite.config.ts allowedHosts`, Watchdog en `index.html` y Sanitización Total)
### Causa raíz detectada
- En `vite.config.ts` (`server`), faltaba `allowedHosts: true`, lo que provocaba que el middleware de Vite 8 bloqueara con `HTTP 403 Forbidden` las peticiones proxy provenientes del dominio Cloud Run / AI Studio (`ais-dev-*.run.app`) tanto en `/` como en `/src/main.tsx`, dejando `#root` vacío en el navegador del usuario mientras `localhost:3000` respondía normal.

### Cambios implementados
- **Desbloqueo de Host en Vista Previa (`vite.config.ts`):**
  - Añadido `allowedHosts: true` en `server` manteniendo `hmr: false` en entornos Cloud Run / preview.
- **Diagnóstico Pre-Montaje en `index.html` y `src/main.tsx`:**
  - Insertado `<script>` inline ligero en `<head>` de `index.html` con `window.onerror`, `window.onunhandledrejection` y temporizador de 2 segundos que pinta una tarjeta de diagnóstico con el mensaje exacto, archivo y botón **"Limpiar datos locales y reiniciar"** si `#root` sigue vacío.
  - Verificación explícita de `App`, `./index.css`, `#root` y `createRoot` dentro de `try/catch` en `src/main.tsx` cancelando el watchdog al montar correctamente.
- **Sanitización Total de `localStorage` (`src/services/supportAdapter.ts` y `src/utils/cookieConsent.ts`):**
  - Implementado `loadSanitizedCollection` con `Array.isArray(...)` y validación de campos obligatorios en `loadOrganizations`, `loadMembers`, `loadTickets`, `loadMessages`, `loadDevices`, `loadSessions`, `loadAiAgents` y `loadAuditLogs`, descartando JSON corrupto/incompleto y regenerando semillas limpias sin lanzar excepciones.
  - Exportado `loadCookieConsent` en `src/utils/cookieConsent.ts` y limpieza automática de entradas corruptas en `readCookieConsent` / `loadUserProfile`.
  - Añadida etiqueta de marca **"Remote Support 365"** en el encabezado del portal de acceso en `src/components/TechPortalView.tsx` para visibilidad inmediata en `/`.

### Verificación técnica
- `npm run lint` (`tsc --noEmit`), `npm test`, `npm run build`, comprobación `Host: ais-dev-*.run.app` (HTTP `200 OK`) y renderizado real en Chromium headless (`#root` con `"Remote Support 365"` y `0` errores en consola).

---

## [2026-11-18] · v1.7 Rescate Global de Errores (`window.error` / `unhandledrejection`) y Verificación en Chromium
### Cambios implementados
- **Manejador Global Pre-Montaje (`src/main.tsx`):**
  - Registrados `window.addEventListener('error', ...)` y `window.addEventListener('unhandledrejection', ...)` antes de `createRoot` para pintar un recuadro visible con borde rojo sobre `document.body` con `event.message`, origen exacto (`archivo:línea:columna`) y botón **"Limpiar caché local y recargar"** (`localStorage.clear(); location.reload()`), ignorando avisos benignos de WebSocket HMR cuando la vista previa está en modo sin HMR.
  - Sincronizado `ErrorBoundary` de `src/main.tsx` con el mismo recuadro visible de diagnóstico y botón **"Limpiar caché local y recargar"**.

### Verificación técnica
- `npm run lint` (`tsc --noEmit`): **0 errores**
- `npm test` (`tsx --test src/utils/ticketLogic.test.ts`): **11/11 pruebas aprobadas**
- `npm run build` (`vite build`): **0 errores** (`dist/index.html` verificado)
- **Navegador real (Chromium headless vía `playwright-cli`):** `#root` renderizado con contenido visible (`innerHTML.length > 500`) en `/`, `/portal` y `/dashboard`, y **0 errores `pageerror`** en consola.

---

## [2026-11-18] · v1.6 ErrorBoundary en `src/main.tsx` y Blindaje Total de `localStorage` / `sessionStorage`
### Cambios implementados
- **`ErrorBoundary` directo en `src/main.tsx` (y respaldo pre-montaje):**
  - Implementado `ErrorBoundary` en `src/main.tsx` (además de `AppErrorBoundary.tsx`) capturando errores de renderizado o montaje y mostrando un recuadro visible con el **mensaje exacto del error** y el botón **"Restablecer datos locales"** (limpieza segura de claves `rs365_*` en `localStorage` y `sessionStorage`).
- **Blindaje de lectura/escritura ante datos previos en navegador (`supportAdapter.ts`, `cookieConsent.ts`, `App.tsx`, `Header.tsx`, `TechPortalView.tsx`):**
  - Validación estricta de tipo y estructura en `readCookieConsent()`, `loadUserProfile()`, `loadTickets()`, `loadMessages()`, `loadOrganizations()`, `loadMembers()`, `loadDevices()`, `loadSessions()`, `loadAiAgents()` y `loadAuditLogs()` (incluyendo normalización de arreglos `specialties` y `governance_rules` y coerción segura en `.toLowerCase()`, `.toUpperCase()`, `.trim()` y `.join()`).
  - Envueltos todos los accesos a `localStorage` y `sessionStorage` en bloques `try/catch` para evitar `TypeError` o `SecurityError` en contextos restringidos o con datos heredados.

### Verificación técnica
- `npm run lint` (`tsc --noEmit`): **0 errores**
- `npm test` (`tsx --test src/utils/ticketLogic.test.ts`): **11/11 pruebas aprobadas**
- `npm run build` (`vite build`): **0 errores** (`dist/index.html` + assets verificados)

---

## [2026-11-18] · v1.5 ErrorBoundary, Protección Anti-Bucle de Sincronización y Renderizado Resiliente
### Cambios implementados
- **ErrorBoundary ligero con recuperación en 1 clic (`src/components/AppErrorBoundary.tsx` y `src/main.tsx`):**
  - Envuelto `<App />` en `AppErrorBoundary` para capturar cualquier excepción en tiempo de ejecución y mostrar una pantalla de recuperación limpia con el botón **"Restablecer vista"** (sanitiza claves corruptas de `localStorage`) e **"Ir al inicio"** en lugar de una pantalla en blanco.
- **Estabilización de `useEffect` y Guardias de Cambio (`src/App.tsx` y `src/services/supportAdapter.ts`):**
  - Confirmada inicialización síncrona `useState(() => supportAdapter.loadTickets())` y estabilizado el arreglo de dependencias del `useEffect` de sincronización a `[activeTicketCode]`.
  - Añadidas `haveTicketsChanged` y `haveRecordsChanged` para actualizar el estado de React (`setTickets`, `setMessages`, `setMembers`, `setOrganizations`, etc.) únicamente cuando los datos realmente cambian.
  - Añadido `writeLocalSilentIfChanged` en `syncFromSupabaseIfConfigured` para evitar ecos innecesarios de `BroadcastChannel`, además de validación defensiva de registros en `sortTicketsDeterministically`, `loadTickets`, `getInitials` y `DashboardOverview.tsx`.

### Verificación técnica
- `npm run lint` (`tsc --noEmit`): **0 errores**
- `npm run build` (`vite build`): **0 errores**
- `npm test` (`tsx --test src/utils/ticketLogic.test.ts`): **11/11 pruebas aprobadas**

---

## [2026-11-18] · v1.4 Ordenamiento Determinista de Tickets y Eliminación de Carrera Realtime
### Cambios implementados
- **Ordenamiento Determinista Único (`src/services/supportAdapter.ts`):**
  - Añadida e exportada la función `sortTicketsDeterministically(list: SupportTicket[])`, que ordena de forma estable por `created_at` descendente (ms) y, ante empate de milisegundos, por `ticket_code` descendente (`b.ticket_code.localeCompare(a.ticket_code)`).
  - Añadido método `saveTickets(tickets)` y aplicado `sortTicketsDeterministically` en `loadTickets()`, `saveTickets()`, `persistTicket()`, `claimTicketAtomically()`, `updateTicket()` y `syncFromSupabaseIfConfigured()` (junto con `.order('created_at', { ascending: false }).order('ticket_code', { ascending: false })` en la consulta a Supabase y deduplicación por `id`).
- **Eliminación de Doble Renderizado Compitiendo (`src/App.tsx`):**
  - En el listener de `subscribeRealtime`, omitido `setTickets(supportAdapter.loadTickets())` cuando `isSupabaseConfigured()` está activo, esperando exclusivamente al resultado resuelto de `syncFromSupabaseIfConfigured()` con control de secuencia (`syncRequestSeqRef`) y deduplicación por `id` + `sortTicketsDeterministically`.
  - Estabilizadas las dependencias del efecto de sincronización (`[activeView, activeTicketCode]`) para evitar re-suscripciones y carreras al actualizar un ticket.
- **Claves Estables Verificadas (`DashboardOverview.tsx` y `TicketsInboxView.tsx`):**
  - Confirmado uso de `key={ticket.id}` (UUID único) en todas las filas de solicitudes recientes y bandeja de entrada.

### Verificación técnica
- `npm run lint` (`tsc --noEmit`): **0 errores**
- `npm run build` (`vite build`): **0 errores**
- `npm test` (`tsx --test src/utils/ticketLogic.test.ts`): **11/11 pruebas aprobadas**

---

## [2026-11-18] · v1.3 Checkout Iframe-Safe (Google Pay / Stripe / PayPal) e Hidratación Segura de `/sesion/:code`
### Cambios implementados
- **Prevención de pantalla en blanco dentro de `<iframe>` (`src/components/ConnectionRoom.tsx` y `server.ts`):**
  - Añadida detección de ejecución embebida (`isEmbeddedInIframe()`) en `ConnectionRoom.tsx`. Cuando el backend devuelve `mode === 'live'` con URL externa de Stripe Checkout o PayPal dentro de un `<iframe>`, se abre en nueva pestaña (`window.open(url, '_blank', 'noopener,noreferrer')`) y se muestra un panel de espera con enlace de respaldo y botón **"Ya completé el pago · Verificar ahora"** conectado a `GET /api/payments/stripe/verify-session` / `POST /api/payments/paypal/capture-order`.
  - En modo `sandbox`, el pago ejecuta confirmación verificada inline sin recargar la página, actualizando `payment_status = 'paid'` y mostrando el banner verde de confirmación.
  - Mejorado `getPublicBaseUrl` en `server.ts` priorizando el header `Origin` / `x-forwarded-host` activo para URLs de retorno exactas.
- **Hidratación garantizada en `/sesion/:code` (`src/App.tsx` y `src/components/ConnectionRoom.tsx`):**
  - Eliminado el riesgo de pantalla en blanco o carga infinita al recargar `/sesion/:code` o regresar con `?payment=success&session_id=...` mediante coincidencia directa de ticket, temporizador acotado de sincronización (4 s máx.) y tarjeta de recuperación si el código no existe localmente.

### Verificación técnica
- `npm run lint` (`tsc --noEmit`): **0 errores**
- `npm run build` (`vite build`): **0 errores**
- `npm test` (`tsx --test src/utils/ticketLogic.test.ts`): **11/11 pruebas aprobadas**

---

## [2026-11-18] · v1.2 Resiliencia en Emisión de Ticket (Paso 3) y Fallback Seguro en Supabase
### Cambios implementados
- **Feedback Inmediato y Visibilidad de Errores en `DiagnosticWizard.tsx` (Paso 3):**
  - Añadido estado `isSubmitting` con spinner y etiqueta `"Generando Sala de Conexión..."` en el botón **Generar Ticket y Sala de Conexión** mientras `onSubmitTicket` completa la persistencia y navegación.
  - Validación combinada de Pasos 1, 2 y 3 al enviar el Paso 3, mostrando cualquier error de validación o `persistenceError` directamente encima del botón de envío con accesos rápidos para completar el paso faltante.
- **Inserción Resiliente en Supabase (`src/services/supportAdapter.ts` y `src/App.tsx`):**
  - En `persistTicket` y `updateTicket`, detección automática de errores `PGRST204` / `42703` de caché de esquema (`extractMissingSchemaColumn`) para omitir columnas ausentes y reintentar la inserción/actualización en Supabase sin errores de consola; si persiste un rechazo (p. ej. constraint antiguo), guarda el ticket localmente (`rs365_local_fallback_ticket_ids_v1`) y devuelve `{ ok: true, data: nextTickets, warning }` para garantizar el ingreso inmediato a `/sesion/RS-XXXX`.
  - Preservados los tickets de respaldo local durante `syncFromSupabaseIfConfigured`, `updateTicket` y `appendMessage` para que el cliente complete RustDesk y Checkout sin interrupciones.
- **Constraints y Migración Idempotente (`supabase/schema.sql`):**
  - Asegurados los valores `'Express $15'`, `'Optimización $29'`, `'Avanzado $39'`, `'Pyme Esencial $39/mes'` y `'Pyme Corporativo $79/mes'` en `public.tickets` y `public.client_devices`, con bloque idempotente `ALTER TABLE` (incluyendo `billing_mode`, `organization_name` y columnas legales) y `notify pgrst, 'reload schema'` para bases ya provisionadas.

### Verificación técnica
- `npm run lint` (`tsc --noEmit`): **0 errores**
- `npm run build` (`vite build`): **0 errores**
- `npm test` (`tsx --test src/utils/ticketLogic.test.ts`): **11/11 pruebas aprobadas**

---

## [2026-11-18] · v1.1 Cierre de Auditoría Pre-Lanzamiento — Cobros Reales, PCI-DSS, Planes Pyme y Sincronización Multi-Tenant
### Cambios implementados
- **Planes Mensuales Pyme End-to-End (`Pyme Esencial $39/mes` y `Pyme Corporativo $79/mes`):**
  - Ampliado `ServiceTier`, `SERVICE_TIER_PRICES`, `SERVICE_TIER_REGULAR_PRICES`, `PYME_PLANS`, `deriveTicketPriority` y `createTicketFromDraft` (`src/types/support.ts`, `src/utils/ticketLogic.ts`).
  - Conectados los botones **Activar Plan** en `src/components/LandingSections.tsx` con `plan.serviceTier`, conservado el plan mensual seleccionado en `src/components/DiagnosticWizard.tsx` y actualizado el `CHECK` de `service_tier` y default de `client_devices.plan_name` en `supabase/schema.sql`.
- **Integración Real de Stripe Checkout + PayPal REST API v2 + Checkout PCI-DSS:**
  - Instalado el SDK oficial `stripe` en `package.json` e implementados flujos reales en `server.ts`: creación y verificación de sesión Stripe (`POST /api/payments/stripe/create-session`, `GET /api/payments/stripe/verify-session`) y órdenes/capturas PayPal REST API v2 con OAuth2 (`POST /api/payments/paypal/create-order`, `POST /api/payments/paypal/capture-order`, `PAYPAL_MODE` en `.env.example`), manteniendo modo sandbox explícito cuando faltan credenciales.
  - Refactorizado `src/components/ConnectionRoom.tsx` eliminando inputs y estados locales de datos sensibles de tarjeta (PCI-DSS), redirigiendo el pago con tarjeta (`VISA · MC · AMEX`), Google Pay y Stripe hacia Stripe Checkout hospedado y verificando estrictamente la respuesta (`res.ok && verified === true`) y los parámetros de retorno en URL (`?payment=success&gateway=...`). (Mantiene ADR-02: sin botón "Link").
- **Hidratación de `organization_name` y Sincronización Supabase Multi-Tenant:**
  - Añadida la columna `organization_name text` a `public.tickets` en `supabase/schema.sql` y su envío en `persistTicket()` (`src/services/supportAdapter.ts`).
  - Ampliado `syncFromSupabaseIfConfigured()` y `src/App.tsx` para hidratar `organizations`, `organization_members` (combinado con `technician_profiles`) y `ticket.organization_name`, además de actualizar los planes semilla de `SEED_DEVICES` a tarifas de lanzamiento vigentes.
- **Limpieza Final, Contraste WCAG AA y Suite de Pruebas:**
  - Actualizado `package.json` (`"name": "remote-support-365"`, `"test": "tsx --test src/utils/ticketLogic.test.ts"`, eliminada dependencia sin uso `esbuild`) y `<meta name="description">` en `index.html` con tarifas desde `$15 USD` (antes `$25 USD`).
  - Mejorado el contraste WCAG AA (`≥ 4.5:1`) en insignias claras y textos secundarios de `DashboardOverview.tsx`, `TechPortalView.tsx`, `WorkforceDispatchView.tsx` y `ticketLogic.ts`.

### Archivos actualizados en esta iteración EGM
- `package.json`, `.env.example`, `index.html`, `server.ts`, `supabase/schema.sql`
- `src/types/support.ts`, `src/utils/ticketLogic.ts`, `src/utils/ticketLogic.test.ts`, `src/services/supportAdapter.ts`, `src/App.tsx`
- `src/components/LandingSections.tsx`, `src/components/DiagnosticWizard.tsx`, `src/components/ConnectionRoom.tsx`, `src/components/TechPortalView.tsx`, `src/components/dashboard/DashboardOverview.tsx`, `src/components/dashboard/WorkforceDispatchView.tsx`
- `docs/egm/00_ELEPHANT_MEMORY.md`, `docs/egm/03_SESSION_CHANGELOG.md`

### Verificación técnica
- `npm run lint` (`tsc --noEmit`): **0 errores**
- `npm run build` (`vite build`): **0 errores**
- `npm test` (`tsx --test src/utils/ticketLogic.test.ts`): **11/11 pruebas aprobadas**

---

## [2026-11-18] · v1.0 Pre-Producción — Gobernanza EGM + Consolidación Completa
### Resumen de estado consolidado
- **Gobernanza Elephant–Goldfish Model (EGM):** Inicializada la documentación persistente del proyecto en `docs/egm/` (`00_ELEPHANT_MEMORY.md`, `01_DECISION_LOG.md`, `02_GOLDFISH_RESET_PROTOCOL.md`, `03_SESSION_CHANGELOG.md`) sin alterar la interfaz ni la lógica de negocio.
- **Checkout Fintech y Logos SVG Oficiales:** Implementados los componentes vectoriales `GooglePayLogo`, `PayPalLogo`, `StripeLogo` y `CardNetworkBadges` (`VISA`, `MC`, `AMEX`) en `src/components/PaymentBrandLogos.tsx`, checkout apilado (`h-12`) con autodetección de red de tarjeta por prefijo en `src/components/ConnectionRoom.tsx` y barra de métodos aceptados en `src/components/LandingSections.tsx`.
- **Entorno Preview / Cloud Run (`vite.config.ts`):** Desactivado `server.hmr = false` automáticamente en entornos Cloud Run y cuando `DISABLE_HMR === 'true'`, eliminando errores WebSocket de `@vite/client`.
- **Cumplimiento Legal, Privacidad (+18), Ética y WCAG AA:**
  - `AuthModal.tsx`, `TechPortalView.tsx` y `DiagnosticWizard.tsx`: acceso/registro conectado a Supabase Auth (con fallback demo), validación estricta `+18` por fecha de nacimiento y consentimientos desmarcados por defecto con auditoría (`terms_accepted_at`, `terms_version: "v1.0-2026"`, `marketing_opt_in`, `is_adult_verified`).
  - `LegalDocsModal.tsx` y `CookieConsentBanner.tsx`: 4 pestañas legales + banner pre-tracker (`rs365_cookie_consent`).
  - Portabilidad JSON, eliminación/anonimización ARCO y cancelación en 1 clic en `ConnectionRoom.tsx`, `AuthModal.tsx`, `AnalyticsSecuritySettingsView.tsx` y `supportAdapter.ts`.
  - Etiqueta transparente `✦ Generado por IA · Revisado por especialista` en todas las respuestas de IA y contraste WCAG AA en superficies claras y oscuras.
- **Tarifas Competitivas de Lanzamiento y Hero Interactivo:**
  - Puntual: Express ~~$25~~ **$15 USD**, Optimización ~~$40~~ **$29 USD**, Avanzado ~~$55~~ **$39 USD**; Pyme: ~~$59~~ **$39 USD/mes** y ~~$99~~ **$79 USD/mes**; SaaS separado: **$29 / $49 / $79 USD/mes**.
  - Carrusel interactivo en `HeroSection.tsx` y barra de scroll transparente en `DashboardSidebar.tsx`.
- **Backend IA, RustDesk Público y Supabase Multi-Tenant:**
  - `server.ts` operando con `gemini-2.5-flash` en los 3 endpoints `/api/ai/*` con fallback determinista.
  - Descarga dinámica oficial de RustDesk en `/api/rustdesk/official-download` sin configuración manual de servidor/clave.
  - Esquema `supabase/schema.sql` con UUIDs v4 RFC 4122, RLS multi-tenant y RPC `claim_ticket_atomically`.

### Archivos creados / actualizados en esta iteración EGM
- `docs/egm/00_ELEPHANT_MEMORY.md`
- `docs/egm/01_DECISION_LOG.md`
- `docs/egm/02_GOLDFISH_RESET_PROTOCOL.md`
- `docs/egm/03_SESSION_CHANGELOG.md`

### Verificación técnica
- `npm run lint` (`tsc --noEmit`): **0 errores**
- `npm run build` (`vite build`): **0 errores**
- `npx tsx --test src/utils/ticketLogic.test.ts`: **10/10 pruebas aprobadas**
