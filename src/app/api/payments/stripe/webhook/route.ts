import { route, ok } from '@/server/http/route';
import { paymentService } from '@/server/services/paymentService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/stripe/webhook — checkout.session.completed, async_payment_succeeded,
 * async_payment_failed, expired. Signed with STRIPE_WEBHOOK_SECRET; idempotent by event id.
 */
export const POST = route(async (request) => {
  const raw = await request.text();
  return ok(await paymentService.handleWebhook(raw, request.headers.get('stripe-signature')));
});
