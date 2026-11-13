import { route, ok, parseBody } from '@/server/http/route';
import { categorySchema } from '@/server/validations/catalog';
import { requireAdmin } from '@/server/auth/session';
import { catalogService } from '@/server/services/catalogService';

export const dynamic = 'force-dynamic';

/** POST /api/admin/categories */
export const POST = route(async (request) => {
  const admin = await requireAdmin();
  return ok(await catalogService.saveCategory(await parseBody(request, categorySchema), admin.id), { status: 201 });
});
