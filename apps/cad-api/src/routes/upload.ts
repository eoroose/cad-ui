import { Router } from 'express';
import { PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createId } from '@paralleldrive/cuid2';
import { prisma } from '../lib/prisma.js';
import { s3, rewritePresignedUrl } from '../lib/s3.js';
import { cadQueue } from '../lib/queue.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate, asyncHandler } from '../middleware/validate.js';
import { PresignRequestSchema, ConfirmRequestSchema } from '@cad/scene-schema';

const router = Router();

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB
const ALLOWED_EXTENSIONS = ['.step', '.stp'];
const PRESIGN_TTL = 3600;

router.post(
  '/presign',
  requireAuth,
  validate(PresignRequestSchema),
  asyncHandler(async (req, res) => {
    const { filename, contentType, sizeBytes } = req.body;
    const userId = req.user!.userId;

    // Validate extension
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      res.status(400).json({ error: 'Invalid file type', code: 'INVALID_FILE_TYPE' });
      return;
    }

    // Validate size
    if (sizeBytes > MAX_FILE_SIZE) {
      res.status(413).json({ error: 'File too large (max 200 MB)', code: 'FILE_TOO_LARGE' });
      return;
    }

    const fileId = createId();
    const s3Key = `uploads/${userId}/${fileId}.step`;
    const bucket = process.env.S3_BUCKET!;

    // Generate presigned PUT URL
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      ContentType: contentType,
      ContentLength: sizeBytes,
    });
    const rawUrl = await getSignedUrl(s3, command, { expiresIn: PRESIGN_TTL });
    const uploadUrl = rewritePresignedUrl(rawUrl);
    const expiresAt = new Date(Date.now() + PRESIGN_TTL * 1000).toISOString();

    // Create Scene + Asset records
    const scene = await prisma.scene.create({
      data: {
        userId,
        name: filename,
        originalStepKey: s3Key,
        assets: {
          create: {
            assetType: 'STEP',
            s3Key,
            sizeBytes: BigInt(sizeBytes),
            mimeType: contentType,
          },
        },
      },
    });

    res.json({ uploadUrl, s3Key, sceneId: scene.id, expiresAt });
  }),
);

router.post(
  '/confirm',
  requireAuth,
  validate(ConfirmRequestSchema),
  asyncHandler(async (req, res) => {
    const { sceneId, s3Key, name } = req.body;
    const userId = req.user!.userId;

    const scene = await prisma.scene.findFirst({
      where: { id: sceneId, userId },
    });
    if (!scene) {
      res.status(404).json({ error: 'Scene not found', code: 'NOT_FOUND' });
      return;
    }
    if (scene.originalStepKey !== s3Key) {
      res.status(400).json({ error: 'S3 key mismatch', code: 'S3_KEY_MISMATCH' });
      return;
    }

    // Verify file exists in S3
    try {
      await s3.send(new HeadObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: s3Key }));
    } catch {
      res.status(422).json({ error: 'File not found in storage', code: 'S3_OBJECT_NOT_FOUND' });
      return;
    }

    // Update scene status
    await prisma.scene.update({
      where: { id: sceneId },
      data: { status: 'PROCESSING', ...(name && { name }) },
    });

    // Enqueue job
    const bullJob = await cadQueue.add('process-step', { sceneId, s3Key, userId });
    const job = await prisma.job.create({
      data: {
        sceneId,
        bullJobId: String(bullJob.id),
        status: 'PENDING',
      },
    });

    res.json({ jobId: job.id, sceneId, status: 'PENDING' });
  }),
);

export default router;
