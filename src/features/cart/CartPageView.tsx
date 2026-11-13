'use client';

import * as React from 'react';
import Link from 'next/link';
import { Box, Button, Card, Typography } from '@mui/material';
import ShoppingBagOutlined from '@mui/icons-material/ShoppingBagOutlined';
import DeleteSweepRounded from '@mui/icons-material/DeleteSweepRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import { AnimatePresence } from 'framer-motion';
import { ConfirmDialog, EmptyState, ListSkeleton } from '@/components/ui';
import { useCartTotals, useHydrated } from '@/hooks';
import { useCartStore } from '@/store/cartStore';
import { notify } from '@/store/uiStore';
import { ROUTES } from '@/constants';
import { CartLine } from './CartLine';
import { CartTotals } from './CartSummary';
import { Recommendations } from './Recommendations';
import { useMessages } from '@/i18n/client';

export function CartPageView() {
  const hydrated = useHydrated();
  const { items, count } = useCartTotals();
  const clear = useCartStore((s) => s.clear);
  const [confirm, setConfirm] = React.useState(false);
  const t = useMessages('cart');

  if (!hydrated) return <ListSkeleton rows={4} />;

  if (items.length === 0) {
    return (
      <Box>
        <EmptyState icon={<ShoppingBagOutlined />} title={t.empty} description={t.emptyHintPage} action={{ label: t.discoverMenu, href: ROUTES.menu }} />
        <Box className="mx-auto max-w-2xl">
          <Recommendations title={t.ourMustHaves} limit={6} />
        </Box>
      </Box>
    );
  }

  return (
    <Box className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <Box className="min-w-0">
        <Card className="px-5 md:px-7">
          <Box className="flex items-center justify-between pt-5">
            <Typography fontWeight={800}>{t.itemsCount(count)}</Typography>
            <Button color="inherit" size="small" startIcon={<DeleteSweepRounded />} onClick={() => setConfirm(true)}>
              {t.clearCart}
            </Button>
          </Box>
          <Box className="divide-x-0 divide-y divide-solid divide-black/5">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <React.Fragment key={item.id}>
                  <CartLine item={item} />
                </React.Fragment>
              ))}
            </AnimatePresence>
          </Box>
        </Card>
        <Card className="mt-6 p-5">
          <Recommendations />
        </Card>
      </Box>
      <Box>
        <Card className="sticky top-24 p-5">
          <Typography variant="h6" component="h2" className="mb-4">
            {t.summary}
          </Typography>
          <CartTotals />
          <Button component={Link} href={ROUTES.checkout} variant="contained" size="large" fullWidth endIcon={<ArrowForwardRounded />} className="mt-5">
            {t.checkout}
          </Button>
          <Button component={Link} href={ROUTES.menu} fullWidth color="inherit" className="mt-2">
            {t.continueShopping}
          </Button>
        </Card>
      </Box>
      <ConfirmDialog
        open={confirm}
        danger
        title={t.clearConfirmTitle}
        message={t.clearConfirmText}
        confirmLabel={t.clear}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          clear();
          setConfirm(false);
          notify(t.cleared, 'info');
        }}
      />
    </Box>
  );
}
