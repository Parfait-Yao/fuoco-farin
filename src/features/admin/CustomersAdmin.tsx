'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, Box, Button, Card, Chip, FormControl, InputAdornment, InputLabel, MenuItem, Select, Skeleton, TextField, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import SearchRounded from '@mui/icons-material/SearchRounded';
import GroupRounded from '@mui/icons-material/GroupRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import PaymentsRounded from '@mui/icons-material/PaymentsRounded';
import ShoppingCartRounded from '@mui/icons-material/ShoppingCartRounded';
import BlockRounded from '@mui/icons-material/BlockRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import MailOutlineRounded from '@mui/icons-material/MailOutlineRounded';
import PhoneOutlined from '@mui/icons-material/PhoneOutlined';
import { ConfirmDialog, EmptyState, OrderStatusChip, PageHeader, ResponsiveTable, StatCard } from '@/components/ui';
import { useDataStore } from '@/store/dataStore';
import { attempt } from '@/store/uiStore';
import { useDebounced, useHydrated, useDataLoading } from '@/hooks';
import { initials } from '@/lib/format';
import { useFormat, useLocale, useMessages } from '@/i18n/client';
import { ROUTES } from '@/constants';
import type { Customer, Order } from '@/types';
import { RankingChart } from './charts';
import { timeSeries, topProducts } from './analytics';
import { OrdersChart } from './charts';

interface CustomerRow extends Customer {
  orders: number;
  spent: number;
  lastOrder?: string;
}

function useCustomerRows(): CustomerRow[] {
  const customers = useDataStore((s) => s.customers);
  const orders = useDataStore((s) => s.orders);
  return React.useMemo(() => {
    const byCustomer = new Map<string, Order[]>();
    orders.forEach((o) => o.customerId && byCustomer.set(o.customerId, [...(byCustomer.get(o.customerId) ?? []), o]));
    return customers.map((c) => {
      const list = byCustomer.get(c.id) ?? [];
      const valid = list.filter((o) => o.status !== 'cancelled');
      return { ...c, orders: list.length, spent: valid.reduce((s, o) => s + o.total, 0), lastOrder: list.map((o) => o.createdAt).sort().pop() };
    });
  }, [customers, orders]);
}

export function CustomersAdmin() {
  const router = useRouter();
  const rows = useCustomerRows();
  const loading = useDataLoading();
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState<'all' | Customer['status']>('all');
  const q = useDebounced(query).trim().toLowerCase();
  const t = useMessages('admin');
  const fmt = useFormat();

  const filtered = React.useMemo(
    () =>
      rows
        .filter((c) => (status === 'all' || c.status === status) && (!q || `${c.firstName} ${c.lastName} ${c.email} ${c.phone}`.toLowerCase().includes(q)))
        .sort((a, b) => b.spent - a.spent),
    [rows, status, q],
  );

  const columns: GridColDef<CustomerRow>[] = [
    {
      field: 'lastName',
      headerName: t.customer,
      flex: 1,
      minWidth: 220,
      valueGetter: (_v, row) => `${row.firstName} ${row.lastName}`,
      renderCell: ({ row }) => (
        <Box className="flex items-center gap-3">
          <Avatar sx={{ width: 36, height: 36, fontSize: 14, bgcolor: 'secondary.main' }}>{initials(row.firstName, row.lastName)}</Avatar>
          <Box className="min-w-0">
            <Typography fontWeight={700}>
              {row.firstName} {row.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary" className="block truncate">
              {row.email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    { field: 'city', headerName: t.colDistrict, width: 130 },
    { field: 'orders', headerName: t.orders, width: 110, type: 'number' },
    { field: 'spent', headerName: t.totalSpent, width: 150, valueFormatter: (v: number) => fmt.price(v) },
    { field: 'lastOrder', headerName: t.lastOrder, width: 160, valueFormatter: (v?: string) => (v ? fmt.date(v) : '—') },
    { field: 'status', headerName: t.status, width: 110, renderCell: ({ row }) => <Chip size="small" color={row.status === 'active' ? 'success' : 'default'} label={row.status === 'active' ? t.activeCustomer : t.blocked} /> },
  ];

  return (
    <Box>
      <PageHeader title={t.customers} description={t.customersHint(rows.length)} />
      <Card className="mb-4 grid gap-3 p-4 md:grid-cols-[1fr_200px]">
        <TextField size="small" placeholder={t.customerSearch} value={query} onChange={(e) => setQuery(e.target.value)} inputProps={{ 'aria-label': t.customerSearchAria }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> }} />
        <FormControl size="small">
          <InputLabel id="cust-status">{t.status}</InputLabel>
          <Select labelId="cust-status" label={t.status} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <MenuItem value="all">{t.all}</MenuItem>
            <MenuItem value="active">{t.activePlural}</MenuItem>
            <MenuItem value="blocked">{t.blockedPlural}</MenuItem>
          </Select>
        </FormControl>
      </Card>
      <ResponsiveTable
        ariaLabel={t.customersListAria}
        rows={filtered}
        columns={columns}
        loading={loading}
        onRowClick={(c) => router.push(ROUTES.admin.customer(c.id))}
        emptyState={<EmptyState icon={<GroupRounded />} title={t.noCustomer} />}
        renderCard={(c) => (
          <Box component={Link} href={ROUTES.admin.customer(c.id)} className="flex items-center gap-3 text-inherit no-underline">
            <Avatar sx={{ bgcolor: 'secondary.main' }}>{initials(c.firstName, c.lastName)}</Avatar>
            <Box className="min-w-0 flex-1">
              <Typography fontWeight={800}>
                {c.firstName} {c.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t.ordersAndSpent(c.orders, fmt.price(c.spent))}
              </Typography>
            </Box>
            <Chip size="small" color={c.status === 'active' ? 'success' : 'default'} label={c.status === 'active' ? t.activeCustomer : t.blocked} />
          </Box>
        )}
      />
    </Box>
  );
}

export function CustomerDetail({ id }: { id: string }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const rows = useCustomerRows();
  const orders = useDataStore((s) => s.orders);
  const pizzas = useDataStore((s) => s.pizzas);
  const setCustomerStatus = useDataStore((s) => s.setCustomerStatus);
  const [confirm, setConfirm] = React.useState(false);
  const customer = rows.find((c) => c.id === id);
  const t = useMessages('admin');
  const customLabel = useMessages('api').customPizzas;
  const locale = useLocale();
  const fmt = useFormat();
  const history = React.useMemo(() => orders.filter((o) => o.customerId === id), [orders, id]);
  const series = React.useMemo(() => timeSeries(history, 90, locale), [history, locale]);
  const favorites = React.useMemo(() => topProducts(history, pizzas, 4, customLabel), [history, pizzas, customLabel]);

  if (!hydrated) return <Skeleton variant="rounded" height={400} />;
  if (!customer) return <EmptyState icon={<GroupRounded />} title={t.customerNotFound} action={{ label: t.allCustomers, href: ROUTES.admin.customers }} />;

  const average = customer.orders ? customer.spent / Math.max(1, history.filter((o) => o.status !== 'cancelled').length) : 0;
  const blocked = customer.status === 'blocked';

  return (
    <Box>
      <PageHeader
        title={`${customer.firstName} ${customer.lastName}`}
        description={t.customerSince(fmt.date(customer.createdAt, { day: '2-digit', month: 'long', year: 'numeric' }))}
        breadcrumbs={[{ label: t.customers, href: ROUTES.admin.customers }, { label: `${customer.firstName} ${customer.lastName}` }]}
        actions={
          <>
            <Button component="a" href={`mailto:${customer.email}`} variant="outlined" startIcon={<MailOutlineRounded />}>
              {t.email}
            </Button>
            <Button variant="outlined" color={blocked ? 'success' : 'error'} startIcon={blocked ? <CheckCircleRounded /> : <BlockRounded />} onClick={() => setConfirm(true)}>
              {blocked ? t.unblock : t.block}
            </Button>
          </>
        }
      />
      <Box className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label={t.orders} value={customer.orders} icon={<ReceiptLongRounded />} />
        <StatCard label={t.totalSpent} value={customer.spent} format={fmt.price} icon={<PaymentsRounded />} tone="basil" />
        <StatCard label={t.averageBasket} value={average} format={fmt.price} icon={<ShoppingCartRounded />} tone="ember" />
      </Box>
      <Box className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Box className="space-y-6">
          <Card className="p-5 md:p-6">
            <Typography variant="h6" component="h2" className="mb-1">
              {t.purchaseStats}
            </Typography>
            <Typography variant="body2" color="text.secondary" className="mb-4">
              {t.ordersPerWeek90}
            </Typography>
            <OrdersChart data={series} height={220} />
          </Card>
          <Card className="p-5 md:p-6">
            <Typography variant="h6" component="h2" className="mb-3">
              {t.orderHistory}
            </Typography>
            {history.length === 0 ? (
              <EmptyState compact icon={<ReceiptLongRounded />} title={t.noOrders} />
            ) : (
              <Box component="ul" className="m-0 list-none divide-x-0 divide-y divide-solid divide-black/5 p-0">
                {history.map((o) => (
                  <li key={o.id}>
                    <Box component={Link} href={ROUTES.admin.order(o.id)} className="flex items-center gap-3 py-3 text-inherit no-underline hover:bg-cream-100">
                      <Box className="min-w-0 flex-1">
                        <Typography fontWeight={700}>{o.number}</Typography>
                        <Typography variant="body2" color="text.secondary" className="truncate">
                          {fmt.dateTime(o.createdAt)} · {o.items.map((i) => i.name).join(', ')}
                        </Typography>
                      </Box>
                      <Typography fontWeight={700} className="hidden sm:block">
                        {fmt.price(o.total)}
                      </Typography>
                      <OrderStatusChip status={o.status} />
                    </Box>
                  </li>
                ))}
              </Box>
            )}
          </Card>
        </Box>
        <Box className="space-y-4">
          <Card className="space-y-2 p-5">
            <Typography fontWeight={800}>{t.contactDetails}</Typography>
            <Typography color="text.secondary" className="flex items-center gap-2 break-all">
              <MailOutlineRounded fontSize="small" /> {customer.email}
            </Typography>
            <Typography color="text.secondary" className="flex items-center gap-2">
              <PhoneOutlined fontSize="small" /> {customer.phone}
            </Typography>
            <Typography color="text.secondary">{t.districtLine(customer.city)}</Typography>
          </Card>
          <Card className="p-5">
            <Typography fontWeight={800} className="mb-3">
              {t.favoritePizzas}
            </Typography>
            {favorites.length ? <RankingChart data={favorites} dataKey="quantity" /> : <Typography color="text.secondary">{t.noData}</Typography>}
          </Card>
        </Box>
      </Box>
      <ConfirmDialog
        open={confirm}
        danger={!blocked}
        title={blocked ? t.unblockTitle : t.blockTitle}
        message={blocked ? t.unblockText : t.blockText}
        confirmLabel={blocked ? t.unblock : t.block}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          void attempt(setCustomerStatus(customer.id, blocked ? 'active' : 'blocked'), blocked ? t.customerUnblocked : t.customerBlocked, 'info');
          setConfirm(false);
          if (!blocked) router.refresh();
        }}
      />
    </Box>
  );
}
