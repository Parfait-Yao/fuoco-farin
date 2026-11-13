import { route, ok, parseBody, clientIp } from '@/server/http/route';
import { createOrderSchema } from '@/server/validations/order';
import { getSessionUser } from '@/server/auth/session';
import { guestTokenFor, orderService } from '@/server/services/orderService';
import { assertRateLimit } from '@/server/lib/rateLimit';
import { forbidden } from '@/server/http/errors';
import { getMessages } from '@/i18n/server';

/** API messages in the request language. */
const msg = () => getMessages('api');

export const dynamic = 'force-dynamic';

/**
 * POST /api/orders — creates an order from cart lines. Prices, discount, delivery fee and stock are
 * computed and reserved on the server in one transaction. Guests receive a `guestToken` to follow it.
 */
export const POST = route(async (request) => {
  assertRateLimit(`order:${clientIp(request)}`, 10, 10 * 60_000);
  const input = await parseBody(request, createOrderSchema);
  const user = await getSessionUser();
  if (user?.status === 'BLOCKED') throw forbidden(msg().accountSuspended);
  const order = await orderService.create(input, user);
  return ok({ order, guestToken: user ? null : guestTokenFor(order.id, new Date(order.createdAt)) }, { status: 201 });
});
