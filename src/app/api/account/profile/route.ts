import { route, ok, parseBody } from '@/server/http/route';
import { profileSchema } from '@/server/validations/user';
import { requireUser } from '@/server/auth/session';
import { userService } from '@/server/services/userService';
import { authService } from '@/server/services/authService';

export const dynamic = 'force-dynamic';

/** PATCH /api/account/profile — name, phone, avatar, email (email change needs confirmation). */
export const PATCH = route(async (request) => {
  const user = await requireUser();
  const input = await parseBody(request, profileSchema);
  return ok(await userService.updateProfile(user, input, (email) => authService.changeEmail(email)));
});
