import type { Metadata } from 'next';
import { FavoritesView } from '@/features/client/AccountSettings';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').favorites };
}

export default function FavoritesPage() {
  return <FavoritesView />;
}
