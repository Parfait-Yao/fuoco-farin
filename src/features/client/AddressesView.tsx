'use client';

import * as React from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, Card, Checkbox, Chip, FormControlLabel, IconButton, MenuItem, Tooltip, Typography } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import { AnimatePresence, motion } from 'framer-motion';
import { AppDialog, ConfirmDialog, EmptyState, FormTextField, LoadingButton, LocateMeButton, PageHeader, useConfirm, type LocatedAddress } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { attempt } from '@/store/uiStore';
import { ABIDJAN_DISTRICTS } from '@/constants';
import type { Address } from '@/types';
import { useMessages } from '@/i18n/client';
import { vm } from '@/i18n/validation';

const addressSchema = z.object({
  label: z.string().min(2, vm('minChars', 2)).max(30, vm('maxChars', 30)),
  street: z.string().min(5, vm('minChars', 5)),
  district: z.string().min(1, vm('chooseOption')),
  city: z.string().min(2, vm('minChars', 2)),
  details: z.string().max(140).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isDefault: z.boolean(),
});
type AddressValues = z.infer<typeof addressSchema>;

const NO_ADDRESSES: Address[] = [];
const EMPTY: AddressValues = { label: '', street: '', district: '', city: 'Abidjan', details: '', latitude: undefined, longitude: undefined, isDefault: false };

function AddressDialog({ open, address, onClose }: { open: boolean; address: Address | null; onClose: () => void }) {
  const saveAddress = useAuthStore((s) => s.saveAddress);
  const t = useMessages('account');
  const { control, handleSubmit, reset, setValue, formState } = useForm<AddressValues>({ resolver: zodResolver(addressSchema), defaultValues: EMPTY });
  const latitude = useWatch({ control, name: 'latitude' });
  const onLocated = (r: LocatedAddress) => {
    setValue('latitude', r.latitude);
    setValue('longitude', r.longitude);
    if (r.street) setValue('street', r.street, { shouldValidate: true });
    if (r.district) setValue('district', r.district, { shouldValidate: true });
    if (r.city) setValue('city', r.city, { shouldValidate: true });
  };
  const clearPosition = () => {
    setValue('latitude', undefined);
    setValue('longitude', undefined);
  };

  React.useEffect(() => {
    if (open) reset(address ? { ...EMPTY, ...address, details: address.details ?? '', isDefault: Boolean(address.isDefault) } : EMPTY);
  }, [open, address, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const done = await attempt(saveAddress({ ...values, id: address?.id, details: values.details || undefined }).then(() => true), address ? t.addressEdited : t.addressAdded);
    if (done) onClose();
  });

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={address ? t.editAddress : t.newAddress}
      actions={
        <>
          <Button onClick={onClose} color="inherit">
            {t.cancel}
          </Button>
          <LoadingButton variant="contained" loading={formState.isSubmitting} onClick={onSubmit}>
            {t.save}
          </LoadingButton>
        </>
      }
    >
      <Box component="form" onSubmit={onSubmit} noValidate className="grid gap-4 pt-2 sm:grid-cols-2">
        <Box className="sm:col-span-2">
          <LocateMeButton key={String(open)} onLocated={onLocated} onClear={clearPosition} hasPosition={latitude !== undefined} />
        </Box>
        <FormTextField control={control} name="label" label={t.addressName} placeholder={t.addressNamePlaceholder} required />
        <FormTextField control={control} name="district" label={t.district} select required>
          {ABIDJAN_DISTRICTS.map((d) => (
            <MenuItem key={d} value={d}>
              {d}
            </MenuItem>
          ))}
        </FormTextField>
        <FormTextField control={control} name="street" label={t.street} required className="sm:col-span-2" />
        <FormTextField control={control} name="city" label={t.city} required />
        <FormTextField control={control} name="details" label={t.details} placeholder={t.detailsPlaceholder} />
        <Controller
          control={control}
          name="isDefault"
          render={({ field }) => <FormControlLabel className="sm:col-span-2" control={<Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />} label={t.useAsDefault} />}
        />
      </Box>
    </AppDialog>
  );
}

export function AddressesView() {
  const addresses = useAuthStore((s) => s.user?.addresses) ?? NO_ADDRESSES;
  const saveAddress = useAuthStore((s) => s.saveAddress);
  const deleteAddress = useAuthStore((s) => s.deleteAddress);
  const [editing, setEditing] = React.useState<Address | null>(null);
  const [open, setOpen] = React.useState(false);
  const confirm = useConfirm<Address>();
  const t = useMessages('account');

  const openForm = (address: Address | null) => {
    setEditing(address);
    setOpen(true);
  };

  return (
    <Box>
      <PageHeader
        title={t.myAddresses}
        description={t.myAddressesHint}
        actions={
          <Button variant="contained" startIcon={<AddRounded />} onClick={() => openForm(null)}>
            {t.addAddress}
          </Button>
        }
      />
      {addresses.length === 0 ? (
        <EmptyState icon={<PlaceRounded />} title={t.noAddresses} description={t.noAddressesHint} action={{ label: t.addAddress, onClick: () => openForm(null) }} />
      ) : (
        <Box className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {addresses.map((a) => (
              <motion.div key={a.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                <Card className={`h-full p-5 ${a.isDefault ? 'border-2 border-solid border-tomato-300' : ''}`}>
                  <Box className="flex items-start justify-between gap-2">
                    <Box className="flex items-center gap-2">
                      <PlaceRounded color="primary" />
                      <Typography fontWeight={800}>{a.label}</Typography>
                    </Box>
                    {a.isDefault && <Chip size="small" color="primary" label={t.default} />}
                  </Box>
                  <Typography color="text.secondary" className="mt-2">
                    {a.street}
                    <br />
                    {a.district}, {a.city}
                  </Typography>
                  {a.details && (
                    <Typography variant="body2" color="text.secondary" className="mt-1 italic">
                      {a.details}
                    </Typography>
                  )}
                  <Box className="mt-4 flex items-center gap-1">
                    {!a.isDefault && (
                      <Button
                        size="small"
                        startIcon={<StarRounded />}
                        onClick={() => {
                          void attempt(saveAddress({ ...a, isDefault: true }), t.isNowDefault(a.label));
                        }}
                      >
                        {t.default}
                      </Button>
                    )}
                    <Box className="ml-auto flex">
                      <Tooltip title={t.edit}>
                        <IconButton aria-label={t.editLabel(a.label)} onClick={() => openForm(a)}>
                          <EditRounded />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t.delete}>
                        <IconButton aria-label={t.deleteLabel(a.label)} onClick={() => confirm.ask(a)}>
                          <DeleteOutlineRounded />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </Box>
      )}
      <AddressDialog open={open} address={editing} onClose={() => setOpen(false)} />
      <ConfirmDialog
        open={confirm.open}
        danger
        title={t.deleteAddressTitle}
        message={confirm.target ? t.deleteAddressText(confirm.target.label) : ''}
        confirmLabel={t.delete}
        onClose={confirm.close}
        onConfirm={() => {
          if (confirm.target) void attempt(deleteAddress(confirm.target.id), t.addressDeleted, 'info');
          confirm.close();
        }}
      />
      <Typography variant="body2" color="text.secondary" className="mt-6">
        {t.addressesCount(addresses.length)}
      </Typography>
    </Box>
  );
}
