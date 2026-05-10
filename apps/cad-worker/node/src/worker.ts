import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { spawn } from 'child_process';
import { incrementActive, decrementActive } from './health.js';

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export interface ProcessStepJobData {
  sceneId: string;
  s3Key: string;
  userId: string;
}

async function processStep(job: Job<ProcessStepJobData>): Promise<void> {
  const { sceneId, s3Key, userId } = job.data;
  incrementActive();

  return new Promise<void>((resolve, reject) => {
    const args = [
      '/app/python/main.py',
      '--job-id', job.id!,
      '--scene-id', sceneId,
      '--s3-key', s3Key,
      '--user-id', userId,
    ];

    const pythonBin = process.env.PYTHON_BIN ?? 'python';
    const child = spawn(pythonBin, args, {
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    });

    const stderrLines: string[] = [];

    child.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        console.log(`[worker][${sceneId}] ${line}`);
        const progressMatch = line.match(/^PROGRESS:(\d+)$/);
        if (progressMatch) {
          const pct = Math.min(100, Math.max(0, parseInt(progressMatch[1], 10)));
          job.updateProgress(pct).catch(() => {});
        }
      }
    });

    child.stderr.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        console.error(`[worker][${sceneId}][stderr] ${line}`);
        stderrLines.push(line);
      }
    });

    child.on('close', (code) => {
      decrementActive();
      if (code === 0) {
        resolve();
      } else {
        const lastError = stderrLines[stderrLines.length - 1] ?? `Python exited with code ${code}`;
        reject(new Error(lastError));
      }
    });

    child.on('error', (err) => {
      decrementActive();
      reject(err);
    });
  });
}

export function createWorker(): Worker<ProcessStepJobData> {
  const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 2);
  const lockDuration = Number(process.env.WORKER_LOCK_DURATION_MS ?? 600000);

  const worker = new Worker<ProcessStepJobData>('cad-processing', processStep, {
    connection,
    concurrency,
    lockDuration,
  });

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed for scene ${job.data.sceneId}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed for scene ${job?.data.sceneId}:`, err.message);
  });

  return worker;
}
