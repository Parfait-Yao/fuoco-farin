/**
 * Links recipe toppings (free text shown on a pizza) to stock ingredients.
 * Business rule: a catalog pizza consumes the default base plus every stock
 * ingredient whose name (or alias) matches one of its toppings.
 * Pure module: used by the seed script and by the catalog service.
 */

export const DEFAULT_BASE_CODE = 'base-classic';

/** Topping name (lower case, no accents) to stock ingredient code. */
export const TOPPING_ALIASES: Record<string, string> = {
  'sauce tomate': 'sauce-tomato',
  'tomate': 'sauce-tomato',
  'creme': 'sauce-cream',
  'creme fraiche': 'sauce-cream',
  'pesto': 'sauce-pesto',
  'sauce epicee': 'sauce-spicy',
  'barbecue': 'sauce-bbq',
  'mozzarella': 'cheese-mozza',
  'cheddar': 'cheese-cheddar',
  'chevre': 'cheese-goat',
  'gorgonzola': 'cheese-gorgonzola',
  'champignons': 'veg-mushroom',
  'poivrons': 'veg-pepper',
  'oignons': 'veg-onion',
  'oignons rouges': 'veg-onion',
  'olives': 'veg-olive',
  'olives noires': 'veg-olive',
  'tomates cerises': 'veg-tomato',
  'epinards': 'veg-spinach',
  'mais': 'veg-corn',
  'plantain': 'veg-plantain',
};

export const normalizeName = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const slugify = (s: string) =>
  normalizeName(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export interface StockCandidate {
  id: string;
  code: string;
  name: string;
  kind: string;
}

/** Returns the ids of stock ingredients consumed by a pizza with these toppings. */
export function stockLinksFor(toppings: string[], stock: StockCandidate[]): string[] {
  const byCode = new Map(stock.map((s) => [s.code, s]));
  const byName = new Map(stock.map((s) => [normalizeName(s.name), s]));
  const ids = new Set<string>();
  const base = byCode.get(DEFAULT_BASE_CODE) ?? stock.find((s) => s.kind === 'BASE');
  if (base) ids.add(base.id);
  for (const topping of toppings) {
    const key = normalizeName(topping);
    const match = byName.get(key) ?? byCode.get(TOPPING_ALIASES[key] ?? '');
    if (match) ids.add(match.id);
  }
  return Array.from(ids);
}
