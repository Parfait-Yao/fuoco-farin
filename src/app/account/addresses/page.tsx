import type { Metadata } from 'next';
import { AddressesView } from '@/features/client/AddressesView';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').addresses };
}

export default function AddressesPage() {
  return <AddressesView />;
}
