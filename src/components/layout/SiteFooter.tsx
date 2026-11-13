'use client';

import Link from 'next/link';
import { Box, Divider, IconButton, Link as MuiLink, Tooltip, Typography } from '@mui/material';
import FacebookRounded from '@mui/icons-material/FacebookRounded';
import Instagram from '@mui/icons-material/Instagram';
import WhatsApp from '@mui/icons-material/WhatsApp';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import PhoneOutlined from '@mui/icons-material/PhoneOutlined';
import MailOutlineRounded from '@mui/icons-material/MailOutlineRounded';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';
import { Logo } from '@/components/ui/Logo';
import { BRAND, ROUTES } from '@/constants';
import { useMessages } from '@/i18n/client';
import { useDataStore } from '@/store/dataStore';


const socials = [
  { label: 'Facebook', href: 'https://facebook.com', icon: <FacebookRounded /> },
  { label: 'Instagram', href: 'https://instagram.com', icon: <Instagram /> },
  { label: 'WhatsApp', href: 'https://wa.me/2250707252525', icon: <WhatsApp /> },
];

export function SiteFooter() {
  const t = useMessages('common');
  const domain = useMessages('domain');
  const settings = useDataStore((s) => s.settings);
  const columns = [
    {
      title: t.footerOrder,
      links: [
        { label: t.ourMenu, href: ROUTES.menu },
        { label: t.nav.builder, href: ROUTES.builder },
        { label: t.myCart, href: ROUTES.cart },
        { label: t.trackOrder, href: ROUTES.account.orders },
      ],
    },
    {
      title: t.footerHouse,
      links: [
        { label: t.nav.about, href: ROUTES.about },
        { label: t.nav.advantages, href: ROUTES.advantages },
        { label: t.nav.contact, href: ROUTES.contact },
        { label: t.nav.faq, href: ROUTES.faq },
      ],
    },
    {
      title: t.footerAccount,
      links: [
        { label: t.login, href: ROUTES.login },
        { label: t.register, href: ROUTES.register },
        { label: t.terms, href: ROUTES.terms },
        { label: t.privacy, href: ROUTES.privacy },
      ],
    },
  ];
  return (
    <Box component="footer" className="relative mt-24 overflow-hidden bg-charcoal-900 text-white">
      <Box aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-tomato-500/20 blur-3xl" />
      <Box className="container-page relative grid gap-10 py-16 md:grid-cols-2 lg:grid-cols-5">
        <Box className="lg:col-span-2">
          <Logo light subtitle={t.footerSubtitle} />
          <Typography className="mt-4 max-w-sm text-white/70">{settings.slogan || domain.tagline} {t.footerTagline}</Typography>
          <Box className="mt-6 space-y-2 text-sm text-white/80">
            <p className="m-0 flex items-center gap-2"><PlaceOutlined fontSize="small" className="text-ember-300" /> {BRAND.address}</p>
            <p className="m-0 flex items-center gap-2"><PhoneOutlined fontSize="small" className="text-ember-300" /> <MuiLink href={`tel:${BRAND.phone.replace(/\s/g, '')}`} color="inherit">{BRAND.phone}</MuiLink></p>
            <p className="m-0 flex items-center gap-2"><MailOutlineRounded fontSize="small" className="text-ember-300" /> <MuiLink href={`mailto:${BRAND.email}`} color="inherit">{BRAND.email}</MuiLink></p>
            <p className="m-0 flex items-center gap-2"><ScheduleRounded fontSize="small" className="text-ember-300" /> {settings.openingHours || domain.openingHours}</p>
          </Box>
        </Box>
        {columns.map((col) => (
          <Box component="nav" aria-label={col.title} key={col.title}>
            <Typography variant="overline" className="text-ember-300">
              {col.title}
            </Typography>
            <ul className="m-0 mt-3 list-none space-y-2.5 p-0">
              {col.links.map((link) => (
                <li key={link.href}>
                  <MuiLink component={Link} href={link.href} className="text-white/75 hover:text-white" underline="none">
                    {link.label}
                  </MuiLink>
                </li>
              ))}
            </ul>
          </Box>
        ))}
      </Box>
      <Divider className="border-white/10" />
      <Box className="container-page flex flex-col items-center justify-between gap-4 py-6 text-sm text-white/60 sm:flex-row">
        <span>
          © {new Date().getFullYear()} {BRAND.name}. {t.rightsReserved} ·{' '}
          <MuiLink component={Link} href={ROUTES.admin.login} color="inherit">
            {t.adminArea}
          </MuiLink>
        </span>
        <Box className="flex gap-1">
          {socials.map((s) => (
            <Tooltip key={s.label} title={s.label}>
              <IconButton component="a" href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="text-white/70 hover:text-white">
                {s.icon}
              </IconButton>
            </Tooltip>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
