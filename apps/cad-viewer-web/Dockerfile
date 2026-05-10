FROM node:20-alpine
RUN npm install -g pnpm
WORKDIR /app

# Install dependencies (layer cache)
COPY package.json pnpm-workspace.yaml tsconfig.base.json .npmrc ./
COPY apps/cad-viewer-web/package.json ./apps/cad-viewer-web/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/scene-schema/package.json ./packages/scene-schema/
RUN pnpm install

# Copy source and build shared packages so their dist/ is available to Vite
COPY packages/shared-types/src ./packages/shared-types/src/
COPY packages/shared-types/tsconfig.json ./packages/shared-types/
COPY packages/scene-schema/src ./packages/scene-schema/src/
COPY packages/scene-schema/tsconfig.json ./packages/scene-schema/
RUN pnpm --filter @cad/shared-types build
RUN pnpm --filter @cad/scene-schema build

COPY apps/cad-viewer-web ./apps/cad-viewer-web/

EXPOSE 5173
CMD ["pnpm", "--filter", "@cad/viewer-web", "dev"]
