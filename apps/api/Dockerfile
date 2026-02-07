# ===========================================
# TraderPath API - Production Dockerfile
# Multi-stage build for minimal image size
# ===========================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.12.0 --activate

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/analysis-engine/package.json ./packages/analysis-engine/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api ./apps/api
COPY packages/types ./packages/types
COPY packages/analysis-engine ./packages/analysis-engine
COPY tsconfig.json ./

# Build workspace packages first (required before API build)
WORKDIR /app/packages/types
RUN npx tsc

WORKDIR /app/packages/analysis-engine
RUN npx tsc

# Generate Prisma client and build API
WORKDIR /app/apps/api
RUN pnpm run db:generate && pnpm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm for production
RUN corepack enable && corepack prepare pnpm@8.12.0 --activate

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 traderpath

# Copy built files
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/node_modules ./node_modules

# Copy built workspace packages (needed at runtime - tsup externalizes these)
COPY --from=builder /app/packages/types/dist ./node_modules/@traderpath/types/dist
COPY --from=builder /app/packages/types/package.json ./node_modules/@traderpath/types/package.json
COPY --from=builder /app/packages/analysis-engine/dist ./node_modules/@traderpath/analysis-engine/dist
COPY --from=builder /app/packages/analysis-engine/package.json ./node_modules/@traderpath/analysis-engine/package.json

# Set environment
ENV NODE_ENV=production
ENV PORT=4000

# Expose port
EXPOSE 4000

# Health check - give server enough time to start (DB connect has 10s timeout)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Run as non-root user
USER traderpath

# Start the application
CMD ["node", "dist/index.js"]
