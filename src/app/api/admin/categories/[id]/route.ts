import { route, ok, parseBody } from '@/server/http/route';
import { categorySchema } from '@/server/validations/catalog';
import { idParams } from '@/server/validations/common';
import { requireAdmin } from '@/server/auth/session';
import { catalogService } from '@/server/services/catalogService';

export const dynamic = 'force-dynamic';

/** PUT /api/admin/categories/:id */
export const PUT = route<{ id: string }>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = idParams.parse(params);
  return ok(await catalogService.saveCategory(await parseBody(request, categorySchema), admin.id, id));
});

/** DELETE /api/admin/categories/:id — refused while pizzas still use it. */
export const DELETE = route<{ id: string }>(async (_request, { params }) => {
  const admin = await requireAdmin();
  const { id } = idParams.parse(params);
  await catalogService.deleteCategory(id, admin.id);
  return ok({ id });
});
