'use client';

import * as React from 'react';
import { Box, Typography } from '@mui/material';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import SoupKitchenRounded from '@mui/icons-material/SoupKitchenRounded';
import DeliveryDiningRounded from '@mui/icons-material/DeliveryDiningRounded';
import HomeRounded from '@mui/icons-material/HomeRounded';
import CancelRounded from '@mui/icons-material/CancelRounded';
import { motion } from 'framer-motion';
import { ORDER_FLOW } from '@/constants';
import { useFormat, useMessages } from '@/i18n/client';
import { cn } from '@/lib/utils';
import type { Order, OrderStatus } from '@/types';

const ICONS: Record<OrderStatus, React.ReactNode> = {
  received: <ReceiptLongRounded />,
  preparing: <SoupKitchenRounded />,
  delivering: <DeliveryDiningRounded />,
  delivered: <HomeRounded />,
  cancelled: <CancelRounded />,
};

/** Estimated minutes after reception for steps not reached yet. */
const ETA_OFFSETS: Record<OrderStatus, number> = { received: 0, preparing: 5, delivering: 22, delivered: 40, cancelled: 0 };

/** Animated vertical timeline of an order's status history. */
export function OrderTimeline({ order, orientation = 'vertical' }: { order: Order; orientation?: 'vertical' | 'horizontal' }) {
  const steps: OrderStatus[] = order.status === 'cancelled' ? ['received', 'cancelled'] : ORDER_FLOW;
  const reachedIndex = steps.indexOf(order.status);
  const start = new Date(order.history[0]?.date ?? order.createdAt).getTime();
  const t = useMessages('account');
  const labels = useMessages('domain').orderStatus;
  const fmt = useFormat();

  if (orientation === 'horizontal') {
    // Compact stepper for cards: icons on a progress line, short labels below.
    const progress = steps.length > 1 ? (Math.max(reachedIndex, 0) / (steps.length - 1)) * 100 : 0;
    return (
      <Box component="ol" aria-label={t.orderSteps} className="relative m-0 grid list-none p-0" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        <Box aria-hidden className="absolute top-5 h-1 rounded-full bg-black/10" style={{ left: `${50 / steps.length}%`, right: `${50 / steps.length}%` }}>
          <motion.div className="h-full rounded-full bg-tomato-500" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
        </Box>
        {steps.map((status, i) => {
          const event = order.history.find((h) => h.status === status);
          const done = i <= reachedIndex;
          const current = i === reachedIndex && status !== 'delivered' && status !== 'cancelled';
          const date = event?.date ?? new Date(start + ETA_OFFSETS[status] * 60000).toISOString();
          return (
            <motion.li key={status} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="relative flex min-w-0 flex-col items-center text-center" aria-current={current ? 'step' : undefined}>
              <Box className="relative h-10 w-10">
                {current && <motion.span aria-hidden className="absolute inset-0 rounded-full bg-tomato-400" animate={{ scale: [1, 1.6], opacity: [0.5, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />}
                <Box
                  className={cn(
                    'relative grid h-10 w-10 place-items-center rounded-full border-2 border-solid [&_svg]:text-[20px]',
                    done ? (status === 'cancelled' ? 'border-red-600 bg-red-600 text-white' : status === 'delivered' ? 'border-basil-500 bg-basil-500 text-white' : 'border-tomato-500 bg-tomato-500 text-white') : 'border-black/10 bg-white text-black/30',
                  )}
                >
                  {ICONS[status]}
                </Box>
              </Box>
              <Typography variant="caption" fontWeight={800} color={done ? 'text.primary' : 'text.disabled'} className="mt-2 leading-tight">
                {labels[status].label}
              </Typography>
              <Typography variant="caption" color="text.secondary" className="leading-tight">
                {done ? fmt.time(date) : `≈ ${fmt.time(date)}`}
              </Typography>
            </motion.li>
          );
        })}
      </Box>
    );
  }

  return (
    <Box component="ol" aria-label={t.orderSteps} className="m-0 list-none p-0">
      {steps.map((status, i) => {
        const event = order.history.find((h) => h.status === status);
        const done = i <= reachedIndex;
        const current = i === reachedIndex && status !== 'delivered' && status !== 'cancelled';
        const date = event?.date ?? new Date(start + ETA_OFFSETS[status] * 60000).toISOString();
        const isLast = i === steps.length - 1;
        return (
          <motion.li
            key={status}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.12 }}
            className={cn('relative flex gap-4', !isLast && 'pb-8')}
            aria-current={current ? 'step' : undefined}
          >
            {!isLast && (
              <Box aria-hidden className="absolute left-[23px] top-12 h-[calc(100%-48px)] w-0.5 overflow-hidden rounded-full bg-black/10">
                <motion.div
                  className="w-full bg-tomato-500"
                  initial={{ height: 0 }}
                  animate={{ height: i < reachedIndex ? '100%' : '0%' }}
                  transition={{ duration: 0.6, delay: 0.2 + i * 0.15 }}
                />
              </Box>
            )}
            <Box className="relative h-12 w-12 shrink-0">
              {current && <motion.span aria-hidden className="absolute inset-0 rounded-full bg-tomato-400" animate={{ scale: [1, 1.6], opacity: [0.5, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />}
              <Box
                className={cn(
                  'relative grid h-12 w-12 place-items-center rounded-full border-2 border-solid transition-colors',
                  done ? (status === 'cancelled' ? 'border-red-600 bg-red-600 text-white' : status === 'delivered' ? 'border-basil-500 bg-basil-500 text-white' : 'border-tomato-500 bg-tomato-500 text-white') : 'border-black/10 bg-white text-black/30',
                )}
              >
                {ICONS[status]}
              </Box>
            </Box>
            <Box className="min-w-0 pt-1">
              <Typography fontWeight={800} color={done ? 'text.primary' : 'text.disabled'}>
                {labels[status].label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {done ? t.at(fmt.date(date, { day: '2-digit', month: 'short' }), fmt.time(date)) : t.expectedAt(fmt.time(date))}
              </Typography>
              {(current || (done && isLast)) && (
                <Typography variant="body2" color={status === 'cancelled' ? 'error' : 'secondary.dark'} fontWeight={600} className="mt-0.5">
                  {event?.note ?? labels[status].description}
                </Typography>
              )}
            </Box>
          </motion.li>
        );
      })}
    </Box>
  );
}
