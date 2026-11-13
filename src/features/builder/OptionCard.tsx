'use client';

import { Box, ButtonBase, Chip, Typography } from '@mui/material';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import { AnimatePresence, motion } from 'framer-motion';
import { useFormat, useMessages } from '@/i18n/client';
import { cn } from '@/lib/utils';
import type { Ingredient } from '@/types';

interface OptionCardProps {
  option: Ingredient;
  selected: boolean;
  multiple?: boolean;
  onSelect: () => void;
}

/** Illustrated, keyboard-accessible ingredient choice. */
export function OptionCard({ option, selected, multiple, onSelect }: OptionCardProps) {
  const outOfStock = option.stock <= 0 || !option.active;
  const t = useMessages('builder');
  const fmt = useFormat();
  return (
    <motion.div whileHover={outOfStock ? undefined : { y: -4 }} whileTap={outOfStock ? undefined : { scale: 0.97 }} layout>
      <ButtonBase
        onClick={onSelect}
        disabled={outOfStock}
        role={multiple ? 'checkbox' : 'radio'}
        aria-checked={selected}
        aria-label={`${option.name}${option.price ? t.extra(fmt.price(option.price)) : ''}${outOfStock ? t.unavailable : ''}`}
        className={cn(
          'relative flex h-full w-full flex-col items-start rounded-3xl border-2 border-solid p-4 text-left transition-colors',
          selected ? 'border-tomato-500 bg-tomato-50' : 'border-transparent bg-white shadow-soft hover:border-tomato-200',
          outOfStock && 'opacity-50',
        )}
      >
        <Box className="relative mb-3 h-14 w-14">
          <Box className="absolute inset-0 rounded-full" style={{ background: option.color === 'transparent' ? 'repeating-linear-gradient(45deg,#eee,#eee 4px,#fff 4px,#fff 8px)' : option.color }} />
          <Box className="absolute inset-2 rounded-full border-2 border-dashed border-white/60" />
        </Box>
        <Typography fontWeight={800}>{option.name}</Typography>
        <Typography variant="body2" color="text.secondary" className="mb-3">
          {option.description}
        </Typography>
        <Box className="mt-auto flex w-full items-center justify-between">
          <Chip size="small" label={option.price ? `+ ${fmt.price(option.price)}` : t.included} color={option.price ? 'secondary' : 'default'} variant={option.price ? 'filled' : 'outlined'} />
          {outOfStock && <Chip size="small" label={t.soldOut} />}
        </Box>
        <AnimatePresence>
          {selected && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute right-3 top-3 text-tomato-500">
              <CheckCircleRounded />
            </motion.span>
          )}
        </AnimatePresence>
      </ButtonBase>
    </motion.div>
  );
}
