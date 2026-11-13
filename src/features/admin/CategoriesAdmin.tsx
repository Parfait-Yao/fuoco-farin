'use client';

import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, Card, Chip, FormControlLabel, IconButton, Switch, Tooltip, Typography } from '@mui/material';
import CloudUploadRounded from '@mui/icons-material/CloudUploadRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded';
import CategoryRounded from '@mui/icons-material/CategoryRounded';
import { AnimatePresence, motion } from 'framer-motion';
import { AppDialog, ConfirmDialog, EmptyState, FormTextField, ListSkeleton, LoadingButton, PageHeader, PizzaImage, useConfirm } from '@/components/ui';
import { useDataStore } from '@/store/dataStore';
import { attempt, notify } from '@/store/uiStore';
import { uploadImage } from '@/services/uploadService';
import { useDataLoading } from '@/hooks';
import { IMAGES } from '@/mocks';
import type { Category } from '@/types';
import { useMessages } from '@/i18n/client';
import { vm } from '@/i18n/validation';

const schema = z.object({
  name: z.string().min(2, vm('minChars', 2)).max(40, vm('maxChars', 40)),
  nameEn: z.string().max(40, vm('maxChars', 40)),
  description: z.string().min(5, vm('minChars', 5)).max(120, vm('maxChars', 120)),
  descriptionEn: z.string().max(120, vm('maxChars', 120)),
  image: z.string().min(1, vm('required')),
  active: z.boolean(),
});
const EMPTY = { name: '', nameEn: '', description: '', descriptionEn: '', image: IMAGES.pizzas[0], active: true };
type Values = z.infer<typeof schema>;

function CategoryDialog({ open, category, onClose }: { open: boolean; category: Category | null; onClose: () => void }) {
  const categories = useDataStore((s) => s.categories);
  const upsert = useDataStore((s) => s.upsertCategory);
  const { control, handleSubmit, reset, formState, setError, setValue } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const t = useMessages('admin');
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return notify(t.imageMax(5), 'error');
    setUploading(true);
    const url = await attempt(uploadImage(file, 'categories'), t.imageImported);
    setUploading(false);
    if (url) setValue('image', url, { shouldValidate: true, shouldDirty: true });
  };

  React.useEffect(() => {
    if (open)
      reset(
        category
          ? { name: category.translations.fr.name, nameEn: category.translations.en.name, description: category.translations.fr.description, descriptionEn: category.translations.en.description, image: category.image, active: category.active }
          : EMPTY,
      );
  }, [open, category, reset]);

  const onSubmit = handleSubmit(async (v) => {
    if (categories.some((c) => c.translations.fr.name.toLowerCase() === v.name.toLowerCase() && c.id !== category?.id)) {
      setError('name', { message: t.categoryExists });
      return;
    }
    const translations = { fr: { name: v.name, description: v.description }, en: { name: v.nameEn, description: v.descriptionEn } };
    const saved = await attempt(upsert({ ...(category ?? { id: 'new', order: categories.length + 1, slug: '' }), ...v, translations } as Category), category ? t.categoryEdited : t.categoryCreated);
    if (saved) onClose();
  });

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={category ? t.editCategory : t.newCategory}
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
      <Box component="form" onSubmit={onSubmit} noValidate className="space-y-4 pt-2">
        <FormTextField control={control} name="name" label={t.name} required />
        <FormTextField control={control} name="nameEn" label={t.nameEn} helperText={t.englishHint} />
        <FormTextField control={control} name="description" label={t.description} multiline minRows={2} required />
        <FormTextField control={control} name="descriptionEn" label={t.descriptionEn} multiline minRows={2} />
        <Box className="flex items-start gap-2">
          <FormTextField control={control} name="image" label={t.imageUrl} required className="flex-1" />
          <LoadingButton variant="outlined" loading={uploading} startIcon={<CloudUploadRounded />} onClick={() => fileRef.current?.click()} className="mt-2 shrink-0">
            {t.import}
          </LoadingButton>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={onFile} />
        </Box>
        <Controller control={control} name="active" render={({ field }) => <FormControlLabel control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />} label={t.visibleOnSite} />} />
      </Box>
    </AppDialog>
  );
}

export function CategoriesAdmin() {
  const categories = useDataStore((s) => s.categories);
  const pizzas = useDataStore((s) => s.pizzas);
  const move = useDataStore((s) => s.moveCategory);
  const upsert = useDataStore((s) => s.upsertCategory);
  const remove = useDataStore((s) => s.deleteCategory);
  const loading = useDataLoading();
  const [dialog, setDialog] = React.useState<{ open: boolean; category: Category | null }>({ open: false, category: null });
  const confirm = useConfirm<Category>();
  const sorted = React.useMemo(() => [...categories].sort((a, b) => a.order - b.order), [categories]);
  const countOf = (id: string) => pizzas.filter((p) => p.categoryId === id).length;
  const t = useMessages('admin');

  return (
    <Box>
      <PageHeader
        title={t.categories}
        description={t.categoriesHint}
        breadcrumbs={[{ label: t.catalog, href: '/admin/products' }, { label: t.categories }]}
        actions={
          <Button variant="contained" startIcon={<AddRounded />} onClick={() => setDialog({ open: true, category: null })}>
            {t.newCategory}
          </Button>
        }
      />
      {loading ? (
        <ListSkeleton rows={5} />
      ) : sorted.length === 0 ? (
        <EmptyState icon={<CategoryRounded />} title={t.noCategory} action={{ label: t.create, onClick: () => setDialog({ open: true, category: null }) }} />
      ) : (
        <Box component="ol" className="m-0 list-none space-y-3 p-0" aria-label={t.categoriesOrderAria}>
          <AnimatePresence initial={false}>
            {sorted.map((c, i) => (
              <motion.li key={c.id} layout transition={{ type: 'spring', stiffness: 400, damping: 34 }}>
                <Card className="flex flex-wrap items-center gap-4 p-3 pr-4 sm:flex-nowrap">
                  <Typography fontWeight={800} color="text.secondary" className="w-6 text-center">
                    {i + 1}
                  </Typography>
                  <Box className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                    <PizzaImage src={c.image} alt="" fill sizes="56px" className="object-cover" />
                  </Box>
                  <Box className="min-w-0 flex-1">
                    <Box className="flex items-center gap-2">
                      <Typography fontWeight={800}>{c.name}</Typography>
                      <Chip size="small" label={t.pizzasCount(countOf(c.id))} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" className="truncate">
                      {c.description}
                    </Typography>
                  </Box>
                  <Box className="ml-auto flex items-center">
                    <Tooltip title={c.active ? t.hide : t.show}>
                      <Switch
                        checked={c.active}
                        onChange={() => void attempt(upsert({ ...c, active: !c.active }), c.active ? t.hiddenFem(c.name) : t.visibleFem(c.name), 'info')}
                        inputProps={{ 'aria-label': t.visibilityOf(c.name) }}
                      />
                    </Tooltip>
                    <Tooltip title={t.moveUp}>
                      <span>
                        <IconButton aria-label={t.moveUpOf(c.name)} disabled={i === 0} onClick={() => void attempt(move(c.id, -1))}>
                          <ArrowUpwardRounded fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={t.moveDown}>
                      <span>
                        <IconButton aria-label={t.moveDownOf(c.name)} disabled={i === sorted.length - 1} onClick={() => void attempt(move(c.id, 1))}>
                          <ArrowDownwardRounded fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={t.edit}>
                      <IconButton aria-label={t.editOf(c.name)} onClick={() => setDialog({ open: true, category: c })}>
                        <EditRounded fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t.delete}>
                      <IconButton aria-label={t.deleteOf(c.name)} onClick={() => confirm.ask(c)}>
                        <DeleteOutlineRounded fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Card>
              </motion.li>
            ))}
          </AnimatePresence>
        </Box>
      )}
      <CategoryDialog open={dialog.open} category={dialog.category} onClose={() => setDialog({ open: false, category: null })} />
      <ConfirmDialog
        open={confirm.open}
        danger
        title={t.deleteCategoryTitle}
        message={confirm.target && countOf(confirm.target.id) > 0 ? t.categoryNotEmpty(countOf(confirm.target.id)) : t.definitive}
        confirmLabel={t.delete}
        onClose={confirm.close}
        onConfirm={() => {
          if (!confirm.target) return;
          if (countOf(confirm.target.id) > 0) {
            notify(t.cannotDeleteCategory, 'error');
          } else {
            void attempt(remove(confirm.target.id), t.categoryDeleted, 'info');
          }
          confirm.close();
        }}
      />
    </Box>
  );
}
