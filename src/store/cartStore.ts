'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CartItem, DeliveryMode, Promotion } from '@/types';
import { uid } from '@/lib/utils';

/**
 * Cart UI state. Guests keep it in localStorage; for signed-in clients it is
 * mirrored to the server cart (see CartSync in providers). Unit prices here
 * are display values: the server recomputes every price at checkout.
 */
interface CartState {
  items: CartItem[];
  promo: Promotion | null;
  deliveryMode: DeliveryMode;
  drawerOpen: boolean;
  /** Bumped on every user change, used to trigger the server sync. */
  revision: number;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  updateItem: (id: string, patch: Partial<CartItem>) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  applyPromo: (promo: Promotion | null) => void;
  setDeliveryMode: (mode: DeliveryMode) => void;
  setDrawerOpen: (open: boolean) => void;
  /** Replaces items without triggering a sync (server answers, repricing). */
  replaceItems: (items: CartItem[]) => void;
}

/** Two lines merge when they describe exactly the same product. */
const sameLine = (a: Omit<CartItem, 'id'>, b: CartItem) =>
  !a.custom &&
  !b.custom &&
  a.pizzaId === b.pizzaId &&
  a.size === b.size &&
  (a.note ?? '') === (b.note ?? '') &&
  JSON.stringify([...(a.removedIngredients ?? [])].sort()) === JSON.stringify([...(b.removedIngredients ?? [])].sort());

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      promo: null,
      deliveryMode: 'standard',
      drawerOpen: false,
      revision: 0,
      addItem: (item) =>
        set((s) => {
          const existing = s.items.find((line) => sameLine(item, line));
          if (existing) {
            return { revision: s.revision + 1, items: s.items.map((line) => (line.id === existing.id ? { ...line, quantity: Math.min(20, line.quantity + item.quantity) } : line)) };
          }
          return { revision: s.revision + 1, items: [...s.items, { ...item, id: uid('line') }] };
        }),
      updateItem: (id, patch) => set((s) => ({ revision: s.revision + 1, items: s.items.map((line) => (line.id === id ? { ...line, ...patch } : line)) })),
      removeItem: (id) => set((s) => ({ revision: s.revision + 1, items: s.items.filter((line) => line.id !== id) })),
      setQuantity: (id, quantity) =>
        set((s) => ({ revision: s.revision + 1, items: s.items.map((line) => (line.id === id ? { ...line, quantity: Math.min(20, Math.max(1, quantity)) } : line)) })),
      clear: () => set((s) => ({ revision: s.revision + 1, items: [], promo: null })),
      applyPromo: (promo) => set({ promo }),
      setDeliveryMode: (deliveryMode) => set({ deliveryMode }),
      setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
      replaceItems: (items) => set({ items }),
    }),
    {
      name: 'fuoco-cart',
      // v2: ids are database UUIDs; carts from the prototype are dropped.
      version: 2,
      migrate: () => ({ items: [], promo: null, deliveryMode: 'standard' }) as never,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ items, promo, deliveryMode }) => ({ items, promo, deliveryMode }),
      skipHydration: true,
    },
  ),
);

export const selectCartCount = (s: CartState) => s.items.reduce((n, line) => n + line.quantity, 0);

/** Cart line as sent to the API (no price: the server prices it). */
export const toApiLine = (i: CartItem) => ({
  pizzaId: i.custom ? undefined : i.pizzaId,
  custom: i.custom,
  name: i.custom ? i.name : undefined,
  size: i.size,
  quantity: i.quantity,
  removedIngredients: i.removedIngredients ?? [],
  note: i.note || undefined,
});
