# 00 · FACTORY STANDARDS — Reglas Universales de Ingeniería (Software Factory)

> **Alcance:** Estándar maestro **100 % reutilizable y agnóstico de dominio** para todas las aplicaciones construidas en la Software Factory. Define la arquitectura base, seguridad, calidad visual, cumplimiento legal y criterios de terminado (*Definition of Done*).  
> **Nota:** El contexto comercial, branding y reglas específicas de cada producto viven exclusivamente en `.agent/rules/01-project-context.md`.

---

## 1. Stack Técnico de Referencia

Toda aplicación de la fábrica parte de esta base homogénea para maximizar reutilización y mantenimiento:

- **Frontend:** **React 19** + **TypeScript** (`strict: true`, verificado con `tsc --noEmit`) + **Vite 8** + **Tailwind CSS v4** (`@tailwindcss/vite`, `@import "tailwindcss";` en la hoja global).
- **Backend / BFF:** **Express** en `server.ts` (puerto `3000` en desarrollo montando `vite.middlewares` con `tsx server.ts`; puerto configurable vía `PORT` en producción).
- **Base de Datos y Realtime:** **Supabase** (**PostgreSQL + Row Level Security (RLS) + Realtime + Auth**) con adaptador limpio y modo de resiliencia local cuando las credenciales no estén presentes en desarrollo.
- **Inteligencia Artificial:** **Gemini API** (`@google/genai`) ejecutada **exclusivamente en servidor (`server.ts`)** con el modelo oficial **`gemini-2.5-flash`** y **fallback determinista** ante ausencia de `GEMINI_API_KEY` o indisponibilidad temporal del proveedor.
- **Empaquetado y Despliegue:** **`Dockerfile` multi-etapa** (etapa de compilación aislada + imagen final ligera de ejecución) y `.dockerignore` estricto.

---

## 2. Arquitectura Modular y Escalabilidad

### 2.1 Separación `src/core/` vs `src/modules/`
- **`src/core/` (Infraestructura Reutilizable de la Fábrica):**
  - Cliente y utilidades de **Supabase** (sesión, sincronización, manejo de errores).
  - Integraciones genéricas de **pagos** (clientes HTTP a endpoints BFF, componentes de checkout PCI-DSS).
  - Primitivas **legales y de privacidad** (validación +18, consentimiento de cookies, derechos ARCO, modales legales).
  - **Auditoría y monitoreo** (registro estructurado de eventos, `ErrorBoundary`, telemetría silenciosa).
  - **UI base** (componentes primitivos accesibles, transiciones, helpers de layout).
  - **Banderas de funcionalidad** en `src/config/features.ts`.
- **`src/modules/` (Lógica Específica del Dominio):**
  - Flujos de negocio, entidades, vistas, reglas tarifarias y servicios exclusivos del producto actual.
  - Los módulos pueden consumir `src/core/`, pero **`src/core/` nunca debe importar lógica específica de `src/modules/`**.

### 2.2 Feature Flags y Standby No Destructivo
- Toda funcionalidad mayor, módulo beta o línea de negocio secundaria debe estar gobernada por una bandera explícita en **`src/config/features.ts`**.
- **Regla inmutable:** **Queda estrictamente prohibido borrar tablas, columnas, políticas RLS o esquemas SQL para pausar o desactivar una funcionalidad.** Las pausas se aplican únicamente mediante *feature flags* (standby no destructivo) preservando integridad de datos y reversibilidad inmediata.

### 2.3 Rendimiento y Carga Diferida (`Code Splitting`)
- Todas las **vistas privadas, paneles administrativos, salas operativas y modales pesados** deben cargarse con **`React.lazy()` + `<Suspense>`** y montaje condicional.
- Mantener el bundle inicial liviano, evitando incluir SDKs administrativos o vistas de backoffice en la carga crítica del portal público.

---

## 3. Seguridad, Datos y Base de Datos

1. **Identificadores UUID v4 RFC 4122:**
   - Todos los registros semilla, migraciones SQL, payloads y entidades persistidas deben usar **UUID v4 RFC 4122** válidos.
   - **Prohibido** usar IDs legibles en texto plano (`'org-1'`, `'user-demo'`, `'item-1'`) en datos semilla o tablas relacionales.
2. **Aislamiento Multi-Tenant con RLS desde el Día 1:**
   - Toda tabla de negocio debe incluir `organization_id` (o el identificador de inquilino equivalente) y tener **Row Level Security (`ENABLE ROW LEVEL SECURITY`)** habilitado con políticas explícitas desde la primera migración.
   - Las operaciones críticas de asignación o cambio de estado deben ejecutarse mediante funciones RPC atómicas y controladas en PostgreSQL.
3. **Tokens Criptográficos Seguros:**
   - Todo token de sesión, invitación o acceso privado debe generarse con **`crypto.getRandomValues`** (mínimo **32 bytes / 64 caracteres hexadecimales** en cliente/WebCrypto o `crypto.randomBytes(32)` en servidor).
   - **Estrictamente prohibido** usar `Math.random()`, `Date.now()` o generadores no criptográficos para tokens o secretos.
   - Comparar tokens sensibles en servidor utilizando comparación en tiempo constante (`crypto.timingSafeEqual`).
4. **Higiene de Secretos (`VITE_*`):**
   - **Cero secretos en variables `VITE_*`.** Claves privadas de IA, pasarelas de pago, SMTP, webhooks o `service_role` residen exclusivamente en `process.env` del servidor (`server.ts`).
   - Documentar únicamente nombres de variables (sin valores secretos) en la plantilla de entorno del repositorio.
5. **Validación en Servidor para IA, Pagos y Acciones Privilegiadas:**
   - Todo endpoint de IA privilegiado, captura/verificación de pagos o mutación administrativa en `server.ts` debe validar **JWT de sesión / token autorizado** en servidor y aplicar saneamiento contra *prompt injection* en entradas de usuario.
   - El servidor es la fuente de verdad de precios, estados de pago y permisos (RBAC *fail-closed*).
6. **Rutas Dinámicas Seguras (Prohibido Fallback a `items[0]`):**
   - Ante un identificador inexistente, inválido o sin autorización en rutas dinámicas (ej. `/recurso/:id`), la aplicación **debe renderizar una pantalla explícita de "No encontrado" o "Acceso denegado"**.
   - **Estrictamente prohibido** hacer fallback silencioso a `items[0]` o mostrar registros de otro usuario/organización.

---

## 4. UI/UX, Accesibilidad y Cumplimiento Legal

### 4.1 Diseño Responsivo y Activos
- **Mobile-first estricto:** `0 px` de desbordamiento horizontal (`scrollWidth <= innerWidth`) validado en escritorio, tablet y móvil.
- **Gestión de activos:** Referenciar imágenes y recursos estáticos mediante **imports ES** (para empaquetado optimizado por Vite) o la carpeta **`public/`**. Prohibido depender de rutas rotas o temporales.
- **Rendimiento visual:** Usar **`loading="lazy"`** y `decoding="async"` en imágenes y recursos no críticos (debajo del pliegue), reservando `loading="eager"` únicamente para el elemento visual LCP principal y declarando dimensiones explícitas (`width`/`height`) para prevenir CLS.
- **Cero botones muertos:** Ningún botón, enlace o control interactivo puede quedar sin manejador real o apuntando a una acción vacía.

### 4.2 Accesibilidad (WCAG AA)
- Contraste mínimo **4.5:1** en texto normal y **3:1** en texto grande o controles sobre fondos claros y oscuros.
- Navegación completa por teclado con indicadores `:focus-visible`, cierre con tecla `Escape` en modales/drawers/popovers, pares explícitos `htmlFor`/`id` en formularios y atributos `alt` descriptivos (`aria-hidden="true"` en íconos decorativos).
- Respetar `@media (prefers-reduced-motion: reduce)` en todas las animaciones.

### 4.3 Cumplimiento Legal, Privacidad y FinTech
- **Bloqueo estricto +18 años:** Todo flujo de registro o contratación debe validar fecha de nacimiento verificando edad mínima de **18 años** antes de persistir datos.
- **Consentimiento explícito sin pre-marcado:** Todas las casillas legales (Términos, Privacidad, Políticas) y de marketing deben iniciar **desmarcadas por defecto (`false`)**, persistiendo evidencia auditable (`terms_accepted_at`, versión legal aceptada y estado de verificación de edad).
- **Banner de cookies:** Consentimiento granular con bloqueo previo a scripts o rastreadores no esenciales.
- **Derechos ARCO:** Mecanismos funcionales accesibles para el usuario de **portabilidad (exportar datos en JSON)** y **eliminación/anonimización** de datos personales.
- **Transparencia de IA:** Toda respuesta, resumen o recomendación generada por IA debe incluir un etiquetado claro y visible que informe al usuario sobre su origen automatizado.
- **Cumplimiento PCI-DSS:** Procesar pagos con tarjeta exclusivamente mediante checkout hospedado o tokenización oficial del proveedor. **Nunca** capturar, almacenar ni registrar números de tarjeta (PAN), CVC ni fechas de vencimiento en el estado de React, logs o base de datos propia.

---

## 5. Quality Gates (*Definition of Done*)

Ninguna iteración, cambio funcional o entrega puede declararse terminada hasta cumplir **el 100 % de estas compuertas**:

1. **Tipado y Lint:** `npm run lint` (`tsc --noEmit` / linter configurado) finaliza con **0 errores**.
2. **Pruebas Automatizadas:** `npm test` finaliza con el **100 % de las pruebas en verde**.
3. **Compilación de Producción:** `npm run build` genera un build completamente limpio sin errores.
4. **Verificación Visual Multi-Dispositivo:** Validación en **escritorio y móvil** confirmando renderizado correcto, `0 px` de desbordamiento horizontal y `0` errores críticos en consola.
5. **Trazabilidad en Memoria del Proyecto:** Actualización obligatoria de `docs/egm/03_SESSION_CHANGELOG.md` documentando qué se cambió y los resultados de verificación.
