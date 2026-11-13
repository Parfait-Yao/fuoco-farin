import { route, ok, parseBody } from '@/server/http/route';
import { thresholdSchema } from '@/server/validations/catalog';
import { idParams } from '@/server/validations/common';
import { requireAdmin } from '@/server/auth/session';
import { stockService } from '@/server/services/stockService';

export const dynamic = 'force-dynamic';

/** PUT /api/admin/ingredients/:id/threshold { threshold } */
export const PUT = route<{ id: string }>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = idParams.parse(params);
  const { threshold } = await parseBody(request, thresholdSchema);
  return ok(await stockService.setThreshold(id, threshold, admin.id));
});
