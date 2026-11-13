'use client';

import * as React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { passwordStrength } from './schemas';
import { useMessages } from '@/i18n/client';

export function AuthHeader({ icon, title, subtitle }: { icon?: React.ReactNode; title: string; subtitle?: React.ReactNode }) {
  return (
    <Box className="mb-8">
      {icon && (
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-tomato-50 text-tomato-500">
          {icon}
        </motion.div>
      )}
      <Typography variant="h3" component="h1">
        {title}
      </Typography>
      {subtitle && (
        <Typography color="text.secondary" className="mt-2">
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

const COLORS = ['error', 'error', 'warning', 'success', 'success'] as const;

export function PasswordStrength({ value }: { value: string }) {
  const t = useMessages('auth');
  if (!value) return null;
  const score = passwordStrength(value);
  return (
    <Box className="-mt-1" aria-live="polite">
      <LinearProgress variant="determinate" value={(score / 4) * 100} color={COLORS[score]} className="h-1.5 rounded-full" />
      <Typography variant="caption" color="text.secondary">
        {t.security(t.strength[score])}
      </Typography>
    </Box>
  );
}
