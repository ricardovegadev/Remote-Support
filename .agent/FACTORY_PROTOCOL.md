# FACTORY PROTOCOL — Protocolo Operativo de 5 Estaciones

> **Propósito:** Flujo de ingeniería repetible, auditable y modular para construir, evolucionar y desplegar aplicaciones SaaS en nuestra **Software Factory** sin pérdida de contexto ni regresiones.  
> **Reglas complementarias:** `.agent/rules/00-factory-standards.md` (estándares universales) y `.agent/rules/01-project-context.md` (contexto del producto activo).

---

## Mapa del Flujo de Producción

```text
[Estación 1: EGM & ADR]
        │
        ▼
[Estación 2: Contratos, SQL/RLS, Flags & Tests]
        │
        ▼
[Estación 3: Construcción Modular + Skills + Goldfish Reset]
        │
        ▼
[Estación 4: Quality Gates & Auditoría Independiente (qa-auditor)]
        │
        ▼
[Estación 5: Changelog, Despliegue Dockerfile & Backporting al Core]
```

---

## Estación 1 — Especificación y Memoria (EGM)

**Objetivo:** Alinear cada tarea con la memoria persistente del proyecto antes de escribir una sola línea de código.

1. **Lectura obligatoria inicial:** Consultar `docs/egm/00_ELEPHANT_MEMORY.md` y `docs/egm/01_DECISION_LOG.md`, junto con `.agent/rules/00-factory-standards.md` y `.agent/rules/01-project-context.md`.
2. **Definición de alcance:** Delimitar explícitamente:
   - Qué problema se resuelve y qué archivos/módulos se verán afectados.
   - Qué elementos quedan **fuera de alcance** (reglas de no-regresión).
   - Criterios verificables de aceptación.
3. **Gobierno de Decisiones (`ADR-XX`):**
   - Verificar que la propuesta no contradiga ningún ADR vigente.
   - Si se introduce una decisión arquitectónica irreversible o transversal (nuevo proveedor, cambio de modelo de datos, regla legal o de seguridad), registrarla como un nuevo **`ADR-XX`** en `docs/egm/01_DECISION_LOG.md` antes o durante la implementación.

---

## Estación 2 — Contratos, Esquema y Banderas

**Objetivo:** Establecer primero las interfaces, la seguridad de datos y las pruebas base antes de cablear la interfaz visual.

1. **Feature Flags (`src/config/features.ts`):**
   - Declarar o validar las banderas necesarias para activar/pausar funciones mayores en modo standby no destructivo.
2. **Contratos TypeScript:**
   - Definir o actualizar tipos e interfaces estrictas (`src/types/*`) que representen el dominio, payloads BFF y respuestas de API.
3. **Esquema SQL y Políticas RLS:**
   - Diseñar migraciones SQL idempotentes usando **UUID v4 RFC 4122**, columnas `organization_id`, políticas **RLS Multi-Tenant** y RPCs atómicas cuando corresponda.
   - Nunca eliminar tablas ni columnas existentes para desactivar una función.
4. **Pruebas Unitarias Base:**
   - Escribir o ampliar pruebas unitarias para la lógica pura, validaciones (+18, tarifas, permisos, sanitización) y contratos críticos **antes de conectar los componentes de UI**.

---

## Estación 3 — Construcción Modular con Roles Separados

**Objetivo:** Implementar con precisión quirúrgica respetando límites de arquitectura, delegación especializada e higiene de contexto.

1. **Frontera `src/core/` vs `src/modules/`:**
   - Colocar utilidades reutilizables (Supabase, pagos, legal, auditoría, UI base, feature flags) en **`src/core/`**.
   - Colocar la lógica y vistas propias del producto en **`src/modules/`**.
   - Aplicar `React.lazy()` + `<Suspense>` en vistas privadas y modales pesados.
2. **Delegación a Skills Especializadas (`.agent/skills/`):**
   - Utilizar las skills disponibles según la naturaleza del trabajo:
     - Arquitectura de BD, migraciones y RLS (ej. `rs365-supabase-architect`).
     - Pulido visual, responsive y accesibilidad WCAG AA (ej. `rs365-ui-polish`).
     - Estrategia técnica, arquitectura de negocio y priorización (ej. `rs365-tech-ceo`).
     - Vista previa y validación interactiva (ej. `app-preview`).
3. **Higiene de Contexto — *Goldfish Reset*:**
   - Cada **3–4 cambios grandes** (o al concluir una épica/fase), cerrar la sesión actual tras actualizar `docs/egm/03_SESSION_CHANGELOG.md` e iniciar una **sesión limpia** usando la *Plantilla de Arranque* incluida al final de este protocolo.
   - Esto evita fatiga de ventana de contexto, deriva de estilos y regresiones silenciosas.

---

## Estación 4 — Quality Gates y Auditoría Independiente

**Objetivo:** Verificar que el cambio cumple todos los estándares técnicos, visuales y de seguridad con una segunda mirada imparcial.

1. **Auditoría Independiente en Modo Solo Lectura (`qa-auditor`):**
   - Ejecutar una revisión en modo **solo lectura** (skill `qa-auditor`, ej. `rs365-qa-auditor`) para detectar regresiones, fugas de secretos, brechas de RLS, botones muertos o incumplimientos de ADR.
2. **Compuertas Automáticas Obligatorias:**
   - `npm run lint` → **0 errores**.
   - `npm test` → **100 % pruebas en verde**.
   - `npm run build` → **compilación limpia**.
3. **Prueba E2E y Verificación Visual (Escritorio + Móvil):**
   - Comprobar los flujos críticos de punta a punta en escritorio, tablet y móvil.
   - Confirmar `0 px` de desbordamiento horizontal (`overflow-x`) y `0` errores de consola.
4. **Chequeo Rápido de Seguridad:**
   - Cero secretos en `VITE_*`.
   - Tokens de 32 bytes / 64 hex generados con `crypto.getRandomValues` (sin `Math.random()`).
   - Validación JWT/sesión en servidor para IA y pagos.
   - Sin fallback a `items[0]` en rutas dinámicas.
   - Cumplimiento +18, casillas legales desmarcadas por defecto, ARCO y PCI-DSS intactos.

---

## Estación 5 — Despliegue y Retroalimentación (*Backporting*)

**Objetivo:** Consolidar la memoria, entregar a producción de forma controlada y enriquecer la plantilla maestra de la fábrica.

1. **Actualización de Memoria EGM:**
   - Registrar el hito y los resultados de verificación en `docs/egm/03_SESSION_CHANGELOG.md`.
   - Actualizar `docs/egm/00_ELEPHANT_MEMORY.md` si cambió el stack, catálogo, endpoints o arquitectura base.
2. **Despliegue Controlado vía `Dockerfile`:**
   - Construir y desplegar el artefacto productivo usando el **`Dockerfile` multi-etapa** **únicamente previa aprobación humana explícita**.
   - Verificar `/api/health` y monitoreo posterior al despliegue.
3. **Retroalimentación (*Backporting*) hacia `saas-factory-starter`:**
   - Identificar mejoras, correcciones de seguridad, utilidades de `src/core/`, workflows CI/CD o ajustes de `.agent/rules/00-factory-standards.md` que sean agnósticos al negocio.
   - Replicar (*backport*) esos parches hacia la plantilla maestra **`saas-factory-starter`** para que todo proyecto futuro de la fábrica herede automáticamente las mejoras.

---

## Plantilla de Arranque para Sesión Limpia (*Goldfish Reset*)

> Copia y completa este bloque al abrir una nueva sesión cada 3–4 cambios grandes:

```markdown
[MODO EGM ACTIVO — SESIÓN LIMPIA / GOLDFISH RESET]

1. Lee primero en este orden:
   - `.agent/rules/00-factory-standards.md`
   - `.agent/rules/01-project-context.md`
   - `.agent/FACTORY_PROTOCOL.md`
   - `docs/egm/00_ELEPHANT_MEMORY.md`
   - `docs/egm/01_DECISION_LOG.md`
   - Última entrada de `docs/egm/03_SESSION_CHANGELOG.md`

2. Estación actual del protocolo:
   - [Indicar: Estación 1 / 2 / 3 / 4 / 5]

3. Objetivo único de esta sesión:
   - [Describir el cambio puntual y verificable]

4. Restricciones y no-alcance:
   - Respeta todos los ADR vigentes, feature flags y reglas de seguridad/legal.
   - NO modifiques módulos ni archivos fuera del alcance indicado.

5. Definition of Done (Quality Gates):
   - Ejecuta `npm run lint`, `npm test` y `npm run build` (0 errores).
   - Verifica comportamiento en escritorio y móvil (0 px overflow-x).
   - Registra el hito al finalizar en `docs/egm/03_SESSION_CHANGELOG.md`.
```
