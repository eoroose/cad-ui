-- CreateEnum
CREATE TYPE "SceneStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('STEP', 'GLB', 'SCENE_JSON', 'THUMBNAIL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SceneStatus" NOT NULL DEFAULT 'PENDING',
    "originalStepKey" TEXT NOT NULL,
    "sceneJsonKey" TEXT,
    "mergedGlbKey" TEXT,
    "nodeCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "bullJobId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "workerPid" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "s3Key" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_nodes" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "transformMatrix" DOUBLE PRECISION[],
    "meshAssetId" TEXT,
    "jointType" TEXT,
    "jointAxis" DOUBLE PRECISION[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scene_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "scenes_userId_idx" ON "scenes"("userId");

-- CreateIndex
CREATE INDEX "scenes_status_idx" ON "scenes"("status");

-- CreateIndex
CREATE INDEX "scenes_userId_createdAt_idx" ON "scenes"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "jobs_bullJobId_key" ON "jobs"("bullJobId");

-- CreateIndex
CREATE INDEX "jobs_sceneId_idx" ON "jobs"("sceneId");

-- CreateIndex
CREATE INDEX "jobs_bullJobId_idx" ON "jobs"("bullJobId");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "jobs_sceneId_createdAt_idx" ON "jobs"("sceneId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "assets_s3Key_key" ON "assets"("s3Key");

-- CreateIndex
CREATE INDEX "assets_sceneId_idx" ON "assets"("sceneId");

-- CreateIndex
CREATE INDEX "assets_sceneId_assetType_idx" ON "assets"("sceneId", "assetType");

-- CreateIndex
CREATE INDEX "scene_nodes_sceneId_idx" ON "scene_nodes"("sceneId");

-- CreateIndex
CREATE INDEX "scene_nodes_parentId_idx" ON "scene_nodes"("parentId");

-- CreateIndex
CREATE INDEX "scene_nodes_sceneId_parentId_idx" ON "scene_nodes"("sceneId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "scene_nodes_sceneId_externalId_key" ON "scene_nodes"("sceneId", "externalId");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_nodes" ADD CONSTRAINT "scene_nodes_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
