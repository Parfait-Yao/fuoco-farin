import { S3Client } from '@aws-sdk/client-s3';

/** Server-only Cloudflare R2 client (S3-compatible API). Never import from client code. */
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? '';

/** Public bucket URL (r2.dev or custom domain). Ignored while it is the .env.example placeholder. */
const publicUrl = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/$/, '');
export const R2_PUBLIC_URL = /^https:\/\//.test(publicUrl) && !publicUrl.includes('pub-xxxx') ? publicUrl : '';

/** Images served by the app itself (GET /api/images/<key>) when the bucket has no public URL. */
export const IMAGE_PROXY_PATH = '/api/images';

/** Base of the URLs stored for uploaded images. */
export const IMAGE_BASE_URL = R2_PUBLIC_URL || IMAGE_PROXY_PATH;

export const isR2Configured = Boolean(accountId && accessKeyId && secretAccessKey && R2_BUCKET);

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: accessKeyId ?? '', secretAccessKey: secretAccessKey ?? '' },
  // R2 expects path-style URLs (https://<account>.r2.cloudflarestorage.com/<bucket>/<key>).
  forcePathStyle: true,
  // Recent SDK versions add CRC32 checksums that R2 does not always accept. Only add them when required.
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});
