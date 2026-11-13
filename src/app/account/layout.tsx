'use client';

import * as React from 'react';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import PersonRounded from '@mui/icons-material/PersonRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import FavoriteRounded from '@mui/icons-material/FavoriteRounded';
import NotificationsRounded from '@mui/icons-material/NotificationsRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import ShieldRounded from '@mui/icons-material/ShieldRounded';
import LocalPizzaRounded from '@mui/icons-material/LocalPizzaRounded';
import { DashboardShell, type NavSection } from '@/components/layout/DashboardShell';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { CartDrawer } from '@/features/cart/CartDrawer';
import { ROUTES } from '@/constants';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { useMessages } from '@/i18n/client';

const A = ROUTES.account;

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const t = useMessages('common').accountNav;
  const orders = useDataStore((s) => s.orders);
  const notifications = useDataStore((s) => s.notifications);
  const active = orders.filter((o) => o.customerId === user?.id && ['received', 'preparing', 'delivering'].includes(o.status)).length;
  const unread = notifications.filter((n) => n.audience === 'client' && n.userId === user?.id && !n.read).length;

  const sections: NavSection[] = [
    {
      items: [
        { label: t.dashboard, href: A.root, icon: <DashboardRounded />, exact: true },
        { label: t.orders, href: A.orders, icon: <ReceiptLongRounded />, badge: active },
        { label: t.favorites, href: A.favorites, icon: <FavoriteRounded /> },
        { label: t.notifications, href: A.notifications, icon: <NotificationsRounded />, badge: unread },
      ],
    },
    {
      title: t.myAccount,
      items: [
        { label: t.profile, href: A.profile, icon: <PersonRounded /> },
        { label: t.addresses, href: A.addresses, icon: <PlaceRounded /> },
        { label: t.settings, href: A.settings, icon: <SettingsRounded /> },
        { label: t.security, href: A.security, icon: <ShieldRounded /> },
      ],
    },
  ];

  const bottomNav = [
    { label: t.home, href: A.root, icon: <DashboardRounded />, exact: true },
    { label: t.order, href: ROUTES.menu, icon: <LocalPizzaRounded /> },
    { label: t.ordersShort, href: A.orders, icon: <ReceiptLongRounded /> },
    { label: t.profileShort, href: A.profile, icon: <PersonRounded /> },
  ];

  return (
    <RoleGuard role="client">
      <DashboardShell variant="client" sections={sections} bottomNav={bottomNav} notificationsHref={A.notifications}>
        {children}
      </DashboardShell>
      <CartDrawer />
    </RoleGuard>
  );
}
