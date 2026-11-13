import type { Metadata } from 'next';
import { SecurityView } from '@/features/client/AccountSettings';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').security };
}

export default function SecurityPage() {
  return <SecurityView />;
}
