import { route, ok, parseBody } from '@/server/http/route';
import { cartReplaceSchema } from '@/server/validations/order';
import { requireClient } from '@/server/auth/session';
import { cartService } from '@/server/services/cartService';

export const dynamic = 'force-dynamic';

/** POST /api/cart/merge { items } — adds the guest cart to the account cart after login. */
export const POST = route(async (request) => {
  const user = await requireClient();
  const { items } = await parseBody(request, cartReplaceSchema);
  return ok(await cartService.merge(user, items));
});
