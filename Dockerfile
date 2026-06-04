# ============================================================
# CargoTrack — Production Dockerfile (multi-stage)
# ============================================================
# Stage 1: Frontend build (Vite production bundle)
# Stage 2: Backend runtime + frontend artifact
#
# Build:
#   docker build -t cargotrack .
# Run:
#   docker run -p 3000:3000 --env-file .env.production cargotrack
# ============================================================

# ──────────── STAGE 1 ─────────── Frontend build ────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

# Önce package files — better caching
COPY frontend/package*.json ./
RUN npm install --no-audit --prefer-offline --no-fund

# Frontend kaynak
COPY frontend/ ./
# Vite outDir = '../public' → build /build/public altına yazılır
RUN mkdir -p /build/public && npm run build

# Build çıktısı: /build/public/assets/* + /build/public/index.html

# ──────────── STAGE 2 ─────────── Backend runtime ────────────
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

# Frontend build çıktısını al
COPY --from=frontend-builder /build/public/ ./public/

# Uploads dizini (persistent volume olarak mount edilir)
# 1777 = world-writable + sticky → EasyPanel/Docker named volume root-owned mount'unu
# override etse de node user yazabilir. Sticky bit cross-user delete'i engeller.
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads && chmod 1777 /app/uploads

# Non-root user (güvenlik)
USER node

# Healthcheck — /api/health endpoint'i
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

EXPOSE 3000

# tini PID 1 olur → SIGTERM/SIGINT'i node'a iletir → graceful shutdown çalışır
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "app.js"]
