import { z } from 'zod';
import { vm } from '@/i18n/validation';

export const uuid = z.string().uuid(vm('invalidId'));
export const idParams = z.object({ id: uuid });

/** Trims and rejects control characters (basic hygiene for free text). */
export const text = (max: number, min = 0) =>
  z
    .string()
    .trim()
    .min(min, min > 0 ? vm('minChars', min) : undefined)
    .max(max, vm('maxChars', max))
    // eslint-disable-next-line no-control-regex
    .refine((v) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(v), vm('forbiddenChars'));

export const email = z.string().trim().toLowerCase().email(vm('invalidEmail')).max(254);

/** Ivorian phone format used by the forms: +225 followed by 10 digits. */
export const phone = z
  .string()
  .trim()
  .regex(/^(\+225\s?)?(\d{2}\s?){5}$/, vm('phoneFormat'));

export const password = z
  .string()
  .min(8, vm('passwordMin'))
  .max(72, vm('passwordMax'))
  .regex(/[A-Z]/, vm('passwordUpper'))
  .regex(/[0-9]/, vm('passwordDigit'));

/** Amount in cents (USD). */
export const money = z.number().int(vm('invalidAmount')).min(0).max(100_000_000);

export const httpsUrl = z
  .string()
  .trim()
  .url(vm('invalidUrl'))
  .max(2048)
  .refine((v) => v.startsWith('https://') || v.startsWith('/'), vm('httpsRequired'));

export const imageUrl = z.union([httpsUrl, z.string().startsWith('/').max(512)]);

export const dateRange = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    days: z.coerce.number().int().min(1).max(366).optional(),
  })
  .transform(({ from, to, days }) => {
    const end = to ?? new Date();
    const start = from ?? new Date(end.getTime() - (days ?? 30) * 86_400_000);
    return { from: start, to: end };
  })
  .refine((r) => r.from < r.to, vm('dateOrder'));

export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
});
