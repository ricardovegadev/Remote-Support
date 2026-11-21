# Auditoría técnica profunda — Remote Support 365

**Fecha:** 21 de noviembre de 2026  
**Alcance:** portal web, API Express, persistencia Supabase, autenticación/autorización, cobros, privacidad, operación y experiencia del usuario.  
**Tipo:** revisión estática del repositorio más inspección de solo lectura del proyecto Supabase conectado. No se ejecutaron pruebas automatizadas ni se hicieron cambios en la app o la base de datos.

## Resumen ejecutivo

La app tiene una base de producto sólida: recorrido de soporte comprensible, salas de ticket con token, separación de algunas operaciones de pago en servidor y una propuesta visual coherente. Sin embargo, **la base Supabase conectada presenta fallas críticas de autorización**. Sus políticas reales de RLS para tickets, mensajes, bitácora, dispositivos y miembros permiten `USING (true)`/`WITH CHECK (true)` a `public`, y `anon` cuenta además con privilegios directos de lectura, inserción, modificación, borrado y truncado. En la práctica, la clave pública del navegador no limita el acceso de clientes anónimos a esos datos.

La definición local `supabase/schema.sql` contiene controles mucho más restrictivos, pero el estado remoto inspeccionado no refleja esa definición ni tiene migraciones registradas. Existe, por tanto, una brecha entre el código que se cree desplegado y el backend que realmente atiende la app. A esto se suman columnas requeridas por cobros y por el portal que no aparecen en las tablas remotas observadas. **No recomiendo operar con tickets o pagos reales hasta cerrar los hallazgos críticos y verificar la base desde una ruta controlada.**

## Hallazgos priorizados

### C-01 — RLS remoto permite acceso público irrestricto a datos operativos

**Severidad: Crítica | Confianza: Alta | Evidencia: lectura directa de `pg_policies` en Supabase.**

Las políticas reales para `tickets`, `ticket_messages` y `audit_logs` tienen comando `ALL` y condición `true`; `client_devices` y `organization_members` también tienen acceso `ALL` con condición `true`. Como son políticas para `{public}`, alcanzan a usuarios autenticados y anónimos. Eso invalida la intención de proteger por organización o token de sala: un cliente con la clave pública del proyecto puede consultar y alterar registros por la API de datos mientras las concesiones sigan habilitando esos verbos.

La inspección de privilegios confirmó a `anon` con `SELECT`, `INSERT`, `UPDATE`, `DELETE` y `TRUNCATE` en las seis tablas públicas examinadas. RLS puede filtrar operaciones normales cuando las políticas son restrictivas; aquí las políticas no filtran. El privilegio `TRUNCATE` no se debe presentar como un camino probado por PostgREST, pero su concesión es innecesaria y debe revocarse junto con los otros privilegios amplios.

**Impacto:** exposición de tickets, correos, conversaciones y registros de auditoría; manipulación o borrado de tickets y de mensajes; alteración de miembros/dispositivos; pérdida de integridad de la operación y riesgo de fraude.

**Corrección recomendada:** contención inmediata. Revocar a `anon` todos los privilegios de tablas salvo los mínimos requeridos; retirar todas las políticas `public` permissive; aplicar políticas explícitas separadas por verbo y rol. Para tickets, limitar al miembro autenticado de la organización o a la sala que demuestre el secreto del ticket. Para mensajes, derivar la autorización desde el ticket padre y restringir `sender_role`. Para auditoría, quitar escritura/lectura pública: insertar desde operaciones servidoras y leer solo para personal autorizado. Verificar después con consultas anon/autenticadas negativas y positivas en un entorno seguro.

### C-02 — Función privilegiada permite reclamar tickets sin autenticar al técnico

**Severidad: Crítica | Confianza: Alta.**

`public.claim_ticket_atomically(uuid, uuid)` está declarada `SECURITY DEFINER`, es ejecutable por roles públicos según el asesor de Supabase, y su cuerpo solo busca un registro `organization_members` por `p_tech_id` y `organization_id`; no verifica que `p_tech_id = auth.uid()`, que el miembro esté activo ni que el rol permita tomar tickets. Si el miembro no existe, aun así continúa y asigna el UUID suministrado con nombre/especialidad genéricos. El cuerpo devuelve el ticket completo. Su `search_path` tampoco está fijado.

**Impacto:** asignación arbitraria de tickets y exposición de datos bajo privilegios del propietario de la función. Las políticas amplias del hallazgo C-01 aumentan el impacto.

**Corrección recomendada:** revocar `EXECUTE` a `PUBLIC`, `anon` y `authenticated`; permitir la ejecución solo a un rol servidor o a una función `SECURITY INVOKER` con validación explícita de identidad y pertenencia activa. Si debe ser `SECURITY DEFINER`, fijar `search_path` a esquemas confiables, calificar objetos y validar `auth.uid()`, organización, estado/rol y disponibilidad antes de actualizar. No devolver la fila entera.

### C-03 — Base conectada y repositorio no comparten esquema ni historial de migraciones

**Severidad: Crítica para cobros / Alta para operación | Confianza: Alta.**

El proyecto Supabase `Remote-Support` aparece activo y con PostgreSQL 17.11.0.019. El listado remoto de migraciones está vacío. En la base hay seis tablas públicas; el repositorio y sus consultas esperan más entidades, entre ellas `profiles` y `technician_profiles`, y campos de ticket como `billing_mode`, `payment_status`, `payment_reference`, `paid_at`, `stripe_subscription_id` y otros. La ruta de cobro del servidor selecciona directamente varios de esos campos desde `tickets`; el portal de técnicos consulta `profiles`/`technician_profiles`. Las tablas/columnas remotas inspeccionadas no coinciden con esos contratos. Además, el `is_adult_verified` remoto observado tiene valor predeterminado `true`, frente al `false` definido localmente.

**Impacto:** errores de PostgREST en carga y actualización; tickets no visibles o no asignables; creación de sesión de pago/webhook fallida; garantías legales de mayoría de edad inconsistentes.

**Corrección recomendada:** recuperar el esquema remoto y compararlo columna por columna con el esquema esperado; crear migraciones versionadas, revisables y repetibles; aplicarlas primero en una base de staging con copia saneada. No ejecutar el `schema.sql` completo a ciegas sobre producción: auditar cada `DROP`, cambio de grants/policies y conversión de datos. Validar consultas reales de ticket y ciclo de pago al terminar.

### A-01 — Función `SECURITY DEFINER` con ruta de búsqueda mutable

**Severidad: Alta | Confianza: Alta.**

El asesor de seguridad informa `function_search_path_mutable` para `claim_ticket_atomically`. Al combinarse con `SECURITY DEFINER`, una ruta de búsqueda controlable o dependencias sin calificar pueden llevar a resolver nombres de objetos bajo un esquema no confiable. Esto se suma a la autorización insuficiente del hallazgo C-02.

**Corrección:** fijar `SET search_path = pg_catalog, public` (o el mínimo necesario), calificar nombres sensibles y revisar funciones privilegiadas restantes.

### A-02 — Protección contra contraseñas filtradas deshabilitada

**Severidad: Alta | Confianza: Alta.**

El asesor de Supabase indica que la comprobación de contraseñas filtradas está desactivada. Esto reduce la detección de credenciales conocidas en filtraciones al registrar/cambiar contraseñas.

**Corrección:** habilitar la protección en Auth y definir política de longitud/recuperación compatible con el servicio.

### A-03 — La confirmación de mayoría de edad no es un control independiente

**Severidad: Alta | Confianza: Alta.**

El cliente calcula `is_adult_verified` a partir de la fecha de nacimiento y lo envía desde el navegador. La inserción pública local exige `is_adult_verified = true` y fecha compatible, pero cualquier cliente puede construir directamente una petición a Supabase; una regla RLS no prueba que el cálculo/fecha lo haya realizado una autoridad confiable. En la base conectada, además, el valor por defecto observado es `true`.

**Impacto:** aceptación de fechas falsificadas y registro de tratamiento de datos personales sensibles sin evidencia confiable del consentimiento/edad.

**Corrección:** aplicar validación server-side en una ruta de creación controlada o mecanismo equivalente, guardar solo la evidencia mínima necesaria, y alinear defaults y restricciones de la base. Revisar necesidad/retención de fecha de nacimiento con asesoría de privacidad local.

### A-04 — Secretos de sala en `localStorage` y navegador

**Severidad: Alta | Confianza: Alta.**

El `client_session_token` bearer se almacena en `localStorage` y se utiliza desde el navegador para autorizar la sala y pagos. La exportación de estado evita incluirlo, lo cual es positivo, pero cualquier XSS, extensión comprometida o acceso al perfil persistente del navegador puede robarlo. Los mensajes también se envían mediante el cliente directo de Supabase.

**Corrección:** preferir un flujo de sala con token de corta duración emitido por servidor y limitado por operación; evaluar cookie `HttpOnly`, `Secure`, `SameSite` cuando encaje con la arquitectura. Mantener tokens fuera de exportaciones y logs, aplicar CSP estricta y minimizar persistencia. No tratar un `ticket_code` como secreto.

### A-05 — Límites de tasa en memoria no cubren todas las rutas ni varias instancias

**Severidad: Media | Confianza: Alta.**

Los límites Express guardan contadores en un `Map` local del proceso y solo protegen `/api/ai` y `/api/payments`. Reinicios y varias réplicas reinician/dividen el límite. El acceso directo del navegador a Supabase no pasa por esos límites. Puede facilitar abuso de costos de IA o carga de la base.

**Corrección:** rate limit distribuido en gateway/Redis, límites por identidad además de IP, cuotas y límites de gasto para IA; políticas de abuso para endpoints de creación de tickets y protección en Supabase.

### A-06 — Asignación de técnicos incluye datos de demostración en el adaptador local

**Severidad: Media | Confianza: Alta.**

`supportAdapter.ts` incluye organizaciones, miembros, técnicos y tickets seed con nombres, correos y tokens ficticios, y utiliza `localStorage` como fallback si Supabase no está disponible. La UI debe distinguir explícitamente el modo de demostración de datos operativos; evitar que perfiles seed se interpreten como personal real o se mezclen con exportaciones.

**Corrección:** aislar seeds bajo flag de desarrollo, no cargarlos en builds productivos; señalizar modo local, limpiar tokens seed y evitar que el fallback parezca un backend sincronizado.

### A-07 — Promesa comercial visible no coincide con el flujo de pago

**Severidad: Media/Alta (confianza y cumplimiento) | Confianza: Alta.**

El portal y el asistente muestran “Si no lo resolvemos, no pagas”, mientras la implementación solicita pago para avanzar y el código marca el ticket pagado antes de completar la asistencia. El flujo no demuestra una regla automática de reembolso al no resolver.

**Impacto:** expectativa comercial engañosa, disputas y contracargos, aumento de tickets de servicio al cliente.

**Corrección:** definir la política operativa y su activador verificable (pago posterior, preautorización o reembolso automático); armonizar términos, UI y lógica de pago. Si no existe garantía implementada, retirar la promesa hasta implementarla.

### A-08 — Riesgo de privacidad en diagnósticos de IA y mensajes de soporte

**Severidad: Media | Confianza: Media.**

El formulario permite descripciones de incidentes de hasta 4.000 caracteres y respuestas de seguimiento que pueden contener información personal, nombres de cuenta o detalles de dispositivos. El repositorio incluye integración Gemini; en la revisión no quedó acreditada una política visible de minimización, retención, redacción de secretos o consentimiento específico para transferir el diagnóstico a un proveedor de IA.

**Corrección:** aviso claro antes de envío, minimización y redacción de contraseñas/tokens, retención documentada, controles de acceso y revisión de condiciones del proveedor/ubicación de datos.

### M-01 — Índices faltantes en claves foráneas

**Severidad: Media | Confianza: Alta.**

El asesor de rendimiento identifica claves foráneas sin índice en `audit_logs.organization_id`, `client_devices.organization_id`, `ticket_messages.ticket_id` y `tickets.organization_id`.

**Impacto:** consultas de joins/dependencia y borrados/actualizaciones de filas padre más lentos conforme aumenten tickets y mensajes.

**Corrección:** añadir índices B-tree no duplicados, comprobar planes de consulta y observar costo de escritura.

### M-02 — Estado de suscripción local optimista

**Severidad: Media | Confianza: Alta.**

`markTicketPaid` marca `subscription_status: 'active'` inmediatamente al confirmarse el primer checkout mensual. Las actualizaciones posteriores lo reconcilian desde Stripe, pero entre ambos eventos puede mostrarse activo antes de una verificación vigente; los reintentos/eventos duplicados también deben ser idempotentes.

**Corrección:** guardar estado derivado de una suscripción recuperada/verificada en Stripe, tratar estados de pago incompletos como pendientes, agregar idempotencia de eventos y reconciliación periódica.

### M-03 — Falta de controles HTTP de seguridad y operación demostrables

**Severidad: Media | Confianza: Alta.**

Express configura `nosniff`, `Referrer-Policy` y `Permissions-Policy`, pero en el código revisado no se observa una CSP ni cabeceras HSTS (estas últimas pueden estar terminadas en el proxy, lo que requiere verificar configuración externa). `/api/health` expone estado de configuración de Gemini. No se acreditó una política de retención/alerta para errores de pagos ni monitorización de reconciliación.

**Corrección:** configurar CSP/HSTS en el borde HTTPS, revisar superficie y detalle de healthchecks, y añadir métricas/alertas sin datos personales para fallos del webhook y discrepancias de pago.

## Estado y datos técnicos consultados

- Repositorio local en `main`, con dos cambios visuales locales sin commit al momento de la revisión. Se conservaron intactos.
- Proyecto Supabase conectado: `Remote-Support`, estado `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.019, región `us-east-2`.
- Historial de migraciones reportado por Supabase: vacío.
- Tablas públicas observadas: `organizations`, `organization_members`, `tickets`, `ticket_messages`, `client_devices`, `audit_logs`.
- Security Advisor: función con `search_path` mutable; funciones `SECURITY DEFINER` ejecutables desde roles amplios; protección de contraseñas filtradas deshabilitada.
- Performance Advisor: cuatro claves foráneas sin índice descritas en M-01.
- Health Advisor: sin hallazgos reportados en la consulta.
- Se inspeccionaron definiciones de políticas, grants y funciones. No se leyeron valores de tickets ni información personal de clientes.
- No se inspeccionaron secretos de entorno ni se intentaron transacciones de explotación.

## Plan de remediación sugerido

### Prioridad inmediata — antes de admitir tráfico/tickets reales

1. Contener privilegios públicos y reemplazar las políticas permisivas en tablas sensibles.
2. Revocar y reemplazar `claim_ticket_atomically` con autorización basada en identidad real; fijar `search_path`.
3. Revisar actividad reciente de API/auditoría para identificar lecturas o escrituras no autorizadas; preservar logs antes de cualquier limpieza.
4. Probar acceso anónimo a cada tabla en un entorno aislado y confirmar que las rutas válidas de cliente/técnico siguen funcionando.

### Prioridad alta — antes de producción completa

5. Construir una migración desde el esquema real hacia el contrato del código; aplicar primero en staging y desplegar con rollback.
6. Reparar flujo de edad/consentimiento en servidor y alinear valor por defecto.
7. Alinear promesa de “no pagas” con pagos, reembolsos y términos.
8. Activar protección de contraseñas filtradas, CSP/HSTS y límites distribuidos.

### Prioridad siguiente

9. Añadir índices faltantes y confirmar con `EXPLAIN` las consultas habituales.
10. Asegurar que seeds/fallback local no entren en producción ni se confundan con registros sincronizados.
11. Añadir idempotencia y reconciliación de pagos/suscripciones, más alertas operativas con métricas sin PII.
12. Documentar el flujo de datos de IA, retención y controles de privacidad.

## Limitaciones

Este informe es una auditoría técnica puntual, no una certificación de cumplimiento legal ni una prueba de penetración autorizada contra el tráfico. La configuración de CDN/proxy, secretos de despliegue, paneles de Stripe/PayPal, políticas contractuales y logs históricos de acceso no se verificaron. La inspección remota fue de solo lectura. Dado el hallazgo crítico C-01, conviene revisar logs de acceso antes de rotar o borrar datos y restringir el proyecto mientras se prepara la corrección.
