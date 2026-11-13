import { route, ok } from '@/server/http/route';
import { requireClient } from '@/server/auth/session';
import { orderService } from '@/server/services/orderService';

export const dynamic = 'force-dynamic';

/** GET /api/account/orders — the client's orders, newest first. */
export const GET = route(async () => ok(await orderService.listMine(await requireClient())));
