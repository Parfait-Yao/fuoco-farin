import { route, ok, parseBody, clientIp } from '@/server/http/route';
import { loginSchema } from '@/server/validations/auth';
import { authService } from '@/server/services/authService';

export const dynamic = 'force-dynamic';

/** POST /api/auth/login — password login for the client or admin space. Sets HttpOnly session cookies. */
export const POST = route(async (request) => {
  const input = await parseBody(request, loginSchema);
  return ok(await authService.login(input, clientIp(request)));
});
