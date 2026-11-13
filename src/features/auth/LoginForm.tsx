'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Checkbox, Divider, FormControlLabel, Link as MuiLink, Typography } from '@mui/material';
import LoginRounded from '@mui/icons-material/LoginRounded';
import AdminPanelSettingsRounded from '@mui/icons-material/AdminPanelSettingsRounded';
import { AnimatePresence, motion } from 'framer-motion';
import { FormTextField, LoadingButton, PasswordField } from '@/components/ui';
import { authService } from '@/services';
import { notify } from '@/store/uiStore';
import { ROUTES } from '@/constants';
import type { Role } from '@/types';
import { loginSchema } from './schemas';
import { AuthHeader } from './AuthCard';
import { useMessages } from '@/i18n/client';

type LoginValues = z.infer<typeof loginSchema>;

/** Shared login form; `space` separates client and admin authentication. */
export function LoginForm({ space }: { space: Role }) {
  const router = useRouter();
  const redirect = useSearchParams().get('redirect');
  const [error, setError] = React.useState<string | null>(null);
  const isAdmin = space === 'admin';
  const t = useMessages('auth');

  const { control, handleSubmit, formState } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '', remember: true } });

  const onSubmit = handleSubmit(async ({ email, password, remember }) => {
    setError(null);
    try {
      const user = await authService.login(email, password, space, remember ?? true);
      notify(t.welcome(user.firstName));
      const fallback = isAdmin ? ROUTES.admin.root : ROUTES.account.root;
      // Only follow internal redirects.
      router.replace(redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : fallback);
    } catch (e) {
      setError((e as Error).message);
    }
  });

  return (
    <Box>
      <AuthHeader
        icon={isAdmin ? <AdminPanelSettingsRounded /> : <LoginRounded />}
        title={isAdmin ? t.backOffice : t.welcomeBack}
        subtitle={isAdmin ? t.adminSubtitle : t.clientSubtitle}
      />
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Alert severity="error" className="mb-4 rounded-2xl" role="alert">
              {error}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
      <Box component="form" onSubmit={onSubmit} noValidate className="space-y-4">
        <FormTextField control={control} name="email" label={isAdmin ? t.workEmail : t.email} type="email" autoComplete="email" autoFocus required />
        <PasswordField control={control} name="password" label={t.password} autoComplete="current-password" required />
        <Box className="flex flex-wrap items-center justify-between gap-2">
          <Controller
            control={control}
            name="remember"
            render={({ field }) => <FormControlLabel control={<Checkbox checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} />} label={t.rememberMe} />}
          />
          {!isAdmin && (
            <MuiLink component={Link} href={ROUTES.forgotPassword} fontWeight={600}>
              {t.forgot}
            </MuiLink>
          )}
        </Box>
        <LoadingButton type="submit" variant="contained" size="large" fullWidth loading={formState.isSubmitting} className={isAdmin ? 'bg-charcoal-800 bg-none hover:bg-charcoal-900' : ''}>
          {formState.isSubmitting ? t.signingIn : t.signIn}
        </LoadingButton>
      </Box>
      {isAdmin ? (
        <Typography variant="body2" color="text.secondary" className="mt-6 text-center">
          {t.adminAccountsNote}{' '}
          <MuiLink component={Link} href={ROUTES.login}>
            {t.clientArea}
          </MuiLink>
        </Typography>
      ) : (
        <>
          <Divider className="my-6">{t.newHere}</Divider>
          <Button component={Link} href={ROUTES.register} variant="outlined" fullWidth size="large">
            {t.createAccount}
          </Button>
          <Typography variant="body2" color="text.secondary" className="mt-6 text-center">
            {t.teamMember}{' '}
            <MuiLink component={Link} href={ROUTES.admin.login} fontWeight={600}>
              {t.adminArea}
            </MuiLink>
          </Typography>
        </>
      )}
    </Box>
  );
}
