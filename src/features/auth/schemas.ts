import { z } from 'zod';
import { vm } from '@/i18n/validation';

export const passwordRule = z
  .string()
  .min(8, vm('passwordMin'))
  .regex(/[A-Z]/, vm('passwordUpper'))
  .regex(/[0-9]/, vm('passwordDigit'));

export const loginSchema = z.object({
  email: z.string().min(1, vm('required')).email(vm('invalidEmail')),
  password: z.string().min(1, vm('passwordRequired')),
  remember: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    firstName: z.string().min(2, vm('minChars', 2)),
    lastName: z.string().min(2, vm('minChars', 2)),
    email: z.string().email(vm('invalidEmail')),
    phone: z.string().regex(/^(\+225\s?)?(\d{2}\s?){5}$/, vm('phoneFormat')),
    password: passwordRule,
    confirm: z.string(),
    acceptTerms: z.boolean().refine((v) => v, vm('acceptTerms')),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: vm('passwordsMatch') });

export const forgotSchema = z.object({ email: z.string().email(vm('invalidEmail')) });

export const resetSchema = z
  .object({ password: passwordRule, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: vm('passwordsMatch') });

export const changePasswordSchema = z
  .object({ current: z.string().min(1, vm('passwordRequired')), password: passwordRule, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: vm('passwordsMatch') })
  .refine((v) => v.password !== v.current, { path: ['password'], message: vm('passwordDifferent') });

/** 0..4 score used by the strength meter. */
export function passwordStrength(value: string): number {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value) || value.length >= 12) score += 1;
  return score;
}
