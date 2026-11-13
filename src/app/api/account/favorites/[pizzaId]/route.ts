import { route, ok } from '@/server/http/route';
import { z } from 'zod';
import { requireClient } from '@/server/auth/session';
import { favoriteService } from '@/server/services/marketingService';

export const dynamic = 'force-dynamic';

/** DELETE /api/account/favorites/:pizzaId */
export const DELETE = route<{ pizzaId: string }>(async (_request, { params }) => {
  const user = await requireClient();
  const pizzaId = z.string().uuid().parse(params.pizzaId);
  return ok(await favoriteService.remove(user, pizzaId));
});
