'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Checkbox, FormControlLabel, FormHelperText, Link as MuiLink, Typography } from '@mui/material';
import PersonAddAlt1Rounded from '@mui/icons-material/PersonAddAlt1Rounded';
import { FormTextField, LoadingButton, PasswordField } from '@/components/ui';
import { authService } from '@/services';
import { notify } from '@/store/uiStore';
import { ROUTES } from '@/constants';
import { registerSchema } from './schemas';
import { AuthHeader, PasswordStrength } from './AuthCard';
import { useLocale, useMessages } from '@/i18n/client';
import { translateValidation } from '@/i18n/validation';

type RegisterValues = z.infer<typeof registerSchema>;

/** Public sign-up. Always creates a "client" account: no role field exists here. */
export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const t = useMessages('auth');
  const locale = useLocale();
  const { control, handleSubmit, formState } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', phone: '+225 ', password: '', confirm: '', acceptTerms: false },
  });
  const password = useWatch({ control, name: 'password' });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const result = await authService.register(values);
      if (!result.needsVerification) {
        notify(t.accountCreated);
        router.push(ROUTES.account.root);
        return;
      }
      notify(t.accountCreatedVerify);
      router.push(`${ROUTES.verifyEmail}?email=${encodeURIComponent(result.email)}`);
    } catch (e) {
      setError((e as Error).message);
    }
  });

  return (
    <Box>
      <AuthHeader icon={<PersonAddAlt1Rounded />} title={t.registerTitle} subtitle={t.registerSubtitle} />
      {error && (
        <Alert severity="error" className="mb-4 rounded-2xl" role="alert">
          {error}
        </Alert>
      )}
      <Box component="form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormTextField control={control} name="firstName" label={t.firstName} autoComplete="given-name" required />
        <FormTextField control={control} name="lastName" label={t.lastName} autoComplete="family-name" required />
        <FormTextField control={control} name="email" label={t.email} type="email" autoComplete="email" required className="sm:col-span-2" />
        <FormTextField control={control} name="phone" label={t.phone} type="tel" autoComplete="tel" required className="sm:col-span-2" />
        <Box className="space-y-2 sm:col-span-2">
          <PasswordField control={control} name="password" label={t.password} autoComplete="new-password" required helperText={t.passwordHint} />
          <PasswordStrength value={password} />
        </Box>
        <PasswordField control={control} name="confirm" label={t.confirmPassword} autoComplete="new-password" required className="sm:col-span-2" />
        <Controller
          control={control}
          name="acceptTerms"
          render={({ field, fieldState }) => (
            <Box className="sm:col-span-2">
              <FormControlLabel
                control={<Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                label={
                  <span>
                    {t.acceptStart}{' '}
                    <MuiLink component={Link} href={ROUTES.terms}>
                      {t.terms}
                    </MuiLink>{' '}
                    {t.and}{' '}
                    <MuiLink component={Link} href={ROUTES.privacy}>
                      {t.privacy}
                    </MuiLink>
                  </span>
                }
              />
              {fieldState.error && <FormHelperText error>{translateValidation(fieldState.error.message, locale)}</FormHelperText>}
            </Box>
          )}
        />
        <LoadingButton type="submit" variant="contained" size="large" fullWidth loading={formState.isSubmitting} className="sm:col-span-2">
          {t.createMyAccount}
        </LoadingButton>
      </Box>
      <Typography color="text.secondary" className="mt-6 text-center">
        {t.alreadyRegistered}{' '}
        <MuiLink component={Link} href={ROUTES.login} fontWeight={700}>
          {t.signIn}
        </MuiLink>
      </Typography>
    </Box>
  );
}
