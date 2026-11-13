import { CUSTOM_PIZZA_BASE_PRICE, SIZES } from '@/constants';
import type { CartItem, CustomPizzaConfig, DeliveryMode, Ingredient, PizzaSize, Promotion, RestaurantSettings } from '@/types';

/** Amounts are in cents. Size prices are rounded to the nearest 50 cents (same rule as the server). */
const round50 = (value: number) => Math.round(value / 50) * 50;

export function sizePrice(mediumPrice: number, size: PizzaSize): number {
  return round50(mediumPrice * SIZES[size].multiplier);
}

export function customPizzaPrice(config: Partial<CustomPizzaConfig>, ingredients: Ingredient[], size: PizzaSize = 'medium'): number {
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const ids = [config.baseId, config.sauceId, config.cheeseId, ...(config.veggieIds ?? [])].filter(Boolean) as string[];
  const extras = ids.reduce((sum, id) => sum + (byId.get(id)?.price ?? 0), 0);
  return sizePrice(CUSTOM_PIZZA_BASE_PRICE + extras, size);
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function deliveryFee(mode: DeliveryMode, subtotal: number, settings: Pick<RestaurantSettings, 'deliveryFee' | 'expressFee' | 'freeDeliveryFrom'>): number {
  if (mode === 'pickup' || subtotal === 0) return 0;
  if (mode === 'express') return settings.expressFee;
  return subtotal >= settings.freeDeliveryFrom ? 0 : settings.deliveryFee;
}

export function promoDiscount(promo: Promotion | null | undefined, subtotal: number): number {
  if (!promo || subtotal < promo.minOrder) return 0;
  let raw = promo.kind === 'percent' ? (subtotal * promo.value) / 100 : promo.value;
  if (promo.kind === 'percent' && promo.maxDiscount) raw = Math.min(raw, promo.maxDiscount);
  // Discounts are exact to the cent (same rule as the server).
  return Math.min(Math.round(raw), subtotal);
}
