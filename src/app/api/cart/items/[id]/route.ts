import { route, ok, parseBody } from '@/server/http/route';
import { cartItemPatchSchema } from '@/server/validations/order';
import { idParams } from '@/server/validations/common';
import { requireClient } from '@/server/auth/session';
import { cartService } from '@/server/services/cartService';

export const dynamic = 'force-dynamic';

/** PATCH /api/cart/items/:id { quantity?, size?, note?, removedIngredients? } */
export const PATCH = route<{ id: string }>(async (request, { params }) => {
  const user = await requireClient();
  const { id } = idParams.parse(params);
  return ok(await cartService.updateItem(user, id, await parseBody(request, cartItemPatchSchema)));
});

/** DELETE /api/cart/items/:id */
export const DELETE = route<{ id: string }>(async (_request, { params }) => {
  const user = await requireClient();
  const { id } = idParams.parse(params);
  return ok(await cartService.removeItem(user, id));
});
