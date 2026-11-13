import { route, ok, parseBody, clientIp } from '@/server/http/route';
import { quoteSchema } from '@/server/validations/order';
import { getSessionUser } from '@/server/auth/session';
import { publicQuote, quoteCart } from '@/server/services/quoteService';
import { assertRateLimit } from '@/server/lib/rateLimit';

export const dynamic = 'force-dynamic';

/** POST /api/cart/quote { items, deliveryMode, promoCode? } — server prices, delivery fee, discount, availability. */
export const POST = route(async (request) => {
  assertRateLimit(`quote:${clientIp(request)}`, 120, 60_000);
  const input = await parseBody(request, quoteSchema);
  const user = await getSessionUser();
  return ok(publicQuote(await quoteCart(input, { userId: user?.id, email: user?.email })));
});
