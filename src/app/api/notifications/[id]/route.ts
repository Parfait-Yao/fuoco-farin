import { route, ok, parseBody } from '@/server/http/route';
import { notificationPatchSchema } from '@/server/validations/marketing';
import { idParams } from '@/server/validations/common';
import { requireUser } from '@/server/auth/session';
import { notificationService } from '@/server/services/notificationService';

export const dynamic = 'force-dynamic';

/** PATCH /api/notifications/:id { read } */
export const PATCH = route<{ id: string }>(async (request, { params }) => {
  const user = await requireUser();
  const { id } = idParams.parse(params);
  const { read } = await parseBody(request, notificationPatchSchema);
  await notificationService.setRead(user, id, read);
  return ok({ id, read });
});

/** DELETE /api/notifications/:id */
export const DELETE = route<{ id: string }>(async (_request, { params }) => {
  const user = await requireUser();
  const { id } = idParams.parse(params);
  await notificationService.remove(user, id);
  return ok({ id });
});
