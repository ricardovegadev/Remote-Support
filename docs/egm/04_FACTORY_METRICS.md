# 04 · FACTORY METRICS — Métricas Vivas y Automejora Continua (Factory Engineering V3)

> **Propósito:** Registro vivo por sesión del rendimiento, calidad y fricción de la Software Factory, junto con el motor formal de **Automejora Continua** y el diario de **Experimentos Controlados (1 variable)**.  
> **Reglas vinculadas:** `.agent/rules/02-model-routing.md` y `.agent/FACTORY_PROTOCOL.md`.

---

## 1. Tabla Viva de Métricas por Sesión

> Actualizar una fila al cierre de cada sesión verificada, inmediatamente después de pasar `npm run lint`, `npm test`, `npm run build` y `npm run factory:gate`.

| Fecha | Tarea / Versión | Riesgo (`factory:gate`) | Modelo Principal | Reintentos hasta Quality Gates en verde | Puntaje Promedio Revisores (1–5) | Fricción / Notas Operativas |
| :--- | :--- | :---: | :--- | :---: | :---: | :--- |
| 2026-11-27 | `v2.27` · Authorize & Capture, Doble Confirmación 1–5★, Neto y Tesorería (`ADR-06`) | **ALTO** | Alto Razonamiento | 1 | 4.8 / 5 *(pre-V3)* | Alcance amplio (6 bloques SQL + server + UI + legal); cero regresiones en 34 tests. |
| 2026-11-27 | `v2.28` · Checkmark Framer-Motion, Gráfico Recharts, Timeline y Rol en Header | **MEDIO** | Alto Razonamiento | 0 | 4.9 / 5 *(pre-V3)* | Lazy-loading de `recharts` mantuvo chunk principal `< 500 kB` sin warnings. |
| 2026-11-27 | `v2.29` · Seguridad de Cuenta, Equipo/Roles (`supervisor`), Invitación Directa | **ALTO** | Alto Razonamiento | 1 | 4.9 / 5 *(pre-V3)* | `tsc --noEmit` detectó nombre de helper `buildOperatorAuthHeaders` en 1er intento; corregido en 1 ciclo. |
| 2026-11-27 | `v3.0` · Upgrade Definitivo a Factory Engineering V3 (`.agent/`, `docs/egm/`, `scripts/`, `package.json`) | **BAJO** | Alto Razonamiento | 0 | 5.0 / 5 | Infraestructura pura sin tocar UI ni negocio; `factory:gate` + 4 tests nuevos en verde. |

---

## 2. Patrones Recurrentes → Propuestas de Automejora

> **Regla de Oro de Automejora:** Si un mismo tipo de error, fricción o hallazgo de revisor ocurre **2 o más veces** en las sesiones registradas, **es obligatorio proponer un parche concreto a `.agent/rules/` o `.agent/workflows/`** antes de cerrar la sesión.

| ID | Patrón Recurrente Detectado | Frecuencia | Causa Raíz | Propuesta de Parche a `.agent/rules/` o `.agent/workflows/` | Estado |
| :---: | :--- | :---: | :--- | :--- | :--- |
| `SI-01` | Desalineación entre `profiles.role` heredado (`'admin'`) y `organization_members.role` (`'owner' \| 'admin' \| 'supervisor' \| 'technician'`) al resolver permisos. | 2 | Consulta de `profiles` antes que `organization_members` en autenticación de operador. | Incluir chequeo explícito en `.agent/skills/security-reviewer/SKILL.md`: exigir que `organization_members` sea la fuente autoritativa de RBAC y que `status === 'suspended'` bloquee antes de cualquier fallback. | **Promovida** (`v3.0`) |
| `SI-02` | Importar o invocar un nombre de helper aproximado en servicios nuevos (`getOperatorAuthHeaders` vs `buildOperatorAuthHeaders`) detectado solo al correr `tsc --noEmit`. | 2 | Escribir llamadas entre archivos sin inspeccionar la firma exportada exacta. | Reforzar regla en `.agent/skills/code-reviewer/SKILL.md` y `.agent/workflows/tdd-builder.md`: ejecutar siempre `npm run lint` junto con `npm test` tras cada bloque de edición. | **Promovida** (`v3.0`) |
| `SI-03` | Riesgo de mezclar pruebas unitarias nuevas después de escribir lógica financiera en `ticketLogic.ts` o endpoints de pago en `server.ts`. | 2 | Ausencia de compuerta explícita Red → Green antes de V3. | Crear `.agent/workflows/tdd-builder.md` con secuencia obligatoria RED → confirmar fallo con `npm test` → GREEN. | **Promovida** (`v3.0`) |

---

## 3. Registro de Experimentos Controlados (Regla de 1 Variable)

> Según `.agent/rules/02-model-routing.md`, cada experimento modifica **únicamente 1 variable** (Modelo **o** Paso del flujo **o** Subagente) y compara Coste/Latencia vs. Calidad.

| ID Exp | Fecha | Variable Modificada (Solo 1) | Línea Base (*Baseline*) | Variante (*Experiment*) | Resultado Coste vs. Calidad | Decisión |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| `EXP-01` | *Pendiente* | *Modelo en `code-reviewer`* | Alto Razonamiento | Nivel Económico / Rápido | *Medir en próxima sesión MEDIO/ALTO: puntaje promedio y reintentos.* | En espera |
