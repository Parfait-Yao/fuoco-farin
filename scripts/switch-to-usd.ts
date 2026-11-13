/**
 * One-time switch of an existing database from FCFA to US dollars (cents),
 * plus the English catalog texts. Run after `pnpm db:deploy` (migration 0005).
 *
 *   pnpm db:usd            dry run: prints what would change
 *   pnpm db:usd --apply    writes the changes in one transaction
 *
 * - Seed rows (matched by slug / code) get the dollar prices and English texts of src/mocks/catalog.ts.
 * - Other amounts (admin-created products, promotions, past orders and payments)
 *   are converted at RATE FCFA per dollar.
 * - Settings get the dollar delivery fees and currency "USD".
 * Idempotent: does nothing once settings.currency is "USD".
 */
import { PrismaClient, type Prisma } from '@prisma/client';
import { loadEnvConfig } from '@next/env';
import { categoriesMock, ingredientsMock, pizzasMock, promotionsMock, settingsSeed, toppingNames } from '../src/mocks/catalog';
import { slugify } from '../src/server/domain/stockLinks';

loadEnvConfig(process.cwd());

/** FCFA per US dollar used for amounts that have no seed price. */
const RATE = 600;
const toCents = (fcfa: number) => Math.round((fcfa / RATE) * 100);
/** Menu prices end in .00 or .50. */
const toMenuCents = (fcfa: number) => Math.max(50, Math.round(toCents(fcfa) / 50) * 50);

const apply = process.argv.includes('--apply');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.restaurantSettings.findUnique({ where: { id: 1 } });
  if (settings?.currency === 'USD') {
    console.log('Already in USD: nothing to do.');
    return;
  }

  const seedPizzas = new Map(pizzasMock.map((p) => [p.slug, p]));
  const seedCategories = new Map(categoriesMock.map((c) => [c.slug, c]));
  const seedIngredients = new Map(ingredientsMock.map((i) => [i.id, i]));
  const seedPromos = new Map(promotionsMock.map((p) => [p.code, p]));
  const seedToppings = new Map(Object.entries(toppingNames).map(([fr, en]) => [`top-${slugify(fr)}`, en]));

  const [pizzas, categories, ingredients, promotions, orders, items, payments] = await Promise.all([
    prisma.pizza.findMany({ select: { id: true, slug: true, price: true, oldPrice: true } }),
    prisma.category.findMany({ select: { id: true, slug: true } }),
    prisma.ingredient.findMany({ select: { id: true, code: true, price: true } }),
    prisma.promotion.findMany({ select: { id: true, code: true, kind: true, value: true, minOrder: true, maxDiscount: true } }),
    prisma.order.findMany({ select: { id: true, subtotal: true, deliveryFee: true, discount: true, total: true } }),
    prisma.orderItem.findMany({ select: { id: true, orderId: true, quantity: true, unitPrice: true } }),
    prisma.payment.findMany({ select: { id: true, amount: true } }),
  ]);

  const ops: Prisma.PrismaPromise<unknown>[] = [];
  for (const p of pizzas) {
    const seed = seedPizzas.get(p.slug);
    ops.push(
      prisma.pizza.update({
        where: { id: p.id },
        data: seed
          ? { price: seed.price, oldPrice: seed.oldPrice ?? null, nameEn: seed.name.en, descriptionEn: seed.description.en, longDescriptionEn: seed.longDescription.en }
          : { price: toMenuCents(p.price), oldPrice: p.oldPrice === null ? null : toMenuCents(p.oldPrice) },
      }),
    );
  }
  for (const c of categories) {
    const seed = seedCategories.get(c.slug);
    if (seed) ops.push(prisma.category.update({ where: { id: c.id }, data: { nameEn: seed.name.en, descriptionEn: seed.description.en } }));
  }
  for (const i of ingredients) {
    const seed = seedIngredients.get(i.code);
    const topping = seedToppings.get(i.code);
    const data = seed
      ? { price: seed.price, nameEn: seed.name.en, descriptionEn: seed.description.en }
      : { price: toCents(i.price), ...(topping ? { nameEn: topping } : {}) };
    ops.push(prisma.ingredient.update({ where: { id: i.id }, data }));
  }
  for (const p of promotions) {
    const seed = seedPromos.get(p.code);
    if (seed) {
      ops.push(prisma.promotion.update({ where: { id: p.id }, data: { label: seed.label.fr, labelEn: seed.label.en, value: seed.value, minOrder: seed.minOrder, maxDiscount: null } }));
    } else {
      ops.push(
        prisma.promotion.update({
          where: { id: p.id },
          data: {
            value: p.kind === 'FIXED' ? toCents(p.value) : p.value,
            minOrder: toCents(p.minOrder),
            maxDiscount: p.maxDiscount === null ? null : toCents(p.maxDiscount),
          },
        }),
      );
    }
  }
  // The old FCFA promotion label: replaced by FUOCO5 in the seed.
  ops.push(prisma.promotion.updateMany({ where: { code: 'FUOCO2000' }, data: { active: false } }));
  // Converted amounts must keep the DB checks true: lineTotal = unitPrice * quantity
  // and total = subtotal + deliveryFee - discount, so totals are recomputed, not rounded.
  const subtotals = new Map<string, number>();
  for (const i of items) {
    const unitPrice = toCents(i.unitPrice);
    const lineTotal = unitPrice * i.quantity;
    subtotals.set(i.orderId, (subtotals.get(i.orderId) ?? 0) + lineTotal);
    ops.push(prisma.orderItem.update({ where: { id: i.id }, data: { unitPrice, lineTotal } }));
  }
  for (const o of orders) {
    const subtotal = subtotals.get(o.id) ?? toCents(o.subtotal);
    const deliveryFee = toCents(o.deliveryFee);
    const discount = Math.min(toCents(o.discount), subtotal + deliveryFee);
    ops.push(prisma.order.update({ where: { id: o.id }, data: { subtotal, deliveryFee, discount, total: subtotal + deliveryFee - discount } }));
  }
  for (const p of payments) ops.push(prisma.payment.update({ where: { id: p.id }, data: { amount: toCents(p.amount), currency: 'usd' } }));
  ops.push(
    prisma.restaurantSettings.upsert({
      where: { id: 1 },
      update: {
        currency: 'USD',
        deliveryFee: settingsSeed.deliveryFee,
        expressFee: settingsSeed.expressFee,
        freeDeliveryFrom: settingsSeed.freeDeliveryFrom,
        sloganEn: settingsSeed.sloganEn,
        openingHoursEn: settingsSeed.openingHoursEn,
      },
      create: { id: 1, ...settingsSeed },
    }),
  );

  console.log(
    `${apply ? 'Applying' : 'Dry run'}: ${pizzas.length} pizzas (${pizzas.filter((p) => seedPizzas.has(p.slug)).length} from the seed), ${categories.length} categories, ` +
      `${ingredients.length} ingredients, ${promotions.length} promotions, ${orders.length} orders, ${items.length} order lines, ${payments.length} payments converted at ${RATE} FCFA = $1.`,
  );
  if (!apply) {
    console.log('Nothing written. Run with --apply to convert.');
    return;
  }
  await prisma.$transaction(ops);
  console.log('Done: amounts are now in US cents.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
