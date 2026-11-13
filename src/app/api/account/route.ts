import { z } from 'zod';
import { route, ok, parseBody, clientIp } from '@/server/http/route';
import { requireClient } from '@/server/auth/session';
import { authService } from '@/server/services/authService';

export const dynamic = 'force-dynamic';

/** DELETE /api/account { password } — deletes the client account (profile anonymized, orders kept). */
export const DELETE = route(async (request) => {
  const user = await requireClient();
  const { password } = await parseBody(request, z.object({ password: z.string().min(1).max(72) }));
  await authService.deleteAccount(user, password, clientIp(request));
  return ok({ deleted: true });
});
