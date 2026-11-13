import type { Metadata } from 'next';
import { SettingsView } from '@/features/client/AccountSettings';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').settings };
}

export default function SettingsPage() {
  return <SettingsView />;
}
