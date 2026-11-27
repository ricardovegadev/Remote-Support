# 03 · SESSION CHANGELOG — Bitácora Cronológica de Remote Support 365

> Registro cronológico inverso (lo más reciente arriba) de los hitos verificados en el proyecto.

---

## [2026-11-27] · v2.26 Verificación y Blindaje Final del Core (Pre-Template · Estaciones 3 y 4)
### Auditoría y correcciones aplicadas (4 bloques)
- **Bloque 1 · Base de Datos y RLS (`supabase/schema.sql`) — Corregido:**
  - Confirmado `OK`: sin cláusulas `tg_op`/`return new` fuera de funciones `RETURNS trigger`, `audit_ticket_security_changes()` valida `if tg_op = 'INSERT'` antes de leer `OLD.*`, y todos los UUIDs semilla cumplen RFC 4122 v4.
  - Corregido: `tickets.client_session_token` alineado de `gen_random_bytes(24)` a `gen_random_bytes(32)` (64 hex); incorporadas en el esquema canónico las tablas operativas `public.payments` y `public.technician_payouts` con PKs UUID v4, `organization_id`, `enable row level security`, `revoke all` y políticas RLS estrictas.
- **Bloque 2 · Tokens Criptográficos y Privacidad de Sesión (`src/utils/ticketLogic.ts`, `src/App.tsx`, `src/services/supportAdapter.ts`) — OK:**
  - Verificado sin cambios necesarios: `createTicketFromDraft` usa `crypto.getRandomValues(new Uint8Array(32))` (64 hex) en runtime reservando `randomFn` solo para tests; `/sesion/:code` inexistente muestra acceso denegado sin exponer `tickets[0]`; `supportAdapter.ts` limpia `client_session_token` antes de persistir en `localStorage` y almacena `rs365_room_tokens_v1` únicamente en `sessionStorage`.
- **Bloque 3 · Seguridad de Endpoints en Servidor (`server.ts`) — Corregido:**
  - Confirmado `OK`: `crypto.timingSafeEqual` en `/api/payments/stripe/verify-session` y `/api/payments/paypal/capture-order`; validación de sesión/rol de operador en `/api/ai/report`, `/api/ai/assistant` y rutas admin de postulantes; `TRUST_PROXY` configurable; caché de 15 min + macOS `aarch64` en `/api/rustdesk/official-download`; `/api/health` mínimo (`{ ok: true }`).
  - Corregido: separación explícita **Android (`.apk`) vs iOS (App Store oficial)** en `/api/rustdesk/official-download` para `os=Mobile`, y aislamiento `systemInstruction` + delimitador `<user_input>...</user_input>` contra inyección de prompts en `/api/ai/receptionist`.
- **Bloque 4 · Rendimiento del Bundle y Assets (`src/services/frontendMonitoring.ts`, `src/components/HeroSection.tsx`, `public/`) — Corregido:**
  - Confirmado `OK`: vistas y modales pesados (`TechPortalView`, `ConnectionRoom`, `AuthModal`, `LegalDocsModal`, `TicketLookupModal`, `TechnicianApplyView`, `TechnicianRegisterView`) ya lazy-loaded con `React.lazy()` + `Suspense`.
  - Corregido: carga diferida dinámica de `@sentry/react` en `src/services/frontendMonitoring.ts` reduciendo el chunk inicial `index-*.js` de `610.19 kB` a **`316.35 kB`** (`gzip: 73.92 kB`, 0 advertencias `> 500 kB`); añadido `loading={index === 0 ? 'eager' : 'lazy'}` + `decoding="async"` en los slides de `HeroSection.tsx`; eliminadas 2 capturas huérfanas en `public/assets/aistudio/` conservando el activo OG activo.

### Verificación técnica (Quality Gates)
- `npm run lint` (`tsc --noEmit`): **0 errores**.
- `npm test`: **31/31 pruebas aprobadas** (`fail 0`).
- `npm run build` (`vite build`): **0 errores, 0 advertencias** · chunk principal `dist/assets/index-CiJ-ocnu.js` = **`316.35 kB`** (`gzip: 73.92 kB`).

---

## [2026-11-27] · v2.25 Instalación de Estructura Documental Software Factory (`.agent/rules/` y `.agent/FACTORY_PROTOCOL.md`)
### Cambios implementados
- **Separación de Estándares Universales vs Contexto del Proyecto (sin cambios en `src/`, `server.ts` ni `supabase/schema.sql`):**
  - **`.agent/rules/00-factory-standards.md`:** Creadas las reglas universales 100 % reutilizables de la Software Factory (stack de referencia React 19 + TS `strict` + Vite 8 + Tailwind v4 + Express + Supabase + Gemini `gemini-2.5-flash` + `Dockerfile` multi-etapa; arquitectura `src/core/` vs `src/modules/`, feature flags no destructivos, `React.lazy()`; seguridad UUID v4 RFC 4122, RLS Multi-Tenant, tokens criptográficos 32 bytes / 64 hex sin `Math.random()`, cero secretos en `VITE_*`, validación JWT/sesión en servidor y prohibición de fallback `items[0]`; UI/UX mobile-first, WCAG AA, +18, casillas legales desmarcadas, cookies, ARCO, etiquetado IA, PCI-DSS y Quality Gates).
  - **`.agent/FACTORY_PROTOCOL.md`:** Documentado el protocolo operativo repetible de **5 Estaciones** (EGM/ADR → Contratos/SQL/Flags/Tests → Construcción Modular + Skills + *Goldfish Reset* → Quality Gates + `qa-auditor` solo lectura → Despliegue `Dockerfile` con aprobación humana + *Backporting* a `saas-factory-starter`), incluyendo la **Plantilla de Arranque para Sesión Limpia (*Goldfish Reset*)** lista para copiar.
  - **`.agent/rules/01-project-context.md`:** Creado el contexto exclusivo de **Remote Support 365** (referencia EGM obligatoria, paleta corporativa `#0B192C`/`#0B1528`, `#2563EB`, `#10B981`, `#F8FAFC`, dispositivos Desktop / Lenovo Tab P12 / Motorola Signature, catálogo comercial separado Puntual `$15/$29/$39` + complementos `+$12`/`+$9`, Pyme `$39/$79`, SaaS `$29/$49/$79`, motor RustDesk vía `/api/rustdesk/official-download` en red pública oficial y pasarelas Google Pay, PayPal, Stripe y Tarjeta VISA/MC/AMEX sin "Link").

### Verificación técnica
- `npm run lint` (`tsc --noEmit`): **0 errores**.
- `npm test`: **31/31 pruebas aprobadas**.
- `npm run build` (`vite build`): **0 errores**.

---

## [2026-11-25] · v2.24 Refinamiento Final UX/UI Móvil: Título en 2 Líneas, Subtítulo en 3 Líneas, Márgenes y Categorías en 2 Columnas (`HeroSection.tsx`)
### Cambios implementados
- **Optimización Móvil Avanzada (`src/components/HeroSection.tsx`):**
  - **Jerarquía y Espaciado General:** Título en 2 líneas exactas (`text-[36px]`) y subtítulo en 3 líneas limpias (`text-[14.5px]`) abarcando todo el ancho de la pantalla (`w-full max-w-none`). Margen vertical consistente entre secciones.
  - **Controles de Carrusel y CTAs:** Indicadores semitransparentes y botonera uniforme de acciones principales (`grid grid-cols-2`).
  - **Agrupación de Categorías:** Iconos de ayuda en cuadrícula simétrica de 2 columnas (`grid grid-cols-2 sm:grid-cols-3`) con botones en ancho completo (`w-full`) adaptados en 2 líneas sin desbordes.

### Verificación técnica
- `npm test` (`31/31` pruebas aprobadas).
- `npm run build` (`vite build`) y `npm run lint` (`tsc --noEmit`): **0 errores**.

---

## [2026-11-25] · v2.23 Cumplimiento Integral de Directrices UX/UI Móvil (`HeroSection.tsx`)
### Cambios implementados
- **Refinamiento UX/UI Móvil (`src/components/HeroSection.tsx`):**
  - **Jerarquía y Espaciado:** Añadido margen superior e inferior al minitítulo (`my-3 sm:my-4`) y espaciados de intersección consistentes entre bloques.
  - **Tipografía y Contenedor:** Aumentada la fuente del título principal a `text-[34px]` y del subtítulo a `text-sm`, optimizando el aprovechamiento del ancho de pantalla.
  - **Carrusel y CTAs:** Controles semitransparentes y botones de acción principais estandarizados en ancho uniforme (`grid grid-cols-2`).
  - **Agrupación de Categorías:** Iconos de ayuda distribuidos en una cuadrícula simétrica de 2 columnas (`grid grid-cols-2 sm:grid-cols-3`) con botones flexibles en ancho completo, asegurando que textos largos como *"Impresoras y Wi-Fi"* se adapten a dos líneas sin cortes.

### Verificación técnica
- `npm test` (`31/31` pruebas aprobadas).
- `npm run build` (`vite build`) y `npm run lint` (`tsc --noEmit`): **0 errores**.

---

## [2026-11-25] · v2.22 Ajuste Full-Width y Aumento de Fuente en Título y Subtítulo Móvil (`HeroSection.tsx`)
### Cambios implementados
- **Optimización Tipográfica y de Ancho (`src/components/HeroSection.tsx`):**
  - **Título Principal:** Aumentada la fuente a `text-[32px]` y ajustado con `w-full max-w-none` para ocupar el ancho total de la pantalla en 2 líneas.
  - **Subtítulo:** Aumentada la fuente a `text-sm` (~14px) con `w-full max-w-none` y `text-balance` para ajustarse y llenar perfectamente todo el ancho de la pantalla en exactamente **3 líneas**.

### Verificación técnica
- `npm test` (`31/31` pruebas aprobadas).
- `npm run build` (`vite build`) y `npm run lint` (`tsc --noEmit`): **0 errores**.

---

## [2026-11-25] · v2.21 Aumento de Tamaño de Fuente en Subtítulo Móvil (`HeroSection.tsx`)
### Cambios implementados
- **Optimización Tipográfica del Subtítulo (`src/components/HeroSection.tsx`):**
  - Aumentado el tamaño de fuente móvil a `text-[13.5px]` con `w-full max-w-none` y `text-balance` para que el texto se ajuste y llene perfectamente todo el ancho de la pantalla en exactamente **3 líneas** limpias.

### Verificación técnica
- `npm test` (`31/31` pruebas aprobadas).
- `npm run build` (`vite build`) y `npm run lint` (`tsc --noEmit`): **0 errores**.

---

## [2026-11-25] · v2.20 Ajuste Full-Width de Subtítulo en 3 Líneas (`HeroSection.tsx`)
### Cambios implementados
- **Optimización de Ancho Completo para Subtítulo Móvil (`src/components/HeroSection.tsx`):**
  - Configurado el subtítulo con `w-full max-w-none sm:max-w-xl` y `text-[12px] sm:text-lg` junto a `text-balance` para que ocupe de forma uniforme todo el ancho de la pantalla en exactamente **3 líneas** limpias sin desbordes.

### Verificación técnica
- `npm test` (`31/31` pruebas aprobadas).
- `npm run build` (`vite build`) y `npm run lint` (`tsc --noEmit`): **0 errores**.

---

## [2026-11-25] · v2.19 Optimización de Padding, Título en 2 Líneas y Subtítulo en 3 Líneas (`HeroSection.tsx`)
### Cambios implementados
- **Estructura y Tipografía Móvil (`src/components/HeroSection.tsx`):**
  - **Título Principal:** Ajustado para distribuirse exactamente en **2 líneas** limpias (`"Tu problema IT, un paso / más cerca de resolverse."`) adaptado al ancho de la pantalla.
  - **Subtítulo:** Configurado para ocupar exactamente **3 líneas** fluidas con espaciado optimizado (`text-[11px] sm:text-lg w-full leading-snug sm:leading-relaxed text-balance py-0.5`).
  - **Espaciado y Padding:** Reorganizados los márgenes y separaciones entre elementos para una experiencia visual móvil impecable.

### Verificación técnica
- `npm test` (`31/31` pruebas aprobadas).
- `npm run build` (`vite build`) y `npm run lint` (`tsc --noEmit`): **0 errores**.

---

## [2026-11-25] · v2.18 Optimización de Rendimiento y Desarrollo (`package.json`, `vite.config.ts`)
### Cambios implementados
- **Script de Limpieza (`package.json`):**
  - Actualizado el script `"clean"` para borrar de forma completa `dist`, `node_modules/.vite` y `server.js`.
- **Caché de Validaciones de Archivos (`vite.config.ts`):**
  - Añadida la configuración `server.fs.cachedChecks: true` para reducir el impacto de las validaciones de archivos en el sistema de ficheros durante el desarrollo local.

### Verificación técnica
- `npm test` (`31/31` pruebas aprobadas).
- `npm run build` (`vite build`) y `npm run lint` (`tsc --noEmit`): **0 errores**.

---

## [2026-11-25] · v2.17 Refinamiento de Subtítulo Móvil en Hero (`HeroSection.tsx`)
### Cambios implementados
- **Optimización de Subtítulo (`src/components/HeroSection.tsx`):**
  - Reducido ligeramente el tamaño de fuente en móvil (`text-[11px] sm:text-lg`) y ajustado el padding/ancho (`w-full py-0`) para garantizar que el texto se distribuya en máximo dos líneas limpias sin desbordar el contenedor ni generar saltos de línea irregulares, cubriendo todo el ancho de la pantalla con perfecta coherencia visual.

### Verificación técnica
- `npm test` (`31/31` pruebas aprobadas).
- `npm run build` (`vite build`) y `npm run lint` (`tsc --noEmit`): **0 errores**.

---

## [2026-11-25] · v2.16 Cumplimiento de Directrices de Diseño UX/UI Móvil (`HeroSection.tsx`)
### Cambios implementados
- **Ajustes de Interfaz Móvil (`src/components/HeroSection.tsx`):**
  - **Jerarquía y Espaciado:** Añadido margen superior e inferior al minitítulo (`my-2.5 sm:my-3`) para separarlo limpiamente del título principal.
  - **Ajuste de Texto:** Subtítulo optimizado con `text-balance` y espaciado vertical (`py-0.5`) para mostrarse en máximo dos líneas limpias sin palabras huérfanas.
  - **Elementos del Carrusel:** Flechas y paginación con fondo semitransparente (`bg-slate-900/35 backdrop-blur-md`).
  - **Alineación de Acciones Principales:** Botones de acción principales en cuadrícula uniforme de 2 columnas (`grid grid-cols-2`).
  - **Agrupación de Categorías / Contenedor:** Las 3 micro-garantías organizadas en una sola línea horizontal fluida (`flex flex-row items-center justify-between sm:justify-start gap-x-2 sm:gap-x-4`).

### Verificación técnica
- `npm test` (`31/31` pruebas aprobadas).
- `npm run build` (`vite build`) y `npm run lint` (`tsc --noEmit`): **0 errores**.

---

## [2026-11-25] · v2.15 Optimización de SEO Técnico y Open Graph Avanzado (`index.html`)
### Cambios implementados
- **Metadatos y Estructura de Datos SEO en `index.html`:**
  - Añadidas dimensiones de imagen Open Graph (`og:image:width: 1200`, `og:image:height: 630`) y color de tema (`theme-color: #0B1528`).
  - Incorporados metadatos geográficos y de indexación avanzados (`geo.region`, `geo.placename`, `robots` con `max-image-preview:large`).
  - Actualizado el esquema JSON-LD a `ProfessionalService` con catálogo de ofertas detallado (`hasOfferCatalog` para Express $15, Optimización $29 y Avanzado $39) para optimizar la indexación en motores de búsqueda y redes sociales.

### Verificación técnica
- `npm test` (`31/31` pruebas aprobadas).
- `npm run build` (`vite build`) y `npm run lint` (`tsc --noEmit`): **0 errores**.

---

## [2026-11-25] · v2.14 Refinamiento Experto UX/UI Móvil: Text Balance en Subtítulo, Carrusel Semitransparente, CTAs Uniformes y Fila Horizontal Centrada con Envoltura de Texto (`HeroSection.tsx`)
### Cambios implementados
- **Jerarquía y Adaptación Móvil (`src/components/HeroSection.tsx`):**
  - **Subtítulo:** Añadido `text-balance` para garantizar distribución limpia en máximo dos líneas sin palabras huérfanas en dispositivos móviles.
  - **Carrusel:** Controles con fondo semitransparente optimizado (`bg-slate-900/35 backdrop-blur-md`).
  - **Botones de Acción:** Ancho estandarizado uniforme (`grid grid-cols-2`) centrado.
  - **Categorías / Accesos Directos:** Distribuidos en una fila horizontal centrada con envoltura de texto adaptativa (`flex flex-wrap items-center justify-center gap-2 w-full` con botones `whitespace-normal`), permitiendo que títulos largos como "Impresoras y Wi-Fi" se adapten sin desbordamientos y preservando la simetría visual.

### Verificación técnica
- `npm test` (`31/31` pruebas aprobadas).
- `npm run build` (`vite build`) y `npm run lint` (`tsc --noEmit`): **0 errores**.

---

## [2026-11-25] · v2.13 Refinamiento UX/UI Móvil: Desactivación de OS secundarios, Subtítulo en 2 líneas, Carrusel Semitransparente, CTAs Uniformes y Cuadrícula 2x3 de Shortcuts (`DiagnosticWizard.tsx`, `HeroSection.tsx`)
### Cambios implementados
- **Desactivación de OS Secundarios (`DiagnosticWizard.tsx`):**
  - Los botones de selección de sistema operativo **Mac**, **Linux** y **Mobile** se muestran desactivados con indicador visual `(Pronto)` y título `"Disponible próximamente"`, manteniendo exclusivamente **Windows** activo por defecto.
- **Optimizaciones de Diseño Móvil (`HeroSection.tsx`):**
  - **Subtítulo:** Ajustado el interlineado y tamaño para asegurar que fluya limpiamente en máximo dos líneas en pantallas móviles.
  - **Controles del Carrusel:** Flechas de navegación e indicadores de progreso actualizados con fondo semitransparente (`bg-slate-900/35 backdrop-blur-md`) para restar peso visual y destacar el contenido fotográfico.
  - **Acciones Principales:** Estandarizados los botones principales (`Iniciar diagnóstico` y `Así funciona`) en una cuadrícula de 2 columnas (`grid grid-cols-2`) de ancho uniforme y centrado.
  - **Accesos Directos ("Ayuda para tu día a día"):** Distribuidos en una cuadrícula de 3 columnas (`grid grid-cols-3`) formando dos filas horizontales centradas que ocupan todo el ancho de la pantalla.

### Verificación técnica
- `npm test` (`31/31` pruebas aprobadas).
- `npm run build` (`vite build`) y `npm run lint` (`tsc --noEmit`): **0 errores**.

---

## [2026-11-25] · v2.12 Optimización de Espaciado y Padding en Hero para Vista Móvil (`HeroSection.tsx`)
### Cambios implementados
- **Optimización de Altura y Espaciado en Móvil (`src/components/HeroSection.tsx`):**
  - Reducidos los paddings exteriores (`pt-4 pb-4` en lugar de `pt-6 pb-6`), gaps de grid y espaciados verticales en la versión móvil, además de ajustar la proporción del carrusel a `aspect-[16/10]` y compactar los botones y textos.
  - Esto garantiza que los botones de acción (`Iniciar diagnóstico`, `Así funciona`) y las micro-garantías ubicadas debajo del carrusel se muestren completos y visibles en la vista inicial de pantallas móviles y tabletas (`Lenovo Tab P12`), sin recortes ni desbordamientos verticales.

### Verificación técnica
- `npm test` (`31/31` pruebas aprobadas).
- `npm run build` (`vite build`) y `npm run lint` (`tsc --noEmit`): **0 errores**.

---

## [2026-11-25] · v2.11 Adición de Sección de Preguntas Frecuentes (FAQ) Estilo Acordeón (`FaqSection.tsx`)
### Cambios implementados
- **Componente FAQ Acordeón (`src/components/FaqSection.tsx`):**
  - Creada la sección interactiva de preguntas frecuentes con animación de apertura/cierre, flechas indicadoras, accesibilidad completa (`aria-expanded`) y diseño sobrio corporativo.
  - Integrada en la página principal (`src/App.tsx`) para resolver dudas comunes sobre seguridad, RustDesk, pagos, tarifas y garantías, reduciendo la fricción en la creación de tickets.

### Verificación técnica
- `npm test` (`31/31` pruebas aprobadas).
- `npm run build` (`vite build`) y `npm run lint` (`tsc --noEmit`): **0 errores**.

---

## [2026-11-25] · v2.10 Actualización de Título de Reclutamiento en Tarjeta de Pie de Página (`LandingSections.tsx`)
### Cambios implementados
- **Actualización de Título en Tarjeta de Reclutamiento:**
  - Cambiado a `"¿Eres especialista certificado en soporte TI? Colabora en nuestra red exclusiva bajo demanda"` para enfatizar el rigor de selección y certificación.

### Verificación técnica
- `npm run lint` (`tsc --noEmit`): **0 errores**.
- `npm run build` (`vite build`): **0 errores**.

---

## [2026-11-25] · v2.9 Integración de Monitoreo de Rendimiento y Errores Frontend (Sentry + Web Vitals)
### Cambios implementados
- **Módulo de Monitoreo Silencioso (`src/services/frontendMonitoring.ts`):**
  - Integrado `@sentry/react` junto con captura global de errores (`window.onerror`), promesas rechazadas (`unhandledrejection`), y Core Web Vitals (`LCP`, `CLS`, `TTFB`, `PageLoad` con `PerformanceObserver`) para el Portal de Clientes y el Centro de Operaciones.
  - Añadidos endpoints BFF en `server.ts` (`POST /api/monitoring/errors` y `POST /api/monitoring/performance`) para procesar y registrar telemetría de rendimiento y errores en tiempo real sin alterar la interfaz de usuario (cumpliendo la regla de interfaz limpia).
  - Inicializado automáticamente al arranque en `src/main.tsx`.

### Verificación técnica
- `npm test` (`31/31` pruebas aprobadas).
- `npm run build` (`vite build`) y `npm run lint` (`tsc --noEmit`): **0 errores**.

---

## [2026-11-25] · v2.8 Actualización de Eyebrow y Subtítulo del Hero (`HeroSection.tsx`)
### Cambios implementados
- **Actualización de Copys en `src/components/HeroSection.tsx`:**
  - Eyebrow cambiado a `"Soporte remoto con IA + Especialistas"`.
  - Subtítulo cambiado a `"Cuéntanos qué ocurre. Nuestro asistente IA te guía gratis con pasos seguros; si necesitas conexión remota, un especialista certificado lo resuelve contigo."`.
  - Ningún otro componente, botón, estilo o carrusel fue modificado.

### Verificación técnica
- `npm run lint` (`tsc --noEmit`): **0 errores**.
- `npm run build` (`vite build`): **0 errores**.

---

## [2026-11-25] · v2.7 Reubicación de CTAs y Micro-Garantías del Hero debajo del Carrusel (`HeroSection.tsx`)
### Cambios implementados
- **Reubicación Quirúrgica en `src/components/HeroSection.tsx`:**
  - Movidos exclusivamente el bloque de botones de acción (`Iniciar diagnóstico →`, `Así funciona ↓`) y las micro-garantías (`Tú decides cada paso`, `Sin contraseñas por chat`, `Desde $15 USD`) desde debajo del párrafo descriptivo hacia directamente debajo del contenedor del carrusel de imágenes con espaciado superior `mt-6`.
  - Conservados intactos todos los estilos, clases CSS, iconos, animaciones, textos, handlers (`onClick`), carrusel, barra superior (`Header.tsx`) y resto de secciones.

### Verificación técnica
- `npm run lint` (`tsc --noEmit`): **0 errores**.
- `npm run build` (`vite build`): **0 errores**.
- Verificación visual en navegador real (Escritorio `1440x900`, Tablet Lenovo Tab P12 `1280x800` / `800x1280` y Móvil `390x844`): alineación limpia debajo del carrusel, `0` errores de consola y `0` desbordamiento horizontal.

---

## [2026-11-21] · v2.6 Remediación Fase 2: Rendimiento, Supabase Completo, Accesibilidad y Limpieza (`AUD-12`–`AUD-22`)
### Cambios implementados
- **Optimización de Peso, Imágenes y Code-Splitting (`src/App.tsx`, `vite.config.ts`, `src/components/HeroSection.tsx`, `src/components/DiagnosticWizard.tsx`):**
  - Purgados **20 archivos de imagen huérfanos** (~8.8 MB): 17 PNG sin referencia en `public/assets/aistudio/` (conservando `image_d9221c48.png`) y 3 JPG residuales en `src/assets/images/`.
  - Convertidos `TechPortalView`, `ConnectionRoom`, `LegalDocsModal` y `AuthModal` a `React.lazy` + `<Suspense>` (con montaje condicional de modales) y configurado `build.rolldownOptions.output.codeSplitting` en `vite.config.ts` (`react-vendor`, `supabase-vendor`, `lucide-vendor`), dejando el entry bundle inicial en **250.69 kB** (gzip 58.09 kB) y eliminando por completo las advertencias de chunks > 500 kB.
  - Añadidas dimensiones explícitas (`width`/`height`) en las imágenes del carrusel (`HeroSection.tsx`) con `loading="eager"` + `fetchPriority="high"` en el slide inicial y `loading="lazy"` en los slides 1–3, más `width={24} height={24} loading="lazy" decoding="async"` en el avatar miniatura de `DiagnosticWizard.tsx`.
- **Sincronización Completa con Supabase y Consumo Real de Créditos IA (`supabase/schema.sql`, `server.ts`, `src/services/supportAdapter.ts`, `src/services/aiService.ts`, `src/components/dashboard/AiWorkforceView.tsx`):**
  - Añadida la tabla `public.enterprise_leads` con RLS (inserción pública controlada y lectura exclusiva para operadores activos/admins), columnas `ticket_code`, `client_name`, `technician_name` en `public.remote_sessions`, y políticas RLS para sincronización de `client_devices`, `remote_sessions` y `audit_logs` por miembros activos.
  - Conectados a Supabase (con fallback transparente a `localStorage`) los ajustes de `organizations`, disponibilidad e invitaciones de `organization_members`, `client_devices`, `remote_sessions`, `ai_agents_config`, `audit_logs` y `enterprise_leads`, además de suscripción Realtime en `ai_agents_config` e hidratación completa al iniciar sesión.
  - Implementado el contador real `recordAiCreditsUsage()` en `server.ts` y `supportAdapter.incrementAiAgentCredits()` para incrementar `ai_agents_config.credits_used` y `organizations.ai_credits_used` en cada llamada a `/api/ai/receptionist`, `/api/ai/report` y `/api/ai/assistant`; diferenciados los 3 agentes en vivo (`En vivo`) de los 3 agentes de hoja de ruta (`Próximamente`) en `AiWorkforceView.tsx`.
  - Eliminado el banner obsoleto de «Persistencia parcial» en `TechPortalView.tsx`.
- **Motor RustDesk, Limpieza de Código y SEO (`server.ts`, `package.json`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/components/AppErrorBoundary.tsx`, `src/index.css`, `src/components/PaymentBrandLogos.tsx`):**
  - Actualizado `/api/rustdesk/official-download` con caché en memoria (30 min), detección de arquitectura macOS Apple Silicon (`aarch64`/`arm64`) vs Intel/Universal y enrutamiento móvil (App Store para iOS y `.apk` oficial para Android).
  - Añadido botón/guía fallback de «Copiar ID» junto a los deep-links `rustdesk://` en `TicketsInboxView.tsx` y `DevicesAndSessionsView.tsx`.
  - Eliminado código muerto: `addonBackup` en `server.ts`, `detectCardNetwork` en `PaymentBrandLogos.tsx`, `.bg-tech-grid` en `src/index.css`, `icon` sin uso en `DAILY_APP_SHORTCUTS` (`HeroSection.tsx`), prop sin uso `relayDomain` (`App.tsx`/`ConnectionRoom.tsx`) y `onOpenPublicPortal` en `DashboardOverview.tsx`.
  - Movidas dependencias de build (`vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`) a `devDependencies`, limpiado `tsconfig.json`, añadido favicon SVG + meta tags SEO/OpenGraph/Twitter + JSON-LD `WebApplication` en `index.html`, unificado `<AppErrorBoundary>` en `main.tsx` ocultando stack/mensajes técnicos en producción y liberando `window.onerror`/`onunhandledrejection` al completar el arranque.
- **Accesibilidad WCAG AA, Teclado y Reseteo Multi-Organización (`Header.tsx`, `CookieConsentBanner.tsx`, `DashboardSidebar.tsx`, `TechPortalView.tsx`, `DiagnosticWizard.tsx`, `AuthModal.tsx`, `LandingSections.tsx`, `Footer.tsx`, `TicketChatPanel.tsx`, `TicketsInboxView.tsx`, `DevicesAndSessionsView.tsx`, `WorkforceDispatchView.tsx`):**
  - Añadido cierre por tecla `Escape` en menú móvil (`Header`), banner de cookies (`CookieConsentBanner`), drawer lateral (`DashboardSidebar`) y popover de notificaciones (`TechPortalView`).
  - Extraídos los botones de enlaces legales fuera de `<label>` y añadidos pares `htmlFor`/`id` explícitos en todos los formularios de registro, cookies, invitación de freelancers y modal `+ Nueva solicitud`.
  - Elevado el contraste de placeholders, separadores e íconos sobre fondos claros (`text-slate-500` / `placeholder:text-slate-500`) y oscuros (`text-slate-300`), añadido `aria-hidden="true"` a numerales decorativos en `LandingSections.tsx`, derivadas dinámicamente las iniciales del operador con `getInitials(...)` en lugar de `AD` fijo, y reseteados filtros locales al cambiar de organización.

### Verificación técnica
- `npm run build` (`vite build`): **0 errores y 0 advertencias de chunks > 500 kB** (`index` 250.69 kB / gzip 58.09 kB, `TechPortalView` 259.93 kB, `ConnectionRoom` 53.82 kB, `AuthModal` 20.43 kB, `LegalDocsModal` 19.39 kB, `react-vendor` 425.68 kB, `supabase-vendor` 216.00 kB, `lucide-vendor` 15.92 kB).
- `npm test`: **13/13 pruebas unitarias aprobadas**.
- `compile_applet` y `lint_applet` (`tsc --noEmit`): **0 errores**.

---

## [2026-11-21] · v2.5 Remediación Fase 1: Seguridad, Supabase, Pagos, Aislamiento Multi-Tenant y Flujo Comercial (`AUD-01`–`AUD-11`, `AUD-16`, `AUD-17`)
### Cambios implementados
- **Desbloqueo de Supabase y Tokens Criptográficos (`supabase/schema.sql`, `src/utils/ticketLogic.ts`, `src/services/supportAdapter.ts`):**
  - Movida la guarda `if tg_op = 'INSERT' ... return new; end if;` desde el bloque anónimo `do $$ ... end $$;` al inicio de la función trigger `public.audit_ticket_security_changes()`, evitando `record "old" is not assigned yet` y permitiendo la ejecución limpia de la migración e inserciones.
  - Añadidas la política RLS `tickets_insert_org_member` para operadores autenticados (`consent_accepted = false`) y la RPC controlada `SECURITY DEFINER` `public.update_own_ticket_as_authenticated(...)` (con `grant execute ... to authenticated`) para permitir que usuarios autenticados actualicen o anonimicen únicamente sus propios tickets sin abrir `UPDATE` directo sobre columnas de pago/estado.
  - Corregido `createTicketFromDraft` en `src/utils/ticketLogic.ts` para dejar `options?.randomFn` estrictamente `undefined` en tiempo de ejecución, garantizando tokens `client_session_token` de **64 caracteres hexadecimales** generados con `crypto.getRandomValues(new Uint8Array(32))` compatibles con RLS `tickets_insert_public`.
  - Actualizados los 7 tokens semilla en `SEED_TICKETS` a cadenas hexadecimales válidas de 64 caracteres.
- **Blindaje de Endpoints de Pagos, IA y Salud (`server.ts`, `src/services/aiService.ts`):**
  - Exigida validación de `sessionToken` (`x-ticket-token` o query/body) comparada en tiempo constante (`crypto.timingSafeEqual`) en `GET /api/payments/stripe/verify-session`, `POST /api/payments/paypal/capture-order`, `create-session` y `create-order`.
  - Protegidos `/api/ai/report` y `/api/ai/assistant` con verificación de JWT de Supabase Auth (`Authorization: Bearer <token>` + verificación de membresía activa / rol técnico o admin cuando Supabase está configurado), adjuntando el token desde `aiService.ts`.
  - Encapsuladas todas las entradas de usuario en bloques `<user_input>...</user_input>` con instrucciones explícitas anti-prompt-injection en `/api/ai/receptionist`, `/api/ai/report` y `/api/ai/assistant`.
  - Configurado `app.set('trust proxy', Number(process.env.TRUST_PROXY || 1))` de forma incondicional y ocultado el detalle interno `geminiStatus` en `/api/health` cuando `NODE_ENV === 'production'`.
- **Aislamiento Multi-Tenant, Privacidad de Sesión, ARCO y Perfiles (`src/App.tsx`, `src/services/supportAdapter.ts`, `src/components/TechPortalView.tsx`, `src/components/AuthModal.tsx`):**
  - Definida la constante `PUBLIC_PORTAL_ORG_ID` en `App.tsx` para vincular siempre el portal público a HQ, reservando `activeOrgId` exclusivamente para el panel `/dashboard`.
  - Eliminado el fallback global de agentes IA entre organizaciones (`tenantAiAgents.length > 0 ? tenantAiAgents : aiAgents`); cada organización inicializa sus propias copias aisladas con UUIDs propios vía `supportAdapter.ensureOrganizationAiAgents`.
  - Eliminado el fallback `tickets[0]` en `activeTicket` y el botón `Abrir sala {tickets[0].ticket_code}` en la vista de ticket no encontrado.
  - Migrado `rs365_room_tokens_v1` a `window.sessionStorage` (limpiando claves legadas en `localStorage`) y omitido `client_session_token` al serializar `rs365_v1_tickets_v5` en `localStorage`.
  - Convertido `handleDeletePersonalData` en `async` para esperar la anonimización completa de tickets antes de cerrar sesión (`handleSignOutAccount`).
  - Hidratado el perfil real desde `public.profiles` en `AuthModal.tsx` tras `signInWithPassword` en lugar de usar `role: 'client'` / `birth_date` fijos, y eliminado el hardcode de aceptación legal en el modal interno `+ Nueva solicitud` de `TechPortalView.tsx` (`consent_accepted: false`).
- **Flujo Comercial, Accesos Directos, Checkout y Copy Legal (`src/components/HeroSection.tsx`, `src/components/DiagnosticWizard.tsx`, `src/components/ConnectionRoom.tsx`, `src/components/LegalDocsModal.tsx`):**
  - Al pulsar cualquier plan (`Express $15`, `Optimización $29`, `Avanzado $39`, `Pyme Esencial $39/mes`, `Pyme Corporativo $79/mes`), se abre el chat del `DiagnosticWizard` con banner visible del plan preseleccionado y bloqueo `userLockedTier: true` para que el triaje IA sugiera sin sobrescribir la tarifa elegida.
  - Enviadas respuestas estructuradas `followUpAnswers` en `handleRefineWithAnswers`.
  - Corregido el mapeo de **OneDrive** a `Errores de Microsoft 365 y Outlook` ($15) y **Wi-Fi, red e impresoras** a `Problemas de Wi-Fi o red` ($15), reservando `VPN y acceso remoto` ($39) para VPN corporativa/RDP.
  - Eliminado `window.open(...)` en `ConnectionRoom.tsx` para entornos embebidos (reemplazado por enlace seguro `<a target="_blank" rel="noopener noreferrer">`), habilitado el complemento `+$12 USD` en todos los servicios `one_time`, mostrado el importe total real en el badge `PAGADO · USD $XX.00`, sustituido `"Compartir enlace de $5 USD"` por `"Compartir enlace de soporte"` y unificada la redacción de la Garantía de resolución con reembolso en Hero, Wizard, Sala de Conexión y Modal Legal.

### Verificación técnica
- `npm run lint` (`tsc --noEmit`), `npm test` (`13/13`), y `npm run build` (`vite build`) verificados con `0` errores.

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
