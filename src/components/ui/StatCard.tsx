'use client';

import * as React from 'react';
import { Box, Card, Skeleton, Typography } from '@mui/material';
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRounded from '@mui/icons-material/TrendingDownRounded';
import { motion } from 'framer-motion';
import { AnimatedNumber } from './motion';

interface StatCardProps {
  label: string;
  value: number;
  format?: (n: number) => string;
  icon: React.ReactNode;
  /** Variation in percent versus previous period. */
  trend?: number;
  tone?: 'tomato' | 'ember' | 'basil' | 'charcoal';
  loading?: boolean;
  hint?: string;
}

const tones = {
  tomato: 'bg-tomato-50 text-tomato-500',
  ember: 'bg-ember-50 text-ember-600',
  basil: 'bg-basil-50 text-basil-700',
  charcoal: 'bg-cream-200 text-charcoal-700',
};

export function StatCard({ label, value, format, icon, trend, tone = 'tomato', loading, hint }: StatCardProps) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }} className="h-full">
      <Card className="h-full p-5">
        <Box className="flex items-start justify-between gap-3">
          <Box className="min-w-0">
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              {label}
            </Typography>
            <Typography variant="h5" component="p" className="mt-1 whitespace-nowrap font-display text-[1.6rem] font-bold leading-tight">
              {loading ? <Skeleton width={110} /> : <AnimatedNumber value={value} format={format} />}
            </Typography>
          </Box>
          <Box className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tones[tone]}`}>{icon}</Box>
        </Box>
        {(trend !== undefined || hint) && !loading && (
          <Box className="mt-3 flex items-center gap-1.5 text-sm">
            {trend !== undefined && (
              <Box component="span" className={`inline-flex items-center gap-0.5 font-bold ${trend >= 0 ? 'text-basil-700' : 'text-tomato-600'}`}>
                {trend >= 0 ? <TrendingUpRounded fontSize="small" /> : <TrendingDownRounded fontSize="small" />}
                {trend >= 0 ? '+' : ''}
                {trend.toFixed(1)}%
              </Box>
            )}
            {hint && (
              <Typography component="span" variant="body2" color="text.secondary">
                {hint}
              </Typography>
            )}
          </Box>
        )}
      </Card>
    </motion.div>
  );
}
