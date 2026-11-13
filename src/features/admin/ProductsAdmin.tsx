'use client';

import * as React from 'react';
import Link from 'next/link';
import { Box, Button, Card, Chip, FormControl, IconButton, InputAdornment, InputLabel, MenuItem, Select, Switch, TextField, Tooltip, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import AddRounded from '@mui/icons-material/AddRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import LocalPizzaRounded from '@mui/icons-material/LocalPizzaRounded';
import { ConfirmDialog, EmptyState, PageHeader, PizzaImage, ResponsiveTable, useConfirm } from '@/components/ui';
import { useDataStore } from '@/store/dataStore';
import { attempt } from '@/store/uiStore';
import { useDebounced, useDataLoading } from '@/hooks';
import { useFormat, useMessages } from '@/i18n/client';
import { ROUTES } from '@/constants';
import type { Pizza } from '@/types';
import { ProductDialog } from './ProductDialog';

export function ProductsAdmin() {
  const pizzas = useDataStore((s) => s.pizzas);
  const categories = useDataStore((s) => s.categories);
  const setPizzaActive = useDataStore((s) => s.setPizzaActive);
  const deletePizza = useDataStore((s) => s.deletePizza);
  const loading = useDataLoading();
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState('all');
  const [state, setState] = React.useState<'all' | 'active' | 'inactive'>('all');
  const [dialog, setDialog] = React.useState<{ open: boolean; product: Pizza | null }>({ open: false, product: null });
  const confirm = useConfirm<Pizza>();
  const q = useDebounced(query).trim().toLowerCase();
  const t = useMessages('admin');
  const fmt = useFormat();

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? '—';
  const rows = React.useMemo(
    () =>
      pizzas.filter(
        (p) => (category === 'all' || p.categoryId === category) && (state === 'all' || (state === 'active' ? p.active : !p.active)) && (!q || p.name.toLowerCase().includes(q)),
      ),
    [pizzas, category, state, q],
  );

  const toggleActive = (p: Pizza) => {
    void attempt(setPizzaActive(p.id, !p.active), p.active ? t.hidden(p.name) : t.shown(p.name), 'info');
  };

  const actions = (p: Pizza) => (
    <Box className="flex" onClick={(e) => e.stopPropagation()}>
      <Tooltip title={t.viewOnSite}>
        <span>
          <IconButton component={Link} href={ROUTES.pizza(p.slug)} target="_blank" aria-label={t.viewOnSiteOf(p.name)} disabled={!p.active}>
            <OpenInNewRounded fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={t.edit}>
        <IconButton aria-label={t.editOf(p.name)} onClick={() => setDialog({ open: true, product: p })}>
          <EditRounded fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={t.delete}>
        <IconButton aria-label={t.deleteOf(p.name)} onClick={() => confirm.ask(p)}>
          <DeleteOutlineRounded fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const columns: GridColDef<Pizza>[] = [
    {
      field: 'name',
      headerName: t.colPizza,
      flex: 1,
      minWidth: 240,
      renderCell: ({ row }) => (
        <Box className="flex items-center gap-3">
          <Box className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl">
            <PizzaImage src={row.image} alt="" fill sizes="44px" className="object-cover" />
          </Box>
          <Box className="min-w-0">
            <Typography fontWeight={700} className="truncate">
              {row.name}
            </Typography>
            <Box className="flex gap-1">
              {row.isPopular && <Chip size="small" label={t.popular} color="secondary" className="h-5 text-[11px]" />}
              {row.oldPrice && <Chip size="small" label={t.promo} color="primary" className="h-5 text-[11px]" />}
            </Box>
          </Box>
        </Box>
      ),
    },
    { field: 'categoryId', headerName: t.colCategory, width: 150, valueGetter: (v: string) => categoryName(v) },
    { field: 'price', headerName: t.colPrice, width: 130, valueFormatter: (v: number) => fmt.price(v) },
    { field: 'rating', headerName: t.colRating, width: 90, valueFormatter: (v: number) => (v ? v.toFixed(1) : '—') },
    {
      field: 'active',
      headerName: t.active,
      width: 90,
      renderCell: ({ row }) => <Switch checked={row.active} onClick={(e) => e.stopPropagation()} onChange={() => toggleActive(row)} inputProps={{ 'aria-label': t.enableOf(row.name) }} />,
    },
    { field: 'actions', headerName: '', width: 140, sortable: false, renderCell: ({ row }) => actions(row) },
  ];

  return (
    <Box>
      <PageHeader
        title={t.catalog}
        description={t.productsHint(pizzas.length, pizzas.filter((p) => p.active).length)}
        actions={
          <>
            <Button component={Link} href={ROUTES.admin.categories} variant="outlined">
              {t.categories}
            </Button>
            <Button component={Link} href={ROUTES.admin.ingredients} variant="outlined">
              {t.ingredients}
            </Button>
            <Button variant="contained" startIcon={<AddRounded />} onClick={() => setDialog({ open: true, product: null })}>
              {t.addPizza}
            </Button>
          </>
        }
      />
      <Card className="mb-4 grid gap-3 p-4 md:grid-cols-[1fr_220px_180px]">
        <TextField size="small" placeholder={t.searchPizza} value={query} onChange={(e) => setQuery(e.target.value)} inputProps={{ 'aria-label': t.searchPizza }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> }} />
        <FormControl size="small">
          <InputLabel id="cat-filter">{t.category}</InputLabel>
          <Select labelId="cat-filter" label={t.category} value={category} onChange={(e) => setCategory(e.target.value)}>
            <MenuItem value="all">{t.allFem}</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel id="state-filter">{t.state}</InputLabel>
          <Select labelId="state-filter" label={t.state} value={state} onChange={(e) => setState(e.target.value as typeof state)}>
            <MenuItem value="all">{t.all}</MenuItem>
            <MenuItem value="active">{t.actives}</MenuItem>
            <MenuItem value="inactive">{t.inactives}</MenuItem>
          </Select>
        </FormControl>
      </Card>
      <ResponsiveTable
        ariaLabel={t.pizzasListAria}
        rows={rows}
        columns={columns}
        loading={loading}
        emptyState={<EmptyState icon={<LocalPizzaRounded />} title={t.noPizza} action={{ label: t.addPizza, onClick: () => setDialog({ open: true, product: null }) }} />}
        renderCard={(p) => (
          <Box className="flex gap-3">
            <Box className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
              <PizzaImage src={p.image} alt="" fill sizes="80px" className="object-cover" />
            </Box>
            <Box className="min-w-0 flex-1">
              <Typography fontWeight={800} className="truncate">
                {p.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {categoryName(p.categoryId)} · {fmt.price(p.price)}
              </Typography>
              <Box className="mt-1 flex items-center justify-between">
                <Switch size="small" checked={p.active} onChange={() => toggleActive(p)} inputProps={{ 'aria-label': t.enableOf(p.name) }} />
                {actions(p)}
              </Box>
            </Box>
          </Box>
        )}
      />
      <ProductDialog open={dialog.open} product={dialog.product} onClose={() => setDialog({ open: false, product: null })} />
      <ConfirmDialog
        open={confirm.open}
        danger
        title={t.deletePizzaTitle}
        message={confirm.target ? t.deletePizzaText(confirm.target.name) : ''}
        confirmLabel={t.delete}
        onClose={confirm.close}
        onConfirm={() => {
          if (confirm.target) void attempt(deletePizza(confirm.target.id), t.pizzaDeleted, 'info');
          confirm.close();
        }}
      />
    </Box>
  );
}
