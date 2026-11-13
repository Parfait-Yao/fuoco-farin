'use client';

import * as React from 'react';
import Link from 'next/link';
import { Box, Button, Card, Typography } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ShieldRounded from '@mui/icons-material/ShieldRounded';
import { motion } from 'framer-motion';
import { LanguageSwitcher, Logo, PizzaImage } from '@/components/ui';
import { IMAGES } from '@/mocks';
import { ROUTES } from '@/constants';
import { useMessages } from '@/i18n/client';

/** Split-screen shell for client authentication pages. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  const t = useMessages('common');
  return (
    <Box className="grid min-h-screen lg:grid-cols-2">
      <Box className="relative hidden overflow-hidden lg:block">
        <PizzaImage src={IMAGES.hero} alt="" fill priority sizes="50vw" className="object-cover" />
        <Box className="absolute inset-0 bg-gradient-to-br from-tomato-800/85 via-charcoal-900/60 to-charcoal-900/90" />
        <Box className="relative flex h-full flex-col justify-between p-12 text-white">
          <Logo light />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Typography variant="h2" className="max-w-md text-white">
              {t.authHeroTitle}
            </Typography>
            <Typography className="mt-4 max-w-md text-white/80">{t.authHeroText}</Typography>
          </motion.div>
          <Typography variant="body2" className="text-white/60">
            {t.authHeroTrust}
          </Typography>
        </Box>
      </Box>
      <Box className="flex flex-col bg-cream-50">
        <Box className="flex items-center justify-between p-4 sm:p-6">
          <Box className="lg:hidden">
            <Logo />
          </Box>
          <Box className="ml-auto flex items-center gap-1">
            <LanguageSwitcher />
            <Button component={Link} href={ROUTES.home} startIcon={<ArrowBackRounded />} color="inherit">
              {t.backToSite}
            </Button>
          </Box>
        </Box>
        <Box className="flex flex-1 items-center justify-center px-4 pb-12 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
            {children}
          </motion.div>
        </Box>
      </Box>
    </Box>
  );
}

/** Dark, visually distinct shell for the admin login. */
export function AdminAuthShell({ children }: { children: React.ReactNode }) {
  const t = useMessages('common');
  return (
    <Box className="relative grid min-h-screen place-items-center overflow-hidden bg-charcoal-900 px-4 py-12">
      <Box aria-hidden className="absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-tomato-500/25 blur-3xl" />
      <Box aria-hidden className="absolute -bottom-40 -right-40 h-[420px] w-[420px] rounded-full bg-ember-500/20 blur-3xl" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <Box className="mb-6 flex items-center justify-between">
          <Logo light subtitle={t.backOffice} />
          <Box className="flex items-center gap-2">
            <LanguageSwitcher light />
            <Box className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
              <ShieldRounded sx={{ fontSize: 14 }} /> {t.secureZone}
            </Box>
          </Box>
        </Box>
        <Card className="p-6 sm:p-8">{children}</Card>
        <Button component={Link} href={ROUTES.home} startIcon={<ArrowBackRounded />} className="mt-4 text-white/70">
          {t.backToPublicSite}
        </Button>
      </motion.div>
    </Box>
  );
}
