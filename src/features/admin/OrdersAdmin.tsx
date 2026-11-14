'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Box, Button, Card, Chip, FormControl, IconButton, InputAdornment, InputLabel, ListItemIcon, Menu, MenuItem, Select, Skeleton, TextField, Tooltip, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import SearchRounded from '@mui/icons-material/SearchRounded';
import MoreVertRounded from '@mui/icons-material/MoreVertRounded';
import VisibilityRounded from '@mui/icons-material/VisibilityRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import CancelRounded from '@mui/icons-material/CancelRounded';
import FileDownloadRounded from '@mui/icons-material/FileDownloadRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import SearchOffRounded from '@mui/icons-material/SearchOffRounded';
import { ConfirmDialog, EmptyState, OrderStatusChip, PageHeader, ResponsiveTable, useConfirm } from '@/components/ui';
import { OrderInfoCards, OrderItemsCard } from '@/features/client/OrderPanels';
import { OrderTimeline } from '@/features/client/OrderTimeline';
import { useDataStore } from '@/store/dataStore';
import { attempt, notify } from '@/store/uiStore';
import { useDebounced, useDataLoading } from '@/hooks';
import { useFormat, useMessages } from '@/i18n/client';
import { downloadCsv } from '@/lib/utils';
import { ORDER_FLOW, PAYMENT_METHOD_KEYS, ROUTES } from '@/constants';
import type { Order, OrderStatus, PaymentMethod } from '@/types';

/**
 * "Delivered" is confirmed by the customer who receives the order (live update
 * on the admin side). Only guest orders, without an account, are closed by the admin.
 */
const customerConfirms = (order: Order) => Boolean(order.customerId);

/** Next status the admin can set in the normal flow, if any. */
export const nextStatus = (order: Order): OrderStatus | null => {
  const i = ORDER_FLOW.indexOf(order.status);
  const next = i >= 0 && i < ORDER_FLOW.length - 1 ? ORDER_FLOW[i + 1] : null;
  return next === 'delivered' && customerConfirms(order) ? null : next;
};

function OrderActions({ order, onCancel }: { order: Order; onCancel: (o: Order) => void }) {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const setStatus = useDataStore((s) => s.setOrderStatus);
  const next = nextStatus(order);
  const t = useMessages('admin');
  const labels = useMessages('domain').orderStatus;
  return (
    <Box onClick={(e) => e.stopPropagation()}>
      <Tooltip title={t.actions}>
        <IconButton aria-label={t.actionsFor(order.number)} onClick={(e) => setAnchor(e.currentTarget)}>
          <MoreVertRounded />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem component={Link} href={ROUTES.admin.order(order.id)}>
          <ListItemIcon>
            <VisibilityRounded fontSize="small" />
          </ListItemIcon>
          {t.viewDetail}
        </MenuItem>
        {next && (
          <MenuItem
            disabled={order.paymentMethod === 'card' && order.paymentStatus !== 'paid'}
            onClick={() => {
              setAnchor(null);
              void attempt(setStatus(order.id, next), `${order.number}: ${labels[next].label}`);
            }}
          >
            <ListItemIcon>
              <ArrowForwardRounded fontSize="small" />
            </ListItemIcon>
            {t.moveTo(labels[next].label)}
          </MenuItem>
        )}
        {(order.status === 'received' || order.status === 'preparing') && (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              onCancel(order);
            }}
            className="text-red-700"
          >
            <ListItemIcon>
              <CancelRounded fontSize="small" color="error" />
            </ListItemIcon>
            {t.cancel}
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}

export function OrdersAdmin() {
  const router = useRouter();
  const orders = useDataStore((s) => s.orders);
  const setStatus = useDataStore((s) => s.setOrderStatus);
  const loading = useDataLoading();
  const [query, setQuery] = React.useState('');
  const [status, setStatusFilter] = React.useState<OrderStatus | 'all'>('all');
  const [payment, setPayment] = React.useState<PaymentMethod | 'all'>('all');
  const q = useDebounced(query).trim().toLowerCase();
  const confirm = useConfirm<Order>();
  const t = useMessages('admin');
  const domain = useMessages('domain');
  const fmt = useFormat();

  const rows = React.useMemo(
    () =>
      orders.filter(
        (o) =>
          (status === 'all' || o.status === status) &&
          (payment === 'all' || o.paymentMethod === payment) &&
          (!q || o.number.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || o.customerPhone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))),
      ),
    [orders, status, payment, q],
  );

  const counts = React.useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    orders.forEach((o) => (c[o.status] = (c[o.status] ?? 0) + 1));
    return c;
  }, [orders]);

  const columns: GridColDef<Order>[] = [
    { field: 'number', headerName: t.colNumber, width: 110, renderCell: ({ value }) => <strong>{value}</strong> },
    { field: 'createdAt', headerName: t.date, width: 150, valueFormatter: (v: string) => fmt.dateTime(v) },
    { field: 'customerName', headerName: t.customer, flex: 1, minWidth: 160 },
    { field: 'items', headerName: t.colItems, width: 90, valueGetter: (_v, row) => row.items.reduce((n, i) => n + i.quantity, 0) },
    { field: 'total', headerName: t.total, width: 130, valueFormatter: (v: number) => fmt.price(v) },
    { field: 'paymentMethod', headerName: t.payment, width: 150, valueFormatter: (v: PaymentMethod) => domain.payment[v].label },
    { field: 'status', headerName: t.status, width: 160, renderCell: ({ row }) => <OrderStatusChip status={row.status} /> },
    { field: 'actions', headerName: '', width: 64, sortable: false, renderCell: ({ row }) => <OrderActions order={row} onCancel={confirm.ask} /> },
  ];

  const exportCsv = () => {
    downloadCsv(`orders-${new Date().toISOString().slice(0, 10)}.csv`, [
      t.csvOrders,
      ...rows.map((o) => [o.number, fmt.dateTime(o.createdAt), o.customerName, o.customerPhone, (o.total / 100).toFixed(2), domain.payment[o.paymentMethod].label, domain.orderStatus[o.status].label]),
    ]);
    notify(t.ordersExported(rows.length));
  };

  return (
    <Box>
      <PageHeader
        title={t.orders}
        description={t.ordersHint(counts.received ?? 0, (counts.preparing ?? 0) + (counts.delivering ?? 0))}
        actions={
          <Button variant="outlined" startIcon={<FileDownloadRounded />} onClick={exportCsv} disabled={!rows.length}>
            {t.exportCsv}
          </Button>
        }
      />
      <Box className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {(['all', ...ORDER_FLOW, 'cancelled'] as const).map((s) => (
          <Chip
            key={s}
            clickable
            label={`${s === 'all' ? t.allFem : domain.orderStatus[s].label} (${counts[s] ?? 0})`}
            color={status === s ? 'primary' : 'default'}
            variant={status === s ? 'filled' : 'outlined'}
            onClick={() => setStatusFilter(s)}
            className={status === s ? '' : 'bg-white'}
          />
        ))}
      </Box>
      <Card className="mb-4 flex flex-col gap-3 p-4 md:flex-row">
        <TextField
          size="small"
          placeholder={t.orderSearch}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          inputProps={{ 'aria-label': t.orderSearchAria }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> }}
        />
        <FormControl size="small" className="md:min-w-[220px]">
          <InputLabel id="pay-filter">{t.payment}</InputLabel>
          <Select labelId="pay-filter" label={t.payment} value={payment} onChange={(e) => setPayment(e.target.value as PaymentMethod | 'all')}>
            <MenuItem value="all">{t.allMethods}</MenuItem>
            {PAYMENT_METHOD_KEYS.map((m) => (
              <MenuItem key={m} value={m}>
                {domain.payment[m].label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Card>
      <ResponsiveTable
        ariaLabel={t.ordersListAria}
        rows={rows}
        columns={columns}
        loading={loading}
        onRowClick={(o) => router.push(ROUTES.admin.order(o.id))}
        emptyState={<EmptyState icon={<SearchOffRounded />} title={t.noOrders} description={t.changeFilters} />}
        renderCard={(o) => (
          <Box>
            <Box className="flex items-start justify-between gap-2">
              <Box component={Link} href={ROUTES.admin.order(o.id)} className="min-w-0 text-inherit no-underline">
                <Typography fontWeight={800}>{o.number}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {o.customerName} · {fmt.dateTime(o.createdAt)}
                </Typography>
              </Box>
              <OrderActions order={o} onCancel={confirm.ask} />
            </Box>
            <Box className="mt-2 flex items-center justify-between">
              <OrderStatusChip status={o.status} />
              <Typography fontWeight={800} color="primary">
                {fmt.price(o.total)}
              </Typography>
            </Box>
          </Box>
        )}
      />
      <ConfirmDialog
        open={confirm.open}
        danger
        title={t.cancelOrderTitle}
        message={confirm.target ? t.cancelOrderText(confirm.target.number, confirm.target.customerName) : ''}
        confirmLabel={t.cancelOrder}
        onClose={confirm.close}
        onConfirm={() => {
          if (confirm.target) void attempt(setStatus(confirm.target.id, 'cancelled', t.cancelledByRestaurant), t.orderCancelled, 'info');
          confirm.close();
        }}
      />
    </Box>
  );
}

export function OrderAdminDetail({ id }: { id: string }) {
  const loading = useDataLoading();
  const order = useDataStore((s) => s.orders.find((o) => o.id === id));
  const setStatus = useDataStore((s) => s.setOrderStatus);
  const [target, setTarget] = React.useState<OrderStatus | ''>('');
  const [note, setNote] = React.useState('');
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const t = useMessages('admin');
  const labels = useMessages('domain').orderStatus;
  const fmt = useFormat();

  if (loading && !order) return <Skeleton variant="rounded" height={420} />;
  if (!order) return <EmptyState icon={<ReceiptLongRounded />} title={t.orderNotFound} action={{ label: t.allOrders, href: ROUTES.admin.orders }} />;

  const finished = order.status === 'delivered' || order.status === 'cancelled';
  // Forward-only flow (enforced by the API): later steps, or cancellation.
  const options = finished
    ? []
    : ([...ORDER_FLOW.slice(ORDER_FLOW.indexOf(order.status) + 1).filter((s) => s !== 'delivered' || !customerConfirms(order)), 'cancelled'] as OrderStatus[]);
  const awaitingPayment = order.paymentMethod === 'card' && order.paymentStatus !== 'paid';
  const next = nextStatus(order);

  const apply = async () => {
    if (!target) return;
    setConfirmOpen(false);
    const done = await attempt(setStatus(order.id, target, note.trim() || undefined), t.statusUpdated(labels[target].label));
    if (done) {
      setTarget('');
      setNote('');
    }
  };

  return (
    <Box>
      <PageHeader
        title={t.orderTitle(order.number)}
        description={t.receivedOn(fmt.date(order.createdAt, { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }))}
        breadcrumbs={[{ label: t.orders, href: ROUTES.admin.orders }, { label: order.number }]}
        actions={<OrderStatusChip status={order.status} size="medium" />}
      />
      <Box className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Box className="space-y-6">
          <OrderItemsCard order={order} />
          <Card className="p-5 md:p-6">
            <Typography variant="h6" component="h2" className="mb-4">
              {t.statusHistory}
            </Typography>
            <OrderTimeline order={order} />
            <Box component="ul" className="m-0 mt-6 list-none space-y-1 rounded-2xl bg-cream-100 p-4">
              {order.history.map((h, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="font-semibold">{labels[h.status].label}</span>
                  <span className="text-charcoal-500">
                    {fmt.dateTime(h.date)}
                    {h.note ? ` · ${h.note}` : ''}
                  </span>
                </li>
              ))}
            </Box>
          </Card>
        </Box>
        <Box className="space-y-4">
          <Card className="p-5">
            <Typography variant="h6" component="h2" className="mb-3">
              {t.changeStatus}
            </Typography>
            {finished && (
              <Typography variant="body2" color="text.secondary" className="mb-3">
                {t.orderClosed}
              </Typography>
            )}
            {awaitingPayment && !finished && (
              <Typography variant="body2" color="warning.main" className="mb-3">
                {t.awaitingPayment}
              </Typography>
            )}
            {order.status === 'delivering' && customerConfirms(order) && (
              <Typography variant="body2" color="info.main" className="mb-3">
                {t.awaitingCustomerReceipt}
              </Typography>
            )}
            {next && (
              <Button
                fullWidth
                variant="contained"
                className="mb-3"
                endIcon={<ArrowForwardRounded />}
                disabled={awaitingPayment}
                onClick={() => void attempt(setStatus(order.id, next), t.statusUpdated(labels[next].label))}
              >
                {labels[next].label}
              </Button>
            )}
            <FormControl fullWidth size="small" className="mb-3">
              <InputLabel id="status-select">{t.otherStatus}</InputLabel>
              <Select labelId="status-select" label={t.otherStatus} value={target} onChange={(e) => setTarget(e.target.value as OrderStatus)}>
                {options.map((s) => (
                  <MenuItem key={s} value={s}>
                    {labels[s].label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField size="small" label={t.internalNote} value={note} onChange={(e) => setNote(e.target.value)} className="mb-3" />
            <Button fullWidth variant="outlined" disabled={!target} onClick={() => (target === 'cancelled' ? setConfirmOpen(true) : apply())}>
              {t.apply}
            </Button>
          </Card>
          <OrderInfoCards order={order} showCustomer />
          {order.customerId && (
            <Button fullWidth component={Link} href={ROUTES.admin.customer(order.customerId)} variant="outlined" color="inherit">
              {t.customerCard}
            </Button>
          )}
        </Box>
      </Box>
      <ConfirmDialog open={confirmOpen} danger title={t.cancelOrderConfirm} message={t.cancelOrderConfirmText} confirmLabel={t.cancelOrder} onClose={() => setConfirmOpen(false)} onConfirm={apply} />
    </Box>
  );
}
