'use client';

import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, Card, Chip, FormControlLabel, IconButton, InputAdornment, MenuItem, Switch, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import AddRounded from '@mui/icons-material/AddRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import EggAltRounded from '@mui/icons-material/EggAltRounded';
import { AppDialog, ConfirmDialog, EmptyState, FormTextField, LoadingButton, PageHeader, ResponsiveTable, useConfirm } from '@/components/ui';
import { useDataStore } from '@/store/dataStore';
import { attempt } from '@/store/uiStore';
import { useDataLoading } from '@/hooks';
import { centsToUnits, unitsToCents } from '@/lib/format';
import { INGREDIENT_TYPE_KEYS } from '@/constants';
import { useFormat, useMessages } from '@/i18n/client';
import { vm } from '@/i18n/validation';
import type { Ingredient, IngredientType, StockUnit } from '@/types';

const UNITS: StockUnit[] = ['kg', 'g', 'L', 'pièces'];
const TYPES: IngredientType[] = [...INGREDIENT_TYPE_KEYS];

const schema = z.object({
  name: z.string().min(2, vm('minChars', 2)),
  nameEn: z.string().max(60, vm('maxChars', 60)),
  type: z.enum(['base', 'sauce', 'cheese', 'veggie']),
  description: z.string().max(80, vm('maxChars', 80)),
  descriptionEn: z.string().max(80, vm('maxChars', 80)),
  /** Dollars in the form, cents in the API. */
  price: z.number({ invalid_type_error: vm('numberRequired') }).min(0).max(20, vm('priceMax', 2_000)),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$|^transparent$/, vm('hexColor')),
  unit: z.enum(['kg', 'g', 'L', 'pièces']),
  threshold: z.number({ invalid_type_error: vm('numberRequired') }).min(0),
  stock: z.number({ invalid_type_error: vm('numberRequired') }).min(0),
  active: z.boolean(),
});
type Values = z.infer<typeof schema>;

const toNumber = (v: string) => (v === '' ? NaN : Number(v));

function IngredientDialog({ open, ingredient, defaultType, onClose }: { open: boolean; ingredient: Ingredient | null; defaultType: IngredientType; onClose: () => void }) {
  const upsert = useDataStore((s) => s.upsertIngredient);
  const defaultThreshold = useDataStore((s) => s.settings.defaultStockThreshold);
  const empty: Values = { name: '', nameEn: '', type: defaultType, description: '', descriptionEn: '', price: 0, color: '#E2603F', unit: 'kg', threshold: defaultThreshold, stock: 0, active: true };
  const t = useMessages('admin');
  const domain = useMessages('domain');
  const { control, handleSubmit, reset, formState, watch } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: empty });
  const color = watch('color');

  React.useEffect(() => {
    if (open)
      reset(
        ingredient
          ? {
              ...ingredient,
              name: ingredient.translations.fr.name,
              nameEn: ingredient.translations.en.name,
              description: ingredient.translations.fr.description,
              descriptionEn: ingredient.translations.en.description,
              price: centsToUnits(ingredient.price),
            }
          : empty,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ingredient, reset]);

  const onSubmit = handleSubmit(async (v) => {
    const translations = { fr: { name: v.name, description: v.description }, en: { name: v.nameEn, description: v.descriptionEn } };
    const saved = await attempt(upsert({ ...(ingredient ?? { id: 'new' }), ...v, price: unitsToCents(v.price), translations } as Ingredient), ingredient ? t.ingredientEdited : t.ingredientAdded);
    if (saved) onClose();
  });

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={ingredient ? t.editIngredient : t.newIngredient}
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
        <FormTextField control={control} name="name" label={t.name} required />
        <FormTextField control={control} name="nameEn" label={t.nameEn} />
        <FormTextField control={control} name="type" label={t.type} select required>
          {TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {domain.ingredientTypes[type]}
            </MenuItem>
          ))}
        </FormTextField>
        <FormTextField control={control} name="price" label={t.builderExtra} type="number" transform={toNumber} inputProps={{ step: 0.01, min: 0 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
        <FormTextField control={control} name="description" label={t.description} />
        <FormTextField control={control} name="descriptionEn" label={t.descriptionEn} />
        <FormTextField
          control={control}
          name="color"
          label={t.previewColor}
          InputProps={{ startAdornment: <InputAdornment position="start"><span className="inline-block h-5 w-5 rounded-full border border-solid border-black/10" style={{ background: color }} /></InputAdornment> }}
        />
        <FormTextField control={control} name="unit" label={t.unit} select>
          {UNITS.map((u) => (
            <MenuItem key={u} value={u}>
              {domain.units[u]}
            </MenuItem>
          ))}
        </FormTextField>
        <FormTextField control={control} name="threshold" label={t.threshold} type="number" transform={toNumber} />
        {!ingredient && <FormTextField control={control} name="stock" label={t.initialStock} type="number" transform={toNumber} helperText={t.initialStockHint} />}
        <Controller control={control} name="active" render={({ field }) => <FormControlLabel className="sm:col-span-2" control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />} label={t.availableInBuilder} />} />
      </Box>
    </AppDialog>
  );
}

export function IngredientsAdmin() {
  const ingredients = useDataStore((s) => s.ingredients);
  const upsert = useDataStore((s) => s.upsertIngredient);
  const remove = useDataStore((s) => s.deleteIngredient);
  const loading = useDataLoading();
  const [type, setType] = React.useState<IngredientType>('base');
  const [dialog, setDialog] = React.useState<{ open: boolean; ingredient: Ingredient | null }>({ open: false, ingredient: null });
  const confirm = useConfirm<Ingredient>();
  const rows = React.useMemo(() => ingredients.filter((i) => i.type === type), [ingredients, type]);
  const t = useMessages('admin');
  const domain = useMessages('domain');
  const fmt = useFormat();

  const actions = (i: Ingredient) => (
    <Box className="flex">
      <Tooltip title={t.edit}>
        <IconButton aria-label={t.editOf(i.name)} onClick={() => setDialog({ open: true, ingredient: i })}>
          <EditRounded fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={t.delete}>
        <IconButton aria-label={t.deleteOf(i.name)} onClick={() => confirm.ask(i)}>
          <DeleteOutlineRounded fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const toggle = (i: Ingredient) => {
    void attempt(upsert({ ...i, active: !i.active }), i.active ? t.removedFromBuilder(i.name) : t.addedToBuilder(i.name), 'info');
  };

  const columns: GridColDef<Ingredient>[] = [
    {
      field: 'name',
      headerName: t.colIngredient,
      flex: 1,
      minWidth: 220,
      renderCell: ({ row }) => (
        <Box className="flex items-center gap-3">
          <span className="inline-block h-8 w-8 shrink-0 rounded-full border border-solid border-black/10" style={{ background: row.color === 'transparent' ? '#eee' : row.color }} />
          <Box>
            <Typography fontWeight={700}>{row.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {row.description}
            </Typography>
          </Box>
        </Box>
      ),
    },
    { field: 'price', headerName: t.colExtra, width: 130, valueFormatter: (v: number) => (v ? fmt.price(v) : t.included) },
    { field: 'stock', headerName: t.colStock, width: 120, valueGetter: (_v, row) => `${row.stock} ${domain.units[row.unit]}` },
    { field: 'active', headerName: t.active, width: 90, renderCell: ({ row }) => <Switch checked={row.active} onChange={() => toggle(row)} inputProps={{ 'aria-label': t.enableOf(row.name) }} /> },
    { field: 'actions', headerName: '', width: 100, sortable: false, renderCell: ({ row }) => actions(row) },
  ];

  return (
    <Box>
      <PageHeader
        title={t.ingredients}
        description={t.ingredientsHint}
        actions={
          <Button variant="contained" startIcon={<AddRounded />} onClick={() => setDialog({ open: true, ingredient: null })}>
            {t.add}
          </Button>
        }
      />
      <Tabs value={type} onChange={(_, v) => setType(v)} variant="scrollable" allowScrollButtonsMobile className="mb-4" aria-label={t.ingredientTypeAria}>
        {TYPES.map((key) => (
          <Tab key={key} value={key} label={<span>{domain.ingredientTypes[key]} <Chip size="small" label={ingredients.filter((i) => i.type === key).length} className="ml-1 h-5" /></span>} />
        ))}
      </Tabs>
      <ResponsiveTable
        ariaLabel={t.listOf(domain.ingredientTypes[type].toLowerCase())}
        rows={rows}
        columns={columns}
        loading={loading}
        emptyState={<EmptyState icon={<EggAltRounded />} title={t.noIngredient} action={{ label: t.add, onClick: () => setDialog({ open: true, ingredient: null }) }} />}
        renderCard={(i) => (
          <Box className="flex items-center gap-3">
            <span className="inline-block h-10 w-10 shrink-0 rounded-full border border-solid border-black/10" style={{ background: i.color === 'transparent' ? '#eee' : i.color }} />
            <Box className="min-w-0 flex-1">
              <Typography fontWeight={800}>{i.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {i.price ? `+ ${fmt.price(i.price)}` : t.included} · {i.stock} {domain.units[i.unit]}
              </Typography>
            </Box>
            <Switch size="small" checked={i.active} onChange={() => toggle(i)} inputProps={{ 'aria-label': t.enableOf(i.name) }} />
            {actions(i)}
          </Box>
        )}
      />
      <Card className="mt-4 p-4">
        <Typography variant="body2" color="text.secondary">
          {t.ingredientsNote}
        </Typography>
      </Card>
      <IngredientDialog open={dialog.open} ingredient={dialog.ingredient} defaultType={type} onClose={() => setDialog({ open: false, ingredient: null })} />
      <ConfirmDialog
        open={confirm.open}
        danger
        title={t.deleteIngredientTitle}
        message={confirm.target ? t.deleteIngredientText(confirm.target.name) : ''}
        confirmLabel={t.delete}
        onClose={confirm.close}
        onConfirm={() => {
          if (confirm.target) void attempt(remove(confirm.target.id), t.ingredientDeleted, 'info');
          confirm.close();
        }}
      />
    </Box>
  );
}
