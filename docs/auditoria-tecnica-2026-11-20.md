# Auditoría técnica integral — Remote-Support

**Fecha:** 20 de noviembre de 2026
**Repositorio:** `ricardovegadev/Remote-Support`
**Rama revisada:** `main`
**Commit revisado:** `fc0bc39` (`feat: implement payment gateway and refine project setup`)
**Tipo de revisión:** análisis estático del código y del esquema versionado. No se modificó el producto.

## 1. Resumen ejecutivo

Remote-Support es una aplicación web en español para vender soporte informático remoto. Tiene una experiencia pública de diagnóstico y creación de tickets, una sala por ticket con pagos y consentimiento, y un portal de operaciones para técnicos. La base técnica es React 19 + TypeScript + Vite/Tailwind, un servidor Express en `server.ts`, Supabase para autenticación/datos/realtime, Gemini para funciones de IA, RustDesk para la conexión y Stripe/PayPal para cobros.

El proyecto ya tiene bastante trabajo funcional: catálogo de servicios, flujos guiados, estados de tickets, portales operativos, persistencia híbrida, documentos legales, carga de RustDesk y pagos alojados. El principal problema es que la seguridad y la lógica de negocio dependen demasiado del navegador y de políticas de base de datos permisivas. La interfaz puede parecer un servicio real aun cuando funciona con datos locales y autenticación/pago de demostración.

### Dictamen

**No recomiendo habilitar el servicio para clientes reales con el esquema y las rutas actuales.** Antes del lanzamiento deben corregirse los controles de acceso y privilegios en Supabase, validar pagos en el servidor y separar de forma explícita el modo demo del modo real. Estos riesgos afectan la confidencialidad de tickets y chats, el control del portal técnico y los ingresos.

| Prioridad | Riesgo | Efecto posible |
|---|---|---|
| **Crítica** | Políticas RLS permiten acceso amplio a registros sin organización | Exposición o modificación de tickets y conversaciones de clientes |
| **Crítica** | El usuario puede asignarse rol privilegiado mediante metadatos/perfil | Acceso administrativo no autorizado y cruce de organizaciones |
| **Crítica** | RPC de asignación no valida quién llama ni la organización | Asignaciones indebidas y cambios de estado de tickets |
| **Crítica** | El servidor marca como pagado cuando faltan credenciales de pago | Servicio gratuito accidental en producción |
| **Alta** | El importe y el ticket se aceptan desde el navegador; la verificación no los vincula | Cobros alterados y reutilización de pagos para habilitar otros tickets |
| **Alta** | El modo demo autentica sin validar identidad | Portal operativo visible sin Supabase configurado |
| **Alta** | APIs de IA sin límites de uso ni validación suficiente | Abuso de cuota/costo y respuestas defectuosas |
| **Media** | Fallback de datos a `localStorage` parece persistencia real | Pérdida de tickets, datos inconsistentes y confusión de soporte |
| **Media** | Afirmaciones comerciales y SLA no están respaldados por mecanismos visibles | Riesgo de confianza, conversión y reclamaciones |

## 2. Alcance y método

Revisé la estructura del repositorio, los documentos EGM/ADR del proyecto, dependencias y scripts, servidor, cliente React, lógica de tickets, adaptador de persistencia, cliente Supabase, esquema SQL/RLS y contenido público. También comprobé el estado de Git: `main` estaba alineada con `origin/main` en el commit indicado.

Este informe es una revisión del código disponible en Git. No accedí a la consola ni a la base Supabase de producción, no recibí secretos ni configuración real, no inspeccioné pagos reales, no ejecuté el producto contra cuentas de prueba y no corrí build, tests ni análisis dinámico. Por eso, los hallazgos sobre rutas y políticas describen el comportamiento que se desprende del código, y su explotación debe confirmarse en un entorno controlado antes de cerrar cada incidencia. No se comprobó cumplimiento legal, PCI DSS ni una certificación de técnicos.

## 3. Arquitectura actual

```text
Navegador (React / Vite)
  ├─ Asistente de diagnóstico ──> Express /api/ai/* ──> Gemini o fallback
  ├─ Checkout ──────────────────> Express /api/payments/* ──> Stripe / PayPal
  ├─ Descarga RustDesk ─────────> Express ──> GitHub Releases
  └─ Supabase JS (anon key)
       ├─ Auth
       ├─ Postgres con RLS
       └─ Realtime

Cuando Supabase no está configurado: algunas funciones pasan al almacenamiento local
y al modo demo del portal.
```

El cliente concentra estado global, navegación y múltiples handlers en `src/App.tsx` (más de 1.100 líneas); la persistencia, seeds, sync y lógica de compatibilidad con el esquema están juntas en `src/services/supportAdapter.ts` (más de 2.200 líneas). Varias vistas también son grandes. Esta organización permite iterar rápido, pero aumenta el costo de entender cambios y hace difícil probar por separado permisos, pagos y transiciones de tickets.

## 4. Hallazgos detallados

### SEC-01 — RLS deja datos de tickets y chats fuera del aislamiento esperado

**Severidad: Crítica.** En `supabase/schema.sql`, la política `tickets_org_member_all` concede todas las operaciones cuando `organization_id is null` (política desde línea 547). Las nuevas solicitudes de clientes particulares pueden no tener organización. En PostgreSQL, las políticas permisivas se combinan con OR: las políticas de sala que comparan código y token no restringen la política amplia. La política equivalente `ticket_messages_org_member_all` (línea 570) hereda el acceso a mensajes si el ticket padre tiene organización nula. `remote_sessions_org_scoped` repite el patrón para sesiones sin organización (línea 606).

**Impacto:** un cliente anónimo podría leer o cambiar tickets sin organización y leer mensajes de conversaciones ajenas, según los privilegios concedidos a `anon`/`authenticated` en el proyecto. También puede interferir con el estado de soporte.

**Corrección recomendada:** eliminar la condición de acceso general para `organization_id is null`; separar políticas por acción y rol; exigir membresía autenticada para operaciones de operador y una autorización de cliente con token para cada fila de sala. Para la sala pública, considerar un endpoint servidor que valide el token y exponga solo los campos necesarios. Probar políticas con usuarios `anon`, cliente A, cliente B, técnico de otra organización y administrador.

### SEC-02 — Escalada a administrador desde la cuenta propia

**Severidad: Crítica.** `profiles_self_select_update` permite `FOR ALL` con la única condición `id = auth.uid()` (líneas 532–535); no limita qué columnas puede modificar la persona. Además, el trigger `handle_new_user()` copia el campo `role` directamente de `raw_user_meta_data` (línea 440). Los metadatos de registro los controla el cliente, por lo que no deben decidir roles autorizados.

La función `is_org_member()` trata cualquier perfil con rol `admin` como miembro de todas las organizaciones. Por eso, si el rol puede cambiarse por autoedición o registro, la escalada potencial cruza el límite de una sola empresa.

**Corrección recomendada:** asignar `client` como rol exclusivamente en el servidor al crear la cuenta; quitar `role` de los metadatos de usuario; prohibir actualizar el rol desde la política de perfil; gestionar promociones mediante función administrativa restringida a `service_role` o a un administrador verificado; separar el rol global de los roles por organización. Revisar también roles y grants en `organization_members`.

### SEC-03 — La RPC de asignación no verifica autorización del solicitante

**Severidad: Crítica.** `claim_ticket_atomically(p_ticket_id, p_tech_id)` está marcada `SECURITY DEFINER` (línea 353) y no comprueba `auth.uid()`, el rol del usuario, su pertenencia a la organización, ni que `p_tech_id` sea la identidad que llama. Actualiza un ticket disponible con el ID suministrado y lo pasa a `in_progress`; el `where` tampoco exige pago confirmado.

**Impacto:** si el rol anónimo o cualquier usuario puede ejecutar la función (lo habitual para funciones PostgreSQL salvo revocación explícita), podría reclamar tickets fuera de su organización y avanzarlos sin pago, usando una identidad técnica distinta. La accesibilidad exacta depende de los grants efectivos de Supabase, que no se pudieron consultar.

**Corrección recomendada:** revocar `EXECUTE` de `PUBLIC`/`anon`; concederlo solo al rol autorizado. Derivar el técnico desde `auth.uid()` en lugar de aceptar una identidad arbitraria; verificar rol, membresía, estado del técnico, organización, pago y transición válida dentro de la misma transacción.

### PAY-01 — Credenciales ausentes activan pagos ficticios verificados

**Severidad: Crítica.** En `server.ts`, Stripe devuelve `success: true`, `mode: 'sandbox'` y `verified: true` cuando no existe `STRIPE_SECRET_KEY` (líneas 956–964). El cliente interpreta eso como pago exitoso y llama a `onConfirmPayment` (`ConnectionRoom.tsx`, flujo cerca de líneas 420–434). PayPal también genera una orden `PAYPAL_SANDBOX_...` y luego la captura de prueba devuelve `verified: true` (`server.ts`, líneas 1084–1092 y 1183–1200). El cliente finalmente marca el ticket como pagado mediante `supportAdapter.confirmPaymentAndReady()` (`supportAdapter.ts`, líneas 1968–1985).

**Impacto:** si se despliega la aplicación sin credenciales o con configuración incompleta, cualquier usuario puede habilitar una sesión sin pagar. Que el mensaje muestre “sandbox” no evita el desbloqueo.

**Corrección recomendada:** modo sandbox explícito, imposible de activar por ausencia accidental de credenciales y bloqueado en producción por configuración. En producción, fallar cerrado: sin gateway configurado, no crear checkout ni marcar tickets pagados. No tratar una respuesta de demo como evidencia financiera.

### PAY-02 — Monto, ticket y confirmación de pago no quedan enlazados en servidor

**Severidad: Alta.** Las rutas de checkout usan `amountUsd` enviado desde el navegador y aceptan cualquier valor positivo antes de aplicar un mínimo de 0,50 USD para Stripe. No vuelven a consultar el ticket ni calculan su precio a partir de un catálogo confiable (`server.ts`, rutas desde líneas 944 y 1072). La ruta `verify-session` devuelve el ticket de metadata, pero la interfaz solo mira `verified` y no compara `ticketCode` con el ticket abierto (`ConnectionRoom.tsx`, aprox. líneas 182–215 y 299–316). PayPal captura una `orderId` y devuelve éxito si la captura se completa, sin comprobar desde el servidor importe esperado, referencia de ticket ni moneda contra la orden original. La función del adaptador que marca un ticket como pagado acepta el cambio de estado como una actualización genérica del cliente.

**Impacto:** un comprador podría intentar pagar menos del precio publicado, y un pago válido podría reutilizarse para habilitar un ticket distinto si obtiene su identificador de sesión/orden.

**Corrección recomendada:** crear una orden vinculada a ticket en servidor; calcular el precio desde el catálogo del servidor; almacenar gateway, importe, moneda, ticket y estado; verificar de nuevo todos esos datos en callback/webhook antes de marcar pagado. Hacer idempotente la confirmación y no permitir que el navegador escriba directamente `payment_status = 'paid'`.

### SEC-04 — El portal técnico trata el modo sin Supabase como autenticado

**Severidad: Alta.** En `TechPortalView.tsx`, cuando Supabase no está configurado, el estado inicial es `authenticated` salvo que exista una marca de cierre de sesión local (líneas 170–183); si `sessionStorage` falla, también se autentica. El formulario demo acepta correo/contraseña de longitud mínima y luego marca autenticado sin verificar credenciales (líneas 393–397). Es posible entrar con el botón demo (`handleEnterLocalDemoMode`).

**Impacto:** el portal y sus datos de ejemplo no están protegidos por identidad real. Esto puede confundirse con producción si faltan variables de entorno.

**Corrección recomendada:** mostrar una demo aislada, claramente marcada y solo con datos sintéticos; nunca presentarla como inicio de sesión real. Para producción, impedir el acceso si Auth/DB no están configurados y emitir un estado de despliegue “no listo”. Separar operadores de clientes y aplicar autorización también en servidor/RLS; esconder la vista con React no es una barrera de seguridad.

### AI-01 — Endpoints de IA públicos, con datos sin validación suficiente y sin control de abuso

**Severidad: Alta.** `/api/ai/receptionist`, `/api/ai/report` y `/api/ai/assistant` aceptan solicitudes sin autenticación ni rate limit (desde líneas 587, 740 y 826). El cuerpo se limita a 1 MB, pero los campos de texto y el número/contenido de `followUpAnswers` no tienen topes concretos antes de enviarse a Gemini. Cada solicitud puede ejecutar reintentos automáticos.

**Impacto:** abuso de cuota/costo, spam, latencia y envío de nombres, descripción del problema o notas de soporte a un proveedor externo. El prompt de reporte usa valores del navegador y no comprueba que el ticket exista o que quien solicita pueda acceder a él.

**Corrección recomendada:** límite de peticiones por IP/usuario y cuota por organización; validar tipos, enumeraciones, longitud máxima y cantidad de elementos; verificar identidad y acceso al ticket para informes; informar de forma comprensible qué datos se envían a Gemini; definir retención y política de minimización. Aplicar timeout y límites de concurrencia.

### SEC-05 — URL de retorno de pago se construye con datos de la solicitud

**Severidad: Media.** `getPublicBaseUrl()` acepta cualquier `Origin` que parezca una URL (`server.ts`, líneas 882–889), y después usa `x-forwarded-host`/`host` si no hay variable `APP_URL` confiable (aprox. líneas 897–905). Esos valores forman `success_url` y `cancel_url` del checkout.

**Impacto:** un checkout podría devolver al usuario a un dominio no previsto. Es un vector de phishing/confusión y puede exponer identificadores de sesión en una URL ajena.

**Corrección recomendada:** requerir una URL canónica por entorno (`APP_URL`); validar contra una lista permitida y no derivar el host desde encabezados controlables para redirecciones de pago.

### DATA-01 — Persistencia local silenciosa da una impresión falsa de sincronización

**Severidad: Media.** El cliente inicializa y guarda colecciones desde `localStorage`; el modo local se activa si Supabase no está configurado (`supabaseClient.ts` y `supportAdapter.ts`). Hay fallback local incluso cuando operaciones remotas fallan o el esquema no coincide; la interfaz usa el mismo tipo de datos y varias acciones siguen funcionando. La app puede aparentar haber creado o actualizado un ticket aunque el dato solo exista en ese navegador.

**Impacto:** el cliente o el técnico pueden perder solicitudes al cambiar de dispositivo/navegador; cambios locales y remotos pueden divergir; soporte no puede recuperar datos que nunca llegaron al servidor. `localStorage` tampoco es un lugar adecuado para datos personales o tokens de sesión de larga duración frente a XSS o dispositivos compartidos.

**Corrección recomendada:** distinguir UI/estado demo y producción; mostrar persistentemente “modo local: no sincronizado”; no ofrecer acciones de producción en fallback silencioso; usar cola de reintentos con estado visible, confirmación servidor y reconciliación. Limitar los datos almacenados y limpiar por política explícita.

### DATA-02 — Herramientas de recuperación borran todo el almacenamiento web

**Severidad: Media.** La pantalla global de diagnóstico en `index.html` borra `localStorage` y `sessionStorage` al pulsar “Limpiar datos locales y reiniciar” (líneas 78–79); `src/main.tsx` repite el borrado en los manejadores de error (líneas 58–59 y 134–135). Esto elimina todos los datos del origen, no solo caché del producto: tickets demo/locales, preferencias, consentimientos y posiblemente otros datos de aplicaciones que compartan el mismo dominio.

**Corrección recomendada:** borrar solo claves propias de Remote-Support, explicar qué se eliminará y ofrecer exportación antes de borrar. Preferir invalidar caché/versiones concretas y recargar.

### OPS-01 — No hay protección base visible para disponibilidad y endurecimiento HTTP

**Severidad: Media.** En el servidor se ve `express.json({ limit: '1mb' })` (línea 515), pero no se observan límites por ruta/usuario, `helmet`, política de origen o limitación de solicitudes. El servidor escucha en `0.0.0.0` (línea 1280). En `vite.config.ts`, `allowedHosts: true` desactiva el filtro de host para servidor de desarrollo/vista previa (línea 25), algo que conviene restringir al entorno proxy previsto.

**Corrección recomendada:** añadir encabezados de seguridad (CSP diseñada para Stripe/Supabase y otras integraciones), límites de tasa, timeouts, límites específicos por ruta, manejo de errores centralizado, lista de hosts/orígenes y configuración de proxy explícita. Confirmar que la publicación no expone el servidor Vite en producción.

### UX-01 — El modelo de navegación y la recuperación de errores pueden confundir

**Severidad: Media.** Se utilizan rutas propias (`/sesion/:code`, `/portal`, `/dashboard`) con navegación mediante History API; las rutas de servidor en producción retornan la SPA y el cliente interpreta la ruta. El estado inicial del cliente se hidrata desde datos locales y el flujo híbrido puede mostrar información demo/local como si estuviera sincronizada. Además, el error global muestra detalles técnicos al usuario y la acción de recuperación tiene un efecto destructivo amplio (SEC/DATA-02).

**Recomendaciones UX:** dar estados visibles y distintos para “guardado”, “sin conexión”, “demo” y “pago confirmado”; explicar qué significa cada etapa; conservar el código del ticket cuando hay errores; usar mensajes accionables sin revelar mensajes internos ni IDs técnicos. En formularios largos, preservar borrador y progreso tras recarga.

### UX-02 — Revisar accesibilidad en flujos complejos

**Severidad: Media / por validar visualmente.** Hay señales positivas: labels/ARIA en varias zonas, foco visible global, soporte a `prefers-reduced-motion`, textos en español y componentes de iconos. Sin embargo, no hay evidencia de una auditoría WCAG completa. El flujo incluye asistente conversacional, pasos, selector de planes, checkout, modales y tablero de datos, donde debe validarse orden de foco, anuncios de errores/estados, contraste real, zoom al 200%, teclado, lector de pantalla y tamaños táctiles. El scroll del sidebar está visualmente oculto en CSS, lo que puede reducir la indicación de contenido desplazable.

**Recomendación:** hacer pruebas manuales con teclado y lector de pantalla y automatizar chequeos de accesibilidad en páginas críticas. Tratar las declaraciones internas de “WCAG AA” como objetivo hasta contar con evidencia reproducible.

### BIZ-01 — Claims comerciales, descuento y SLA requieren evidencia operativa

**Severidad: Media (confianza/compliance comercial).** La web afirma cobertura 24/7, soporte “en minutos”, técnicos certificados, SLA garantizado y descuentos comparativos (por ejemplo `LandingSections.tsx`, líneas 129, 173, 212, 610 y 804; `HeroSection.tsx`, aprox. 343). El código contiene tarjetas de planes y timers/estimaciones, pero no se encontró en la revisión un mecanismo visible que mida cobertura real, valide credenciales profesionales, garantice los tiempos anunciados o pruebe el precio de referencia del descuento. Esto no demuestra que las promesas sean falsas; significa que no quedan respaldadas por el repositorio revisado.

**Recomendación:** publicar solo promesas que el equipo pueda cumplir y medir; definir SLA (zona horaria, inicio del reloj, horario cubierto, exclusiones y compensación), evidencia de certificaciones, condiciones de los precios anteriores y cómo se aplican descuentos/referidos. Si no hay operación 24/7, reemplazar “cobertura” por disponibilidad real de recepción de solicitudes.

### ARCH-01 — Gran concentración de responsabilidades y reglas repetidas

**Severidad: Media (mantenibilidad).** `App.tsx`, `supportAdapter.ts`, `ticketLogic.ts`, `DiagnosticWizard.tsx` y `LandingSections.tsx` combinan muchas responsabilidades. Las reglas de precios/categorías aparecen en cliente, servidor, SQL y textos comerciales. El adaptador intenta tolerar columnas ausentes eliminando campos y reintentando; eso ayuda a que una migración antigua no rompa la pantalla, pero puede esconder que el esquema de producción está atrasado.

**Recomendación:** separar dominio, casos de uso, adaptadores de persistencia, hooks de pantalla y componentes presentacionales; definir un catálogo centralizado y una estrategia explícita de migraciones versionadas. Los errores de versión de esquema deberían quedar visibles y observables, no degradar silenciosamente la funcionalidad.

### QA-01 — La cobertura automatizada cubre una parte pequeña del producto

**Severidad: Media.** El `package.json` ofrece `lint` como `tsc --noEmit` y una sola suite de tests de `ticketLogic`. No se encontraron configuraciones de CI, pruebas de API, RLS, pagos, auth, componentes ni flujo de navegador en el inventario revisado. Los documentos EGM afirman builds, tests y typecheck exitosos en sesiones anteriores; esos resultados históricos no prueban el estado operativo actual ni la seguridad del entorno publicado.

**Recomendación:** añadir pruebas unitarias de reglas y transiciones; pruebas de integración para pagos (solo sandbox), auth y sincronización; matriz de autorización RLS con roles reales; y un recorrido E2E de cliente, técnico y casos de fallo. Ejecutar todo en CI con datos sintéticos y sin secretos productivos.

## 5. Aspectos positivos

- La clave de Gemini y los secretos de Stripe/PayPal se usan en servidor; el cliente emplea la clave pública anon de Supabase.
- El checkout de tarjeta usa Stripe Checkout alojado, sin campos PAN/CVC propios en React.
- Los estados y tipos del dominio están definidos con TypeScript y hay validaciones puras de tickets/precios.
- Hay documentos de privacidad/términos, consentimiento explícito de acceso remoto y preferencias de cookies.
- Se atiende el movimiento reducido y existe un estilo de foco visible.
- La descarga de RustDesk consulta una release oficial y dispone de fallback.
- La toma de ticket pretende usar una actualización atómica, buena base siempre que se complete con autorización robusta.

Estos aciertos son una base útil, pero no neutralizan los problemas de autorización y pago descritos arriba.

## 6. Plan de trabajo recomendado

### Fase 0 — Antes de aceptar usuarios reales (bloqueante)

1. Cerrar las políticas RLS abiertas para tickets, mensajes y sesiones sin organización.
2. Corregir asignación de roles: cliente no puede escribir su rol; el trigger ignora metadatos de privilegio.
3. Restringir la RPC de asignación por grants, identidad, rol, membresía, pago y organización.
4. Deshabilitar pagos simulados en producción y fallar cerrado cuando falten claves.
5. Hacer que la creación, validación y confirmación de pago sean server-side y estén ligadas a importe/moneda/ticket.
6. Impedir que el navegador actualice directamente el estado de pago a “paid”.
7. Separar la demo de la producción y asegurar que el portal de demo usa datos sintéticos.

### Fase 1 — Endurecimiento operativo

1. Añadir rate limiting, validación de entrada, timeouts, logging estructurado sin datos sensibles y alertas.
2. Configurar URL canónica y encabezados de seguridad; restringir hosts de Vite por entorno.
3. Definir manejo de modo offline y sincronización sin fallback silencioso.
4. Revisar tratamiento de datos personales, retención, exportación/borrado y divulgación a IA con asesoría legal local.

### Fase 2 — Producto, calidad y crecimiento

1. Añadir pruebas E2E y de RLS, accesibilidad y regresión visual para móvil/tablet/desktop.
2. Dividir módulos muy grandes y centralizar reglas comerciales en servidor.
3. Medir conversión por etapa (inicio diagnóstico → ticket → checkout → pago → sesión → resolución), sin analítica antes del consentimiento requerido.
4. Alinear claims, precios, garantías y SLAs con la capacidad real de atención y con evidencia comprobable.

## 7. Criterios para cerrar la auditoría antes del lanzamiento

- Un cliente de prueba A no puede listar, leer, editar ni comentar tickets de B; un técnico de otra organización tampoco.
- El usuario no puede ascender su rol mediante Auth metadata ni editando su perfil.
- Una persona no autorizada no puede ejecutar la RPC ni asignar tickets a identidades elegidas por el cliente.
- En producción sin claves de pago, el checkout muestra indisponibilidad y ningún ticket cambia a pagado.
- Una orden con importe modificado, moneda incorrecta, ticket diferente o captura repetida no habilita la sala.
- El panel técnico no abre sin sesión real y una pertenencia válida a la organización.
- Los fallos de red y el fallback local se muestran claramente, y el usuario no confunde datos locales con guardados en servidor.
- Los recorridos críticos pasan pruebas automatizadas y manuales con teclado/lector de pantalla.

## 8. Conclusión

El repositorio presenta una propuesta de producto amplia y una interfaz trabajada, pero la etapa actual se parece más a un prototipo funcional con conectores preparados que a una plataforma SaaS lista para operar con clientes reales. La prioridad no es añadir más módulos: es establecer una frontera verificable entre cliente y servidor, corregir el modelo de permisos y convertir el pago del navegador en un proceso financiero validado e idempotente en backend. Después de eso, se puede validar UX, claims, operación y confiabilidad con pruebas controladas.

## Anexo: remediaciones preparadas en el espacio de trabajo

Fecha: 2026-11-20. Después de la auditoría se prepararon cambios locales en la rama de trabajo; todavía no se han desplegado.

- El servidor de pagos ahora calcula el importe desde el ticket almacenado, verifica metadatos, moneda, importe y modo de Stripe, valida la orden y la captura de PayPal y registra el resultado con credenciales de servidor. El navegador ya no decide el precio ni puede marcar un ticket como pagado en Supabase.
- Se endurecieron las políticas RLS y privilegios de tablas para perfiles, tickets, mensajes, organizaciones y técnicos; se restringió la función de asignación atómica a técnicos autenticados con membresía activa. Los tickets públicos deben incluir evidencia de mayoría de edad y aceptación de términos.
- El registro de usuarios ya no permite elegir un rol privilegiado. El portal técnico comprueba membresía activa y no simula acceso en producción.
- Se reforzaron límites de solicitudes y cabeceras HTTP, se acotó el host permitido por Vite y se ajustó la configuración de pagos sandbox/live.
- Se corrigieron afirmaciones de precio, descuentos, certificaciones, tiempos, reembolsos y referidos que no tenían respaldo visible en el flujo real.

### Estado y validación

Estos cambios son una preparación de código, no una publicación. El esquema debe revisarse y aplicarse como migración en el proyecto Supabase correcto; en esta sesión no se tuvo acceso a una instancia remota ni estaba instalado Supabase CLI. Se requiere configurar secretos de servidor en el entorno de despliegue. No se ejecutaron pruebas ni compilación por instrucción de trabajo; solo se inspeccionó el diff y se comprobó whitespace con `git diff --check`. La auditoría inicial describe el estado del commit revisado, y este anexo resume el estado posterior en el workspace.

## Segunda auditoría profunda y remediaciones adicionales

Fecha: 2026-11-20. La revisión ampliada cubrió fronteras de autorización, cobros, exportación de datos, configuración operativa, contenido comercial y legal. Se añadieron cambios locales al código; no se aplicaron a una instancia remota.

### Hallazgos abordados en esta pasada

- Las exportaciones JSON de tickets y organizaciones ya omiten el token secreto de acceso a la sala y referencias/identificadores de pago. También se retiraron declaraciones de retención y de exclusión de entrenamiento de IA del JSON que no estaban implementadas o verificadas.
- La información legal ahora explica que edad y mayoría de edad son autodeclaradas, que no existe purga automática verificable, que la anonimización del ticket no borra necesariamente cuentas/mensajes, y que Gemini puede recibir texto de incidentes. La redacción evita asegurar plazos, cifrado o tratamiento del proveedor que el sistema no acredita.
- Reembolsos y cancelaciones se describen como solicitudes que requieren atención humana; la app no tiene emisión automática ni portal de cancelación sincronizado.
- Se quitaron o rebajaron promesas visibles de SLA de 10 minutos, cobertura continua, informes “verificados”, créditos/agentes de IA no disponibles y automatización empresarial no demostrada. La disponibilidad y el alcance de planes siguen requiriendo definición contractual antes de comercializarse.
- La pantalla de conexión dejó de afirmar TLS 1.3 y retención fija; explica el registro parcial y que no hay eliminación automática configurada.
- El reinicio por error del frontend limpia solo claves locales `rs365_`, en lugar de borrar todo el almacenamiento del navegador.

### Riesgos residuales y acciones de lanzamiento

1. **Bloqueante de despliegue:** el esquema `supabase/schema.sql` aún no se ha aplicado en la base real. El código requiere políticas, columnas, grants y RPCs nuevos (incluyendo `stripe_subscription_id` y `update_ticket_as_staff`). Debe convertirse y revisarse como migración, aplicarse en staging y probarse con usuarios de distintas organizaciones antes de producción.
2. **Webhook de Stripe:** configurar en el proveedor la URL `/api/payments/stripe/webhook`, `STRIPE_WEBHOOK_SECRET` solo en el servidor y eventos de checkout/suscripción/factura documentados en `.env.example`; probar firmas inválidas, duplicados, pagos demorados, cancelación y mora.
3. **Checkout concurrente:** no existe reserva/idempotencia persistente de intento por ticket para impedir dos sesiones checkout concurrentes. Si se pagan ambas, solo la primera actualización puede quedar asociada al ticket. Requiere una tabla de intentos con unicidad/estado, recuperación y proceso de reembolso para sobrecobros.
4. **Rate limiting:** el límite HTTP vive en memoria de proceso y no limita escrituras directas al endpoint público de Supabase. En Cloud Run/varias réplicas no constituye defensa distribuida; considerar gateway/Edge Function, CAPTCHA o limitador compartido y monitorizar abuso.
5. **Persistencia parcial:** configuración de organización, invitaciones, disponibilidad, dispositivos, sesiones, agentes IA y una parte de auditoría siguen siendo locales o no tienen sincronización completa. Hay un aviso visible en el portal técnico conectado. No ofrecer esas funciones como operación multiusuario hasta persistirlas y probar permisos.
6. **Acceso a sala:** el token se conserva localmente; no hay flujo implementado de recuperación o re-enlace seguro si se pierde el navegador o almacenamiento. Debe diseñarse un enlace de acceso seguro o recuperación autenticada sin exponer tokens en exportaciones.
7. **Datos personales:** la anonimización actual se limita a campos del ticket; no elimina mensajes, perfil de Auth ni copias en procesadores. Debe definirse y operar un proceso integral para solicitudes de titulares y verificarlo con asesoría legal ecuatoriana.
8. **Planes y suscripciones:** los planes mensuales SaaS/Pyme no tienen portal de cancelación; los dispositivos, cuotas/créditos, SLA, respaldos y agentes descritos parcialmente en el catálogo no están implementados o medidos como prestaciones completas. No cobrar/mostrar esos planes como disponibles hasta definir el alcance real, renovación y cancelación.

### Validación efectuada y límites

- `git diff --check` terminó sin errores de whitespace.
- No hubo compilación, pruebas automatizadas ni pruebas visuales en navegador en esta pasada. El workspace no tiene `node_modules`, `tsx` no está disponible y la instalación de dependencias no terminó; tampoco está disponible Supabase CLI ni una instancia remota para comprobar SQL/RLS. Estos cambios requieren revisión de tipos/build y pruebas de integración antes de publicar.
- Estado: cambios preparados únicamente en el workspace; sin commit, PR, migración remota ni despliegue.
