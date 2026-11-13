'use client';

import * as React from 'react';
import { MotionConfig } from 'framer-motion';
import ThemeRegistry from '@/theme/ThemeRegistry';
import { ToastHost } from '@/components/ui/ToastHost';
import { useDataStore } from '@/store/dataStore';
import { toApiLine, useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { notify, useUiStore } from '@/store/uiStore';
import { authService } from '@/services/authService';
import { api, ApiError } from '@/lib/api';
import { sizePrice, customPizzaPrice } from '@/lib/pricing';
import { useLiveUpdates } from '@/hooks/useLiveUpdates';
import type { CartItem } from '@/types';
import { I18nProvider, tr } from '@/i18n/client';
import type { Locale } from '@/i18n/config';

/** Recomputes display prices from the live catalog and drops lines that no longer exist. */
function repriceCart() {
  const { pizzas, ingredients } = useDataStore.getState();
  if (!pizzas.length) return;
  const { items, replaceItems } = useCartStore.getState();
  const ingredientIds = new Set(ingredients.map((i) => i.id));
  const next: CartItem[] = [];
  for (const item of items) {
    if (item.custom) {
      const ids = [item.custom.baseId, item.custom.sauceId, item.custom.cheeseId, ...item.custom.veggieIds];
      if (!ids.every((id) => ingredientIds.has(id))) continue;
      next.push({ ...item, unitPrice: customPizzaPrice(item.custom, ingredients, item.size) });
    } else {
      const pizza = pizzas.find((p) => p.id === item.pizzaId && p.active);
      if (!pizza) continue;
      next.push({ ...item, name: pizza.name, image: pizza.image, unitPrice: sizePrice(pizza.price, item.size) });
    }
  }
  if (next.length !== items.length) notify(tr('common').cartItemsRemoved, 'info');
  replaceItems(next);
}

/**
 * Loads the session. A server or network error is not a sign-out: retry
 * twice before giving up, so a slow request does not log the admin out.
 * A 401 is a real sign-out and stops immediately.
 */
async function refreshSessionWithRetry() {
  for (let attempt = 0; ; attempt++) {
    try {
      return await authService.refresh();
    } catch (error) {
      if ((error instanceof ApiError && error.status === 401) || attempt >= 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
    }
  }
}

/** Loads the session and the public catalog after mount. */
function Bootstrap() {
  React.useEffect(() => {
    void useCartStore.persist.rehydrate();
    Promise.allSettled([refreshSessionWithRetry(), useDataStore.getState().loadPublic()]).then(([auth, catalog]) => {
      if (catalog.status === 'rejected') notify(tr('common').catalogLoadFailed, 'error');
      if (auth.status === 'rejected') useAuthStore.getState().setSession(null);
      repriceCart();
      useUiStore.getState().setHydrated();
    });
  }, []);
  return null;
}

/**
 * Mirrors the cart of a signed-in client to the server cart:
 * merges the guest cart at login, then saves every change (debounced).
 */
function CartSync() {
  const userId = useAuthStore((s) => (s.user?.role === 'client' ? s.user.id : null));
  const revision = useCartStore((s) => s.revision);
  const merged = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!userId || merged.current === userId) return;
    merged.current = userId;
    const local = useCartStore.getState().items;
    api
      .post<{ items: (CartItem & { available: boolean })[] }>('/api/cart/merge', { items: local.map(toApiLine) })
      .then(({ items }) => {
        useCartStore.getState().replaceItems(items.filter((i) => i.unitPrice > 0).map(({ available: _a, ...i }) => (void _a, i)));
      })
      .catch(() => undefined);
  }, [userId]);

  React.useEffect(() => {
    if (!userId || merged.current !== userId || revision === 0) return;
    const timer = setTimeout(() => {
      const items = useCartStore.getState().items;
      void api.put('/api/cart', { items: items.map(toApiLine), promoCode: useCartStore.getState().promo?.code ?? null }).catch(() => undefined);
    }, 600);
    return () => clearTimeout(timer);
  }, [userId, revision]);

  React.useEffect(() => {
    if (!userId) merged.current = null;
  }, [userId]);

  return null;
}

function LiveUpdates() {
  useLiveUpdates();
  return null;
}

export default function Providers({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <I18nProvider locale={locale}>
    <ThemeRegistry>
      {/* reducedMotion="user" honours the OS prefers-reduced-motion setting. */}
      <MotionConfig reducedMotion="user">
        <Bootstrap />
        <CartSync />
        <LiveUpdates />
        {children}
        <ToastHost />
      </MotionConfig>
    </ThemeRegistry>
    </I18nProvider>
  );
}
