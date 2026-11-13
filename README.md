# Fuoco & Farina — Pizza delivery

Online pizza ordering website for a restaurant in Abidjan.

- **Customers** browse the menu, build their own pizza, order, pay online or in cash, and track their order live.
- **Admins** manage orders, pizzas, categories, ingredients, stock, promotions, reviews, customers and statistics.

Built with Next.js 14, TypeScript, MUI, Prisma and Supabase (database and authentication).

## Requirements

- Node.js 20+ and pnpm 9+
- A Supabase project (PostgreSQL database and Auth)
- Optional services:
  - Cloudflare R2 for image uploads
  - An SMTP account for emails
  - Stripe test keys for online payment (test mode, no real money)

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create the environment file, then fill in the values:

   ```bash
   cp .env.example .env
   ```

   Required: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DATABASE_URL`, `DIRECT_URL`.
   Copy both database URLs from Supabase: **Connect > ORM > Prisma**.

3. Prepare the database:

   ```bash
   pnpm db:deploy      # create the tables
   pnpm db:seed        # load the menu, ingredients, promotions and settings
   pnpm admin:create --email admin@example.com --first-name Admin
   pnpm db:check       # check that everything is connected
   ```

## Run

```bash
pnpm dev                     # development: http://localhost:3000
pnpm build && pnpm start     # production
```

## Access

| Space | URL |
| --- | --- |
| Website | `/` |
| Customer login | `/login` |
| Admin login | `/admin/login` |

Admin accounts can only be created with `pnpm admin:create`. Public sign-up always creates a customer account.

## Online payment (Stripe, test mode)

Online payment uses Stripe Checkout in **test mode**, also in production: no real money moves.

1. In the Stripe Dashboard (test mode), copy the secret key `sk_test_...` into `STRIPE_SECRET_KEY`.
2. Add a webhook endpoint `https://your-domain/api/payments/stripe/webhook` with the `checkout.session.*` events. Copy its signing secret `whsec_...` into `STRIPE_WEBHOOK_SECRET`.
3. Pay with the test card `4242 4242 4242 4242`, any future date, any CVC.

Without `STRIPE_SECRET_KEY`, only cash on delivery is accepted.

Prices are in **US dollars**. Every amount is stored as an integer number of cents (`1299` = $12.99), which is also the unit Stripe expects for USD.

## Languages (French / English)

The whole site, the customer area, the admin, the API error messages and the emails are available in French and English.

- Visitors choose the language with the **FR / EN** button in the header (also in the dashboards and the auth pages). The choice is kept in the `locale` cookie; without it, the browser language decides. URLs do not change.
- Interface texts live in `src/i18n/messages/<namespace>.ts`, one file per area, with the French and English versions side by side. The English object must have exactly the French keys, so a missing translation fails `pnpm typecheck`.
- Catalog texts (pizzas, categories, ingredients, promotions, slogan and opening hours) have an English column (`nameEn`, `descriptionEn`…), edited in the admin forms. An empty English text falls back to French.
- Notifications and the activity feed are stored as a key plus variables and shown in the reader's language. Order emails use the language of the customer when ordering.

## Switching an existing database to dollars

Migration `0005_usd_i18n` adds the English columns and the dollar defaults. To convert existing data:

```bash
pnpm db:deploy          # applies the migration
pnpm db:usd             # dry run: shows what would change
pnpm db:usd --apply     # seed products get their dollar prices and English texts;
                        # other amounts are converted at 600 FCFA = $1
```

The script runs once: it does nothing when the settings currency is already `USD`.

## Useful commands

```bash
pnpm test         # unit tests
pnpm typecheck    # TypeScript check
pnpm db:studio    # browse the database
```

More details: [docs/database.md](docs/database.md) and [docs/api.md](docs/api.md).
