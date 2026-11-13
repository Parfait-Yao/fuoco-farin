import { route, ok, parseBody, parseQuery } from '@/server/http/route';
import { z } from 'zod';
import { cartReplaceSchema } from '@/server/validations/order';
import { requireClient } from '@/server/auth/session';
import { cartService } from '@/server/services/cartService';

export const dynamic = 'force-dynamic';

/** GET /api/cart?deliveryMode= — server cart with server prices. */
export const GET = route(async (request) => {
  const user = await requireClient();
  const { deliveryMode } = parseQuery(request, z.object({ deliveryMode: z.enum(['standard', 'express', 'pickup']).default('standard') }));
  return ok(await cartService.get(user, deliveryMode));
});

/** PUT /api/cart { items, promoCode } — replaces the cart. */
export const PUT = route(async (request) => {
  const user = await requireClient();
  const { items, promoCode } = await parseBody(request, cartReplaceSchema);
  return ok(await cartService.replace(user, items, promoCode));
});

/** DELETE /api/cart — empties the cart. */
export const DELETE = route(async () => ok(await cartService.clear(await requireClient())));
