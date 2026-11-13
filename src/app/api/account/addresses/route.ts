import { route, ok, parseBody } from '@/server/http/route';
import { addressSchema } from '@/server/validations/user';
import { requireClient } from '@/server/auth/session';
import { userService } from '@/server/services/userService';

export const dynamic = 'force-dynamic';

/** GET /api/account/addresses */
export const GET = route(async () => ok(await userService.listAddresses(await requireClient())));

/** POST /api/account/addresses — returns the full list. */
export const POST = route(async (request) => {
  const user = await requireClient();
  return ok(await userService.saveAddress(user, await parseBody(request, addressSchema)), { status: 201 });
});
