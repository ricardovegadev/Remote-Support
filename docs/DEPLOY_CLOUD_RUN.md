# Guía de Despliegue en Producción — Google Cloud Run (Remote Support 365)

Esta guía permite desplegar **Remote Support 365** con HTTPS automático, accesible desde escritorio y dispositivos móviles, usando el [`Dockerfile`](../Dockerfile) y el workflow manual [`.github/workflows/deploy-cloud-run.yml`](../.github/workflows/deploy-cloud-run.yml).

---

## 1. Requisitos previos en Google Cloud (una sola vez)

1. Crea o selecciona tu proyecto en [Google Cloud Console](https://console.cloud.google.com/).
2. Activa las APIs:
   - **Cloud Run Admin API** (`run.googleapis.com`)
   - **Artifact Registry API** (`artifactregistry.googleapis.com`)
3. Crea una **Service Account** (ej. `github-cloudrun-deployer`) con los roles:
   - `roles/run.admin`
   - `roles/artifactregistry.writer`
   - `roles/iam.serviceAccountUser`
4. Genera su clave JSON y guárdala para el secret `GCP_SA_KEY`.

---

## 2. Secrets en GitHub (`Settings -> Secrets and variables -> Actions`)

### Obligatorios para arrancar en producción
| Secret | Descripción |
| :--- | :--- |
| `GCP_PROJECT_ID` | ID del proyecto en Google Cloud |
| `GCP_SA_KEY` | Contenido JSON completo de la Service Account |
| `APP_URL` | URL pública HTTPS final (ej. `https://remote-support-365-xxxx.a.run.app` o tu dominio propio) |
| `VITE_SUPABASE_URL` | URL pública de tu proyecto Supabase (`https://xxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Clave pública `anon` de Supabase |
| `SUPABASE_URL` | Misma URL de Supabase (solo servidor) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave `service_role` de Supabase (**nunca** con prefijo `VITE_`) |
| `GEMINI_API_KEY` | Clave API de Google Gemini (`gemini-2.5-flash`) |

### Pagos y Correo (necesarios para cobros live y onboarding técnico)
| Secret | Descripción |
| :--- | :--- |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe (`sk_live_...` o `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Secreto de firma del webhook (`whsec_...`) apuntando a `https://<APP_URL>/api/payments/stripe/webhook` |
| `PAYPAL_CLIENT_ID` | Client ID de PayPal |
| `PAYPAL_CLIENT_SECRET` | Client Secret de PayPal |
| `GMAIL_USER` | Correo Gmail/Workspace para envío de invitaciones de técnicos |
| `GMAIL_APP_PASSWORD` | Contraseña de aplicación de 16 caracteres |

---

## 3. Ejecutar el Despliegue

1. En GitHub, ve a **Actions -> Deploy to Google Cloud Run**.
2. Pulsa **Run workflow** en la rama `main`:
   - `service_name`: `remote-support-365`
   - `region`: `us-central1` (o tu región preferida)
   - `payments_mode`: `live` (para producción) o `sandbox` (para Beta Cerrada sin cobros reales)
3. Al finalizar, el workflow verificará automáticamente `GET https://<SERVICE_URL>/api/health` y mostrará la URL pública HTTPS en los logs.

---

## 4. Verificación Post-Despliegue (5 minutos)

1. Abre `https://<SERVICE_URL>` desde PC y desde tu móvil.
2. Verifica en Stripe Dashboard que el webhook apunte a `https://<SERVICE_URL>/api/payments/stripe/webhook` con los eventos:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `charge.refunded`
   - `customer.subscription.updated` / `deleted`
   - `invoice.payment_failed`
3. Verifica en Supabase Auth (`URL Configuration`) que `Site URL` y `Redirect URLs` incluyan `https://<SERVICE_URL>/**` (necesario para recuperación de contraseña y login).
