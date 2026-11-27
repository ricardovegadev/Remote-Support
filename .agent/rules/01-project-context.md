# 01 · PROJECT CONTEXT — Contexto Exclusivo de Remote Support 365

> **Alcance:** Reglas, identidad visual, catálogo comercial e integraciones específicas de **Remote Support 365**.  
> **Jerarquía:** Complementa los estándares universales de `.agent/rules/00-factory-standards.md` y el flujo de `.agent/FACTORY_PROTOCOL.md`.

---

## 1. Memoria Obligatoria del Proyecto (EGM)

Antes de planificar o modificar cualquier archivo de **Remote Support 365**, es obligatorio leer:
- **`docs/egm/00_ELEPHANT_MEMORY.md`** — Verdad única de arquitectura, catálogo, endpoints, seguridad y estado del proyecto.
- **`docs/egm/01_DECISION_LOG.md`** — Decisiones arquitectónicas inmutables (`ADR-01` a `ADR-05` y posteriores).

Al finalizar cualquier iteración verificada, registrar los cambios y resultados de validación en **`docs/egm/03_SESSION_CHANGELOG.md`**.

---

## 2. Identidad Visual y Dispositivos Objetivo

### 2.1 Paleta Corporativa Oficial
| Token | Código Hex | Uso Principal |
| :--- | :--- | :--- |
| **Navy Profundo** | `#0B192C` / `#0B1528` | Titulares corporativos, navegación destacada, tarjetas Pyme Pro, footer y sidebar de operaciones |
| **Azul Eléctrico** | `#2563EB` | CTAs primarios, enlaces activos, acentos de diagnóstico y tarjeta destacada |
| **Verde Esmeralda** | `#10B981` (`emerald-700` en texto AA sobre claro) | Garantías, estado conectado, validaciones de seguridad y confirmaciones |
| **Fondo Claro** | `#F8FAFC` / `#F6F8FB` | Lienzo principal del portal público, secciones alternadas y formularios |

### 2.2 Tipografía y Dispositivos Objetivo
- **Tipografía:** `Plus Jakarta Sans` (display/titulares), `Inter` (UI/cuerpo) y `JetBrains Mono` con `tabular-nums` para precios, códigos de ticket `RS-XXXX` e IDs remotos de 9 dígitos.
- **Dispositivos Objetivo (validación obligatoria sin desbordamiento horizontal):**
  - **Desktop** (pantallas de escritorio estándar y amplias).
  - **Lenovo Tab P12** (tablet de alta resolución en orientación horizontal y vertical).
  - **Motorola Signature** (móvil).

---

## 3. Catálogo Comercial Separado

Mantener separación estricta entre las tres líneas comerciales del producto:

### 3.1 Asistencia Puntual Bajo Demanda (Pago único por incidente)
- **Express:** **$15 USD** — Impresoras, correo Outlook/Microsoft 365, Wi-Fi/red, aplicaciones que no arrancan.
- **Optimización (Recomendado):** **$29 USD** — Windows lento o bajo rendimiento, eliminación de malware/virus y actualizaciones fallidas.
- **Avanzado:** **$39 USD** — Pantallazos azules (BSOD), recuperación de archivos y VPN/acceso remoto.
- **Complementos opcionales en Checkout (`ConnectionRoom.tsx`):**
  - Optimización profunda: **`+$12 USD`**.
  - Respaldo crítico en la nube: **`+$9 USD`**.

### 3.2 Planes Mensuales Pyme (Acceso desatendido y SLA)
- **Pyme Esencial:** **$39 USD / mes** (hasta 5 equipos, agente instalado, SLA < 15 min).
- **Pyme Corporativo:** **$79 USD / mes** (hasta 15 equipos, SLA < 10 min).
- Aviso transparente de renovación automática mensual y cancelación en 1 clic antes del pago.

### 3.3 Planes SaaS Multiempresa (`"Para Empresas de Soporte (SaaS)"`)
- **Starter MSP:** **$29 USD / mes**.
- **Growth Helpdesk:** **$49 USD / mes**.
- **Scale Marketplace:** **$79 USD / mes**.
- Controlado mediante feature flag no destructivo (`FEATURE_FLAGS.ENABLE_SAAS_MULTITENANT` en `src/config/features.ts`).

---

## 4. Motor Remoto RustDesk (`ADR-01`)

- **Descarga Oficial Dinámica:** Todos los botones de descarga del agente cliente deben apuntar al endpoint del servidor **`/api/rustdesk/official-download`** (con override opcional vía `VITE_RUSTDESK_WINDOWS_URL` / `VITE_RUSTDESK_MAC_URL`).
- **Red Pública Oficial en Etapa 1:** El usuario final utiliza la **red pública oficial de RustDesk sin configuración manual** de servidor relay ni clave pública; solo abre el ejecutable oficial, copia su ID de 9 dígitos y lo introduce en la Sala de Conexión.
- **Prohibiciones:** No generar archivos `Blob` sintéticos en el navegador ni exigir variables de entorno obligatorias de servidor/clave RustDesk en Etapa 1.
- **Lanzamiento Técnico:** Enlace directo `rustdesk://connection/new/[9_DIGITS]` acompañado de botón fallback para copiar el ID.

---

## 5. Pasarelas de Pago Activas (`ADR-02`)

- **Métodos Oficiales Habilitados:**
  - **Google Pay (`G Pay`)**
  - **PayPal**
  - **Stripe**
  - **Tarjeta (`VISA / MC / AMEX`)** mediante Stripe Checkout hospedado 100 % PCI-DSS.
- **Activos de Marca:** Utilizar los logotipos vectoriales SVG oficiales de `src/components/PaymentBrandLogos.tsx`.
- **Restricción Inmutable:** **Estrictamente prohibido incluir o habilitar "Link"** como método o botón de pago en el checkout.

---

## 6. Acuerdos y Skills Específicas del Proyecto

- **Acuerdos y Versiones Vigentes:** Términos y Cookies `v1.0-2026`, NDA Cliente `NDA-CLIENT-v1.0-2026`, NDA Especialista `NDA-TECH-v1.0-2026` (red de especialistas `/postular` y `/registro-tecnico` con escala 65%–85%).
- **Skills Especializadas en `.agent/skills/`:**
  - `rs365-qa-auditor` (auditoría QA en modo solo lectura).
  - `rs365-supabase-architect` (esquema PostgreSQL, migraciones y RLS).
  - `rs365-ui-polish` (pulido visual, responsive y WCAG AA).
  - `rs365-tech-ceo` (estrategia técnica y arquitectura de producto).
  - `app-preview` (verificación en vivo).
