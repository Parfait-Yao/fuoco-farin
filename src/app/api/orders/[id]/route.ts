import { route, ok } from '@/server/http/route';
import { idParams } from '@/server/validations/common';
import { getSessionUser } from '@/server/auth/session';
import { orderService } from '@/server/services/orderService';

export const dynamic = 'force-dynamic';

/** GET /api/orders/:id?token= — owner, admin, or guest with the token returned at checkout. */
export const GET = route<{ id: string }>(async (request, { params }) => {
  const { id } = idParams.parse(params);
  return ok(await orderService.get(id, await getSessionUser(), request.nextUrl.searchParams.get('token')));
});
