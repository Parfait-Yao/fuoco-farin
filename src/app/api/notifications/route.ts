import { route, ok } from '@/server/http/route';
import { requireUser } from '@/server/auth/session';
import { notificationService } from '@/server/services/notificationService';

export const dynamic = 'force-dynamic';

/** GET /api/notifications — notifications of the signed-in user (client or admin). */
export const GET = route(async () => ok(await notificationService.list(await requireUser())));
