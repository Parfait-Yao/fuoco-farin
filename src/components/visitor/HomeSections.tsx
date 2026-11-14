'use client';

import * as React from 'react';
import Link from 'next/link';
import { Avatar, Box, Button, Card, Chip, Rating, TextField, Typography } from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded';
import DeliveryDiningRounded from '@mui/icons-material/DeliveryDiningRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import TuneRounded from '@mui/icons-material/TuneRounded';
import FormatQuoteRounded from '@mui/icons-material/FormatQuoteRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import MarkEmailReadRounded from '@mui/icons-material/MarkEmailReadRounded';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatedNumber, FormTextField, LoadingButton, PizzaImage, Reveal, SectionHeading, Stagger, StaggerItem } from '@/components/ui';
import { DynamicIcon } from './DynamicIcon';
import { PizzaCard } from './PizzaCard';
import { useDataStore } from '@/store/dataStore';
import { notify } from '@/store/uiStore';
import { contactService } from '@/services';
import { IMAGES, advantagesMock, demoReviewsMock, orderStepsMock } from '@/mocks';
import { ROUTES } from '@/constants';
import { useFormat, useLocale, useMessages } from '@/i18n/client';
import { vm } from '@/i18n/validation';

export function HeroSection() {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 25]);
  const t = useMessages('site');

  return (
    <Box ref={ref} component="section" className="relative -mt-[72px] overflow-hidden pt-[72px]">
      <Box aria-hidden className="grain absolute inset-0 opacity-60" />
      <Box aria-hidden className="absolute -left-40 top-20 h-[420px] w-[420px] rounded-full bg-ember-300/30 blur-3xl" />
      <Box className="container-page relative grid items-center gap-10 py-12 md:py-20 lg:grid-cols-2">
        <Box>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Chip icon={<LocalFireDepartmentRounded />} label={t.heroChip} color="secondary" variant="outlined" className="mb-6 bg-white/70" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
            <Typography variant="h1" className="text-balance text-[2.6rem] sm:text-6xl lg:text-7xl">
              {t.heroTitleStart} <span className="italic text-tomato-500">{t.heroTitleAccent}</span> {t.heroTitleEnd}
            </Typography>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}>
            <Typography color="text.secondary" className="mt-6 max-w-xl text-lg">
              {t.heroText}
            </Typography>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button component={Link} href={ROUTES.menu} variant="contained" size="large" endIcon={<ArrowForwardRounded />}>
              {t.orderNow}
            </Button>
            <Button component={Link} href={ROUTES.builder} variant="outlined" size="large" color="inherit" startIcon={<TuneRounded />} className="border-black/15 bg-white/60">
              {t.buildMine}
            </Button>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-10 flex flex-wrap items-center gap-6">
            <Box className="flex -space-x-3">
              {[47, 12, 32, 15].map((img) => (
                <Avatar key={img} src={`https://i.pravatar.cc/80?img=${img}`} alt="" className="border-2 border-solid border-white" />
              ))}
            </Box>
            <Box>
              <Box className="flex items-center gap-1">
                <Rating value={4.9} precision={0.1} readOnly size="small" />
                <Typography fontWeight={800}>{t.ratingValue}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {t.customersCount}
              </Typography>
            </Box>
          </motion.div>
        </Box>
        <Box className="relative mx-auto w-full max-w-[560px]">
          <motion.div style={{ y }} className="relative aspect-square">
            <Box aria-hidden className="absolute inset-[6%] rounded-full bg-gradient-to-br from-tomato-400 to-ember-500 opacity-20 blur-2xl" />
            <motion.div style={{ rotate }} initial={{ scale: 0.85, opacity: 0, rotate: -20 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} className="relative h-full w-full overflow-hidden rounded-full border-[10px] border-solid border-white shadow-warm">
              <PizzaImage src={IMAGES.hero} alt={t.heroImageAlt} fill priority sizes="(max-width: 1024px) 90vw, 560px" className="object-cover" />
            </motion.div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }} className="absolute bottom-6 left-0 sm:-left-6">
            <Card className="flex items-center gap-3 p-3 pr-5 shadow-soft">
              <Box className="grid h-11 w-11 place-items-center rounded-2xl bg-basil-50 text-basil-700">
                <DeliveryDiningRounded />
              </Box>
              <Box>
                <Typography fontWeight={800}>32 min</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t.averageDelivery}
                </Typography>
              </Box>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.85 }} className="absolute right-0 top-8 sm:-right-4">
            <Card className="flex items-center gap-2 p-3 pr-4 shadow-soft">
              <StarRounded className="text-ember-500" />
              <Typography fontWeight={800}>{t.topBadge}</Typography>
            </Card>
          </motion.div>
        </Box>
      </Box>
    </Box>
  );
}

export function StatsBand() {
  const data = useDataStore((s) => s.publicStats);
  const t = useMessages('site');
  const fmt = useFormat();
  // Real figures only; a metric with no data yet is not shown.
  const stats = [
    { value: data?.deliveredPizzas ?? 0, suffix: '', label: t.statPizzas },
    { value: data?.averageRating ?? 0, suffix: '/5', label: t.statRating },
    { value: data?.averageDeliveryMinutes ?? 0, suffix: ' min', label: t.statDelay },
    { value: data?.districts ?? 0, suffix: '', label: t.statDistricts },
  ].filter((s) => s.value > 0);
  if (!stats.length) return null;
  return (
    <Box component="section" aria-label={t.keyFigures} className="container-page">
      <Card className={`grid grid-cols-2 gap-6 bg-charcoal-900 p-6 text-white md:p-10 ${stats.length >= 4 ? 'md:grid-cols-4' : stats.length === 3 ? 'md:grid-cols-3' : ''}`}>
        {stats.map((s) => (
          <Box key={s.label} className="text-center">
            <Typography variant="h3" component="p" className="text-ember-300">
              <AnimatedNumber value={s.value} format={(n) => (s.value % 1 ? fmt.number(Math.round(n * 10) / 10) : fmt.number(Math.round(n)))} />
              {s.suffix}
            </Typography>
            <Typography className="text-white/70">{s.label}</Typography>
          </Box>
        ))}
      </Card>
    </Box>
  );
}

export function BestSellers() {
  const all = useDataStore((s) => s.pizzas);
  const pizzas = React.useMemo(() => all.filter((p) => p.active && p.isPopular).slice(0, 6), [all]);
  const t = useMessages('site');
  return (
    <Box component="section" className="container-page py-20">
      <SectionHeading
        eyebrow={t.bestEyebrow}
        title={t.bestTitle}
        subtitle={t.bestSubtitle}
        action={
          <Button component={Link} href={ROUTES.menu} endIcon={<ArrowForwardRounded />}>
            {t.fullMenu}
          </Button>
        }
      />
      <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {pizzas.map((pizza, i) => (
          <StaggerItem key={pizza.id}>
            <PizzaCard pizza={pizza} priority={i < 3} />
          </StaggerItem>
        ))}
      </Stagger>
    </Box>
  );
}

export function CategoriesShowcase() {
  const all = useDataStore((s) => s.categories);
  const categories = React.useMemo(() => all.filter((c) => c.active).sort((a, b) => a.order - b.order), [all]);
  const t = useMessages('site');
  return (
    <Box component="section" className="container-page pb-20">
      <SectionHeading eyebrow={t.categoriesEyebrow} title={t.categoriesTitle} />
      <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {categories.map((c, i) => (
          <StaggerItem key={c.id} className={i === 0 ? 'col-span-2 md:col-span-1' : ''}>
            <motion.div whileHover={{ scale: 1.03 }} className="h-full">
              <Box component={Link} href={`${ROUTES.menu}?category=${c.id}`} className="group relative block h-44 overflow-hidden rounded-3xl md:h-56">
                <PizzaImage src={c.image} alt="" fill sizes="(max-width: 768px) 50vw, 20vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />
                <Box className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <Box className="absolute bottom-0 p-4 text-white">
                  <Typography fontWeight={800} className="text-lg">
                    {c.name}
                  </Typography>
                  <Typography variant="caption" className="line-clamp-1 text-white/80">
                    {c.description}
                  </Typography>
                </Box>
              </Box>
            </motion.div>
          </StaggerItem>
        ))}
      </Stagger>
    </Box>
  );
}

export function ServiceIntro() {
  const t = useMessages('site');
  return (
    <Box component="section" className="bg-cream-200/60 py-20">
      <Box className="container-page grid items-center gap-12 lg:grid-cols-2">
        <Reveal className="relative">
          <Box className="relative aspect-[4/5] overflow-hidden rounded-4xl shadow-warm sm:aspect-[4/3] lg:aspect-[4/5]">
            <PizzaImage src={IMAGES.oven} alt={t.roomAlt} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
          </Box>
          <Card className="absolute -bottom-6 right-4 max-w-[240px] p-4 sm:right-8">
            <Typography variant="h4" component="p" color="primary">
              {t.bakeTime}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t.bakeText}
            </Typography>
          </Card>
        </Reveal>
        <Reveal delay={0.1}>
          <SectionHeading
            eyebrow={t.serviceEyebrow}
            title={t.serviceTitle}
            subtitle={t.serviceSubtitle}
            className="mb-6"
          />
          <Box className="space-y-4">
            {orderStepsMock.map((step, i) => (
              <Box key={step.icon + i} className="flex gap-4">
                <Box className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-tomato-500 shadow-soft">
                  <DynamicIcon name={step.icon} />
                </Box>
                <Box>
                  <Typography fontWeight={800}>
                    {i + 1}. {t.steps[i].title}
                  </Typography>
                  <Typography color="text.secondary">{t.steps[i].text}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
          <Button component={Link} href={ROUTES.about} className="mt-6" endIcon={<ArrowForwardRounded />}>
            {t.ourStory}
          </Button>
        </Reveal>
      </Box>
    </Box>
  );
}

export function AdvantagesGrid({ withHeading = true }: { withHeading?: boolean }) {
  const t = useMessages('site');
  return (
    <Box component="section" className="container-page py-20">
      {withHeading && <SectionHeading align="center" eyebrow={t.whyEyebrow} title={t.whyTitle} subtitle={t.whySubtitle} />}
      <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {advantagesMock.map((a, i) => (
          <StaggerItem key={a.icon}>
            <motion.div whileHover={{ y: -6 }} className="h-full">
              <Card className="h-full p-6">
                <Box className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-tomato-400 to-tomato-600 text-white shadow-warm">
                  <DynamicIcon name={a.icon} />
                </Box>
                <Typography variant="h6">{t.advantages[i].title}</Typography>
                <Typography color="text.secondary" className="mt-1">
                  {t.advantages[i].text}
                </Typography>
              </Card>
            </motion.div>
          </StaggerItem>
        ))}
      </Stagger>
    </Box>
  );
}

export function Testimonials() {
  const all = useDataStore((s) => s.reviews);
  const pizzas = useDataStore((s) => s.pizzas);
  const locale = useLocale();
  const t = useMessages('site');
  const fmt = useFormat();
  const reviews = React.useMemo(() => {
    const real = all.filter((r) => r.published && r.rating >= 4).slice(0, 6);
    if (real.length) return real.map((r) => ({ ...r, pizzaName: pizzas.find((p) => p.id === r.pizzaId)?.name }));
    // No published review yet: show sample testimonials until real ones exist.
    return demoReviewsMock.map((r) => ({
      id: r.id,
      customerName: r.customerName,
      avatar: undefined as string | undefined,
      rating: r.rating,
      date: r.date,
      comment: r.comment[locale],
      pizzaName: pizzas.find((p) => p.slug === r.pizzaSlug)?.name,
    }));
  }, [all, pizzas, locale]);
  return (
    <Box component="section" className="overflow-hidden py-20">
      <Box className="container-page">
        <SectionHeading eyebrow={t.testimonialsEyebrow} title={t.testimonialsTitle} />
      </Box>
      <Box className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 scroll-px-5 sm:px-8 sm:scroll-px-8 lg:px-[max(2.5rem,calc((100vw-80rem)/2+2.5rem))] lg:scroll-px-[max(2.5rem,calc((100vw-80rem)/2+2.5rem))] xl:px-[max(4rem,calc((100vw-80rem)/2+4rem))] xl:scroll-px-[max(4rem,calc((100vw-80rem)/2+4rem))]">
        {reviews.map((r, i) => (
          <Reveal key={r.id} delay={i * 0.05} className="w-[85vw] max-w-[380px] shrink-0 snap-start">
            <Card className="h-full p-6">
              <FormatQuoteRounded className="text-4xl text-ember-300" />
              <Typography className="mt-2 min-h-[96px]">{r.comment}</Typography>
              <Box className="mt-5 flex items-center gap-3">
                <Avatar src={r.avatar} alt={r.customerName}>
                  {r.customerName.charAt(0)}
                </Avatar>
                <Box>
                  <Typography fontWeight={800}>{r.customerName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {r.pizzaName ? `${r.pizzaName} · ` : ''}
                    {fmt.date(r.date)}
                  </Typography>
                </Box>
                <Rating value={r.rating} readOnly size="small" className="ml-auto" />
              </Box>
            </Card>
          </Reveal>
        ))}
      </Box>
    </Box>
  );
}

export function PromotionsBand() {
  const all = useDataStore((s) => s.promotions);
  const promos = React.useMemo(() => all.filter((p) => p.active && new Date(p.endDate).getTime() > Date.now()).slice(0, 3), [all]);
  const show = useDataStore((s) => s.settings.showPromotionsBanner);
  const t = useMessages('site');
  if (!show || promos.length === 0) return null;

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      notify(t.promoCopied(code));
    } catch {
      notify(t.promoYourCode(code), 'info');
    }
  };

  return (
    <Box component="section" className="container-page py-10">
      <Reveal>
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-tomato-500 via-tomato-600 to-tomato-800 p-6 text-white md:p-10">
          <Box aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-ember-500/40 blur-3xl" />
          <Box className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <Box>
              <Typography variant="overline" className="text-ember-100">
                {t.promoEyebrow}
              </Typography>
              <Typography variant="h3" component="h2" className="mt-1 text-white">
                {t.promoTitle}
              </Typography>
              <Typography className="mt-2 max-w-lg text-white/80">{t.promoText}</Typography>
            </Box>
            <Box className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {promos.map((p) => (
                <motion.button
                  key={p.id}
                  type="button"
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => copy(p.code)}
                  aria-label={t.copyCode(p.code)}
                  className="cursor-pointer rounded-2xl border border-dashed border-white/50 bg-white/10 p-4 text-left text-white backdrop-blur"
                >
                  <span className="flex items-center justify-between gap-3 font-mono text-lg font-bold tracking-wider">
                    {p.code} <ContentCopyRounded fontSize="small" />
                  </span>
                  <span className="mt-1 block text-sm text-white/80">{p.label}</span>
                </motion.button>
              ))}
            </Box>
          </Box>
        </Card>
      </Reveal>
    </Box>
  );
}

const newsletterSchema = z.object({ email: z.string().min(1, vm('required')).email(vm('invalidEmail')) });

export function Newsletter() {
  const [done, setDone] = React.useState(false);
  const t = useMessages('site');
  const { control, handleSubmit, formState, setError } = useForm<z.infer<typeof newsletterSchema>>({ resolver: zodResolver(newsletterSchema), defaultValues: { email: '' } });

  const onSubmit = handleSubmit(async ({ email }) => {
    try {
      await contactService.subscribeNewsletter(email);
      setDone(true);
      notify(t.newsletterDone);
    } catch (e) {
      setError('email', { message: (e as Error).message });
    }
  });

  return (
    <Box component="section" className="container-page py-16">
      <Reveal>
        <Card className="grid items-center gap-6 bg-cream-200 p-6 md:grid-cols-2 md:p-12">
          <Box>
            <Typography variant="h3" component="h2">
              {t.newsletterTitle}
            </Typography>
            <Typography color="text.secondary" className="mt-2">
              {t.newsletterText}
            </Typography>
          </Box>
          {done ? (
            <Box className="flex items-center gap-3 rounded-2xl bg-basil-50 p-4 text-basil-700" role="status">
              <MarkEmailReadRounded />
              <Typography fontWeight={700}>{t.newsletterThanks}</Typography>
            </Box>
          ) : (
            <Box component="form" onSubmit={onSubmit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <FormTextField control={control} name="email" type="email" label={t.yourEmail} autoComplete="email" />
              <LoadingButton type="submit" variant="contained" size="large" loading={formState.isSubmitting} className="h-14 shrink-0">
                {t.subscribe}
              </LoadingButton>
            </Box>
          )}
        </Card>
      </Reveal>
    </Box>
  );
}

/** Generic marketing hero for secondary pages. */
export function PageHero({ eyebrow, title, subtitle, image }: { eyebrow: string; title: string; subtitle?: string; image?: string }) {
  return (
    <Box component="section" className="relative -mt-[72px] overflow-hidden pt-[72px]">
      {image && (
        <>
          <PizzaImage src={image} alt="" fill priority sizes="100vw" className="object-cover" />
          <Box className="absolute inset-0 bg-gradient-to-b from-charcoal-900/80 via-charcoal-900/70 to-cream-100" />
        </>
      )}
      {!image && <Box aria-hidden className="grain absolute inset-0" />}
      <Box className="container-page relative py-16 text-center md:py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Typography variant="overline" className={image ? 'text-ember-300' : 'text-tomato-500'}>
            {eyebrow}
          </Typography>
          <Typography variant="h1" className={`mx-auto mt-2 max-w-3xl text-balance text-4xl sm:text-5xl lg:text-6xl ${image ? 'text-white' : ''}`}>
            {title}
          </Typography>
          {subtitle && <Typography className={`mx-auto mt-4 max-w-2xl text-lg ${image ? 'text-white/85' : 'text-charcoal-500'}`}>{subtitle}</Typography>}
        </motion.div>
      </Box>
    </Box>
  );
}
