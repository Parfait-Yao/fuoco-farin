'use client';

import * as React from 'react';
import Link from 'next/link';
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Card, Chip, InputAdornment, MenuItem, TextField, Typography } from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import PhoneOutlined from '@mui/icons-material/PhoneOutlined';
import MailOutlineRounded from '@mui/icons-material/MailOutlineRounded';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';
import SendRounded from '@mui/icons-material/SendRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import HelpOutlineRounded from '@mui/icons-material/HelpOutlineRounded';
import HistoryEduRounded from '@mui/icons-material/HistoryEduRounded';
import GroupsRounded from '@mui/icons-material/GroupsRounded';
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded';
import AutoStoriesRounded from '@mui/icons-material/AutoStoriesRounded';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EmptyState, FormTextField, LoadingButton, PizzaImage, Reveal, SectionHeading } from '@/components/ui';
import { contactService } from '@/services';
import { notify } from '@/store/uiStore';
import { BRAND, ROUTES } from '@/constants';
import { IMAGES } from '@/mocks';
import { useMessages } from '@/i18n/client';
import { vm } from '@/i18n/validation';
import { useDataStore } from '@/store/dataStore';

const ABOUT_FACT_ICONS = [<HistoryEduRounded key="h" />, <GroupsRounded key="g" />, <LocalFireDepartmentRounded key="f" />];

/** Editorial split hero with a photo collage, specific to the About page. */
export function AboutHero() {
  const t = useMessages('site');
  return (
    <Box component="section" className="relative -mt-[72px] overflow-hidden pt-[72px]">
      <Box aria-hidden className="grain absolute inset-0 opacity-70" />
      <Box aria-hidden className="absolute -right-40 top-10 h-[460px] w-[460px] rounded-full bg-tomato-200/40 blur-3xl" />
      <Box className="container-page relative grid items-center gap-12 py-12 md:py-20 lg:grid-cols-[1.05fr_1fr]">
        <Box>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Chip icon={<AutoStoriesRounded />} label={t.aboutChip} color="primary" variant="outlined" className="mb-6 bg-white/70" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08 }}>
            <Typography variant="h1" className="text-balance text-[2.5rem] sm:text-6xl">
              {t.aboutTitleStart} <span className="italic text-tomato-500">{t.aboutTitleAccent}</span> {t.aboutTitleEnd}
            </Typography>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.16 }}>
            <Typography color="text.secondary" className="mt-6 max-w-xl text-lg">
              {t.aboutText}
            </Typography>
          </motion.div>
          <Box className="mt-8 grid max-w-xl grid-cols-1 gap-3 min-[420px]:grid-cols-3">
            {t.aboutFacts.map((f, i) => (
              <motion.div key={f.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.08 }}>
                <Card className="flex h-full items-center gap-3 p-3 min-[420px]:flex-col min-[420px]:items-start">
                  <Box className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tomato-50 text-tomato-500">{ABOUT_FACT_ICONS[i]}</Box>
                  <Box>
                    <Typography fontWeight={800} className="font-display text-xl leading-none">
                      {f.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {f.label}
                    </Typography>
                  </Box>
                </Card>
              </motion.div>
            ))}
          </Box>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button component={Link} href={ROUTES.menu} variant="contained" size="large">
              {t.tasteOurPizzas}
            </Button>
            <Button component={Link} href={ROUTES.contact} variant="outlined" size="large" color="inherit" className="border-black/15 bg-white/60">
              {t.visitUs}
            </Button>
          </motion.div>
        </Box>

        {/* Photo collage */}
        <Box className="relative mx-auto grid w-full max-w-[560px] grid-cols-5 grid-rows-6 gap-3 sm:gap-4" style={{ aspectRatio: '1 / 1' }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="relative col-span-3 row-span-4 overflow-hidden rounded-4xl shadow-warm">
            <PizzaImage src={IMAGES.pizzas[2]} alt={t.aboutAlts[0]} fill priority sizes="(max-width: 1024px) 60vw, 330px" className="object-cover" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="relative col-span-2 row-span-3 overflow-hidden rounded-4xl shadow-soft">
            <PizzaImage src={IMAGES.pizzas[5]} alt={t.aboutAlts[1]} fill priority sizes="(max-width: 1024px) 40vw, 220px" className="object-cover" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="relative col-span-2 row-span-3 overflow-hidden rounded-4xl shadow-soft">
            <PizzaImage src={IMAGES.oven} alt={t.aboutAlts[2]} fill sizes="(max-width: 1024px) 40vw, 220px" className="object-cover" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }} className="relative col-span-3 row-span-2 overflow-hidden rounded-4xl shadow-soft">
            <PizzaImage src={IMAGES.pizzas[7]} alt={t.aboutAlts[3]} fill sizes="(max-width: 1024px) 60vw, 330px" className="object-cover" />
          </motion.div>
          {/* Rotating seal */}
          <motion.div
            aria-hidden
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 0.5 }}
            className="absolute left-[56%] top-[58%] grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-charcoal-900 text-center text-white shadow-warm sm:h-28 sm:w-28"
          >
            <motion.svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" animate={{ rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}>
              <defs>
                <path id="seal-circle" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
              </defs>
              <text fontSize="9.5" fontWeight="700" letterSpacing="2.4" fill="#FFBE73">
                <textPath href="#seal-circle">FUOCO · FARINA · ABIDJAN · </textPath>
              </text>
            </motion.svg>
            <LocalFireDepartmentRounded className="text-3xl text-tomato-400" />
          </motion.div>
        </Box>
      </Box>
    </Box>
  );
}

export function AboutContent() {
  const t = useMessages('site');
  const milestones = t.milestones;
  const valueIcons = [<LocalFireDepartmentRounded key="f" />, <GroupsRounded key="g" />, <HistoryEduRounded key="h" />];
  return (
    <>
      <Box className="container-page py-16">
        <SectionHeading align="center" eyebrow={t.valuesEyebrow} title={t.valuesTitle} subtitle={t.valuesSubtitle} />
        <Box className="grid gap-5 md:grid-cols-3">
          {t.values.map((v, i) => ({ ...v, icon: valueIcons[i] })).map((v, i) => (
            <Reveal key={v.title} delay={i * 0.08}>
              <Card className="h-full p-6">
                <Box className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-tomato-50 text-tomato-500">{v.icon}</Box>
                <Typography variant="h6">{v.title}</Typography>
                <Typography color="text.secondary" className="mt-1">
                  {v.text}
                </Typography>
              </Card>
            </Reveal>
          ))}
        </Box>
      </Box>
      <Box className="bg-cream-200/60 py-16">
        <Box className="container-page">
          <SectionHeading align="center" eyebrow={t.milestonesEyebrow} title={t.milestonesTitle} />
          <Box className="relative mx-auto max-w-3xl">
            <Box aria-hidden className="absolute bottom-0 left-[22px] top-0 w-0.5 bg-tomato-200 md:left-1/2" />
            {milestones.map((m, i) => (
              <Reveal key={m.year} delay={i * 0.08} className={`relative mb-8 flex gap-6 md:w-1/2 ${i % 2 ? 'md:ml-auto md:pl-10' : 'md:pr-10 md:text-right'}`}>
                <Box className={`absolute left-[14px] top-2 h-4 w-4 rounded-full border-4 border-solid border-cream-100 bg-tomato-500 ${i % 2 ? 'md:-left-2' : 'md:left-auto md:-right-2'}`} />
                <Box className="pl-12 md:pl-0">
                  <Typography variant="h4" component="p" color="primary">
                    {m.year}
                  </Typography>
                  <Typography color="text.secondary">{m.text}</Typography>
                </Box>
              </Reveal>
            ))}
          </Box>
        </Box>
      </Box>
      <Box className="container-page py-16 text-center">
        <Typography variant="h3" component="h2">
          {t.readyToTaste}
        </Typography>
        <Box className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button component={Link} href={ROUTES.menu} variant="contained" size="large">
            {t.seeMenu}
          </Button>
          <Button component={Link} href={ROUTES.contact} variant="outlined" size="large">
            {t.contactUs}
          </Button>
        </Box>
      </Box>
    </>
  );
}

const contactSchema = z.object({
  name: z.string().min(2, vm('minChars', 2)),
  email: z.string().email(vm('invalidEmail')),
  subject: z.string().min(1, vm('chooseOption')),
  message: z.string().min(20, vm('minChars', 20)).max(1000, vm('maxChars', 1000)),
});
type ContactValues = z.infer<typeof contactSchema>;

export function ContactContent() {
  const [sent, setSent] = React.useState(false);
  const t = useMessages('site');
  const domain = useMessages('domain');
  const settings = useDataStore((s) => s.settings);
  const { control, handleSubmit, formState, reset } = useForm<ContactValues>({ resolver: zodResolver(contactSchema), defaultValues: { name: '', email: '', subject: '', message: '' } });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await contactService.sendMessage(values);
      setSent(true);
      reset();
      notify(t.contactSent);
    } catch {
      notify(t.contactFailed, 'error');
    }
  });

  const infos = [
    { icon: <PlaceOutlined />, label: t.address, value: BRAND.address },
    { icon: <PhoneOutlined />, label: t.phone, value: BRAND.phone, href: `tel:${BRAND.phone.replace(/\s/g, '')}` },
    { icon: <MailOutlineRounded />, label: t.email, value: BRAND.email, href: `mailto:${BRAND.email}` },
    { icon: <ScheduleRounded />, label: t.hours, value: settings.openingHours || domain.openingHours },
  ];

  return (
    <Box className="container-page grid gap-8 py-12 lg:grid-cols-[1fr_1.4fr]">
      <Box className="space-y-4">
        {infos.map((info, i) => (
          <Reveal key={info.label} delay={i * 0.06}>
            <Card className="flex items-center gap-4 p-5">
              <Box className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-tomato-50 text-tomato-500">{info.icon}</Box>
              <Box className="min-w-0">
                <Typography variant="body2" color="text.secondary">
                  {info.label}
                </Typography>
                {info.href ? (
                  <Typography component="a" href={info.href} fontWeight={700} className="break-words text-inherit no-underline hover:text-tomato-500">
                    {info.value}
                  </Typography>
                ) : (
                  <Typography fontWeight={700} className="break-words">
                    {info.value}
                  </Typography>
                )}
              </Box>
            </Card>
          </Reveal>
        ))}
      </Box>
      <Reveal delay={0.1}>
        <Card className="p-6 md:p-8">
          {sent ? (
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-10 text-center" role="status">
              <CheckCircleRounded className="text-6xl text-basil-500" />
              <Typography variant="h5" className="mt-3">
                {t.thanksMessage}
              </Typography>
              <Typography color="text.secondary" className="mt-1">
                {t.replyIn24h}
              </Typography>
              <Button className="mt-6" variant="outlined" onClick={() => setSent(false)}>
                {t.sendAnother}
              </Button>
            </motion.div>
          ) : (
            <Box component="form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
              <Typography variant="h5" component="h2" className="sm:col-span-2">
                {t.writeUs}
              </Typography>
              <FormTextField control={control} name="name" label={t.fullName} autoComplete="name" required />
              <FormTextField control={control} name="email" label={t.email} type="email" autoComplete="email" required />
              <FormTextField control={control} name="subject" label={t.subject} select required className="sm:col-span-2">
                {(Object.keys(t.subjects) as (keyof typeof t.subjects)[]).map((key) => (
                  <MenuItem key={key} value={key}>
                    {t.subjects[key]}
                  </MenuItem>
                ))}
              </FormTextField>
              <FormTextField control={control} name="message" label={t.message} multiline minRows={5} required className="sm:col-span-2" />
              <LoadingButton type="submit" variant="contained" size="large" loading={formState.isSubmitting} endIcon={<SendRounded />} className="sm:col-span-2 sm:justify-self-start">
                {t.sendMessage}
              </LoadingButton>
            </Box>
          )}
        </Card>
      </Reveal>
    </Box>
  );
}

export function FaqContent() {
  const t = useMessages('site');
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const groups = t.faq
    .filter((g) => category === null || g.category === category)
    .map((g) => ({ ...g, items: g.items.filter((i) => !q || i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)) }))
    .filter((g) => g.items.length);

  return (
    <Box className="container-page max-w-3xl py-12">
      <TextField
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.searchQuestion}
        inputProps={{ 'aria-label': t.searchFaq }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> }}
      />
      <Box className="my-6 flex flex-wrap gap-2">
        {[null, ...t.faq.map((g) => g.category)].map((c) => (
          <Chip key={c ?? 'all'} label={c ?? t.allCategories} clickable color={category === c ? 'primary' : 'default'} variant={category === c ? 'filled' : 'outlined'} onClick={() => setCategory(c)} />
        ))}
      </Box>
      {groups.length === 0 ? (
        <EmptyState icon={<HelpOutlineRounded />} title={t.noAnswer} description={t.askUs} action={{ label: t.contactUs, href: ROUTES.contact }} />
      ) : (
        groups.map((g) => (
          <Box key={g.category} className="mb-8">
            <Typography variant="h5" component="h2" className="mb-3">
              {g.category}
            </Typography>
            {g.items.map((item) => (
              <Accordion key={item.q} disableGutters elevation={0} className="mb-2 rounded-2xl border border-solid border-black/5 before:hidden">
                <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                  <Typography fontWeight={700}>{item.q}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography color="text.secondary">{item.a}</Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        ))
      )}
    </Box>
  );
}

export function LegalContent({ kind }: { kind: 'terms' | 'privacy' }) {
  const t = useMessages('site');
  return (
    <Box className="container-page max-w-3xl py-12">
      <Card className="p-6 md:p-10">
        <Typography variant="body2" color="text.secondary" className="mb-6">
          {t.lastUpdate}
        </Typography>
        {t.legal[kind].map((s) => (
          <Box key={s.title} component="section" className="mb-6">
            <Typography variant="h6" component="h2">
              {s.title}
            </Typography>
            <Typography color="text.secondary" className="mt-1">
              {s.text}
            </Typography>
          </Box>
        ))}
        <Typography color="text.secondary">
          {t.questionPrefix} <Link href={ROUTES.contact} className="font-bold text-tomato-500">{t.contactLink}</Link>.
        </Typography>
      </Card>
    </Box>
  );
}
