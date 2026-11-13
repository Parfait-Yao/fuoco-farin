import { route, ok } from '@/server/http/route';
import { requireAdmin } from '@/server/auth/session';
import { catalogService } from '@/server/services/catalogService';
import { orderService } from '@/server/services/orderService';
import { userService } from '@/server/services/userService';
import { promotionService, reviewService } from '@/server/services/marketingService';
import { stockService } from '@/server/services/stockService';
import { activityService } from '@/server/services/notificationService';
import { settingsService } from '@/server/services/settingsService';

export const dynamic = 'force-dynamic';

/** GET /api/admin/bootstrap — everything the admin panel lists (latest 500 orders). */
export const GET = route(async () => {
  await requireAdmin();
  const [catalog, orders, customers, promotions, reviews, stockMovements, activity, settings] = await Promise.all([
    catalogService.adminCatalog(),
    orderService.adminList({ take: 500 }),
    userService.customers(),
    promotionService.list(),
    reviewService.listAll(),
    stockService.movements(),
    activityService.recent(),
    settingsService.get(),
  ]);
  return ok({ ...catalog, orders, customers, promotions, reviews, stockMovements, activity, settings });
});
