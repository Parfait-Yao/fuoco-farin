-- Supabase-specific setup that Prisma cannot express in schema.prisma.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Row Level Security
-- Supabase exposes the public schema through its Data API with the publishable
-- (anon) key. The app reads and writes only through Prisma on the server, with
-- the `postgres` role, which bypasses RLS. Enabling RLS without any policy
-- closes every table to the anon and authenticated roles.
-- Module 9 (Realtime) adds narrow SELECT policies where needed.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'addresses', 'categories', 'pizzas', 'ingredients', 'pizza_ingredients',
    'custom_pizzas', 'custom_pizza_vegetables', 'carts', 'cart_items', 'orders',
    'order_items', 'order_status_history', 'payments', 'webhook_events', 'promotions',
    'reviews', 'favorites', 'notifications', 'stock_movements', 'restaurant_settings'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
  -- Absent when Prisma replays migrations on a shadow database.
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Integrity rules
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "cart_items"
  ADD CONSTRAINT "cart_items_one_product_chk" CHECK (num_nonnulls("pizzaId", "customPizzaId") = 1),
  ADD CONSTRAINT "cart_items_quantity_chk" CHECK ("quantity" BETWEEN 1 AND 20);

ALTER TABLE "custom_pizza_vegetables"
  ADD CONSTRAINT "custom_pizza_vegetables_quantity_chk" CHECK ("quantity" BETWEEN 1 AND 3);

ALTER TABLE "ingredients"
  ADD CONSTRAINT "ingredients_stock_non_negative_chk" CHECK ("stock" >= 0),
  ADD CONSTRAINT "ingredients_threshold_non_negative_chk" CHECK ("threshold" >= 0),
  ADD CONSTRAINT "ingredients_price_non_negative_chk" CHECK ("price" >= 0);

ALTER TABLE "pizzas"
  ADD CONSTRAINT "pizzas_price_positive_chk" CHECK ("price" > 0),
  ADD CONSTRAINT "pizzas_old_price_chk" CHECK ("oldPrice" IS NULL OR "oldPrice" > "price");

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_amounts_chk" CHECK (
    "subtotal" >= 0 AND "deliveryFee" >= 0 AND "discount" >= 0
    AND "total" = "subtotal" + "deliveryFee" - "discount" AND "total" >= 0
  );

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_amounts_chk" CHECK (
    "quantity" > 0 AND "unitPrice" >= 0 AND "lineTotal" = "unitPrice" * "quantity"
  );

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_chk" CHECK ("rating" BETWEEN 1 AND 5);

ALTER TABLE "promotions"
  ADD CONSTRAINT "promotions_value_chk" CHECK (
    "value" > 0 AND ("kind" <> 'PERCENT' OR "value" <= 100)
  ),
  ADD CONSTRAINT "promotions_dates_chk" CHECK ("endsAt" > "startsAt"),
  ADD CONSTRAINT "promotions_code_upper_chk" CHECK ("code" = upper("code"));

ALTER TABLE "restaurant_settings"
  ADD CONSTRAINT "restaurant_settings_singleton_chk" CHECK ("id" = 1);

-- Only one default address per user.
CREATE UNIQUE INDEX "addresses_one_default_per_user"
  ON "addresses" ("userId") WHERE "isDefault";

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Profile sync with Supabase Auth
-- Every new auth.users row gets a public.users profile with role CLIENT.
-- The role is never read from user metadata: public sign-up cannot create an
-- admin. Admins are promoted by `pnpm admin:create` (service role key).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users ("id", "email", "role", "firstName", "lastName", "phone", "emailVerifiedAt", "createdAt", "updatedAt")
  VALUES (
    NEW.id,
    lower(NEW.email),
    'CLIENT',
    coalesce(left(NEW.raw_user_meta_data ->> 'first_name', 80), ''),
    coalesce(left(NEW.raw_user_meta_data ->> 'last_name', 80), ''),
    coalesce(left(NEW.raw_user_meta_data ->> 'phone', 30), ''),
    NEW.email_confirmed_at,
    now(),
    now()
  )
  ON CONFLICT ("id") DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_auth_user_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.users
  SET "email" = lower(NEW.email),
      "emailVerifiedAt" = NEW.email_confirmed_at,
      "lastLoginAt" = coalesce(NEW.last_sign_in_at, "lastLoginAt"),
      "updatedAt" = now()
  WHERE "id" = NEW.id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_auth_user_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Soft delete: orders keep their snapshot, personal data is removed.
  UPDATE public.users
  SET "deletedAt" = now(), "status" = 'BLOCKED', "phone" = '', "avatarUrl" = NULL, "avatarKey" = NULL, "updatedAt" = now()
  WHERE "id" = OLD.id;
  RETURN OLD;
END;
$$;

-- Trigger functions must not be callable through the Data API.
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_auth_user_updated() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_auth_user_deleted() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user(), public.handle_auth_user_updated(), public.handle_auth_user_deleted() FROM anon, authenticated';
  END IF;
END $$;

-- The auth schema exists only on Supabase. This guard keeps the migration
-- replayable on a plain PostgreSQL shadow database (`prisma migrate dev`).
DO $$
BEGIN
  IF to_regclass('auth.users') IS NULL THEN
    RAISE NOTICE 'auth.users not found: auth triggers skipped (not a Supabase database).';
    RETURN;
  END IF;

  EXECUTE 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users';
  EXECUTE 'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
           FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user()';

  EXECUTE 'DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users';
  EXECUTE 'CREATE TRIGGER on_auth_user_updated AFTER UPDATE OF email, email_confirmed_at, last_sign_in_at ON auth.users
           FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_updated()';

  EXECUTE 'DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users';
  EXECUTE 'CREATE TRIGGER on_auth_user_deleted BEFORE DELETE ON auth.users
           FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_deleted()';

  -- Backfill profiles for accounts created before this migration.
  -- Existing admins (app_metadata.role = admin) keep their role.
  EXECUTE $sql$
    INSERT INTO public.users ("id", "email", "role", "firstName", "lastName", "phone", "emailVerifiedAt", "createdAt", "updatedAt")
    SELECT
      u.id,
      lower(u.email),
      CASE WHEN u.raw_app_meta_data ->> 'role' = 'admin' THEN 'ADMIN'::public."Role" ELSE 'CLIENT'::public."Role" END,
      coalesce(u.raw_user_meta_data ->> 'first_name', ''),
      coalesce(u.raw_user_meta_data ->> 'last_name', ''),
      coalesce(u.raw_user_meta_data ->> 'phone', ''),
      u.email_confirmed_at,
      u.created_at,
      now()
    FROM auth.users u
    WHERE u.email IS NOT NULL
    ON CONFLICT ("id") DO NOTHING
  $sql$;
END $$;
