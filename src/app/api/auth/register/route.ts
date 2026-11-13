import { route, ok, parseBody, clientIp } from '@/server/http/route';
import { registerSchema } from '@/server/validations/auth';
import { authService } from '@/server/services/authService';

export const dynamic = 'force-dynamic';

/** POST /api/auth/register — public sign-up, always a CLIENT account. Sends the verification email. */
export const POST = route(async (request) => {
  const input = await parseBody(request, registerSchema);
  return ok(await authService.register(input, clientIp(request)), { status: 201 });
});
