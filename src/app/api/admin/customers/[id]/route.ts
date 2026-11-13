import { route, ok, parseBody } from '@/server/http/route';
import { customerStatusSchema } from '@/server/validations/user';
import { idParams } from '@/server/validations/common';
import { requireAdmin } from '@/server/auth/session';
import { userService } from '@/server/services/userService';

export const dynamic = 'force-dynamic';

/** GET /api/admin/customers/:id — profile, addresses and orders. */
export const GET = route<{ id: string }>(async (_request, { params }) => {
  await requireAdmin();
  return ok(await userService.customer(idParams.parse(params).id));
});

/** PATCH /api/admin/customers/:id { status: active|blocked } */
export const PATCH = route<{ id: string }>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { id } = idParams.parse(params);
  const { status } = await parseBody(request, customerStatusSchema);
  return ok(await userService.setCustomerStatus(id, status, admin.id));
});
