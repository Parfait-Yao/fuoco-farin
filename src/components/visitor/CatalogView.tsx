'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge, Box, Button, Chip, Drawer, FormControl, FormControlLabel, IconButton, InputAdornment, InputLabel, MenuItem, Select, Slider, Switch, TextField, Typography } from '@mui/material';
import SearchRounded from '@mui/icons-material/SearchRounded';
import TuneRounded from '@mui/icons-material/TuneRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import SearchOffRounded from '@mui/icons-material/SearchOffRounded';
import { AnimatePresence, motion } from 'framer-motion';
import { CardGridSkeleton, EmptyState } from '@/components/ui';
import { PizzaCard } from './PizzaCard';
import { useDataStore } from '@/store/dataStore';
import { useDebounced, useDataLoading } from '@/hooks';
import { useFormat, useMessages } from '@/i18n/client';

type SortKey = 'popular' | 'price-asc' | 'price-desc' | 'rating' | 'new';

interface Filters {
  query: string;
  category: string;
  vegetarian: boolean;
  spicy: boolean;
  promo: boolean;
  price: [number, number];
  sort: SortKey;
}

/** Medium-size price range, in cents. */
const PRICE_BOUNDS: [number, number] = [0, 3000];
const DEFAULT_FILTERS: Filters = { query: '', category: 'all', vegetarian: false, spicy: false, promo: false, price: PRICE_BOUNDS, sort: 'popular' };

function FilterPanel({ filters, setFilters }: { filters: Filters; setFilters: React.Dispatch<React.SetStateAction<Filters>> }) {
  const toggle = (key: 'vegetarian' | 'spicy' | 'promo') => setFilters((f) => ({ ...f, [key]: !f[key] }));
  const t = useMessages('catalog');
  const fmt = useFormat();
  return (
    <Box className="space-y-6">
      <Box>
        <Typography fontWeight={800} className="mb-2">
          {t.preferences}
        </Typography>
        <FormControlLabel control={<Switch checked={filters.vegetarian} onChange={() => toggle('vegetarian')} />} label={t.vegetarian} className="block" />
        <FormControlLabel control={<Switch checked={filters.spicy} onChange={() => toggle('spicy')} />} label={t.spicy} className="block" />
        <FormControlLabel control={<Switch checked={filters.promo} onChange={() => toggle('promo')} />} label={t.onSale} className="block" />
      </Box>
      <Box>
        <Typography fontWeight={800} id="price-label">
          {t.priceMedium}
        </Typography>
        <Typography variant="body2" color="text.secondary" className="mb-2">
          {fmt.price(filters.price[0])} – {fmt.price(filters.price[1])}
        </Typography>
        <Slider
          aria-labelledby="price-label"
          value={filters.price}
          min={PRICE_BOUNDS[0]}
          max={PRICE_BOUNDS[1]}
          step={100}
          onChange={(_, v) => setFilters((f) => ({ ...f, price: v as [number, number] }))}
          getAriaValueText={(v) => fmt.price(v)}
          className="mx-2 w-[calc(100%-1rem)]"
        />
      </Box>
      <Button fullWidth variant="outlined" color="inherit" onClick={() => setFilters((f) => ({ ...DEFAULT_FILTERS, query: f.query }))}>
        {t.resetFilters}
      </Button>
    </Box>
  );
}

export function CatalogView() {
  const router = useRouter();
  const params = useSearchParams();
  const allPizzas = useDataStore((s) => s.pizzas);
  const allCategories = useDataStore((s) => s.categories);
  const pageSize = useDataStore((s) => s.settings.itemsPerPage);
  const loading = useDataLoading();
  const [filters, setFilters] = React.useState<Filters>(() => ({ ...DEFAULT_FILTERS, category: params.get('category') ?? 'all', query: params.get('q') ?? '' }));
  const [visible, setVisible] = React.useState(pageSize);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const query = useDebounced(filters.query);
  const t = useMessages('catalog');

  const categories = React.useMemo(() => allCategories.filter((c) => c.active).sort((a, b) => a.order - b.order), [allCategories]);

  // Keep category and search in the URL so results are shareable.
  React.useEffect(() => {
    const next = new URLSearchParams();
    if (filters.category !== 'all') next.set('category', filters.category);
    if (query) next.set('q', query);
    const qs = next.toString();
    router.replace(qs ? `/menu?${qs}` : '/menu', { scroll: false });
  }, [filters.category, query, router]);

  React.useEffect(() => setVisible(pageSize), [filters, query, pageSize]);

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = allPizzas.filter(
      (p) =>
        p.active &&
        (filters.category === 'all' || p.categoryId === filters.category) &&
        (!q || p.name.toLowerCase().includes(q) || p.ingredients.some((i) => i.toLowerCase().includes(q))) &&
        (!filters.vegetarian || p.isVegetarian) &&
        (!filters.spicy || p.isSpicy) &&
        (!filters.promo || p.oldPrice) &&
        p.price >= filters.price[0] &&
        p.price <= filters.price[1],
    );
    const sorters: Record<SortKey, (a: (typeof list)[0], b: (typeof list)[0]) => number> = {
      popular: (a, b) => Number(b.isPopular ?? 0) - Number(a.isPopular ?? 0) || b.reviewCount - a.reviewCount,
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating,
      new: (a, b) => b.createdAt.localeCompare(a.createdAt),
    };
    return list.sort(sorters[filters.sort]);
  }, [allPizzas, filters, query]);

  const activeFilterCount = [filters.vegetarian, filters.spicy, filters.promo, filters.price[0] > PRICE_BOUNDS[0] || filters.price[1] < PRICE_BOUNDS[1]].filter(Boolean).length;

  return (
    <Box className="container-page pb-10">
      {/* Toolbar */}
      <Box className="sticky top-[72px] z-10 -mx-4 mb-6 bg-cream-100/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Box className="flex flex-col gap-3 md:flex-row md:items-center">
          <TextField
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            placeholder={t.searchPlaceholder}
            inputProps={{ 'aria-label': t.searchAria }}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded />
                </InputAdornment>
              ),
              endAdornment: filters.query ? (
                <IconButton size="small" aria-label={t.clearSearch} onClick={() => setFilters((f) => ({ ...f, query: '' }))}>
                  <CloseRounded fontSize="small" />
                </IconButton>
              ) : undefined,
            }}
            className="md:max-w-sm"
          />
          <Box className="flex gap-2">
            <FormControl size="small" className="min-w-[190px] flex-1">
              <InputLabel id="sort-label">{t.sortBy}</InputLabel>
              <Select labelId="sort-label" label={t.sortBy} value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as SortKey }))} sx={{ borderRadius: 3, bgcolor: '#fff' }}>
                {(['popular', 'rating', 'price-asc', 'price-desc', 'new'] as const).map((key) => (
                  <MenuItem key={key} value={key}>
                    {t.sorts[key]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Badge badgeContent={activeFilterCount} color="primary">
              <Button variant="outlined" color="inherit" startIcon={<TuneRounded />} onClick={() => setDrawerOpen(true)} className="h-10 border-black/15 bg-white lg:hidden">
                {t.filters}
              </Button>
            </Badge>
          </Box>
        </Box>
        <Box className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1" role="tablist" aria-label={t.categories}>
          {[{ id: 'all', name: t.allCategories }, ...categories].map((c) => {
            const selected = filters.category === c.id;
            return (
              <Chip
                key={c.id}
                role="tab"
                aria-selected={selected}
                label={c.name}
                clickable
                color={selected ? 'primary' : 'default'}
                variant={selected ? 'filled' : 'outlined'}
                onClick={() => setFilters((f) => ({ ...f, category: c.id }))}
                className={selected ? '' : 'bg-white'}
              />
            );
          })}
        </Box>
      </Box>

      <Box className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Box component="aside" aria-label={t.filters} className="hidden lg:block">
          <Box className="sticky top-48">
            <FilterPanel filters={filters} setFilters={setFilters} />
          </Box>
        </Box>
        <Box className="min-w-0">
          <Typography color="text.secondary" className="mb-4" role="status" aria-live="polite">
            {loading ? t.loadingMenu : t.found(results.length)}
          </Typography>
          {loading ? (
            <CardGridSkeleton count={6} />
          ) : results.length === 0 ? (
            <EmptyState icon={<SearchOffRounded />} title={t.noMatch} description={t.noMatchHint} action={{ label: t.reset, onClick: () => setFilters(DEFAULT_FILTERS) }} />
          ) : (
            <>
              <motion.div layout className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {results.slice(0, visible).map((pizza, i) => (
                    <motion.div key={pizza.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }}>
                      <PizzaCard pizza={pizza} priority={i < 3} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
              {visible < results.length && (
                <Box className="mt-10 text-center">
                  <Button variant="outlined" size="large" onClick={() => setVisible((v) => v + pageSize)}>
                    {t.showMore(results.length - visible)}
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>

      <Drawer anchor="bottom" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ className: 'rounded-t-3xl p-5 max-h-[85vh]' }}>
        <Box className="mb-4 flex items-center justify-between">
          <Typography variant="h6" component="h2">
            {t.filters}
          </Typography>
          <IconButton aria-label={t.closeFilters} onClick={() => setDrawerOpen(false)}>
            <CloseRounded />
          </IconButton>
        </Box>
        <FilterPanel filters={filters} setFilters={setFilters} />
        <Button fullWidth variant="contained" size="large" className="mt-4" onClick={() => setDrawerOpen(false)}>
          {t.seeResults(results.length)}
        </Button>
      </Drawer>
    </Box>
  );
}
