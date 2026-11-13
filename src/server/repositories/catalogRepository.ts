import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/* Database access for the catalog. Services own the business rules. */

export const pizzaInclude = { ingredients: { include: { ingredient: true } } } satisfies Prisma.PizzaInclude;
export type PizzaRow = Prisma.PizzaGetPayload<{ include: typeof pizzaInclude }>;

const BUILDER_KINDS = ['BASE', 'SAUCE', 'CHEESE', 'VEGETABLE'] as const;

export const catalogRepository = {
  visiblePizzaWhere: { active: true, deletedAt: null, category: { active: true, deletedAt: null } } satisfies Prisma.PizzaWhereInput,

  findPizzas(where: Prisma.PizzaWhereInput, orderBy: Prisma.PizzaOrderByWithRelationInput[] = [{ createdAt: 'desc' }], skip?: number, take?: number) {
    return prisma.pizza.findMany({ where, include: pizzaInclude, orderBy, skip, take });
  },

  countPizzas(where: Prisma.PizzaWhereInput) {
    return prisma.pizza.count({ where });
  },

  findPizza(where: Prisma.PizzaWhereUniqueInput) {
    return prisma.pizza.findUnique({ where, include: pizzaInclude });
  },

  findCategories(includeInactive: boolean) {
    return prisma.category.findMany({
      where: { deletedAt: null, ...(includeInactive ? {} : { active: true }) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  },

  findBuilderIngredients(includeInactive: boolean) {
    return prisma.ingredient.findMany({
      where: { deletedAt: null, kind: { in: [...BUILDER_KINDS] }, ...(includeInactive ? {} : { active: true }) },
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  },

  findStockCandidates() {
    return prisma.ingredient.findMany({
      where: { deletedAt: null, trackStock: true, kind: { in: [...BUILDER_KINDS] } },
      select: { id: true, code: true, name: true, kind: true },
    });
  },
};
