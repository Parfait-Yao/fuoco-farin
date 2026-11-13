import 'server-only';
import { z } from 'zod';

/**
 * Server environment, validated once on first use.
 * Optional groups (SMTP, Stripe, R2) are checked by the feature that needs them,
 * so the app still boots in development when a group is not configured yet.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().optional(),

  DATABASE_URL: z.string().min(1),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().default('Fuoco & Farina <no-reply@localhost>'),

  /** Stripe secret key. sk_test_... keeps payments in test mode, even in production. */
  STRIPE_SECRET_KEY: z.string().optional(),
  /** Signing secret of the webhook endpoint (whsec_...). */
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  CRON_SECRET: z.string().optional(),
  ENABLE_CRON: z.enum(['true', 'false']).default('false'),
  /** Minutes before an unpaid online order is cancelled and its stock released. */
  PAYMENT_TIMEOUT_MINUTES: z.coerce.number().int().positive().default(30),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Invalid server environment: ${missing}`);
  }
  cached = parsed.data;
  return cached;
}

export const isProduction = () => env().NODE_ENV === 'production';
