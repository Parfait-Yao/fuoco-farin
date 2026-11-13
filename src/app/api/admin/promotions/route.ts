import { route, ok, parseBody } from '@/server/http/route';
import { promotionSchema } from '@/server/validations/marketing';
import { requireAdmin } from '@/server/auth/session';
import { promotionService } from '@/server/services/marketingService';

export const dynamic = 'force-dynamic';

/** GET /api/admin/promotions */
export const GET = route(async () => {
  await requireAdmin();
  return ok(await promotionService.list());
});

/** POST /api/admin/promotions — unique code, dates, percent or fixed amount, usage caps. */
export const POST = route(async (request) => {
  const admin = await requireAdmin();
  return ok(await promotionService.save(await parseBody(request, promotionSchema), admin.id), { status: 201 });
});
