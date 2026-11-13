# API reference

All endpoints live under `/api` (Next.js Route Handlers) and answer JSON:

```json
{ "ok": true, "data": … }
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "Message en français", "details": … } }
```

| Code | HTTP | Meaning |
| --- | --- | --- |
| `VALIDATION_ERROR` | 422 | Body or query rejected by Zod (`details` lists fields) |
| `BAD_REQUEST` | 400 | Business rule refused (promo invalid, review not allowed…) |
| `UNAUTHENTICATED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Wrong role, blocked account, bad signature |
| `NOT_FOUND` | 404 | Unknown resource, or one you may not see |
| `CONFLICT` / `OUT_OF_STOCK` | 409 | Concurrent change, forbidden status transition, stock shortage |
| `PAYMENT_ERROR` | 402 | Payment refused or not verifiable |
| `RATE_LIMITED` | 429 | Too many attempts |
| `NOT_CONFIGURED` | 503 | Missing server configuration (R2, Stripe…) |

Auth: Supabase session in HttpOnly cookies (set by `/api/auth/login`). Access levels: **public**, **user** (any signed-in account), **client**, **admin**. The role always comes from the database.

## Auth

| Method | Path | Access | Body / notes |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | public | `{ firstName, lastName, email, phone, password }`. Always CLIENT. Rate limit 5/h/IP |
| POST | `/api/auth/verify-email` | public | `{ email, code }` (6-digit code from the email) |
| POST | `/api/auth/resend-verification` | public | `{ email }` |
| POST | `/api/auth/login` | public | `{ email, password, space: client\|admin, remember }`. Rate limit 5/15 min per email, 20/15 min per IP |
| POST | `/api/auth/logout` | public | Clears cookies |
| GET | `/api/auth/me` | public | Profile + addresses + preferences, or `null` |
| POST | `/api/auth/forgot-password` | public | `{ email }`, same answer whether the email exists or not |
| POST | `/api/auth/reset-password` | recovery session | `{ password }` after the email link |
| POST | `/api/auth/change-password` | user | `{ current, next }`, signs out other devices |
| POST | `/api/auth/logout-others` | user | Revokes other sessions |
| GET | `/api/auth/realtime-token` | user | Short-lived token for Supabase Realtime |

## Account (client)

| Method | Path | Notes |
| --- | --- | --- |
| PATCH | `/api/account/profile` | `{ firstName, lastName, email, phone, avatar }`. Email change sends a confirmation link |
| PUT | `/api/account/preferences` | Notification and default checkout preferences |
| GET, POST | `/api/account/addresses` | List / create (returns the list) |
| PUT, DELETE | `/api/account/addresses/:id` | One default address per user |
| GET | `/api/account/orders` | Own orders |
| GET, POST | `/api/account/favorites` | `{ pizzaId }` |
| DELETE | `/api/account/favorites/:pizzaId` | |
| GET | `/api/account/reviews` | Own reviews |
| DELETE | `/api/account` | `{ password }`. Deletes the account (profile anonymized, orders kept) |
| POST | `/api/reviews` | `{ orderId, pizzaId, rating 1-5, comment }`. Order must be delivered and contain the pizza |

## Catalog (public)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/catalog` | Pizzas, categories, builder ingredients (availability only), settings, published reviews, active promotions, real stats |
| GET | `/api/pizzas` | `q, category (slug), vegetarian, spicy, minPrice, maxPrice, sort (popular\|price-asc\|price-desc\|rating\|newest\|name), page, pageSize` |
| GET | `/api/pizzas/:slugOrId` | Pizza + published reviews |
| GET | `/api/categories` | Active categories |

## Cart, orders, payments

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| POST | `/api/cart/quote` | public | `{ items, deliveryMode, promoCode? }`. Server prices, fee, discount, stock availability. **No price field is accepted** |
| GET, PUT, DELETE | `/api/cart` | client | Server cart (prices recomputed on every read) |
| POST | `/api/cart/items` | client | Add a line |
| PATCH, DELETE | `/api/cart/items/:id` | client | |
| POST | `/api/cart/merge` | client | Merge the guest cart after login |
| POST | `/api/promotions/check` | public | `{ code, subtotal }`. 20 tries / 10 min |
| POST | `/api/orders` | public | `{ items, deliveryMode, promoCode?, contact, address, paymentMethod: card\|cash }`. One transaction: prices, promo use, stock reservation. Guests receive `guestToken` |
| GET | `/api/orders/:id?token=` | owner, admin, guest token | |
| POST | `/api/orders/:id/cancel` | owner (while RECEIVED) or admin | Restores stock and promo use, refunds a paid online order |
| GET | `/api/payments/config` | public | Online payment enabled, test mode, currency |
| POST | `/api/payments/stripe/checkout` | owner / guest token | Creates the Stripe Checkout Session from the stored total, returns its URL |
| POST | `/api/payments/stripe/verify` | owner / guest token | Return from Stripe: reads the Checkout Session at Stripe, marks the order paid |
| POST | `/api/payments/stripe/cancel` | owner / guest token | Customer left the Stripe page: session expired, order cancelled, stock released |
| POST | `/api/payments/stripe/webhook` | Stripe | `checkout.session.completed`, `async_payment_succeeded`, `async_payment_failed`, `expired`. Signed (`Stripe-Signature`), idempotent by event id |

Line format: `{ pizzaId, size: small|medium|large, quantity 1-20, removedIngredients?, note? }` or `{ custom: { baseId, sauceId, cheeseId, veggieIds[≤6] }, name?, size, quantity }`.

## Notifications and misc

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/notifications` | user |
| POST | `/api/notifications/read-all` | user |
| PATCH, DELETE | `/api/notifications/:id` | user (`{ read }`) |
| POST | `/api/uploads` | admin (products, categories) / user (avatars). `{ folder, contentType, size }` → presigned R2 URL, 5 MB, JPG/PNG/WebP/AVIF |
| POST | `/api/contact` | public, 5/h |
| POST | `/api/newsletter` | public, 5/h |
| GET | `/api/cron/stock-alerts`, `/api/cron/expire-payments` | `Authorization: Bearer CRON_SECRET` |

## Admin (role ADMIN)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/admin/bootstrap` | Everything the panel lists (latest 500 orders) |
| GET | `/api/admin/stats?days=30` or `?from=&to=` | Revenue, orders, average basket, cancel rate, series, top products, categories, districts, payments, new customers, low stock |
| GET | `/api/admin/activity` | Activity feed |
| POST | `/api/admin/pizzas` | Create |
| PUT, PATCH, DELETE | `/api/admin/pizzas/:id` | Update / `{ active }` / soft delete. Replaced R2 images are deleted |
| POST | `/api/admin/categories` | |
| PUT, DELETE | `/api/admin/categories/:id` | Delete refused while pizzas use it |
| POST | `/api/admin/categories/:id/move` | `{ direction: -1\|1 }` |
| POST | `/api/admin/ingredients` | Builder ingredient with initial stock |
| PUT, DELETE | `/api/admin/ingredients/:id` | |
| POST | `/api/admin/ingredients/:id/stock` | `{ kind: in\|out, quantity, note }`, never below zero |
| PUT | `/api/admin/ingredients/:id/threshold` | `{ threshold }` |
| GET | `/api/admin/stock` | Low stock + movements |
| GET | `/api/admin/orders` | `status, q, from, to, take` |
| PATCH | `/api/admin/orders/:id/status` | `{ status, note? }`. Forward-only; online orders must be paid first |
| GET | `/api/admin/customers` | |
| GET, PATCH | `/api/admin/customers/:id` | `{ status: active\|blocked }` (also bans the Supabase user) |
| GET, POST | `/api/admin/promotions` | |
| PUT, DELETE | `/api/admin/promotions/:id` | |
| GET | `/api/admin/reviews` | |
| PATCH, DELETE | `/api/admin/reviews/:id` | `{ published }`, refreshes the pizza rating |
| GET, PUT | `/api/admin/settings` | Partial update |
