import 'server-only';
import type { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { toPromotion, toReview } from '../mappers';
import { badRequest, conflict, notFound } from '../http/errors';
import { evaluatePromo } from '../domain/pricing';
import type { SessionUser } from '../auth/session';
import type { contactSchema, promotionSchema, reviewSchema } from '../validations/marketing';
import { activityService, notificationService } from './notificationService';
import { settingsService } from './settingsService';
import { emails } from '../emails/templates';
import { queueMail } from '../emails/mailer';
import { getMessages } from '@/i18n/server';

/** API messages in the request language. */
const msg = () => getMessages('api');

type PromotionInput = z.infer<typeof promotionSchema>;

const reviewInclude = { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } as const;

/** Recomputes the denormalized rating of a pizza from its published reviews. */
async function refreshRating(pizzaId: string) {
  const agg = await prisma.review.aggregate({ where: { pizzaId, published: true }, _avg: { rating: true }, _count: true });
  await prisma.pizza.update({ where: { id: pizzaId }, data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 100) / 100, reviewCount: agg._count } });
}

export const promotionService = {
  async list() {
    const rows = await prisma.promotion.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } });
    return rows.map(toPromotion);
  },

  async save(input: PromotionInput, actorId: string, id?: string) {
    const data = {
      code: input.code,
      label: input.label,
      labelEn: input.labelEn,
      kind: input.kind === 'percent' ? ('PERCENT' as const) : ('FIXED' as const),
      value: input.value,
      minOrder: input.minOrder,
      maxDiscount: input.maxDiscount ?? null,
      startsAt: input.startDate,
      endsAt: input.endDate,
      active: input.active,
      maxUses: input.maxUses ?? null,
      maxUsesPerUser: input.maxUsesPerUser ?? null,
    };
    const clash = await prisma.promotion.findUnique({ where: { code: data.code } });
    if (clash && clash.id !== id) throw conflict(clash.deletedAt ? msg().promoCodeReused : msg().promoCodeExists);
    let row;
    if (id) {
      const existing = await prisma.promotion.findFirst({ where: { id, deletedAt: null } });
      if (!existing) throw notFound(msg().promotionNotFound);
      row = await prisma.promotion.update({ where: { id }, data });
    } else {
      row = await prisma.promotion.create({ data });
    }
    await activityService.log('CATALOG', { key: 'promotionSaved', params: { code: row.code, created: !id } }, actorId);
    return toPromotion(row);
  },

  /** Soft delete: past orders keep the code; the code stays reserved. */
  async remove(id: string, actorId: string) {
    const row = await prisma.promotion.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw notFound(msg().promotionNotFound);
    await prisma.promotion.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
    await activityService.log('CATALOG', { key: 'promotionDeleted', params: { code: row.code } }, actorId);
  },

  /** Checks a code against a subtotal for the cart UI. The order recomputes it anyway. */
  async check(code: string, subtotal: number, user: SessionUser | null) {
    const row = await prisma.promotion.findUnique({ where: { code } });
    let uses = 0;
    if (row?.maxUsesPerUser && user) uses = await prisma.order.count({ where: { promotionId: row.id, userId: user.id, status: { not: 'CANCELLED' } } });
    const result = evaluatePromo(row && { ...row, deleted: Boolean(row.deletedAt) }, subtotal, new Date(), uses, row?.maxUsesPerUser ?? null);
    if (!result.ok || !row) throw badRequest(result.ok ? msg().promoUnknown : result.reason);
    return { promotion: { ...toPromotion(row), usageCount: 0 }, discount: result.discount };
  },
};

export const reviewService = {
  async listAll() {
    const rows = await prisma.review.findMany({ include: reviewInclude, orderBy: { createdAt: 'desc' } });
    return rows.map(toReview);
  },

  async listMine(user: SessionUser) {
    const rows = await prisma.review.findMany({ where: { userId: user.id }, include: reviewInclude, orderBy: { createdAt: 'desc' } });
    return rows.map(toReview);
  },

  /** A client reviews a pizza from one of their delivered orders. Published after moderation. */
  async create(user: SessionUser, input: z.infer<typeof reviewSchema>) {
    const order = await prisma.order.findFirst({ where: { id: input.orderId, userId: user.id }, include: { items: { select: { pizzaId: true } } } });
    if (!order) throw notFound(msg().orderNotFound);
    if (order.status !== 'DELIVERED') throw badRequest(msg().reviewAfterDelivery);
    if (!order.items.some((i) => i.pizzaId === input.pizzaId)) throw badRequest(msg().pizzaNotInOrder);

    const existing = await prisma.review.findUnique({ where: { userId_orderId_pizzaId: { userId: user.id, orderId: input.orderId, pizzaId: input.pizzaId } } });
    const review = existing
      ? await prisma.review.update({ where: { id: existing.id }, data: { rating: input.rating, comment: input.comment, published: false }, include: reviewInclude })
      : await prisma.review.create({ data: { userId: user.id, orderId: input.orderId, pizzaId: input.pizzaId, rating: input.rating, comment: input.comment }, include: reviewInclude });
    if (existing?.published) await refreshRating(input.pizzaId);

    const settings = await settingsService.raw();
    if (settings.notifyNewReviews) {
      await notificationService.notifyAdmins({ kind: 'REVIEW', event: { key: 'reviewNew', params: { rating: input.rating, firstName: user.firstName } }, href: '/admin/reviews' }, { email: true });
    }
    await activityService.log('REVIEW', { key: 'reviewNew', params: { name: `${user.firstName} ${user.lastName}`.trim() } }, user.id);
    return toReview(review);
  },

  async setPublished(id: string, published: boolean, actorId: string) {
    const review = await prisma.review.update({ where: { id }, data: { published }, include: reviewInclude });
    await refreshRating(review.pizzaId);
    await activityService.log('REVIEW', { key: 'reviewToggled', params: { published } }, actorId);
    return toReview(review);
  },

  async remove(id: string, actorId: string) {
    const review = await prisma.review.delete({ where: { id } });
    await refreshRating(review.pizzaId);
    await activityService.log('REVIEW', { key: 'reviewDeleted', params: undefined }, actorId);
  },
};

export const favoriteService = {
  async list(user: SessionUser) {
    const rows = await prisma.favorite.findMany({ where: { userId: user.id, pizza: { deletedAt: null } }, orderBy: { createdAt: 'desc' }, select: { pizzaId: true } });
    return rows.map((r) => r.pizzaId);
  },

  async add(user: SessionUser, pizzaId: string) {
    const pizza = await prisma.pizza.findFirst({ where: { id: pizzaId, deletedAt: null }, select: { id: true } });
    if (!pizza) throw notFound(msg().pizzaNotFound);
    await prisma.favorite.upsert({ where: { userId_pizzaId: { userId: user.id, pizzaId } }, update: {}, create: { userId: user.id, pizzaId } });
    return this.list(user);
  },

  async remove(user: SessionUser, pizzaId: string) {
    await prisma.favorite.deleteMany({ where: { userId: user.id, pizzaId } });
    return this.list(user);
  },
};

export const contactService = {
  async subscribe(email: string) {
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (existing && !existing.unsubscribedAt) throw conflict(msg().alreadySubscribed);
    await prisma.newsletterSubscriber.upsert({ where: { email }, update: { unsubscribedAt: null }, create: { email } });
  },

  async message(input: z.infer<typeof contactSchema>) {
    await prisma.contactMessage.create({ data: input });
    const settings = await settingsService.raw();
    queueMail(emails.contact(settings.email, input));
    await notificationService.notifyAdmins({ kind: 'SYSTEM', event: { key: 'contactMessage', params: { name: input.name, subject: input.subject } }, href: '/admin/notifications' });
  },
};
