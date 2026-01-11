# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.12.0 --activate

WORKDIR /app

# Copy package files for all workspaces
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/analysis-engine/package.json ./packages/analysis-engine/

# Install dependencies
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
RUN pnpm install --frozen-lockfile

# Copy source files (NOT copying apps/web or tsconfig.json to prevent TypeScript issues)
COPY apps/api/ ./apps/api/
COPY packages/types/ ./packages/types/
COPY packages/analysis-engine/ ./packages/analysis-engine/

# Generate Prisma client
WORKDIR /app/apps/api
RUN pnpm exec prisma generate

# Build API with esbuild directly (no TypeScript type checking)
RUN pnpm exec esbuild src/**/*.ts --outdir=dist --platform=node --target=node20 --format=esm --sourcemap

# Production stage
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@8.12.0 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/analysis-engine/package.json ./packages/analysis-engine/

# Install production dependencies only
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
RUN pnpm install --frozen-lockfile --prod

# Copy built files and source (for TypeScript imports)
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY packages/types/src ./packages/types/src
COPY packages/analysis-engine/src ./packages/analysis-engine/src

WORKDIR /app/apps/api

# Generate Prisma client
RUN pnpm run db:generate || true

EXPOSE 3001

CMD ["node", "dist/index.js"]
