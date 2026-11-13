import { route, ok, parseBody } from '@/server/http/route';
import { ingredientSchema } from '@/server/validations/catalog';
import { idParams } from '@/server/validations/common';
import { requireAdmin } from '@/server/auth/session';
import { catalogService } from '@/server/services/catalogService';

export const dynamic = 'force-dynamic';

/** PUT /api/admin/ingredients/:id — stock is not changed here (use /stock). */
export const PUT = route<{ id: string }>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = idParams.parse(params);
  return ok(await catalogService.saveIngredient(await parseBody(request, ingredientSchema), admin.id, id));
});

/** DELETE /api/admin/ingredients/:id — soft delete. */
export const DELETE = route<{ id: string }>(async (_request, { params }) => {
  const admin = await requireAdmin();
  const { id } = idParams.parse(params);
  await catalogService.deleteIngredient(id, admin.id);
  return ok({ id });
});
