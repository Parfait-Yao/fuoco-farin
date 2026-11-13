import { route, ok, parseBody } from '@/server/http/route';
import { addressSchema } from '@/server/validations/user';
import { idParams } from '@/server/validations/common';
import { requireClient } from '@/server/auth/session';
import { userService } from '@/server/services/userService';

export const dynamic = 'force-dynamic';

/** PUT /api/account/addresses/:id */
export const PUT = route<{ id: string }>(async (request, { params }) => {
  const user = await requireClient();
  const { id } = idParams.parse(params);
  return ok(await userService.saveAddress(user, await parseBody(request, addressSchema), id));
});

/** DELETE /api/account/addresses/:id */
export const DELETE = route<{ id: string }>(async (_request, { params }) => {
  const user = await requireClient();
  const { id } = idParams.parse(params);
  return ok(await userService.deleteAddress(user, id));
});
