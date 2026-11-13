import { z } from 'zod';
import { vm } from '@/i18n/validation';
import { email, phone, text, uuid } from './common';

const size = z.enum(['small', 'medium', 'large']);

export const customConfigSchema = z.object({
  baseId: uuid,
  sauceId: uuid,
  cheeseId: uuid,
  veggieIds: z.array(uuid).max(6, vm('maxVeggies', 6)),
});

/**
 * One cart line as sent by the browser. There is deliberately no price field:
 * the server prices every line from the database.
 */
export const cartLineSchema = z
  .object({
    pizzaId: uuid.optional(),
    custom: customConfigSchema.optional(),
    name: text(80).optional(),
    size,
    quantity: z.number().int().min(1).max(20),
    removedIngredients: z.array(text(60)).max(20).default([]),
    note: text(140).optional(),
  })
  .refine((l) => Boolean(l.pizzaId) !== Boolean(l.custom), vm('lineKind'));

export type CartLineInput = z.infer<typeof cartLineSchema>;

export const quoteSchema = z.object({
  items: z.array(cartLineSchema).min(1, vm('cartEmpty')).max(30),
  deliveryMode: z.enum(['standard', 'express', 'pickup']),
  promoCode: z.string().trim().toUpperCase().max(40).optional(),
});

export const createOrderSchema = quoteSchema.extend({
  contact: z.object({ fullName: text(120, 3), email, phone }),
  address: z.object({
    street: text(160, 5),
    district: text(80, 1),
    city: text(80, 2),
    details: text(140).optional(),
  }),
  paymentMethod: z.enum(['orange_money', 'mtn_momo', 'wave', 'card', 'cash']),
  note: text(300).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const orderStatusSchema = z.object({
  status: z.enum(['received', 'preparing', 'delivering', 'delivered', 'cancelled']),
  note: text(200).optional(),
});

export const cancelOrderSchema = z.object({ reason: text(200).optional() });

export const cartReplaceSchema = z.object({
  items: z.array(cartLineSchema).max(30),
  promoCode: z.string().trim().toUpperCase().max(40).nullable().optional(),
});

export const cartItemPatchSchema = z.object({
  quantity: z.number().int().min(1).max(20).optional(),
  size: size.optional(),
  note: text(140).nullable().optional(),
  removedIngredients: z.array(text(60)).max(20).optional(),
});

export const adminOrdersQuery = z.object({
  status: z.enum(['received', 'preparing', 'delivering', 'delivered', 'cancelled']).optional(),
  q: z.string().trim().max(80).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  take: z.coerce.number().int().min(1).max(1000).default(500),
});
