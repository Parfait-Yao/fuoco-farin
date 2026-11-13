import { execSync } from 'node:child_process';

/**
 * Integration tests run against a disposable PostgreSQL database given by
 * TEST_DATABASE_URL (never your Supabase project). The database is reset,
 * migrated and seeded once per run. A minimal `auth.users` table stands in
 * for Supabase Auth so the profile triggers are exercised too.
 */
export const TEST_DB = process.env.TEST_DATABASE_URL;

export function prepareDatabase() {
  if (!TEST_DB) return;
  if (/supabase\.(co|com)/.test(TEST_DB)) throw new Error('TEST_DATABASE_URL must not point to Supabase: tests wipe the database.');
  process.env.DATABASE_URL = TEST_DB;
  process.env.DIRECT_URL = TEST_DB;
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'test';
  process.env.STRIPE_SECRET_KEY = 'sk_test_integration';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  delete process.env.SMTP_HOST;
  delete process.env.SUPABASE_SECRET_KEY;

  const env = { ...process.env, DATABASE_URL: TEST_DB, DIRECT_URL: TEST_DB };
  const sql = (q: string) => execSync('npx prisma db execute --stdin --schema prisma/schema.prisma', { input: q, env, stdio: ['pipe', 'ignore', 'inherit'] });
  sql(`DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS auth CASCADE; CREATE SCHEMA auth;
       CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}', raw_app_meta_data jsonb DEFAULT '{}',
         email_confirmed_at timestamptz, last_sign_in_at timestamptz, created_at timestamptz DEFAULT now());`);
  execSync('npx prisma migrate deploy', { env, stdio: 'ignore' });
  execSync('npx tsx prisma/seed.ts', { env, stdio: 'ignore' });
}
