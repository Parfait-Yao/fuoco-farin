import { z } from 'zod';
import { vm } from '@/i18n/validation';
import { imageUrl, money, text } from './common';

export const pizzaListQuery = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.string().trim().max(80).optional(),
  vegetarian: z.enum(['true', 'false']).optional(),
  spicy: z.enum(['true', 'false']).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['popular', 'price-asc', 'price-desc', 'rating', 'newest', 'name']).default('popular'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
});

export const pizzaSchema = z
  .object({
    name: text(80, 3),
    nameEn: text(80).default(''),
    description: text(160, 10),
    descriptionEn: text(160).default(''),
    longDescription: text(600).default(''),
    longDescriptionEn: text(600).default(''),
    categoryId: z.string().uuid(vm('chooseCategory')),
    /** Medium-size price in cents: $1 to $100. */
    price: money.min(100, vm('priceMin', 100)).max(10_000, vm('priceMax', 10_000)),
    oldPrice: money.nullable().optional(),
    image: imageUrl,
    ingredients: z.array(text(60, 1)).min(1, vm('atLeastOneIngredient')).max(20),
    prepMinutes: z.number().int().min(5).max(60),
    calories: z.number().int().min(100).max(3000),
    isPopular: z.boolean().default(false),
    isNew: z.boolean().default(false),
    isVegetarian: z.boolean().default(false),
    isSpicy: z.boolean().default(false),
    active: z.boolean().default(true),
  })
  .refine((v) => !v.oldPrice || v.oldPrice > v.price, { path: ['oldPrice'], message: vm('oldPriceHigher') });

export const pizzaPatchSchema = z.object({ active: z.boolean() });

export const categorySchema = z.object({
  name: text(60, 2),
  nameEn: text(60).default(''),
  description: text(200).default(''),
  descriptionEn: text(200).default(''),
  image: imageUrl,
  active: z.boolean().default(true),
});

export const categoryMoveSchema = z.object({ direction: z.union([z.literal(-1), z.literal(1)]) });

export const ingredientSchema = z.object({
  type: z.enum(['base', 'sauce', 'cheese', 'veggie']),
  name: text(60, 2),
  nameEn: text(60).default(''),
  description: text(120).default(''),
  descriptionEn: text(120).default(''),
  /** Builder extra in cents, up to $20. */
  price: money.max(2_000),
  color: z.string().trim().regex(/^(#[0-9a-fA-F]{3,8}|transparent)$/, vm('hexColor')),
  unit: z.enum(['kg', 'L', 'pièces', 'g']),
  threshold: z.number().min(0).max(100_000),
  /** Initial stock, only used on creation. Later changes go through stock movements. */
  stock: z.number().min(0).max(100_000).optional(),
  active: z.boolean().default(true),
});

export const stockMoveSchema = z.object({
  kind: z.enum(['in', 'out']),
  quantity: z.number().positive(vm('positiveQuantity')).max(100_000),
  note: text(200).default(''),
});

export const thresholdSchema = z.object({ threshold: z.number().min(0).max(100_000) });
