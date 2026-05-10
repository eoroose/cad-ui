import { S3Client } from '@aws-sdk/client-s3';

const isMinIO = !!process.env.S3_ENDPOINT;

// Internal client: used for server-side operations (HeadObject, GetObject, etc.)
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

// Public client: used for presigning URLs that the browser will use directly.
// Must use the public-facing endpoint so the SigV4 Host header matches what the browser hits.
export const s3Public = new S3Client({
  region: process.env.AWS_REGION ?? 'us-east-1',
  endpoint: process.env.PUBLIC_MINIO_URL ?? process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
