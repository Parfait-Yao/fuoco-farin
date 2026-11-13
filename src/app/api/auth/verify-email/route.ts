import { route, ok, parseBody, clientIp } from '@/server/http/route';
import { verifyEmailSchema } from '@/server/validations/auth';
import { authService } from '@/server/services/authService';

export const dynamic = 'force-dynamic';

/** POST /api/auth/verify-email — checks the code from the confirmation email and opens the session. */
export const POST = route(async (request) => {
  const { email, code } = await parseBody(request, verifyEmailSchema);
  return ok(await authService.verifyEmail(email, code, clientIp(request)));
});
