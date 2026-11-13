-- US dollars (amounts in cents) and French / English content.
-- Existing amounts are not converted here: run `pnpm db:usd` to load the
-- dollar catalog prices and English texts (see scripts/switch-to-usd.ts).

-- English catalog texts (empty = fall back to French).
ALTER TABLE "categories" ADD COLUMN "nameEn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "categories" ADD COLUMN "descriptionEn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "pizzas" ADD COLUMN "nameEn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "pizzas" ADD COLUMN "descriptionEn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "pizzas" ADD COLUMN "longDescriptionEn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ingredients" ADD COLUMN "nameEn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ingredients" ADD COLUMN "descriptionEn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "promotions" ADD COLUMN "labelEn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "restaurant_settings" ADD COLUMN "sloganEn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "restaurant_settings" ADD COLUMN "openingHoursEn" TEXT NOT NULL DEFAULT '';

-- Language of users (emails) and of orders (order emails for guests).
ALTER TABLE "users" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'fr';
ALTER TABLE "orders" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'fr';

-- Notifications and activity rendered in the reader's language.
ALTER TABLE "notifications" ADD COLUMN "key" TEXT;
ALTER TABLE "notifications" ADD COLUMN "params" JSONB;
ALTER TABLE "activity_logs" ADD COLUMN "key" TEXT;
ALTER TABLE "activity_logs" ADD COLUMN "params" JSONB;

-- Dollar defaults.
ALTER TABLE "restaurant_settings" ALTER COLUMN "currency" SET DEFAULT 'USD';
ALTER TABLE "restaurant_settings" ALTER COLUMN "deliveryFee" SET DEFAULT 399;
ALTER TABLE "restaurant_settings" ALTER COLUMN "expressFee" SET DEFAULT 699;
ALTER TABLE "restaurant_settings" ALTER COLUMN "freeDeliveryFrom" SET DEFAULT 3500;
