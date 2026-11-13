import { route, ok, parseBody, clientIp } from '@/server/http/route';
import { newsletterSchema } from '@/server/validations/marketing';
import { contactService } from '@/server/services/marketingService';
import { assertRateLimit } from '@/server/lib/rateLimit';

export const dynamic = 'force-dynamic';

/** POST /api/newsletter { email } */
export const POST = route(async (request) => {
  assertRateLimit(`newsletter:${clientIp(request)}`, 5, 60 * 60_000);
  const { email } = await parseBody(request, newsletterSchema);
  await contactService.subscribe(email);
  return ok({ subscribed: true }, { status: 201 });
});
