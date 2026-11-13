'use client';

import * as React from 'react';
import Link from 'next/link';
import { Box, Button, Card, Chip, IconButton, LinearProgress, Skeleton, Tooltip, Typography } from '@mui/material';
import PhoneRounded from '@mui/icons-material/PhoneRounded';
import ChatRounded from '@mui/icons-material/ChatRounded';
import SearchOffRounded from '@mui/icons-material/SearchOffRounded';
import TwoWheelerRounded from '@mui/icons-material/TwoWheelerRounded';
import StorefrontRounded from '@mui/icons-material/StorefrontRounded';
import HomeRounded from '@mui/icons-material/HomeRounded';
import { motion } from 'framer-motion';
import { EmptyState, OrderStatusChip, PageHeader } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { notify } from '@/store/uiStore';
import { useDataLoading } from '@/hooks';
import { BRAND, ORDER_FLOW, ROUTES } from '@/constants';
import { useFormat, useMessages } from '@/i18n/client';
import { OrderTimeline } from './OrderTimeline';

export function TrackingView({ id }: { id: string }) {
  const loading = useDataLoading();
  const userId = useAuthStore((s) => s.user?.id);
  const order = useDataStore((s) => s.orders.find((o) => o.id === id));
  const refreshOrder = useDataStore((s) => s.refreshOrder);
  const t = useMessages('account');
  const domain = useMessages('domain');
  const fmt = useFormat();

  const index = order ? ORDER_FLOW.indexOf(order.status) : -1;
  const finished = !order || order.status === 'delivered' || order.status === 'cancelled';

  // Live updates arrive through useLiveUpdates (Supabase Realtime, polling fallback).
  // Announce each status change made by the restaurant.
  const previous = React.useRef(order?.status);
  React.useEffect(() => {
    if (!order) return;
    if (previous.current && previous.current !== order.status) notify(t.statusChanged(order.number, domain.orderStatus[order.status].label.toLowerCase()), 'info');
    previous.current = order.status;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  // Fresh copy when the page opens.
  React.useEffect(() => {
    void refreshOrder(id);
  }, [id, refreshOrder]);

  if (loading && !order) return <Skeleton variant="rounded" height={420} />;
  if (!order || order.customerId !== userId) {
    return <EmptyState icon={<SearchOffRounded />} title={t.orderNotFound} action={{ label: t.myOrders, href: ROUTES.account.orders }} />;
  }

  const progress = order.status === 'cancelled' ? 100 : (Math.max(index, 0) / (ORDER_FLOW.length - 1)) * 100;
  const eta = new Date(new Date(order.createdAt).getTime() + 40 * 60000).toISOString();

  return (
    <Box>
      <PageHeader
        title={t.tracking}
        description={`${order.number} · ${domain.delivery[order.deliveryMode].label}`}
        breadcrumbs={[{ label: t.myOrders, href: ROUTES.account.orders }, { label: order.number, href: ROUTES.account.order(order.id) }, { label: t.trackingShort }]}
        actions={<OrderStatusChip status={order.status} size="medium" />}
      />
      <Box className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden">
          {/* Stylised route between restaurant and home */}
          <Box className="grain relative h-48 bg-gradient-to-br from-cream-200 to-ember-100 md:h-56">
            <Box className="absolute inset-x-10 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/80">
              <motion.div className="h-full rounded-full bg-tomato-500" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
            </Box>
            <Box className="absolute left-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white text-tomato-500 shadow-soft">
              <StorefrontRounded />
            </Box>
            <Box className="absolute right-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white text-basil-700 shadow-soft">
              <HomeRounded />
            </Box>
            <motion.div
              className="absolute top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-[130%] place-items-center rounded-full bg-tomato-500 text-white shadow-warm"
              initial={{ left: '10%' }}
              animate={{ left: `calc(2.5rem + (100% - 5rem) * ${progress / 100})` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            >
              <TwoWheelerRounded />
            </motion.div>
          </Box>
          <Box className="p-5 md:p-6">
            <Box className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {finished ? t.status : t.eta}
                </Typography>
                <Typography variant="h4" component="p">
                  {order.status === 'delivered' ? domain.orderStatus.delivered.label : order.status === 'cancelled' ? domain.orderStatus.cancelled.label : fmt.time(eta)}
                </Typography>
              </Box>
              {!finished && <Chip color="secondary" variant="outlined" label={t.liveUpdate} />}
            </Box>
            {!finished && <LinearProgress color="secondary" className="mb-6 rounded-full" aria-label={t.liveTracking} />}
            <OrderTimeline order={order} />
          </Box>
        </Card>
        <Box className="space-y-4">
          <Card className="p-5">
            <Typography fontWeight={800} className="mb-3">
              {t.yourDriver}
            </Typography>
            {index >= 2 ? (
              <Box className="flex items-center gap-3">
                <Box className="grid h-14 w-14 place-items-center rounded-full bg-tomato-50 text-tomato-500">
                  <TwoWheelerRounded />
                </Box>
                <Box className="flex-1">
                  <Typography fontWeight={700}>{order.status === 'delivered' ? t.delivered : t.onTheWay}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t.callQuestion}
                  </Typography>
                </Box>
                <Tooltip title={t.callRestaurant}>
                  <IconButton component="a" href={`tel:${BRAND.phone.replace(/\s/g, '')}`} aria-label={t.callRestaurant} className="bg-basil-50 text-basil-700">
                    <PhoneRounded />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t.contactSupport}>
                  <IconButton component={Link} href={ROUTES.contact} aria-label={t.contactSupport} className="bg-cream-200">
                    <ChatRounded />
                  </IconButton>
                </Tooltip>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t.driverSoon}
              </Typography>
            )}
          </Card>
          <Card className="p-5">
            <Typography fontWeight={800}>{t.deliveryAddress}</Typography>
            <Typography variant="body2" color="text.secondary" className="mt-1">
              {order.deliveryMode === 'pickup' ? BRAND.address : `${order.address.street}, ${order.address.district}`}
            </Typography>
          </Card>
          <Button fullWidth component={Link} href={ROUTES.account.order(order.id)} variant="outlined">
            {t.orderDetails}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
