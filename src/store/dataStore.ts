'use client';

import { create } from 'zustand';
import type {
  ActivityLog,
  AppNotification,
  Category,
  Customer,
  Ingredient,
  Order,
  OrderStatus,
  Pizza,
  Promotion,
  RestaurantSettings,
  Review,
  StockMovement,
} from '@/types';
import { DEFAULT_SETTINGS } from '@/constants';
import { api } from '@/lib/api';

/**
 * Client cache of server data. Every mutation calls the API first and only
 * updates the cache with what the server returned, so the UI never shows a
 * state the database refused. Actions throw `ApiError` (French message).
 */
export type LoadState = 'idle' | 'loading' | 'ready' | 'error';
export type Scope = 'public' | 'client' | 'admin';

export interface PublicStats {
  deliveredPizzas: number;
  averageRating: number;
  averageDeliveryMinutes: number;
  districts: number;
}

interface PublicCatalog {
  stats: PublicStats;
  pizzas: Pizza[];
  categories: Category[];
  ingredients: Ingredient[];
  settings: RestaurantSettings;
  reviews: Review[];
  promotions: Promotion[];
}

interface AdminBootstrap {
  pizzas: Pizza[];
  categories: Category[];
  ingredients: Ingredient[];
  orders: Order[];
  customers: Customer[];
  promotions: Promotion[];
  reviews: Review[];
  stockMovements: StockMovement[];
  activity: ActivityLog[];
  settings: RestaurantSettings;
}

interface DataState {
  pizzas: Pizza[];
  categories: Category[];
  ingredients: Ingredient[];
  stockMovements: StockMovement[];
  orders: Order[];
  customers: Customer[];
  promotions: Promotion[];
  reviews: Review[];
  notifications: AppNotification[];
  activity: ActivityLog[];
  settings: RestaurantSettings;
  publicStats: PublicStats | null;
  status: Record<Scope, LoadState>;
  error: string | null;

  loadPublic: (force?: boolean) => Promise<void>;
  loadClient: (force?: boolean) => Promise<void>;
  loadAdmin: (force?: boolean) => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshOrder: (id: string) => Promise<Order | null>;
  refreshNotifications: () => Promise<void>;
  clearPrivate: () => void;

  upsertPizza: (pizza: Pizza) => Promise<Pizza>;
  setPizzaActive: (id: string, active: boolean) => Promise<void>;
  deletePizza: (id: string) => Promise<void>;
  upsertCategory: (category: Category) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  moveCategory: (id: string, direction: -1 | 1) => Promise<void>;
  upsertIngredient: (ingredient: Ingredient) => Promise<Ingredient>;
  deleteIngredient: (id: string) => Promise<void>;
  moveStock: (ingredientId: string, kind: 'in' | 'out', quantity: number, note: string) => Promise<void>;
  setThreshold: (ingredientId: string, threshold: number) => Promise<void>;
  setOrderStatus: (id: string, status: OrderStatus, note?: string) => Promise<Order>;
  cancelOrder: (id: string, reason?: string) => Promise<Order>;
  /** Customer confirms receipt: the order becomes delivered. */
  confirmReceipt: (id: string) => Promise<Order>;
  setCustomerStatus: (id: string, status: Customer['status']) => Promise<void>;
  upsertPromotion: (promotion: Promotion) => Promise<Promotion>;
  deletePromotion: (id: string) => Promise<void>;
  submitReview: (input: { orderId: string; pizzaId: string; rating: number; comment: string }) => Promise<Review>;
  setReviewPublished: (id: string, published: boolean) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
  markNotification: (id: string, read: boolean) => Promise<void>;
  markAllNotifications: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<RestaurantSettings>) => Promise<void>;
}

const upsert = <T extends { id: string }>(list: T[], item: T): T[] =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list];

/* Admin writes send the raw French and English texts (Pizza.translations). */
const pizzaBody = (p: Pizza) => ({
  name: p.translations.fr.name,
  nameEn: p.translations.en.name,
  description: p.translations.fr.description,
  descriptionEn: p.translations.en.description,
  longDescription: p.translations.fr.longDescription,
  longDescriptionEn: p.translations.en.longDescription,
  categoryId: p.categoryId,
  price: p.price,
  oldPrice: p.oldPrice ?? null,
  image: p.image,
  ingredients: p.ingredientsFr,
  prepMinutes: p.prepMinutes,
  calories: p.calories,
  isPopular: Boolean(p.isPopular),
  isNew: Boolean(p.isNew),
  isVegetarian: Boolean(p.isVegetarian),
  isSpicy: Boolean(p.isSpicy),
  active: p.active,
});

/** Deduplicates concurrent loads of the same scope. */
const inflight: Partial<Record<Scope, Promise<void>>> = {};

export const useDataStore = create<DataState>()((set, get) => {
  const load = (scope: Scope, force: boolean | undefined, run: () => Promise<void>) => {
    if (!force && get().status[scope] === 'ready') return Promise.resolve();
    if (inflight[scope]) return inflight[scope]!;
    set((s) => ({ status: { ...s.status, [scope]: s.status[scope] === 'ready' ? 'ready' : 'loading' } }));
    inflight[scope] = run()
      .then(() => set((s) => ({ status: { ...s.status, [scope]: 'ready' }, error: null })))
      .catch((e: Error) => {
        set((s) => ({ status: { ...s.status, [scope]: 'error' }, error: e.message }));
        throw e;
      })
      .finally(() => {
        delete inflight[scope];
      });
    return inflight[scope]!;
  };

  return {
    pizzas: [],
    categories: [],
    ingredients: [],
    stockMovements: [],
    orders: [],
    customers: [],
    promotions: [],
    reviews: [],
    notifications: [],
    activity: [],
    settings: DEFAULT_SETTINGS,
    publicStats: null,
    status: { public: 'idle', client: 'idle', admin: 'idle' },
    error: null,

    loadPublic: (force) =>
      load('public', force, async () => {
        const { stats, ...data } = await api.get<PublicCatalog>('/api/catalog');
        // Admin data is richer: do not overwrite it with the public view.
        if (get().status.admin === 'ready') set({ settings: data.settings, publicStats: stats });
        else set({ ...data, publicStats: stats });
      }),

    loadClient: (force) =>
      load('client', force, async () => {
        const [orders, notifications] = await Promise.all([api.get<Order[]>('/api/account/orders'), api.get<AppNotification[]>('/api/notifications')]);
        set({ orders, notifications });
      }),

    loadAdmin: (force) =>
      load('admin', force, async () => {
        const [data, notifications] = await Promise.all([api.get<AdminBootstrap>('/api/admin/bootstrap'), api.get<AppNotification[]>('/api/notifications')]);
        set({ ...data, notifications });
      }),

    refreshOrders: async () => {
      const { status } = get();
      if (status.admin === 'ready') set({ orders: await api.get<Order[]>('/api/admin/orders') });
      else if (status.client === 'ready') set({ orders: await api.get<Order[]>('/api/account/orders') });
    },

    refreshOrder: async (id) => {
      try {
        const order = await api.get<Order>(`/api/orders/${id}`);
        set((s) => ({ orders: upsert(s.orders, order) }));
        return order;
      } catch {
        return null;
      }
    },

    refreshNotifications: async () => {
      set({ notifications: await api.get<AppNotification[]>('/api/notifications') });
    },

    clearPrivate: () =>
      set((s) => ({
        orders: [],
        customers: [],
        notifications: [],
        stockMovements: [],
        activity: [],
        status: { ...s.status, client: 'idle', admin: 'idle', public: s.status.admin === 'ready' ? 'idle' : s.status.public },
      })),

    /* ─────────── Catalog (admin) ─────────── */

    upsertPizza: async (pizza) => {
      const exists = get().pizzas.some((p) => p.id === pizza.id);
      const saved = exists ? await api.put<Pizza>(`/api/admin/pizzas/${pizza.id}`, pizzaBody(pizza)) : await api.post<Pizza>('/api/admin/pizzas', pizzaBody(pizza));
      set((s) => ({ pizzas: exists ? upsert(s.pizzas, saved) : [saved, ...s.pizzas.filter((p) => p.id !== pizza.id)] }));
      return saved;
    },
    setPizzaActive: async (id, active) => {
      const saved = await api.patch<Pizza>(`/api/admin/pizzas/${id}`, { active });
      set((s) => ({ pizzas: upsert(s.pizzas, saved) }));
    },
    deletePizza: async (id) => {
      await api.delete(`/api/admin/pizzas/${id}`);
      set((s) => ({ pizzas: s.pizzas.filter((p) => p.id !== id) }));
    },

    upsertCategory: async (category) => {
      const exists = get().categories.some((c) => c.id === category.id);
      const { fr, en } = category.translations;
      const body = { name: fr.name, nameEn: en.name, description: fr.description, descriptionEn: en.description, image: category.image, active: category.active };
      const saved = exists ? await api.put<Category>(`/api/admin/categories/${category.id}`, body) : await api.post<Category>('/api/admin/categories', body);
      set((s) => ({ categories: exists ? upsert(s.categories, saved) : [...s.categories.filter((c) => c.id !== category.id), saved] }));
      return saved;
    },
    deleteCategory: async (id) => {
      await api.delete(`/api/admin/categories/${id}`);
      set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
    },
    moveCategory: async (id, direction) => {
      set({ categories: await api.post<Category[]>(`/api/admin/categories/${id}/move`, { direction }) });
    },

    upsertIngredient: async (ingredient) => {
      const exists = get().ingredients.some((i) => i.id === ingredient.id);
      const body = {
        type: ingredient.type,
        name: ingredient.translations.fr.name,
        nameEn: ingredient.translations.en.name,
        description: ingredient.translations.fr.description,
        descriptionEn: ingredient.translations.en.description,
        price: ingredient.price,
        color: ingredient.color,
        unit: ingredient.unit,
        threshold: ingredient.threshold,
        active: ingredient.active,
        ...(exists ? {} : { stock: ingredient.stock }),
      };
      const saved = exists ? await api.put<Ingredient>(`/api/admin/ingredients/${ingredient.id}`, body) : await api.post<Ingredient>('/api/admin/ingredients', body);
      set((s) => ({ ingredients: exists ? upsert(s.ingredients, saved) : [...s.ingredients.filter((i) => i.id !== ingredient.id), saved] }));
      return saved;
    },
    deleteIngredient: async (id) => {
      await api.delete(`/api/admin/ingredients/${id}`);
      set((s) => ({ ingredients: s.ingredients.filter((i) => i.id !== id) }));
    },

    moveStock: async (ingredientId, kind, quantity, note) => {
      const { ingredient, movement } = await api.post<{ ingredient: Ingredient; movement: StockMovement }>(`/api/admin/ingredients/${ingredientId}/stock`, { kind, quantity, note });
      set((s) => ({ ingredients: upsert(s.ingredients, ingredient), stockMovements: [movement, ...s.stockMovements] }));
      void get().refreshNotifications().catch(() => undefined);
    },
    setThreshold: async (ingredientId, threshold) => {
      const { ingredient, movement } = await api.put<{ ingredient: Ingredient; movement: StockMovement }>(`/api/admin/ingredients/${ingredientId}/threshold`, { threshold });
      set((s) => ({ ingredients: upsert(s.ingredients, ingredient), stockMovements: [movement, ...s.stockMovements] }));
      void get().refreshNotifications().catch(() => undefined);
    },

    /* ─────────── Orders ─────────── */

    setOrderStatus: async (id, status, note) => {
      const order =
        get().status.admin === 'ready'
          ? await api.patch<Order>(`/api/admin/orders/${id}/status`, { status, note })
          : await api.post<Order>(`/api/orders/${id}/cancel`, { reason: note });
      set((s) => ({ orders: upsert(s.orders, order) }));
      return order;
    },
    confirmReceipt: async (id) => {
      const order = await api.post<Order>(`/api/orders/${id}/received`, {});
      set((s) => ({ orders: upsert(s.orders, order) }));
      return order;
    },
    cancelOrder: async (id, reason) => {
      const order = await api.post<Order>(`/api/orders/${id}/cancel`, { reason });
      set((s) => ({ orders: upsert(s.orders, order) }));
      return order;
    },

    setCustomerStatus: async (id, status) => {
      const customer = await api.patch<Customer>(`/api/admin/customers/${id}`, { status });
      set((s) => ({ customers: upsert(s.customers, customer) }));
    },

    /* ─────────── Marketing ─────────── */

    upsertPromotion: async (promotion) => {
      const exists = get().promotions.some((p) => p.id === promotion.id);
      const body = {
        code: promotion.code,
        label: promotion.translations.fr.label,
        labelEn: promotion.translations.en.label,
        kind: promotion.kind,
        value: promotion.value,
        minOrder: promotion.minOrder,
        maxDiscount: promotion.maxDiscount ?? null,
        startDate: promotion.startDate,
        endDate: promotion.endDate,
        active: promotion.active,
        maxUses: promotion.maxUses ?? null,
        maxUsesPerUser: promotion.maxUsesPerUser ?? null,
      };
      const saved = exists ? await api.put<Promotion>(`/api/admin/promotions/${promotion.id}`, body) : await api.post<Promotion>('/api/admin/promotions', body);
      set((s) => ({ promotions: exists ? upsert(s.promotions, saved) : [saved, ...s.promotions.filter((p) => p.id !== promotion.id)] }));
      return saved;
    },
    deletePromotion: async (id) => {
      await api.delete(`/api/admin/promotions/${id}`);
      set((s) => ({ promotions: s.promotions.filter((p) => p.id !== id) }));
    },

    submitReview: async (input) => {
      const review = await api.post<Review>('/api/reviews', input);
      set((s) => ({ reviews: upsert(s.reviews, review) }));
      return review;
    },
    setReviewPublished: async (id, published) => {
      const review = await api.patch<Review>(`/api/admin/reviews/${id}`, { published });
      set((s) => ({ reviews: upsert(s.reviews, review) }));
    },
    deleteReview: async (id) => {
      await api.delete(`/api/admin/reviews/${id}`);
      set((s) => ({ reviews: s.reviews.filter((r) => r.id !== id) }));
    },

    /* ─────────── Notifications ─────────── */

    markNotification: async (id, read) => {
      set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read } : n)) }));
      try {
        await api.patch(`/api/notifications/${id}`, { read });
      } catch (e) {
        set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: !read } : n)) }));
        throw e;
      }
    },
    markAllNotifications: async () => {
      set({ notifications: await api.post<AppNotification[]>('/api/notifications/read-all') });
    },
    deleteNotification: async (id) => {
      await api.delete(`/api/notifications/${id}`);
      set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
    },

    updateSettings: async (patch) => {
      const { currency: _currency, translations, slogan: _slogan, openingHours: _hours, ...rest } = patch;
      void _currency;
      void _slogan;
      void _hours;
      // Display fields are localized: the raw texts come from `translations`.
      const texts = translations
        ? { slogan: translations.fr.slogan, sloganEn: translations.en.slogan, openingHours: translations.fr.openingHours, openingHoursEn: translations.en.openingHours }
        : {};
      set({ settings: await api.put<RestaurantSettings>('/api/admin/settings', { ...rest, ...texts }) });
    },
  };
});

/** Read helper outside React (services). */
export const getData = () => useDataStore.getState();
