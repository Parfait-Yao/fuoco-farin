'use client';

import * as React from 'react';
import Link from 'next/link';
import { Alert, Box, Button, Card, Chip, LinearProgress, Skeleton, Typography } from '@mui/material';
import PaymentsRounded from '@mui/icons-material/PaymentsRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import HourglassTopRounded from '@mui/icons-material/HourglassTopRounded';
import TaskAltRounded from '@mui/icons-material/TaskAltRounded';
import GroupRounded from '@mui/icons-material/GroupRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded';
import PersonAddRounded from '@mui/icons-material/PersonAddRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import LocalPizzaRounded from '@mui/icons-material/LocalPizzaRounded';
import { motion } from 'framer-motion';
import { EmptyState, PageHeader, StatCard } from '@/components/ui';
import { useDataStore } from '@/store/dataStore';
import { useDataLoading } from '@/hooks';
import { useFormat, useMessages } from '@/i18n/client';
import { ROUTES } from '@/constants';
import type { ActivityLog } from '@/types';
import type { Period } from './analytics';
import { useAdminStats } from './useAdminStats';
import { OrdersChart, RankingChart, RevenueChart } from './charts';
import { PeriodFilter } from './PeriodFilter';

const ACTIVITY_ICONS: Record<ActivityLog['kind'], React.ReactNode> = {
  order: <ReceiptLongRounded fontSize="small" />,
  stock: <Inventory2Rounded fontSize="small" />,
  customer: <PersonAddRounded fontSize="small" />,
  review: <StarRounded fontSize="small" />,
  catalog: <LocalPizzaRounded fontSize="small" />,
};

export function ChartCard({ title, subtitle, action, children, loading }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; loading?: boolean }) {
  return (
    <Card className="p-5 md:p-6">
      <Box className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <Box>
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
      {loading ? <Skeleton variant="rounded" height={260} /> : <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{children}</motion.div>}
    </Card>
  );
}

export function AdminDashboard() {
  const activity = useDataStore((s) => s.activity);
  const [period, setPeriod] = React.useState<Period>(30);
  const storeLoading = useDataLoading();
  const { data, loading: statsLoading, error } = useAdminStats(period);
  const loading = storeLoading || statsLoading;
  const t = useMessages('admin');
  const fmt = useFormat();

  const stats = {
    revenue: data?.revenue ?? 0,
    revenueTrend: data?.revenueTrend ?? 0,
    count: data?.orders ?? 0,
    countTrend: data?.ordersTrend ?? 0,
    pending: data?.pending ?? 0,
    done: data?.delivered ?? 0,
    series: data?.series ?? [],
    top: (data?.topProducts ?? []).slice(0, 5),
  };
  const customers = data?.customers ?? { total: 0, active: 0, new: 0, newTrend: 0 };
  const lowStock = data?.lowStock ?? [];

  return (
    <Box className="space-y-6">
      <PageHeader title={t.dashboardTitle} description={t.dashboardHint} actions={<PeriodFilter value={period} onChange={setPeriod} />} />
      {error && <Alert severity="error" className="rounded-2xl">{error}</Alert>}

      <Box className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <StatCard label={t.revenue} value={stats.revenue} format={fmt.price} icon={<PaymentsRounded />} trend={stats.revenueTrend} hint={t.vsPrevious} loading={loading} />
        <StatCard label={t.orders} value={stats.count} icon={<ReceiptLongRounded />} tone="ember" trend={stats.countTrend} loading={loading} />
        <StatCard label={t.pending} value={stats.pending} icon={<HourglassTopRounded />} tone="charcoal" hint={t.pendingHint} loading={loading} />
        <StatCard label={t.finished} value={stats.done} icon={<TaskAltRounded />} tone="basil" loading={loading} />
        <StatCard label={t.customers} value={customers.total} icon={<GroupRounded />} tone="tomato" hint={t.newCustomersHint(customers.new)} loading={loading} />
      </Box>

      <Box className="grid gap-6 xl:grid-cols-2">
        <ChartCard title={t.sales} subtitle={t.revenueLastDays(period)} loading={loading}>
          <RevenueChart data={stats.series} />
        </ChartCard>
        <ChartCard title={t.orders} subtitle={period === 90 ? t.perWeek : t.perDay} loading={loading}>
          <OrdersChart data={stats.series} />
        </ChartCard>
      </Box>

      <Box className="grid gap-6 xl:grid-cols-3">
        <ChartCard
          title={t.popularProducts}
          subtitle={t.quantitiesSold}
          loading={loading}
          action={
            <Button component={Link} href={ROUTES.admin.products} size="small" endIcon={<ArrowForwardRounded />}>
              {t.catalog}
            </Button>
          }
        >
          {stats.top.length ? <RankingChart data={stats.top} dataKey="quantity" /> : <EmptyState compact icon={<LocalPizzaRounded />} title={t.noSales} />}
        </ChartCard>

        <Card className="p-5 md:p-6">
          <Box className="mb-4 flex items-center justify-between">
            <Typography variant="h6" component="h2">
              {t.stockAlerts}
            </Typography>
            <Chip size="small" color={lowStock.length ? 'error' : 'success'} label={lowStock.length} />
          </Box>
          {lowStock.length === 0 ? (
            <EmptyState compact icon={<Inventory2Rounded />} title={t.stockGreen} />
          ) : (
            <Box className="space-y-4">
              {lowStock.slice(0, 5).map((i) => (
                <Box key={i.id}>
                  <Box className="mb-1 flex items-center justify-between gap-2">
                    <Typography fontWeight={700} className="flex items-center gap-1.5">
                      <WarningAmberRounded fontSize="small" className="text-tomato-500" /> {i.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {i.stock} / {i.threshold} {i.unit}
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={Math.min(100, (i.stock / Math.max(1, i.threshold * 2)) * 100)} color="error" className="h-1.5 rounded-full" />
                </Box>
              ))}
              <Button component={Link} href={ROUTES.admin.stock} variant="outlined" fullWidth>
                {t.manageStock}
              </Button>
            </Box>
          )}
        </Card>

        <Card className="p-5 md:p-6">
          <Typography variant="h6" component="h2" className="mb-4">
            {t.recentActivity}
          </Typography>
          <Box component="ol" className="m-0 list-none space-y-4 p-0">
            {activity.slice(0, 7).map((a, i) => (
              <motion.li key={a.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-3">
                <Box className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cream-200 text-charcoal-700">{ACTIVITY_ICONS[a.kind]}</Box>
                <Box className="min-w-0">
                  <Typography variant="body2" fontWeight={600}>
                    {a.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {fmt.relative(a.date)}
                  </Typography>
                </Box>
              </motion.li>
            ))}
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
