# 02 · MODEL ROUTING & CONTROLLED EXPERIMENTS — Enrutamiento de Modelos y Experimentación (Factory Engineering V3)

> **Alcance:** Política oficial de asignación de modelos por complejidad/riesgo de tarea y protocolo científico de experimentación controlada para optimizar coste, latencia y calidad dentro de la Software Factory.  
> **Jerarquía:** Complementa `.agent/rules/00-factory-standards.md`, `.agent/rules/01-project-context.md` y `.agent/FACTORY_PROTOCOL.md`.

---

## 1. Matriz de Enrutamiento de Modelos por Perfil

Elegir el modelo correcto por rol evita sobrecostes en tareas mecánicas y previene fallos críticos en seguridad, datos o pagos.

| Nivel de Modelo | Perfil / Capacidad | Roles y Tareas Asignadas | Ejemplos Concretos en Remote Support 365 |
| :--- | :--- | :--- | :--- |
| **Nivel Económico / Rápido** *(Fast / Flash Tier)* | Baja latencia, coste reducido, alta adherencia a formato | • Redacción y ajustes de **copy** y textos legales ya aprobados<br>• Ajustes menores de **CSS / Tailwind** (espaciado, alineación, tokens existentes)<br>• **Refactors menores** sin cambio de contrato ni lógica de negocio<br>• Subagente **`code-reviewer`** (limpieza, tipado, dead code, pruebas tautológicas)<br>• Subagente **`ui-reviewer`** en chequeos de checklist repetitivos<br>• Actualización estructurada de `docs/egm/03_SESSION_CHANGELOG.md` y `04_FACTORY_METRICS.md` | • Renombrar etiquetas UI o corregir textos en `HeroSection.tsx` / `Footer.tsx`<br>• Ajustar márgenes responsivos en `LandingSections.tsx`<br>• Revisar imports sin usar o tipos `any` en `code-reviewer` |
| **Nivel Alto Razonamiento** *(Reasoning / Pro Tier)* | Razonamiento profundo, análisis de amenazas, arquitectura multi-archivo | • **Spec Writer** (lectura del Brain EGM, diseño de alcance y ADR)<br>• **Arquitectura** de módulos, contratos TypeScript y separación `core/` vs `modules/`<br>• **SQL / PostgreSQL / Migraciones / Políticas RLS** (`supabase/schema.sql`)<br>• **Backend crítico y pagos** (`server.ts`: Stripe/PayPal Authorize-Capture-Void, webhooks, RBAC, tokens criptográficos)<br>• Lógica financiera pura (`src/utils/ticketLogic.ts`) y evaluación (`techEvaluation.ts`)<br>• Subagente **`security-reviewer`** *(obligatoriamente distinto al modelo que actuó como Builder)*<br>• Orquestador **`factory-approver`** (consolidación de 4 dictámenes y resolución de conflictos) | • Cambios en `POST /api/payments/capture`, `/api/payments/void`, `/api/team/invite`<br>• Migraciones RLS en `supabase/schema.sql`<br>• Auditoría independiente de amenazas con `security-reviewer`<br>• Consolidación final en `factory-approver` |

---

## 2. Regla de Diversidad de Modelo para Seguridad (*Cross-Model Review*)

1. **Separación de sesgos:** El subagente **`security-reviewer`** **debe ejecutarse preferiblemente en un modelo (o familia de modelo) distinto al que actuó como Builder**, y siempre con **contexto limpio** (sin leer el historial de razonamiento ni las justificaciones del Builder).
2. **Escalamiento automático por riesgo:** Si el hook determinista `npm run factory:gate` clasifica el cambio como **Riesgo ALTO**, todas las etapas de diseño (`Spec Writer`), revisión de seguridad (`security-reviewer`) y consolidación (`factory-approver`) escalan obligatoriamente a **Nivel Alto Razonamiento**.
3. **Escalamiento tras reintento:** Si una tarea asignada inicialmente al Nivel Económico falla un ciclo del `factory-approver` por un error lógico o de arquitectura, el segundo ciclo escala automáticamente al **Nivel Alto Razonamiento**.

---

## 3. Regla de Experimentación Controlada (1 Variable por Experimento)

Para mejorar continuamente la fábrica sin introducir ruido ni degradaciones ocultas, toda optimización de proceso debe cumplir el método científico de **una sola variable**:

1. **Una sola variable por experimento:** En cada experimento únicamente se puede modificar **1 de estos 3 factores**:
   - **Variable A — Modelo:** Cambiar el modelo asignado a un rol específico (ej. mover `code-reviewer` de modelo X a modelo Y).
   - **Variable B — Paso del flujo:** Añadir, reordenar o simplificar un paso en `.agent/FACTORY_PROTOCOL.md` o `.agent/workflows/`.
   - **Variable C — Subagente / Checklist:** Ajustar el prompt, criterios o formato de salida de **un solo** `SKILL.md`.
2. **Prohibido combinar cambios simultáneos:** Si cambias el modelo **y** el prompt del revisor al mismo tiempo, el experimento queda invalidado porque no puede atribuirse la variación de calidad o coste.
3. **Métrica obligatoria de comparación (Coste vs. Calidad):**
   - Registrar línea base (*Baseline*) y variante (*Experiment*) en `docs/egm/04_FACTORY_METRICS.md`.
   - Comparar explícitamente:
     - **Calidad:** Puntaje promedio de los 4 revisores (`1–5`), tasa de `PASS` en primer ciclo y defectos escapados (`0` tolerancia en seguridad).
     - **Eficiencia / Coste:** Reintentos hasta Quality Gates en verde (`lint`, `test`, `build`, `factory:gate`) y nivel de modelo/latencia consumido.
4. **Criterio de promoción:** Una variante solo se promueve a estándar permanente en `.agent/rules/` si logra:
   - **Mayor calidad** con coste equivalente, **o**
   - **Menor coste/latencia** manteniendo **igual o superior puntaje promedio (≥ 4.5/5)** y **0 regresiones** en `security-reviewer`.
