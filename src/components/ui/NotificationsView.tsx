'use client';

import * as React from 'react';
import Link from 'next/link';
import { Box, Button, Card, IconButton, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import NotificationsOffRounded from '@mui/icons-material/NotificationsOffRounded';
import DoneAllRounded from '@mui/icons-material/DoneAllRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import MarkEmailReadRounded from '@mui/icons-material/MarkEmailReadRounded';
import MarkEmailUnreadRounded from '@mui/icons-material/MarkEmailUnreadRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import LocalOfferRounded from '@mui/icons-material/LocalOfferRounded';
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded';
import InfoRounded from '@mui/icons-material/InfoRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { attempt } from '@/store/uiStore';
import { useFormat, useMessages } from '@/i18n/client';
import { cn } from '@/lib/utils';
import type { AppNotification, Role } from '@/types';
import { EmptyState, ListSkeleton } from './feedback';
import { PageHeader } from './PageHeader';
import { useDataLoading } from '@/hooks';

const KIND_ICONS: Record<AppNotification['kind'], React.ReactNode> = {
  order: <ReceiptLongRounded />,
  promo: <LocalOfferRounded />,
  stock: <Inventory2Rounded />,
  system: <InfoRounded />,
  review: <StarRounded />,
};

/** Notification center shared by client and admin spaces. */
export function NotificationsView({ audience }: { audience: Role }) {
  const userId = useAuthStore((s) => s.user?.id);
  const all = useDataStore((s) => s.notifications);
  const mark = useDataStore((s) => s.markNotification);
  const markAll = useDataStore((s) => s.markAllNotifications);
  const remove = useDataStore((s) => s.deleteNotification);
  const loading = useDataLoading();
  const [tab, setTab] = React.useState<'all' | 'unread'>('all');
  const t = useMessages('common');
  const fmt = useFormat();

  const list = React.useMemo(
    () => all.filter((n) => n.audience === audience && (!n.userId || n.userId === userId)).sort((a, b) => b.date.localeCompare(a.date)),
    [all, audience, userId],
  );
  const unread = list.filter((n) => !n.read).length;
  const visible = tab === 'unread' ? list.filter((n) => !n.read) : list;

  return (
    <Box>
      <PageHeader
        title={t.notificationsTitle}
        description={unread ? t.unreadCount(unread) : t.upToDate}
        actions={
          <Button
            variant="outlined"
            startIcon={<DoneAllRounded />}
            disabled={unread === 0}
            onClick={() => void attempt(markAll(), t.allRead, 'info')}
          >
            {t.markAllRead}
          </Button>
        }
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} className="mb-4" aria-label={t.filterNotifications}>
        <Tab value="all" label={t.tabAll(list.length)} />
        <Tab value="unread" label={t.tabUnread(unread)} />
      </Tabs>
      {loading ? (
        <ListSkeleton rows={4} />
      ) : visible.length === 0 ? (
        <EmptyState icon={<NotificationsOffRounded />} title={t.noNotifications} description={t.noNotificationsHint} />
      ) : (
        <Card className="divide-x-0 divide-y divide-solid divide-black/5 overflow-hidden">
          <AnimatePresence initial={false}>
            {visible.map((n) => (
              <motion.div key={n.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className={cn('flex gap-4 p-4 sm:p-5', !n.read && 'bg-tomato-50/60')}>
                <Box className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', n.read ? 'bg-cream-200 text-charcoal-500' : 'bg-tomato-500 text-white')}>{KIND_ICONS[n.kind]}</Box>
                <Box className="min-w-0 flex-1">
                  <Box className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <Typography fontWeight={n.read ? 600 : 800}>{n.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fmt.relative(n.date)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {n.message}
                  </Typography>
                  {n.href && (
                    <Button component={Link} href={n.href} size="small" className="-ml-2 mt-1" onClick={() => void attempt(mark(n.id, true))}>
                      {t.view}
                    </Button>
                  )}
                </Box>
                <Box className="flex shrink-0 flex-col sm:flex-row">
                  <Tooltip title={n.read ? t.markUnread : t.markRead}>
                    <IconButton size="small" aria-label={n.read ? t.markUnread : t.markRead} onClick={() => void attempt(mark(n.id, !n.read))}>
                      {n.read ? <MarkEmailUnreadRounded fontSize="small" /> : <MarkEmailReadRounded fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t.delete}>
                    <IconButton
                      size="small"
                      aria-label={t.deleteNotification}
                      onClick={() => void attempt(remove(n.id), t.notificationDeleted, 'info')}
                    >
                      <DeleteOutlineRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </motion.div>
            ))}
          </AnimatePresence>
        </Card>
      )}
      <Typography variant="body2" color="text.secondary" className="mt-4">
        {t.notificationsShown(visible.length)}
      </Typography>
    </Box>
  );
}
