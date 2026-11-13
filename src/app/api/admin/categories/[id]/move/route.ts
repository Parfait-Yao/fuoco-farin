import { route, ok, parseBody } from '@/server/http/route';
import { categoryMoveSchema } from '@/server/validations/catalog';
import { idParams } from '@/server/validations/common';
import { requireAdmin } from '@/server/auth/session';
import { catalogService } from '@/server/services/catalogService';

export const dynamic = 'force-dynamic';

/** POST /api/admin/categories/:id/move { direction: -1 | 1 } — returns the reordered list. */
export const POST = route<{ id: string }>(async (request, { params }) => {
  await requireAdmin();
  const { id } = idParams.parse(params);
  const { direction } = await parseBody(request, categoryMoveSchema);
  return ok(await catalogService.moveCategory(id, direction));
});
