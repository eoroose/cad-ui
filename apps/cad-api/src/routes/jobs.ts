import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../middleware/validate.js';

const router = Router();

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: { scene: { select: { userId: true } } },
    });
    if (!job) {
      res.status(404).json({ error: 'Job not found', code: 'NOT_FOUND' });
      return;
    }
    if (job.scene.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
      return;
    }
    const { scene: _scene, ...jobData } = job;
    res.json(jobData);
  }),
);

export default router;
