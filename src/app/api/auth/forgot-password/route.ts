import { route, ok, parseBody, clientIp } from '@/server/http/route';
import { emailOnlySchema } from '@/server/validations/auth';
import { authService } from '@/server/services/authService';

export const dynamic = 'force-dynamic';

/** POST /api/auth/forgot-password — sends a reset link. Same answer whether the email exists or not. */
export const POST = route(async (request) => {
  const { email } = await parseBody(request, emailOnlySchema);
  await authService.requestPasswordReset(email, clientIp(request));
  return ok({ sent: true });
});
