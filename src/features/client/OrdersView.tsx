'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Box, Button, IconButton, InputAdornment, Tab, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import SearchRounded from '@mui/icons-material/SearchRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import LocationOnRounded from '@mui/icons-material/LocationOnRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import { EmptyState, OrderStatusChip, PageHeader, ResponsiveTable } from '@/components/ui';
import { useDataLoading } from '@/hooks';
import { useFormat, useMessages } from '@/i18n/client';
import { ROUTES } from '@/constants';
import type { Order } from '@/types';
import { isActiveOrder, useMyOrders, useReorder } from './hooks';

const TABS = ['all', 'active', 'delivered', 'cancelled'] as const;

export function OrdersView() {
  const router = useRouter();
  const orders = useMyOrders();
  const reorder = useReorder();
  const loading = useDataLoading();
  const [tab, setTab] = React.useState<(typeof TABS)[number]>('all');
  const t = useMessages('account');
  const fmt = useFormat();
  const [query, setQuery] = React.useState('');

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter(
      (o) =>
        (tab === 'all' || (tab === 'active' ? isActiveOrder(o) : o.status === tab)) &&
        (!q || o.number.toLowerCase().includes(q) || o.items.some((i) => i.name.toLowerCase().includes(q))),
    );
  }, [orders, tab, query]);

  const actions = (o: Order) => (
    <Box className="flex" onClick={(e) => e.stopPropagation()}>
      {isActiveOrder(o) && (
        <Tooltip title={t.trackOrder}>
          <IconButton component={Link} href={ROUTES.account.tracking(o.id)} aria-label={t.trackNumber(o.number)}>
            <LocationOnRounded />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title={t.reorder}>
        <IconButton onClick={() => reorder(o)} aria-label={t.reorderNumber(o.number)}>
          <ReplayRounded />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const columns: GridColDef<Order>[] = [
    { field: 'number', headerName: t.colOrder, width: 130, renderCell: ({ value }) => <strong>{value}</strong> },
    { field: 'createdAt', headerName: t.colDate, width: 170, valueFormatter: (value: string) => fmt.dateTime(value) },
    { field: 'items', headerName: t.colItems, flex: 1, minWidth: 220, sortable: false, valueGetter: (_v, row) => row.items.map((i) => `${i.quantity}× ${i.name}`).join(', ') },
    { field: 'total', headerName: t.colTotal, width: 130, valueFormatter: (value: number) => fmt.price(value) },
    { field: 'status', headerName: t.colStatus, width: 160, renderCell: ({ row }) => <OrderStatusChip status={row.status} /> },
    { field: 'actions', headerName: '', width: 110, sortable: false, renderCell: ({ row }) => actions(row) },
  ];

  return (
    <Box>
      <PageHeader
        title={t.myOrders}
        description={t.myOrdersHint}
        actions={
          <Button component={Link} href={ROUTES.menu} variant="contained">
            {t.newOrder}
          </Button>
        }
      />
      <Box className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile aria-label={t.filterByStatus}>
          {TABS.map((key) => (
            <Tab key={key} value={key} label={t.tabs[key]} />
          ))}
        </Tabs>
        <TextField
          size="small"
          placeholder={t.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          inputProps={{ 'aria-label': t.searchAria }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> }}
          className="md:max-w-xs"
        />
      </Box>
      <ResponsiveTable
        ariaLabel={t.ordersListAria}
        rows={rows}
        columns={columns}
        loading={loading}
        onRowClick={(o) => router.push(ROUTES.account.order(o.id))}
        emptyState={<EmptyState icon={<ReceiptLongRounded />} title={t.noOrders} description={t.noOrdersHint} action={{ label: t.order, href: ROUTES.menu }} />}
        renderCard={(o) => (
          <Box>
            <Box component={Link} href={ROUTES.account.order(o.id)} className="flex items-start justify-between gap-2 text-inherit no-underline">
              <Box className="min-w-0">
                <Typography fontWeight={800}>{o.number}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {fmt.dateTime(o.createdAt)}
                </Typography>
              </Box>
              <OrderStatusChip status={o.status} />
            </Box>
            <Typography variant="body2" color="text.secondary" className="mt-2 line-clamp-2">
              {o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
            </Typography>
            <Box className="mt-2 flex items-center justify-between">
              <Typography fontWeight={800} color="primary">
                {fmt.price(o.total)}
              </Typography>
              {actions(o)}
            </Box>
          </Box>
        )}
      />
    </Box>
  );
}
