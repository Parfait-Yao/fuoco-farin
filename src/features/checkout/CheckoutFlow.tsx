'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Card, MobileStepper, Step, StepLabel, Stepper, Typography } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import LockRounded from '@mui/icons-material/LockRounded';
import ShoppingBagOutlined from '@mui/icons-material/ShoppingBagOutlined';
import VerifiedUserRounded from '@mui/icons-material/VerifiedUserRounded';
import { AnimatePresence, motion } from 'framer-motion';
import { EmptyState, ListSkeleton, LoadingButton } from '@/components/ui';
import { CartTotals } from '@/features/cart/CartSummary';
import { useCartTotals, useHydrated, useIsMobile } from '@/hooks';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useDataStore } from '@/store/dataStore';
import { notify } from '@/store/uiStore';
import { orderService } from '@/services';
import type { Quote } from '@/services/orderService';
import { ROUTES } from '@/constants';
import { useFormat, useMessages } from '@/i18n/client';
import { checkoutSchema, STEP_FIELDS, type CheckoutValues } from './schema';
import { AddressStep, CartStep, ContactStep, DeliveryStep, PaymentStep, ReviewStep } from './CheckoutSteps';


export function CheckoutFlow() {
  const router = useRouter();
  const hydrated = useHydrated();
  const isMobile = useIsMobile();
  const user = useAuthStore((s) => s.user);
  const deliveryMode = useCartStore((s) => s.deliveryMode);
  const clearCart = useCartStore((s) => s.clear);
  const setDeliveryMode = useCartStore((s) => s.setDeliveryMode);
  const preferences = useAuthStore((s) => s.preferences);
  const totals = useCartTotals();
  const [step, setStep] = React.useState(0);
  const [paymentError, setPaymentError] = React.useState<string | null>(null);
  const [quote, setQuote] = React.useState<Quote | null>(null);
  const placing = React.useRef(false);
  const t = useMessages('checkout');
  const fmt = useFormat();
  const STEPS = t.steps;

  // Back from the Stripe page without paying: cancel the unpaid order (stock released). The cart was kept.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order');
    if (params.get('payment') !== 'cancelled' || !orderId) return;
    window.history.replaceState(null, '', ROUTES.checkout);
    const message = t.paymentCancelled;
    setPaymentError(message);
    notify(message, 'info');
    void orderService.cancelOnlinePayment(orderId, params.get('token')).catch(() => undefined);
  }, [t.paymentCancelled]);

  const { control, handleSubmit, trigger, setValue, reset, formState } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onTouched',
    defaultValues: {
      street: '',
      district: '',
      city: 'Abidjan',
      details: '',
      fullName: '',
      email: '',
      phone: '',
      deliveryMode,
      acceptTerms: false,
      paymentMethod: 'card',
    },
  });

  // Prefill with the signed-in client's profile once stores are hydrated.
  React.useEffect(() => {
    if (!hydrated) return;
    const address = user?.addresses.find((a) => a.isDefault) ?? user?.addresses[0];
    // Signed-in clients start from their saved preferences (Paramètres page).
    const mode = user ? preferences.defaultDelivery : deliveryMode;
    if (user) setDeliveryMode(mode);
    reset((values) => ({
      ...values,
      deliveryMode: mode,
      paymentMethod: user && ['card', 'cash'].includes(preferences.defaultPayment) ? preferences.defaultPayment : values.paymentMethod,
      fullName: user ? `${user.firstName} ${user.lastName}` : values.fullName,
      email: user?.email ?? values.email,
      phone: user?.phone ?? values.phone,
      street: address?.street ?? values.street,
      district: address?.district ?? values.district,
      city: address?.city ?? values.city,
      details: address?.details ?? values.details,
      latitude: address ? address.latitude : values.latitude,
      longitude: address ? address.longitude : values.longitude,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user?.id]);

  // Server prices for the recap and payment steps: the browser total is only a preview.
  const watchedMode = deliveryMode;
  React.useEffect(() => {
    if (step < 4 || totals.items.length === 0) return;
    let cancelled = false;
    orderService
      .quote(totals.items, watchedMode, totals.promo?.code)
      .then((q) => {
        if (cancelled) return;
        setQuote(q);
        setPaymentError(!q.available ? t.outOfStock(q.shortages.join(', ')) : q.promoError);
      })
      .catch((e: Error) => !cancelled && setPaymentError(e.message));
    return () => {
      cancelled = true;
    };
  }, [step, totals.items, totals.promo?.code, watchedMode, t]);

  const goTo = (index: number) => {
    setStep(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const next = async () => {
    const valid = await trigger(STEP_FIELDS[step]);
    if (!valid) return;
    // Pickup orders skip nothing but still need a contact address for the receipt.
    goTo(step + 1);
  };

  const onSubmit = handleSubmit(async (values) => {
    if (placing.current) return;
    placing.current = true;
    setPaymentError(null);
    try {
      const { order, guestToken } = await orderService.placeOrder({
        contact: { fullName: values.fullName, email: values.email, phone: values.phone },
        address: { street: values.street, district: values.district, city: values.city, details: values.details || undefined, latitude: values.latitude, longitude: values.longitude },
        items: totals.items,
        promoCode: totals.promo?.code,
        deliveryMode: values.deliveryMode,
        paymentMethod: values.paymentMethod,
      });
      if (user) void useDataStore.getState().refreshOrders().catch(() => undefined);
      else useDataStore.setState((s) => ({ orders: [order, ...s.orders.filter((o) => o.id !== order.id)] }));
      router.push(`${ROUTES.confirmation(order.id)}${guestToken ? `?token=${guestToken}` : ''}`);
      clearCart();
      notify(order.paymentStatus === 'paid' ? t.paidConfirmed(order.number) : t.confirmed(order.number));
    } catch (e) {
      setPaymentError((e as Error).message);
      notify((e as Error).message, 'error');
      placing.current = false;
    }
  });

  if (!hydrated) return <ListSkeleton rows={6} />;

  if (totals.count === 0 && !formState.isSubmitting && !formState.isSubmitSuccessful) {
    return <EmptyState icon={<ShoppingBagOutlined />} title={t.emptyCart} description={t.emptyCartHint} action={{ label: t.seeMenu, href: ROUTES.menu }} />;
  }

  const isLast = step === STEPS.length - 1;

  return (
    <Box className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Box className="min-w-0">
        {isMobile ? (
          <Box className="mb-4">
            <Typography variant="overline" color="primary">
              {t.stepOf(step + 1, STEPS.length)}
            </Typography>
            <Typography variant="h5" component="h2">
              {STEPS[step]}
            </Typography>
            <MobileStepper variant="progress" steps={STEPS.length} activeStep={step} position="static" backButton={null} nextButton={null} className="mt-2 bg-transparent p-0 [&_.MuiLinearProgress-root]:w-full" />
          </Box>
        ) : (
          <Stepper activeStep={step} alternativeLabel className="mb-8">
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

        {!user && step === 0 && (
          <Alert severity="info" className="mb-4 rounded-2xl" action={<Button component={Link} href={`${ROUTES.login}?redirect=${ROUTES.checkout}`} color="inherit" size="small">{t.signIn}</Button>}>
            {t.signInHint}
          </Alert>
        )}

        <Card className="p-5 md:p-7">
          <Box component="form" onSubmit={onSubmit} noValidate>
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
                {!isMobile && (
                  <Typography variant="h5" component="h2" className="mb-5">
                    {STEPS[step]}
                  </Typography>
                )}
                {step === 0 && <CartStep />}
                {step === 1 && <AddressStep control={control} setValue={setValue} goTo={goTo} addresses={user?.addresses ?? []} />}
                {step === 2 && <ContactStep control={control} setValue={setValue} goTo={goTo} />}
                {step === 3 && <DeliveryStep control={control} setValue={setValue} goTo={goTo} />}
                {step === 4 && <ReviewStep control={control} setValue={setValue} goTo={goTo} />}
                {step === 5 && <PaymentStep control={control} setValue={setValue} goTo={goTo} error={paymentError} total={quote?.total} />}
              </motion.div>
            </AnimatePresence>

            <Box className="mt-8 flex items-center justify-between gap-3">
              <Button startIcon={<ArrowBackRounded />} color="inherit" onClick={() => goTo(step - 1)} disabled={step === 0 || formState.isSubmitting}>
                {t.back}
              </Button>
              {isLast ? (
                <LoadingButton type="submit" variant="contained" size="large" loading={formState.isSubmitting} startIcon={<LockRounded />} disabled={quote ? !quote.available : false}>
                  {formState.isSubmitting ? t.paying : t.orderButton(fmt.price(quote?.total ?? totals.total))}
                </LoadingButton>
              ) : (
                <Button variant="contained" size="large" endIcon={<ArrowForwardRounded />} onClick={next}>
                  {t.continue}
                </Button>
              )}
            </Box>
          </Box>
        </Card>
      </Box>

      <Box component="aside" aria-label={t.orderSummaryAria}>
        <Card className="sticky top-24 p-5">
          <Typography variant="h6" component="h2" className="mb-3">
            {t.yourOrder}
          </Typography>
          <CartTotals showPromo={step < 5} />
          <Box className="mt-4 flex items-center gap-2 text-sm text-charcoal-500">
            <VerifiedUserRounded fontSize="small" className="text-basil-500" />
            {t.securePayment}
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
