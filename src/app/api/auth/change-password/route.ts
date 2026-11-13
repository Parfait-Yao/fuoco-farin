import { route, ok, parseBody, clientIp } from '@/server/http/route';
import { changePasswordSchema } from '@/server/validations/auth';
import { authService } from '@/server/services/authService';
import { requireUser } from '@/server/auth/session';

export const dynamic = 'force-dynamic';

/** POST /api/auth/change-password — checks the current password first. */
export const POST = route(async (request) => {
  const user = await requireUser();
  const { current, next } = await parseBody(request, changePasswordSchema);
  await authService.changePassword(user, current, next, clientIp(request));
  return ok({ updated: true });
});
