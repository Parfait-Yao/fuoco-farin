import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { toIngredient, toMovement } from '../mappers';
import { badRequest, notFound, outOfStock } from '../http/errors';
import { fromStockUnit } from '../enums';
import { emails } from '../emails/templates';
import { queueMail } from '../emails/mailer';
import { activityService, notificationService } from './notificationService';
import { getMessages, pickLocalized } from '@/i18n/server';

/** API messages in the request language. */
const msg = () => getMessages('api');

type Tx = Prisma.TransactionClient;

/*
 * Stock rules
 * - Stock is reserved (decremented) when the order is created, inside the order
 *   transaction, with a conditional UPDATE (stock >= quantity). Two concurrent
 *   orders can never push a stock below zero: the second UPDATE matches no row
 *   and the whole order rolls back. A CHECK constraint (stock >= 0) backs this up.
 * - Stock goes back when an order is cancelled, its payment fails or it expires.
 * - Low-stock alerts are sent once per crossing (Ingredient.lowStockAlertedAt);
 *   the flag clears when stock rises above the threshold again.
 */

export const stockService = {
  /** Reserves stock for an order. Throws OUT_OF_STOCK with the ingredient name. */
  async reserve(tx: Tx, needs: Map<string, number>, orderId: string) {
    // Sorted ids: consistent lock order, no deadlock between concurrent orders.
    for (const ingredientId of Array.from(needs.keys()).sort()) {
      const qty = needs.get(ingredientId)!;
      const rows = await tx.$queryRaw<{ stock: Prisma.Decimal }[]>`
        UPDATE "ingredients" SET "stock" = "stock" - ${qty}::numeric, "updatedAt" = now()
        WHERE "id" = ${ingredientId}::uuid AND "trackStock" AND "stock" >= ${qty}::numeric
        RETURNING "stock"`;
      if (!rows.length) {
        const ingredient = await tx.ingredient.findUnique({ where: { id: ingredientId }, select: { name: true, nameEn: true } });
        throw outOfStock(msg().outOfStock(ingredient ? pickLocalized(ingredient.name, ingredient.nameEn) : msg().anIngredient), { ingredientId });
      }
      await tx.stockMovement.create({ data: { ingredientId, kind: 'ORDER', quantity: -qty, stockAfter: rows[0].stock, orderId, note: msg().stockReservation } });
    }
  },

  /** Gives back the stock reserved by an order (cancel, failed or expired payment). Idempotent per order. */
  async release(tx: Tx, orderId: string, note: string) {
    const { count } = await tx.order.updateMany({ where: { id: orderId, stockDeducted: true }, data: { stockDeducted: false } });
    if (!count) return [];
    const reserved = await tx.stockMovement.groupBy({ by: ['ingredientId'], where: { orderId, kind: { in: ['ORDER', 'ORDER_CANCEL'] } }, _sum: { quantity: true } });
    const restored: string[] = [];
    for (const r of reserved) {
      const qty = -Number(r._sum.quantity ?? 0);
      if (qty <= 0) continue;
      const [row] = await tx.$queryRaw<{ stock: Prisma.Decimal }[]>`
        UPDATE "ingredients" SET "stock" = "stock" + ${qty}::numeric, "updatedAt" = now()
        WHERE "id" = ${r.ingredientId}::uuid RETURNING "stock"`;
      if (!row) continue;
      await tx.stockMovement.create({ data: { ingredientId: r.ingredientId, kind: 'ORDER_CANCEL', quantity: qty, stockAfter: row.stock, orderId, note } });
      restored.push(r.ingredientId);
    }
    return restored;
  },

  /** Manual stock entry or exit from the admin. Never below zero. */
  async move(ingredientId: string, kind: 'in' | 'out', quantity: number, note: string, actorId: string) {
    const result = await prisma.$transaction(async (tx) => {
      const ingredient = await tx.ingredient.findFirst({ where: { id: ingredientId, deletedAt: null, kind: { not: 'TOPPING' } } });
      if (!ingredient) throw notFound(msg().ingredientNotFound);
      const delta = kind === 'in' ? quantity : -quantity;
      const rows = await tx.$queryRaw<{ stock: Prisma.Decimal }[]>`
        UPDATE "ingredients" SET "stock" = "stock" + ${delta}::numeric, "updatedAt" = now()
        WHERE "id" = ${ingredientId}::uuid AND "stock" + ${delta}::numeric >= 0
        RETURNING "stock"`;
      if (!rows.length) throw badRequest(msg().insufficientStock(`${Number(ingredient.stock)} ${getMessages('domain').units[fromStockUnit(ingredient.unit)]}`));
      const movement = await tx.stockMovement.create({
        data: { ingredientId, kind: kind === 'in' ? 'IN' : 'OUT', quantity: delta, stockAfter: rows[0].stock, note: note || null, authorId: actorId },
        include: { author: { select: { firstName: true, lastName: true } } },
      });
      const updated = await tx.ingredient.findUniqueOrThrow({ where: { id: ingredientId } });
      return { ingredient: updated, movement };
    });
    await activityService.log('STOCK', { key: 'stockMoved', params: { name: result.ingredient.name, delta: `${kind === 'in' ? '+' : '−'}${quantity}`, unit: fromStockUnit(result.ingredient.unit) } }, actorId);
    await this.checkLowStock([ingredientId]);
    return { ingredient: toIngredient(await prisma.ingredient.findUniqueOrThrow({ where: { id: ingredientId } })), movement: toMovement(result.movement) };
  },

  async setThreshold(ingredientId: string, threshold: number, actorId: string) {
    const ingredient = await prisma.ingredient.findFirst({ where: { id: ingredientId, deletedAt: null, kind: { not: 'TOPPING' } } });
    if (!ingredient) throw notFound(msg().ingredientNotFound);
    const unit = fromStockUnit(ingredient.unit);
    const [updated, movement] = await prisma.$transaction([
      prisma.ingredient.update({ where: { id: ingredientId }, data: { threshold } }),
      prisma.stockMovement.create({
        data: { ingredientId, kind: 'THRESHOLD', quantity: 0, stockAfter: threshold, note: msg().thresholdChanged(Number(ingredient.threshold), threshold, getMessages('domain').units[unit]), authorId: actorId },
        include: { author: { select: { firstName: true, lastName: true } } },
      }),
    ]);
    await this.checkLowStock([ingredientId]);
    return { ingredient: toIngredient(updated), movement: toMovement(movement) };
  },

  async movements(take = 300) {
    const rows = await prisma.stockMovement.findMany({ orderBy: { createdAt: 'desc' }, take, include: { author: { select: { firstName: true, lastName: true } } } });
    return rows.map(toMovement);
  },

  async lowStock() {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "ingredients" WHERE "deletedAt" IS NULL AND "active" AND "trackStock" AND "stock" <= "threshold"`;
    const list = await prisma.ingredient.findMany({ where: { id: { in: rows.map((r) => r.id) } }, orderBy: { name: 'asc' } });
    return list.map(toIngredient);
  },

  /**
   * Sends one alert per ingredient that crossed its threshold since the last
   * alert (in-app for every admin, plus email). Clears the flag of ingredients
   * that went back above the threshold. Called after stock changes and by the
   * scheduled job. Returns the number of new alerts.
   */
  async checkLowStock(ingredientIds?: string[]): Promise<number> {
    // Plain parameters only (no nested Prisma.sql fragment): see statsService.
    const all = !ingredientIds?.length;
    const ids = ingredientIds ?? [];

    await prisma.$executeRaw`
      UPDATE "ingredients" SET "lowStockAlertedAt" = NULL
      WHERE "lowStockAlertedAt" IS NOT NULL AND "stock" > "threshold" AND (${all}::boolean OR "id" = ANY(${ids}::uuid[]))`;

    // Claim the alert atomically so two runs never send it twice.
    const claimed = await prisma.$queryRaw<{ id: string; name: string; stock: Prisma.Decimal; threshold: Prisma.Decimal; unit: string }[]>`
      UPDATE "ingredients" SET "lowStockAlertedAt" = now()
      WHERE "lowStockAlertedAt" IS NULL AND "deletedAt" IS NULL AND "active" AND "trackStock" AND "stock" <= "threshold" AND (${all}::boolean OR "id" = ANY(${ids}::uuid[]))
      RETURNING "id", "name", "stock", "threshold", "unit"`;
    if (!claimed.length) return 0;

    const settings = await prisma.restaurantSettings.findUnique({ where: { id: 1 }, select: { notifyLowStock: true } });
    if (settings && !settings.notifyLowStock) return claimed.length;

    const items = claimed.map((c) => ({ name: c.name, stock: Number(c.stock), threshold: Number(c.threshold), unit: fromStockUnit(c.unit as never) }));
    for (const item of items) {
      await notificationService.notifyAdmins({ kind: 'STOCK', event: { key: 'lowStock', params: item }, href: '/admin/stock' });
    }
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE', deletedAt: null }, select: { email: true } });
    if (admins.length) queueMail(emails.lowStock(admins.map((a) => a.email), items));
    return claimed.length;
  },
};
