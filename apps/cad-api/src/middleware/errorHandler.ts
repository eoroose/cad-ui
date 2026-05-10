import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: err.errors,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
      return;
    }
  }

  console.error('Unhandled error:', err);
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : String(err);
  res.status(500).json({ error: message, code: 'INTERNAL_ERROR' });
}
