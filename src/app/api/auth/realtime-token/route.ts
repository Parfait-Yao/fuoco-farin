import { route, ok } from '@/server/http/route';
import { requireUser } from '@/server/auth/session';
import { authService } from '@/server/services/authService';

export const dynamic = 'force-dynamic';

/** GET /api/auth/realtime-token — access token for Supabase Realtime (session cookies are HttpOnly). */
export const GET = route(async () => {
  await requireUser();
  return ok(await authService.realtimeToken(), { headers: { 'Cache-Control': 'no-store' } });
});
