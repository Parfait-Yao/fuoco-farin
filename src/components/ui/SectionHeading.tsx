'use client';

import * as React from 'react';
import { Box, Typography } from '@mui/material';
import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: 'left' | 'center';
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeading({ eyebrow, title, subtitle, align = 'left', action, className }: SectionHeadingProps) {
  const centered = align === 'center';
  return (
    <Box className={cn('mb-8 flex flex-col gap-4 md:mb-12', !centered && action && 'md:flex-row md:items-end md:justify-between', className)}>
      <Box className={cn('max-w-2xl', centered && 'mx-auto text-center')}>
        {eyebrow && (
          <Typography variant="overline" color="primary" component="p" className="mb-2">
            {eyebrow}
          </Typography>
        )}
        <Typography variant="h2" component="h2" className="text-balance">
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" className="mt-3 text-base md:text-lg">
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box className={cn(centered && 'mx-auto')}>{action}</Box>}
    </Box>
  );
}
