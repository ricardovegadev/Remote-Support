# FACTORY PROTOCOL V3 — Protocolo Maestro de Ingeniería de Fábrica

> **Propósito:** Flujo de ingeniería determinista, auditable y auto-mejorable para construir, revisar y desplegar aplicaciones SaaS en nuestra **Software Factory** sin regresiones, sin fatiga de contexto y con gobierno explícito de riesgo.  
> **Reglas y Workflows vinculados:**
> - `.agent/rules/00-factory-standards.md` (estándares universales de arquitectura, seguridad y legal)
> - `.agent/rules/01-project-context.md` (contexto exclusivo de Remote Support 365)
> - `.agent/rules/02-model-routing.md` (enrutamiento de modelos por perfil y experimentación de 1 variable)
> - `.agent/workflows/tdd-builder.md` (regla TDD obligatoria Red → Green → Refactor)

---

## Cadena Completa de Producción (Factory Engineering V3)

```text
[1. Entrada Unificada]
        │
        ▼
[2. Spec Writer (lee Brain EGM + ADRs + Enrutamiento de Modelos)]
        │  └─► Si Riesgo ALTO: Puerta Humana 1 (aprobación de Spec/ADR)
        ▼
[3. Builder (TDD Obligatorio: Red → npm test FAIL → Green + Quality Gates)]
        │
        ▼
[4. 4 Revisores Independientes en Paralelo (Contexto Limpio, SIN historial del Builder)]
        ├─► security-reviewer  (modelo distinto al Builder · RLS/SQL/Tokens/+18/Pagos)
        ├─► ux-reviewer        (flujos, fricción, pasos, coherencia con 00_ELEPHANT_MEMORY)
        ├─► ui-reviewer        (Desktop, Lenovo Tab P12, Móvil · WCAG AA · 0 px overflow)
        └─► code-reviewer      (limpieza, tipado estricto, dead code, tests no tautológicos, ADR)
        │
        ▼
[5. Orquestador Approver (`factory-approver`)]
        ├─► Si alguno es FAIL ──► Lista accionable al Builder (máx. 3 ciclos; >3 escala a humano)
        └─► Solo si 4/4 PASS ──► Entrega al Gatekeeper de Riesgo
        │
        ▼
[6. Gatekeeper de Riesgo + `npm run factory:gate` (Hook Determinista sin IA)]
        ├─► ALTO  → BLOQUEA AUTO-MERGE · Exige Puerta Humana 1 y 2
        ├─► MEDIO → Aprobación estándar tras 4/4 PASS + Quality Gates en verde
        └─► BAJO  → Avanza directo tras Quality Gates en verde
        │
        ▼
[7. Métricas, Automejora, Changelog y Backporting]
        └─► Actualiza `04_FACTORY_METRICS.md` + `03_SESSION_CHANGELOG.md` + Goldfish Reset
```

---

## Estación 1 — Entrada Unificada y Spec Writer (Lectura del Brain EGM)

**Objetivo:** Alinear cada solicitud con la memoria persistente del proyecto y el perfil de modelo adecuado antes de escribir una línea de código.

1. **Lectura obligatoria del Brain:** Consultar `docs/egm/00_ELEPHANT_MEMORY.md`, `docs/egm/01_DECISION_LOG.md`, la última entrada de `docs/egm/03_SESSION_CHANGELOG.md`, `docs/egm/04_FACTORY_METRICS.md`, `.agent/rules/00-factory-standards.md`, `.agent/rules/01-project-context.md` y `.agent/rules/02-model-routing.md`.
2. **Especificación acotada (*Spec*):** Delimitar explícitamente:
   - Objetivo funcional verificable y archivos exactos a modificar.
   - Elementos **fuera de alcance** (reglas de no-regresión: tarifas, ADRs, estética).
   - Clasificación preliminar de riesgo (`ALTO` / `MEDIO` / `BAJO`) y asignación de modelos según `02-model-routing.md`.
3. **Gobierno de Decisiones (`ADR-XX`) y Puerta Humana 1:**
   - Verificar que la especificación no contradice ningún ADR vigente (`ADR-01`–`ADR-06+`).
   - Si introduce cambios de **Riesgo ALTO** (arquitectura, `supabase/schema.sql`, `server.ts`, `AuthModal.tsx`, `ticketLogic.ts` o `.env*`), registrar un nuevo `ADR-XX` en `docs/egm/01_DECISION_LOG.md` y exigir **Puerta Humana 1** antes de desplegar cambios irreversibles.

---

## Estación 2 — Contratos, Esquema, Banderas y TDD Rojo

**Objetivo:** Definir interfaces, migraciones seguras y pruebas que fallen antes de construir la implementación.

1. **Feature Flags (`src/config/features.ts`):** Gobernar módulos mayores en modo standby no destructivo (prohibido borrar tablas/columnas SQL).
2. **Contratos TypeScript y Esquema SQL Idempotente:** Actualizar tipos (`src/types/*`) y migraciones SQL idempotentes con UUID v4 RFC 4122 y RLS por `organization_id`.
3. **TDD Obligatorio (`.agent/workflows/tdd-builder.md`):**
   - Para cualquier cambio en `src/utils/ticketLogic.ts`, `techEvaluation.ts`, endpoints críticos de `server.ts` o `scripts/factory-risk-gate.mjs`:
     1. Escribir primero el test que falla (**RED**).
     2. Ejecutar `npm test` y confirmar el fallo esperado.
     3. Pasar a Estación 3 para escribir el código mínimo hasta ponerlo en verde (**GREEN**).

---

## Estación 3 — Construcción Modular (Builder) + Higiene de Contexto

**Objetivo:** Implementar el cambio mínimo y limpio que satisface la *Spec* y convierte las pruebas TDD en verde.

1. **Frontera `src/core/` vs `src/modules/` y Rendimiento:**
   - Mantener utilidades reutilizables en `src/core/` y dominio en `src/modules/`.
   - Aplicar `React.lazy()` + `<Suspense>` en vistas privadas/pesadas manteniendo el chunk principal `< 500 kB`.
2. **Delegación a Skills Especializadas (`.agent/skills/`):**
   - `rs365-supabase-architect` (SQL/RLS), `rs365-ui-polish` (responsive/WCAG AA), `rs365-tech-ceo` (estrategia) y `app-preview` (verificación en vivo).
3. **Compuertas Locales del Builder antes de pasar a Revisores:**
   - `npm run lint` (`tsc --noEmit`) → **0 errores**.
   - `npm test` → **100 % en verde**.
   - `npm run build` → **0 errores, 0 advertencias, chunk principal `< 500 kB`**.

---

## Estación 4 — 4 Revisores en Paralelo, Approver y Gatekeeper Determinista

**Objetivo:** Eliminar puntos ciegos mediante revisión independiente en contexto limpio, bucle acotado de corrección y clasificación determinista de riesgo.

1. **4 Subagentes Revisores en Paralelo (Contexto Limpio — SIN historial del Builder):**
   - **`.agent/skills/security-reviewer/SKILL.md`** *(preferiblemente modelo distinto al Builder)*: RLS, SQL, tokens criptográficos, bloqueo `+18`, secretos `VITE_*`, RBAC y pagos Authorize/Capture/Void.
   - **`.agent/skills/ux-reviewer/SKILL.md`**: Flujos, fricción, cantidad de pasos, estados vacíos/error y coherencia con `00_ELEPHANT_MEMORY.md`.
   - **`.agent/skills/ui-reviewer/SKILL.md`**: Desktop (`1440×900`), **Lenovo Tab P12** y móvil (`390×844`), contraste WCAG AA, `0 px` overflow y paleta Navy/Azul Eléctrico/Esmeralda.
   - **`.agent/skills/code-reviewer/SKILL.md`**: Limpieza, tipado estricto, ausencia de dead code, pruebas no redundantes/tautológicas y cumplimiento de ADRs.
   - Cada revisor emite `PASS` o `FAIL` con puntaje `1–5` y no puede editar código.
2. **Orquestador Approver (`.agent/skills/factory-approver/SKILL.md`):**
   - Consolida los 4 dictámenes.
   - Si cualquiera es `FAIL`, devuelve una lista accionable única al Builder (**máximo 3 ciclos**; al superar 3 ciclos, detiene y escala a humano).
   - Solo cuando **4/4 están en `PASS`** entrega el cambio al Gatekeeper de Riesgo.
3. **Hook Determinista de Riesgo (`scripts/factory-risk-gate.mjs` → `npm run factory:gate`):**
   - Clasifica el diff de Git de forma **100 % determinista (sin IA)**:
     - **ALTO (`BLOQUEA AUTO-MERGE`, exige Puerta Humana 1 y 2):** `supabase/schema.sql`, `supabase/migrations/**`, `server.ts`, `src/components/AuthModal.tsx`, `src/utils/ticketLogic.ts` o `.env*`.
     - **MEDIO:** `src/components/**`, `src/services/**` y lógica de aplicación en `src/`.
     - **BAJO:** copy, estilos menores, `docs/**`, `.agent/**`, `scripts/**`.
   - Imprime los revisores obligatorios y si exige firma humana (soporta `--strict` para bloquear CI ante Riesgo ALTO).

---

## Estación 5 — Métricas, Automejora, Despliegue y Backporting

**Objetivo:** Cerrar el ciclo con trazabilidad, aprendizaje estructurado y despliegue controlado.

1. **Métricas y Automejora (`docs/egm/04_FACTORY_METRICS.md`):**
   - Registrar la sesión (Fecha, Tarea, Riesgo, Modelo, Reintentos hasta Quality Gates en verde, Puntaje promedio de Revisores `1–5` y Fricción).
   - Si un mismo defecto ocurre **2 o más veces**, redactar una propuesta de parche a `.agent/rules/` o `.agent/workflows/` y validar cualquier ajuste siguiendo la regla de **1 variable por experimento** (`02-model-routing.md`).
2. **Actualización de Memoria EGM:**
   - Documentar el hito y los resultados de `npm run lint`, `npm test`, `npm run build` y `npm run factory:gate` en `docs/egm/03_SESSION_CHANGELOG.md`.
   - Actualizar `docs/egm/00_ELEPHANT_MEMORY.md` si cambió arquitectura, stack o endpoints.
3. **Higiene de Contexto — *Goldfish Reset*:**
   - Cada **3–4 cambios grandes** (o al concluir una fase), cerrar la sesión tras actualizar `03_SESSION_CHANGELOG.md` y `04_FACTORY_METRICS.md`, y reiniciar con la plantilla inferior.
4. **Despliegue Controlado y *Backporting*:**
   - Desplegar vía `Dockerfile` multi-etapa únicamente previa aprobación humana explícita (**Puerta Humana 2**).
   - Replicar mejoras agnósticas de negocio (`src/core/`, `.agent/rules/00-factory-standards.md`, `02-model-routing.md`, skills revisores y `factory-risk-gate.mjs`) hacia `saas-factory-starter`.

---

## Plantilla de Arranque para Sesión Limpia (*Goldfish Reset* V3)

```markdown
[SOFTWARE FACTORY V3 · MODO EGM ACTIVO — SESIÓN LIMPIA / GOLDFISH RESET]

1. Lee primero en este orden:
   - `.agent/rules/00-factory-standards.md`
   - `.agent/rules/01-project-context.md`
   - `.agent/rules/02-model-routing.md`
   - `.agent/workflows/tdd-builder.md`
   - `.agent/FACTORY_PROTOCOL.md`
   - `docs/egm/00_ELEPHANT_MEMORY.md`
   - `docs/egm/01_DECISION_LOG.md`
   - Última entrada de `docs/egm/03_SESSION_CHANGELOG.md` y `docs/egm/04_FACTORY_METRICS.md`

2. Objetivo único de esta sesión:
   - [Describir el cambio puntual y verificable]

3. Restricciones y no-alcance:
   - Respeta todos los ADR vigentes, feature flags, tarifas y reglas de seguridad/legal.
   - Aplica TDD obligatorio (Red → npm test FAIL → Green) en lógica crítica y endpoints.
   - Pasa por los 4 revisores en contexto limpio (`security`, `ux`, `ui`, `code`) y `factory-approver`.

4. Definition of Done (Quality Gates V3):
   - Ejecuta `npm run lint`, `npm test`, `npm run build` y `npm run factory:gate` (0 errores).
   - Verifica Desktop, Lenovo Tab P12 y Móvil (0 px overflow-x) si hubo cambios de UI.
   - Registra el hito en `docs/egm/03_SESSION_CHANGELOG.md` y la métrica en `docs/egm/04_FACTORY_METRICS.md`.
```
