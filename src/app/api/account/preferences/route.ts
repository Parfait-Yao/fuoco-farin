import { route, ok, parseBody } from '@/server/http/route';
import { preferencesSchema } from '@/server/validations/user';
import { requireClient } from '@/server/auth/session';
import { userService } from '@/server/services/userService';

export const dynamic = 'force-dynamic';

/** PUT /api/account/preferences */
export const PUT = route(async (request) => {
  const user = await requireClient();
  return ok(await userService.updatePreferences(user, await parseBody(request, preferencesSchema)));
});
