'use client';

import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, Card, Chip, InputAdornment, MenuItem, Switch, Tab, Tabs, Typography } from '@mui/material';
import StorefrontRounded from '@mui/icons-material/StorefrontRounded';
import DeliveryDiningRounded from '@mui/icons-material/DeliveryDiningRounded';
import TuneRounded from '@mui/icons-material/TuneRounded';
import NotificationsRounded from '@mui/icons-material/NotificationsRounded';
import { FormTextField, LoadingButton, PageHeader } from '@/components/ui';
import { useDataStore } from '@/store/dataStore';
import { attempt } from '@/store/uiStore';
import { useMessages } from '@/i18n/client';
import { vm } from '@/i18n/validation';
import { centsToUnits, unitsToCents } from '@/lib/format';
import type { RestaurantSettings } from '@/types';

const schema = z.object({
  name: z.string().min(2, vm('minChars', 2)),
  slogan: z.string().max(120, vm('maxChars', 120)),
  sloganEn: z.string().max(120, vm('maxChars', 120)),
  email: z.string().email(vm('invalidEmail')),
  phone: z.string().min(8, vm('minChars', 8)),
  address: z.string().min(5, vm('minChars', 5)),
  openingHours: z.string().min(3, vm('minChars', 3)),
  openingHoursEn: z.string().max(120, vm('maxChars', 120)),
  currency: z.literal('USD'),
  /** Dollars in the form, cents in the API. */
  deliveryFee: z.number({ invalid_type_error: vm('numberRequired') }).min(0).max(50, vm('maxValue', 50)),
  expressFee: z.number({ invalid_type_error: vm('numberRequired') }).min(0).max(50, vm('maxValue', 50)),
  freeDeliveryFrom: z.number({ invalid_type_error: vm('numberRequired') }).min(0).max(1000, vm('maxValue', 1000)),
  defaultStockThreshold: z.number({ invalid_type_error: vm('numberRequired') }).min(0),
  showPromotionsBanner: z.boolean(),
  showRatings: z.boolean(),
  itemsPerPage: z.number().int().min(3, vm('minValue', 3)).max(48, vm('maxValue', 48)),
  notifyNewOrders: z.boolean(),
  notifyLowStock: z.boolean(),
  notifyNewReviews: z.boolean(),
  notifyByEmail: z.boolean(),
});
type Values = z.infer<typeof schema>;

const toNumber = (v: string) => (v === '' ? NaN : Number(v));
const dollars = { startAdornment: <InputAdornment position="start">$</InputAdornment> };
const money = { step: 0.01, min: 0 };

const TABS = [
  { key: 'restaurant', icon: <StorefrontRounded /> },
  { key: 'delivery', icon: <DeliveryDiningRounded /> },
  { key: 'display', icon: <TuneRounded /> },
  { key: 'notifications', icon: <NotificationsRounded /> },
] as const;

type SwitchName = 'showPromotionsBanner' | 'showRatings' | 'notifyNewOrders' | 'notifyLowStock' | 'notifyNewReviews' | 'notifyByEmail';

/** Form values: raw French / English texts, amounts in dollars. */
function toValues(s: RestaurantSettings): Values {
  return {
    ...s,
    slogan: s.translations.fr.slogan,
    sloganEn: s.translations.en.slogan,
    openingHours: s.translations.fr.openingHours,
    openingHoursEn: s.translations.en.openingHours,
    deliveryFee: centsToUnits(s.deliveryFee),
    expressFee: centsToUnits(s.expressFee),
    freeDeliveryFrom: centsToUnits(s.freeDeliveryFrom),
  };
}

export function SettingsAdmin() {
  const settings = useDataStore((s) => s.settings);
  const updateSettings = useDataStore((s) => s.updateSettings);
  const t = useMessages('admin');
  const [tab, setTab] = React.useState<(typeof TABS)[number]['key']>('restaurant');
  const { control, handleSubmit, reset, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(settings) });

  React.useEffect(() => reset(toValues(settings)), [settings, reset]);

  const onSubmit = handleSubmit(async ({ slogan, sloganEn, openingHours, openingHoursEn, ...values }) => {
    await attempt(
      updateSettings({
        ...values,
        deliveryFee: unitsToCents(values.deliveryFee),
        expressFee: unitsToCents(values.expressFee),
        freeDeliveryFrom: unitsToCents(values.freeDeliveryFrom),
        translations: { fr: { slogan, openingHours }, en: { slogan: sloganEn, openingHours: openingHoursEn } },
      }),
      t.settingsSaved,
    );
  });

  const toggle = (name: SwitchName, label: string, description: string) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Box className="flex items-center justify-between gap-4 py-3">
          <Box>
            <Typography fontWeight={700}>{label}</Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Box>
          <Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} inputProps={{ 'aria-label': label }} />
        </Box>
      )}
    />
  );

  return (
    <Box>
      <PageHeader title={t.settingsTitle} description={t.settingsHint} />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile className="mb-4" aria-label={t.settingsSectionsAria}>
        {TABS.map((item) => (
          <Tab key={item.key} value={item.key} icon={item.icon} iconPosition="start" label={t.settingsTabs[item.key]} className="min-h-[48px]" />
        ))}
      </Tabs>
      <Card className="p-5 md:p-7">
        <Box component="form" onSubmit={onSubmit} noValidate>
          {tab === 'restaurant' && (
            <Box className="grid gap-4 md:grid-cols-2">
              <FormTextField control={control} name="name" label={t.restaurantName} required />
              <FormTextField control={control} name="email" label={t.contactEmail} type="email" required />
              <FormTextField control={control} name="slogan" label={t.slogan} />
              <FormTextField control={control} name="sloganEn" label={t.sloganEn} helperText={t.englishHint} />
              <FormTextField control={control} name="openingHours" label={t.openingHours} required />
              <FormTextField control={control} name="openingHoursEn" label={t.openingHoursEn} />
              <FormTextField control={control} name="phone" label={t.phone} required />
              <FormTextField control={control} name="currency" label={t.currency} select disabled helperText={t.currencyHint}>
                <MenuItem value="USD">USD ($)</MenuItem>
              </FormTextField>
              <FormTextField control={control} name="address" label={t.address} required className="md:col-span-2" />
            </Box>
          )}
          {tab === 'delivery' && (
            <Box className="grid gap-4 md:grid-cols-2">
              <FormTextField control={control} name="deliveryFee" label={t.deliveryFee} type="number" transform={toNumber} inputProps={money} InputProps={dollars} />
              <FormTextField control={control} name="expressFee" label={t.expressFee} type="number" transform={toNumber} inputProps={money} InputProps={dollars} />
              <FormTextField control={control} name="freeDeliveryFrom" label={t.freeDeliveryFrom} type="number" transform={toNumber} inputProps={money} InputProps={dollars} />
              <FormTextField control={control} name="defaultStockThreshold" label={t.defaultThreshold} type="number" transform={toNumber} helperText={t.defaultThresholdHint} />
            </Box>
          )}
          {tab === 'display' && (
            <Box>
              <Box className="divide-x-0 divide-y divide-solid divide-black/5">
                {toggle('showPromotionsBanner', t.promoBanner, t.promoBannerHint)}
                {toggle('showRatings', t.ratings, t.ratingsHint)}
              </Box>
              <FormTextField control={control} name="itemsPerPage" label={t.itemsPerPage} type="number" transform={toNumber} className="mt-4 max-w-xs" />
            </Box>
          )}
          {tab === 'notifications' && (
            <Box className="divide-x-0 divide-y divide-solid divide-black/5">
              {toggle('notifyNewOrders', t.newOrders, t.newOrdersHint)}
              {toggle('notifyLowStock', t.lowStockToggle, t.lowStockToggleHint)}
              {toggle('notifyNewReviews', t.newReviews, t.newReviewsHint)}
              {toggle('notifyByEmail', t.emailCopy, t.emailCopyHint)}
            </Box>
          )}
          <Box className="mt-8 flex flex-wrap items-center justify-end gap-3">
            {formState.isDirty && <Chip size="small" color="warning" label={t.unsaved} />}
            <Button color="inherit" onClick={() => reset(toValues(settings))} disabled={!formState.isDirty}>
              {t.cancel}
            </Button>
            <LoadingButton type="submit" variant="contained" loading={formState.isSubmitting}>
              {t.save}
            </LoadingButton>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
