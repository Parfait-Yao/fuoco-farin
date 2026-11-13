import { describe, expect, it } from 'vitest';
import {
  addNeed,
  customPizzaMediumPrice,
  deliveryFee,
  evaluatePromo,
  round50,
  sizePrice,
  stockNeed,
  type PricedComponent,
  type PromoRule,
} from '@/server/domain/pricing';
import { stockLinksFor, slugify } from '@/server/domain/stockLinks';
import { CUSTOM_PIZZA_BASE_PRICE } from '@/constants';

const c = (id: string, kind: PricedComponent['kind'], price: number, extra: Partial<PricedComponent> = {}): PricedComponent => ({ id, name: id, kind, price, active: true, deleted: false, ...extra });
const components = new Map(
  [c('b1', 'BASE', 0), c('b2', 'BASE', 500), c('s1', 'SAUCE', 300), c('c1', 'CHEESE', 400), c('v1', 'VEGETABLE', 300), c('v2', 'VEGETABLE', 200), c('off', 'VEGETABLE', 100, { active: false })].map((x) => [x.id, x]),
);

describe('size pricing', () => {
  it('rounds size prices to 50 cents', () => {
    expect(round50(1024)).toBe(1000);
    expect(round50(1025)).toBe(1050);
  });
  it('applies size multipliers on the medium price', () => {
    expect(sizePrice(6500, 'medium')).toBe(6500);
    expect(sizePrice(6500, 'small')).toBe(5200);
    expect(sizePrice(6500, 'large')).toBe(8800); // 8775 rounded
  });
});

describe('custom pizza', () => {
  it('sums base price and every component', () => {
    const { price, parts } = customPizzaMediumPrice({ baseId: 'b2', sauceId: 's1', cheeseId: 'c1', veggieIds: ['v1', 'v2'] }, components);
    expect(price).toBe(CUSTOM_PIZZA_BASE_PRICE + 500 + 300 + 400 + 300 + 200);
    expect(parts).toHaveLength(5);
  });
  it('rejects a component of the wrong kind', () => {
    expect(() => customPizzaMediumPrice({ baseId: 's1', sauceId: 's1', cheeseId: 'c1', veggieIds: [] }, components)).toThrow('Base invalide');
  });
  it('rejects unavailable, duplicated or too many vegetables', () => {
    expect(() => customPizzaMediumPrice({ baseId: 'b1', sauceId: 's1', cheeseId: 'c1', veggieIds: ['off'] }, components)).toThrow('plus disponible');
    expect(() => customPizzaMediumPrice({ baseId: 'b1', sauceId: 's1', cheeseId: 'c1', veggieIds: ['v1', 'v1'] }, components)).toThrow('double');
    const many = new Map(components);
    for (let i = 0; i < 7; i += 1) many.set(`x${i}`, c(`x${i}`, 'VEGETABLE', 0));
    expect(() => customPizzaMediumPrice({ baseId: 'b1', sauceId: 's1', cheeseId: 'c1', veggieIds: ['x0', 'x1', 'x2', 'x3', 'x4', 'x5', 'x6'] }, many)).toThrow('Maximum 6');
  });
  it('rejects unknown ids', () => {
    expect(() => customPizzaMediumPrice({ baseId: 'nope', sauceId: 's1', cheeseId: 'c1', veggieIds: [] }, components)).toThrow();
  });
});

describe('promotions', () => {
  const now = new Date('2026-06-15T12:00:00Z');
  const promo: PromoRule = {
    code: 'TEST10',
    kind: 'PERCENT',
    value: 10,
    minOrder: 5000,
    maxDiscount: null,
    startsAt: new Date('2026-06-01'),
    endsAt: new Date('2026-07-01'),
    active: true,
    deleted: false,
    maxUses: null,
    usageCount: 0,
  };
  it('computes a percent discount exact to the cent', () => {
    expect(evaluatePromo(promo, 12_340, now)).toEqual({ ok: true, discount: 1234 });
  });
  it('caps percent discounts with maxDiscount', () => {
    expect(evaluatePromo({ ...promo, value: 50, maxDiscount: 3000 }, 20_000, now)).toEqual({ ok: true, discount: 3000 });
  });
  it('never discounts more than the subtotal', () => {
    expect(evaluatePromo({ ...promo, kind: 'FIXED', value: 9000, minOrder: 0 }, 6000, now)).toEqual({ ok: true, discount: 6000 });
  });
  it('rejects every invalid case with a reason', () => {
    const reasons = [
      evaluatePromo(null, 10_000, now),
      evaluatePromo({ ...promo, active: false }, 10_000, now),
      evaluatePromo({ ...promo, deleted: true }, 10_000, now),
      evaluatePromo(promo, 10_000, new Date('2026-05-01')),
      evaluatePromo(promo, 10_000, new Date('2026-08-01')),
      evaluatePromo({ ...promo, maxUses: 3, usageCount: 3 }, 10_000, now),
      evaluatePromo(promo, 10_000, now, 1, 1),
      evaluatePromo(promo, 1000, now),
    ];
    expect(reasons.every((r) => !r.ok)).toBe(true);
    const messages = reasons.map((r) => (r.ok ? '' : r.reason));
    expect(messages[0]).toBe('Code promotionnel inconnu.');
    expect(messages[3]).toBe('Ce code n’est pas encore valable.');
    expect(messages[4]).toBe('Ce code a expiré.');
    expect(messages[6]).toBe('Vous avez déjà utilisé ce code.');
    expect(messages[7]).toContain('Montant minimum requis');
  });
});

describe('delivery fee', () => {
  const settings = { deliveryFee: 1000, expressFee: 2000, freeDeliveryFrom: 20_000 };
  it('is free for pickup and above the threshold', () => {
    expect(deliveryFee('pickup', 50_000, settings)).toBe(0);
    expect(deliveryFee('standard', 20_000, settings)).toBe(0);
  });
  it('charges standard and express', () => {
    expect(deliveryFee('standard', 19_950, settings)).toBe(1000);
    expect(deliveryFee('express', 50_000, settings)).toBe(2000);
  });
});

describe('stock needs', () => {
  it('scales usage with size and quantity, 3 decimals', () => {
    expect(stockNeed(0.25, 'large', 3)).toBe(1.013); // 0.25 × 1.35 × 3 = 1.0125
    const needs = new Map<string, number>();
    addNeed(needs, 'a', 0.1);
    addNeed(needs, 'a', 0.2);
    addNeed(needs, 'b', 0);
    expect(needs).toEqual(new Map([['a', 0.3]]));
  });
});

describe('promo messages', () => {
  it('answers in the requested language, amounts in dollars', () => {
    const rule: PromoRule = { code: 'MIN', kind: 'FIXED', value: 500, minOrder: 4000, maxDiscount: null, startsAt: new Date('2026-01-01'), endsAt: new Date('2027-01-01'), active: true, deleted: false, maxUses: null, usageCount: 0 };
    const now = new Date('2026-06-15T12:00:00Z');
    expect(evaluatePromo(rule, 1000, now, 0, null, 'en')).toEqual({ ok: false, reason: 'Minimum order required: $40.00.' });
    expect(evaluatePromo(null, 1000, now, 0, null, 'en')).toEqual({ ok: false, reason: 'Unknown promo code.' });
  });
});

describe('stock links', () => {
  const stock = [
    { id: '1', code: 'base-classic', name: 'Pâte napolitaine', kind: 'BASE' },
    { id: '2', code: 'cheese-mozza', name: 'Mozzarella', kind: 'CHEESE' },
    { id: '3', code: 'sauce-tomato', name: 'Tomate San Marzano', kind: 'SAUCE' },
    { id: '4', code: 'veg-olive', name: 'Olives noires', kind: 'VEGETABLE' },
  ];
  it('links the default base and matching toppings (name or alias)', () => {
    expect(stockLinksFor(['Sauce tomate', 'Mozzarella', 'Olives', 'Basilic'], stock).sort()).toEqual(['1', '2', '3', '4']);
  });
  it('slugifies accents', () => {
    expect(slugify('Crème de truffe & cèpes')).toBe('creme-de-truffe-cepes');
  });
});
