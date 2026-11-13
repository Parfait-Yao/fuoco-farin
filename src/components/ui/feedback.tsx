'use client';

import * as React from 'react';
import Link from 'next/link';
import { Box, Button, Card, Chip, Skeleton, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { ORDER_STATUS_COLOR } from '@/constants';
import { useMessages } from '@/i18n/client';
import type { OrderStatus } from '@/types';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, compact }: EmptyStateProps) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className={`flex flex-col items-center text-center ${compact ? 'py-8' : 'py-16'}`}>
      <Box className="mb-4 grid h-20 w-20 place-items-center rounded-full bg-tomato-50 text-tomato-500 [&_svg]:text-[2.4rem]">{icon}</Box>
      <Typography variant="h6" component="p">
        {title}
      </Typography>
      {description && (
        <Typography color="text.secondary" className="mt-1 max-w-sm">
          {description}
        </Typography>
      )}
      {action &&
        (action.href ? (
          <Button component={Link} href={action.href} variant="contained" className="mt-5">
            {action.label}
          </Button>
        ) : (
          <Button onClick={action.onClick} variant="contained" className="mt-5">
            {action.label}
          </Button>
        ))}
    </motion.div>
  );
}

export function OrderStatusChip({ status, size = 'small' }: { status: OrderStatus; size?: 'small' | 'medium' }) {
  const labels = useMessages('domain').orderStatus;
  return <Chip size={size} label={labels[status].label} color={ORDER_STATUS_COLOR[status]} variant={status === 'delivered' ? 'filled' : 'outlined'} />;
}

/** Generic card-shaped skeleton grid. */
export function CardGridSkeleton({ count = 6, height = 320 }: { count?: number; height?: number }) {
  const t = useMessages('common');
  return (
    <Box className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label={t.loading}>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton variant="rectangular" height={height * 0.6} />
          <Box className="space-y-2 p-4">
            <Skeleton width="70%" height={28} />
            <Skeleton width="90%" />
            <Skeleton width="40%" />
          </Box>
        </Card>
      ))}
    </Box>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  const t = useMessages('common');
  return (
    <Box className="space-y-3" aria-busy="true" aria-label={t.loading}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} variant="rounded" height={56} />
      ))}
    </Box>
  );
}
