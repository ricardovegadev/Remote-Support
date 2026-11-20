# 02 · GOLDFISH RESET PROTOCOL — Protocolo de Sesión Limpia

> **Objetivo:** Evitar la degradación de contexto ("memoria de pez dorado") en sesiones largas de desarrollo asistido por IA, manteniendo coherencia arquitectónica total entre ventanas de chat.

---

## 1. Regla de Lectura Previa (Inicio de Cada Tarea)
Antes de proponer o editar código en cualquier archivo del repositorio, el ingeniero/agente debe leer obligatoriamente:
1. `docs/egm/00_ELEPHANT_MEMORY.md` — Estado actual de stack, tarifas, paleta, integraciones y mapa de archivos.
2. `docs/egm/01_DECISION_LOG.md` — Restricciones inmutables (**ADR-01** a **ADR-05**) que no pueden romperse.
3. Si la tarea involucra cambios recientes, revisar las últimas entradas de `docs/egm/03_SESSION_CHANGELOG.md`.

---

## 2. Regla de Cierre de Iteración (Fin de Cada Cambio Significativo)
Al finalizar cualquier modificación funcional, visual o de infraestructura, se debe cumplir este checklist antes de dar por cerrada la iteración:
1. Ejecutar verificación completa con **0 errores**:
   - `npm run lint` (`tsc --noEmit`)
   - `npm run build` (`vite build`)
   - Pruebas unitarias si se tocó lógica de dominio: `npx tsx --test src/utils/ticketLogic.test.ts`
2. Actualizar `docs/egm/00_ELEPHANT_MEMORY.md` si cambió el catálogo, endpoints, variables de entorno, paleta o arquitectura.
3. Añadir una nueva entrada fechada al inicio de `docs/egm/03_SESSION_CHANGELOG.md` indicando:
   - **Qué cambió** (resumen funcional/técnico breve).
   - **Archivos tocados** (lista exacta).
   - **Resultado de verificación** (`npm run lint`, `npm run build` y tests).

---

## 3. Regla de Ventana Limpia (Goldfish Flush)
- **Cuándo abrir un chat nuevo en Google AI Studio:**
  - Cada **3 a 4 funcionalidades grandes** implementadas en una misma conversación.
  - De inmediato si aparecen síntomas de saturación de contexto: respuestas repetitivas, olvido de ADRs (ej. precios antiguos, textos sin SVG, HMR activado), o mayor latencia al editar archivos.
- **Prompt de Arranque EGM (Copiar y pegar al abrir el nuevo chat):**

```text
Lee primero `docs/egm/00_ELEPHANT_MEMORY.md`, `docs/egm/01_DECISION_LOG.md` y la última entrada de `docs/egm/03_SESSION_CHANGELOG.md` para cargar el contexto arquitectónico completo de Remote Support 365. Respeta todos los ADR sin excepción.

Objetivo de esta sesión:
[Describe aquí la nueva funcionalidad o ajuste puntual]

Al terminar, actualiza `00_ELEPHANT_MEMORY.md` (si aplica), añade una entrada fechada en `03_SESSION_CHANGELOG.md` y verifica que `npm run lint` y `npm run build` pasen con 0 errores.
```
