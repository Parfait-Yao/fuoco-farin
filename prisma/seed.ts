/**
 * Idempotent seed: catalog (categories, ingredients, pizzas), promotions and
 * restaurant settings, in US dollars (cents) with French and English texts.
 * Safe to run several times (upserts by unique keys, existing rows are never
 * overwritten). An existing FCFA database is converted by `pnpm db:usd`.
 * No orders, customers or reviews: those come from real usage.
 *
 *   pnpm db:seed
 */
import { IngredientKind, PrismaClient, StockUnit } from '@prisma/client';
import { categoriesMock, ingredientsMock, pizzasMock, promotionsMock, settingsSeed, toppingNames } from '../src/mocks/catalog';
import { slugify, stockLinksFor } from '../src/server/domain/stockLinks';

const prisma = new PrismaClient();

const KIND: Record<string, IngredientKind> = { base: 'BASE', sauce: 'SAUCE', cheese: 'CHEESE', veggie: 'VEGETABLE' };
const UNIT: Record<string, StockUnit> = { kg: 'KG', g: 'G', L: 'L', 'pièces': 'PIECE' };
/** Default consumption per medium pizza, in the ingredient unit. */
const USAGE: Record<IngredientKind, number> = { BASE: 0.25, SAUCE: 0.08, CHEESE: 0.12, VEGETABLE: 0.05, TOPPING: 0 };

const DAY = 86_400_000;
const daysFromNow = (d: number) => new Date(Date.now() + d * DAY);


async function seedSettings() {
  await prisma.restaurantSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, ...settingsSeed } });
}

async function seedCategories() {
  const ids = new Map<string, string>();
  for (const c of categoriesMock) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { name: c.name.fr, nameEn: c.name.en, slug: c.slug, description: c.description.fr, descriptionEn: c.description.en, imageUrl: c.image, sortOrder: c.order, active: true },
    });
    ids.set(c.id, row.id);
  }
  return ids;
}

async function seedIngredients() {
  for (const [index, i] of ingredientsMock.entries()) {
    const kind = KIND[i.type];
    const trackStock = i.id !== 'cheese-none';
    await prisma.ingredient.upsert({
      where: { code: i.id },
      update: {},
      create: {
        code: i.id,
        kind,
        name: i.name.fr,
        nameEn: i.name.en,
        description: i.description.fr,
        descriptionEn: i.description.en,
        price: i.price,
        color: i.color,
        unit: UNIT[i.unit] ?? 'KG',
        stock: trackStock ? i.stock : 0,
        threshold: i.threshold,
        usagePerPizza: trackStock ? USAGE[kind] : 0,
        trackStock,
        sortOrder: index,
      },
    });
  }
}

async function seedPizzas(categoryIds: Map<string, string>) {
  const names = Array.from(new Set(pizzasMock.flatMap((p) => p.ingredients)));
  const toppingIds = new Map<string, string>();
  for (const [index, name] of names.entries()) {
    const code = `top-${slugify(name)}`;
    const row = await prisma.ingredient.upsert({
      where: { code },
      update: {},
      create: { code, kind: 'TOPPING', name, nameEn: toppingNames[name] ?? '', trackStock: false, sortOrder: index },
    });
    toppingIds.set(name, row.id);
  }

  // Stock items consumed by each recipe (default base + matching toppings).
  const stock = await prisma.ingredient.findMany({ where: { trackStock: true, kind: { not: 'TOPPING' } }, select: { id: true, code: true, name: true, kind: true } });

  for (const p of pizzasMock) {
    const categoryId = categoryIds.get(p.categoryId);
    if (!categoryId) throw new Error(`Unknown category ${p.categoryId} for ${p.slug}`);
    const exists = await prisma.pizza.findUnique({ where: { slug: p.slug }, select: { id: true } });
    if (exists) continue;
    await prisma.pizza.create({
      data: {
        slug: p.slug,
        name: p.name.fr,
        nameEn: p.name.en,
        description: p.description.fr,
        descriptionEn: p.description.en,
        longDescription: p.longDescription.fr,
        longDescriptionEn: p.longDescription.en,
        categoryId,
        imageUrl: p.image,
        price: p.price,
        oldPrice: p.oldPrice ?? null,
        prepMinutes: p.prepMinutes,
        calories: p.calories,
        isPopular: Boolean(p.isPopular),
        isNew: Boolean(p.isNew),
        isVegetarian: Boolean(p.isVegetarian),
        isSpicy: Boolean(p.isSpicy),
        active: true,
        ingredients: {
          create: [
            ...p.ingredients.map((name, position) => ({ ingredientId: toppingIds.get(name)!, position })),
            ...stockLinksFor(p.ingredients, stock).map((ingredientId, i) => ({ ingredientId, position: 100 + i, removable: false })),
          ],
        },
      },
    });
  }
}

async function seedPromotions() {
  for (const p of promotionsMock) {
    await prisma.promotion.upsert({
      where: { code: p.code },
      update: {},
      create: {
        code: p.code,
        label: p.label.fr,
        labelEn: p.label.en,
        kind: p.kind,
        value: p.value,
        minOrder: p.minOrder,
        startsAt: daysFromNow(-1),
        endsAt: daysFromNow(p.days),
        maxUsesPerUser: p.maxUsesPerUser ?? null,
      },
    });
  }
}

async function main() {
  await seedSettings();
  const categoryIds = await seedCategories();
  await seedIngredients();
  await seedPizzas(categoryIds);
  await seedPromotions();
  const [categories, pizzas, ingredients, promotions] = await Promise.all([
    prisma.category.count(),
    prisma.pizza.count(),
    prisma.ingredient.count(),
    prisma.promotion.count(),
  ]);
  console.log(`Seed OK: ${categories} categories, ${pizzas} pizzas, ${ingredients} ingredients, ${promotions} promotions.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
