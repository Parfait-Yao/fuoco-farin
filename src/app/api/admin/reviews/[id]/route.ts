import { route, ok, parseBody } from '@/server/http/route';
import { reviewModerationSchema } from '@/server/validations/marketing';
import { idParams } from '@/server/validations/common';
import { requireAdmin } from '@/server/auth/session';
import { reviewService } from '@/server/services/marketingService';

export const dynamic = 'force-dynamic';

/** PATCH /api/admin/reviews/:id { published } — publish or hide; refreshes the pizza rating. */
export const PATCH = route<{ id: string }>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = idParams.parse(params);
  const { published } = await parseBody(request, reviewModerationSchema);
  return ok(await reviewService.setPublished(id, published, admin.id));
});

/** DELETE /api/admin/reviews/:id */
export const DELETE = route<{ id: string }>(async (_request, { params }) => {
  const admin = await requireAdmin();
  const { id } = idParams.parse(params);
  await reviewService.remove(id, admin.id);
  return ok({ id });
});
