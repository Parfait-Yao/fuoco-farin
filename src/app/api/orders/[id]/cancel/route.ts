import { route, ok, parseBody } from '@/server/http/route';
import { cancelOrderSchema } from '@/server/validations/order';
import { idParams } from '@/server/validations/common';
import { requireUser } from '@/server/auth/session';
import { orderService } from '@/server/services/orderService';

export const dynamic = 'force-dynamic';

/** POST /api/orders/:id/cancel { reason? } — client (while RECEIVED) or admin. Restores stock. */
export const POST = route<{ id: string }>(async (request, { params }) => {
  const user = await requireUser();
  const { id } = idParams.parse(params);
  const { reason } = await parseBody(request, cancelOrderSchema);
  return ok(await orderService.cancel(id, user, reason));
});
