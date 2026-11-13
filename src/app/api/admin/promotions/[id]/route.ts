import { route, ok, parseBody } from '@/server/http/route';
import { promotionSchema } from '@/server/validations/marketing';
import { idParams } from '@/server/validations/common';
import { requireAdmin } from '@/server/auth/session';
import { promotionService } from '@/server/services/marketingService';

export const dynamic = 'force-dynamic';

/** PUT /api/admin/promotions/:id */
export const PUT = route<{ id: string }>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = idParams.parse(params);
  return ok(await promotionService.save(await parseBody(request, promotionSchema), admin.id, id));
});

/** DELETE /api/admin/promotions/:id — soft delete. */
export const DELETE = route<{ id: string }>(async (_request, { params }) => {
  const admin = await requireAdmin();
  const { id } = idParams.parse(params);
  await promotionService.remove(id, admin.id);
  return ok({ id });
});
