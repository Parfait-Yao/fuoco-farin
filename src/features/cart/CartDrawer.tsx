'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge, Box, Button, Divider, Drawer, IconButton, Typography } from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ShoppingBagOutlined from '@mui/icons-material/ShoppingBagOutlined';
import { AnimatePresence } from 'framer-motion';
import { EmptyState } from '@/components/ui';
import { useCartTotals } from '@/hooks';
import { useCartStore } from '@/store/cartStore';
import { ROUTES } from '@/constants';
import { CartLine } from './CartLine';
import { CartTotals } from './CartSummary';
import { Recommendations } from './Recommendations';
import { useMessages } from '@/i18n/client';

export function CartDrawer() {
  const open = useCartStore((s) => s.drawerOpen);
  const setOpen = useCartStore((s) => s.setDrawerOpen);
  const { items, count } = useCartTotals();
  const pathname = usePathname();
  const close = () => setOpen(false);
  const t = useMessages('cart');

  React.useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  return (
    <Drawer anchor="right" open={open} onClose={close} PaperProps={{ className: 'w-full sm:w-[440px] bg-cream-50 flex flex-col' }}>
      <Box className="flex items-center justify-between px-5 py-4">
        <Box className="flex items-center gap-3">
          <Badge badgeContent={count} color="primary">
            <ShoppingBagOutlined />
          </Badge>
          <Typography variant="h6" component="h2">
            {t.myCart}
          </Typography>
        </Box>
        <IconButton aria-label={t.closeCart} onClick={close}>
          <CloseRounded />
        </IconButton>
      </Box>
      <Divider />
      {items.length === 0 ? (
        <Box className="flex flex-1 flex-col justify-center px-6">
          <EmptyState icon={<ShoppingBagOutlined />} title={t.empty} description={t.emptyHintDrawer} action={{ label: t.seeMenu, href: ROUTES.menu }} />
          <Recommendations title={t.mustHaves} />
        </Box>
      ) : (
        <>
          <Box className="flex-1 overflow-y-auto px-5">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <React.Fragment key={item.id}>
                  <CartLine item={item} compact />
                </React.Fragment>
              ))}
            </AnimatePresence>
            <Box className="py-4">
              <Recommendations />
            </Box>
          </Box>
          <Box className="border-0 border-t border-solid border-black/5 bg-white px-5 pb-5 pt-4 shadow-soft">
            <CartTotals />
            <Box className="mt-4 grid grid-cols-2 gap-2">
              <Button component={Link} href={ROUTES.cart} variant="outlined" color="inherit">
                {t.viewCart}
              </Button>
              <Button component={Link} href={ROUTES.checkout} variant="contained">
                {t.order}
              </Button>
            </Box>
          </Box>
        </>
      )}
    </Drawer>
  );
}
