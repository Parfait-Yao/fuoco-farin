import { route, ok, parseBody, clientIp } from '@/server/http/route';
import { contactSchema } from '@/server/validations/marketing';
import { contactService } from '@/server/services/marketingService';
import { assertRateLimit } from '@/server/lib/rateLimit';

export const dynamic = 'force-dynamic';

/** POST /api/contact — stores the message and emails the restaurant. */
export const POST = route(async (request) => {
  assertRateLimit(`contact:${clientIp(request)}`, 5, 60 * 60_000);
  await contactService.message(await parseBody(request, contactSchema));
  return ok({ sent: true }, { status: 201 });
});
