import 'server-only';
import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { catalogRepository, pizzaInclude } from '../repositories/catalogRepository';
import { toCategory, toIngredient, toPizza, toPromotion, toReview } from '../mappers';
import { conflict, notFound } from '../http/errors';
import { slugify, stockLinksFor } from '../domain/stockLinks';
import { toDbIngredientKind, toDbStockUnit } from '../enums';
import type { categorySchema, ingredientSchema, pizzaListQuery, pizzaSchema } from '../validations/catalog';
import { storageService } from './storageService';
import { settingsService } from './settingsService';
import { activityService } from './notificationService';
import { getMessages } from '@/i18n/server';

/** API messages in the request language. */
const msg = () => getMessages('api');

type PizzaInput = z.infer<typeof pizzaSchema>;
type CategoryInput = z.infer<typeof categorySchema>;
type IngredientInput = z.infer<typeof ingredientSchema>;

async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>) {
  const root = base || 'item';
  let slug = root;
  for (let i = 2; await exists(slug); i += 1) slug = `${root}-${i}`;
  return slug;
}

/** Recipe toppings become TOPPING ingredients (created on first use). */
async function toppingIds(tx: Prisma.TransactionClient, names: string[]) {
  const ids: string[] = [];
  for (const name of names) {
    const code = `top-${slugify(name)}`;
    const row = await tx.ingredient.upsert({ where: { code }, update: { deletedAt: null }, create: { code, kind: 'TOPPING', name: name.trim(), trackStock: false } });
    ids.push(row.id);
  }
  return Array.from(new Set(ids));
}

async function pizzaIngredientRows(tx: Prisma.TransactionClient, names: string[]) {
  const toppings = await toppingIds(tx, names);
  const stock = await tx.ingredient.findMany({ where: { deletedAt: null, trackStock: true, kind: { not: 'TOPPING' } }, select: { id: true, code: true, name: true, kind: true } });
  const stockIds = stockLinksFor(names, stock).filter((id) => !toppings.includes(id));
  return [
    ...toppings.map((ingredientId, position) => ({ ingredientId, position })),
    ...stockIds.map((ingredientId, i) => ({ ingredientId, position: 100 + i, removable: false })),
  ];
}

const SORTS: Record<z.infer<typeof pizzaListQuery>['sort'], Prisma.PizzaOrderByWithRelationInput[]> = {
  popular: [{ isPopular: 'desc' }, { reviewCount: 'desc' }, { name: 'asc' }],
  'price-asc': [{ price: 'asc' }, { name: 'asc' }],
  'price-desc': [{ price: 'desc' }, { name: 'asc' }],
  rating: [{ ratingAvg: 'desc' }, { reviewCount: 'desc' }],
  newest: [{ createdAt: 'desc' }],
  name: [{ name: 'asc' }],
};

export const catalogService = {
  /** Everything the public pages need in one call (menu, builder, home). */
  async publicCatalog() {
    const now = new Date();
    const [pizzas, categories, ingredients, settings, reviews, promotions, stats] = await Promise.all([
      catalogRepository.findPizzas(catalogRepository.visiblePizzaWhere, SORTS.popular),
      catalogRepository.findCategories(false),
      catalogRepository.findBuilderIngredients(false),
      settingsService.get(),
      prisma.review.findMany({ where: { published: true }, include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } }, orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.promotion.findMany({ where: { active: true, deletedAt: null, startsAt: { lte: now }, endsAt: { gte: now } }, orderBy: { endsAt: 'asc' } }),
      this.publicStats(),
    ]);
    return {
      pizzas: pizzas.map(toPizza),
      categories: categories.map(toCategory),
      // Stock levels are internal: the public builder only needs availability.
      ingredients: ingredients.map((i) => ({ ...toIngredient(i), stock: Number(i.stock) > 0 || !i.trackStock ? 1 : 0, threshold: 0 })),
      settings,
      reviews: reviews.map(toReview),
      // Public promotions: banner info only (no usage counters).
      promotions: promotions.map((p) => ({ ...toPromotion(p), usageCount: 0, maxUses: undefined, maxUsesPerUser: undefined })),
      stats,
    };
  },

  /** Real figures for the home page (no invented marketing numbers). */
  async publicStats() {
    const [[delivered], [rating], [timing]] = await Promise.all([
      prisma.$queryRaw<{ pizzas: bigint | null; districts: bigint }[]>`
        SELECT SUM(i."quantity") AS pizzas, COUNT(DISTINCT o."district") FILTER (WHERE o."deliveryMode" <> 'PICKUP') AS districts
        FROM "orders" o JOIN "order_items" i ON i."orderId" = o."id" WHERE o."status" = 'DELIVERED'`,
      prisma.$queryRaw<{ avg: number | null }[]>`SELECT AVG("rating")::float AS avg FROM "reviews" WHERE "published"`,
      prisma.$queryRaw<{ minutes: number | null }[]>`
        SELECT AVG(EXTRACT(EPOCH FROM ("deliveredAt" - "createdAt")) / 60)::float AS minutes
        FROM "orders" WHERE "status" = 'DELIVERED' AND "deliveredAt" IS NOT NULL AND "deliveryMode" <> 'PICKUP'`,
    ]);
    return {
      deliveredPizzas: Number(delivered?.pizzas ?? 0),
      averageRating: rating?.avg ? Math.round(rating.avg * 10) / 10 : 0,
      averageDeliveryMinutes: timing?.minutes ? Math.round(timing.minutes) : 0,
      districts: Number(delivered?.districts ?? 0),
    };
  },

  /** Search, filter, sort and paginate the public menu. */
  async listPizzas(query: z.infer<typeof pizzaListQuery>) {
    const where: Prisma.PizzaWhereInput = { ...catalogRepository.visiblePizzaWhere };
    const and: Prisma.PizzaWhereInput[] = [];
    if (query.q) {
      and.push({
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          { nameEn: { contains: query.q, mode: 'insensitive' } },
          { description: { contains: query.q, mode: 'insensitive' } },
          { descriptionEn: { contains: query.q, mode: 'insensitive' } },
          { ingredients: { some: { ingredient: { name: { contains: query.q, mode: 'insensitive' } } } } },
          { ingredients: { some: { ingredient: { nameEn: { contains: query.q, mode: 'insensitive' } } } } },
        ],
      });
    }
    if (query.category) and.push({ category: { slug: query.category } });
    if (query.vegetarian) and.push({ isVegetarian: query.vegetarian === 'true' });
    if (query.spicy) and.push({ isSpicy: query.spicy === 'true' });
    if (query.minPrice !== undefined || query.maxPrice !== undefined) and.push({ price: { gte: query.minPrice, lte: query.maxPrice } });
    if (and.length) where.AND = and;

    const [total, rows] = await Promise.all([
      catalogRepository.countPizzas(where),
      catalogRepository.findPizzas(where, SORTS[query.sort], (query.page - 1) * query.pageSize, query.pageSize),
    ]);
    return { items: rows.map(toPizza), total, page: query.page, pageSize: query.pageSize, pageCount: Math.ceil(total / query.pageSize) };
  },

  async getPizza(idOrSlug: string) {
    const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug);
    const pizza = await prisma.pizza.findFirst({ where: { ...catalogRepository.visiblePizzaWhere, ...(isUuid ? { id: idOrSlug } : { slug: idOrSlug }) }, include: pizzaInclude });
    if (!pizza) throw notFound(msg().pizzaNotFound);
    const reviews = await prisma.review.findMany({ where: { pizzaId: pizza.id, published: true }, include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } }, orderBy: { createdAt: 'desc' }, take: 50 });
    return { pizza: toPizza(pizza), reviews: reviews.map(toReview) };
  },

  /* ─────────── Admin ─────────── */

  async adminCatalog() {
    const [pizzas, categories, ingredients] = await Promise.all([
      catalogRepository.findPizzas({ deletedAt: null }, [{ createdAt: 'desc' }]),
      catalogRepository.findCategories(true),
      catalogRepository.findBuilderIngredients(true),
    ]);
    return { pizzas: pizzas.map(toPizza), categories: categories.map(toCategory), ingredients: ingredients.map(toIngredient) };
  },

  async savePizza(input: PizzaInput, actorId: string, id?: string) {
    const category = await prisma.category.findFirst({ where: { id: input.categoryId, deletedAt: null } });
    if (!category) throw notFound(msg().categoryNotFound);
    const existing = id ? await prisma.pizza.findFirst({ where: { id, deletedAt: null } }) : null;
    if (id && !existing) throw notFound(msg().pizzaNotFound);

    const imageKey = await storageService.assertImage(input.image, 'products');
    const data = {
      name: input.name,
      nameEn: input.nameEn,
      description: input.description,
      descriptionEn: input.descriptionEn,
      longDescription: input.longDescription || input.description,
      longDescriptionEn: input.longDescriptionEn || input.descriptionEn,
      categoryId: input.categoryId,
      price: input.price,
      oldPrice: input.oldPrice ?? null,
      imageUrl: input.image,
      imageKey,
      prepMinutes: input.prepMinutes,
      calories: input.calories,
      isPopular: input.isPopular,
      isNew: input.isNew,
      isVegetarian: input.isVegetarian,
      isSpicy: input.isSpicy,
      active: input.active,
    };

    const saved = await prisma.$transaction(async (tx) => {
      const rows = await pizzaIngredientRows(tx, input.ingredients);
      if (existing) {
        await tx.pizzaIngredient.deleteMany({ where: { pizzaId: existing.id } });
        return tx.pizza.update({ where: { id: existing.id }, data: { ...data, ingredients: { create: rows } }, include: pizzaInclude });
      }
      const slug = await uniqueSlug(slugify(input.name), async (s) => Boolean(await tx.pizza.findUnique({ where: { slug: s }, select: { id: true } })));
      return tx.pizza.create({ data: { ...data, slug, ingredients: { create: rows } }, include: pizzaInclude });
    });

    // Replaced image: delete the old file after the commit.
    if (existing?.imageKey && existing.imageKey !== imageKey) await storageService.remove(existing.imageKey);
    await activityService.log('CATALOG', { key: 'productSaved', params: { name: saved.name, created: !existing } }, actorId);
    return toPizza(saved);
  },

  async setPizzaActive(id: string, active: boolean, actorId: string) {
    const pizza = await prisma.pizza.update({ where: { id, deletedAt: null }, data: { active }, include: pizzaInclude });
    await activityService.log('CATALOG', { key: 'productToggled', params: { name: pizza.name, active } }, actorId);
    return toPizza(pizza);
  },

  /** Soft delete: past orders, reviews and favorites keep their reference. */
  async deletePizza(id: string, actorId: string) {
    const pizza = await prisma.pizza.findFirst({ where: { id, deletedAt: null } });
    if (!pizza) throw notFound(msg().pizzaNotFound);
    await prisma.$transaction([
      prisma.pizza.update({ where: { id }, data: { deletedAt: new Date(), active: false, slug: `${pizza.slug}-supprimee-${id.slice(0, 8)}` } }),
      prisma.cartItem.deleteMany({ where: { pizzaId: id } }),
      prisma.favorite.deleteMany({ where: { pizzaId: id } }),
    ]);
    await activityService.log('CATALOG', { key: 'productDeleted', params: { name: pizza.name } }, actorId);
  },

  async saveCategory(input: CategoryInput, actorId: string, id?: string) {
    const existing = id ? await prisma.category.findFirst({ where: { id, deletedAt: null } }) : null;
    if (id && !existing) throw notFound(msg().categoryNotFound);
    const duplicate = await prisma.category.findFirst({ where: { deletedAt: null, name: { equals: input.name, mode: 'insensitive' }, ...(id ? { NOT: { id } } : {}) } });
    if (duplicate) throw conflict(msg().categoryNameTaken);

    const imageKey = await storageService.assertImage(input.image, 'categories');
    const data = { name: input.name, nameEn: input.nameEn, description: input.description, descriptionEn: input.descriptionEn, imageUrl: input.image, imageKey, active: input.active };
    let row;
    if (existing) {
      row = await prisma.category.update({ where: { id: existing.id }, data });
      if (existing.imageKey && existing.imageKey !== imageKey) await storageService.remove(existing.imageKey);
    } else {
      const slug = await uniqueSlug(slugify(input.name), async (s) => Boolean(await prisma.category.findUnique({ where: { slug: s }, select: { id: true } })));
      const last = await prisma.category.aggregate({ _max: { sortOrder: true }, where: { deletedAt: null } });
      row = await prisma.category.create({ data: { ...data, slug, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
    }
    await activityService.log('CATALOG', { key: 'categorySaved', params: { name: row.name, created: !existing } }, actorId);
    return toCategory(row);
  },

  async moveCategory(id: string, direction: -1 | 1) {
    return prisma.$transaction(async (tx) => {
      const list = await tx.category.findMany({ where: { deletedAt: null }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
      const index = list.findIndex((c) => c.id === id);
      if (index < 0) throw notFound(msg().categoryNotFound);
      const target = index + direction;
      if (target >= 0 && target < list.length) [list[index], list[target]] = [list[target], list[index]];
      await Promise.all(list.map((c, i) => tx.category.update({ where: { id: c.id }, data: { sortOrder: i + 1 } })));
      return list.map((c, i) => toCategory({ ...c, sortOrder: i + 1 }));
    });
  },

  async deleteCategory(id: string, actorId: string) {
    const category = await prisma.category.findFirst({ where: { id, deletedAt: null }, include: { _count: { select: { pizzas: { where: { deletedAt: null } } } } } });
    if (!category) throw notFound(msg().categoryNotFound);
    if (category._count.pizzas > 0) throw conflict(msg().categoryNotEmpty(category._count.pizzas));
    await prisma.category.update({ where: { id }, data: { deletedAt: new Date(), active: false, slug: `${category.slug}-supprimee-${id.slice(0, 8)}` } });
    await storageService.remove(category.imageKey);
    await activityService.log('CATALOG', { key: 'categoryDeleted', params: { name: category.name } }, actorId);
  },

  async saveIngredient(input: IngredientInput, actorId: string, id?: string) {
    const kind = toDbIngredientKind(input.type);
    const data = {
      kind,
      name: input.name,
      nameEn: input.nameEn,
      description: input.description,
      descriptionEn: input.descriptionEn,
      price: input.price,
      color: input.color,
      unit: toDbStockUnit(input.unit),
      threshold: input.threshold,
      active: input.active,
    };
    if (id) {
      const existing = await prisma.ingredient.findFirst({ where: { id, deletedAt: null, kind: { not: 'TOPPING' } } });
      if (!existing) throw notFound(msg().ingredientNotFound);
      const row = await prisma.ingredient.update({ where: { id }, data });
      await activityService.log('CATALOG', { key: 'ingredientSaved', params: { name: row.name, created: false } }, actorId);
      return toIngredient(row);
    }
    const initial = input.stock ?? 0;
    const usage = { BASE: 0.25, SAUCE: 0.08, CHEESE: 0.12, VEGETABLE: 0.05 }[kind];
    const row = await prisma.$transaction(async (tx) => {
      const created = await tx.ingredient.create({
        data: { ...data, code: `${input.type}-${slugify(input.name)}-${crypto.randomUUID().slice(0, 6)}`, stock: initial, usagePerPizza: usage, trackStock: true },
      });
      if (initial > 0) await tx.stockMovement.create({ data: { ingredientId: created.id, kind: 'IN', quantity: initial, stockAfter: initial, note: msg().initialStock, authorId: actorId } });
      return created;
    });
    await activityService.log('CATALOG', { key: 'ingredientSaved', params: { name: row.name, created: true } }, actorId);
    return toIngredient(row);
  },

  async deleteIngredient(id: string, actorId: string) {
    const ingredient = await prisma.ingredient.findFirst({ where: { id, deletedAt: null, kind: { not: 'TOPPING' } } });
    if (!ingredient) throw notFound(msg().ingredientNotFound);
    await prisma.$transaction([
      prisma.ingredient.update({ where: { id }, data: { deletedAt: new Date(), active: false } }),
      prisma.pizzaIngredient.deleteMany({ where: { ingredientId: id } }),
    ]);
    await activityService.log('CATALOG', { key: 'ingredientDeleted', params: { name: ingredient.name } }, actorId);
  },
};
