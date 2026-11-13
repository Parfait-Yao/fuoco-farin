'use client';

import * as React from 'react';
import Link from 'next/link';
import { Alert, Box, Button, Card, MenuItem, Rating, Skeleton, TextField, Typography } from '@mui/material';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import LocationOnRounded from '@mui/icons-material/LocationOnRounded';
import CancelRounded from '@mui/icons-material/CancelRounded';
import SearchOffRounded from '@mui/icons-material/SearchOffRounded';
import RateReviewRounded from '@mui/icons-material/RateReviewRounded';
import { AppDialog, ConfirmDialog, EmptyState, LoadingButton, OrderStatusChip, PageHeader } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { attempt } from '@/store/uiStore';
import { useDataLoading } from '@/hooks';
import { useFormat, useMessages } from '@/i18n/client';
import { ROUTES } from '@/constants';
import { OrderInfoCards, OrderItemsCard } from './OrderPanels';
import { OrderTimeline } from './OrderTimeline';
import { isActiveOrder, useReorder } from './hooks';

function ReviewDialog({ open, onClose, orderId, pizzas, orderNumber }: { open: boolean; onClose: () => void; orderId: string; pizzas: { id: string; name: string }[]; orderNumber: string }) {
  const submitReview = useDataStore((s) => s.submitReview);
  const [pizzaId, setPizzaId] = React.useState(pizzas[0]?.id ?? '');
  const [rating, setRating] = React.useState<number | null>(5);
  const [comment, setComment] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const t = useMessages('account');
  const error = comment.trim().length > 0 && comment.trim().length < 10;

  const submit = async () => {
    if (!rating || comment.trim().length < 10 || !pizzaId) return;
    setLoading(true);
    const review = await attempt(submitReview({ orderId, pizzaId, rating, comment: comment.trim() }), t.reviewThanks);
    setLoading(false);
    if (!review) return;
    onClose();
    setComment('');
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={t.giveReview}
      subtitle={t.orderNumber(orderNumber)}
      actions={
        <>
          <Button onClick={onClose} color="inherit">
            {t.cancel}
          </Button>
          <LoadingButton variant="contained" loading={loading} onClick={submit} disabled={!rating || comment.trim().length < 10}>
            {t.publish}
          </LoadingButton>
        </>
      }
    >
      {pizzas.length > 1 && (
        <TextField select label={t.pizza} value={pizzaId} onChange={(e) => setPizzaId(e.target.value)} className="mb-4">
          {pizzas.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
      )}
      <Typography fontWeight={700} id="rating-label">
        {t.yourRating}
      </Typography>
      <Rating value={rating} onChange={(_, v) => setRating(v)} size="large" aria-labelledby="rating-label" className="mb-4" />
      <TextField label={t.yourComment} multiline minRows={4} value={comment} onChange={(e) => setComment(e.target.value)} error={error} helperText={error ? t.min10 : `${comment.length}/500`} inputProps={{ maxLength: 500 }} />
    </AppDialog>
  );
}

export function OrderDetailView({ id }: { id: string }) {
  const loading = useDataLoading();
  const userId = useAuthStore((s) => s.user?.id);
  const order = useDataStore((s) => s.orders.find((o) => o.id === id));
  const cancelOrder = useDataStore((s) => s.cancelOrder);
  const reorder = useReorder();
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const t = useMessages('account');
  const fmt = useFormat();

  if (loading) return <Skeleton variant="rounded" height={400} />;
  if (!order || order.customerId !== userId) {
    return <EmptyState icon={<SearchOffRounded />} title={t.orderNotFound} description={t.orderNotFoundHint} action={{ label: t.myOrders, href: ROUTES.account.orders }} />;
  }

  return (
    <Box>
      <PageHeader
        title={t.orderNumber(order.number)}
        description={t.placedOn(fmt.dateTime(order.createdAt))}
        breadcrumbs={[{ label: t.myOrders, href: ROUTES.account.orders }, { label: order.number }]}
        actions={
          <>
            {isActiveOrder(order) && (
              <Button component={Link} href={ROUTES.account.tracking(order.id)} variant="contained" startIcon={<LocationOnRounded />}>
                {t.track}
              </Button>
            )}
            {order.status === 'delivered' && order.items.some((i) => i.pizzaId) && (
              <Button variant="outlined" startIcon={<RateReviewRounded />} onClick={() => setReviewOpen(true)}>
                {t.giveReview}
              </Button>
            )}
            <Button variant="outlined" startIcon={<ReplayRounded />} onClick={() => reorder(order)}>
              {t.reorder}
            </Button>
          </>
        }
      />
      <Box className="mb-6 flex items-center gap-2">
        <OrderStatusChip status={order.status} size="medium" />
      </Box>
      <Box className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Box className="space-y-6">
          <OrderItemsCard order={order} />
          <Card className="p-5 md:p-6">
            <Typography variant="h6" component="h2" className="mb-4">
              {t.history}
            </Typography>
            <OrderTimeline order={order} />
          </Card>
        </Box>
        <Box className="space-y-4">
          <OrderInfoCards order={order} />
          {order.status === 'received' && (
            <Alert
              severity="warning"
              className="rounded-2xl"
              action={
                <Button color="inherit" size="small" startIcon={<CancelRounded />} onClick={() => setCancelOpen(true)}>
                  {t.cancel}
                </Button>
              }
            >
              {t.cancelPossible}
            </Alert>
          )}
        </Box>
      </Box>
      <ConfirmDialog
        open={cancelOpen}
        danger
        title={t.cancelTitle}
        message={t.cancelText}
        confirmLabel={t.cancelConfirm}
        onClose={() => setCancelOpen(false)}
        onConfirm={async () => {
          setCancelOpen(false);
          await attempt(cancelOrder(order.id, t.cancelReason), t.cancelled, 'info');
        }}
      />
      <ReviewDialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        orderId={order.id}
        pizzas={Array.from(new Map(order.items.filter((i) => i.pizzaId).map((i) => [i.pizzaId!, { id: i.pizzaId!, name: i.name }])).values())}
        orderNumber={order.number}
      />
    </Box>
  );
}
