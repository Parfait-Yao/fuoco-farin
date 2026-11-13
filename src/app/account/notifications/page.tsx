import type { Metadata } from 'next';
import { NotificationsView } from '@/components/ui/NotificationsView';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').notifications };
}

export default function NotificationsPage() {
  return <NotificationsView audience="client" />;
}
