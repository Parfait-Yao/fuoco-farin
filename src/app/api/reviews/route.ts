import { route, ok, parseBody } from '@/server/http/route';
import { reviewSchema } from '@/server/validations/marketing';
import { requireClient } from '@/server/auth/session';
import { reviewService } from '@/server/services/marketingService';

export const dynamic = 'force-dynamic';

/** POST /api/reviews — review a pizza from a delivered order. Published after moderation. */
export const POST = route(async (request) => {
  const user = await requireClient();
  return ok(await reviewService.create(user, await parseBody(request, reviewSchema)), { status: 201 });
});
