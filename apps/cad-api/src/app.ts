import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.js';
import uploadRouter from './routes/upload.js';
import jobsRouter from './routes/jobs.js';
import scenesRouter from './routes/scenes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173').split(','),
      credentials: true,
    }),
  );

  // Body parsing
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  // Health check (no auth)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/upload', uploadRouter);
  app.use('/api/v1/jobs', jobsRouter);
  app.use('/api/v1/scenes', scenesRouter);

  // Centralized error handler (must be last)
  app.use(errorHandler);

  return app;
}
