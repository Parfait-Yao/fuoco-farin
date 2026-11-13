import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { CartItem } from '@/types';
import type { CartLineInput } from '../validations/order';
import { notFound } from '../http/errors';
import { fromSize, toDbSize } from '../enums';
import type { SessionUser } from '../auth/session';
import { publicQuote, quoteCart } from './quoteService';
import { getMessages } from '@/i18n/server';

/** API messages in the request language. */
const msg = () => getMessages('api');

/*
 * Server cart of a signed-in client. Lines hold references only (pizza or
 * builder composition, size, quantity); prices are computed on each read.
 * Guests keep a local cart; it is merged here at login.
 */

const itemInclude = { customPizza: { include: { vegetables: true } } } satisfies Prisma.CartItemInclude;
type ItemRow = Prisma.CartItemGetPayload<{ include: typeof itemInclude }>;

function toLine(row: ItemRow): CartLineInput {
  return {
    pizzaId: row.pizzaId ?? undefined,
    custom: row.customPizza
      ? { baseId: row.customPizza.baseId, sauceId: row.customPizza.sauceId, cheeseId: row.customPizza.cheeseId, veggieIds: row.customPizza.vegetables.map((v) => v.ingredientId) }
      : undefined,
    name: row.customPizza?.name,
    size: fromSize(row.size),
    quantity: row.quantity,
    removedIngredients: row.removedIngredients,
    note: row.note ?? undefined,
  };
}

async function ensureCart(userId: string) {
  return prisma.cart.upsert({ where: { userId }, update: {}, create: { userId } });
}

async function createItem(tx: Prisma.TransactionClient, cartId: string, userId: string, line: CartLineInput) {
  let customPizzaId: string | null = null;
  if (line.custom) {
    const custom = await tx.customPizza.create({
      data: {
        userId,
        name: line.name?.trim() || msg().customPizza,
        baseId: line.custom.baseId,
        sauceId: line.custom.sauceId,
        cheeseId: line.custom.cheeseId,
        vegetables: { create: Array.from(new Set(line.custom.veggieIds)).map((ingredientId) => ({ ingredientId })) },
      },
    });
    customPizzaId = custom.id;
  }
  await tx.cartItem.create({
    data: { cartId, pizzaId: line.pizzaId ?? null, customPizzaId, size: toDbSize(line.size), quantity: line.quantity, removedIngredients: line.removedIngredients, note: line.note ?? null },
  });
}

async function clearItems(tx: Prisma.TransactionClient, cartId: string, where: Prisma.CartItemWhereInput = {}) {
  const rows = await tx.cartItem.findMany({ where: { cartId, ...where }, select: { id: true, customPizzaId: true } });
  await tx.cartItem.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
  const customIds = rows.flatMap((r) => (r.customPizzaId ? [r.customPizzaId] : []));
  if (customIds.length) await tx.customPizza.deleteMany({ where: { id: { in: customIds } } });
}

export const cartService = {
  /** Cart with server prices. Lines no longer available are flagged, not dropped. */
  async get(user: SessionUser, deliveryMode: 'standard' | 'express' | 'pickup' = 'standard') {
    const cart = await ensureCart(user.id);
    const rows = await prisma.cartItem.findMany({ where: { cartId: cart.id }, include: itemInclude, orderBy: { createdAt: 'asc' } });

    const items: (CartItem & { available: boolean; reason?: string })[] = [];
    const valid: CartLineInput[] = [];
    for (const row of rows) {
      const line = toLine(row);
      try {
        const q = await quoteCart({ items: [line], deliveryMode });
        const l = q.lines[0];
        valid.push(line);
        items.push({
          id: row.id,
          pizzaId: l.pizzaId ?? undefined,
          name: l.name,
          image: l.imageUrl ?? undefined,
          size: l.size,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          removedIngredients: l.removedIngredients.length ? l.removedIngredients : undefined,
          note: l.note ?? undefined,
          custom: line.custom,
          available: q.shortages.length === 0,
          reason: q.shortages.length ? `Rupture : ${q.shortages.join(', ')}` : undefined,
        });
      } catch (error) {
        items.push({ id: row.id, pizzaId: line.pizzaId, name: line.name ?? 'Article', size: line.size, quantity: line.quantity, unitPrice: 0, custom: line.custom, available: false, reason: (error as Error).message });
      }
    }
    const totals = valid.length ? publicQuote(await quoteCart({ items: valid, deliveryMode, promoCode: cart.promoCode }, { userId: user.id, email: user.email })) : null;
    return { items, promoCode: cart.promoCode, totals };
  },

  /** Replaces the whole cart (used to sync the local cart after each change). */
  async replace(user: SessionUser, lines: CartLineInput[], promoCode?: string | null) {
    // Validate every line against the catalog before writing.
    if (lines.length) await quoteCart({ items: lines, deliveryMode: 'standard' });
    const cart = await ensureCart(user.id);
    await prisma.$transaction(async (tx) => {
      await clearItems(tx, cart.id);
      for (const line of lines) await createItem(tx, cart.id, user.id, line);
      if (promoCode !== undefined) await tx.cart.update({ where: { id: cart.id }, data: { promoCode } });
    });
    return this.get(user);
  },

  /** Adds lines to the existing cart (guest cart merged at login). */
  async merge(user: SessionUser, lines: CartLineInput[]) {
    const current = await this.get(user);
    const existing = await prisma.cartItem.findMany({ where: { cart: { userId: user.id } }, include: itemInclude });
    const merged = [...existing.map(toLine), ...lines];
    if (!lines.length) return current;
    return this.replace(user, merged.slice(0, 30));
  },

  async addItem(user: SessionUser, line: CartLineInput) {
    await quoteCart({ items: [line], deliveryMode: 'standard' });
    const cart = await ensureCart(user.id);
    await prisma.$transaction((tx) => createItem(tx, cart.id, user.id, line));
    return this.get(user);
  },

  async updateItem(user: SessionUser, itemId: string, patch: { quantity?: number; size?: 'small' | 'medium' | 'large'; note?: string | null; removedIngredients?: string[] }) {
    const item = await prisma.cartItem.findFirst({ where: { id: itemId, cart: { userId: user.id } } });
    if (!item) throw notFound(msg().cartItemNotFound);
    await prisma.cartItem.update({
      where: { id: itemId },
      data: {
        ...(patch.quantity !== undefined ? { quantity: patch.quantity } : {}),
        ...(patch.size ? { size: toDbSize(patch.size) } : {}),
        ...(patch.note !== undefined ? { note: patch.note } : {}),
        ...(patch.removedIngredients ? { removedIngredients: patch.removedIngredients } : {}),
      },
    });
    return this.get(user);
  },

  async removeItem(user: SessionUser, itemId: string) {
    const cart = await ensureCart(user.id);
    const { count } = await prisma.cartItem.count({ where: { id: itemId, cartId: cart.id } }).then((count) => ({ count }));
    if (!count) throw notFound(msg().cartItemNotFound);
    await prisma.$transaction((tx) => clearItems(tx, cart.id, { id: itemId }));
    return this.get(user);
  },

  async clear(user: SessionUser) {
    const cart = await ensureCart(user.id);
    await prisma.$transaction(async (tx) => {
      await clearItems(tx, cart.id);
      await tx.cart.update({ where: { id: cart.id }, data: { promoCode: null } });
    });
    return this.get(user);
  },
};
