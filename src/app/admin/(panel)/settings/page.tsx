import type { Metadata } from 'next';
import { SettingsAdmin } from '@/features/admin/SettingsAdmin';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').adminSettings };
}

export default function AdminSettingsPage() {
  return <SettingsAdmin />;
}
