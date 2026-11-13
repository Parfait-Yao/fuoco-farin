import { route, ok, parseQuery } from '@/server/http/route';
import { adminOrdersQuery } from '@/server/validations/order';
import { requireAdmin } from '@/server/auth/session';
import { orderService } from '@/server/services/orderService';

export const dynamic = 'force-dynamic';

/** GET /api/admin/orders?status=&q=&from=&to=&take= */
export const GET = route(async (request) => {
  await requireAdmin();
  return ok(await orderService.adminList(parseQuery(request, adminOrdersQuery)));
});
