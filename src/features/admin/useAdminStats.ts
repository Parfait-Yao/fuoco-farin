'use client';

import * as React from 'react';
import { api } from '@/lib/api';
import { useDataStore } from '@/store/dataStore';
import type { Ingredient, PaymentMethod } from '@/types';

/** Shape returned by GET /api/admin/stats (computed in SQL on the server). */
export interface AdminStats {
  range: { from: string; to: string; days: number; bucketDays: number };
  revenue: number;
  revenueTrend: number;
  orders: number;
  ordersTrend: number;
  validOrders: number;
  averageBasket: number;
  cancelRate: number;
  pending: number;
  delivered: number;
  customers: { total: number; active: number; new: number; newTrend: number };
  series: { key: number; label: string; revenue: number; orders: number; cancelled: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  payments: { key: PaymentMethod; name: string; value: number }[];
  districts: { name: string; revenue: number }[];
  categories: { name: string; quantity: number; revenue: number }[];
  lowStock: Ingredient[];
}

/**
 * Loads statistics for the last `days` days, or for an explicit date range.
 * Refetches when orders change (status updates, new orders) so the
 * dashboard follows live activity.
 */
export function useAdminStats(days: number, range?: { from: string; to: string } | null) {
  const [data, setData] = React.useState<AdminStats | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const ordersVersion = useDataStore((s) => s.orders.length + s.orders.filter((o) => o.status === 'delivered' || o.status === 'cancelled').length);

  React.useEffect(() => {
    let cancelled = false;
    const query = range?.from && range?.to ? `from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}` : `days=${days}`;
    api
      .get<AdminStats>(`/api/admin/stats?${query}`)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [days, range?.from, range?.to, ordersVersion]);

  return { data, loading: !data && !error, error };
}
