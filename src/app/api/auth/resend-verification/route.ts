import { route, ok, parseBody, clientIp } from '@/server/http/route';
import { emailOnlySchema } from '@/server/validations/auth';
import { authService } from '@/server/services/authService';

export const dynamic = 'force-dynamic';

/** POST /api/auth/resend-verification */
export const POST = route(async (request) => {
  const { email } = await parseBody(request, emailOnlySchema);
  await authService.resendVerification(email, clientIp(request));
  return ok({ sent: true });
});
