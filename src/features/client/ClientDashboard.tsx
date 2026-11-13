'use client';

import * as React from 'react';
import Link from 'next/link';
import { Box, Button, Card, Chip, Divider, Skeleton, Typography } from '@mui/material';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import PaymentsRounded from '@mui/icons-material/PaymentsRounded';
import DeliveryDiningRounded from '@mui/icons-material/DeliveryDiningRounded';
import FavoriteRounded from '@mui/icons-material/FavoriteRounded';
import LocalPizzaRounded from '@mui/icons-material/LocalPizzaRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import { motion } from 'framer-motion';
import { EmptyState, OrderStatusChip, StatCard, Stagger, StaggerItem } from '@/components/ui';
import { PizzaCard } from '@/components/visitor/PizzaCard';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { useDataLoading } from '@/hooks';
import { ORDER_STATUS_COLOR, ROUTES } from '@/constants';
import { useFormat, useMessages } from '@/i18n/client';
import { OrderTimeline } from './OrderTimeline';
import { isActiveOrder, useMyOrders, useReorder } from './hooks';

function greetingKey(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

export function ClientDashboard() {
  const user = useAuthStore((s) => s.user)!;
  const favorites = useAuthStore((s) => s.favorites);
  const pizzas = useDataStore((s) => s.pizzas);
  const orders = useMyOrders();
  const reorder = useReorder();
  const loading = useDataLoading();
  const t = useMessages('account');
  const statusLabels = useMessages('domain').orderStatus;
  const fmt = useFormat();

  const active = orders.filter(isActiveOrder);
  const delivered = orders.filter((o) => o.status === 'delivered');
  const spent = delivered.reduce((s, o) => s + o.total, 0);
  const last = orders[0];
  const suggestions = React.useMemo(() => {
    const ordered = new Set(orders.flatMap((o) => o.items.map((i) => i.pizzaId)));
    return pizzas.filter((p) => p.active && !ordered.has(p.id)).sort((a, b) => b.rating - a.rating).slice(0, 3);
  }, [orders, pizzas]);

  return (
    <Box className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-tomato-500 via-tomato-600 to-tomato-800 p-6 text-white md:p-8">
          <Box aria-hidden className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-ember-500/40 blur-3xl" />
          <Box className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <Box>
              <Typography variant="h3" component="h1" className="text-white">
                {t.greeting(t[greetingKey()], user.firstName)}
              </Typography>
              <Typography className="mt-1 text-white/80">
                {active.length > 0 ? t.activeOrders(active.length) : t.hungry}
              </Typography>
            </Box>
            <Box className="flex flex-col gap-2 sm:flex-row">
              <Button component={Link} href={ROUTES.menu} variant="contained" size="large" startIcon={<LocalPizzaRounded />} className="bg-white bg-none text-tomato-600 hover:bg-cream-100">
                {t.order}
              </Button>
              {last && (
                <Button onClick={() => reorder(last)} size="large" startIcon={<ReplayRounded />} className="text-white" variant="outlined" color="inherit">
                  {t.reorder}
                </Button>
              )}
            </Box>
          </Box>
        </Card>
      </motion.div>

      <Box className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t.ordersPlaced} value={orders.length} icon={<ReceiptLongRounded />} loading={loading} />
        <StatCard label={t.inProgress} value={active.length} icon={<DeliveryDiningRounded />} tone="ember" loading={loading} />
        <StatCard label={t.totalSpent} value={spent} format={fmt.price} icon={<PaymentsRounded />} tone="basil" loading={loading} />
        <StatCard label={t.favoritePizzas} value={favorites.length} icon={<FavoriteRounded />} tone="charcoal" loading={loading} />
      </Box>

      <Box className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card className="p-5 md:p-6">
          <Box className="mb-4 flex items-center justify-between">
            <Typography variant="h6" component="h2">
              {t.currentOrders}
            </Typography>
            <Button component={Link} href={ROUTES.account.orders} size="small" endIcon={<ArrowForwardRounded />}>
              {t.all}
            </Button>
          </Box>
          {loading ? (
            <Skeleton variant="rounded" height={220} />
          ) : active.length === 0 ? (
            <EmptyState compact icon={<DeliveryDiningRounded />} title={t.noCurrent} description={t.noCurrentHint} action={{ label: t.seeMenu, href: ROUTES.menu }} />
          ) : (
            <Box className="space-y-6">
              {active.map((o) => (
                <Box key={o.id}>
                  <Box className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <Box>
                      <Typography fontWeight={800}>{o.number}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t.itemsTotal(o.items.length, fmt.price(o.total))}
                      </Typography>
                    </Box>
                    <Button component={Link} href={ROUTES.account.tracking(o.id)} variant="contained" size="small">
                      {t.track}
                    </Button>
                  </Box>
                  <OrderTimeline order={o} orientation="horizontal" />
                </Box>
              ))}
            </Box>
          )}
        </Card>

        <Card className="p-5 md:p-6">
          <Typography variant="h6" component="h2" className="mb-4">
            {t.recentHistory}
          </Typography>
          {loading ? (
            <Box className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={52} />)}</Box>
          ) : orders.length === 0 ? (
            <EmptyState compact icon={<ReceiptLongRounded />} title={t.noOrderYet} />
          ) : (
            <Box component="ul" className="m-0 list-none p-0">
              {orders.slice(0, 5).map((o, i) => (
                <li key={o.id}>
                  {i > 0 && <Divider />}
                  <Box component={Link} href={ROUTES.account.order(o.id)} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 text-inherit no-underline hover:bg-cream-100">
                    <Box className="min-w-0 flex-1">
                      <Typography fontWeight={700}>{o.number}</Typography>
                      <Typography variant="body2" color="text.secondary" className="truncate">
                        {fmt.dateTime(o.createdAt)} · {o.items.map((it) => it.name).join(', ')}
                      </Typography>
                    </Box>
                    <Box className="text-right">
                      <Typography fontWeight={700}>{fmt.price(o.total)}</Typography>
                      <Chip size="small" label={statusLabels[o.status].label} color={ORDER_STATUS_COLOR[o.status]} variant="outlined" className="mt-0.5" />
                    </Box>
                  </Box>
                </li>
              ))}
            </Box>
          )}
          {last && !loading && (
            <Box className="mt-4 rounded-2xl bg-cream-100 p-4">
              <Typography variant="body2" color="text.secondary">
                {t.lastOrder}
              </Typography>
              <Box className="mt-1 flex items-center justify-between gap-2">
                <Typography fontWeight={800}>{last.number}</Typography>
                <OrderStatusChip status={last.status} />
              </Box>
            </Box>
          )}
        </Card>
      </Box>

      {suggestions.length > 0 && (
        <Box>
          <Typography variant="h5" component="h2" className="mb-4">
            {t.forYou}
          </Typography>
          <Stagger className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {suggestions.map((p) => (
              <StaggerItem key={p.id}>
                <PizzaCard pizza={p} />
              </StaggerItem>
            ))}
          </Stagger>
        </Box>
      )}
    </Box>
  );
}
