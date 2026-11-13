'use client';

import * as React from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, Card, Chip, FormControlLabel, IconButton, InputAdornment, MenuItem, Switch, Tooltip, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import AddRounded from '@mui/icons-material/AddRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import LocalOfferRounded from '@mui/icons-material/LocalOfferRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import { AppDialog, ConfirmDialog, EmptyState, FormTextField, LoadingButton, PageHeader, ResponsiveTable, useConfirm } from '@/components/ui';
import { useDataStore } from '@/store/dataStore';
import { attempt, notify } from '@/store/uiStore';
import { useDataLoading } from '@/hooks';
import { centsToUnits, unitsToCents } from '@/lib/format';
import { useFormat, useMessages } from '@/i18n/client';
import { vm } from '@/i18n/validation';
import type { Promotion } from '@/types';

const schema = z
  .object({
    code: z.string().min(4, vm('minChars', 4)).max(20, vm('maxChars', 20)).regex(/^[A-Z0-9]+$/, vm('promoCodeFormat')),
    label: z.string().min(3, vm('minChars', 3)),
    labelEn: z.string().max(80, vm('maxChars', 80)),
    kind: z.enum(['percent', 'fixed']),
    /** Percent, or dollars for a fixed amount (cents in the API). */
    value: z.number({ invalid_type_error: vm('numberRequired') }).positive(vm('positiveValue')),
    minOrder: z.number({ invalid_type_error: vm('numberRequired') }).min(0),
    startDate: z.string().min(1, vm('required')),
    endDate: z.string().min(1, vm('required')),
    maxUses: z.number().int().positive(vm('positiveValue')).nullable(),
    maxUsesPerUser: z.number().int().positive(vm('positiveValue')).nullable(),
    maxDiscount: z.number().positive(vm('positiveValue')).nullable(),
    active: z.boolean(),
  })
  .refine((v) => v.kind !== 'percent' || v.value <= 90, { path: ['value'], message: vm('maxValue', 90) })
  .refine((v) => v.endDate >= v.startDate, { path: ['endDate'], message: vm('endAfterStart') });
type Values = z.infer<typeof schema>;

const toNumber = (v: string) => (v === '' ? NaN : Number(v));
const toOptional = (v: string) => (v === '' ? null : Number(v));
const day = (iso: string) => iso.slice(0, 10);

type PromoState = 'active' | 'scheduled' | 'expired' | 'disabled';
const promoState = (p: Promotion): PromoState => {
  if (!p.active) return 'disabled';
  const now = new Date().toISOString().slice(0, 10);
  if (day(p.endDate) < now) return 'expired';
  if (day(p.startDate) > now) return 'scheduled';
  return 'active';
};
const STATE_COLOR: Record<PromoState, 'success' | 'info' | 'default' | 'warning'> = {
  active: 'success',
  scheduled: 'info',
  expired: 'warning',
  disabled: 'default',
};

function PromotionDialog({ open, promotion, onClose }: { open: boolean; promotion: Promotion | null; onClose: () => void }) {
  const promotions = useDataStore((s) => s.promotions);
  const upsert = useDataStore((s) => s.upsertPromotion);
  const today = new Date().toISOString().slice(0, 10);
  const t = useMessages('admin');
  const empty: Values = { code: '', label: '', labelEn: '', kind: 'percent', value: 10, minOrder: 15, startDate: today, endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), maxUses: null, maxUsesPerUser: null, maxDiscount: null, active: true };
  const { control, handleSubmit, reset, formState, setError } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: empty });
  const kind = useWatch({ control, name: 'kind' });

  React.useEffect(() => {
    if (open)
      reset(
        promotion
          ? {
              ...promotion,
              label: promotion.translations.fr.label,
              labelEn: promotion.translations.en.label,
              value: promotion.kind === 'fixed' ? centsToUnits(promotion.value) : promotion.value,
              minOrder: centsToUnits(promotion.minOrder),
              startDate: day(promotion.startDate),
              endDate: day(promotion.endDate),
              maxUses: promotion.maxUses ?? null,
              maxUsesPerUser: promotion.maxUsesPerUser ?? null,
              maxDiscount: promotion.maxDiscount ? centsToUnits(promotion.maxDiscount) : null,
            }
          : empty,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, promotion, reset]);

  const onSubmit = handleSubmit(async (v) => {
    if (promotions.some((p) => p.code === v.code && p.id !== promotion?.id)) {
      setError('code', { message: t.codeExists });
      return;
    }
    const saved = await attempt(
      upsert({
        ...(promotion ?? { id: 'new', usageCount: 0 }),
        ...v,
        translations: { fr: { label: v.label }, en: { label: v.labelEn } },
        value: v.kind === 'fixed' ? unitsToCents(v.value) : Math.round(v.value),
        minOrder: unitsToCents(v.minOrder),
        maxUses: v.maxUses ?? undefined,
        maxUsesPerUser: v.maxUsesPerUser ?? undefined,
        maxDiscount: v.kind === 'percent' && v.maxDiscount ? unitsToCents(v.maxDiscount) : undefined,
        startDate: new Date(`${v.startDate}T00:00:00`).toISOString(),
        endDate: new Date(`${v.endDate}T23:59:59`).toISOString(),
      } as Promotion),
      promotion ? t.promotionEdited : t.codeCreated(v.code),
    );
    if (saved) onClose();
  });

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={promotion ? t.editPromotion : t.newPromotion}
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
        <FormTextField control={control} name="code" label={t.code} required transform={(v) => v.toUpperCase().replace(/\s/g, '')} />
        <FormTextField control={control} name="kind" label={t.discountType} select>
          <MenuItem value="percent">{t.percentage}</MenuItem>
          <MenuItem value="fixed">{t.fixedAmount}</MenuItem>
        </FormTextField>
        <FormTextField control={control} name="label" label={t.label} required />
        <FormTextField control={control} name="labelEn" label={t.labelEn} helperText={t.englishHint} />
        <FormTextField control={control} name="value" label={t.value} type="number" transform={toNumber} inputProps={{ step: kind === 'percent' ? 1 : 0.01, min: 0 }} InputProps={kind === 'percent' ? { endAdornment: <InputAdornment position="end">%</InputAdornment> } : { startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
        <FormTextField control={control} name="minOrder" label={t.minOrder} type="number" transform={toNumber} inputProps={{ step: 0.01, min: 0 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
        <FormTextField control={control} name="maxDiscount" label={t.maxDiscount} type="number" transform={toOptional} disabled={kind !== 'percent'} helperText={t.noCap} inputProps={{ step: 0.01, min: 0 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
        <FormTextField control={control} name="maxUses" label={t.maxUses} type="number" transform={toOptional} helperText={t.unlimited} />
        <FormTextField control={control} name="maxUsesPerUser" label={t.maxUsesPerUser} type="number" transform={toOptional} helperText={t.unlimited} />
        <FormTextField control={control} name="startDate" label={t.startDate} type="date" InputLabelProps={{ shrink: true }} />
        <FormTextField control={control} name="endDate" label={t.endDate} type="date" InputLabelProps={{ shrink: true }} />
        <Controller control={control} name="active" render={({ field }) => <FormControlLabel className="sm:col-span-2" control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />} label={t.promotionActive} />} />
      </Box>
    </AppDialog>
  );
}

export function PromotionsAdmin() {
  const promotions = useDataStore((s) => s.promotions);
  const upsert = useDataStore((s) => s.upsertPromotion);
  const remove = useDataStore((s) => s.deletePromotion);
  const loading = useDataLoading();
  const [dialog, setDialog] = React.useState<{ open: boolean; promotion: Promotion | null }>({ open: false, promotion: null });
  const confirm = useConfirm<Promotion>();
  const t = useMessages('admin');
  const fmt = useFormat();
  const stateChip = (p: Promotion) => ({ label: t.promoStates[promoState(p)], color: STATE_COLOR[promoState(p)] });

  const valueLabel = (p: Promotion) => (p.kind === 'percent' ? `-${p.value}%` : `-${fmt.price(p.value)}`);
  const toggle = (p: Promotion) => {
    void attempt(upsert({ ...p, active: !p.active }), p.active ? t.deactivated(p.code) : t.activated(p.code), 'info');
  };
  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      notify(t.copied(code));
    } catch {
      notify(code, 'info');
    }
  };

  const actions = (p: Promotion) => (
    <Box className="flex">
      <Tooltip title={t.copyCode}>
        <IconButton aria-label={t.copyOf(p.code)} onClick={() => copy(p.code)}>
          <ContentCopyRounded fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={t.edit}>
        <IconButton aria-label={t.editOf(p.code)} onClick={() => setDialog({ open: true, promotion: p })}>
          <EditRounded fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={t.delete}>
        <IconButton aria-label={t.deleteOf(p.code)} onClick={() => confirm.ask(p)}>
          <DeleteOutlineRounded fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const columns: GridColDef<Promotion>[] = [
    { field: 'code', headerName: t.code, width: 150, renderCell: ({ value }) => <span className="font-mono font-bold tracking-wider">{value}</span> },
    { field: 'label', headerName: t.colLabel, flex: 1, minWidth: 200 },
    { field: 'value', headerName: t.colDiscount, width: 120, valueGetter: (_v, row) => valueLabel(row) },
    { field: 'minOrder', headerName: t.colMinimum, width: 130, valueFormatter: (v: number) => fmt.price(v) },
    { field: 'period', headerName: t.colPeriod, width: 200, valueGetter: (_v, row) => `${fmt.date(row.startDate)} → ${fmt.date(row.endDate)}` },
    { field: 'usageCount', headerName: t.colUses, width: 110, type: 'number' },
    {
      field: 'state',
      headerName: t.state,
      width: 170,
      renderCell: ({ row }) => (
        <Box className="flex items-center gap-1">
          <Switch size="small" checked={row.active} onChange={() => toggle(row)} inputProps={{ 'aria-label': t.enableOf(row.code) }} />
          <Chip size="small" {...stateChip(row)} />
        </Box>
      ),
    },
    { field: 'actions', headerName: '', width: 140, sortable: false, renderCell: ({ row }) => actions(row) },
  ];

  return (
    <Box>
      <PageHeader
        title={t.promotionsTitle}
        description={t.activeCodes(promotions.filter((p) => promoState(p) === 'active').length)}
        actions={
          <Button variant="contained" startIcon={<AddRounded />} onClick={() => setDialog({ open: true, promotion: null })}>
            {t.createPromotion}
          </Button>
        }
      />
      <ResponsiveTable
        ariaLabel={t.promotionsListAria}
        rows={promotions}
        columns={columns}
        loading={loading}
        emptyState={<EmptyState icon={<LocalOfferRounded />} title={t.noPromotion} action={{ label: t.create, onClick: () => setDialog({ open: true, promotion: null }) }} />}
        renderCard={(p) => (
          <Box>
            <Box className="flex items-start justify-between gap-2">
              <Box>
                <Typography className="font-mono font-bold tracking-wider">{p.code}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {p.label}
                </Typography>
              </Box>
              <Chip size="small" {...stateChip(p)} />
            </Box>
            <Typography variant="body2" className="mt-2">
              <strong>{valueLabel(p)}</strong> {t.from(fmt.price(p.minOrder))} · {fmt.date(p.startDate)} → {fmt.date(p.endDate)}
            </Typography>
            <Box className="mt-1 flex items-center justify-between">
              <Switch size="small" checked={p.active} onChange={() => toggle(p)} inputProps={{ 'aria-label': t.enableOf(p.code) }} />
              {actions(p)}
            </Box>
          </Box>
        )}
      />
      <Card className="mt-4 p-4">
        <Typography variant="body2" color="text.secondary">
          {t.promotionsNote}
        </Typography>
      </Card>
      <PromotionDialog open={dialog.open} promotion={dialog.promotion} onClose={() => setDialog({ open: false, promotion: null })} />
      <ConfirmDialog
        open={confirm.open}
        danger
        title={t.deletePromotionTitle}
        message={confirm.target ? t.deletePromotionText(confirm.target.code) : ''}
        confirmLabel={t.delete}
        onClose={confirm.close}
        onConfirm={() => {
          if (confirm.target) void attempt(remove(confirm.target.id), t.promotionDeleted, 'info');
          confirm.close();
        }}
      />
    </Box>
  );
}
