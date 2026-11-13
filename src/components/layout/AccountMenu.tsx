'use client';

import * as React from 'react';
import Link from 'next/link';
import { Avatar, Box, Button, ButtonBase, Chip, Fade, Popover, Typography } from '@mui/material';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import PersonRounded from '@mui/icons-material/PersonRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import FavoriteRounded from '@mui/icons-material/FavoriteRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import ShieldRounded from '@mui/icons-material/ShieldRounded';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import LocalPizzaRounded from '@mui/icons-material/LocalPizzaRounded';
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded';
import InsightsRounded from '@mui/icons-material/InsightsRounded';
import { motion } from 'framer-motion';
import { ROUTES } from '@/constants';
import { initials } from '@/lib/format';
import type { Role, User } from '@/types';
import { useMessages } from '@/i18n/client';
import type { Messages } from '@/i18n/messages';

type ShortcutKey = keyof Messages<'common'>['shortcuts'];

export interface AccountShortcut {
  label: ShortcutKey;
  href: string;
  icon: React.ReactNode;
}

/** Quick links shown in the account card, per role. */
export const ACCOUNT_SHORTCUTS: Record<Role, AccountShortcut[]> = {
  client: [
    { label: 'profile', href: ROUTES.account.profile, icon: <PersonRounded /> },
    { label: 'orders', href: ROUTES.account.orders, icon: <ReceiptLongRounded /> },
    { label: 'favorites', href: ROUTES.account.favorites, icon: <FavoriteRounded /> },
    { label: 'addresses', href: ROUTES.account.addresses, icon: <PlaceRounded /> },
    { label: 'settings', href: ROUTES.account.settings, icon: <SettingsRounded /> },
    { label: 'security', href: ROUTES.account.security, icon: <ShieldRounded /> },
  ],
  admin: [
    { label: 'dashboard', href: ROUTES.admin.root, icon: <DashboardRounded /> },
    { label: 'orders', href: ROUTES.admin.orders, icon: <ReceiptLongRounded /> },
    { label: 'catalog', href: ROUTES.admin.products, icon: <LocalPizzaRounded /> },
    { label: 'stock', href: ROUTES.admin.stock, icon: <Inventory2Rounded /> },
    { label: 'reports', href: ROUTES.admin.reports, icon: <InsightsRounded /> },
    { label: 'settings', href: ROUTES.admin.settings, icon: <SettingsRounded /> },
  ],
};

interface AccountMenuProps {
  user: User;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onLogout: () => void;
}

/** Compact square account card: identity, 6 shortcut tiles and logout. */
export function AccountMenu({ user, anchorEl, onClose, onLogout }: AccountMenuProps) {
  const shortcuts = ACCOUNT_SHORTCUTS[user.role];
  const isAdmin = user.role === 'admin';
  const t = useMessages('common');
  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      TransitionComponent={Fade}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { className: 'mt-2 w-[296px] max-w-[calc(100vw-24px)] overflow-hidden rounded-3xl border border-solid border-black/5 shadow-warm' } }}
    >
      <motion.div initial={{ opacity: 0, scale: 0.95, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }} role="menu" aria-label={t.accountMenu}>
        <Box className={isAdmin ? 'bg-charcoal-900 p-4 text-white' : 'bg-gradient-to-br from-tomato-500 to-tomato-700 p-4 text-white'}>
          <Box className="flex items-center gap-3">
            <Avatar src={user.avatar} alt={user.firstName} sx={{ width: 44, height: 44, bgcolor: 'secondary.main', border: '2px solid rgba(255,255,255,.6)' }}>
              {initials(user.firstName, user.lastName)}
            </Avatar>
            <Box className="min-w-0">
              <Typography fontWeight={800} className="truncate leading-tight">
                {user.firstName} {user.lastName}
              </Typography>
              <Typography variant="caption" className="block truncate text-white/75">
                {user.email}
              </Typography>
            </Box>
          </Box>
          <Chip size="small" label={isAdmin ? t.roleAdmin : t.roleClient} className="mt-3 h-6 bg-white/15 text-white" />
        </Box>
        <Box className="grid grid-cols-3 gap-2 p-3">
          {shortcuts.map((s, i) => (
            <motion.div key={s.href} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i }}>
              <ButtonBase
                component={Link}
                href={s.href}
                role="menuitem"
                onClick={onClose}
                className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-2xl bg-cream-100 text-charcoal-700 transition-colors hover:bg-tomato-50 hover:text-tomato-600"
              >
                {s.icon}
                <Typography variant="caption" fontWeight={700} className="leading-none">
                  {t.shortcuts[s.label]}
                </Typography>
              </ButtonBase>
            </motion.div>
          ))}
        </Box>
        <Box className="px-3 pb-3">
          <Button
            fullWidth
            color="inherit"
            role="menuitem"
            startIcon={<LogoutRounded />}
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="rounded-2xl bg-cream-100 py-2 hover:bg-cream-200"
          >
            {t.logout}
          </Button>
        </Box>
      </motion.div>
    </Popover>
  );
}
