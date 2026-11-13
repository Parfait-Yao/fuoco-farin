import { route, ok } from '@/server/http/route';
import { requireAdmin } from '@/server/auth/session';
import { reviewService } from '@/server/services/marketingService';

export const dynamic = 'force-dynamic';

/** GET /api/admin/reviews */
export const GET = route(async () => {
  await requireAdmin();
  return ok(await reviewService.listAll());
});
