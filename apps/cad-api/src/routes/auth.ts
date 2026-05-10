import { Router } from 'express';
import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { validate, asyncHandler } from '../middleware/validate.js';
import { LoginRequestSchema } from '@cad/scene-schema';

const router = Router();

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many requests', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});

function signAccessToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET!, {
    expiresIn: Number(process.env.JWT_EXPIRY ?? 3600),
  });
}

function generateRefreshToken(): { raw: string; hash: string } {
  const raw = randomBytes(40).toString('hex');
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

router.post(
  '/login',
  loginRateLimit,
  validate(LoginRequestSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Always run bcrypt.compare to prevent timing attacks
    const user = await prisma.user.findUnique({ where: { email } });
    const dummyHash = '$2b$12$invalidhashtopreventtimingattack00000000000000000000000000';
    const isValid = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);

    if (!user || !isValid) {
      res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
      return;
    }

    const accessToken = signAccessToken(user.id, user.email);
    const { raw, hash } = generateRefreshToken();
    const expiresAt = new Date(Date.now() + Number(process.env.REFRESH_TOKEN_EXPIRY_DAYS ?? 7) * 86400000);

    await prisma.refreshToken.create({ data: { userId: user.id, tokenHash: hash, expiresAt } });

    res
      .cookie('refreshToken', raw, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: expiresAt,
        path: '/api/v1/auth/refresh',
      })
      .json({ accessToken, user: { id: user.id, email: user.email, createdAt: user.createdAt } });
  }),
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const raw = req.cookies?.refreshToken as string | undefined;
    if (!raw) {
      res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
      return;
    }

    const hash = createHash('sha256').update(raw).digest('hex');
    const existing = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });

    if (!existing || existing.expiresAt < new Date()) {
      // Replay or expired: revoke all tokens for that user if token is known
      if (existing) {
        await prisma.refreshToken.deleteMany({ where: { userId: existing.userId } });
      }
      res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
      return;
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: existing.userId } });
    const accessToken = signAccessToken(user.id, user.email);
    const { raw: newRaw, hash: newHash } = generateRefreshToken();
    const expiresAt = new Date(Date.now() + Number(process.env.REFRESH_TOKEN_EXPIRY_DAYS ?? 7) * 86400000);

    await prisma.refreshToken.delete({ where: { id: existing.id } });
    await prisma.refreshToken.create({ data: { userId: user.id, tokenHash: newHash, expiresAt } });

    res
      .cookie('refreshToken', newRaw, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: expiresAt,
        path: '/api/v1/auth/refresh',
      })
      .json({ accessToken });
  }),
);

export default router;
