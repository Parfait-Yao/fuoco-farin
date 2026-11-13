import { route, ok, parseBody } from '@/server/http/route';
import { ingredientSchema } from '@/server/validations/catalog';
import { requireAdmin } from '@/server/auth/session';
import { catalogService } from '@/server/services/catalogService';

export const dynamic = 'force-dynamic';

/** POST /api/admin/ingredients — builder ingredient (base, sauce, cheese, vegetable) with initial stock. */
export const POST = route(async (request) => {
  const admin = await requireAdmin();
  return ok(await catalogService.saveIngredient(await parseBody(request, ingredientSchema), admin.id), { status: 201 });
});
