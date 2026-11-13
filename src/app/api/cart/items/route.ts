import { route, ok, parseBody } from '@/server/http/route';
import { cartLineSchema } from '@/server/validations/order';
import { requireClient } from '@/server/auth/session';
import { cartService } from '@/server/services/cartService';

export const dynamic = 'force-dynamic';

/** POST /api/cart/items — adds one line (catalog pizza or builder composition). */
export const POST = route(async (request) => {
  const user = await requireClient();
  return ok(await cartService.addItem(user, await parseBody(request, cartLineSchema)), { status: 201 });
});
