import 'server-only';
import { prisma } from '@/lib/prisma';
import { PAYMENT_METHOD_KEYS } from '@/constants';
import { getLocale, getMessages } from '@/i18n/server';
import { INTL_LOCALE } from '@/i18n/config';
import type { PaymentMethod } from '@/types';
import { fromPaymentMethod } from '../enums';
import { stockService } from './stockService';

/*
 * Statistics computed in SQL from the orders table.
 * Revenue rule: an order counts when it is not cancelled and is either paid
 * or payable on delivery (cash). Unpaid online orders do not count.
 * Abidjan is UTC+0, so day buckets use UTC.
 * The revenue condition is written inline in each query: nested Prisma.sql
 * fragments break in dev when Turbopack loads @prisma/client twice.
 */

const DAY = 86_400_000;

const startOfUtcDay = (t: number) => {
  const d = new Date(t);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
};

export const trend = (current: number, previous: number) => (previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100);

async function totals(from: Date, to: Date) {
  const [row] = await prisma.$queryRaw<{ revenue: bigint | null; valid: bigint; all: bigint; cancelled: bigint; delivered: bigint }[]>`
    SELECT
      COALESCE(SUM(o."total") FILTER (WHERE (o."status" <> 'CANCELLED' AND (o."paymentStatus" = 'PAID' OR o."paymentMethod" = 'CASH'))), 0) AS revenue,
      COUNT(*) FILTER (WHERE (o."status" <> 'CANCELLED' AND (o."paymentStatus" = 'PAID' OR o."paymentMethod" = 'CASH'))) AS valid,
      COUNT(*) AS all,
      COUNT(*) FILTER (WHERE o."status" = 'CANCELLED') AS cancelled,
      COUNT(*) FILTER (WHERE o."status" = 'DELIVERED') AS delivered
    FROM "orders" o WHERE o."createdAt" >= ${from} AND o."createdAt" < ${to}`;
  return { revenue: Number(row.revenue ?? 0), valid: Number(row.valid), all: Number(row.all), cancelled: Number(row.cancelled), delivered: Number(row.delivered) };
}

export const statsService = {
  /**
   * Dashboard and reports payload for a period ending today (`days`) or an
   * explicit range. Trends compare with the previous period of equal length.
   */
  async overview(range: { from: Date; to: Date }) {
    const to = new Date(Math.max(range.to.getTime(), range.from.getTime() + DAY));
    const from = range.from;
    const length = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - length);
    const days = Math.round(length / DAY);
    const bucketDays = days > 60 ? 7 : 1;

    const locale = getLocale();
    const en = locale === 'en';
    const msg = getMessages('api', locale);
    const customLabel = getMessages('api', 'fr').customPizzas;
    const [current, previous, pending, customers, newCustomers, prevNewCustomers, seriesRows, topRows, paymentRows, districtRows, categoryRows, lowStock] = await Promise.all([
      totals(from, to),
      totals(prevFrom, from),
      prisma.order.count({ where: { status: { in: ['RECEIVED', 'IN_KITCHEN', 'SENT_FOR_DELIVERY'] } } }),
      prisma.user.groupBy({ by: ['status'], where: { role: 'CLIENT', deletedAt: null }, _count: true }),
      prisma.user.count({ where: { role: 'CLIENT', deletedAt: null, createdAt: { gte: from, lt: to } } }),
      prisma.user.count({ where: { role: 'CLIENT', deletedAt: null, createdAt: { gte: prevFrom, lt: from } } }),
      prisma.$queryRaw<{ idx: number; revenue: bigint | null; orders: bigint; cancelled: bigint }[]>`
        SELECT
          floor(extract(epoch FROM (o."createdAt" - ${from}::timestamp)) / ${bucketDays * 86400})::int AS idx,
          COALESCE(SUM(o."total") FILTER (WHERE (o."status" <> 'CANCELLED' AND (o."paymentStatus" = 'PAID' OR o."paymentMethod" = 'CASH'))), 0) AS revenue,
          COUNT(*) FILTER (WHERE (o."status" <> 'CANCELLED' AND (o."paymentStatus" = 'PAID' OR o."paymentMethod" = 'CASH'))) AS orders,
          COUNT(*) FILTER (WHERE o."status" = 'CANCELLED') AS cancelled
        FROM "orders" o WHERE o."createdAt" >= ${from} AND o."createdAt" < ${to}
        GROUP BY 1 ORDER BY 1`,
      prisma.$queryRaw<{ name: string; quantity: bigint; revenue: bigint }[]>`
        SELECT COALESCE(CASE WHEN ${en} THEN NULLIF(p."nameEn", '') END, p."name", CASE WHEN i."pizzaId" IS NULL THEN ${msg.customPizzas} ELSE i."name" END) AS name,
               SUM(i."quantity") AS quantity, SUM(i."lineTotal") AS revenue
        FROM "order_items" i JOIN "orders" o ON o."id" = i."orderId" LEFT JOIN "pizzas" p ON p."id" = i."pizzaId"
        WHERE (o."status" <> 'CANCELLED' AND (o."paymentStatus" = 'PAID' OR o."paymentMethod" = 'CASH')) AND o."createdAt" >= ${from} AND o."createdAt" < ${to}
        GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
      prisma.$queryRaw<{ method: string; count: bigint }[]>`
        SELECT o."paymentMethod"::text AS method, COUNT(*) AS count FROM "orders" o
        WHERE (o."status" <> 'CANCELLED' AND (o."paymentStatus" = 'PAID' OR o."paymentMethod" = 'CASH')) AND o."createdAt" >= ${from} AND o."createdAt" < ${to} GROUP BY 1`,
      prisma.$queryRaw<{ name: string; revenue: bigint }[]>`
        SELECT COALESCE(NULLIF(o."district", ''), ${msg.pickup}) AS name, SUM(o."total") AS revenue FROM "orders" o
        WHERE (o."status" <> 'CANCELLED' AND (o."paymentStatus" = 'PAID' OR o."paymentMethod" = 'CASH')) AND o."createdAt" >= ${from} AND o."createdAt" < ${to} GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
      prisma.$queryRaw<{ name: string; quantity: bigint; revenue: bigint }[]>`
        SELECT COALESCE(i."categoryName", ${msg.others}) AS name, SUM(i."quantity") AS quantity, SUM(i."lineTotal") AS revenue
        FROM "order_items" i JOIN "orders" o ON o."id" = i."orderId"
        WHERE (o."status" <> 'CANCELLED' AND (o."paymentStatus" = 'PAID' OR o."paymentMethod" = 'CASH')) AND o."createdAt" >= ${from} AND o."createdAt" < ${to} GROUP BY 1 ORDER BY 3 DESC`,
      stockService.lowStock(),
    ]);

    // Order lines store the French category name: show the English one when available.
    const categoryNames = en ? new Map((await prisma.category.findMany({ select: { name: true, nameEn: true } })).map((c) => [c.name, c.nameEn || c.name])) : new Map<string, string>();
    categoryNames.set(customLabel, msg.customPizzas);

    // Fill empty buckets so charts have a continuous axis.
    const byBucket = new Map(seriesRows.map((r) => [Number(r.idx), r]));
    const buckets = Math.ceil(days / bucketDays);
    const fmt = new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: '2-digit', month: 'short', timeZone: 'UTC' });
    const series = Array.from({ length: buckets }, (_, i) => {
      const key = from.getTime() + i * bucketDays * DAY;
      const row = byBucket.get(i);
      return { key, label: fmt.format(key), revenue: Number(row?.revenue ?? 0), orders: Number(row?.orders ?? 0), cancelled: Number(row?.cancelled ?? 0) };
    });

    const paymentCounts = new Map<PaymentMethod, number>();
    paymentRows.forEach((r) => {
      const m = fromPaymentMethod(r.method as never);
      paymentCounts.set(m, (paymentCounts.get(m) ?? 0) + Number(r.count));
    });

    const activeCustomers = customers.find((c) => c.status === 'ACTIVE')?._count ?? 0;
    const allCustomers = customers.reduce((n, c) => n + c._count, 0);

    return {
      range: { from: from.toISOString(), to: to.toISOString(), days, bucketDays },
      revenue: current.revenue,
      revenueTrend: trend(current.revenue, previous.revenue),
      orders: current.all,
      ordersTrend: trend(current.all, previous.all),
      validOrders: current.valid,
      averageBasket: current.valid ? Math.round(current.revenue / current.valid) : 0,
      cancelRate: current.all ? (current.cancelled / current.all) * 100 : 0,
      pending,
      delivered: current.delivered,
      customers: { total: allCustomers, active: activeCustomers, new: newCustomers, newTrend: trend(newCustomers, prevNewCustomers) },
      series,
      topProducts: topRows.map((r) => ({ name: r.name, quantity: Number(r.quantity), revenue: Number(r.revenue) })),
      payments: PAYMENT_METHOD_KEYS.map((key: PaymentMethod) => ({ key, name: getMessages('domain', locale).payment[key].label, value: paymentCounts.get(key) ?? 0 })),
      districts: districtRows.map((r) => ({ name: r.name, revenue: Number(r.revenue) })),
      categories: categoryRows.map((r) => ({ name: categoryNames.get(r.name) ?? r.name, quantity: Number(r.quantity), revenue: Number(r.revenue) })),
      lowStock,
    };
  },

  /** Period ending at the end of today (UTC), `days` long. */
  periodRange(days: number) {
    const to = new Date(startOfUtcDay(Date.now()) + DAY);
    return { from: new Date(to.getTime() - days * DAY), to };
  },
};
