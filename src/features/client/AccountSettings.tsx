'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, Card, Chip, Divider, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Switch, TextField, Typography } from '@mui/material';
import FavoriteBorderRounded from '@mui/icons-material/FavoriteBorderRounded';
import ComputerRounded from '@mui/icons-material/ComputerRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import DeleteForeverRounded from '@mui/icons-material/DeleteForeverRounded';
import ShieldRounded from '@mui/icons-material/ShieldRounded';
import { AnimatePresence, motion } from 'framer-motion';
import { ConfirmDialog, EmptyState, LanguageSwitcher, LoadingButton, PageHeader, PasswordField } from '@/components/ui';
import { PizzaCard } from '@/components/visitor/PizzaCard';
import { PasswordStrength } from '@/features/auth/AuthCard';
import { changePasswordSchema } from '@/features/auth/schemas';
import { useAuthStore, type ClientPreferences } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { attempt, notify } from '@/store/uiStore';
import { api } from '@/lib/api';
import { authService } from '@/services';
import { DELIVERY_MODE_KEYS, ENABLED_PAYMENT_METHODS, ROUTES } from '@/constants';
import { useMessages } from '@/i18n/client';
import type { DeliveryMode, PaymentMethod } from '@/types';

export function FavoritesView() {
  const favorites = useAuthStore((s) => s.favorites);
  const pizzas = useDataStore((s) => s.pizzas);
  const list = React.useMemo(() => pizzas.filter((p) => favorites.includes(p.id) && p.active), [pizzas, favorites]);
  const t = useMessages('account');
  return (
    <Box>
      <PageHeader title={t.myFavorites} description={t.myFavoritesHint} />
      {list.length === 0 ? (
        <EmptyState icon={<FavoriteBorderRounded />} title={t.noFavorites} description={t.noFavoritesHint} action={{ label: t.exploreMenu, href: ROUTES.menu }} />
      ) : (
        <motion.div layout className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {list.map((p) => (
              <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                <PizzaCard pizza={p} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </Box>
  );
}

function SettingSwitch({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Box className="flex items-center justify-between gap-4 py-3">
      <Box>
        <Typography fontWeight={700}>{label}</Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>
      <Switch checked={checked} onChange={(e) => onChange(e.target.checked)} inputProps={{ 'aria-label': label }} />
    </Box>
  );
}

export function SettingsView() {
  const preferences = useAuthStore((s) => s.preferences);
  const setPreferences = useAuthStore((s) => s.setPreferences);
  const t = useMessages('account');
  const domain = useMessages('domain');
  const update = (patch: Partial<ClientPreferences>) => void attempt(setPreferences(patch), t.preferenceSaved);
  return (
    <Box>
      <PageHeader title={t.settings} description={t.settingsHint} />
      <Box className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <Typography variant="h6" component="h2">
            {t.notifications}
          </Typography>
          <Box className="divide-x-0 divide-y divide-solid divide-black/5">
            <SettingSwitch label={t.smsTracking} description={t.smsTrackingHint} checked={preferences.orderUpdatesSms} onChange={(v) => update({ orderUpdatesSms: v })} />
            <SettingSwitch label={t.emailTracking} description={t.emailTrackingHint} checked={preferences.orderUpdatesEmail} onChange={(v) => update({ orderUpdatesEmail: v })} />
            <SettingSwitch label={t.offers} description={t.offersHint} checked={preferences.promotions} onChange={(v) => update({ promotions: v })} />
            <SettingSwitch label={t.newsletter} description={t.newsletterHint} checked={preferences.newsletter} onChange={(v) => update({ newsletter: v })} />
          </Box>
        </Card>
        <Card className="p-6">
          <Typography variant="h6" component="h2" className="mb-4">
            {t.orderPreferences}
          </Typography>
          <Box className="space-y-4">
            <FormControl fullWidth>
              <InputLabel id="pref-delivery">{t.defaultDelivery}</InputLabel>
              <Select labelId="pref-delivery" label={t.defaultDelivery} value={preferences.defaultDelivery} onChange={(e) => update({ defaultDelivery: e.target.value as DeliveryMode })}>
                {DELIVERY_MODE_KEYS.map((m) => (
                  <MenuItem key={m} value={m}>
                    {domain.delivery[m].label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="pref-payment">{t.defaultPayment}</InputLabel>
              <Select labelId="pref-payment" label={t.defaultPayment} value={preferences.defaultPayment} onChange={(e) => update({ defaultPayment: e.target.value as PaymentMethod })}>
                {ENABLED_PAYMENT_METHODS.map((m) => (
                  <MenuItem key={m} value={m}>
                    {domain.payment[m].label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box className="flex items-center justify-between rounded-2xl bg-cream-100 p-4">
              <Box>
                <Typography fontWeight={700}>{t.language}</Typography>
              </Box>
              <LanguageSwitcher />
            </Box>
            <Box className="flex items-center justify-between rounded-2xl bg-cream-100 p-4">
              <Box>
                <Typography fontWeight={700}>{t.currency}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t.currencyName}
                </Typography>
              </Box>
              <Chip label="USD" />
            </Box>
          </Box>
        </Card>
      </Box>
    </Box>
  );
}

type PasswordValues = z.infer<typeof changePasswordSchema>;


export function SecurityView() {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deletePassword, setDeletePassword] = React.useState('');
  const [signingOut, setSigningOut] = React.useState(false);
  const { control, handleSubmit, formState, reset, setError } = useForm<PasswordValues>({ resolver: zodResolver(changePasswordSchema), defaultValues: { current: '', password: '', confirm: '' } });
  const password = useWatch({ control, name: 'password' });
  const t = useMessages('account');

  const onSubmit = handleSubmit(async ({ current, password: next }) => {
    try {
      await authService.changePassword(current, next);
      reset();
      notify(t.passwordChanged);
    } catch (e) {
      setError('current', { message: (e as Error).message });
    }
  });

  return (
    <Box>
      <PageHeader title={t.securityTitle} description={t.securityHint} />
      <Box className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <Box className="mb-4 flex items-center gap-2">
            <ShieldRounded color="primary" />
            <Typography variant="h6" component="h2">
              {t.changePassword}
            </Typography>
          </Box>
          <Box component="form" onSubmit={onSubmit} noValidate className="space-y-4">
            <PasswordField control={control} name="current" label={t.currentPassword} autoComplete="current-password"  />
            <PasswordField control={control} name="password" label={t.newPassword} autoComplete="new-password" />
            <PasswordStrength value={password} />
            <PasswordField control={control} name="confirm" label={t.confirm} autoComplete="new-password" />
            <LoadingButton type="submit" variant="contained" loading={formState.isSubmitting}>
              {t.update}
            </LoadingButton>
          </Box>
        </Card>
        <Box className="space-y-6">
          <Card className="p-6">
            <Typography variant="h6" component="h2" className="mb-2">
              {t.devices}
            </Typography>
            <Box className="flex items-center gap-3 py-3">
              <Box className="grid h-10 w-10 place-items-center rounded-xl bg-cream-200">
                <ComputerRounded />
              </Box>
              <Box className="flex-1">
                <Typography fontWeight={700}>
                  {t.thisDevice} <Chip size="small" color="success" label={t.active} className="ml-1" />
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t.devicesHint}
                </Typography>
              </Box>
            </Box>
            <Divider />
            <LoadingButton
              variant="outlined"
              startIcon={<LogoutRounded />}
              className="mt-3"
              loading={signingOut}
              onClick={async () => {
                setSigningOut(true);
                await attempt(api.post('/api/auth/logout-others'), t.othersSignedOut, 'info');
                setSigningOut(false);
              }}
            >
              {t.signOutOthers}
            </LoadingButton>
          </Card>
          <Card className="border-red-200 p-6">
            <Typography variant="h6" component="h2" color="error">
              {t.deleteAccount}
            </Typography>
            <Typography variant="body2" color="text.secondary" className="mb-4 mt-1">
              {t.deleteAccountHint}
            </Typography>
            <Button color="error" variant="outlined" startIcon={<DeleteForeverRounded />} onClick={() => setDeleteOpen(true)}>
              {t.deleteAccount}
            </Button>
          </Card>
        </Box>
      </Box>
      <ConfirmDialog
        open={deleteOpen}
        danger
        loading={deleting}
        title={t.deleteAccountTitle}
        message={
          <>
            {t.deleteAccountText}
            <TextField type="password" label={t.password} value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} autoComplete="current-password" fullWidth className="mt-4" />
          </>
        }
        confirmLabel={t.delete}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          if (!deletePassword) return notify(t.enterPassword, 'error');
          setDeleting(true);
          const done = await attempt(api.delete<{ deleted: boolean }>('/api/account', { password: deletePassword }), t.accountDeleted, 'info');
          setDeleting(false);
          if (!done) return;
          authService.clearLocal();
          router.replace(ROUTES.home);
        }}
      />
    </Box>
  );
}
