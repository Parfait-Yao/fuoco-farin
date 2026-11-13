import 'server-only';
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { IMAGE_BASE_URL, IMAGE_PROXY_PATH, isR2Configured, r2, R2_BUCKET, R2_PUBLIC_URL } from '@/lib/r2';
import { AppError, badRequest, notConfigured } from '../http/errors';
import { getMessages } from '@/i18n/server';

/** API messages in the request language. */
const msg = () => getMessages('api');

/* Image storage on Cloudflare R2 (S3 API). The browser sends the file to the
   API, which checks it and writes it to R2: no bucket CORS needed. The
   database stores the image URL and the object key so replaced images can be
   deleted. Without a public bucket URL, the app serves images itself through
   GET /api/images/<key>. */

export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const UPLOAD_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };
export type UploadFolder = 'products' | 'categories' | 'avatars';

const KEY_PATTERN = /^(products|categories|avatars\/[0-9a-f-]{36})\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/;
const CONTENT_TYPE_BY_EXT: Record<string, string> = Object.fromEntries(Object.entries(UPLOAD_TYPES).map(([type, ext]) => [ext, type]));

/** Detects the real image type from the first bytes; the browser-declared type is not trusted. */
function sniffImageType(bytes: Uint8Array): string | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (ascii(4, 8) === 'ftyp' && /^avi[fs]$/.test(ascii(8, 12))) return 'image/avif';
  return null;
}

/** R2 failures become a clear 503 instead of a generic 500. */
function storageError(error: unknown, action: string): never {
  if (error instanceof AppError) throw error;
  console.error(`[storage] ${action} failed`, (error as Error).name, (error as Error).message);
  throw new AppError('UNAVAILABLE', msg().storageDown);
}

export const storageService = {
  /** Checks the file and writes it to R2. Returns the URL to save on the record. */
  async upload(folder: UploadFolder, file: File, ownerId: string) {
    if (!isR2Configured) throw notConfigured(msg().storageNotConfigured);
    if (file.size <= 0 || file.size > UPLOAD_MAX_BYTES) throw badRequest(msg().imageTooLarge);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const contentType = sniffImageType(bytes);
    if (!contentType) throw badRequest(msg().imageFormats);

    // Random, non-guessable name: never reuse the client file name.
    const prefix = folder === 'avatars' ? `avatars/${ownerId}` : folder;
    const key = `${prefix}/${crypto.randomUUID()}.${UPLOAD_TYPES[contentType]}`;
    try {
      await r2.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: bytes, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' }));
    } catch (error) {
      storageError(error, 'upload');
    }
    return { url: `${IMAGE_BASE_URL}/${key}`, key };
  },

  /** Reads an image for GET /api/images/<key>. Returns null when the key is invalid or missing. */
  async read(key: string) {
    if (!isR2Configured || !KEY_PATTERN.test(key)) return null;
    try {
      const object = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
      if (!object.Body) return null;
      const ext = key.slice(key.lastIndexOf('.') + 1);
      return { body: object.Body.transformToWebStream(), contentType: CONTENT_TYPE_BY_EXT[ext] ?? 'application/octet-stream', size: object.ContentLength };
    } catch (error) {
      if ((error as { name?: string }).name === 'NoSuchKey') return null;
      storageError(error, 'read');
    }
  },

  /** Returns the object key when the URL points to our storage, else null (external URL). */
  keyFromUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    // Accept both bases so images keep working if the public URL is added later.
    const base = [R2_PUBLIC_URL, IMAGE_PROXY_PATH].find((b) => b && url.startsWith(`${b}/`));
    if (!base) return null;
    const key = url.slice(base.length + 1);
    return KEY_PATTERN.test(key) ? key : null;
  },

  /**
   * Validates an image URL before saving it on a record:
   * - our storage: the key must sit in the expected folder and the object must
   *   exist with an image content type and an allowed size;
   * - any other URL is accepted as an external image (checked by Zod).
   */
  async assertImage(url: string, folder: UploadFolder, ownerId?: string): Promise<string | null> {
    const ours = (R2_PUBLIC_URL && url.startsWith(`${R2_PUBLIC_URL}/`)) || url.startsWith(`${IMAGE_PROXY_PATH}/`);
    if (ours) {
      const key = this.keyFromUrl(url);
      const expected = folder === 'avatars' ? `avatars/${ownerId}/` : `${folder}/`;
      if (!key || !key.startsWith(expected)) throw badRequest(msg().imageNotAllowed);
      if (isR2Configured) {
        try {
          const head = await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
          if (!head.ContentType || !UPLOAD_TYPES[head.ContentType] || (head.ContentLength ?? 0) > UPLOAD_MAX_BYTES) throw badRequest(msg().imageInvalid);
        } catch (error) {
          if ((error as { name?: string }).name === 'NotFound') throw badRequest(msg().imageMissing);
          storageError(error, 'check');
        }
      }
      return key;
    }
    if (url.startsWith('data:')) throw badRequest(msg().imagePasted);
    return null;
  },

  /** Deletes an object we own. Never throws: a leftover file is not worth failing a save. */
  async remove(key: string | null | undefined) {
    if (!key || !isR2Configured) return;
    try {
      await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    } catch (error) {
      console.error('[storage] delete failed', key, (error as Error).message);
    }
  },
};
