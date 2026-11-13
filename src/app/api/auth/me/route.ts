import { route, ok } from '@/server/http/route';
import { getSessionUser } from '@/server/auth/session';
import { userService } from '@/server/services/userService';

export const dynamic = 'force-dynamic';

/** GET /api/auth/me — current profile, addresses and preferences, or null when signed out. */
export const GET = route(async () => {
  const user = await getSessionUser();
  if (!user || user.status === 'BLOCKED') return ok(null);
  return ok(await userService.me(user));
});
