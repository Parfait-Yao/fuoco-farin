-- Stripe replaces Razorpay for online payments.
-- RAZORPAY values stay in the enums for any existing history.
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'STRIPE';
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'STRIPE';
