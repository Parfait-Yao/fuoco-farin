import { route, ok } from '@/server/http/route';
import { authService } from '@/server/services/authService';

export const dynamic = 'force-dynamic';

/** POST /api/auth/logout — ends the session and clears cookies. */
export const POST = route(async () => {
  await authService.logout();
  return ok({ loggedOut: true });
});
