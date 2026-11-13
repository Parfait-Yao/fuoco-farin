'use client';

import * as React from 'react';
import Link from 'next/link';
import { Controller, useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { Alert, Box, Button, Checkbox, Chip, Divider, FormControlLabel, FormHelperText, Link as MuiLink, MenuItem, Typography } from '@mui/material';
import DeliveryDiningRounded from '@mui/icons-material/DeliveryDiningRounded';
import BoltRounded from '@mui/icons-material/BoltRounded';
import StorefrontRounded from '@mui/icons-material/StorefrontRounded';
import PhoneAndroidRounded from '@mui/icons-material/PhoneAndroidRounded';
import CreditCardRounded from '@mui/icons-material/CreditCardRounded';
import PaymentsRounded from '@mui/icons-material/PaymentsRounded';
import HomeRounded from '@mui/icons-material/HomeRounded';
import LockRounded from '@mui/icons-material/LockRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import { AnimatePresence, motion } from 'framer-motion';
import { FormTextField } from '@/components/ui';
import { CartLine } from '@/features/cart/CartLine';
import { CartTotals } from '@/features/cart/CartSummary';
import { useCartTotals } from '@/hooks';
import { useCartStore } from '@/store/cartStore';
import { useDataStore } from '@/store/dataStore';
import { ABIDJAN_DISTRICTS, DELIVERY_MODE_KEYS, ENABLED_PAYMENT_METHODS, ROUTES } from '@/constants';
import { useFormat, useLocale, useMessages } from '@/i18n/client';
import type { Address, DeliveryMode, PaymentMethod } from '@/types';
import { ChoiceCard } from './ChoiceCard';
import { translateValidation } from '@/i18n/validation';
import type { CheckoutValues } from './schema';

interface StepProps {
  control: Control<CheckoutValues>;
  setValue: UseFormSetValue<CheckoutValues>;
  goTo: (step: number) => void;
}

export function CartStep() {
  const { items } = useCartTotals();
  const t = useMessages('checkout');
  return (
    <Box>
      <Box className="divide-x-0 divide-y divide-solid divide-black/5">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <React.Fragment key={item.id}>
              <CartLine item={item} />
            </React.Fragment>
          ))}
        </AnimatePresence>
      </Box>
      <Button component={Link} href={ROUTES.menu} className="mt-2">
        {t.addMore}
      </Button>
    </Box>
  );
}

export function AddressStep({ control, setValue, addresses }: StepProps & { addresses: Address[] }) {
  const street = useWatch({ control, name: 'street' });
  const t = useMessages('checkout');
  const fill = (a: Address) => {
    setValue('street', a.street, { shouldValidate: true });
    setValue('district', a.district, { shouldValidate: true });
    setValue('city', a.city, { shouldValidate: true });
    setValue('details', a.details ?? '');
  };
  return (
    <Box className="space-y-5">
      {addresses.length > 0 && (
        <Box>
          <Typography fontWeight={700} className="mb-2">
            {t.savedAddresses}
          </Typography>
          <Box className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t.savedAddressesAria}>
            {addresses.map((a) => (
              <ChoiceCard key={a.id} selected={street === a.street} onClick={() => fill(a)} icon={<HomeRounded />} title={a.label} description={`${a.street}, ${a.district}`} />
            ))}
          </Box>
          <Divider className="my-5">{t.orEnterAddress}</Divider>
        </Box>
      )}
      <Box className="grid gap-4 sm:grid-cols-2">
        <FormTextField control={control} name="street" label={t.street} autoComplete="street-address" required className="sm:col-span-2" />
        <FormTextField control={control} name="district" label={t.district} select required>
          {ABIDJAN_DISTRICTS.map((d) => (
            <MenuItem key={d} value={d}>
              {d}
            </MenuItem>
          ))}
        </FormTextField>
        <FormTextField control={control} name="city" label={t.city} autoComplete="address-level2" required />
        <FormTextField control={control} name="details" label={t.details} placeholder={t.detailsPlaceholder} className="sm:col-span-2" />
      </Box>
    </Box>
  );
}

export function ContactStep({ control }: StepProps) {
  const t = useMessages('checkout');
  return (
    <Box className="grid gap-4 sm:grid-cols-2">
      <FormTextField control={control} name="fullName" label={t.fullName} autoComplete="name" required className="sm:col-span-2" />
      <FormTextField control={control} name="email" label={t.email} type="email" autoComplete="email" required helperText={t.emailHint} />
      <FormTextField control={control} name="phone" label={t.phone} type="tel" autoComplete="tel" required helperText={t.phoneHint} />
    </Box>
  );
}

const MODE_ICONS: Record<DeliveryMode, React.ReactNode> = {
  standard: <DeliveryDiningRounded />,
  express: <BoltRounded />,
  pickup: <StorefrontRounded />,
};

export function DeliveryStep({ control }: StepProps) {
  const setMode = useCartStore((s) => s.setDeliveryMode);
  const settings = useDataStore((s) => s.settings);
  const { subtotal } = useCartTotals();
  const t = useMessages('checkout');
  const modes = useMessages('domain').delivery;
  const fmt = useFormat();
  const priceOf = (mode: DeliveryMode) =>
    mode === 'pickup' ? t.freeOfCharge : mode === 'express' ? fmt.price(settings.expressFee) : subtotal >= settings.freeDeliveryFrom ? t.free : fmt.price(settings.deliveryFee);
  return (
    <Controller
      control={control}
      name="deliveryMode"
      render={({ field }) => (
        <Box className="space-y-3" role="radiogroup" aria-label={t.deliveryModeAria}>
          {DELIVERY_MODE_KEYS.map((mode) => (
            <ChoiceCard
              key={mode}
              selected={field.value === mode}
              onClick={() => {
                field.onChange(mode);
                setMode(mode);
              }}
              icon={MODE_ICONS[mode]}
              title={modes[mode].label}
              description={`${modes[mode].eta} · ${modes[mode].description}`}
              aside={<Typography fontWeight={800}>{priceOf(mode)}</Typography>}
            />
          ))}
        </Box>
      )}
    />
  );
}

function SummaryBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  const t = useMessages('checkout');
  return (
    <Box className="rounded-2xl bg-cream-100 p-4">
      <Box className="mb-1 flex items-center justify-between">
        <Typography fontWeight={800}>{title}</Typography>
        <Button size="small" startIcon={<EditRounded fontSize="small" />} onClick={onEdit}>
          {t.edit}
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" component="div">
        {children}
      </Typography>
    </Box>
  );
}

export function ReviewStep({ control, goTo }: StepProps) {
  const values = useWatch({ control });
  const { items } = useCartTotals();
  const t = useMessages('checkout');
  const domain = useMessages('domain');
  const locale = useLocale();
  const fmt = useFormat();
  return (
    <Box className="space-y-4">
      <SummaryBlock title={t.items(items.length)} onEdit={() => goTo(0)}>
        <ul className="m-0 list-none space-y-1 p-0">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-2">
              <span>
                {i.quantity} × {i.name} ({domain.sizes[i.size].label})
              </span>
              <span>{fmt.price(i.unitPrice * i.quantity)}</span>
            </li>
          ))}
        </ul>
      </SummaryBlock>
      <Box className="grid gap-4 md:grid-cols-2">
        <SummaryBlock title={t.address} onEdit={() => goTo(1)}>
          {values.street}, {values.district}, {values.city}
          {values.details && <div className="italic">{values.details}</div>}
        </SummaryBlock>
        <SummaryBlock title={t.contact} onEdit={() => goTo(2)}>
          {values.fullName}
          <div>{values.email}</div>
          <div>{values.phone}</div>
        </SummaryBlock>
      </Box>
      <SummaryBlock title={t.deliveryMode} onEdit={() => goTo(3)}>
        {values.deliveryMode && `${domain.delivery[values.deliveryMode].label} · ${domain.delivery[values.deliveryMode].eta}`}
      </SummaryBlock>
      <Box className="rounded-2xl border border-solid border-black/5 bg-white p-4">
        <CartTotals />
      </Box>
      <Controller
        control={control}
        name="acceptTerms"
        render={({ field, fieldState }) => (
          <Box>
            <FormControlLabel
              control={<Checkbox checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} />}
              label={
                <span>
                  {t.acceptStart}{' '}
                  <MuiLink component={Link} href={ROUTES.terms} target="_blank">
                    {t.acceptLink}
                  </MuiLink>
                </span>
              }
            />
            {fieldState.error && <FormHelperText error>{translateValidation(fieldState.error.message, locale)}</FormHelperText>}
          </Box>
        )}
      />
    </Box>
  );
}

const PAY_ICONS: Record<PaymentMethod, React.ReactNode> = {
  orange_money: <PhoneAndroidRounded />,
  mtn_momo: <PhoneAndroidRounded />,
  wave: <PhoneAndroidRounded />,
  card: <CreditCardRounded />,
  cash: <PaymentsRounded />,
};

export function PaymentStep({ control, error, total: serverTotal }: StepProps & { error: string | null; total?: number }) {
  const method = useWatch({ control, name: 'paymentMethod' });
  const { total: localTotal } = useCartTotals();
  const total = serverTotal ?? localTotal;
  const t = useMessages('checkout');
  const payments = useMessages('domain').payment;
  const fmt = useFormat();
  return (
    <Box className="space-y-4">
      <Alert icon={<LockRounded />} severity="success" className="rounded-2xl">
        {method === 'card' ? t.stripeNotice : t.cashNotice}
      </Alert>
      {error && (
        <Alert severity="error" className="rounded-2xl" role="alert">
          {error}
        </Alert>
      )}
      <Controller
        control={control}
        name="paymentMethod"
        render={({ field }) => (
          <Box className="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label={t.paymentMethodAria}>
            {ENABLED_PAYMENT_METHODS.map((m) => (
              <ChoiceCard key={m} selected={field.value === m} onClick={() => field.onChange(m)} icon={PAY_ICONS[m]} title={payments[m].label} description={payments[m].hint} />
            ))}
          </Box>
        )}
      />
      <Box className="flex items-center justify-between rounded-2xl bg-charcoal-900 p-4 text-white">
        <Typography>{t.amountDue}</Typography>
        <Chip label={fmt.price(total)} className="bg-white text-base font-extrabold text-tomato-600" />
      </Box>
    </Box>
  );
}
