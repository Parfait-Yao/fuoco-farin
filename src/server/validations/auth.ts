import { z } from 'zod';
import { vm } from '@/i18n/validation';
import { email, password, phone, text } from './common';

export const loginSchema = z.object({
  email,
  password: z.string().min(1, vm('passwordRequired')).max(72),
  space: z.enum(['client', 'admin']),
  remember: z.boolean().default(true),
});

export const registerSchema = z.object({
  firstName: text(80, 2),
  lastName: text(80, 2),
  email,
  phone,
  password,
});

export const emailOnlySchema = z.object({ email });

export const verifyEmailSchema = z.object({
  email,
  code: z.string().trim().regex(/^\d{6,10}$/, vm('code6')),
});

export const resetPasswordSchema = z.object({ password });

export const changePasswordSchema = z
  .object({ current: z.string().min(1).max(72), next: password })
  .refine((v) => v.current !== v.next, { path: ['next'], message: vm('passwordDifferent') });
