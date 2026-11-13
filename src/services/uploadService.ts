import { ApiError } from '@/lib/api';
import { tr } from '@/i18n/client';

export type UploadFolder = 'products' | 'categories' | 'avatars';

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

/**
 * Sends an image to the API, which checks it and stores it on Cloudflare R2.
 * Returns the URL to save on the record.
 */
export async function uploadImage(file: File, folder: UploadFolder): Promise<string> {
  if (!TYPES.includes(file.type)) throw new ApiError(400, 'BAD_REQUEST', tr('api').imageFormats);
  if (file.size > MAX_BYTES) throw new ApiError(400, 'BAD_REQUEST', tr('api').imageTooLarge);

  const body = new FormData();
  body.append('folder', folder);
  body.append('file', file);

  let res: Response;
  try {
    res = await fetch('/api/uploads', { method: 'POST', body, credentials: 'same-origin', cache: 'no-store' });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', tr('common').networkError);
  }
  const json = (await res.json().catch(() => null)) as { ok: boolean; data?: { url: string }; error?: { code: string; message: string } } | null;
  if (!res.ok || !json?.ok || !json.data) {
    throw new ApiError(res.status, json?.error?.code ?? 'HTTP_ERROR', json?.error?.message ?? tr('account').uploadFailed);
  }
  return json.data.url;
}
