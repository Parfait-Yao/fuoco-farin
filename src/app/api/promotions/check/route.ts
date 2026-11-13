import { route, ok, parseBody, clientIp } from '@/server/http/route';
import { promoCheckSchema } from '@/server/validations/marketing';
import { getSessionUser } from '@/server/auth/session';
import { promotionService } from '@/server/services/marketingService';
import { assertRateLimit } from '@/server/lib/rateLimit';
import { getMessages } from '@/i18n/server';

/** API messages in the request language. */
const msg = () => getMessages('api');

export const dynamic = 'force-dynamic';

/** POST /api/promotions/check { code, subtotal } — validates a promo code (brute force limited). */
export const POST = route(async (request) => {
  assertRateLimit(`promo:${clientIp(request)}`, 20, 10 * 60_000, msg().tooManyPromoAttempts);
  const { code, subtotal } = await parseBody(request, promoCheckSchema);
  return ok(await promotionService.check(code, subtotal, await getSessionUser()));
});
