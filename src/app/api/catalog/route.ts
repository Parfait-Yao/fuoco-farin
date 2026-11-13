import { route, ok } from '@/server/http/route';
import { catalogService } from '@/server/services/catalogService';

export const dynamic = 'force-dynamic';

/** GET /api/catalog — public bootstrap: pizzas, categories, builder ingredients, settings, reviews, promotions. */
export const GET = route(async () => ok(await catalogService.publicCatalog()));
