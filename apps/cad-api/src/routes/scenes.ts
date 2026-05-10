import { Router } from 'express';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '../lib/prisma.js';
import { s3, rewritePresignedUrl } from '../lib/s3.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../middleware/validate.js';

const router = Router();
const PRESIGN_TTL = 3600;

async function getPresignedGetUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key });
  const url = await getSignedUrl(s3, command, { expiresIn: PRESIGN_TTL });
  return rewritePresignedUrl(url);
}

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const offset = Number(req.query.offset ?? 0);

    const [scenes, total] = await Promise.all([
      prisma.scene.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.scene.count({ where: { userId } }),
    ]);

    res.json({ scenes, total, limit, offset });
  }),
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const scene = await prisma.scene.findUnique({
      where: { id: req.params.id },
      include: {
        nodes: true,
        jobs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!scene) {
      res.status(404).json({ error: 'Scene not found', code: 'NOT_FOUND' });
      return;
    }
    if (scene.userId !== userId) {
      res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
      return;
    }

    const latestJob = scene.jobs[0] ?? null;
    let mergedGlbUrl: string | null = null;
    let sceneJsonUrl: string | null = null;

    if (scene.status === 'READY' && scene.mergedGlbKey && scene.sceneJsonKey) {
      [mergedGlbUrl, sceneJsonUrl] = await Promise.all([
        getPresignedGetUrl(scene.mergedGlbKey),
        getPresignedGetUrl(scene.sceneJsonKey),
      ]);
    }

    const { jobs: _jobs, ...sceneData } = scene;
    res.json({ ...sceneData, mergedGlbUrl, sceneJsonUrl, latestJob });
  }),
);

router.get(
  '/:id/assets',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const scene = await prisma.scene.findUnique({
      where: { id: req.params.id },
      select: { userId: true, assets: true },
    });
    if (!scene) {
      res.status(404).json({ error: 'Scene not found', code: 'NOT_FOUND' });
      return;
    }
    if (scene.userId !== userId) {
      res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
      return;
    }

    const assetsWithUrls = await Promise.all(
      scene.assets.map(async (asset) => ({
        ...asset,
        sizeBytes: Number(asset.sizeBytes),
        downloadUrl: await getPresignedGetUrl(asset.s3Key),
      })),
    );
    res.json(assetsWithUrls);
  }),
);

export default router;
