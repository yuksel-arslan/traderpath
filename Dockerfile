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

# Copy source files
COPY apps/api/ ./apps/api/
COPY packages/types/ ./packages/types/
COPY packages/analysis-engine/ ./packages/analysis-engine/
COPY tsconfig.json ./

# Build the API
WORKDIR /app/apps/api
RUN pnpm run build

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
