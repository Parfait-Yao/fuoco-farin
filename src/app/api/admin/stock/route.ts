import { route, ok } from '@/server/http/route';
import { requireAdmin } from '@/server/auth/session';
import { stockService } from '@/server/services/stockService';

export const dynamic = 'force-dynamic';

/** GET /api/admin/stock — low-stock ingredients and the latest movements. */
export const GET = route(async () => {
  await requireAdmin();
  const [lowStock, movements] = await Promise.all([stockService.lowStock(), stockService.movements()]);
  return ok({ lowStock, movements });
});
