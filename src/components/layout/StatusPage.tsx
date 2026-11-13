'use client';

import * as React from 'react';
import Link from 'next/link';
import { Box, Button, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { Logo } from '@/components/ui';
import { useMessages } from '@/i18n/client';

interface StatusPageProps {
  code: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  actions: { label: string; href: string; primary?: boolean }[];
}

/** Full-page state for 403 / 404 / errors. */
export function StatusPage({ code, icon, title, description, actions }: StatusPageProps) {
  const t = useMessages('common');
  return (
    <Box className="grain flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
      <Logo />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-12 max-w-lg">
        <Box className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full bg-tomato-50 text-tomato-500 [&_svg]:text-5xl">{icon}</Box>
        <Typography variant="overline" color="primary">
          {t.errorCode(code)}
        </Typography>
        <Typography variant="h2" component="h1" className="mt-1">
          {title}
        </Typography>
        <Typography color="text.secondary" className="mt-3 text-lg">
          {description}
        </Typography>
        <Box className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {actions.map((a) => (
            <Button key={a.href} component={Link} href={a.href} variant={a.primary ? 'contained' : 'outlined'} size="large">
              {a.label}
            </Button>
          ))}
        </Box>
      </motion.div>
    </Box>
  );
}
