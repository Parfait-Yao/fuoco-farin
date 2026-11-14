import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import { beforeAll, describe, expect, it } from 'vitest';
import { prepareDatabase, TEST_DB } from './setup';

/*
 * End-to-end business rules on a real PostgreSQL database:
 * server pricing, transactional stock, concurrency, promotions, status flow,
 * payment idempotency, statistics, low-stock alerts and auth triggers.
 * Run: TEST_DATABASE_URL=postgresql://... pnpm test:integration
 */

type Services = {
  prisma: typeof import('@/lib/prisma').prisma;
  orderService: typeof import('@/server/services/orderService').orderService;
  paymentService: typeof import('@/server/services/paymentService').paymentService;
  stockService: typeof import('@/server/services/stockService').stockService;
  statsService: typeof import('@/server/services/statsService').statsService;
  cartService: typeof import('@/server/services/cartService').cartService;
  promotionService: typeof import('@/server/services/marketingService').promotionService;
  reviewService: typeof import('@/server/services/marketingService').reviewService;
};
let s: Services;

/** Stripe-Signature header for a test payload (same secret as tests/integration/setup.ts). */
const stripeSignature = (payload: string) => new Stripe('sk_test_integration').webhooks.generateTestHeaderString({ payload, secret: 'whsec_test' });

const contact = { fullName: 'Awa Koné', email: 'awa@test.ci', phone: '+225 07 00 00 00 00' };
const address = { street: 'Rue des Jardins 12', district: 'Cocody', city: 'Abidjan' };

async function makeUser(role: 'CLIENT' | 'ADMIN' = 'CLIENT') {
  return s.prisma.user.create({ data: { id: randomUUID(), email: `${randomUUID()}@test.ci`, role, firstName: 'Test', lastName: role, emailVerifiedAt: new Date() } });
}
const pizza = (slug: string) => s.prisma.pizza.findUniqueOrThrow({ where: { slug }, include: { ingredients: { include: { ingredient: true } } } });
const ingredient = (code: string) => s.prisma.ingredient.findUniqueOrThrow({ where: { code } });

describe.skipIf(!TEST_DB)('integration (TEST_DATABASE_URL)', () => {
  beforeAll(async () => {
    prepareDatabase();
    s = {
      prisma: (await import('@/lib/prisma')).prisma,
      orderService: (await import('@/server/services/orderService')).orderService,
      paymentService: (await import('@/server/services/paymentService')).paymentService,
      stockService: (await import('@/server/services/stockService')).stockService,
      statsService: (await import('@/server/services/statsService')).statsService,
      cartService: (await import('@/server/services/cartService')).cartService,
      promotionService: (await import('@/server/services/marketingService')).promotionService,
      reviewService: (await import('@/server/services/marketingService')).reviewService,
    };
  }, 180_000);

  it('auth trigger creates CLIENT profiles and ignores a role in metadata', async () => {
    const id = randomUUID();
    await s.prisma.$executeRawUnsafe(`INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ('${id}', 'Hacker@Test.ci', '{"role":"admin","first_name":"H"}')`);
    const profile = await s.prisma.user.findUniqueOrThrow({ where: { id } });
    expect(profile.role).toBe('CLIENT');
    expect(profile.email).toBe('hacker@test.ci');
  });

  it('prices orders on the server and stores an immutable snapshot', async () => {
    const margherita = await pizza('margherita-reale');
    const order = await s.orderService.create(
      { items: [{ pizzaId: margherita.id, size: 'large', quantity: 2, removedIngredients: ['Basilic', 'Not a topping'] }], deliveryMode: 'standard', contact, address, paymentMethod: 'cash' },
      null,
    );
    const unit = Math.round((margherita.price * 1.35) / 50) * 50;
    expect(order.subtotal).toBe(unit * 2);
    expect(order.deliveryFee).toBe(unit * 2 >= 20_000 ? 0 : 1000);
    expect(order.total).toBe(order.subtotal + order.deliveryFee);
    expect(order.items[0].removedIngredients).toEqual(['Basilic']);

    // A later price change does not touch the order.
    await s.prisma.pizza.update({ where: { id: margherita.id }, data: { price: 99_000, name: 'Renamed' } });
    const again = await s.prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id } });
    expect(again.unitPrice).toBe(unit);
    expect(again.name).toBe('Margherita Reale');
    await s.prisma.pizza.update({ where: { id: margherita.id }, data: { price: margherita.price, name: margherita.name } });
  });

  it('prices a builder pizza from the database and reserves its stock', async () => {
    const [base, sauce, cheese, veg] = await Promise.all([ingredient('base-whole'), ingredient('sauce-pesto'), ingredient('cheese-cheddar'), ingredient('veg-corn')]);
    const before = Number(base.stock);
    const order = await s.orderService.create(
      { items: [{ custom: { baseId: base.id, sauceId: sauce.id, cheeseId: cheese.id, veggieIds: [veg.id] }, name: 'Ma pizza', size: 'medium', quantity: 1, removedIngredients: [] }], deliveryMode: 'pickup', contact, address, paymentMethod: 'cash' },
      null,
    );
    expect(order.subtotal).toBe(900 + base.price + sauce.price + cheese.price + veg.price);
    expect(Number((await ingredient('base-whole')).stock)).toBeCloseTo(before - Number(base.usagePerPizza), 3);
    const movement = await s.prisma.stockMovement.findFirstOrThrow({ where: { orderId: order.id, ingredientId: base.id } });
    expect(movement.kind).toBe('ORDER');
  });

  it('rolls back everything when an ingredient is out of stock', async () => {
    const gluten = await ingredient('base-gluten');
    const sauce = await ingredient('sauce-tomato');
    const cheese = await ingredient('cheese-mozza');
    await s.prisma.ingredient.update({ where: { id: gluten.id }, data: { stock: 0.1 } });
    const ordersBefore = await s.prisma.order.count();
    const sauceBefore = Number((await ingredient('sauce-tomato')).stock);
    await expect(
      s.orderService.create({ items: [{ custom: { baseId: gluten.id, sauceId: sauce.id, cheeseId: cheese.id, veggieIds: [] }, size: 'medium', quantity: 1, removedIngredients: [] }], deliveryMode: 'pickup', contact, address, paymentMethod: 'cash' }, null),
    ).rejects.toMatchObject({ code: 'OUT_OF_STOCK' });
    expect(await s.prisma.order.count()).toBe(ordersBefore);
    expect(Number((await ingredient('sauce-tomato')).stock)).toBe(sauceBefore);
  });

  it('never lets concurrent orders push stock below zero', async () => {
    const stuffed = await ingredient('base-stuffed');
    const sauce = await ingredient('sauce-cream');
    const cheese = await ingredient('cheese-gorgonzola');
    // Room for exactly 3 medium pizzas.
    await s.prisma.ingredient.update({ where: { id: stuffed.id }, data: { stock: Number(stuffed.usagePerPizza) * 3 } });
    const attempts = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        s.orderService.create({ items: [{ custom: { baseId: stuffed.id, sauceId: sauce.id, cheeseId: cheese.id, veggieIds: [] }, size: 'medium', quantity: 1, removedIngredients: [] }], deliveryMode: 'pickup', contact, address, paymentMethod: 'cash' }, null),
      ),
    );
    expect(attempts.filter((a) => a.status === 'fulfilled')).toHaveLength(3);
    expect(Number((await ingredient('base-stuffed')).stock)).toBe(0);
  });

  it('cancelling restores stock and promo usage; clients cannot cancel once in the kitchen', async () => {
    const client = await makeUser();
    const admin = await makeUser('ADMIN');
    const diavola = await pizza('diavola-abidjan');
    const promo = await s.prisma.promotion.findUniqueOrThrow({ where: { code: 'FUOCO2000' } });
    const dough = await ingredient('base-classic');
    const order = await s.orderService.create({ items: [{ pizzaId: diavola.id, size: 'large', quantity: 2, removedIngredients: [] }], deliveryMode: 'express', promoCode: 'FUOCO2000', contact, address, paymentMethod: 'cash' }, client);
    expect(order.discount).toBe(2000);
    expect((await s.prisma.promotion.findUniqueOrThrow({ where: { id: promo.id } })).usageCount).toBe(promo.usageCount + 1);

    await s.orderService.updateStatus(order.id, 'preparing', admin);
    await expect(s.orderService.cancel(order.id, client)).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(s.orderService.updateStatus(order.id, 'received', admin)).rejects.toMatchObject({ code: 'CONFLICT' });

    await s.orderService.cancel(order.id, admin, 'Rupture livreur');
    expect(Number((await ingredient('base-classic')).stock)).toBeCloseTo(Number(dough.stock), 3);
    expect((await s.prisma.promotion.findUniqueOrThrow({ where: { id: promo.id } })).usageCount).toBe(promo.usageCount);
    // Idempotent release.
    await expect(s.orderService.cancel(order.id, admin)).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(Number((await ingredient('base-classic')).stock)).toBeCloseTo(Number(dough.stock), 3);
  });

  it('enforces promo caps atomically and per customer', async () => {
    const napoli = await pizza('napoli');
    await s.prisma.promotion.create({ data: { code: 'ONCE', label: 'Unique', kind: 'FIXED', value: 500, minOrder: 0, startsAt: new Date(Date.now() - 1000), endsAt: new Date(Date.now() + 86_400_000), maxUses: 1 } });
    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () => s.orderService.create({ items: [{ pizzaId: napoli.id, size: 'small', quantity: 1, removedIngredients: [] }], deliveryMode: 'pickup', promoCode: 'ONCE', contact, address, paymentMethod: 'cash' }, null)),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);

    const client = await makeUser();
    const line = { pizzaId: napoli.id, size: 'medium' as const, quantity: 1, removedIngredients: [] };
    await s.orderService.create({ items: [line], deliveryMode: 'pickup', promoCode: 'BIENVENUE10', contact, address, paymentMethod: 'cash' }, client);
    await expect(s.orderService.create({ items: [line], deliveryMode: 'pickup', promoCode: 'BIENVENUE10', contact, address, paymentMethod: 'cash' }, client)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('online orders: unpaid orders cannot move; webhook is idempotent and marks paid once', async () => {
    const admin = await makeUser('ADMIN');
    const client = await makeUser();
    const pepperoni = await pizza('pepperoni-classica');
    const order = await s.orderService.create({ items: [{ pizzaId: pepperoni.id, size: 'medium', quantity: 1, removedIngredients: [] }], deliveryMode: 'pickup', contact, address, paymentMethod: 'card' }, client);
    expect(order.paymentStatus).toBe('pending');
    await expect(s.orderService.updateStatus(order.id, 'preparing', admin)).rejects.toMatchObject({ code: 'CONFLICT' });

    // Simulate the Stripe Checkout Session created at checkout (no network in tests).
    const sessionId = `cs_test_${randomUUID().slice(0, 8)}`;
    await s.prisma.payment.create({ data: { orderId: order.id, provider: 'STRIPE', amount: order.total, currency: 'usd', providerOrderId: sessionId } });

    const event = (id: string, amount = order.total) =>
      JSON.stringify({ id, object: 'event', type: 'checkout.session.completed', data: { object: { id: sessionId, object: 'checkout.session', payment_status: 'paid', amount_total: amount, currency: 'usd', payment_intent: 'pi_1', client_reference_id: order.id } } });
    const body = event('evt_1');
    await expect(s.paymentService.handleWebhook(body, 'bad')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(await s.paymentService.handleWebhook(body, stripeSignature(body))).toEqual({ duplicate: false });
    expect(await s.paymentService.handleWebhook(body, stripeSignature(body))).toEqual({ duplicate: true });

    const paid = await s.prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(paid.paymentStatus).toBe('PAID');
    const notes = await s.prisma.notification.count({ where: { userId: client.id, title: 'Paiement confirmé' } });
    expect(notes).toBe(1);
    // A replay with another event id does not notify twice either.
    await s.paymentService.handleWebhook(event('evt_2'), stripeSignature(event('evt_2')));
    expect(await s.prisma.notification.count({ where: { userId: client.id, title: 'Paiement confirmé' } })).toBe(1);

    await s.orderService.updateStatus(order.id, 'preparing', admin);
    const history = await s.prisma.orderStatusHistory.findMany({ where: { orderId: order.id } });
    expect(history.map((h) => h.status)).toEqual(['RECEIVED', 'IN_KITCHEN']);
  });

  it('a webhook with a wrong amount is ignored', async () => {
    const client = await makeUser();
    const napoli = await pizza('napoli');
    const order = await s.orderService.create({ items: [{ pizzaId: napoli.id, size: 'medium', quantity: 1, removedIngredients: [] }], deliveryMode: 'pickup', contact, address, paymentMethod: 'card' }, client);
    await s.prisma.payment.create({ data: { orderId: order.id, provider: 'STRIPE', amount: order.total, currency: 'usd', providerOrderId: 'cs_test_amount' } });
    const body = JSON.stringify({ id: 'evt_amount', object: 'event', type: 'checkout.session.completed', data: { object: { id: 'cs_test_amount', payment_status: 'paid', amount_total: 1, currency: 'usd', payment_intent: 'pi_x' } } });
    await s.paymentService.handleWebhook(body, stripeSignature(body));
    expect((await s.prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe('PENDING');
  });

  it('unpaid online orders expire and release their stock', async () => {
    const client = await makeUser();
    const napoli = await pizza('napoli');
    const dough = Number((await ingredient('base-classic')).stock);
    const order = await s.orderService.create({ items: [{ pizzaId: napoli.id, size: 'medium', quantity: 1, removedIngredients: [] }], deliveryMode: 'pickup', contact, address, paymentMethod: 'card' }, client);
    await s.prisma.order.update({ where: { id: order.id }, data: { createdAt: new Date(Date.now() - 3_600_000) } });
    expect(await s.orderService.expireUnpaid(30)).toBeGreaterThanOrEqual(1);
    const expired = await s.prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(expired.status).toBe('CANCELLED');
    expect(Number((await ingredient('base-classic')).stock)).toBeCloseTo(dough, 3);
  });

  it('cash orders become paid on delivery; reviews need a delivered order', async () => {
    const admin = await makeUser('ADMIN');
    const client = await makeUser();
    const yassa = await pizza('poulet-yassa');
    const order = await s.orderService.create({ items: [{ pizzaId: yassa.id, size: 'medium', quantity: 1, removedIngredients: [] }], deliveryMode: 'pickup', contact, address, paymentMethod: 'cash' }, client);
    await expect(s.reviewService.create(client, { orderId: order.id, pizzaId: yassa.id, rating: 5, comment: 'Excellente !' })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    // The customer who receives the order closes it, not the admin.
    await expect(s.orderService.confirmReceipt(order.id, client)).rejects.toMatchObject({ code: 'CONFLICT' });
    await s.orderService.updateStatus(order.id, 'delivering', admin);
    await expect(s.orderService.updateStatus(order.id, 'delivered', admin)).rejects.toMatchObject({ code: 'CONFLICT' });
    const stranger = await makeUser();
    await expect(s.orderService.confirmReceipt(order.id, stranger)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    const received = await s.orderService.confirmReceipt(order.id, client);
    expect(received.status).toBe('delivered');
    expect((await s.prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe('PAID');
    expect(await s.prisma.payment.count({ where: { orderId: order.id, provider: 'CASH', status: 'CAPTURED' } })).toBe(1);
    await expect(s.orderService.confirmReceipt(order.id, client)).rejects.toMatchObject({ code: 'CONFLICT' });
    const review = await s.reviewService.create(client, { orderId: order.id, pizzaId: yassa.id, rating: 4, comment: 'Très bonne pizza' });
    expect(review.published).toBe(false);
    await s.reviewService.setPublished(review.id, true, admin.id);
    const rated = await s.prisma.pizza.findUniqueOrThrow({ where: { id: yassa.id } });
    expect(rated.reviewCount).toBe(1);
    expect(Number(rated.ratingAvg)).toBe(4);
    // Another client cannot review this order.
    const other = await makeUser();
    await expect(s.reviewService.create(other, { orderId: order.id, pizzaId: yassa.id, rating: 1, comment: 'Pas à moi' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('low-stock alert is sent once per threshold crossing', async () => {
    await makeUser('ADMIN');
    const corn = await ingredient('veg-corn');
    await s.prisma.ingredient.update({ where: { id: corn.id }, data: { stock: 1, threshold: 5, lowStockAlertedAt: null } });
    expect(await s.stockService.checkLowStock([corn.id])).toBe(1);
    expect(await s.stockService.checkLowStock([corn.id])).toBe(0);
    await s.prisma.ingredient.update({ where: { id: corn.id }, data: { stock: 10 } });
    await s.stockService.checkLowStock([corn.id]);
    await s.prisma.ingredient.update({ where: { id: corn.id }, data: { stock: 2 } });
    expect(await s.stockService.checkLowStock([corn.id])).toBe(1);
  });

  it('manual stock moves never go below zero', async () => {
    const admin = await makeUser('ADMIN');
    const olive = await ingredient('veg-olive');
    await expect(s.stockService.move(olive.id, 'out', Number(olive.stock) + 1, '', admin.id)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    const { ingredient: after } = await s.stockService.move(olive.id, 'in', 2.5, 'Livraison', admin.id);
    expect(after.stock).toBeCloseTo(Number(olive.stock) + 2.5, 3);
  });

  it('server cart prices lines and flags unavailable ones', async () => {
    const client = await makeUser();
    const napoli = await pizza('napoli');
    const cart = await s.cartService.replace(client, [{ pizzaId: napoli.id, size: 'large', quantity: 3, removedIngredients: [] }]);
    expect(cart.items[0].unitPrice).toBe(Math.round((napoli.price * 1.35) / 50) * 50);
    await s.prisma.pizza.update({ where: { id: napoli.id }, data: { active: false } });
    const after = await s.cartService.get(client);
    expect(after.items[0].available).toBe(false);
    await s.prisma.pizza.update({ where: { id: napoli.id }, data: { active: true } });
  });

  it('statistics come from real orders', async () => {
    const stats = await s.statsService.overview(s.statsService.periodRange(30));
    const valid = await s.prisma.order.findMany({ where: { status: { not: 'CANCELLED' }, OR: [{ paymentStatus: 'PAID' }, { paymentMethod: 'CASH' }] } });
    expect(stats.revenue).toBe(valid.reduce((n, o) => n + o.total, 0));
    expect(stats.validOrders).toBe(valid.length);
    expect(stats.series).toHaveLength(30);
    expect(stats.series.reduce((n, p) => n + p.revenue, 0)).toBe(stats.revenue);
    expect(stats.topProducts.length).toBeGreaterThan(0);
  });
});
