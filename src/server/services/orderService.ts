import 'server-only';
import { createHmac } from 'node:crypto';
import { Prisma, type OrderStatus as DbOrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { OrderStatus } from '@/types';
import { toOrder, type OrderWithRelations } from '../mappers';
import { badRequest, conflict, forbidden, notConfigured, notFound } from '../http/errors';
import { env } from '../env';
import { fromDeliveryMode, fromOrderStatus, fromPaymentMethod, fromSize, toDbDeliveryMode, toDbOrderStatus, toDbPaymentMethod } from '../enums';
import type { SessionUser } from '../auth/session';
import type { CreateOrderInput } from '../validations/order';
import { emails, type OrderEmailData } from '../emails/templates';
import { queueMail } from '../emails/mailer';
import { quoteCart } from './quoteService';
import { stockService } from './stockService';
import { activityService, notificationService } from './notificationService';
import { getLocale, getMessages } from '@/i18n/server';

/** API messages in the request language. */
const msg = () => getMessages('api');

const orderInclude = { items: true, history: true } satisfies Prisma.OrderInclude;

/** Forward-only status flow. CANCELLED is reachable from any non-final status. */
const FLOW: DbOrderStatus[] = ['RECEIVED', 'IN_KITCHEN', 'SENT_FOR_DELIVERY', 'DELIVERED'];
export function canTransition(from: DbOrderStatus, to: DbOrderStatus): boolean {
  if (from === to || from === 'DELIVERED' || from === 'CANCELLED') return false;
  if (to === 'CANCELLED') return true;
  return FLOW.indexOf(to) > FLOW.indexOf(from);
}

function orderNumber() {
  const d = new Date();
  const date = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return `FF-${date}-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')}`;
}

export function orderEmailData(o: OrderWithRelations): OrderEmailData {
  return {
    id: o.id,
    number: o.number,
    locale: o.locale,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    total: o.total,
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    discount: o.discount,
    deliveryMode: fromDeliveryMode(o.deliveryMode),
    paymentMethod: fromPaymentMethod(o.paymentMethod),
    items: o.items.map((i) => ({ name: i.name, quantity: i.quantity, size: fromSize(i.size), lineTotal: i.lineTotal })),
  };
}

async function loadOrder(id: string) {
  const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  if (!order) throw notFound(msg().orderNotFound);
  return order;
}

export const orderService = {
  orderInclude,

  /**
   * Creates an order in one transaction:
   * prices (server-side), promo usage (atomic, capped), stock reservation
   * (conditional updates), order + snapshot lines + first history entry,
   * notifications. Emails are sent after the commit.
   */
  async create(input: CreateOrderInput, user: SessionUser | null) {
    if (user?.role === 'ADMIN') throw forbidden(msg().adminsCannotOrder);
    // Refuse before creating the order: an unpayable online order would block stock until it expires.
    if (input.paymentMethod !== 'cash' && !env().STRIPE_SECRET_KEY) throw notConfigured(msg().onlinePaymentUnavailable);
    const isPickup = input.deliveryMode === 'pickup';
    const email = (user?.email ?? input.contact.email).toLowerCase();

    const order = await prisma.$transaction(
      async (tx) => {
        const quote = await quoteCart(input, { userId: user?.id, email }, tx);
        if (input.promoCode && !quote.promo) throw badRequest(quote.promoError ?? msg().promoInvalid);

        if (quote.promo) {
          const updated = await tx.$executeRaw`
            UPDATE "promotions" SET "usageCount" = "usageCount" + 1, "updatedAt" = now()
            WHERE "id" = ${quote.promo.id}::uuid AND ("maxUses" IS NULL OR "usageCount" < "maxUses")`;
          if (!updated) throw conflict(msg().promoExhausted);
        }

        const created = await tx.order.create({
          data: {
            number: orderNumber(),
            locale: getLocale(),
            userId: user?.id ?? null,
            paymentMethod: toDbPaymentMethod(input.paymentMethod),
            deliveryMode: toDbDeliveryMode(input.deliveryMode),
            customerName: input.contact.fullName,
            customerEmail: email,
            customerPhone: input.contact.phone,
            street: input.address.street,
            district: input.address.district,
            city: input.address.city,
            details: input.address.details ?? null,
            latitude: input.address.latitude ?? null,
            longitude: input.address.longitude ?? null,
            subtotal: quote.subtotal,
            deliveryFee: quote.deliveryFee,
            discount: quote.discount,
            total: quote.total,
            promotionId: quote.promo?.id ?? null,
            promoCode: quote.promo?.code ?? null,
            note: input.note ?? null,
            stockDeducted: quote.needs.size > 0,
            items: {
              create: quote.lines.map((l) => ({
                pizzaId: l.pizzaId,
                name: l.name,
                imageUrl: l.imageUrl,
                categoryName: l.categoryName,
                size: l.size.toUpperCase() as 'SMALL' | 'MEDIUM' | 'LARGE',
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                lineTotal: l.lineTotal,
                removedIngredients: l.removedIngredients,
                note: l.note,
                // Omitted (SQL NULL) for catalog pizzas. Do not pass Prisma.JsonNull here: once
                // bundled by Next, it can be serialized as `{}`, and `{}` reads back as a custom pizza.
                ...(l.customConfig ? { customConfig: l.customConfig as unknown as Prisma.InputJsonValue } : {}),
              })),
            },
            history: { create: { status: 'RECEIVED', note: isPickup ? msg().pickupOrder : null } },
          },
          include: orderInclude,
        });

        await stockService.reserve(tx, quote.needs, created.id);

        if (user) {
          await notificationService.notifyUser(
            user.id,
            { kind: 'ORDER', event: { key: 'orderConfirmed', params: { number: created.number } }, href: `/account/orders/${created.id}/tracking` },
            tx,
          );
          // The cart is now an order.
          await tx.cart.updateMany({ where: { userId: user.id }, data: { promoCode: null } });
          await tx.cartItem.deleteMany({ where: { cart: { userId: user.id } } });
        }
        const settings = await tx.restaurantSettings.findUnique({ where: { id: 1 }, select: { notifyNewOrders: true } });
        if (settings?.notifyNewOrders !== false) {
          await notificationService.notifyAdmins(
            { kind: 'ORDER', event: { key: 'orderNew', params: { number: created.number, customer: created.customerName } }, href: `/admin/orders/${created.id}` },
            { email: true },
            tx,
          );
        }
        await activityService.log('ORDER', { key: 'orderReceived', params: { number: created.number } }, user?.id, tx);
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 20_000, maxWait: 10_000 },
    );

    if (order.stockDeducted) await stockService.checkLowStock(Array.from(new Set((await prisma.stockMovement.findMany({ where: { orderId: order.id }, select: { ingredientId: true } })).map((m) => m.ingredientId))));
    queueMail(emails.orderConfirmation(orderEmailData(order)));
    return toOrder(order);
  },

  async listMine(user: SessionUser) {
    const rows = await prisma.order.findMany({ where: { userId: user.id }, include: orderInclude, orderBy: { createdAt: 'desc' }, take: 200 });
    return rows.map(toOrder);
  },

  /** Owner or admin. Guests can read their order right after checkout through the confirmation token. */
  async get(id: string, user: SessionUser | null, guestToken?: string | null) {
    const order = await loadOrder(id);
    const isOwner = user && order.userId === user.id;
    const isAdmin = user?.role === 'ADMIN';
    const isGuest = !order.userId && guestToken && guestToken === guestTokenFor(order.id, order.createdAt);
    if (!isOwner && !isAdmin && !isGuest) throw notFound(msg().orderNotFound);
    return toOrder(order);
  },

  async adminList(filters: { status?: OrderStatus; q?: string; from?: Date; to?: Date; take: number }) {
    const where: Prisma.OrderWhereInput = {
      ...(filters.status ? { status: toDbOrderStatus(filters.status) } : {}),
      ...(filters.from || filters.to ? { createdAt: { gte: filters.from, lte: filters.to } } : {}),
      ...(filters.q
        ? { OR: [{ number: { contains: filters.q, mode: 'insensitive' } }, { customerName: { contains: filters.q, mode: 'insensitive' } }, { customerEmail: { contains: filters.q, mode: 'insensitive' } }] }
        : {}),
    };
    const rows = await prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: 'desc' }, take: filters.take });
    return rows.map(toOrder);
  },

  /**
   * Admin status change. Forward-only; online orders must be paid before going to the kitchen.
   * DELIVERED is set by the customer who receives the order (see confirmReceipt).
   * Only guest orders, whose customer has no account, can be closed by the admin.
   */
  async updateStatus(id: string, status: OrderStatus, actor: SessionUser, note?: string) {
    const target = toDbOrderStatus(status);
    if (target === 'CANCELLED') return this.cancel(id, actor, note);
    const order = await loadOrder(id);
    if (target === 'DELIVERED' && order.userId) throw conflict(msg().customerConfirmsDelivery);
    return this.applyStatus(order, target, actor, note);
  },

  /** The customer confirms they received the order: it becomes DELIVERED for everyone (admin included, live). */
  async confirmReceipt(id: string, user: SessionUser) {
    const order = await loadOrder(id);
    if (order.userId !== user.id) throw notFound(msg().orderNotFound);
    if (order.status !== 'SENT_FOR_DELIVERY') throw conflict(msg().notOnTheWayYet);
    return this.applyStatus(order, 'DELIVERED', user, msg().receivedByCustomer);
  },

  /** Forward status change shared by the admin and the customer receipt confirmation. */
  async applyStatus(order: OrderWithRelations, target: DbOrderStatus, actor: SessionUser, note?: string) {
    const id = order.id;
    const status = fromOrderStatus(target);
    if (!canTransition(order.status, target)) {
      const labels = getMessages('domain').orderStatus;
      throw conflict(msg().transitionImpossible(labels[fromOrderStatus(order.status)].label, labels[status].label));
    }
    if (order.paymentMethod !== 'CASH' && order.paymentStatus !== 'PAID') throw conflict(msg().unpaidCannotAdvance);

    const updated = await prisma.$transaction(async (tx) => {
      // Conditional update: a concurrent change makes this one fail cleanly.
      const { count } = await tx.order.updateMany({
        where: { id, status: order.status },
        data: {
          status: target,
          ...(target === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
          // Cash is collected on delivery.
          ...(target === 'DELIVERED' && order.paymentMethod === 'CASH' ? { paymentStatus: 'PAID', paidAt: new Date() } : {}),
        },
      });
      if (!count) throw conflict(msg().orderChanged);
      await tx.orderStatusHistory.create({ data: { orderId: id, status: target, note: note ?? null, changedById: actor.id } });
      if (target === 'DELIVERED' && order.paymentMethod === 'CASH') {
        await tx.payment.create({ data: { orderId: id, provider: 'CASH', status: 'CAPTURED', amount: order.total, currency: 'usd', signatureVerified: true } });
      }
      if (order.userId) {
        await notificationService.notifyUser(
          order.userId,
          { kind: 'ORDER', event: { key: 'orderStatus', params: { number: order.number, status } }, href: `/account/orders/${id}/tracking` },
          tx,
        );
      }
      await activityService.log('ORDER', { key: 'orderStatus', params: { number: order.number, status } }, actor.id, tx);
      return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    });

    queueMail(emails.statusChange(updated, status, note));
    return toOrder(updated);
  },

  /**
   * Cancels an order: restores stock, gives back the promo use and settles
   * the payment state. Clients may cancel only while the order is RECEIVED.
   */
  async cancel(id: string, actor: SessionUser | null, reason?: string, options: { system?: boolean } = {}) {
    const order = await loadOrder(id);
    if (!options.system) {
      if (!actor) throw forbidden();
      const isAdmin = actor.role === 'ADMIN';
      if (!isAdmin && order.userId !== actor.id) throw notFound(msg().orderNotFound);
      if (!isAdmin && order.status !== 'RECEIVED') throw conflict(msg().alreadyPreparing);
    }
    if (!canTransition(order.status, 'CANCELLED')) throw conflict(msg().cannotCancel);

    const wasPaid = order.paymentStatus === 'PAID';
    const updated = await prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id, status: order.status },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason ?? null, ...(wasPaid ? {} : { paymentStatus: 'CANCELLED' }) },
      });
      if (!count) throw conflict(msg().orderChanged);
      await tx.orderStatusHistory.create({ data: { orderId: id, status: 'CANCELLED', note: reason ?? (options.system ? msg().paymentNotCompleted : null), changedById: actor?.id ?? null } });
      await stockService.release(tx, id, msg().cancellation(order.number));
      if (order.promotionId) {
        await tx.$executeRaw`UPDATE "promotions" SET "usageCount" = GREATEST("usageCount" - 1, 0) WHERE "id" = ${order.promotionId}::uuid`;
      }
      await tx.payment.updateMany({ where: { orderId: id, status: { in: ['CREATED', 'AUTHORIZED'] } }, data: { status: 'CANCELLED' } });
      if (order.userId && actor?.id !== order.userId) {
        await notificationService.notifyUser(order.userId, { kind: 'ORDER', event: { key: 'orderCancelledCustomer', params: { number: order.number, reason: reason ?? null } }, href: `/account/orders/${id}` }, tx);
      }
      if (actor?.role !== 'ADMIN') {
        await notificationService.notifyAdmins({ kind: 'ORDER', event: { key: 'orderCancelledAdmin', params: { number: order.number, system: Boolean(options.system) } }, href: `/admin/orders/${id}` }, {}, tx);
      }
      await activityService.log('ORDER', { key: 'orderCancelled', params: { number: order.number } }, actor?.id, tx);
      return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    });

    // Paid online order: refund through the provider (outside the transaction).
    if (wasPaid && order.paymentMethod !== 'CASH') {
      const { paymentService } = await import('./paymentService');
      await paymentService.refundOrder(id);
    }
    queueMail(emails.statusChange(updated, 'cancelled', reason));
    return toOrder(await prisma.order.findUniqueOrThrow({ where: { id }, include: orderInclude }));
  },

  /** Cancels online orders still unpaid after the timeout and releases their stock. */
  async expireUnpaid(timeoutMinutes: number) {
    const limit = new Date(Date.now() - timeoutMinutes * 60_000);
    const stale = await prisma.order.findMany({ where: { paymentMethod: { not: 'CASH' }, paymentStatus: { in: ['PENDING', 'FAILED'] }, status: 'RECEIVED', createdAt: { lt: limit } }, select: { id: true } });
    let done = 0;
    for (const o of stale) {
      try {
        await this.cancel(o.id, null, msg().paymentTimeout, { system: true });
        done += 1;
      } catch (error) {
        console.error('[orders] expire failed', o.id, (error as Error).message);
      }
    }
    return done;
  },
};

/** Opaque token letting a guest view the order they just placed (HMAC of id + date). */
export function guestTokenFor(orderId: string, createdAt: Date) {
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.DATABASE_URL || 'dev';
  return createHmac('sha256', secret).update(`${orderId}:${createdAt.toISOString()}`).digest('hex').slice(0, 32);
}
