import { z } from 'zod';
import { vm } from '@/i18n/validation';

const phoneRegex = /^(\+225\s?)?(\d{2}\s?){5}$/;

export const checkoutSchema = z
  .object({
    street: z.string().min(5, vm('minChars', 5)),
    district: z.string().min(1, vm('chooseOption')),
    city: z.string().min(2, vm('minChars', 2)),
    details: z.string().max(140, vm('maxChars', 140)).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    fullName: z.string().min(3, vm('minChars', 3)),
    email: z.string().email(vm('invalidEmail')),
    phone: z.string().regex(phoneRegex, vm('phoneFormat')),
    deliveryMode: z.enum(['standard', 'express', 'pickup']),
    acceptTerms: z.boolean().refine((v) => v, vm('acceptTerms')),
    paymentMethod: z.enum(['orange_money', 'mtn_momo', 'wave', 'card', 'cash']),
    mobileNumber: z.string().optional(),
    cardNumber: z.string().optional(),
    cardExpiry: z.string().optional(),
    cardCvc: z.string().optional(),
  })
  .refine((v) => ['card', 'cash'].includes(v.paymentMethod), { path: ['paymentMethod'], message: vm('chooseOption') });

export type CheckoutValues = z.input<typeof checkoutSchema>;

/** Fields validated before leaving each step. */
export const STEP_FIELDS: (keyof CheckoutValues)[][] = [
  [],
  ['street', 'district', 'city', 'details'],
  ['fullName', 'email', 'phone'],
  ['deliveryMode'],
  ['acceptTerms'],
  ['paymentMethod'],
];

export const formatCardNumber = (value: string) =>
  value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ');

export const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};
