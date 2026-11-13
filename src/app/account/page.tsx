import type { Metadata } from 'next';
import { ClientDashboard } from '@/features/client/ClientDashboard';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').account };
}

export default function AccountDashboardPage() {
  return <ClientDashboard />;
}
