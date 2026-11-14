import { route, ok } from '@/server/http/route';
import { idParams } from '@/server/validations/common';
import { requireUser } from '@/server/auth/session';
import { orderService } from '@/server/services/orderService';

export const dynamic = 'force-dynamic';

/** POST /api/orders/:id/received — the customer confirms receipt; the order becomes DELIVERED (admin sees it live). */
export const POST = route<{ id: string }>(async (_request, { params }) => {
  const user = await requireUser();
  const { id } = idParams.parse(params);
  return ok(await orderService.confirmReceipt(id, user));
});
