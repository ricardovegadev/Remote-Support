# WORKFLOW · TDD BUILDER — Regla Obligatoria Red → Green → Refactor

> **Alcance:** Regla vinculante para el rol **Builder** antes de modificar cualquier lógica crítica de negocio, cálculo financiero, evaluación técnica o endpoints sensibles en servidor.

---

## 1. Módulos con TDD Estricto Obligatorio

Queda **prohibido** escribir código de producción primero en cualquiera de estos módulos:

1. **Lógica Financiera, Tarifas, Comisiones y Reglas de Ticket:**
   - `src/utils/ticketLogic.ts` (pruebas en `src/utils/ticketLogic.test.ts`)
   - Cálculos de comisiones de pasarela, base neta, porcentajes `65 % / 75 % / 80 % / 85 %`, validaciones `+18`, tokens criptográficos y transiciones de estado (`authorized → pending_client_confirmation → paid / voided`).
2. **Evaluación, Scoring y Calificación de Especialistas:**
   - `src/utils/techEvaluation.ts` / funciones de evaluación técnica, puntaje ponderado, temporizador y recomendaciones en `src/utils/ticketLogic.ts`.
3. **Endpoints Críticos de Servidor (`server.ts`):**
   - Pagos (`POST /api/payments/stripe/*`, `/api/payments/paypal/*`, `/api/payments/capture`, `/api/payments/void`).
   - Autenticación, RBAC, invitaciones y membresías (`POST /api/team/invite`, `PATCH /api/team/members/:memberId`, `/api/technicians/*`).
   - Privacidad ARCO/OTP (`/api/privacy/*`) y rutas de IA protegidas (`/api/ai/*`).
   - Pruebas reales en `src/server/server.test.ts`.
4. **Hooks Deterministas de la Fábrica:**
   - `scripts/factory-risk-gate.mjs` (pruebas en `scripts/factory-risk-gate.test.mjs`).

---

## 2. Secuencia Obligatoria de 3 Pasos (Red → Confirmación de Fallo → Green)

El Builder debe ejecutar y evidenciar los tres pasos **en este orden exacto**:

### Paso A — RED: Escribir primero el test que falla
1. Identificar el contrato exacto en la especificación (`Spec Writer`) y en `docs/egm/01_DECISION_LOG.md`.
2. Escribir la prueba unitaria o de integración con `node:test` y `node:assert/strict` cubriendo:
   - **Caso nominal (*happy path*):** Entrada válida produce el resultado exacto esperado (incluyendo invariantes de centavos en cálculos USD).
   - **Casos borde (*edge cases*):** Límites de edad (17 años 364 días vs 18 años exactos), valores límite de comisiones, tokens expirados/reutilizados, campos vacíos.
   - **Casos de rechazo / seguridad (*negative tests*):** Rol insuficiente (`403`), intento de degradar/suspender `owner`, firma/token inválido, entrada maliciosa.

### Paso B — VERIFICAR RED: Ejecutar `npm test` confirmando el fallo esperado
1. Ejecutar `npm test` (o `npx --yes tsx --test <archivo_test>`) **antes** de tocar el código de producción.
2. Confirmar explícitamente que el test nuevo **falla por la razón correcta** (aserción de comportamiento faltante o regla aún no implementada, NO por un simple error de sintaxis).
3. *Por qué es obligatorio:* Si un test pasa antes de escribir el código, es una prueba tautológica o desconectada de la lógica real y debe corregirse antes de avanzar.

### Paso C — GREEN (+ Refactor Mínimo): Escribir el código mínimo hasta ponerlo en verde
1. Implementar **únicamente** el código mínimo y limpio necesario en producción para satisfacer la especificación y hacer pasar la prueba nueva.
2. Re-ejecutar `npm test` verificando que **el 100 % de las pruebas (nuevas + existentes) pasan en verde** (`fail 0`).
3. Si se requiere refactorizar legibilidad o extraer helpers puros, mantener `npm test` en verde tras cada ajuste.
4. Ejecutar el resto de compuertas: `npm run lint`, `npm run build` y `npm run factory:gate`.

---

## 3. Reglas Anti-Tautología y Prohibiciones

- **Nunca** debilitar, comentar ni borrar un test existente para hacer pasar un cambio nuevo.
- **Nunca** escribir tests que únicamente re-implementen la misma fórmula del código o afirmen constantes triviales (`assert.equal(true, true)`).
- **Nunca** omitir el Paso B (ejecutar el test en rojo) al modificar `ticketLogic.ts`, `techEvaluation.ts` o endpoints de `server.ts`.
- Toda nueva prueba agregada será auditada por el subagente **`code-reviewer`** en contexto limpio.
