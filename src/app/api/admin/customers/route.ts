import { route, ok } from '@/server/http/route';
import { requireAdmin } from '@/server/auth/session';
import { userService } from '@/server/services/userService';

export const dynamic = 'force-dynamic';

/** GET /api/admin/customers */
export const GET = route(async () => {
  await requireAdmin();
  return ok(await userService.customers());
});
