import type { Metadata } from 'next';
import { NotificationsView } from '@/components/ui/NotificationsView';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').adminNotifications };
}

export default function AdminNotificationsPage() {
  return <NotificationsView audience="admin" />;
}
