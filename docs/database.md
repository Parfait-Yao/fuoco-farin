# Database (Supabase PostgreSQL + Prisma)

## Architecture

- **Identity**: Supabase Auth (`auth.users`). Sessions are Supabase JWTs in HttpOnly cookies (`@supabase/ssr`).
- **Data**: Prisma 6 on the `public` schema. `public.users.id` = `auth.users.id`.
- **Profile sync**: triggers on `auth.users` (migration `0002_supabase_security`):
  - insert: creates the `users` row, **always with role `CLIENT`** (metadata is never trusted for the role);
  - update: syncs email, `emailVerifiedAt`, `lastLoginAt`;
  - delete: soft-deletes the profile (orders keep their snapshot).
- **Admins**: created only by `pnpm admin:create` (service role key, local machine).
- **RLS**: enabled on every public table, no policies. The Data API (publishable key) cannot read or write any table. The app uses Prisma on the server with the `postgres` role.
- **Money**: `Int` in US cents (1299 = $12.99). Catalog texts have a French column and an English `*En` column. Orders store a snapshot of customer, address, names and prices.
- **Builder ingredients**: one `ingredients` table. `kind` = `BASE | SAUCE | CHEESE | VEGETABLE` (stock items, builder) or `TOPPING` (recipe display only).

## First setup

1. Supabase dashboard > **Connect** > **ORMs** > **Prisma**: copy the two connection strings into `.env` (`DATABASE_URL` port 6543, `DIRECT_URL` port 5432).
2. Supabase dashboard > **Settings** > **API Keys**: copy a secret key into `SUPABASE_SECRET_KEY`.
3. Install and generate the client:
   ```bash
   pnpm install
   ```
4. Apply the migrations:
   ```bash
   pnpm db:deploy
   ```
5. Insert the initial catalog, promotions and settings (idempotent):
   ```bash
   pnpm db:seed
   ```
6. Create the first administrator (password prompted, hidden):
   ```bash
   pnpm admin:create --email admin@example.com --first-name Eric --last-name Admin
   ```
7. Check everything:
   ```bash
   pnpm db:check
   ```

## Schema changes

```bash
# edit prisma/schema.prisma, then
pnpm db:migrate --name short_description   # creates and applies a migration (dev only)
pnpm db:deploy                             # applies pending migrations (CI / production)
```

`migrate dev` uses a shadow database. Migration `0002` skips the `auth.users` triggers when the `auth` schema is absent, so it replays on a plain PostgreSQL shadow.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm db:generate` | Regenerate Prisma Client |
| `pnpm db:migrate` | Create + apply a migration (dev) |
| `pnpm db:deploy` | Apply pending migrations |
| `pnpm db:seed` | Seed catalog, promotions, settings |
| `pnpm db:studio` | Prisma Studio |
| `pnpm db:check` | Connections, migrations, triggers, RLS, counts |
| `pnpm admin:create` | Create or promote an admin |
