# Remote Support 365

Aplicación web de soporte técnico remoto bajo demanda y gestión operativa multiempresa con triaje asistido por IA (Gemini), salas de conexión RustDesk, pagos verificados en servidor (Stripe / PayPal) y persistencia en Supabase PostgreSQL con RLS.

## Stack principal
- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS 4, Lucide Icons.
- **Backend:** Express + TypeScript (`server.ts`), Stripe SDK, PayPal REST v2, `@google/genai`.
- **Base de datos y Auth:** Supabase (PostgreSQL, Auth, Realtime, Row Level Security y RPCs).

## Requisitos
- Node.js `>= 22.12.0` (recomendado Node 24 LTS).
- `npm` (gestor de paquetes oficial del repositorio; `package-lock.json`).

## Configuración local

1. Instala dependencias:
   ```bash
   npm ci
   ```
2. Copia `.env.example` a `.env` y completa las credenciales necesarias:
   ```bash
   cp .env.example .env
   ```
   - **Modo demo local (sin Supabase ni pasarelas reales):** deja sin configurar las variables de Supabase y ejecuta con `PAYMENTS_MODE=sandbox`.
   - **Producción:** requiere `PAYMENTS_MODE=live`, `APP_URL` (`https://...`), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, y credenciales reales de Stripe/PayPal.

3. Inicia el servidor de desarrollo (Express + Vite middleware en el puerto `3000`):
   ```bash
   PAYMENTS_MODE=sandbox npm run dev
   ```

## Scripts disponibles
| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo (`tsx server.ts`). |
| `npm run lint` | Verificación estricta de tipos (`tsc --noEmit`). |
| `npm test` | Ejecuta pruebas unitarias (`src/utils/ticketLogic.test.ts`). |
| `npm run build` | Compila el bundle de producción en `dist/`. |
| `npm start` | Inicia el servidor (`node server.ts`). |

## Base de datos y migraciones (Supabase)
- Esquema completo de instalación inicial: `supabase/schema.sql`.
- Migraciones incrementales: `supabase/migrations/`.
- El workflow `.github/workflows/supabase-migrations.yml` aplica automáticamente nuevas migraciones en `main` mediante `supabase db push --remote --yes` usando los secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` y `SUPABASE_DB_PASSWORD`.

## Integración Continua (GitHub Actions)
- `.github/workflows/ci.yml`: ejecuta `npm run lint`, `npm test` y `npm run build` en cada push a `main` y Pull Request.
- `.github/dependabot.yml`: revisiones semanales de dependencias `npm` y `github-actions`.
