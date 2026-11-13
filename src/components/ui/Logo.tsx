'use client';

import Link from 'next/link';
import { Box, Typography } from '@mui/material';
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded';
import { BRAND } from '@/constants';
import { useMessages } from '@/i18n/client';

/** Brand mark; `compact` shows the flame icon only (collapsed sidebars). */
export function Logo({ href = '/', light = false, subtitle, compact = false }: { href?: string; light?: boolean; subtitle?: string; compact?: boolean }) {
  const t = useMessages('common');
  return (
    <Box component={Link} href={href} aria-label={t.homeOf(BRAND.name)} className="inline-flex items-center gap-2.5 no-underline">
      <Box className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-tomato-400 via-tomato-500 to-tomato-700 text-white shadow-warm">
        <LocalFireDepartmentRounded />
      </Box>
      {!compact && (
      <Box className="leading-none whitespace-nowrap">
        <Typography component="span" className={`block font-display text-xl font-bold ${light ? 'text-white' : 'text-charcoal-800'}`}>
          Fuoco <span className="text-ember-500">&amp;</span> Farina
        </Typography>
        {subtitle && (
          <Typography component="span" variant="caption" className={light ? 'text-white/70' : 'text-charcoal-500'}>
            {subtitle}
          </Typography>
        )}
      </Box>
      )}
    </Box>
  );
}
