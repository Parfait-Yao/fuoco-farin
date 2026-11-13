'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Box, Button, Card, Chip, Divider, Step, StepButton, Stepper, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ShoppingBagRounded from '@mui/icons-material/ShoppingBagRounded';
import RestartAltRounded from '@mui/icons-material/RestartAltRounded';
import { AnimatePresence, motion } from 'framer-motion';
import { QuantityStepper } from '@/components/ui';
import { useDataStore } from '@/store/dataStore';
import { useCartStore } from '@/store/cartStore';
import { notify } from '@/store/uiStore';
import { useHydrated } from '@/hooks';
import { customPizzaPrice } from '@/lib/pricing';
import { PIZZA_SIZES, ROUTES } from '@/constants';
import { useFormat, useMessages } from '@/i18n/client';
import type { CustomPizzaConfig, IngredientType, PizzaSize } from '@/types';
import { OptionCard } from './OptionCard';
import { PizzaPreview } from './PizzaPreview';

const STEP_KEYS: (IngredientType | 'summary')[] = ['base', 'sauce', 'cheese', 'veggie', 'summary'];

const MAX_VEGGIES = 6;
const EMPTY: Partial<CustomPizzaConfig> = { veggieIds: [] };

export function PizzaBuilder() {
  const router = useRouter();
  const editId = useSearchParams().get('edit');
  const hydrated = useHydrated();
  const ingredients = useDataStore((s) => s.ingredients);
  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const updateItem = useCartStore((s) => s.updateItem);
  const setDrawerOpen = useCartStore((s) => s.setDrawerOpen);
  const t = useMessages('builder');
  const sizes = useMessages('domain').sizes;
  const customLabel = useMessages('domain').customPizza;
  const fmt = useFormat();
  const STEPS = STEP_KEYS.map((key) => ({ key, ...t.steps[key] }));

  const [step, setStep] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const [config, setConfig] = React.useState<Partial<CustomPizzaConfig>>(EMPTY);
  const [size, setSize] = React.useState<PizzaSize>('medium');
  const [quantity, setQuantity] = React.useState(1);
  const [name, setName] = React.useState(t.defaultName);
  const editing = editId ? cartItems.find((i) => i.id === editId && i.custom) : undefined;

  // Load the cart line when editing an existing custom pizza.
  React.useEffect(() => {
    if (!hydrated || !editing?.custom) return;
    setConfig(editing.custom);
    setSize(editing.size);
    setQuantity(editing.quantity);
    setName(editing.name);
    setStep(4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, editId]);

  const options = (type: IngredientType) => ingredients.filter((i) => i.type === type && i.active);
  const price = customPizzaPrice(config, ingredients, size);
  const current = STEPS[step];

  const isStepDone = (index: number) => {
    const key = STEPS[index].key;
    if (key === 'base') return Boolean(config.baseId);
    if (key === 'sauce') return Boolean(config.sauceId);
    if (key === 'cheese') return Boolean(config.cheeseId);
    if (key === 'veggie') return true;
    return false;
  };
  const canAccess = (index: number) => STEPS.slice(0, index).every((_, i) => isStepDone(i));

  const go = (index: number) => {
    if (!canAccess(index)) return;
    setDirection(index > step ? 1 : -1);
    setStep(index);
  };

  const select = (type: IngredientType, id: string) => {
    if (type === 'veggie') {
      setConfig((c) => {
        const list = c.veggieIds ?? [];
        if (list.includes(id)) return { ...c, veggieIds: list.filter((v) => v !== id) };
        if (list.length >= MAX_VEGGIES) {
          notify(t.maxVeggies(MAX_VEGGIES), 'warning');
          return c;
        }
        return { ...c, veggieIds: [...list, id] };
      });
      return;
    }
    const key = `${type}Id` as 'baseId' | 'sauceId' | 'cheeseId';
    setConfig((c) => ({ ...c, [key]: id }));
    // Auto-advance after a single choice for a fluid flow.
    setTimeout(() => {
      setDirection(1);
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, 280);
  };

  const reset = () => {
    setConfig(EMPTY);
    setSize('medium');
    setQuantity(1);
    setDirection(-1);
    setStep(0);
  };

  const submit = () => {
    const full = config as CustomPizzaConfig;
    const unitPrice = customPizzaPrice(full, ingredients, size);
    const label = name.trim() || customLabel;
    if (editing) {
      updateItem(editing.id, { custom: full, size, quantity, unitPrice, name: label });
      notify(t.updated);
      router.push(ROUTES.cart);
      return;
    }
    addItem({ name: label, size, quantity, unitPrice, custom: full });
    notify(t.added(label), 'success', { label: t.viewCart, href: ROUTES.cart });
    setDrawerOpen(true);
    reset();
  };

  const selectedNames = [config.baseId, config.sauceId, config.cheeseId, ...(config.veggieIds ?? [])]
    .map((id) => ingredients.find((i) => i.id === id))
    .filter((i): i is NonNullable<typeof i> => Boolean(i));

  return (
    <Box className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
      <Box className="min-w-0">
        <Stepper nonLinear activeStep={step} alternativeLabel className="no-scrollbar mb-8 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <Step key={s.key} completed={i < STEPS.length - 1 && isStepDone(i) && (s.key !== 'veggie' || step > i)}>
              <StepButton onClick={() => go(i)} disabled={!canAccess(i)}>
                <span className="hidden sm:inline">{s.label}</span>
              </StepButton>
            </Step>
          ))}
        </Stepper>

        <Box className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <Box>
            <Typography variant="overline" color="primary">
              {t.stepOf(step + 1, STEPS.length)}
            </Typography>
            <Typography variant="h4" component="h2">
              {current.title}
            </Typography>
            <Typography color="text.secondary">{current.hint}</Typography>
          </Box>
          {current.key === 'veggie' && <Chip color="secondary" label={t.selectedCount(config.veggieIds?.length ?? 0, MAX_VEGGIES)} />}
        </Box>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            {current.key !== 'summary' ? (
              <Box role={current.key === 'veggie' ? 'group' : 'radiogroup'} aria-label={current.title} className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-3">
                {options(current.key).map((option) => (
                  <OptionCard
                    key={option.id}
                    option={option}
                    multiple={current.key === 'veggie'}
                    selected={current.key === 'veggie' ? Boolean(config.veggieIds?.includes(option.id)) : config[`${current.key}Id` as 'baseId'] === option.id}
                    onSelect={() => select(current.key as IngredientType, option.id)}
                  />
                ))}
              </Box>
            ) : (
              <Card className="p-5 md:p-6">
                {editing && (
                  <Alert severity="info" className="mb-4">
                    {t.editingAlert}
                  </Alert>
                )}
                <TextField label={t.creationName} value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 40 }} className="mb-5" />
                <Box className="space-y-3">
                  {(['base', 'sauce', 'cheese'] as const).map((type, i) => {
                    const item = ingredients.find((x) => x.id === config[`${type}Id`]);
                    return (
                      <Box key={type} className="flex items-center justify-between gap-3">
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {STEPS[i].label}
                          </Typography>
                          <Typography fontWeight={700}>{item?.name ?? '—'}</Typography>
                        </Box>
                        <Button size="small" onClick={() => go(i)}>
                          {t.edit}
                        </Button>
                      </Box>
                    );
                  })}
                  <Box className="flex items-start justify-between gap-3">
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t.steps.veggie.label}
                      </Typography>
                      <Box className="mt-1 flex flex-wrap gap-1">
                        {(config.veggieIds ?? []).length === 0 ? (
                          <Typography fontWeight={700}>{t.none}</Typography>
                        ) : (
                          config.veggieIds!.map((id) => <Chip key={id} size="small" label={ingredients.find((x) => x.id === id)?.name} />)
                        )}
                      </Box>
                    </Box>
                    <Button size="small" onClick={() => go(3)}>
                      {t.edit}
                    </Button>
                  </Box>
                </Box>
                <Divider className="my-5" />
                <Typography fontWeight={700} className="mb-2">
                  {t.size}
                </Typography>
                <ToggleButtonGroup exclusive fullWidth value={size} onChange={(_, v: PizzaSize | null) => v && setSize(v)} aria-label={t.sizeAria} color="primary">
                  {PIZZA_SIZES.map((s) => (
                    <ToggleButton key={s} value={s} className="flex-col rounded-2xl py-2 normal-case">
                      <span className="font-bold">{sizes[s].label}</span>
                      <span className="text-xs opacity-70">{sizes[s].diameter}</span>
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
                <Box className="mt-5 flex flex-wrap items-center justify-between gap-4">
                  <QuantityStepper value={quantity} onChange={setQuantity} />
                  <Button size="large" variant="contained" startIcon={<ShoppingBagRounded />} onClick={submit}>
                    {editing ? t.update : t.add} · {fmt.price(price * quantity)}
                  </Button>
                </Box>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        <Box className="mt-8 flex items-center justify-between gap-3">
          <Button startIcon={<ArrowBackRounded />} onClick={() => go(step - 1)} disabled={step === 0} color="inherit">
            {t.previous}
          </Button>
          <Button startIcon={<RestartAltRounded />} onClick={reset} color="inherit" className="hidden sm:inline-flex">
            {t.restart}
          </Button>
          {step < STEPS.length - 1 && (
            <Button endIcon={<ArrowForwardRounded />} variant="contained" onClick={() => go(step + 1)} disabled={!isStepDone(step)}>
              {current.key === 'veggie' ? t.seeSummary : t.next}
            </Button>
          )}
        </Box>
      </Box>

      {/* Live preview */}
      <Box className="order-first lg:order-none">
        <Card className="sticky top-24 overflow-hidden">
          <Box className="grain relative bg-gradient-to-br from-cream-100 to-cream-300 p-6">
            <PizzaPreview config={config} className="mx-auto block w-full max-w-[220px] lg:max-w-[300px]" spinning={step === STEPS.length - 1} />
          </Box>
          <Box className="p-5">
            <Box className="flex items-baseline justify-between">
              <Typography color="text.secondary" fontWeight={600}>
                {t.estimated(sizes[size].label.toLowerCase())}
              </Typography>
              <AnimatePresence mode="popLayout">
                <motion.span key={price} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}>
                  <Typography component="span" variant="h5" color="primary" fontWeight={800}>
                    {fmt.price(price)}
                  </Typography>
                </motion.span>
              </AnimatePresence>
            </Box>
            <Box className="mt-3 flex min-h-[32px] flex-wrap gap-1.5">
              <AnimatePresence>
                {selectedNames.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t.choicesHere}
                  </Typography>
                ) : (
                  selectedNames.map((i) => (
                    <motion.span key={i.id} layout initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
                      <Chip size="small" label={i.name} avatar={<Box component="span" className="rounded-full" style={{ background: i.color === 'transparent' ? '#eee' : i.color }} />} />
                    </motion.span>
                  ))
                )}
              </AnimatePresence>
            </Box>
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
