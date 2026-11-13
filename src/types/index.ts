/* ---------- Catalog ---------- */

export type PizzaSize = 'small' | 'medium' | 'large';

/**
 * Raw text in both languages, for the admin forms. Display fields (name,
 * description...) are already in the request language; English falls back
 * to French when empty.
 */
export interface Translations<K extends string> {
  fr: Record<K, string>;
  en: Record<K, string>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  translations: Translations<'name' | 'description'>;
  image: string;
  order: number;
  active: boolean;
}

export interface Pizza {
  id: string;
  slug: string;
  name: string;
  description: string;
  longDescription: string;
  translations: Translations<'name' | 'description' | 'longDescription'>;
  categoryId: string;
  image: string;
  /** Price in cents for the medium size. */
  price: number;
  /** Optional crossed-out price in cents. */
  oldPrice?: number;
  /** Recipe toppings in the request language. */
  ingredients: string[];
  /** Recipe toppings, French names (the ones the admin edits and the API stores). */
  ingredientsFr: string[];
  rating: number;
  reviewCount: number;
  prepMinutes: number;
  calories: number;
  isPopular?: boolean;
  isNew?: boolean;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  active: boolean;
  createdAt: string;
}

export type IngredientType = 'base' | 'sauce' | 'cheese' | 'veggie';

export interface Ingredient {
  id: string;
  type: IngredientType;
  name: string;
  description: string;
  translations: Translations<'name' | 'description'>;
  /** Extra price in cents when used in the builder. */
  price: number;
  /** Visual color used by the pizza preview. */
  color: string;
  unit: StockUnit;
  stock: number;
  threshold: number;
  active: boolean;
}

export type StockUnit = 'kg' | 'L' | 'pièces' | 'g';

export interface StockMovement {
  id: string;
  ingredientId: string;
  kind: 'in' | 'out' | 'threshold';
  quantity: number;
  note: string;
  author: string;
  date: string;
}

/* ---------- Cart ---------- */

export interface CustomPizzaConfig {
  baseId: string;
  sauceId: string;
  cheeseId: string;
  veggieIds: string[];
}

export interface CartItem {
  id: string;
  pizzaId?: string;
  name: string;
  image?: string;
  size: PizzaSize;
  quantity: number;
  /** Unit price in cents (size and extras included). */
  unitPrice: number;
  removedIngredients?: string[];
  note?: string;
  custom?: CustomPizzaConfig;
}

/* ---------- Orders ---------- */

export type OrderStatus = 'received' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';
export type PaymentMethod = 'orange_money' | 'mtn_momo' | 'wave' | 'card' | 'cash';
export type DeliveryMode = 'standard' | 'express' | 'pickup';

export interface Address {
  id: string;
  label: string;
  street: string;
  district: string;
  city: string;
  details?: string;
  isDefault?: boolean;
}

export interface StatusEvent {
  status: OrderStatus;
  date: string;
  note?: string;
}

export interface Order {
  id: string;
  number: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  promoCode?: string;
  status: OrderStatus;
  history: StatusEvent[];
  address: Omit<Address, 'id' | 'label'>;
  deliveryMode: DeliveryMode;
  paymentMethod: PaymentMethod;
  paymentStatus: 'paid' | 'pending' | 'refunded' | 'failed' | 'cancelled';
  createdAt: string;
}

/* ---------- Users ---------- */

export type Role = 'client' | 'admin';

export interface User {
  id: string;
  role: Role;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar?: string;
  createdAt: string;
  emailVerified: boolean;
  addresses: Address[];
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  createdAt: string;
  status: 'active' | 'blocked';
}

/* ---------- Marketing ---------- */

export interface Promotion {
  id: string;
  code: string;
  label: string;
  translations: Translations<'label'>;
  kind: 'percent' | 'fixed';
  value: number;
  minOrder: number;
  startDate: string;
  endDate: string;
  active: boolean;
  usageCount: number;
  /** Null/undefined means unlimited. */
  maxUses?: number;
  maxUsesPerUser?: number;
  /** Cap in cents for percentage promotions. */
  maxDiscount?: number;
}

export interface Review {
  id: string;
  customerName: string;
  avatar?: string;
  pizzaId: string;
  /** Delivered order that made the review eligible. */
  orderId?: string;
  rating: number;
  comment: string;
  date: string;
  published: boolean;
}

export interface AppNotification {
  id: string;
  audience: Role;
  /** Null means every user of the audience. */
  userId?: string | null;
  title: string;
  message: string;
  kind: 'order' | 'promo' | 'stock' | 'system' | 'review';
  date: string;
  read: boolean;
  href?: string;
}

export interface ActivityLog {
  id: string;
  message: string;
  kind: 'order' | 'stock' | 'customer' | 'review' | 'catalog';
  date: string;
}

export interface RestaurantSettings {
  name: string;
  slogan: string;
  email: string;
  phone: string;
  address: string;
  openingHours: string;
  translations: Translations<'slogan' | 'openingHours'>;
  currency: 'USD';
  deliveryFee: number;
  expressFee: number;
  freeDeliveryFrom: number;
  defaultStockThreshold: number;
  showPromotionsBanner: boolean;
  showRatings: boolean;
  itemsPerPage: number;
  notifyNewOrders: boolean;
  notifyLowStock: boolean;
  notifyNewReviews: boolean;
  notifyByEmail: boolean;
}
