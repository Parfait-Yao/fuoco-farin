import { route, ok } from '@/server/http/route';
import { paymentService } from '@/server/services/paymentService';

export const dynamic = 'force-dynamic';

/** GET /api/payments/config — whether online payment is enabled, test mode and currency (never the secret). */
export const GET = route(async () => ok(paymentService.publicConfig()));
