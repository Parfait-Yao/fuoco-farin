import { route, ok, parseBody } from '@/server/http/route';
import { resetPasswordSchema } from '@/server/validations/auth';
import { authService } from '@/server/services/authService';

export const dynamic = 'force-dynamic';

/** POST /api/auth/reset-password — needs the recovery session created by /auth/callback. */
export const POST = route(async (request) => {
  const { password } = await parseBody(request, resetPasswordSchema);
  await authService.resetPassword(password);
  return ok({ updated: true });
});
