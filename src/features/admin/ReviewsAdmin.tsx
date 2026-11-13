'use client';

import * as React from 'react';
import { Avatar, Box, Card, Chip, IconButton, Rating, Switch, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import RateReviewRounded from '@mui/icons-material/RateReviewRounded';
import { ConfirmDialog, EmptyState, PageHeader, ResponsiveTable, StatCard, useConfirm } from '@/components/ui';
import { useDataStore } from '@/store/dataStore';
import { attempt } from '@/store/uiStore';
import { useDataLoading } from '@/hooks';
import { useFormat, useMessages } from '@/i18n/client';
import type { Review } from '@/types';

export function ReviewsAdmin() {
  const reviews = useDataStore((s) => s.reviews);
  const pizzas = useDataStore((s) => s.pizzas);
  const setPublished = useDataStore((s) => s.setReviewPublished);
  const remove = useDataStore((s) => s.deleteReview);
  const loading = useDataLoading();
  const [tab, setTab] = React.useState<'all' | 'pending' | 'published'>('all');
  const confirm = useConfirm<Review>();
  const t = useMessages('admin');
  const fmt = useFormat();

  const rows = React.useMemo(() => reviews.filter((r) => tab === 'all' || (tab === 'pending' ? !r.published : r.published)).sort((a, b) => b.date.localeCompare(a.date)), [reviews, tab]);
  const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const pending = reviews.filter((r) => !r.published).length;
  const pizzaName = (id: string) => pizzas.find((p) => p.id === id)?.name ?? '—';

  const togglePublish = (r: Review) => {
    void attempt(setPublished(r.id, !r.published), r.published ? t.reviewHidden : t.reviewPublished, 'info');
  };

  const actions = (r: Review) => (
    <Box className="flex items-center">
      <Tooltip title={r.published ? t.hide : t.publish}>
        <Switch checked={r.published} onChange={() => togglePublish(r)} inputProps={{ 'aria-label': t.publicationOf(r.customerName) }} />
      </Tooltip>
      <Tooltip title={t.delete}>
        <IconButton aria-label={t.deleteReviewOf(r.customerName)} onClick={() => confirm.ask(r)}>
          <DeleteOutlineRounded fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const columns: GridColDef<Review>[] = [
    {
      field: 'customerName',
      headerName: t.customer,
      width: 190,
      renderCell: ({ row }) => (
        <Box className="flex items-center gap-2">
          <Avatar src={row.avatar} alt="" sx={{ width: 32, height: 32 }} />
          <Typography fontWeight={700}>{row.customerName}</Typography>
        </Box>
      ),
    },
    { field: 'rating', headerName: t.colRating, width: 140, renderCell: ({ row }) => <Rating value={row.rating} readOnly size="small" /> },
    { field: 'comment', headerName: t.colComment, flex: 1, minWidth: 260, renderCell: ({ value }) => <Typography variant="body2" className="line-clamp-2 whitespace-normal">{value}</Typography> },
    { field: 'pizzaId', headerName: t.colPizza, width: 160, valueGetter: (v: string) => pizzaName(v) },
    { field: 'date', headerName: t.date, width: 120, valueFormatter: (v: string) => fmt.date(v) },
    { field: 'published', headerName: t.colPublication, width: 150, renderCell: ({ row }) => actions(row) },
  ];

  return (
    <Box>
      <PageHeader title={t.reviewsTitle} description={t.reviewsHint} />
      <Box className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label={t.averageRating} value={average} format={(n) => `${fmt.number(Math.round(n * 100) / 100)} / 5`} icon={<StarRounded />} tone="ember" loading={loading} />
        <StatCard label={t.reviewsReceived} value={reviews.length} icon={<RateReviewRounded />} loading={loading} />
        <StatCard label={t.toModerate} value={pending} icon={<RateReviewRounded />} tone="charcoal" loading={loading} />
      </Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} className="mb-4" aria-label={t.filterReviews}>
        <Tab value="all" label={t.all} />
        <Tab value="pending" label={t.toModerateCount(pending)} />
        <Tab value="published" label={t.published} />
      </Tabs>
      <ResponsiveTable
        ariaLabel={t.reviewsListAria}
        rows={rows}
        columns={columns}
        loading={loading}
        emptyState={<EmptyState icon={<RateReviewRounded />} title={t.noReview} />}
        renderCard={(r) => (
          <Box>
            <Box className="flex items-center gap-2">
              <Avatar src={r.avatar} alt="" sx={{ width: 32, height: 32 }} />
              <Box className="flex-1">
                <Typography fontWeight={800}>{r.customerName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {pizzaName(r.pizzaId)} · {fmt.date(r.date)}
                </Typography>
              </Box>
              <Chip size="small" color={r.published ? 'success' : 'default'} label={r.published ? t.publishedOne : t.pendingOne} />
            </Box>
            <Rating value={r.rating} readOnly size="small" className="mt-2" />
            <Typography variant="body2" color="text.secondary">
              {r.comment}
            </Typography>
            <Box className="mt-1 flex justify-end">{actions(r)}</Box>
          </Box>
        )}
      />
      <Card className="mt-4 p-4">
        <Typography variant="body2" color="text.secondary">
          {t.reviewsNote}
        </Typography>
      </Card>
      <ConfirmDialog
        open={confirm.open}
        danger
        title={t.deleteReviewTitle}
        message={t.deleteReviewText}
        confirmLabel={t.delete}
        onClose={confirm.close}
        onConfirm={() => {
          if (confirm.target) void attempt(remove(confirm.target.id), t.reviewDeleted, 'info');
          confirm.close();
        }}
      />
    </Box>
  );
}
