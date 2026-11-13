import type {
  DeliveryMode as DbDeliveryMode,
  IngredientKind,
  OrderStatus as DbOrderStatus,
  PaymentMethod as DbPaymentMethod,
  PaymentStatus as DbPaymentStatus,
  PizzaSize as DbPizzaSize,
  StockUnit,
} from '@prisma/client';
import type { DeliveryMode, IngredientType, Order, OrderStatus, PaymentMethod, PizzaSize, StockUnit as UiStockUnit } from '@/types';

/* Two-way mapping between database enums and the frontend string unions. */

const invert = <K extends string, V extends string>(map: Record<K, V>) =>
  Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k])) as Record<V, K>;

const ORDER_STATUS: Record<DbOrderStatus, OrderStatus> = {
  RECEIVED: 'received',
  IN_KITCHEN: 'preparing',
  SENT_FOR_DELIVERY: 'delivering',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};
const ORDER_STATUS_DB = invert(ORDER_STATUS);
export const fromOrderStatus = (s: DbOrderStatus) => ORDER_STATUS[s];
export const toDbOrderStatus = (s: OrderStatus) => ORDER_STATUS_DB[s];

const SIZE: Record<DbPizzaSize, PizzaSize> = { SMALL: 'small', MEDIUM: 'medium', LARGE: 'large' };
const SIZE_DB = invert(SIZE);
export const fromSize = (s: DbPizzaSize) => SIZE[s];
export const toDbSize = (s: PizzaSize) => SIZE_DB[s];

const DELIVERY: Record<DbDeliveryMode, DeliveryMode> = { STANDARD: 'standard', EXPRESS: 'express', PICKUP: 'pickup' };
const DELIVERY_DB = invert(DELIVERY);
export const fromDeliveryMode = (s: DbDeliveryMode) => DELIVERY[s];
export const toDbDeliveryMode = (s: DeliveryMode) => DELIVERY_DB[s];

const PAYMENT: Record<DbPaymentMethod, PaymentMethod> = {
  STRIPE: 'card',
  RAZORPAY: 'card',
  CARD: 'card',
  ORANGE_MONEY: 'orange_money',
  MTN_MOMO: 'mtn_momo',
  WAVE: 'wave',
  CASH: 'cash',
};
export const fromPaymentMethod = (s: DbPaymentMethod) => PAYMENT[s];
/** Online payments go through Stripe; cash is paid on delivery. */
export const toDbPaymentMethod = (s: PaymentMethod): DbPaymentMethod => (s === 'cash' ? 'CASH' : 'STRIPE');

const PAYMENT_STATUS: Record<DbPaymentStatus, Order['paymentStatus']> = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
};
export const fromPaymentStatus = (s: DbPaymentStatus) => PAYMENT_STATUS[s];

const KIND: Record<Exclude<IngredientKind, 'TOPPING'>, IngredientType> = { BASE: 'base', SAUCE: 'sauce', CHEESE: 'cheese', VEGETABLE: 'veggie' };
const KIND_DB = invert(KIND);
export const fromIngredientKind = (k: IngredientKind): IngredientType => (k === 'TOPPING' ? 'veggie' : KIND[k]);
export const toDbIngredientKind = (t: IngredientType) => KIND_DB[t];

const UNIT: Record<StockUnit, UiStockUnit> = { KG: 'kg', G: 'g', L: 'L', PIECE: 'pièces' };
const UNIT_DB = invert(UNIT);
export const fromStockUnit = (u: StockUnit) => UNIT[u];
export const toDbStockUnit = (u: UiStockUnit) => UNIT_DB[u];
