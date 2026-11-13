import { route, ok, parseBody } from '@/server/http/route';
import { stockMoveSchema } from '@/server/validations/catalog';
import { idParams } from '@/server/validations/common';
import { requireAdmin } from '@/server/auth/session';
import { stockService } from '@/server/services/stockService';

export const dynamic = 'force-dynamic';

/** POST /api/admin/ingredients/:id/stock { kind: in|out, quantity, note } — never below zero. */
export const POST = route<{ id: string }>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = idParams.parse(params);
  const { kind, quantity, note } = await parseBody(request, stockMoveSchema);
  return ok(await stockService.move(id, kind, quantity, note, admin.id));
});
