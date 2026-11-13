'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Link as MuiLink, TextField, Typography } from '@mui/material';
import LockResetRounded from '@mui/icons-material/LockResetRounded';
import MarkEmailReadRounded from '@mui/icons-material/MarkEmailReadRounded';
import KeyRounded from '@mui/icons-material/KeyRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import { motion } from 'framer-motion';
import { FormTextField, LoadingButton, PasswordField } from '@/components/ui';
import { authService } from '@/services';
import { useAuthStore } from '@/store/authStore';
import { notify } from '@/store/uiStore';
import { ROUTES } from '@/constants';
import { forgotSchema, resetSchema } from './schemas';
import { AuthHeader, PasswordStrength } from './AuthCard';
import { useMessages } from '@/i18n/client';

function SuccessState({ title, text, action }: { title: string; text: string; action: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center" role="status">
      <CheckCircleRounded className="text-7xl text-basil-500" />
      <Typography variant="h4" component="h1" className="mt-4">
        {title}
      </Typography>
      <Typography color="text.secondary" className="mt-2">
        {text}
      </Typography>
      <Box className="mt-8">{action}</Box>
    </motion.div>
  );
}

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const t = useMessages('auth');
  const { control, handleSubmit, formState, setError } = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } });

  const onSubmit = handleSubmit(async ({ email }) => {
    try {
      await authService.requestPasswordReset(email);
      setSentTo(email);
    } catch (e) {
      setError('email', { message: (e as Error).message });
    }
  });

  if (sentTo) {
    return (
      <SuccessState
        title={t.emailSent}
        text={t.resetSentTo(sentTo)}
        action={
          <Box className="flex flex-col gap-2">
            <Button component={Link} href={`${ROUTES.resetPassword}?token=demo`} variant="contained" size="large">
              {t.openDemoLink}
            </Button>
            <Button component={Link} href={ROUTES.login} startIcon={<ArrowBackRounded />}>
              {t.backToLogin}
            </Button>
          </Box>
        }
      />
    );
  }

  return (
    <Box>
      <AuthHeader icon={<KeyRounded />} title={t.forgotTitle} subtitle={t.forgotSubtitle} />
      <Box component="form" onSubmit={onSubmit} noValidate className="space-y-4">
        <FormTextField control={control} name="email" label={t.email} type="email" autoComplete="email" autoFocus required />
        <LoadingButton type="submit" variant="contained" size="large" fullWidth loading={formState.isSubmitting}>
          {t.sendLink}
        </LoadingButton>
      </Box>
      <Button component={Link} href={ROUTES.login} startIcon={<ArrowBackRounded />} className="mt-4">
        {t.backToLogin}
      </Button>
    </Box>
  );
}

export function ResetPasswordForm() {
  // /auth/callback sends ?error=link when the email link is invalid or expired.
  const linkError = useSearchParams().get('error');
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema), defaultValues: { password: '', confirm: '' } });
  const password = useWatch({ control, name: 'password' });
  const t = useMessages('auth');

  const onSubmit = handleSubmit(async ({ password: next }) => {
    setError(null);
    try {
      await authService.resetPassword(next);
      setDone(true);
      notify(t.passwordUpdated);
    } catch (e) {
      setError((e as Error).message);
    }
  });

  if (linkError) {
    return (
      <Box>
        <AuthHeader icon={<LockResetRounded />} title={t.invalidLink} subtitle={t.invalidLinkText} />
        <Button component={Link} href={ROUTES.forgotPassword} variant="contained" fullWidth size="large">
          {t.requestNewLink}
        </Button>
      </Box>
    );
  }

  if (done) {
    return (
      <SuccessState
        title={t.done}
        text={t.doneText}
        action={
          <Button component={Link} href={ROUTES.login} variant="contained" size="large">
            {t.signIn}
          </Button>
        }
      />
    );
  }

  return (
    <Box>
      <AuthHeader icon={<LockResetRounded />} title={t.newPasswordTitle} subtitle={t.newPasswordSubtitle} />
      {error && (
        <Alert severity="error" className="mb-4 rounded-2xl" role="alert" action={<Button color="inherit" size="small" component={Link} href={ROUTES.forgotPassword}>{t.newLink}</Button>}>
          {error}
        </Alert>
      )}
      <Box component="form" onSubmit={onSubmit} noValidate className="space-y-4">
        <PasswordField control={control} name="password" label={t.newPassword} autoComplete="new-password" required />
        <PasswordStrength value={password} />
        <PasswordField control={control} name="confirm" label={t.confirm} autoComplete="new-password" required />
        <LoadingButton type="submit" variant="contained" size="large" fullWidth loading={formState.isSubmitting}>
          {t.reset}
        </LoadingButton>
      </Box>
    </Box>
  );
}

export function VerifyEmailForm() {
  const router = useRouter();
  const email = useSearchParams().get('email') ?? useAuthStore.getState().pendingEmail ?? useAuthStore.getState().user?.email ?? '';
  const [digits, setDigits] = React.useState<string[]>(Array(6).fill(''));
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [verified, setVerified] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);
  const t = useMessages('auth');

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const setDigit = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length > 1) {
      // Paste of the full code.
      const next = clean.slice(0, 6).split('');
      setDigits([...next, ...Array(6 - next.length).fill('')]);
      refs.current[Math.min(5, next.length)]?.focus();
      return;
    }
    setDigits((d) => d.map((x, i) => (i === index ? clean : x)));
    if (clean && index < 5) refs.current[index + 1]?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < 6) return setError(t.enter6);
    if (!email) return setError(t.unknownEmail);
    setLoading(true);
    setError(null);
    try {
      await authService.verifyEmail(email, code);
      setVerified(true);
      notify(t.emailVerified);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return (
      <SuccessState
        title={t.verifiedTitle}
        text={t.verifiedText}
        action={
          <Button variant="contained" size="large" onClick={() => router.push(ROUTES.account.root)}>
            {t.goToAccount}
          </Button>
        }
      />
    );
  }

  return (
    <Box>
      <AuthHeader icon={<MarkEmailReadRounded />} title={t.verifyTitle} subtitle={<>{t.codeSentTo} <strong>{email || t.yourAddress}</strong>.</>} />
      <Box component="form" onSubmit={submit} noValidate>
        <Box className="flex justify-between gap-2" role="group" aria-label={t.verificationCode}>
          {digits.map((d, i) => (
            <TextField
              key={i}
              value={d}
              inputRef={(el) => (refs.current[i] = el)}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => e.key === 'Backspace' && !d && i > 0 && refs.current[i - 1]?.focus()}
              inputProps={{ inputMode: 'numeric', maxLength: 6, 'aria-label': t.digit(i + 1), className: 'text-center text-2xl font-bold px-0' }}
              error={Boolean(error)}
              sx={{ maxWidth: 56 }}
            />
          ))}
        </Box>
        {error && (
          <Alert severity="error" className="mt-4 rounded-2xl" role="alert">
            {error}
          </Alert>
        )}
        <LoadingButton type="submit" variant="contained" size="large" fullWidth loading={loading} className="mt-6">
          {t.verify}
        </LoadingButton>
      </Box>
      <Typography color="text.secondary" className="mt-6 text-center">
        {t.nothingReceived}{' '}
        <MuiLink
          component="button"
          type="button"
          disabled={cooldown > 0}
          onClick={async () => {
            try {
              await authService.resendVerification(email);
              setCooldown(30);
              notify(t.newCodeSent, 'info');
            } catch (err) {
              setError((err as Error).message);
            }
          }}
          fontWeight={700}
        >
          {cooldown > 0 ? t.resendIn(cooldown) : t.resend}
        </MuiLink>
      </Typography>
    </Box>
  );
}
