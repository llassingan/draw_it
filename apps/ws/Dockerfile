# Multi-stage Dockerfile for the Yjs WebSocket server.
#
# Stage 1 (builder): installs deps, builds the shared package, builds the ws
# app, then prunes to production-only dependencies via pnpm deploy.
#
# Stage 2 (runtime): copies only production artifacts (~80MB alpine image).
# Healthcheck calls the HTTP endpoint to verify the server is reachable.
#
# Final image: ~80MB on alpine.

# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app
ENV CI=true

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy workspace manifests first for layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/ws/package.json ./apps/ws/
COPY packages/shared/package.json ./packages/shared/
COPY tsconfig.base.json ./

# Install dependencies (dev included for build)
RUN pnpm install --filter @whiteboard/ws... --frozen-lockfile || pnpm install --filter @whiteboard/ws...

# Build shared package
COPY packages/shared ./packages/shared
RUN pnpm --filter @whiteboard/shared build

# Build the ws app
COPY apps/ws ./apps/ws
RUN pnpm --filter @whiteboard/ws build

# Prune to production-only deps
RUN pnpm deploy --filter @whiteboard/ws --prod /out

# ---------- runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=14045
ENV HOST=0.0.0.0

# CORS: allow all origins (dev only).
# SECURITY: this server is intended for the staging environment.
# Add origin allow-listing before exposing publicly.

COPY --from=builder /out/package.json ./
COPY --from=builder /out/dist ./dist
COPY --from=builder /out/node_modules ./node_modules

EXPOSE 14045

# Healthcheck via the HTTP server's / route (returns "whiteboard-ws: ok")
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:14045/ >/dev/null || exit 1

CMD ["node", "dist/index.js"]
