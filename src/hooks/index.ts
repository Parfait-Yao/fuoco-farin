'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useMediaQuery, useTheme } from '@mui/material';
import { useUiStore } from '@/store/uiStore';
import { useCartStore } from '@/store/cartStore';
import { useDataStore } from '@/store/dataStore';
import { cartSubtotal, deliveryFee, promoDiscount } from '@/lib/pricing';

/** True once persisted stores have been read from localStorage. */
export function useHydrated(): boolean {
  return useUiStore((s) => s.hydrated);
}

/**
 * True while the data of the current space (public, client or admin) is
 * loading from the API. Pages show their skeletons meanwhile.
 */
export function useDataLoading(): boolean {
  const hydrated = useHydrated();
  const pathname = usePathname() ?? '/';
  const scope = pathname.startsWith('/admin') ? 'admin' : pathname.startsWith('/account') ? 'client' : 'public';
  const status = useDataStore((s) => s.status[scope]);
  return !hydrated || status === 'idle' || status === 'loading';
}

export function useIsMobile(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });
}

export function useCartTotals() {
  const items = useCartStore((s) => s.items);
  const promo = useCartStore((s) => s.promo);
  const mode = useCartStore((s) => s.deliveryMode);
  const settings = useDataStore((s) => s.settings);
  return React.useMemo(() => {
    const subtotal = cartSubtotal(items);
    const discount = promoDiscount(promo, subtotal);
    const fee = deliveryFee(mode, subtotal, settings);
    const count = items.reduce((n, i) => n + i.quantity, 0);
    const remainingForFree = mode === 'standard' ? Math.max(0, settings.freeDeliveryFrom - subtotal) : 0;
    return { items, subtotal, discount, fee, total: subtotal + fee - discount, count, promo, mode, remainingForFree, freeFrom: settings.freeDeliveryFrom };
  }, [items, promo, mode, settings]);
}

export function useDebounced<T>(value: T, ms = 250): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}
