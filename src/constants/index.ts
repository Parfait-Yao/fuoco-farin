import type { DeliveryMode, OrderStatus, PaymentMethod, PizzaSize } from '@/types';

export const BRAND = {
  name: 'Fuoco & Farina',
  short: 'Fuoco',
  phone: '+225 07 07 25 25 25',
  email: 'bonjour@fuoco-farina.ci',
  address: 'Rue des Jardins, Cocody Riviera 2, Abidjan',
} as const;

/** ISO 4217 code. Every money amount is an integer in cents. */
export const CURRENCY = 'USD';

export const ROUTES = {
  home: '/',
  menu: '/menu',
  pizza: (slug: string) => `/menu/${slug}`,
  builder: '/builder',
  about: '/about',
  advantages: '/advantages',
  contact: '/contact',
  faq: '/faq',
  terms: '/terms',
  privacy: '/privacy',
  cart: '/cart',
  checkout: '/checkout',
  confirmation: (id: string) => `/checkout/confirmation/${id}`,
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',
  unauthorized: '/unauthorized',
  account: {
    root: '/account',
    profile: '/account/profile',
    editProfile: '/account/profile/edit',
    addresses: '/account/addresses',
    orders: '/account/orders',
    order: (id: string) => `/account/orders/${id}`,
    tracking: (id: string) => `/account/orders/${id}/tracking`,
    favorites: '/account/favorites',
    notifications: '/account/notifications',
    settings: '/account/settings',
    security: '/account/security',
  },
  admin: {
    login: '/admin/login',
    root: '/admin',
    orders: '/admin/orders',
    order: (id: string) => `/admin/orders/${id}`,
    products: '/admin/products',
    categories: '/admin/categories',
    ingredients: '/admin/ingredients',
    stock: '/admin/stock',
    customers: '/admin/customers',
    customer: (id: string) => `/admin/customers/${id}`,
    promotions: '/admin/promotions',
    reviews: '/admin/reviews',
    notifications: '/admin/notifications',
    reports: '/admin/reports',
    settings: '/admin/settings',
  },
} as const;

/** Size factors applied to the medium price. Labels and diameters: messages `domain.sizes`. */
export const SIZES: Record<PizzaSize, { multiplier: number }> = {
  small: { multiplier: 0.8 },
  medium: { multiplier: 1 },
  large: { multiplier: 1.35 },
};
export const PIZZA_SIZES: PizzaSize[] = ['small', 'medium', 'large'];

/** Chip color of each order status. Labels: messages `domain.orderStatus`. */
export const ORDER_STATUS_COLOR: Record<OrderStatus, 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'> = {
  received: 'info',
  preparing: 'warning',
  delivering: 'secondary',
  delivered: 'success',
  cancelled: 'error',
};

/** Ordered flow used by the tracking timeline. */
export const ORDER_FLOW: OrderStatus[] = ['received', 'preparing', 'delivering', 'delivered'];

/** Every payment method, including legacy ones kept for order history. Labels: messages `domain.payment`. */
export const PAYMENT_METHOD_KEYS: PaymentMethod[] = ['orange_money', 'mtn_momo', 'wave', 'card', 'cash'];

/**
 * Methods offered at checkout. Online payment goes through Stripe; mobile
 * money labels stay for history but are not offered until a provider
 * supporting them is integrated.
 */
export const ENABLED_PAYMENT_METHODS: PaymentMethod[] = ['card', 'cash'];

export const DELIVERY_MODE_KEYS: DeliveryMode[] = ['standard', 'express', 'pickup'];

export const INGREDIENT_TYPE_KEYS = ['base', 'sauce', 'cheese', 'veggie'] as const;

/** Medium-size price of a builder pizza before extras, in cents. */
export const CUSTOM_PIZZA_BASE_PRICE = 900;

export const ABIDJAN_DISTRICTS = [
  'Cocody',
  'Plateau',
  'Marcory',
  'Treichville',
  'Yopougon',
  'Koumassi',
  'Abobo',
  'Adjamé',
  'Port-Bouët',
  'Bingerville',
];

/** Shown until /api/catalog answers; the database values replace them. */
export const DEFAULT_SETTINGS = {
  name: BRAND.name,
  slogan: '',
  email: BRAND.email,
  phone: BRAND.phone,
  address: BRAND.address,
  openingHours: '',
  translations: { fr: { slogan: '', openingHours: '' }, en: { slogan: '', openingHours: '' } },
  currency: 'USD' as const,
  deliveryFee: 399,
  expressFee: 699,
  freeDeliveryFrom: 3500,
  defaultStockThreshold: 5,
  showPromotionsBanner: true,
  showRatings: true,
  itemsPerPage: 9,
  notifyNewOrders: true,
  notifyLowStock: true,
  notifyNewReviews: true,
  notifyByEmail: false,
};
