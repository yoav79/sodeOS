import 'server-only';
import { S3Client } from '@aws-sdk/client-s3';

/**
 * Asserts that all required Cloudflare R2 environment variables are present.
 * Throws a descriptive error if any variable is missing, without exposing credentials.
 */
export function assertR2Configured(): void {
  const missing: string[] = [];

  if (!process.env.R2_ENDPOINT) missing.push('R2_ENDPOINT');
  if (!process.env.R2_BUCKET_NAME) missing.push('R2_BUCKET_NAME');
  if (!process.env.R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID');
  if (!process.env.R2_SECRET_ACCESS_KEY) missing.push('R2_SECRET_ACCESS_KEY');

  if (missing.length > 0) {
    throw new Error(
      `Falta la configuración de Cloudflare R2. Variables ausentes: ${missing.join(', ')}`
    );
  }
}

let clientInstance: S3Client | null = null;

/**
 * Retrieves the singleton instance of the S3Client configured for Cloudflare R2.
 */
export function getR2Client(): S3Client {
  assertR2Configured();

  if (!clientInstance) {
    clientInstance = new S3Client({
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
      region: process.env.R2_REGION || 'auto',
      forcePathStyle: true,
    });
  }

  return clientInstance;
}

/**
 * Helper to get the bucket name from environment variables.
 */
export function getR2BucketName(): string {
  assertR2Configured();
  return process.env.R2_BUCKET_NAME!;
}
