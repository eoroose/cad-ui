FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
RUN npm install -g pnpm

# Persistent env vars:
# PRISMA_SKIP_POSTINSTALL_GENERATE=1   — prevents @prisma/client postinstall from recursing
# PRISMA_GENERATE_SKIP_AUTOINSTALL=1   — prevents prisma generate from calling pnpm add at all
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1 \
    PRISMA_GENERATE_SKIP_AUTOINSTALL=1

# Copy manifests + prisma schema (schema must exist before pnpm install
# so the postinstall script in apps/cad-api can run prisma generate)
COPY package.json pnpm-workspace.yaml tsconfig.base.json .npmrc ./
COPY prisma ./prisma/
COPY apps/cad-api/package.json ./apps/cad-api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/scene-schema/package.json ./packages/scene-schema/

# pnpm install — PRISMA_SKIP_POSTINSTALL_GENERATE=1 (set above) prevents
# @prisma/client's postinstall from recursively running prisma generate
RUN pnpm install

# Run prisma generate from apps/cad-api dir — Prisma reads package.json prisma.schema
# field, keeping cwd anchored to apps/cad-api where @prisma/client is installed.
# PRISMA_GENERATE_SKIP_AUTOINSTALL=1 (set above) prevents the auto-install check.
RUN cd apps/cad-api && node_modules/.bin/prisma generate

# Copy source after the install+generate layer (keeps install cached)
COPY apps/cad-api/src ./apps/cad-api/src/
COPY apps/cad-api/tsconfig.json ./apps/cad-api/
COPY packages/shared-types/src ./packages/shared-types/src/
COPY packages/shared-types/tsconfig.json ./packages/shared-types/
COPY packages/scene-schema/src ./packages/scene-schema/src/
COPY packages/scene-schema/tsconfig.json ./packages/scene-schema/

RUN pnpm --filter @cad/shared-types build
RUN pnpm --filter @cad/scene-schema build
RUN pnpm --filter @cad/api build

FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl
WORKDIR /app

# pnpm virtual store must be present — all per-package node_modules symlink into it
COPY --from=builder /app/node_modules ./node_modules
# App with its compiled output and pnpm-linked node_modules
COPY --from=builder /app/apps/cad-api ./apps/cad-api
# Compiled shared packages (imported via workspace symlinks)
COPY --from=builder /app/packages ./packages
# Prisma schema + migrations + seed
COPY --from=builder /app/prisma ./prisma
# Workspace manifests (needed if pnpm exec is invoked)
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

COPY apps/cad-api/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
