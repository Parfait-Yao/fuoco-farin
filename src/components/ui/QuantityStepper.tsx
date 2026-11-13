'use client';

import { Box, IconButton, Typography } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import RemoveRounded from '@mui/icons-material/RemoveRounded';
import { AnimatePresence, motion } from 'framer-motion';
import { useMessages } from '@/i18n/client';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'small' | 'medium';
  label?: string;
}

export function QuantityStepper({ value, onChange, min = 1, max = 20, size = 'medium', label }: QuantityStepperProps) {
  const small = size === 'small';
  const t = useMessages('common');
  return (
    <Box role="group" aria-label={label ?? t.quantity} className="inline-flex items-center rounded-full border border-solid border-black/10 bg-white p-0.5">
      <IconButton size="small" aria-label={t.decreaseQty} disabled={value <= min} onClick={() => onChange(value - 1)}>
        <RemoveRounded fontSize={small ? 'small' : 'medium'} />
      </IconButton>
      <Box className={small ? 'w-6 overflow-hidden text-center' : 'w-9 overflow-hidden text-center'}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={value} initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }} transition={{ duration: 0.18 }}>
            <Typography fontWeight={700} fontSize={small ? 14 : 16} aria-live="polite">
              {value}
            </Typography>
          </motion.div>
        </AnimatePresence>
      </Box>
      <IconButton size="small" aria-label={t.increaseQty} disabled={value >= max} onClick={() => onChange(value + 1)}>
        <AddRounded fontSize={small ? 'small' : 'medium'} />
      </IconButton>
    </Box>
  );
}
