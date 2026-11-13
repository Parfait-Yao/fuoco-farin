'use client';

import * as React from 'react';
import Link from 'next/link';
import { Box, Button, Card, Divider, Typography } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import SearchOffRounded from '@mui/icons-material/SearchOffRounded';
import confetti from 'canvas-confetti';
import { motion, useReducedMotion } from 'framer-motion';
import { EmptyState, ListSkeleton } from '@/components/ui';
import { OrderTimeline } from '@/features/client/OrderTimeline';
import { useDataStore } from '@/store/dataStore';
import { useAuthStore } from '@/store/authStore';
import { useHydrated } from '@/hooks';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { orderService } from '@/services';
import { useCartStore } from '@/store/cartStore';
import { notify } from '@/store/uiStore';
import type { Order } from '@/types';
import { ROUTES } from '@/constants';
import { useFormat, useMessages } from '@/i18n/client';

export function OrderConfirmation({ id }: { id: string }) {
  const hydrated = useHydrated();
  const cached = useDataStore((s) => s.orders.find((o) => o.id === id));
  const user = useAuthStore((s) => s.user);
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const sessionId = searchParams.get('session_id');
  const [fetched, setFetched] = React.useState<Order | null | undefined>(undefined);
  const [paymentError, setPaymentError] = React.useState<string | null>(null);
  const [verifying, setVerifying] = React.useState(Boolean(sessionId));
  const verified = React.useRef(false);
  const t = useMessages('checkout');
  const domain = useMessages('domain');
  const fmt = useFormat();
  const order = fetched ?? cached ?? undefined;

  // Back from Stripe: the server checks the payment, then the cart can be emptied.
  React.useEffect(() => {
    if (!hydrated || !sessionId || verified.current) return;
    verified.current = true;
    orderService
      .confirmOnlinePayment(id, sessionId, token)
      .then((paid) => {
        setFetched(paid);
        useDataStore.setState((s) => ({ orders: [paid, ...s.orders.filter((o) => o.id !== paid.id)] }));
        useCartStore.getState().clear();
        notify(t.paidConfirmed(paid.number));
      })
      .catch((e: Error) => setPaymentError(e.message))
      .finally(() => {
        setVerifying(false);
        // Drop session_id from the address bar; keep the guest token for reloads.
        window.history.replaceState(null, '', `${ROUTES.confirmation(id)}${token ? `?token=${encodeURIComponent(token)}` : ''}`);
      });
  }, [hydrated, sessionId, id, token, t]);

  // Direct visit or reload: read the order from the API (owner, or guest token).
  React.useEffect(() => {
    if (!hydrated || cached || sessionId) return;
    api
      .get<Order>(`/api/orders/${id}${token ? `?token=${encodeURIComponent(token)}` : ''}`)
      .then(setFetched)
      .catch(() => setFetched(null));
  }, [hydrated, cached, sessionId, id, token]);
  const reduced = useReducedMotion();

  React.useEffect(() => {
    if (!order || reduced || verifying || paymentError) return;
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.35 }, colors: ['#C8341C', '#F28C28', '#2E8B57', '#FBF6EC'] });
  }, [order, reduced, verifying, paymentError]);

  if (!hydrated || verifying || (!order && fetched === undefined && !paymentError)) return <ListSkeleton rows={5} />;
  if (paymentError) {
    return (
      <EmptyState
        icon={<SearchOffRounded />}
        title={t.paymentNotConfirmed}
        description={t.cartKept(paymentError)}
        action={{ label: t.backToPayment, href: ROUTES.checkout }}
      />
    );
  }
  if (!order) return <EmptyState icon={<SearchOffRounded />} title={t.orderNotFound} action={{ label: t.backHome, href: ROUTES.home }} />;

  return (
    <Box className="mx-auto max-w-3xl">
      <Box className="text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }} className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-basil-500 text-white shadow-lg">
          <CheckRounded sx={{ fontSize: 56 }} />
        </motion.div>
        <Typography variant="h3" component="h1" className="mt-6">
          {t.thanks(order.customerName.split(' ')[0])}
        </Typography>
        <Typography color="text.secondary" className="mt-2 text-lg">
          {t.orderIs} <strong>{order.number}</strong> {t.confirmedReceipt(order.customerEmail)}
        </Typography>
      </Box>

      <Card className="mt-10 p-5 md:p-7">
        <Typography variant="h6" component="h2" className="mb-4">
          {t.tracking}
        </Typography>
        <OrderTimeline order={order} />
      </Card>

      <Card className="mt-6 p-5 md:p-7">
        <Box className="mb-3 flex items-center gap-2">
          <ReceiptLongRounded color="primary" />
          <Typography variant="h6" component="h2">
            {t.summary}
          </Typography>
        </Box>
        {order.items.map((i) => (
          <Box key={i.id} className="flex justify-between gap-3 py-1">
            <Typography>
              {i.quantity} × {i.name} <span className="text-charcoal-500">({domain.sizes[i.size].label})</span>
            </Typography>
            <Typography fontWeight={700}>{fmt.price(i.unitPrice * i.quantity)}</Typography>
          </Box>
        ))}
        <Divider className="my-3" />
        <Box className="grid gap-1 text-sm text-charcoal-500">
          <span>{t.deliveryLine(domain.delivery[order.deliveryMode].label, order.deliveryFee ? fmt.price(order.deliveryFee) : t.freeLower)}</span>
          {order.discount > 0 && <span>{t.discountLine(order.promoCode ?? '', fmt.price(order.discount))}</span>}
          <span>{t.paymentLine(domain.payment[order.paymentMethod].label)}</span>
          <span>{t.addressLine(`${order.address.street}, ${order.address.district}`)}</span>
        </Box>
        <Box className="mt-4 flex justify-between">
          <Typography variant="h6">{t.totalPaid}</Typography>
          <Typography variant="h6" color="primary">
            {fmt.price(order.total)}
          </Typography>
        </Box>
      </Card>

      <Box className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        {user && order.customerId === user.id ? (
          <Button component={Link} href={ROUTES.account.tracking(order.id)} variant="contained" size="large">
            {t.trackLive}
          </Button>
        ) : (
          <Button component={Link} href={ROUTES.register} variant="contained" size="large">
            {t.createAccount}
          </Button>
        )}
        <Button component={Link} href={ROUTES.menu} variant="outlined" size="large">
          {t.orderMore}
        </Button>
      </Box>
    </Box>
  );
}
