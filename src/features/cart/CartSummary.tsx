'use client';

import * as React from 'react';
import { Alert, Box, Chip, Divider, InputAdornment, LinearProgress, TextField, Typography } from '@mui/material';
import LocalOfferOutlined from '@mui/icons-material/LocalOfferOutlined';
import { AnimatePresence, motion } from 'framer-motion';
import { LoadingButton } from '@/components/ui';
import { useCartTotals } from '@/hooks';
import { useCartStore } from '@/store/cartStore';
import { notify } from '@/store/uiStore';
import { api } from '@/lib/api';
import type { Promotion } from '@/types';
import { useFormat, useMessages } from '@/i18n/client';

export function PromoCodeField() {
  const promo = useCartStore((s) => s.promo);
  const applyPromo = useCartStore((s) => s.applyPromo);
  const { subtotal } = useCartTotals();
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const t = useMessages('cart');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return setError(t.enterCode);
    setLoading(true);
    try {
      const { promotion } = await api.post<{ promotion: Promotion; discount: number }>('/api/promotions/check', { code: code.trim(), subtotal });
      applyPromo(promotion);
      setError(null);
      setCode('');
      notify(t.promoApplied(promotion.code, promotion.label));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (promo) {
    return (
      <Chip
        icon={<LocalOfferOutlined />}
        color="success"
        label={`${promo.code} · ${promo.label}`}
        onDelete={() => {
          applyPromo(null);
          notify(t.promoRemoved, 'info');
        }}
        className="max-w-full"
      />
    );
  }

  return (
    <Box component="form" onSubmit={submit} className="flex gap-2" noValidate>
      <TextField
        size="small"
        label={t.promoCode}
        value={code}
        onChange={(e) => {
          setCode(e.target.value.toUpperCase());
          setError(null);
        }}
        error={Boolean(error)}
        helperText={error ?? t.promoHint}
        InputProps={{ startAdornment: <InputAdornment position="start"><LocalOfferOutlined fontSize="small" /></InputAdornment> }}
      />
      <LoadingButton type="submit" variant="outlined" loading={loading} className="h-10 shrink-0">
        {t.apply}
      </LoadingButton>
    </Box>
  );
}

function Row({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return (
    <Box className="flex items-center justify-between py-1">
      <Typography color={strong ? 'text.primary' : 'text.secondary'} fontWeight={strong ? 800 : 500} fontSize={strong ? 18 : 15}>
        {label}
      </Typography>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>
          <Typography component="span" fontWeight={strong ? 800 : 600} fontSize={strong ? 20 : 15} color={accent ? 'success.main' : strong ? 'primary' : 'text.primary'}>
            {value}
          </Typography>
        </motion.span>
      </AnimatePresence>
    </Box>
  );
}

export function CartTotals({ showPromo = true }: { showPromo?: boolean }) {
  const { subtotal, discount, fee, total, mode, remainingForFree, freeFrom } = useCartTotals();
  const t = useMessages('cart');
  const fmt = useFormat();
  return (
    <Box>
      {showPromo && (
        <Box className="mb-4">
          <PromoCodeField />
        </Box>
      )}
      {mode === 'standard' && subtotal > 0 && (
        <Box className="mb-3">
          {remainingForFree > 0 ? (
            <Typography variant="body2" color="text.secondary" className="mb-1.5">
              {t.remainingForFree} <strong>{fmt.price(remainingForFree)}</strong> {t.remainingForFreeEnd}
            </Typography>
          ) : (
            <Alert severity="success" className="mb-1.5 py-0">
              {t.freeDelivery}
            </Alert>
          )}
          <LinearProgress variant="determinate" value={Math.min(100, (subtotal / freeFrom) * 100)} color={remainingForFree > 0 ? 'secondary' : 'success'} className="h-1.5 rounded-full" />
        </Box>
      )}
      <Row label={t.subtotal} value={fmt.price(subtotal)} />
      <Row label={mode === 'pickup' ? t.pickup : t.delivery} value={fee === 0 ? t.free : fmt.price(fee)} />
      {discount > 0 && <Row label={t.discount} value={`- ${fmt.price(discount)}`} accent />}
      <Divider className="my-2" />
      <Row label={t.total} value={fmt.price(total)} strong />
    </Box>
  );
}
