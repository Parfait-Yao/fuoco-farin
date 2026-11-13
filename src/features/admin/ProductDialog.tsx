'use client';

import * as React from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Autocomplete, Box, Button, Chip, FormControlLabel, InputAdornment, MenuItem, Switch, TextField, Typography } from '@mui/material';
import CloudUploadRounded from '@mui/icons-material/CloudUploadRounded';
import { AppDialog, FormTextField, LoadingButton, PizzaImage } from '@/components/ui';
import { useDataStore } from '@/store/dataStore';
import { attempt, notify } from '@/store/uiStore';
import { IMAGES } from '@/mocks';
import { uploadImage } from '@/services/uploadService';
import type { Pizza } from '@/types';
import { useLocale, useMessages } from '@/i18n/client';
import { translateValidation, vm } from '@/i18n/validation';
import { centsToUnits, unitsToCents } from '@/lib/format';

const productSchema = z
  .object({
    name: z.string().min(3, vm('minChars', 3)),
    nameEn: z.string().max(80, vm('maxChars', 80)),
    description: z.string().min(10, vm('minChars', 10)).max(160, vm('maxChars', 160)),
    descriptionEn: z.string().max(160, vm('maxChars', 160)),
    longDescription: z.string().max(600, vm('maxChars', 600)),
    longDescriptionEn: z.string().max(600, vm('maxChars', 600)),
    categoryId: z.string().min(1, vm('chooseCategory')),
    /** Dollars in the form, cents in the API. */
    price: z.number({ invalid_type_error: vm('priceRequired') }).min(1, vm('priceMin', 100)).max(100, vm('priceMax', 10_000)),
    oldPrice: z.number().optional().nullable(),
    image: z.string().min(1, vm('required')),
    ingredients: z.array(z.string()).min(1, vm('atLeastOneIngredient')),
    prepMinutes: z.number().int().min(5).max(60),
    calories: z.number().int().min(100).max(3000),
    isPopular: z.boolean(),
    isNew: z.boolean(),
    isVegetarian: z.boolean(),
    isSpicy: z.boolean(),
    active: z.boolean(),
  })
  .refine((v) => !v.oldPrice || v.oldPrice > v.price, { path: ['oldPrice'], message: vm('oldPriceHigher') });

type ProductValues = z.infer<typeof productSchema>;

const toNumber = (v: string) => (v === '' ? NaN : Number(v));
const toOptionalNumber = (v: string) => (v === '' ? null : Number(v));

const FLAGS = ['active', 'isPopular', 'isNew', 'isVegetarian', 'isSpicy'] as const;

export function ProductDialog({ open, product, onClose }: { open: boolean; product: Pizza | null; onClose: () => void }) {
  const categories = useDataStore((s) => s.categories);
  const pizzas = useDataStore((s) => s.pizzas);
  const upsertPizza = useDataStore((s) => s.upsertPizza);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const t = useMessages('admin');
  const locale = useLocale();
  // Toppings are stored under their French name.
  const ingredientOptions = React.useMemo(() => Array.from(new Set(pizzas.flatMap((p) => p.ingredientsFr))).sort(), [pizzas]);

  const defaults = React.useCallback(
    (): ProductValues =>
      product
        ? {
            ...product,
            name: product.translations.fr.name,
            nameEn: product.translations.en.name,
            description: product.translations.fr.description,
            descriptionEn: product.translations.en.description,
            longDescription: product.translations.fr.longDescription,
            longDescriptionEn: product.translations.en.longDescription,
            ingredients: product.ingredientsFr,
            price: centsToUnits(product.price),
            oldPrice: product.oldPrice ? centsToUnits(product.oldPrice) : null,
            isPopular: Boolean(product.isPopular),
            isNew: Boolean(product.isNew),
            isVegetarian: Boolean(product.isVegetarian),
            isSpicy: Boolean(product.isSpicy),
          }
        : {
            name: '',
            nameEn: '',
            description: '',
            descriptionEn: '',
            longDescription: '',
            longDescriptionEn: '',
            categoryId: categories[0]?.id ?? '',
            price: 13,
            oldPrice: null,
            image: IMAGES.pizzas[0],
            ingredients: ['Sauce tomate', 'Mozzarella'],
            prepMinutes: 12,
            calories: 850,
            isPopular: false,
            isNew: true,
            isVegetarian: false,
            isSpicy: false,
            active: true,
          },
    [product, categories],
  );

  const { control, handleSubmit, reset, setValue, formState } = useForm<ProductValues>({ resolver: zodResolver(productSchema), defaultValues: defaults() });
  const image = useWatch({ control, name: 'image' });

  React.useEffect(() => {
    if (open) reset(defaults());
  }, [open, reset, defaults]);

  const [uploading, setUploading] = React.useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 3 * 1024 * 1024) return notify(t.imageMax(3), 'error');
    setUploading(true);
    try {
      const url = await uploadImage(file, 'products');
      setValue('image', url, { shouldValidate: true, shouldDirty: true });
    } catch (err) {
      notify(err instanceof Error ? err.message : t.uploadFailed, 'error');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    const saved = await attempt(
      upsertPizza({
        ...(product ?? { rating: 0, reviewCount: 0, createdAt: new Date().toISOString(), slug: '' }),
        ...values,
        price: unitsToCents(values.price),
        oldPrice: values.oldPrice ? unitsToCents(values.oldPrice) : undefined,
        ingredientsFr: values.ingredients,
        translations: {
          fr: { name: values.name, description: values.description, longDescription: values.longDescription || values.description },
          en: { name: values.nameEn, description: values.descriptionEn, longDescription: values.longDescriptionEn || values.descriptionEn },
        },
        id: product?.id ?? 'new',
      } as Pizza),
      product ? t.pizzaUpdated(values.name) : t.pizzaAdded(values.name),
    );
    if (saved) onClose();
  });

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      title={product ? t.editPizza : t.newPizza}
      subtitle={t.liveChanges}
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
      <Box component="form" onSubmit={onSubmit} noValidate className="grid gap-6 pt-2 md:grid-cols-[240px_1fr]">
        <Box>
          <Box className="relative aspect-square overflow-hidden rounded-2xl bg-cream-200">{image && <PizzaImage src={image} alt={t.preview} fill sizes="240px" className="object-cover" />}</Box>
          <LoadingButton fullWidth variant="outlined" startIcon={<CloudUploadRounded />} className="mt-3" loading={uploading} onClick={() => fileRef.current?.click()}>
            {t.importImage}
          </LoadingButton>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
          <FormTextField control={control} name="image" label={t.imageUrlOr} size="small" className="mt-3" />
        </Box>
        <Box className="grid gap-4 sm:grid-cols-2">
          <FormTextField control={control} name="name" label={t.name} required />
          <FormTextField control={control} name="nameEn" label={t.nameEn} helperText={t.englishHint} />
          <FormTextField control={control} name="categoryId" label={t.category} select required>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </FormTextField>
          <FormTextField control={control} name="price" label={t.priceMedium} type="number" required transform={toNumber} inputProps={{ step: 0.01, min: 0 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
          <FormTextField control={control} name="oldPrice" label={t.oldPrice} type="number" transform={toOptionalNumber} inputProps={{ step: 0.01, min: 0 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
          <Box className="grid grid-cols-2 gap-4">
            <FormTextField control={control} name="prepMinutes" label={t.prepMinutes} type="number" transform={toNumber} />
            <FormTextField control={control} name="calories" label={t.calories} type="number" transform={toNumber} />
          </Box>
          <FormTextField control={control} name="description" label={t.shortDescription} required multiline minRows={2} />
          <FormTextField control={control} name="descriptionEn" label={t.shortDescriptionEn} multiline minRows={2} />
          <FormTextField control={control} name="longDescription" label={t.longDescription} multiline minRows={3} />
          <FormTextField control={control} name="longDescriptionEn" label={t.longDescriptionEn} multiline minRows={3} />
          <Controller
            control={control}
            name="ingredients"
            render={({ field, fieldState }) => (
              <Autocomplete
                multiple
                freeSolo
                options={ingredientOptions}
                value={field.value}
                onChange={(_, v) => field.onChange(v)}
                className="sm:col-span-2"
                renderTags={(value, getTagProps) => value.map((option, index) => <Chip {...getTagProps({ index })} key={option} label={option} size="small" />)}
                renderInput={(params) => <TextField {...params} label={t.ingredients} placeholder={t.toppingsInputHint} error={Boolean(fieldState.error)} helperText={fieldState.error ? translateValidation(fieldState.error.message, locale) : undefined} />}
              />
            )}
          />
          <Box className="sm:col-span-2">
            <Typography fontWeight={700} className="mb-1">
              {t.options}
            </Typography>
            <Box className="flex flex-wrap gap-x-4">
              {FLAGS.map((name) => (
                <Controller key={name} control={control} name={name} render={({ field }) => <FormControlLabel control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />} label={t.flags[name]} />} />
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </AppDialog>
  );
}
