-- CreateEnum
CREATE TYPE "ActivityKind" AS ENUM ('ORDER', 'STOCK', 'CUSTOMER', 'REVIEW', 'CATALOG');

-- AlterEnum
ALTER TYPE "StockMovementKind" ADD VALUE 'THRESHOLD';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "preferences" JSONB,
ADD COLUMN     "welcomeEmailSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL,
    "kind" "ActivityKind" NOT NULL,
    "message" TEXT NOT NULL,
    "actorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_subscribers" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "handled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "newsletter_subscribers"("email");

-- CreateIndex
CREATE INDEX "contact_messages_createdAt_idx" ON "contact_messages"("createdAt");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─────────────────────────────────────────────────────────────────────────────
-- RLS on the new tables (server-only access through Prisma).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "activity_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "newsletter_subscribers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_messages" ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- Realtime (order tracking and notifications).
-- Supabase Realtime `postgres_changes` applies RLS: a signed-in user receives
-- changes only for rows that a SELECT policy lets them read. The browser uses
-- these events only as a signal and refetches through the API.
-- Skipped on plain PostgreSQL (no auth.uid(), no supabase_realtime publication).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = uid AND u.role = 'ADMIN' AND u.status = 'ACTIVE' AND u."deletedAt" IS NULL
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;

DO $$
BEGIN
  IF to_regprocedure('auth.uid()') IS NULL THEN
    RAISE NOTICE 'auth.uid() not found: realtime policies skipped (not a Supabase database).';
    RETURN;
  END IF;

  EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated';

  EXECUTE 'DROP POLICY IF EXISTS "orders_select_own_or_admin" ON public.orders';
  EXECUTE 'CREATE POLICY "orders_select_own_or_admin" ON public.orders FOR SELECT TO authenticated
           USING ("userId" = (SELECT auth.uid()) OR public.is_admin((SELECT auth.uid())))';

  EXECUTE 'DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications';
  EXECUTE 'CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT TO authenticated
           USING ("userId" = (SELECT auth.uid()))';

  -- Realtime needs SELECT privilege in addition to the policy.
  EXECUTE 'GRANT SELECT ON public.orders, public.notifications TO authenticated';

  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'orders') THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.orders';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
    END IF;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Account deletion: anonymize the profile so the email can be reused and no
-- personal data remains. Orders keep their own snapshot.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_auth_user_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.users
  SET "deletedAt" = now(),
      "status" = 'BLOCKED',
      "email" = 'deleted+' || OLD.id::text || '@invalid.local',
      "firstName" = 'Compte',
      "lastName" = 'supprimé',
      "phone" = '',
      "avatarUrl" = NULL,
      "avatarKey" = NULL,
      "preferences" = NULL,
      "updatedAt" = now()
  WHERE "id" = OLD.id;
  DELETE FROM public.addresses WHERE "userId" = OLD.id;
  DELETE FROM public.favorites WHERE "userId" = OLD.id;
  DELETE FROM public.carts WHERE "userId" = OLD.id;
  RETURN OLD;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_auth_user_deleted() FROM PUBLIC;
