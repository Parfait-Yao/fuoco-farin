import { route, ok } from '@/server/http/route';
import { requireClient } from '@/server/auth/session';
import { reviewService } from '@/server/services/marketingService';

export const dynamic = 'force-dynamic';

/** GET /api/account/reviews — reviews written by the client (published or pending). */
export const GET = route(async () => ok(await reviewService.listMine(await requireClient())));
