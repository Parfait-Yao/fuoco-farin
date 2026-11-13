import { route, ok, parseBody } from '@/server/http/route';
import { z } from 'zod';
import { getSessionUser } from '@/server/auth/session';
import { paymentService } from '@/server/services/paymentService';

export const dynamic = 'force-dynamic';

const schema = z.object({ orderId: z.string().uuid(), guestToken: z.string().max(64).nullish() });

/** POST /api/payments/stripe/cancel — customer left the Stripe page: cancels the unpaid order and releases stock. */
export const POST = route(async (request) => {
  const { orderId, guestToken } = await parseBody(request, schema);
  await paymentService.cancelCheckout(orderId, await getSessionUser(), guestToken);
  return ok({ cancelled: true });
});
