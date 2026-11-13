import { route, ok } from '@/server/http/route';
import { z } from 'zod';
import { requireAdmin, requireUser } from '@/server/auth/session';
import { storageService } from '@/server/services/storageService';
import { badRequest } from '@/server/http/errors';
import { assertRateLimit } from '@/server/lib/rateLimit';

export const dynamic = 'force-dynamic';

const folderSchema = z.enum(['products', 'categories', 'avatars']);

/**
 * POST /api/uploads (multipart: file, folder) — stores an image on R2 and returns its URL.
 * products/categories: admin only. avatars: any signed-in user, in their own folder.
 */
export const POST = route(async (request) => {
  const form = await request.formData().catch(() => null);
  const folder = folderSchema.safeParse(form?.get('folder'));
  const file = form?.get('file');
  if (!folder.success || !(file instanceof File)) throw badRequest('Fichier image manquant.');

  const user = folder.data === 'avatars' ? await requireUser() : await requireAdmin();
  assertRateLimit(`upload:${user.id}`, 30, 10 * 60_000);
  return ok(await storageService.upload(folder.data, file, user.id), { status: 201 });
});
