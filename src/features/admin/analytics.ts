import type { Order, PaymentMethod, Pizza } from '@/types';
import { PAYMENT_METHOD_KEYS } from '@/constants';
import { INTL_LOCALE, type Locale } from '@/i18n/config';

export type Period = 7 | 30 | 90;

/** Categorical chart palette (validated: lightness, chroma, CVD, contrast). */
export const CHART_COLORS = ['#C8341C', '#2A7AB0', '#E89A2C', '#2E8B57', '#7B4FA0'] as const;
export const CHART_GRID = 'rgba(31, 28, 26, 0.08)';
export const CHART_AXIS = '#7A736E';

const DAY = 86_400_000;

const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export function ordersInRange(orders: Order[], days: number, offsetDays = 0): Order[] {
  const end = startOfDay(Date.now()) + DAY - offsetDays * DAY;
  const start = end - days * DAY;
  return orders.filter((o) => {
    const t = new Date(o.createdAt).getTime();
    return t >= start && t < end;
  });
}

export const revenueOf = (orders: Order[]) => orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);

export function trend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/** One point per day (7/30 days) or per week (90 days). */
export function timeSeries(orders: Order[], days: Period, locale: Locale) {
  const bucket = days === 90 ? 7 : 1;
  const buckets = Math.ceil(days / bucket);
  const end = startOfDay(Date.now()) + DAY;
  const start = end - buckets * bucket * DAY;
  const points = Array.from({ length: buckets }, (_, i) => {
    const t = start + i * bucket * DAY;
    return {
      key: t,
      label: new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: '2-digit', month: 'short' }).format(t),
      revenue: 0,
      orders: 0,
      cancelled: 0,
    };
  });
  orders.forEach((o) => {
    const t = new Date(o.createdAt).getTime();
    if (t < start || t >= end) return;
    const p = points[Math.floor((t - start) / (bucket * DAY))];
    if (!p) return;
    if (o.status === 'cancelled') p.cancelled += 1;
    else {
      p.orders += 1;
      p.revenue += o.total;
    }
  });
  return points;
}

export function topProducts(orders: Order[], pizzas: Pizza[], limit = 5, customLabel = 'Custom') {
  const map = new Map<string, { name: string; quantity: number; revenue: number }>();
  orders
    .filter((o) => o.status !== 'cancelled')
    .forEach((o) =>
      o.items.forEach((i) => {
        const key = i.pizzaId ?? 'custom';
        const name = i.pizzaId ? pizzas.find((p) => p.id === i.pizzaId)?.name ?? i.name : customLabel;
        const entry = map.get(key) ?? { name, quantity: 0, revenue: 0 };
        entry.quantity += i.quantity;
        entry.revenue += i.quantity * i.unitPrice;
        map.set(key, entry);
      }),
    );
  return Array.from(map.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

export function paymentMix(orders: Order[], labels: Record<PaymentMethod, { label: string }>) {
  const counts = new Map<PaymentMethod, number>();
  orders.filter((o) => o.status !== 'cancelled').forEach((o) => counts.set(o.paymentMethod, (counts.get(o.paymentMethod) ?? 0) + 1));
  return PAYMENT_METHOD_KEYS.map((m) => ({ key: m, name: labels[m].label, value: counts.get(m) ?? 0 }));
}

export function districtMix(orders: Order[]) {
  const counts = new Map<string, number>();
  orders.filter((o) => o.status !== 'cancelled').forEach((o) => counts.set(o.address.district, (counts.get(o.address.district) ?? 0) + o.total));
  return Array.from(counts.entries())
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
}
