/**
 * Pure pricing and stock rules shared by the cart quote, the order creation
 * and the unit tests. No database access here: callers pass the rows.
 * All amounts are integers in US cents.
 */
import { CUSTOM_PIZZA_BASE_PRICE, SIZES } from '@/constants';
import type { PizzaSize } from '@/types';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';
import { messagesFor, type Messages } from '@/i18n/messages';
import { createFormat } from '@/lib/format';

export const MAX_VEGGIES = 6;
export const MAX_LINE_QUANTITY = 20;

/** Size prices are rounded to the nearest 50 cents (same rule as the UI). */
export const round50 = (value: number) => Math.round(value / 50) * 50;

export const sizePrice = (mediumPrice: number, size: PizzaSize) => round50(mediumPrice * SIZES[size].multiplier);

export const sizeFactor = (size: PizzaSize) => SIZES[size].multiplier;

export interface PricedComponent {
  id: string;
  name: string;
  kind: 'BASE' | 'SAUCE' | 'CHEESE' | 'VEGETABLE' | 'TOPPING';
  price: number;
  active: boolean;
  deleted: boolean;
}

export interface CustomSelection {
  baseId: string;
  sauceId: string;
  cheeseId: string;
  veggieIds: string[];
}

/** Validates a builder composition and returns its medium-size price. Throws a message in the language of `msg` on invalid input. */
export function customPizzaMediumPrice(
  selection: CustomSelection,
  components: Map<string, PricedComponent>,
  msg: Messages<'api'> = messagesFor(DEFAULT_LOCALE, 'api'),
): { price: number; parts: PricedComponent[] } {
  const pick = (id: string, kind: PricedComponent['kind'], label: string) => {
    const c = components.get(id);
    if (!c || c.kind !== kind) throw new Error(msg.invalidPart(label));
    if (!c.active || c.deleted) throw new Error(msg.partUnavailable(c.name));
    return c;
  };
  const base = pick(selection.baseId, 'BASE', msg.partBase);
  const sauce = pick(selection.sauceId, 'SAUCE', msg.partSauce);
  const cheese = pick(selection.cheeseId, 'CHEESE', msg.partCheese);
  const unique = Array.from(new Set(selection.veggieIds));
  if (unique.length !== selection.veggieIds.length) throw new Error(msg.duplicateVeggie);
  if (unique.length > MAX_VEGGIES) throw new Error(msg.maxVeggies(MAX_VEGGIES));
  const veggies = unique.map((id) => pick(id, 'VEGETABLE', msg.partVeggie));
  const parts = [base, sauce, cheese, ...veggies];
  return { price: CUSTOM_PIZZA_BASE_PRICE + parts.reduce((sum, p) => sum + p.price, 0), parts };
}

export interface PromoRule {
  code: string;
  kind: 'PERCENT' | 'FIXED';
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  startsAt: Date;
  endsAt: Date;
  active: boolean;
  deleted: boolean;
  maxUses: number | null;
  usageCount: number;
}

export type PromoCheck = { ok: true; discount: number } | { ok: false; reason: string };

/** Checks validity and computes the discount, capped by maxDiscount and by the subtotal. */
export function evaluatePromo(
  promo: PromoRule | null,
  subtotal: number,
  now = new Date(),
  usesByCustomer = 0,
  maxUsesPerUser: number | null = null,
  locale: Locale = DEFAULT_LOCALE,
): PromoCheck {
  const msg = messagesFor(locale, 'api');
  if (!promo || promo.deleted) return { ok: false, reason: msg.promoUnknown };
  if (!promo.active) return { ok: false, reason: msg.promoInactive };
  if (now < promo.startsAt) return { ok: false, reason: msg.promoNotYet };
  if (now > promo.endsAt) return { ok: false, reason: msg.promoExpired };
  if (promo.maxUses !== null && promo.usageCount >= promo.maxUses) return { ok: false, reason: msg.promoExhausted };
  if (maxUsesPerUser !== null && usesByCustomer >= maxUsesPerUser) return { ok: false, reason: msg.promoAlreadyUsed };
  if (subtotal < promo.minOrder) return { ok: false, reason: msg.promoMinimum(createFormat(locale).price(promo.minOrder)) };
  let raw = promo.kind === 'PERCENT' ? (subtotal * promo.value) / 100 : promo.value;
  if (promo.kind === 'PERCENT' && promo.maxDiscount) raw = Math.min(raw, promo.maxDiscount);
  // Discounts are exact to the cent.
  return { ok: true, discount: Math.min(Math.round(raw), subtotal) };
}

export interface DeliverySettings {
  deliveryFee: number;
  expressFee: number;
  freeDeliveryFrom: number;
}

export function deliveryFee(mode: 'standard' | 'express' | 'pickup', subtotal: number, settings: DeliverySettings): number {
  if (mode === 'pickup' || subtotal === 0) return 0;
  if (mode === 'express') return settings.expressFee;
  return subtotal >= settings.freeDeliveryFrom ? 0 : settings.deliveryFee;
}

/** Stock needed for `quantity` pizzas of `size`, in the ingredient unit (3 decimals). */
export const stockNeed = (usagePerPizza: number, size: PizzaSize, quantity: number) => Math.round(usagePerPizza * sizeFactor(size) * quantity * 1000) / 1000;

/** Adds `qty` to the requirement map. */
export function addNeed(needs: Map<string, number>, ingredientId: string, qty: number) {
  if (qty <= 0) return;
  needs.set(ingredientId, Math.round(((needs.get(ingredientId) ?? 0) + qty) * 1000) / 1000);
}
