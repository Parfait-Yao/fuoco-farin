import { route, ok, parseBody } from '@/server/http/route';
import { orderStatusSchema } from '@/server/validations/order';
import { idParams } from '@/server/validations/common';
import { requireAdmin } from '@/server/auth/session';
import { orderService } from '@/server/services/orderService';

export const dynamic = 'force-dynamic';

/** PATCH /api/admin/orders/:id/status { status, note? } — forward-only, history kept, client notified. */
export const PATCH = route<{ id: string }>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = idParams.parse(params);
  const { status, note } = await parseBody(request, orderStatusSchema);
  return ok(await orderService.updateStatus(id, status, admin, note));
});
