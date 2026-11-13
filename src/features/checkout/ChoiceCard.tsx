'use client';

import * as React from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import RadioButtonCheckedRounded from '@mui/icons-material/RadioButtonCheckedRounded';
import RadioButtonUncheckedRounded from '@mui/icons-material/RadioButtonUncheckedRounded';
import { cn } from '@/lib/utils';

interface ChoiceCardProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description?: string;
  aside?: React.ReactNode;
}

/** Large radio-style card used for delivery and payment choices. */
export function ChoiceCard({ selected, onClick, icon, title, description, aside }: ChoiceCardProps) {
  return (
    <ButtonBase
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-4 rounded-2xl border-2 border-solid p-4 text-left transition-colors',
        selected ? 'border-tomato-500 bg-tomato-50' : 'border-black/10 bg-white hover:border-tomato-200',
      )}
    >
      <Box className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', selected ? 'bg-tomato-500 text-white' : 'bg-cream-200 text-charcoal-700')}>{icon}</Box>
      <Box className="min-w-0 flex-1">
        <Typography fontWeight={800}>{title}</Typography>
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}
      </Box>
      {aside && <Box className="shrink-0 text-right">{aside}</Box>}
      {selected ? <RadioButtonCheckedRounded className="text-tomato-500" /> : <RadioButtonUncheckedRounded className="text-black/30" />}
    </ButtonBase>
  );
}
