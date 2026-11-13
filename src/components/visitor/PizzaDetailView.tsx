'use client';

import * as React from 'react';
import Link from 'next/link';
import { Alert, Box, Breadcrumbs, Button, Card, Checkbox, Chip, Divider, FormControlLabel, Link as MuiLink, Rating, Skeleton, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import ShoppingBagRounded from '@mui/icons-material/ShoppingBagRounded';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';
import LocalFireDepartmentOutlined from '@mui/icons-material/LocalFireDepartmentOutlined';
import TuneRounded from '@mui/icons-material/TuneRounded';
import SearchOffRounded from '@mui/icons-material/SearchOffRounded';
import { AnimatePresence, motion } from 'framer-motion';
import { EmptyState, PizzaImage, QuantityStepper, Reveal, SectionHeading, Stagger, StaggerItem } from '@/components/ui';
import { FavoriteButton, PizzaBadges, PizzaCard } from './PizzaCard';
import { useDataStore } from '@/store/dataStore';
import { useCartStore } from '@/store/cartStore';
import { notify } from '@/store/uiStore';
import { useHydrated } from '@/hooks';
import { sizePrice } from '@/lib/pricing';
import { PIZZA_SIZES, ROUTES } from '@/constants';
import { useFormat, useMessages } from '@/i18n/client';
import type { PizzaSize } from '@/types';

export function PizzaDetailView({ slug }: { slug: string }) {
  const hydrated = useHydrated();
  const pizzas = useDataStore((s) => s.pizzas);
  const categories = useDataStore((s) => s.categories);
  const allReviews = useDataStore((s) => s.reviews);
  const addItem = useCartStore((s) => s.addItem);
  const setDrawerOpen = useCartStore((s) => s.setDrawerOpen);
  const pizza = pizzas.find((p) => p.slug === slug && p.active);
  const t = useMessages('catalog');
  const sizes = useMessages('domain').sizes;
  const fmt = useFormat();
  const common = useMessages('common');

  const [size, setSize] = React.useState<PizzaSize>('medium');
  const [quantity, setQuantity] = React.useState(1);
  const [removed, setRemoved] = React.useState<string[]>([]);
  const [note, setNote] = React.useState('');

  const similar = React.useMemo(
    () => (pizza ? pizzas.filter((p) => p.active && p.id !== pizza.id && (p.categoryId === pizza.categoryId || p.isPopular)).slice(0, 3) : []),
    [pizzas, pizza],
  );
  const reviews = React.useMemo(() => allReviews.filter((r) => r.published && r.pizzaId === pizza?.id), [allReviews, pizza]);

  if (!pizza) {
    if (!hydrated) {
      return (
        <Box className="container-page grid gap-10 py-10 lg:grid-cols-2">
          <Skeleton variant="rounded" className="aspect-square h-auto rounded-4xl" />
          <Box>
            <Skeleton height={60} width="70%" />
            <Skeleton height={30} />
            <Skeleton height={30} width="80%" />
          </Box>
        </Box>
      );
    }
    return (
      <Box className="container-page py-10">
        <EmptyState icon={<SearchOffRounded />} title={t.notFound} description={t.notFoundHint} action={{ label: t.backToMenu, href: ROUTES.menu }} />
      </Box>
    );
  }

  const category = categories.find((c) => c.id === pizza.categoryId);
  const unitPrice = sizePrice(pizza.price, size);
  const toggleIngredient = (name: string) => setRemoved((list) => (list.includes(name) ? list.filter((n) => n !== name) : [...list, name]));

  const add = () => {
    addItem({ pizzaId: pizza.id, name: pizza.name, image: pizza.image, size, quantity, unitPrice, removedIngredients: removed.length ? removed : undefined, note: note.trim() || undefined });
    notify(t.addedMany(quantity, pizza.name));
    setDrawerOpen(true);
    setQuantity(1);
  };

  return (
    <Box className="container-page py-6 md:py-10">
      <Breadcrumbs aria-label={common.breadcrumb} className="mb-6 text-sm">
        <MuiLink component={Link} href={ROUTES.home} color="inherit">
          {t.home}
        </MuiLink>
        <MuiLink component={Link} href={ROUTES.menu} color="inherit">
          {t.menu}
        </MuiLink>
        <Typography color="text.primary" fontSize="inherit">
          {pizza.name}
        </Typography>
      </Breadcrumbs>

      <Box className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="relative">
          <Box className="relative aspect-square overflow-hidden rounded-4xl shadow-warm lg:sticky lg:top-24">
            <PizzaImage src={pizza.image} alt={pizza.name} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
            <Box className="absolute left-4 top-4 flex flex-wrap gap-1.5">
              <PizzaBadges pizza={pizza} />
            </Box>
            <FavoriteButton pizza={pizza} className="absolute right-4 top-4 bg-white/90 hover:bg-white" />
          </Box>
        </motion.div>

        <Box>
          <Typography variant="overline" color="secondary.dark">
            {category?.name}
          </Typography>
          <Typography variant="h2" component="h1">
            {pizza.name}
          </Typography>
          <Box className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <Box className="flex items-center gap-1">
              <Rating value={pizza.rating} precision={0.1} readOnly size="small" />
              <strong>{pizza.rating.toFixed(1)}</strong>
              <Typography variant="body2" color="text.secondary">
                {t.reviewsCount(pizza.reviewCount)}
              </Typography>
            </Box>
            <Box className="flex items-center gap-1 text-charcoal-500">
              <ScheduleRounded fontSize="small" /> {pizza.prepMinutes} min
            </Box>
            <Box className="flex items-center gap-1 text-charcoal-500">
              <LocalFireDepartmentOutlined fontSize="small" /> {pizza.calories} kcal
            </Box>
          </Box>
          <Typography color="text.secondary" className="mt-5 text-lg">
            {pizza.longDescription}
          </Typography>

          <Card className="mt-8 p-5 md:p-6">
            <Typography fontWeight={800} className="mb-2">
              {t.size}
            </Typography>
            <ToggleButtonGroup exclusive fullWidth color="primary" value={size} onChange={(_, v: PizzaSize | null) => v && setSize(v)} aria-label={t.size}>
              {PIZZA_SIZES.map((s) => (
                <ToggleButton key={s} value={s} className="flex-col rounded-2xl py-2 normal-case">
                  <span className="font-bold">{sizes[s].label}</span>
                  <span className="text-xs opacity-70">
                    {sizes[s].diameter} · {fmt.price(sizePrice(pizza.price, s))}
                  </span>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <Divider className="my-5" />
            <Typography fontWeight={800}>{t.ingredients}</Typography>
            <Typography variant="body2" color="text.secondary" className="mb-2">
              {t.uncheck}
            </Typography>
            <Box className="grid grid-cols-1 min-[420px]:grid-cols-2">
              {pizza.ingredients.map((name) => (
                <FormControlLabel key={name} control={<Checkbox checked={!removed.includes(name)} onChange={() => toggleIngredient(name)} />} label={name} />
              ))}
            </Box>
            <AnimatePresence>
              {removed.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Alert severity="info" className="mt-2">
                    {t.without(removed.join(', '))}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>
            <TextField label={t.noteLabel} placeholder={t.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} inputProps={{ maxLength: 120 }} className="mt-4" />

            <Box className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <QuantityStepper value={quantity} onChange={setQuantity} />
              <Box className="text-right">
                {pizza.oldPrice && size === 'medium' && (
                  <Typography variant="body2" color="text.secondary" className="line-through">
                    {fmt.price(pizza.oldPrice * quantity)}
                  </Typography>
                )}
                <Typography variant="h4" component="p" color="primary">
                  {fmt.price(unitPrice * quantity)}
                </Typography>
              </Box>
            </Box>
            <motion.div whileTap={{ scale: 0.98 }} className="mt-5">
              <Button fullWidth size="large" variant="contained" startIcon={<ShoppingBagRounded />} onClick={add}>
                {t.addToCart}
              </Button>
            </motion.div>
            <Button fullWidth component={Link} href={ROUTES.builder} startIcon={<TuneRounded />} className="mt-2" color="inherit">
              {t.preferBuilder}
            </Button>
          </Card>

          {reviews.length > 0 && (
            <Box className="mt-10">
              <Typography variant="h5" component="h2" className="mb-4">
                {t.customerReviews}
              </Typography>
              <Box className="space-y-3">
                {reviews.map((r) => (
                  <Card key={r.id} className="p-4">
                    <Box className="flex items-center justify-between">
                      <Typography fontWeight={800}>{r.customerName}</Typography>
                      <Rating value={r.rating} readOnly size="small" />
                    </Box>
                    <Typography color="text.secondary" className="mt-1">
                      {r.comment}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fmt.date(r.date)}
                    </Typography>
                  </Card>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {similar.length > 0 && (
        <Box component="section" className="mt-20">
          <Reveal>
            <SectionHeading eyebrow={t.alsoLike} title={t.similar} />
          </Reveal>
          <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((p) => (
              <StaggerItem key={p.id}>
                <PizzaCard pizza={p} />
              </StaggerItem>
            ))}
          </Stagger>
          <Box className="mt-6 flex flex-wrap gap-2">
            {pizza.ingredients.slice(0, 4).map((name) => (
              <Chip key={name} label={t.moreWith(name.toLowerCase())} component={Link} href={`${ROUTES.menu}?q=${encodeURIComponent(name)}`} clickable variant="outlined" />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
