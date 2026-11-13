import { route, ok } from '@/server/http/route';
import { requireUser } from '@/server/auth/session';
import { authService } from '@/server/services/authService';

export const dynamic = 'force-dynamic';

/** POST /api/auth/logout-others — signs out every other device of the account. */
export const POST = route(async () => {
  await requireUser();
  await authService.logoutOthers();
  return ok({ done: true });
});
