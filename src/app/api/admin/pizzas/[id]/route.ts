import { route, ok, parseBody } from '@/server/http/route';
import { pizzaPatchSchema, pizzaSchema } from '@/server/validations/catalog';
import { idParams } from '@/server/validations/common';
import { requireAdmin } from '@/server/auth/session';
import { catalogService } from '@/server/services/catalogService';

export const dynamic = 'force-dynamic';

/** PUT /api/admin/pizzas/:id — full update (price, image, ingredients…). */
export const PUT = route<{ id: string }>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = idParams.parse(params);
  return ok(await catalogService.savePizza(await parseBody(request, pizzaSchema), admin.id, id));
});

/** PATCH /api/admin/pizzas/:id { active } — enable or disable. */
export const PATCH = route<{ id: string }>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = idParams.parse(params);
  const { active } = await parseBody(request, pizzaPatchSchema);
  return ok(await catalogService.setPizzaActive(id, active, admin.id));
});

/** DELETE /api/admin/pizzas/:id — soft delete. */
export const DELETE = route<{ id: string }>(async (_request, { params }) => {
  const admin = await requireAdmin();
  const { id } = idParams.parse(params);
  await catalogService.deletePizza(id, admin.id);
  return ok({ id });
});
