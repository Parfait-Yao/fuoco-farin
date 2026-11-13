'use client';

import * as React from 'react';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { useCartStore } from '@/store/cartStore';
import { notify } from '@/store/uiStore';
import { ROUTES } from '@/constants';
import type { Order } from '@/types';
import { useMessages } from '@/i18n/client';

export const ACTIVE_STATUSES = ['received', 'preparing', 'delivering'] as const;
export const isActiveOrder = (o: Order) => (ACTIVE_STATUSES as readonly string[]).includes(o.status);

/** Orders of the signed-in client, newest first. */
export function useMyOrders(): Order[] {
  const userId = useAuthStore((s) => s.user?.id);
  const orders = useDataStore((s) => s.orders);
  return React.useMemo(() => orders.filter((o) => o.customerId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [orders, userId]);
}

/** Puts every line of a past order back into the cart. */
export function useReorder() {
  const addItem = useCartStore((s) => s.addItem);
  const setDrawerOpen = useCartStore((s) => s.setDrawerOpen);
  const t = useMessages('account');
  return (order: Order) => {
    order.items.forEach(({ id: _id, ...line }) => {
      void _id;
      addItem(line);
    });
    notify(t.reorderAdded(order.number), 'success', { label: t.order, href: ROUTES.checkout });
    setDrawerOpen(true);
  };
}
