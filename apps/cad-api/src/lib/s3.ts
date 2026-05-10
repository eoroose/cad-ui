import { S3Client } from '@aws-sdk/client-s3';

const isMinIO = !!process.env.S3_ENDPOINT;

export const s3 = new S3Client({
  region: process.env.AWS_REGION ?? 'us-east-1',
  ...(isMinIO && {
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
  }),
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * Rewrite presigned URL hostname from container-internal (minio:9000)
 * to browser-accessible (localhost:9000) before returning to client.
 */
export function rewritePresignedUrl(url: string): string {
  const publicBase = process.env.PUBLIC_MINIO_URL;
  const internalBase = process.env.S3_ENDPOINT;
  if (!publicBase || !internalBase || !isMinIO) return url;
  return url.replace(internalBase, publicBase);
}
