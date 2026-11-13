import 'server-only';
import type {
  ActivityLog as DbActivity,
  Address as DbAddress,
  Category as DbCategory,
  Ingredient as DbIngredient,
  Notification as DbNotification,
  Order as DbOrder,
  OrderItem as DbOrderItem,
  OrderStatusHistory as DbHistory,
  Pizza as DbPizza,
  PizzaIngredient,
  Promotion as DbPromotion,
  RestaurantSettings as DbSettings,
  Review as DbReview,
  StockMovement as DbMovement,
  User as DbUser,
  Prisma,
} from '@prisma/client';
import type {
  ActivityLog,
  Address,
  AppNotification,
  CartItem,
  Category,
  Customer,
  Ingredient,
  Order,
  Pizza,
  Promotion,
  RestaurantSettings,
  Review,
  StockMovement,
  User,
} from '@/types';
import { getLocale, getMessages, pickLocalized } from '@/i18n/server';
import { renderActivity, renderNotification } from '@/i18n/events';
import {
  fromDeliveryMode,
  fromIngredientKind,
  fromOrderStatus,
  fromPaymentMethod,
  fromPaymentStatus,
  fromSize,
  fromStockUnit,
} from '@/server/enums';

/* The API speaks the frontend types (src/types). These mappers are the only
   place where database rows become API payloads. Display texts are in the
   request language (getLocale); `translations` carries both raw versions. */

const local = (fr: string, en: string | null | undefined) => pickLocalized(fr, en, getLocale());

const iso = (d: Date) => d.toISOString();
const num = (d: Prisma.Decimal | number) => Number(d);

export function toUser(u: DbUser, addresses: DbAddress[] = []): User {
  return {
    id: u.id,
    role: u.role === 'ADMIN' ? 'admin' : 'client',
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phone: u.phone,
    avatar: u.avatarUrl ?? undefined,
    createdAt: iso(u.createdAt),
    emailVerified: Boolean(u.emailVerifiedAt),
    addresses: addresses.map(toAddress),
  };
}

export function toAddress(a: DbAddress): Address {
  return { id: a.id, label: a.label, street: a.street, district: a.district, city: a.city, details: a.details ?? undefined, isDefault: a.isDefault };
}

export function toCustomer(u: DbUser & { addresses?: DbAddress[] }): Customer {
  const address = u.addresses?.find((a) => a.isDefault) ?? u.addresses?.[0];
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phone: u.phone,
    city: address?.city ?? '',
    createdAt: iso(u.createdAt),
    status: u.status === 'BLOCKED' ? 'blocked' : 'active',
  };
}

export function toCategory(c: DbCategory): Category {
  return {
    id: c.id,
    name: local(c.name, c.nameEn),
    slug: c.slug,
    description: local(c.description, c.descriptionEn),
    translations: { fr: { name: c.name, description: c.description }, en: { name: c.nameEn, description: c.descriptionEn } },
    image: c.imageUrl,
    order: c.sortOrder,
    active: c.active,
  };
}

type PizzaWithIngredients = DbPizza & { ingredients: (PizzaIngredient & { ingredient: DbIngredient })[] };

export function toPizza(p: PizzaWithIngredients): Pizza {
  return {
    id: p.id,
    slug: p.slug,
    name: local(p.name, p.nameEn),
    description: local(p.description, p.descriptionEn),
    longDescription: local(p.longDescription, p.longDescriptionEn),
    translations: {
      fr: { name: p.name, description: p.description, longDescription: p.longDescription },
      en: { name: p.nameEn, description: p.descriptionEn, longDescription: p.longDescriptionEn },
    },
    categoryId: p.categoryId,
    image: p.imageUrl,
    price: p.price,
    oldPrice: p.oldPrice ?? undefined,
    // Display names come from recipe toppings; stock items stay internal.
    ingredients: [...p.ingredients]
      .filter((pi) => pi.ingredient.kind === 'TOPPING')
      .sort((a, b) => a.position - b.position)
      .map((pi) => local(pi.ingredient.name, pi.ingredient.nameEn)),
    ingredientsFr: [...p.ingredients]
      .filter((pi) => pi.ingredient.kind === 'TOPPING')
      .sort((a, b) => a.position - b.position)
      .map((pi) => pi.ingredient.name),
    rating: Number(p.ratingAvg),
    reviewCount: p.reviewCount,
    prepMinutes: p.prepMinutes,
    calories: p.calories,
    isPopular: p.isPopular,
    isNew: p.isNew,
    isVegetarian: p.isVegetarian,
    isSpicy: p.isSpicy,
    active: p.active,
    createdAt: iso(p.createdAt),
  };
}

export function toIngredient(i: DbIngredient): Ingredient {
  return {
    id: i.id,
    type: fromIngredientKind(i.kind),
    name: local(i.name, i.nameEn),
    description: local(i.description, i.descriptionEn),
    translations: { fr: { name: i.name, description: i.description }, en: { name: i.nameEn, description: i.descriptionEn } },
    price: i.price,
    color: i.color,
    unit: fromStockUnit(i.unit),
    stock: num(i.stock),
    threshold: num(i.threshold),
    active: i.active,
  };
}

export function toMovement(m: DbMovement & { author?: Pick<DbUser, 'firstName' | 'lastName'> | null }): StockMovement {
  const quantity = num(m.quantity);
  const kind: StockMovement['kind'] = m.kind === 'THRESHOLD' ? 'threshold' : quantity >= 0 ? 'in' : 'out';
  return {
    id: m.id,
    ingredientId: m.ingredientId,
    kind,
    quantity: m.kind === 'THRESHOLD' ? num(m.stockAfter) : Math.abs(quantity),
    note: m.note ?? '',
    author: m.author ? `${m.author.firstName} ${m.author.lastName}`.trim() : m.kind === 'ORDER' || m.kind === 'ORDER_CANCEL' ? getMessages('domain').system : '—',
    date: iso(m.createdAt),
  };
}

/** Shape stored in OrderItem.customConfig. */
export interface CustomConfigSnapshot {
  baseId: string;
  sauceId: string;
  cheeseId: string;
  veggieIds: string[];
  components: { id: string; kind: string; name: string; price: number; quantity: number }[];
}

export function toOrderItem(i: DbOrderItem): CartItem {
  // Only a real builder snapshot (with a base) makes a custom pizza; `{}` or JSON null do not.
  const raw = i.customConfig as unknown as Partial<CustomConfigSnapshot> | null;
  const custom = raw && typeof raw === 'object' && raw.baseId ? (raw as CustomConfigSnapshot) : null;
  return {
    id: i.id,
    pizzaId: i.pizzaId ?? undefined,
    name: i.name,
    image: i.imageUrl ?? undefined,
    size: fromSize(i.size),
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    removedIngredients: i.removedIngredients.length ? i.removedIngredients : undefined,
    note: i.note ?? undefined,
    custom: custom ? { baseId: custom.baseId, sauceId: custom.sauceId, cheeseId: custom.cheeseId, veggieIds: custom.veggieIds } : undefined,
  };
}

export type OrderWithRelations = DbOrder & { items: DbOrderItem[]; history: DbHistory[] };

export function toOrder(o: OrderWithRelations): Order {
  return {
    id: o.id,
    number: o.number,
    customerId: o.userId,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    customerPhone: o.customerPhone,
    items: o.items.map(toOrderItem),
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    discount: o.discount,
    total: o.total,
    promoCode: o.promoCode ?? undefined,
    status: fromOrderStatus(o.status),
    history: [...o.history]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((h) => ({ status: fromOrderStatus(h.status), date: iso(h.createdAt), note: h.note ?? undefined })),
    address: { street: o.street ?? '', district: o.district ?? '', city: o.city ?? '', details: o.details ?? undefined },
    deliveryMode: fromDeliveryMode(o.deliveryMode),
    paymentMethod: fromPaymentMethod(o.paymentMethod),
    paymentStatus: fromPaymentStatus(o.paymentStatus),
    createdAt: iso(o.createdAt),
  };
}

export function toPromotion(p: DbPromotion): Promotion {
  return {
    id: p.id,
    code: p.code,
    label: local(p.label, p.labelEn),
    translations: { fr: { label: p.label }, en: { label: p.labelEn } },
    kind: p.kind === 'PERCENT' ? 'percent' : 'fixed',
    value: p.value,
    minOrder: p.minOrder,
    startDate: iso(p.startsAt),
    endDate: iso(p.endsAt),
    active: p.active,
    usageCount: p.usageCount,
    maxUses: p.maxUses ?? undefined,
    maxUsesPerUser: p.maxUsesPerUser ?? undefined,
    maxDiscount: p.maxDiscount ?? undefined,
  };
}

export function toReview(r: DbReview & { user: Pick<DbUser, 'firstName' | 'lastName' | 'avatarUrl'> }): Review {
  return {
    id: r.id,
    customerName: `${r.user.firstName} ${r.user.lastName.charAt(0)}${r.user.lastName ? '.' : ''}`.trim() || getMessages('domain').customer,
    avatar: r.user.avatarUrl ?? undefined,
    pizzaId: r.pizzaId,
    orderId: r.orderId,
    rating: r.rating,
    comment: r.comment,
    date: iso(r.createdAt),
    published: r.published,
  };
}

export function toNotification(n: DbNotification, role: 'client' | 'admin'): AppNotification {
  // Rendered in the reader's language; rows written before i18n only have the French text.
  const text = n.key ? renderNotification({ key: n.key, params: n.params }, getLocale()) : null;
  return {
    id: n.id,
    audience: role,
    userId: n.userId,
    title: text?.title ?? n.title,
    message: text?.message ?? n.message,
    kind: n.kind.toLowerCase() as AppNotification['kind'],
    date: iso(n.createdAt),
    read: Boolean(n.readAt),
    href: n.href ?? undefined,
  };
}

export function toActivity(a: DbActivity): ActivityLog {
  const message = a.key ? renderActivity({ key: a.key, params: a.params }, getLocale()) : null;
  return { id: a.id, message: message ?? a.message, kind: a.kind.toLowerCase() as ActivityLog['kind'], date: iso(a.createdAt) };
}

export function toSettings(s: DbSettings): RestaurantSettings {
  return {
    name: s.name,
    slogan: local(s.slogan, s.sloganEn),
    email: s.email,
    phone: s.phone,
    address: s.address,
    openingHours: local(s.openingHours, s.openingHoursEn),
    translations: { fr: { slogan: s.slogan, openingHours: s.openingHours }, en: { slogan: s.sloganEn, openingHours: s.openingHoursEn } },
    currency: 'USD',
    deliveryFee: s.deliveryFee,
    expressFee: s.expressFee,
    freeDeliveryFrom: s.freeDeliveryFrom,
    defaultStockThreshold: s.defaultStockThreshold,
    showPromotionsBanner: s.showPromotionsBanner,
    showRatings: s.showRatings,
    itemsPerPage: s.itemsPerPage,
    notifyNewOrders: s.notifyNewOrders,
    notifyLowStock: s.notifyLowStock,
    notifyNewReviews: s.notifyNewReviews,
    notifyByEmail: s.notifyByEmail,
  };
}
