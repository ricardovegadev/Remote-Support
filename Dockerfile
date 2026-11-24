# Multi-stage production Dockerfile for Remote Support 365 (Google Cloud Run · Node 24 LTS)
FROM node:24-slim AS builder
WORKDIR /app

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_RUSTDESK_WINDOWS_URL
ARG VITE_RUSTDESK_MAC_URL

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_RUSTDESK_WINDOWS_URL=$VITE_RUSTDESK_WINDOWS_URL
ENV VITE_RUSTDESK_MAC_URL=$VITE_RUSTDESK_MAC_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV TRUST_PROXY=1

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY server.ts ./server.ts
COPY src/server ./src/server
COPY src/utils/techEvaluation.ts ./src/utils/techEvaluation.ts
COPY src/types ./src/types

USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8080) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.ts"]
