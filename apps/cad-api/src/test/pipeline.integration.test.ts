import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const BASE = process.env.API_BASE_URL ?? 'http://localhost:3000/api/v1';
// When running inside the container use the internal MinIO endpoint for direct S3 SDK upload.
// When running on the host, use the public endpoint.
const MINIO_ENDPOINT = process.env.S3_ENDPOINT ?? process.env.PUBLIC_MINIO_URL ?? 'http://localhost:9000';
const STEP_PATH = path.resolve(__dirname, '../../step-files/assembly.step');
const POLL_INTERVAL_MS = 3_000;
const MAX_WAIT_MS = 120_000;

// S3 client using whichever endpoint is reachable from the current runtime
const s3Test = new S3Client({
  region: process.env.AWS_REGION ?? 'us-east-1',
  endpoint: MINIO_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? process.env.MINIO_ROOT_USER ?? 'minioadmin',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? process.env.MINIO_ROOT_PASSWORD ?? 'minioadmin',
  },
});

async function login(): Promise<string> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dev@example.com', password: 'password' }),
  });
  expect(res.ok, `Login failed: ${res.status}`).toBe(true);
  const data = await res.json() as { accessToken: string };
  expect(data.accessToken, 'No accessToken in login response').toBeTruthy();
  return data.accessToken;
}

async function presign(token: string, sizeBytes: number): Promise<{ uploadUrl: string; s3Key: string; sceneId: string }> {
  const res = await fetch(`${BASE}/upload/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ filename: 'assembly.step', contentType: 'application/step', sizeBytes }),
  });
  const presignText = await res.text();
  expect(res.ok, `Presign failed: ${res.status} ${presignText}`).toBe(true);
  const data = JSON.parse(presignText) as { uploadUrl: string; s3Key: string; sceneId: string };
  expect(data.uploadUrl).toBeTruthy();
  expect(data.sceneId).toBeTruthy();
  return data;
}

async function uploadToMinIO(s3Key: string, fileBuffer: Buffer): Promise<void> {
  // Use S3 SDK directly with the internal/public endpoint (avoids presigned URL hostname mismatch)
  await s3Test.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET ?? 'cad-assets-dev',
    Key: s3Key,
    Body: fileBuffer,
    ContentType: 'application/step',
  }));
}

async function confirm(token: string, sceneId: string, s3Key: string): Promise<string> {
  const res = await fetch(`${BASE}/upload/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ sceneId, s3Key, name: 'Test Assembly' }),
  });
  const confirmText = await res.text();
  expect(res.ok, `Confirm failed: ${res.status} ${confirmText}`).toBe(true);
  const data = JSON.parse(confirmText) as { jobId: string };
  expect(data.jobId).toBeTruthy();
  return data.jobId;
}

async function pollJobUntilDone(token: string, jobId: string): Promise<{ status: string; errorMessage: string | null }> {
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    const res = await fetch(`${BASE}/jobs/${jobId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(res.ok, `Job poll failed: ${res.status}`).toBe(true);
    const job = await res.json() as { status: string; progress: number; errorMessage: string | null };
    console.log(`Job ${jobId}: status=${job.status} progress=${job.progress}`);
    if (job.status === 'COMPLETED' || job.status === 'FAILED') {
      return job;
    }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`Job ${jobId} did not complete within ${MAX_WAIT_MS}ms`);
}

describe('Full upload pipeline', () => {
  it('processes assembly.step to READY', async () => {
    const fileBuffer = fs.readFileSync(STEP_PATH);
    const sizeBytes = fileBuffer.byteLength;

    // 1. Auth
    const token = await login();

    // 2. Presign
    const { uploadUrl, s3Key, sceneId } = await presign(token, sizeBytes);
    console.log(`Scene: ${sceneId}, S3 key: ${s3Key}`);

    // 3. Upload to MinIO directly via S3 SDK (avoids presigned URL hostname issues)
    await uploadToMinIO(s3Key, fileBuffer);

    // 4. Confirm
    const jobId = await confirm(token, sceneId, s3Key);
    console.log(`Job: ${jobId}`);

    // 5. Poll
    const job = await pollJobUntilDone(token, jobId);
    expect(job.status, `Job failed: ${job.errorMessage}`).toBe('COMPLETED');

    // 6. Verify scene
    const sceneRes = await fetch(`${BASE}/scenes/${sceneId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(sceneRes.ok).toBe(true);
    const scene = await sceneRes.json() as { status: string; mergedGlbKey: string };
    expect(scene.status).toBe('READY');
    expect(scene.mergedGlbKey).toBeTruthy();
  });
});
