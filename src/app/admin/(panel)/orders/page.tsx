import type { Metadata } from 'next';
import { OrdersAdmin } from '@/features/admin/OrdersAdmin';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').adminOrders };
}

export default function AdminOrdersPage() {
  return <OrdersAdmin />;
}
