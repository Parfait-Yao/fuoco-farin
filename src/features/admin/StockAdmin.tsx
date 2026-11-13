'use client';

import * as React from 'react';
import { Box, Button, Card, Chip, IconButton, InputAdornment, LinearProgress, Tab, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import AddCircleOutlineRounded from '@mui/icons-material/AddCircleOutlineRounded';
import RemoveCircleOutlineRounded from '@mui/icons-material/RemoveCircleOutlineRounded';
import TuneRounded from '@mui/icons-material/TuneRounded';
import HistoryRounded from '@mui/icons-material/HistoryRounded';
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import SwapVertRounded from '@mui/icons-material/SwapVertRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import { AnimatePresence, motion } from 'framer-motion';
import { AppDialog, EmptyState, LoadingButton, PageHeader, ResponsiveTable, StatCard } from '@/components/ui';
import { useDataStore } from '@/store/dataStore';
import { attempt } from '@/store/uiStore';
import { useDataLoading } from '@/hooks';
import { INGREDIENT_TYPE_KEYS } from '@/constants';
import { useFormat, useMessages } from '@/i18n/client';
import type { Ingredient, IngredientType } from '@/types';

type StockState = 'ok' | 'low' | 'out';
const stateOf = (i: Ingredient): StockState => (i.stock <= 0 ? 'out' : i.stock <= i.threshold ? 'low' : 'ok');
const STATE_META: Record<StockState, { label: 'inStock' | 'lowStock' | 'outOfStock'; color: 'success' | 'warning' | 'error'; icon: React.ReactElement }> = {
  ok: { label: 'inStock', color: 'success', icon: <CheckCircleRounded /> },
  low: { label: 'lowStock', color: 'warning', icon: <WarningAmberRounded /> },
  out: { label: 'outOfStock', color: 'error', icon: <ErrorOutlineRounded /> },
};

type DialogMode = { kind: 'in' | 'out' | 'threshold'; ingredient: Ingredient } | null;

function StockDialog({ mode, onClose }: { mode: DialogMode; onClose: () => void }) {
  const moveStock = useDataStore((s) => s.moveStock);
  const setThreshold = useDataStore((s) => s.setThreshold);
  const [value, setValue] = React.useState('');
  const [note, setNote] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const t = useMessages('admin');
  const units = useMessages('domain').units;

  React.useEffect(() => {
    if (mode) {
      setValue(mode.kind === 'threshold' ? String(mode.ingredient.threshold) : '');
      setNote('');
    }
  }, [mode]);

  if (!mode) return null;
  const { ingredient, kind } = mode;
  const qty = Number(value);
  const unit = units[ingredient.unit];
  const error =
    value === '' ? null : Number.isNaN(qty) || qty < 0 ? t.positiveNumber : kind !== 'threshold' && qty === 0 ? t.quantityAboveZero : kind === 'out' && qty > ingredient.stock ? t.maximum(`${ingredient.stock} ${unit}`) : null;
  const title = kind === 'in' ? t.addStock : kind === 'out' ? t.removeStock : t.editThreshold;

  const submit = async () => {
    if (error || value === '') return;
    setLoading(true);
    const done = await attempt(
      kind === 'threshold' ? setThreshold(ingredient.id, qty) : moveStock(ingredient.id, kind, qty, note.trim() || (kind === 'in' ? t.restock : t.manualOut)),
      kind === 'threshold' ? t.thresholdUpdated : `${ingredient.name}: ${kind === 'in' ? '+' : '-'}${qty} ${unit}`,
    );
    setLoading(false);
    if (done !== undefined) onClose();
  };

  return (
    <AppDialog
      open
      onClose={onClose}
      title={title}
      subtitle={t.currentStock(ingredient.name, `${ingredient.stock} ${unit}`)}
      maxWidth="xs"
      actions={
        <>
          <Button onClick={onClose} color="inherit">
            {t.cancel}
          </Button>
          <LoadingButton variant="contained" loading={loading} onClick={submit} disabled={Boolean(error) || value === ''}>
            {t.validate}
          </LoadingButton>
        </>
      }
    >
      <Box
        component="form"
        className="space-y-4 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <TextField
          autoFocus
          type="number"
          label={kind === 'threshold' ? t.newThreshold : t.quantityLabel}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={Boolean(error)}
          helperText={error ?? (kind !== 'threshold' && value ? t.newStock(`${Math.max(0, ingredient.stock + (kind === 'in' ? qty : -qty))} ${unit}`) : ' ')}
          InputProps={{ endAdornment: <InputAdornment position="end">{unit}</InputAdornment>, inputProps: { min: 0, step: 'any' } }}
        />
        {kind !== 'threshold' && <TextField label={t.reasonOptional} value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === 'in' ? t.reasonInPlaceholder : t.reasonOutPlaceholder} />}
      </Box>
    </AppDialog>
  );
}

export function StockAdmin() {
  const ingredients = useDataStore((s) => s.ingredients);
  const movements = useDataStore((s) => s.stockMovements);
  const loading = useDataLoading();
  const [type, setType] = React.useState<IngredientType | 'alerts'>('base');
  const [dialog, setDialog] = React.useState<DialogMode>(null);
  const [historyFor, setHistoryFor] = React.useState<string | null>(null);
  const t = useMessages('admin');
  const domain = useMessages('domain');
  const fmt = useFormat();

  const real = React.useMemo(() => ingredients.filter((i) => i.id !== 'cheese-none'), [ingredients]);
  const rows = React.useMemo(() => (type === 'alerts' ? real.filter((i) => stateOf(i) !== 'ok') : real.filter((i) => i.type === type)), [real, type]);
  const lowCount = real.filter((i) => stateOf(i) === 'low').length;
  const outCount = real.filter((i) => stateOf(i) === 'out').length;
  const today = new Date().toDateString();
  const todayMoves = movements.filter((m) => new Date(m.date).toDateString() === today).length;
  const history = React.useMemo(() => (historyFor ? movements.filter((m) => m.ingredientId === historyFor) : movements).slice(0, 30), [movements, historyFor]);
  const nameOf = (id: string) => ingredients.find((i) => i.id === id)?.name ?? t.deletedIngredient;

  const actions = (i: Ingredient) => (
    <Box className="flex">
      <Tooltip title={t.addStock}>
        <IconButton aria-label={t.addStockOf(i.name)} color="success" onClick={() => setDialog({ kind: 'in', ingredient: i })}>
          <AddCircleOutlineRounded fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={t.removeStock}>
        <span>
          <IconButton aria-label={t.removeStockOf(i.name)} disabled={i.stock <= 0} onClick={() => setDialog({ kind: 'out', ingredient: i })}>
            <RemoveCircleOutlineRounded fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={t.editThresholdShort}>
        <IconButton aria-label={t.editThresholdOf(i.name)} onClick={() => setDialog({ kind: 'threshold', ingredient: i })}>
          <TuneRounded fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={t.history}>
        <IconButton aria-label={t.historyOf(i.name)} onClick={() => setHistoryFor(i.id)}>
          <HistoryRounded fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const level = (i: Ingredient) => {
    const s = stateOf(i);
    const max = Math.max(i.threshold * 3, i.stock, 1);
    return (
      <Box className="w-full">
        <Box className="flex justify-between text-sm">
          <strong>
            {i.stock} {domain.units[i.unit]}
          </strong>
          <span className="text-charcoal-500">{t.thresholdShort(i.threshold)}</span>
        </Box>
        <LinearProgress variant="determinate" value={(i.stock / max) * 100} color={STATE_META[s].color} className="mt-1 h-1.5 rounded-full" />
      </Box>
    );
  };

  const columns: GridColDef<Ingredient>[] = [
    { field: 'name', headerName: t.colIngredient, flex: 1, minWidth: 180, renderCell: ({ row }) => <Typography fontWeight={700}>{row.name}</Typography> },
    { field: 'type', headerName: t.type, width: 110, valueFormatter: (v: IngredientType) => domain.ingredientTypes[v] },
    { field: 'stock', headerName: t.availableQuantity, width: 220, renderCell: ({ row }) => level(row) },
    { field: 'unit', headerName: t.unit, width: 80, valueFormatter: (v: Ingredient['unit']) => domain.units[v] },
    {
      field: 'state',
      headerName: t.state,
      width: 150,
      valueGetter: (_v, row) => stateOf(row),
      renderCell: ({ row }) => {
        const m = STATE_META[stateOf(row)];
        return <Chip size="small" icon={m.icon} color={m.color} label={t[m.label]} variant={stateOf(row) === 'ok' ? 'outlined' : 'filled'} />;
      },
    },
    { field: 'actions', headerName: '', width: 190, sortable: false, renderCell: ({ row }) => actions(row) },
  ];

  return (
    <Box>
      <PageHeader title={t.stockTitle} description={t.stockHint} />
      <Box className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t.trackedItems} value={real.length} icon={<Inventory2Rounded />} tone="charcoal" loading={loading} />
        <StatCard label={t.lowStock} value={lowCount} icon={<WarningAmberRounded />} tone="ember" loading={loading} />
        <StatCard label={t.outages} value={outCount} icon={<ErrorOutlineRounded />} tone="tomato" loading={loading} />
        <StatCard label={t.todayMoves} value={todayMoves} icon={<SwapVertRounded />} tone="basil" loading={loading} />
      </Box>

      <AnimatePresence>
        {lowCount + outCount > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="mb-4 flex flex-wrap items-center gap-3 border-tomato-200 bg-tomato-50 p-4" role="alert">
              <WarningAmberRounded className="text-tomato-500" />
              <Typography className="flex-1" fontWeight={600}>
                {t.belowThreshold(lowCount + outCount)}
              </Typography>
              <Button size="small" variant="contained" onClick={() => setType('alerts')}>
                {t.seeAlerts}
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Tabs value={type} onChange={(_, v) => setType(v)} variant="scrollable" allowScrollButtonsMobile className="mb-4" aria-label={t.stockCategoryAria}>
        {INGREDIENT_TYPE_KEYS.map((key) => (
          <Tab key={key} value={key} label={domain.ingredientTypes[key]} />
        ))}
        <Tab value="alerts" label={t.alerts(lowCount + outCount)} />
      </Tabs>

      <Box className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <ResponsiveTable
          ariaLabel={t.stockStateAria}
          rows={rows}
          columns={columns}
          loading={loading}
          emptyState={<EmptyState icon={<CheckCircleRounded />} title={t.noAlert} description={t.noAlertHint} />}
          renderCard={(i) => {
            const m = STATE_META[stateOf(i)];
            return (
              <Box>
                <Box className="mb-2 flex items-center justify-between gap-2">
                  <Typography fontWeight={800}>{i.name}</Typography>
                  <Chip size="small" icon={m.icon} color={m.color} label={t[m.label]} />
                </Box>
                {level(i)}
                <Box className="mt-2 flex justify-end">{actions(i)}</Box>
              </Box>
            );
          }}
        />
        <Card className="p-5">
          <Box className="mb-3 flex items-center justify-between gap-2">
            <Typography variant="h6" component="h2">
              {t.movesHistory}
            </Typography>
            {historyFor && (
              <Chip size="small" label={nameOf(historyFor)} onDelete={() => setHistoryFor(null)} />
            )}
          </Box>
          {history.length === 0 ? (
            <EmptyState compact icon={<HistoryRounded />} title={t.noMove} />
          ) : (
            <Box component="ol" className="m-0 max-h-[520px] list-none space-y-3 overflow-y-auto p-0 pr-1">
              {history.map((m) => (
                <li key={m.id} className="flex gap-3">
                  <Box className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${m.kind === 'in' ? 'bg-basil-50 text-basil-700' : m.kind === 'out' ? 'bg-tomato-50 text-tomato-600' : 'bg-cream-200 text-charcoal-700'}`}>
                    {m.kind === 'in' ? <AddCircleOutlineRounded fontSize="small" /> : m.kind === 'out' ? <RemoveCircleOutlineRounded fontSize="small" /> : <TuneRounded fontSize="small" />}
                  </Box>
                  <Box className="min-w-0">
                    <Typography variant="body2" fontWeight={700}>
                      {nameOf(m.ingredientId)} {m.kind === 'in' ? `+${m.quantity}` : m.kind === 'out' ? `-${m.quantity}` : t.thresholdShort(m.quantity)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" className="block">
                      {m.note} · {m.author} · {fmt.dateTime(m.date)}
                    </Typography>
                  </Box>
                </li>
              ))}
            </Box>
          )}
        </Card>
      </Box>
      <StockDialog mode={dialog} onClose={() => setDialog(null)} />
    </Box>
  );
}
