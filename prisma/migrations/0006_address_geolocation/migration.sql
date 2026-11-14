-- Optional exact GPS position shared by the customer (browser geolocation).
ALTER TABLE "addresses" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "addresses" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "orders" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "orders" ADD COLUMN "longitude" DOUBLE PRECISION;
