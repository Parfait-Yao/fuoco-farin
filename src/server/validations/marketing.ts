import { z } from 'zod';
import { vm } from '@/i18n/validation';
import { email, text, uuid } from './common';

export const promotionSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,30}$/, vm('promoCodeFormat')),
    label: text(80, 3),
    labelEn: text(80).default(''),
    kind: z.enum(['percent', 'fixed']),
    value: z.number().int().positive(vm('positiveValue')),
    minOrder: z.number().int().min(0).default(0),
    maxDiscount: z.number().int().positive().nullable().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    active: z.boolean().default(true),
    maxUses: z.number().int().positive().nullable().optional(),
    maxUsesPerUser: z.number().int().positive().nullable().optional(),
  })
  .refine((p) => p.kind !== 'percent' || p.value <= 100, { path: ['value'], message: vm('percentRange') })
  .refine((p) => p.endDate > p.startDate, { path: ['endDate'], message: vm('endAfterStart') });

export const promoCheckSchema = z.object({
  code: z.string().trim().toUpperCase().min(1, vm('enterCode')).max(40),
  subtotal: z.number().int().min(0),
});

export const reviewSchema = z.object({
  orderId: uuid,
  pizzaId: uuid,
  rating: z.number().int().min(1, vm('ratingRange')).max(5, vm('ratingRange')),
  comment: text(600, 5),
});

export const reviewModerationSchema = z.object({ published: z.boolean() });

export const favoriteSchema = z.object({ pizzaId: uuid });

export const newsletterSchema = z.object({ email });

export const contactSchema = z.object({
  name: text(120, 2),
  email,
  subject: text(120, 2),
  message: text(2000, 10),
});

export const notificationPatchSchema = z.object({ read: z.boolean() });

export const settingsSchema = z
  .object({
    name: text(80, 2),
    slogan: text(160),
    sloganEn: text(160),
    email,
    phone: text(40, 6),
    address: text(200, 5),
    openingHours: text(120),
    openingHoursEn: text(120),
    /** Amounts in cents. */
    deliveryFee: z.number().int().min(0).max(5_000),
    expressFee: z.number().int().min(0).max(5_000),
    freeDeliveryFrom: z.number().int().min(0).max(100_000),
    defaultStockThreshold: z.number().int().min(0).max(10_000),
    showPromotionsBanner: z.boolean(),
    showRatings: z.boolean(),
    itemsPerPage: z.number().int().min(3).max(60),
    notifyNewOrders: z.boolean(),
    notifyLowStock: z.boolean(),
    notifyNewReviews: z.boolean(),
    notifyByEmail: z.boolean(),
  })
  .partial();
