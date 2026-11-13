import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getLocale, getMessages, pickLocalized } from '@/i18n/server';
import type { CartLineInput } from '../validations/order';
import { badRequest } from '../http/errors';
import { addNeed, customPizzaMediumPrice, deliveryFee, evaluatePromo, sizePrice, stockNeed, type PricedComponent } from '../domain/pricing';
import type { CustomConfigSnapshot } from '../mappers';

type Db = Prisma.TransactionClient | typeof prisma;

export interface QuotedLine {
  index: number;
  pizzaId: string | null;
  name: string;
  imageUrl: string | null;
  categoryName: string | null;
  size: 'small' | 'medium' | 'large';
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  removedIngredients: string[];
  note: string | null;
  customConfig: CustomConfigSnapshot | null;
}

export interface Quote {
  lines: QuotedLine[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  promo: { id: string; code: string; label: string } | null;
  promoError: string | null;
  /** ingredientId to quantity, in the ingredient unit. */
  needs: Map<string, number>;
  /** Ingredients short for this cart (name list), empty when everything is available. */
  shortages: string[];
}

/**
 * Prices a cart from the database. Prices sent by the browser are never read:
 * the input schema has no price field at all.
 */
export async function quoteCart(
  input: { items: CartLineInput[]; deliveryMode: 'standard' | 'express' | 'pickup'; promoCode?: string | null },
  customer: { userId?: string | null; email?: string | null } = {},
  db: Db = prisma,
): Promise<Quote> {
  const pizzaIds = Array.from(new Set(input.items.flatMap((l) => (l.pizzaId ? [l.pizzaId] : []))));
  const componentIds = Array.from(new Set(input.items.flatMap((l) => (l.custom ? [l.custom.baseId, l.custom.sauceId, l.custom.cheeseId, ...l.custom.veggieIds] : []))));

  const [pizzas, components, settings] = await Promise.all([
    db.pizza.findMany({ where: { id: { in: pizzaIds } }, include: { category: true, ingredients: { include: { ingredient: true } } } }),
    db.ingredient.findMany({ where: { id: { in: componentIds } } }),
    db.restaurantSettings.findUnique({ where: { id: 1 } }),
  ]);
  const pizzaById = new Map(pizzas.map((p) => [p.id, p]));
  const componentRows = new Map(components.map((c) => [c.id, c]));
  const priced = new Map<string, PricedComponent>(components.map((c) => [c.id, { id: c.id, name: c.name, kind: c.kind, price: c.price, active: c.active, deleted: Boolean(c.deletedAt) }]));

  const locale = getLocale();
  const msg = getMessages('api', locale);
  const needs = new Map<string, number>();
  const lines: QuotedLine[] = input.items.map((line, index) => {
    if (line.pizzaId) {
      const pizza = pizzaById.get(line.pizzaId);
      if (!pizza || pizza.deletedAt || !pizza.active || !pizza.category.active || pizza.category.deletedAt) {
        throw badRequest(msg.pizzaUnavailable(pizza ? pickLocalized(pizza.name, pizza.nameEn, locale) : (line.name ?? msg.aPizza)), { index });
      }
      const unitPrice = sizePrice(pizza.price, line.size);
      for (const pi of pizza.ingredients) {
        if (pi.ingredient.trackStock && !pi.ingredient.deletedAt) addNeed(needs, pi.ingredientId, stockNeed(Number(pi.ingredient.usagePerPizza), line.size, line.quantity));
      }
      // Only toppings of this recipe can be removed (named in either language).
      const toppings = new Set(pizza.ingredients.filter((pi) => pi.ingredient.kind === 'TOPPING').flatMap((pi) => [pi.ingredient.name, pi.ingredient.nameEn].filter(Boolean)));
      const removed = line.removedIngredients.filter((r) => toppings.has(r));
      return {
        index,
        pizzaId: pizza.id,
        // Snapshot in the customer's language.
        name: pickLocalized(pizza.name, pizza.nameEn, locale),
        imageUrl: pizza.imageUrl,
        categoryName: pizza.category.name,
        size: line.size,
        quantity: line.quantity,
        unitPrice,
        lineTotal: unitPrice * line.quantity,
        removedIngredients: removed,
        note: line.note ?? null,
        customConfig: null,
      };
    }

    const custom = line.custom!;
    let result;
    try {
      result = customPizzaMediumPrice(custom, priced, msg);
    } catch (error) {
      throw badRequest((error as Error).message, { index });
    }
    const unitPrice = sizePrice(result.price, line.size);
    for (const part of result.parts) {
      const row = componentRows.get(part.id)!;
      if (row.trackStock) addNeed(needs, row.id, stockNeed(Number(row.usagePerPizza), line.size, line.quantity));
    }
    return {
      index,
      pizzaId: null,
      name: line.name?.trim() || msg.customPizza,
      imageUrl: null,
      // Stats group by this stored (French) label; statsService translates it.
      categoryName: getMessages('api', 'fr').customPizzas,
      size: line.size,
      quantity: line.quantity,
      unitPrice,
      lineTotal: unitPrice * line.quantity,
      removedIngredients: [],
      note: line.note ?? null,
      customConfig: {
        ...custom,
        components: result.parts.map((p) => ({ id: p.id, kind: p.kind, name: p.name, price: p.price, quantity: 1 })),
      },
    };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);

  let promo: Quote['promo'] = null;
  let promoError: string | null = null;
  let discount = 0;
  if (input.promoCode) {
    const row = await db.promotion.findUnique({ where: { code: input.promoCode.toUpperCase() } });
    let uses = 0;
    if (row?.maxUsesPerUser && (customer.userId || customer.email)) {
      uses = await db.order.count({
        where: {
          promotionId: row.id,
          status: { not: 'CANCELLED' },
          OR: [...(customer.userId ? [{ userId: customer.userId }] : []), ...(customer.email ? [{ customerEmail: customer.email.toLowerCase() }] : [])],
        },
      });
    }
    const check = evaluatePromo(row && { ...row, deleted: Boolean(row.deletedAt) }, subtotal, new Date(), uses, row?.maxUsesPerUser ?? null, locale);
    if (check.ok && row) {
      discount = check.discount;
      promo = { id: row.id, code: row.code, label: pickLocalized(row.label, row.labelEn, locale) };
    } else if (!check.ok) {
      promoError = check.reason;
    }
  }

  const fee = deliveryFee(input.deliveryMode, subtotal, settings ?? { deliveryFee: 399, expressFee: 699, freeDeliveryFrom: 3500 });

  // Availability preview (the real guarantee is the conditional UPDATE at order time).
  const stockRows = needs.size ? await db.ingredient.findMany({ where: { id: { in: Array.from(needs.keys()) } }, select: { id: true, name: true, nameEn: true, stock: true } }) : [];
  const shortages = stockRows.filter((s) => Number(s.stock) < (needs.get(s.id) ?? 0)).map((s) => pickLocalized(s.name, s.nameEn, locale));

  return { lines, subtotal, deliveryFee: fee, discount, total: subtotal + fee - discount, promo, promoError, needs, shortages };
}

/** JSON-safe view of a quote for the API. */
export function publicQuote(q: Quote) {
  return {
    lines: q.lines.map((l) => ({ index: l.index, pizzaId: l.pizzaId, name: l.name, size: l.size, sizeLabel: getMessages('domain').sizes[l.size].label, quantity: l.quantity, unitPrice: l.unitPrice, lineTotal: l.lineTotal })),
    subtotal: q.subtotal,
    deliveryFee: q.deliveryFee,
    discount: q.discount,
    total: q.total,
    promo: q.promo,
    promoError: q.promoError,
    available: q.shortages.length === 0,
    shortages: q.shortages,
  };
}
