import { route, ok, parseBody } from '@/server/http/route';
import { settingsSchema } from '@/server/validations/marketing';
import { requireAdmin } from '@/server/auth/session';
import { settingsService } from '@/server/services/settingsService';

export const dynamic = 'force-dynamic';

/** GET /api/admin/settings */
export const GET = route(async () => {
  await requireAdmin();
  return ok(await settingsService.get());
});

/** PUT /api/admin/settings — partial update. */
export const PUT = route(async (request) => {
  const admin = await requireAdmin();
  return ok(await settingsService.update(await parseBody(request, settingsSchema), admin.id));
});
