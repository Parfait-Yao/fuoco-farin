import { z } from 'zod';
import { email, imageUrl, phone, text } from './common';

export const profileSchema = z.object({
  firstName: text(80, 2),
  lastName: text(80, 2),
  email,
  phone,
  /** Empty string removes the avatar. */
  avatar: z.union([imageUrl, z.literal('')]).optional(),
});

export const addressSchema = z.object({
  label: text(40, 1),
  street: text(160, 5),
  district: text(80, 1),
  city: text(80, 2),
  details: text(140).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  isDefault: z.boolean().optional(),
});

export const preferencesSchema = z.object({
  orderUpdatesSms: z.boolean(),
  orderUpdatesEmail: z.boolean(),
  promotions: z.boolean(),
  newsletter: z.boolean(),
  defaultDelivery: z.enum(['standard', 'express', 'pickup']),
  defaultPayment: z.enum(['orange_money', 'mtn_momo', 'wave', 'card', 'cash']),
});

export const customerStatusSchema = z.object({ status: z.enum(['active', 'blocked']) });
