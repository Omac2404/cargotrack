# ============================================================
# CargoTrack + Intertrans — Birleşik Production Dockerfile
# ============================================================
# Stage 1: Intertrans static export (Next.js → HTML/CSS/JS)
# Stage 2: Cargotrack frontend build (Vite, /panel basename)
# Stage 3: Backend runtime + her iki frontend artifact'i
#
# Yapılandırma:
#   intertransmms.com/        → Stage 1 çıktısı (intertrans static)
#   intertransmms.com/panel   → Stage 2 çıktısı (cargotrack SPA)
#   intertransmms.com/api/*   → Express backend
# ============================================================

# ──────────── STAGE 1 ─────────── Intertrans static export ────────────
FROM node:20-alpine AS intertrans-builder

WORKDIR /build/intertrans

COPY intertrans/package*.json ./
RUN npm install --no-audit --prefer-offline --no-fund

COPY intertrans/ ./

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# next build → out/ klasörü (output: 'export' next.config.ts'de)
RUN npm run build

# Build çıktısı: /build/intertrans/out/* (index.html, hakkimizda/, hizmetler/, ...)

# ──────────── STAGE 2 ─────────── Cargotrack frontend build ────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

COPY frontend/package*.json ./
RUN npm install --no-audit --prefer-offline --no-fund

COPY frontend/ ./
# Vite outDir = '../public' → build /build/public altına yazılır
# base = '/panel/' → tüm asset URL'leri /panel/assets/... olur
RUN mkdir -p /build/public && npm run build

# ──────────── STAGE 3 ─────────── Backend runtime ────────────
FROM node:20-alpine AS runtime

# tini → graceful shutdown signal handler (PID 1 problem'i çözer)
RUN apk add --no-cache tini

WORKDIR /app

# Backend deps (production only)
COPY package*.json ./
RUN npm install --omit=dev --no-audit --prefer-offline --no-fund && npm cache clean --force

# Backend kaynak
COPY app.js ./
COPY src/ ./src/
COPY db/ ./db/
COPY scripts/ ./scripts/
COPY ecosystem.config.js ./

# Cargotrack SPA → /app/public/ (express.static '/panel' altında servet edecek)
COPY --from=frontend-builder /build/public/ ./public/

# Intertrans static export → /app/public_intertrans/ (express '/' altında servet edecek)
COPY --from=intertrans-builder /build/intertrans/out/ ./public_intertrans/

# Uploads dizini (persistent volume olarak mount edilir)
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads && chmod 1777 /app/uploads

# Non-root user
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "app.js"]
