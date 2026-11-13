import { route, ok, parseBody } from '@/server/http/route';
import { favoriteSchema } from '@/server/validations/marketing';
import { requireClient } from '@/server/auth/session';
import { favoriteService } from '@/server/services/marketingService';

export const dynamic = 'force-dynamic';

/** GET /api/account/favorites — pizza ids. */
export const GET = route(async () => ok(await favoriteService.list(await requireClient())));

/** POST /api/account/favorites { pizzaId } */
export const POST = route(async (request) => {
  const user = await requireClient();
  const { pizzaId } = await parseBody(request, favoriteSchema);
  return ok(await favoriteService.add(user, pizzaId));
});
