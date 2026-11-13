import { route, ok } from '@/server/http/route';
import { requireAdmin } from '@/server/auth/session';
import { activityService } from '@/server/services/notificationService';

export const dynamic = 'force-dynamic';

/** GET /api/admin/activity */
export const GET = route(async () => {
  await requireAdmin();
  return ok(await activityService.recent(100));
});
