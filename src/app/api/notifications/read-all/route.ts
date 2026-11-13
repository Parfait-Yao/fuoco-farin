import { route, ok } from '@/server/http/route';
import { requireUser } from '@/server/auth/session';
import { notificationService } from '@/server/services/notificationService';

export const dynamic = 'force-dynamic';

/** POST /api/notifications/read-all */
export const POST = route(async () => {
  const user = await requireUser();
  await notificationService.markAll(user);
  return ok(await notificationService.list(user));
});
