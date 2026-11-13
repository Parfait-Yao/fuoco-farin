/**
 * Connectivity check: database (pooled + direct), applied migrations,
 * auth triggers, RLS, seed counts and admin presence.
 *
 *   pnpm db:check
 */
import { PrismaClient } from '@prisma/client';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function checkConnection(label: string, url: string | undefined) {
  if (!url) return console.log(`✗ ${label}: variable missing`);
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const [{ version }] = await prisma.$queryRaw<{ version: string }[]>`select version()`;
    console.log(`✓ ${label}: ${version.split(',')[0]}`);
  } catch (error) {
    console.log(`✗ ${label}: ${(error as Error).message.split('\n').filter(Boolean).pop()}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await checkConnection('DATABASE_URL (pooler)', process.env.DATABASE_URL);
  await checkConnection('DIRECT_URL', process.env.DIRECT_URL);

  const prisma = new PrismaClient();
  try {
    const migrations = await prisma.$queryRaw<{ migration_name: string }[]>`
      select migration_name from _prisma_migrations where finished_at is not null order by started_at`;
    console.log(`✓ Migrations: ${migrations.map((m) => m.migration_name).join(', ') || 'none'}`);

    const triggers = await prisma.$queryRaw<{ tgname: string }[]>`
      select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and tgname like 'on_auth_user_%'`;
    console.log(`${triggers.length === 3 ? '✓' : '✗'} Auth triggers: ${triggers.map((t) => t.tgname).join(', ') || 'none'}`);

    const open = await prisma.$queryRaw<{ tablename: string }[]>`
      select tablename from pg_tables where schemaname = 'public' and not rowsecurity`;
    console.log(`${open.length === 0 ? '✓' : '✗'} RLS: ${open.length === 0 ? 'enabled on every public table' : `disabled on ${open.map((t) => t.tablename).join(', ')}`}`);

    const [categories, pizzas, ingredients, promotions, settings, admins] = await Promise.all([
      prisma.category.count(),
      prisma.pizza.count(),
      prisma.ingredient.count(),
      prisma.promotion.count(),
      prisma.restaurantSettings.count(),
      prisma.user.count({ where: { role: 'ADMIN', deletedAt: null } }),
    ]);
    console.log(`✓ Data: ${categories} categories, ${pizzas} pizzas, ${ingredients} ingredients, ${promotions} promotions, ${settings} settings row`);
    console.log(`${admins > 0 ? '✓' : '✗'} Admins: ${admins}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
