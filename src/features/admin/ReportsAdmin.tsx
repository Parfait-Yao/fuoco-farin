'use client';

import * as React from 'react';
import { Alert, Box, Button, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import FileDownloadRounded from '@mui/icons-material/FileDownloadRounded';
import PaymentsRounded from '@mui/icons-material/PaymentsRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import ShoppingCartRounded from '@mui/icons-material/ShoppingCartRounded';
import CancelRounded from '@mui/icons-material/CancelRounded';
import PrintRounded from '@mui/icons-material/PrintRounded';
import { PageHeader, StatCard } from '@/components/ui';
import { notify } from '@/store/uiStore';
import { useFormat, useMessages } from '@/i18n/client';
import { downloadCsv } from '@/lib/utils';
import type { Period } from './analytics';
import { useAdminStats } from './useAdminStats';
import { DonutChart, OrdersChart, RankingChart, RevenueChart } from './charts';
import { ChartCard } from './AdminDashboard';
import { PeriodFilter } from './PeriodFilter';

export function ReportsAdmin() {
  const [period, setPeriod] = React.useState<Period>(30);
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const range = from && to && from <= to ? { from: new Date(`${from}T00:00:00Z`).toISOString(), to: new Date(`${to}T23:59:59Z`).toISOString() } : null;
  const { data: stats, loading, error } = useAdminStats(period, range);
  const t = useMessages('admin');
  const fmt = useFormat();

  const data = {
    revenue: stats?.revenue ?? 0,
    revenueTrend: stats?.revenueTrend ?? 0,
    count: stats?.validOrders ?? 0,
    average: stats?.averageBasket ?? 0,
    cancelRate: stats?.cancelRate ?? 0,
    series: stats?.series ?? [],
    top: (stats?.topProducts ?? []).slice(0, 8),
    payments: stats?.payments ?? [],
    districts: (stats?.districts ?? []).slice(0, 6),
    categories: stats?.categories ?? [],
    newCustomers: stats?.customers.new ?? 0,
    lowStock: stats?.lowStock ?? [],
  };
  const label = range ? `${from}_${to}` : `${period}d`;

  const exportCsv = () => {
    const usd = (cents: number) => (cents / 100).toFixed(2);
    downloadCsv(`report-${label}-${new Date().toISOString().slice(0, 10)}.csv`, [
      t.csvReport.series,
      ...data.series.map((p) => [p.label, usd(p.revenue), p.orders, p.cancelled]),
      [],
      t.csvReport.products,
      ...data.top.map((p) => [p.name, p.quantity, usd(p.revenue)]),
      [],
      t.csvReport.categories,
      ...data.categories.map((c) => [c.name, c.quantity, usd(c.revenue)]),
    ]);
    notify(t.reportExported);
  };

  return (
    <Box>
      <PageHeader
        title={t.reportsTitle}
        description={t.reportsHint}
        actions={
          <>
            <PeriodFilter
              value={period}
              onChange={(p) => {
                setPeriod(p);
                setFrom('');
                setTo('');
              }}
            />
            <TextField size="small" type="date" label={t.fromDate} value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField size="small" type="date" label={t.toDate} value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
            <Button variant="outlined" startIcon={<PrintRounded />} onClick={() => window.print()}>
              {t.print}
            </Button>
            <Button variant="contained" startIcon={<FileDownloadRounded />} onClick={exportCsv}>
              {t.exportCsv}
            </Button>
          </>
        }
      />
      {error && (
        <Alert severity="error" className="mb-4 rounded-2xl">
          {error}
        </Alert>
      )}
      <Box className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t.revenue} value={data.revenue} format={fmt.price} trend={data.revenueTrend} icon={<PaymentsRounded />} loading={loading} />
        <StatCard label={t.validOrders} value={data.count} icon={<ReceiptLongRounded />} tone="ember" loading={loading} />
        <StatCard label={t.averageBasket} value={data.average} format={fmt.price} icon={<ShoppingCartRounded />} tone="basil" loading={loading} />
        <StatCard label={t.cancelRate} value={data.cancelRate} format={(n) => `${fmt.number(Math.round(n * 10) / 10)}%`} icon={<CancelRounded />} tone="charcoal" loading={loading} />
      </Box>
      <Box className="grid gap-6">
        <ChartCard title={t.revenueTrend} subtitle={period === 90 ? t.perWeek : t.perDay} loading={loading}>
          <RevenueChart data={data.series} height={320} />
        </ChartCard>
        <Box className="grid gap-6 xl:grid-cols-2">
          <ChartCard title={t.ordersVolume} loading={loading}>
            <OrdersChart data={data.series} />
          </ChartCard>
          <ChartCard title={t.paymentMethods} subtitle={t.ordersShare} loading={loading}>
            <DonutChart data={data.payments} />
          </ChartCard>
        </Box>
        <Box className="grid gap-6 xl:grid-cols-2">
          <ChartCard title={t.topProducts} subtitle={t.quantitiesSold} loading={loading}>
            <RankingChart data={data.top} dataKey="quantity" />
          </ChartCard>
          <ChartCard title={t.revenueByDistrict} loading={loading}>
            <RankingChart data={data.districts} dataKey="revenue" money />
          </ChartCard>
        </Box>
        <Box className="grid gap-6 xl:grid-cols-2">
          <ChartCard title={t.salesByCategory} subtitle={t.revenue} loading={loading}>
            <RankingChart data={data.categories} dataKey="revenue" money />
          </ChartCard>
          <Card className="p-5 md:p-6">
            <Typography variant="h6" component="h2" className="mb-3">
              {t.customersAndStock}
            </Typography>
            <Typography>
              <strong>{data.newCustomers}</strong> {t.newCustomersPeriod}
            </Typography>
            <Typography className="mt-3" fontWeight={700}>
              {t.lowStocks(data.lowStock.length)}
            </Typography>
            {data.lowStock.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t.noLowStock}
              </Typography>
            ) : (
              <Box component="ul" className="m-0 mt-1 pl-5">
                {data.lowStock.map((i) => (
                  <li key={i.id}>
                    {i.name} : {i.stock} / {i.threshold} {i.unit}
                  </li>
                ))}
              </Box>
            )}
          </Card>
        </Box>
        <Card className="p-5 md:p-6">
          <Typography variant="h6" component="h2" className="mb-3">
            {t.productDetail}
          </Typography>
          <TableContainer>
            <Table size="small" aria-label={t.salesByProductAria}>
              <TableHead>
                <TableRow>
                  <TableCell>{t.product}</TableCell>
                  <TableCell align="right">{t.quantity}</TableCell>
                  <TableCell align="right">{t.revenue}</TableCell>
                  <TableCell align="right">{t.share}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.top.map((p) => (
                  <TableRow key={p.name} hover>
                    <TableCell>{p.name}</TableCell>
                    <TableCell align="right">{p.quantity}</TableCell>
                    <TableCell align="right">{fmt.price(p.revenue)}</TableCell>
                    <TableCell align="right">{data.revenue ? `${Math.round((p.revenue / data.revenue) * 100)}%` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Box>
    </Box>
  );
}
