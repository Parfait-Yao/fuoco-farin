import { route, ok, parseQuery } from '@/server/http/route';
import { pizzaListQuery } from '@/server/validations/catalog';
import { catalogService } from '@/server/services/catalogService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pizzas?q=&category=&vegetarian=&spicy=&minPrice=&maxPrice=&sort=&page=&pageSize=
 * sort: popular | price-asc | price-desc | rating | newest | name
 */
export const GET = route(async (request) => ok(await catalogService.listPizzas(parseQuery(request, pizzaListQuery))));
