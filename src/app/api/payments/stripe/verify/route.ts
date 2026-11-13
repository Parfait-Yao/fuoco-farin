import { route, ok, parseBody } from '@/server/http/route';
import { z } from 'zod';
import { getSessionUser } from '@/server/auth/session';
import { paymentService } from '@/server/services/paymentService';

export const dynamic = 'force-dynamic';

const schema = z.object({
  orderId: z.string().uuid(),
  guestToken: z.string().max(64).nullish(),
  sessionId: z.string().regex(/^cs_(test|live)_[A-Za-z0-9]+$/).max(200),
});

/** POST /api/payments/stripe/verify — return from Stripe: reads the Checkout Session at Stripe. */
export const POST = route(async (request) => {
  const { guestToken, ...input } = await parseBody(request, schema);
  return ok(await paymentService.verifyCheckout(input, await getSessionUser(), guestToken));
});
