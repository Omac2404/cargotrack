# ============================================================
# Intertrans MMS — Next.js 16 production Dockerfile
# Standalone output: minimal image, no full node_modules at runtime
# ============================================================

# ──────────── STAGE 1 ─────────── Deps + Build ────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Önce sadece package files (cache-friendly)
COPY package*.json ./
RUN npm install --no-audit --prefer-offline --no-fund

# Kaynak
COPY . .

# Telemetry kapalı (build-time)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# next build → .next/standalone + .next/static
RUN npm run build

# ──────────── STAGE 2 ─────────── Runtime ────────────
FROM node:20-alpine AS runtime

RUN apk add --no-cache tini

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4000
ENV HOSTNAME=0.0.0.0

# Standalone build → minimal server.js + gerekli node_modules subset
COPY --from=builder /app/.next/standalone ./
# Static assets ve public dosyaları (CDN olmadığı için manuel)
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Non-root user (Alpine node:20 image'inde varsayılan)
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/ || exit 1

EXPOSE 4000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
