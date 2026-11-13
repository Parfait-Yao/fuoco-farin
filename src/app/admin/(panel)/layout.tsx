'use client';

import * as React from 'react';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import LocalPizzaRounded from '@mui/icons-material/LocalPizzaRounded';
import CategoryRounded from '@mui/icons-material/CategoryRounded';
import EggAltRounded from '@mui/icons-material/EggAltRounded';
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded';
import GroupRounded from '@mui/icons-material/GroupRounded';
import LocalOfferRounded from '@mui/icons-material/LocalOfferRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import NotificationsRounded from '@mui/icons-material/NotificationsRounded';
import InsightsRounded from '@mui/icons-material/InsightsRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import { DashboardShell, type NavSection } from '@/components/layout/DashboardShell';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { ROUTES } from '@/constants';
import { useDataStore } from '@/store/dataStore';
import { useMessages } from '@/i18n/client';

const R = ROUTES.admin;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const orders = useDataStore((s) => s.orders);
  const t = useMessages('common').adminMenu;
  const ingredients = useDataStore((s) => s.ingredients);
  const reviews = useDataStore((s) => s.reviews);
  const notifications = useDataStore((s) => s.notifications);
  const pending = orders.filter((o) => o.status === 'received').length;
  const low = ingredients.filter((i) => i.active && i.stock <= i.threshold).length;
  const toModerate = reviews.filter((r) => !r.published).length;
  const unread = notifications.filter((n) => n.audience === 'admin' && !n.read).length;

  const sections: NavSection[] = [
    { items: [{ label: t.dashboard, href: R.root, icon: <DashboardRounded />, exact: true }] },
    {
      title: t.sales,
      items: [
        { label: t.orders, href: R.orders, icon: <ReceiptLongRounded />, badge: pending },
        { label: t.customers, href: R.customers, icon: <GroupRounded /> },
        { label: t.promotions, href: R.promotions, icon: <LocalOfferRounded /> },
        { label: t.reviews, href: R.reviews, icon: <StarRounded />, badge: toModerate },
      ],
    },
    {
      title: t.catalog,
      items: [
        { label: t.catalog, href: R.products, icon: <LocalPizzaRounded /> },
        { label: t.categories, href: R.categories, icon: <CategoryRounded /> },
        { label: t.ingredients, href: R.ingredients, icon: <EggAltRounded /> },
        { label: t.stock, href: R.stock, icon: <Inventory2Rounded />, badge: low },
      ],
    },
    {
      title: t.management,
      items: [
        { label: t.notifications, href: R.notifications, icon: <NotificationsRounded />, badge: unread },
        { label: t.reports, href: R.reports, icon: <InsightsRounded /> },
        { label: t.settings, href: R.settings, icon: <SettingsRounded /> },
      ],
    },
  ];

  return (
    <RoleGuard role="admin">
      <DashboardShell variant="admin" sections={sections} notificationsHref={R.notifications}>
        {children}
      </DashboardShell>
    </RoleGuard>
  );
}
