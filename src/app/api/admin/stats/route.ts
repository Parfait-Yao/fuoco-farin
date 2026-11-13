import { route, ok, parseQuery } from '@/server/http/route';
import { requireAdmin } from '@/server/auth/session';
import { dateRange } from '@/server/validations/common';
import { statsService } from '@/server/services/statsService';

export const dynamic = 'force-dynamic';

/** GET /api/admin/stats?days=30 or ?from=&to= — dashboard and report figures computed in SQL. */
export const GET = route(async (request) => {
  await requireAdmin();
  const params = request.nextUrl.searchParams;
  const days = Math.min(366, Math.max(1, Number(params.get('days') ?? 30) || 30));
  const range = params.get('from') ? parseQuery(request, dateRange) : statsService.periodRange(days);
  return ok(await statsService.overview(range));
});
