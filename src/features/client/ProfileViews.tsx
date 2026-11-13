'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Avatar, Box, Button, Card, Chip, Divider, IconButton, Tooltip, Typography } from '@mui/material';
import EditRounded from '@mui/icons-material/EditRounded';
import VerifiedRounded from '@mui/icons-material/VerifiedRounded';
import MailOutlineRounded from '@mui/icons-material/MailOutlineRounded';
import PhoneOutlined from '@mui/icons-material/PhoneOutlined';
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded';
import PhotoCameraRounded from '@mui/icons-material/PhotoCameraRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import { FormTextField, LoadingButton, PageHeader } from '@/components/ui';
import { useAuthStore, type MePayload } from '@/store/authStore';
import { attempt, notify } from '@/store/uiStore';
import { api } from '@/lib/api';
import { initials } from '@/lib/format';
import { useFormat, useMessages } from '@/i18n/client';
import { vm } from '@/i18n/validation';
import { ROUTES } from '@/constants';
import { uploadImage } from '@/services/uploadService';
import { useMyOrders } from './hooks';

export function ProfileView() {
  const user = useAuthStore((s) => s.user)!;
  const orders = useMyOrders();
  const delivered = orders.filter((o) => o.status === 'delivered');
  const favoriteCount = new Map<string, number>();
  delivered.forEach((o) => o.items.forEach((i) => favoriteCount.set(i.name, (favoriteCount.get(i.name) ?? 0) + i.quantity)));
  const topPizza = Array.from(favoriteCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
  const defaultAddress = user.addresses.find((a) => a.isDefault);
  const t = useMessages('account');
  const fmt = useFormat();

  return (
    <Box>
      <PageHeader
        title={t.myProfile}
        actions={
          <Button component={Link} href={ROUTES.account.editProfile} variant="contained" startIcon={<EditRounded />}>
            {t.editInfo}
          </Button>
        }
      />
      <Box className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="p-6 text-center">
          <Avatar src={user.avatar} alt={user.firstName} sx={{ width: 104, height: 104, mx: 'auto', fontSize: 36, bgcolor: 'secondary.main' }}>
            {initials(user.firstName, user.lastName)}
          </Avatar>
          <Typography variant="h5" className="mt-4">
            {user.firstName} {user.lastName}
          </Typography>
          <Chip
            size="small"
            className="mt-2"
            icon={user.emailVerified ? <VerifiedRounded /> : undefined}
            color={user.emailVerified ? 'success' : 'warning'}
            label={user.emailVerified ? t.emailVerified : t.emailNotVerified}
            component={user.emailVerified ? 'div' : Link}
            href={user.emailVerified ? undefined : ROUTES.verifyEmail}
            clickable={!user.emailVerified}
          />
          <Divider className="my-5" />
          <Box className="space-y-3 text-left">
            <Typography className="flex items-center gap-2 break-all" color="text.secondary">
              <MailOutlineRounded fontSize="small" /> {user.email}
            </Typography>
            <Typography className="flex items-center gap-2" color="text.secondary">
              <PhoneOutlined fontSize="small" /> {user.phone}
            </Typography>
            <Typography className="flex items-center gap-2" color="text.secondary">
              <CalendarMonthRounded fontSize="small" /> {t.memberSince(fmt.date(user.createdAt, { month: 'long', year: 'numeric' }))}
            </Typography>
          </Box>
        </Card>
        <Box className="space-y-6">
          <Box className="grid gap-4 sm:grid-cols-3">
            {[
              { label: t.deliveredOrders, value: String(delivered.length) },
              { label: t.totalSpent, value: fmt.price(delivered.reduce((s, o) => s + o.total, 0)) },
              { label: t.favoritePizza, value: topPizza ?? '—' },
            ].map((s) => (
              <Card key={s.label} className="p-5">
                <Typography variant="body2" color="text.secondary">
                  {s.label}
                </Typography>
                <Typography variant="h6" className="mt-1 truncate">
                  {s.value}
                </Typography>
              </Card>
            ))}
          </Box>
          <Card className="p-6">
            <Box className="mb-3 flex items-center justify-between">
              <Typography variant="h6" component="h2">
                {t.mainAddress}
              </Typography>
              <Button component={Link} href={ROUTES.account.addresses} size="small">
                {t.manage}
              </Button>
            </Box>
            {defaultAddress ? (
              <Box className="flex items-start gap-3">
                <PlaceRounded color="primary" />
                <Box>
                  <Typography fontWeight={700}>{defaultAddress.label}</Typography>
                  <Typography color="text.secondary">
                    {defaultAddress.street}, {defaultAddress.district}, {defaultAddress.city}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Typography color="text.secondary">{t.noAddress}</Typography>
            )}
          </Card>
        </Box>
      </Box>
    </Box>
  );
}

const profileSchema = z.object({
  firstName: z.string().min(2, vm('minChars', 2)),
  lastName: z.string().min(2, vm('minChars', 2)),
  email: z.string().email(vm('invalidEmail')),
  phone: z.string().regex(/^(\+225\s?)?(\d{2}\s?){5}$/, vm('phoneFormat')),
  avatar: z.string().url(vm('invalidUrl')).or(z.literal('')),
});
type ProfileValues = z.infer<typeof profileSchema>;

export function EditProfileForm() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user)!;
  const setSession = useAuthStore((s) => s.setSession);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const t = useMessages('account');
  const { control, handleSubmit, formState, watch, setValue, reset } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, avatar: user.avatar ?? '' },
  });
  const avatar = watch('avatar');

  const onSubmit = handleSubmit(async (values) => {
    const result = await attempt(api.patch<MePayload & { emailChangePending: boolean }>('/api/account/profile', values));
    if (!result) return;
    setSession(result);
    notify(result.emailChangePending ? t.profileUpdatedEmail(values.email) : t.profileUpdated);
    router.push(ROUTES.account.profile);
  });

  const [uploading, setUploading] = React.useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      notify(t.imageTooBig, 'error');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImage(file, 'avatars');
      setValue('avatar', url, { shouldDirty: true });
    } catch (err) {
      notify(err instanceof Error ? err.message : t.uploadFailed, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      <PageHeader title={t.editInfo} breadcrumbs={[{ label: t.myProfile, href: ROUTES.account.profile }, { label: t.edit }]} />
      <Card className="max-w-3xl p-6 md:p-8">
        <Box component="form" onSubmit={onSubmit} noValidate>
          <Box className="mb-8 flex items-center gap-5">
            <Box className="relative">
              <Avatar src={avatar || undefined} sx={{ width: 88, height: 88, fontSize: 30, bgcolor: 'secondary.main' }}>
                {initials(user.firstName, user.lastName)}
              </Avatar>
              <Tooltip title={t.changePhoto}>
                <IconButton size="small" disabled={uploading} onClick={() => fileInput.current?.click()} aria-label={t.changeProfilePhoto} className="absolute -bottom-1 -right-1 bg-tomato-500 text-white hover:bg-tomato-600">
                  <PhotoCameraRounded fontSize="small" />
                </IconButton>
              </Tooltip>
              <input ref={fileInput} type="file" accept="image/*" hidden onChange={onFile} />
            </Box>
            <Box>
              <Typography fontWeight={700}>{t.profilePhoto}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t.photoHint}
              </Typography>
              {avatar && (
                <Button size="small" color="inherit" onClick={() => setValue('avatar', '', { shouldDirty: true })}>
                  {t.remove}
                </Button>
              )}
            </Box>
          </Box>
          <Box className="grid gap-4 sm:grid-cols-2">
            <FormTextField control={control} name="firstName" label={t.firstName} autoComplete="given-name" required />
            <FormTextField control={control} name="lastName" label={t.lastName} autoComplete="family-name" required />
            <FormTextField control={control} name="email" label={t.email} type="email" autoComplete="email" required helperText={t.emailChangeHint} />
            <FormTextField control={control} name="phone" label={t.phone} type="tel" autoComplete="tel" required />
          </Box>
          <Box className="mt-8 flex flex-wrap justify-end gap-3">
            <Button color="inherit" onClick={() => reset()} disabled={!formState.isDirty}>
              {t.reset}
            </Button>
            <Button component={Link} href={ROUTES.account.profile} variant="outlined" color="inherit">
              {t.cancel}
            </Button>
            <LoadingButton type="submit" variant="contained" loading={formState.isSubmitting} disabled={!formState.isDirty}>
              {t.save}
            </LoadingButton>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
