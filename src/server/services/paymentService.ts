import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { env } from '../env';
import { AppError, conflict, forbidden, notConfigured, notFound } from '../http/errors';
import type { SessionUser } from '../auth/session';
import { emails } from '../emails/templates';
import { queueMail } from '../emails/mailer';
import { guestTokenFor, orderEmailData, orderService } from './orderService';
import { activityService, notificationService } from './notificationService';
import { getLocale, getMessages } from '@/i18n/server';

/** API messages in the request language. */
const msg = () => getMessages('api');

/*
 * Stripe Checkout (hosted payment page). Test keys (sk_test_...) keep it in
 * test mode, even in production: cards like 4242 4242 4242 4242 succeed and
 * no real money moves.
 * Trust rules:
 * - the amount always comes from the order row, never from the browser;
 * - a payment counts as successful only after the server read the Checkout
 *   Session from Stripe (paid, same order, same amount), or after a signed
 *   webhook;
 * - every transition to PAID is a conditional update, so the browser return
 *   and the webhook can both arrive without double processing.
 * Amounts are US dollars in cents, Stripe's unit for USD: amount = order total.
 */

const CURRENCY = 'usd';
/** Stripe requires at least 30 minutes before a Checkout Session expires. */
const SESSION_MINUTES = 30;

let client: Stripe | null = null;
function stripe(): Stripe {
  const key = env().STRIPE_SECRET_KEY;
  if (!key) throw notConfigured(msg().stripeNotConfigured);
  client ??= new Stripe(key);
  return client;
}

/** Stripe errors become a clear payment error instead of a generic 500. */
async function call<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('[payments] stripe error', (error as Error).message);
    throw new AppError('PAYMENT_ERROR', msg().paymentServiceDown);
  }
}

/** Constant-time HMAC-SHA256 comparison. */
export function verifyHmac(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature || '', 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

const paymentIntentId = (session: Stripe.Checkout.Session) => (typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null));

async function ownedOrder(orderId: string, user: SessionUser | null, guestToken?: string | null) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: orderService.orderInclude });
  if (!order) throw notFound(msg().orderNotFound);
  const allowed = user ? order.userId === user.id : !order.userId && Boolean(guestToken) && guestToken === guestTokenFor(order.id, order.createdAt);
  if (!allowed) throw forbidden();
  return order;
}

export const paymentService = {
  publicConfig() {
    const key = env().STRIPE_SECRET_KEY ?? '';
    return { provider: 'stripe', enabled: Boolean(key), testMode: !key.startsWith('sk_live_'), currency: CURRENCY };
  },

  /**
   * Creates (or reuses) the Stripe Checkout Session of an unpaid online order
   * and returns the URL of the Stripe payment page.
   */
  async createCheckout(orderId: string, user: SessionUser | null, guestToken?: string | null) {
    const order = await ownedOrder(orderId, user, guestToken);
    if (order.paymentMethod !== 'STRIPE') throw conflict(msg().payOnDelivery);
    if (order.paymentStatus === 'PAID') throw conflict(msg().alreadyPaid);
    if (order.status === 'CANCELLED') throw conflict(msg().orderCancelled);

    // Reuse a session still open for the same amount (customer came back).
    const pending = await prisma.payment.findFirst({ where: { orderId, provider: 'STRIPE', status: 'CREATED', amount: order.total, currency: CURRENCY }, orderBy: { createdAt: 'desc' } });
    if (pending?.providerOrderId) {
      const existing = await call(stripe().checkout.sessions.retrieve(pending.providerOrderId));
      if (existing.status === 'open' && existing.url) return { url: existing.url };
    }

    const site = env().NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
    const token = guestToken ? `&token=${encodeURIComponent(guestToken)}` : '';
    const session = await call(
      stripe().checkout.sessions.create({
        mode: 'payment',
        line_items: [{ quantity: 1, price_data: { currency: CURRENCY, unit_amount: order.total, product_data: { name: msg().stripeLineItem(order.number) } } }],
        customer_email: order.customerEmail,
        client_reference_id: order.id,
        metadata: { orderId: order.id, number: order.number },
        payment_intent_data: { metadata: { orderId: order.id, number: order.number } },
        success_url: `${site}/checkout/confirmation/${order.id}?session_id={CHECKOUT_SESSION_ID}${token}`,
        cancel_url: `${site}/checkout?payment=cancelled&order=${order.id}${token}`,
        expires_at: Math.floor(Date.now() / 1000) + SESSION_MINUTES * 60 + 60,
        // Stripe page in the customer's language.
        locale: getLocale(),
      }),
    );
    if (!session.url) throw new AppError('PAYMENT_ERROR', msg().checkoutUnavailable);
    await prisma.payment.create({ data: { orderId, provider: 'STRIPE', status: 'CREATED', amount: order.total, currency: CURRENCY, providerOrderId: session.id } });
    return { url: session.url };
  },

  /** Return from the Stripe page: asks Stripe for the truth, then marks the order paid. */
  async verifyCheckout(input: { orderId: string; sessionId: string }, user: SessionUser | null, guestToken?: string | null) {
    await ownedOrder(input.orderId, user, guestToken);
    const payment = await prisma.payment.findUnique({ where: { providerOrderId: input.sessionId } });
    if (!payment || payment.orderId !== input.orderId) throw new AppError('PAYMENT_ERROR', msg().paymentUnknown);

    const session = await call(stripe().checkout.sessions.retrieve(input.sessionId));
    if (session.client_reference_id !== input.orderId || session.amount_total !== payment.amount || session.currency !== payment.currency) {
      throw new AppError('PAYMENT_ERROR', msg().paymentMismatch);
    }
    if (session.payment_status !== 'paid') throw new AppError('PAYMENT_ERROR', msg().paymentNotDone);
    await this.markPaid(session.id, paymentIntentId(session) ?? session.id, session, true);
    return orderService.get(input.orderId, user, guestToken);
  },

  /** Idempotent: only the first call flips the order to PAID and sends emails. */
  async markPaid(providerOrderId: string, providerPaymentId: string, raw: unknown, signatureVerified: boolean) {
    const payment = await prisma.payment.findUnique({ where: { providerOrderId } });
    if (!payment) return false;
    const changed = await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'CAPTURED', providerPaymentId, signatureVerified: signatureVerified || payment.signatureVerified, raw: raw as Prisma.InputJsonValue, failureReason: null },
      });
      const { count } = await tx.order.updateMany({ where: { id: payment.orderId, paymentStatus: { not: 'PAID' }, status: { not: 'CANCELLED' } }, data: { paymentStatus: 'PAID', paidAt: new Date() } });
      if (!count) return false;
      const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
      if (order.userId) {
        await notificationService.notifyUser(order.userId, { kind: 'ORDER', event: { key: 'paymentConfirmed', params: { number: order.number } }, href: `/account/orders/${order.id}` }, tx);
      }
      await notificationService.notifyAdmins({ kind: 'ORDER', event: { key: 'paymentReceived', params: { number: order.number } }, href: `/admin/orders/${order.id}` }, {}, tx);
      await activityService.log('ORDER', { key: 'paymentReceived', params: { number: order.number } }, null, tx);
      return true;
    });
    if (changed) {
      const order = await prisma.order.findUniqueOrThrow({ where: { id: payment.orderId }, include: orderService.orderInclude });
      queueMail(emails.paymentConfirmation(orderEmailData(order), providerPaymentId));
    } else {
      // Paid after a cancellation (late webhook): refund it.
      const order = await prisma.order.findUnique({ where: { id: payment.orderId }, select: { status: true } });
      if (order?.status === 'CANCELLED') await this.refundOrder(payment.orderId);
    }
    return changed;
  },

  async markFailed(providerOrderId: string, providerPaymentId: string | null, reason: string) {
    const payment = await prisma.payment.findUnique({ where: { providerOrderId } });
    if (!payment || payment.status === 'CAPTURED') return;
    await prisma.$transaction([
      prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failureReason: reason.slice(0, 300), providerPaymentId: providerPaymentId ?? undefined } }),
      prisma.order.updateMany({ where: { id: payment.orderId, paymentStatus: 'PENDING' }, data: { paymentStatus: 'FAILED' } }),
    ]);
  },

  /** Customer left the Stripe page: the order is cancelled, its stock released, and the open session closed. */
  async cancelCheckout(orderId: string, user: SessionUser | null, guestToken?: string | null) {
    const order = await ownedOrder(orderId, user, guestToken);
    if (order.paymentStatus === 'PAID' || order.status === 'CANCELLED') return;
    const open = await prisma.payment.findMany({ where: { orderId, provider: 'STRIPE', status: 'CREATED' }, select: { providerOrderId: true } });
    for (const p of open) {
      if (!p.providerOrderId) continue;
      // Already expired or completed: nothing to close.
      await stripe().checkout.sessions.expire(p.providerOrderId).catch(() => undefined);
    }
    await orderService.cancel(orderId, null, msg().paymentCancelledByCustomer, { system: true });
  },

  /** Full refund of the captured payment of an order. Best effort; failures alert admins. */
  async refundOrder(orderId: string) {
    const payment = await prisma.payment.findFirst({ where: { orderId, provider: 'STRIPE', status: 'CAPTURED' } });
    if (!payment?.providerPaymentId) return;
    try {
      await stripe().refunds.create({ payment_intent: payment.providerPaymentId });
      await prisma.$transaction([
        prisma.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } }),
        prisma.order.update({ where: { id: orderId }, data: { paymentStatus: 'REFUNDED' } }),
      ]);
    } catch (error) {
      console.error('[payments] refund failed', orderId, (error as Error).message);
      await notificationService.notifyAdmins({ kind: 'SYSTEM', event: { key: 'refundFailed', params: { error: (error as Error).message } }, href: `/admin/orders/${orderId}` }, { email: true });
    }
  },

  /**
   * Stripe webhook. Signature checked by the SDK over the raw body;
   * idempotent through WebhookEvent(provider, eventId).
   */
  async handleWebhook(rawBody: string, signature: string | null) {
    const secret = env().STRIPE_WEBHOOK_SECRET;
    if (!secret) throw notConfigured('STRIPE_WEBHOOK_SECRET manquant.');
    let event: Stripe.Event;
    try {
      event = stripe().webhooks.constructEvent(rawBody, signature ?? '', secret);
    } catch {
      throw new AppError('FORBIDDEN', msg().invalidWebhookSignature);
    }

    // Insert-or-skip: a replayed event id is detected without raising.
    const { count } = await prisma.webhookEvent.createMany({
      data: [{ provider: 'STRIPE', eventId: event.id, eventType: event.type, payload: event as unknown as Prisma.InputJsonValue }],
      skipDuplicates: true,
    });
    if (!count) {
      const existing = await prisma.webhookEvent.findUnique({ where: { provider_eventId: { provider: 'STRIPE', eventId: event.id } } });
      if (existing?.processedAt) return { duplicate: true };
    }

    try {
      if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        const session = event.data.object;
        const local = await prisma.payment.findUnique({ where: { providerOrderId: session.id } });
        if (local && session.payment_status === 'paid' && session.amount_total === local.amount && session.currency === local.currency) {
          await this.markPaid(session.id, paymentIntentId(session) ?? session.id, session, true);
        }
      } else if (event.type === 'checkout.session.async_payment_failed' || event.type === 'checkout.session.expired') {
        const session = event.data.object;
        await this.markFailed(session.id, paymentIntentId(session), event.type === 'checkout.session.expired' ? msg().sessionExpiredReason : msg().paymentRefused);
      }
      await prisma.webhookEvent.update({ where: { provider_eventId: { provider: 'STRIPE', eventId: event.id } }, data: { processedAt: new Date(), error: null } });
      return { duplicate: false };
    } catch (error) {
      await prisma.webhookEvent.update({ where: { provider_eventId: { provider: 'STRIPE', eventId: event.id } }, data: { error: (error as Error).message.slice(0, 500) } });
      throw error;
    }
  },
};
