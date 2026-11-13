import type { Metadata } from 'next';
import { OrdersView } from '@/features/client/OrdersView';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').orders };
}

export default function OrdersPage() {
  return <OrdersView />;
}
