import { route, ok, parseBody } from '@/server/http/route';
import { pizzaSchema } from '@/server/validations/catalog';
import { requireAdmin } from '@/server/auth/session';
import { catalogService } from '@/server/services/catalogService';

export const dynamic = 'force-dynamic';

/** POST /api/admin/pizzas */
export const POST = route(async (request) => {
  const admin = await requireAdmin();
  return ok(await catalogService.savePizza(await parseBody(request, pizzaSchema), admin.id), { status: 201 });
});
