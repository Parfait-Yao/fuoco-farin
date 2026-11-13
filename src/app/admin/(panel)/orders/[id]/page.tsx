import type { Metadata } from 'next';
import { OrderAdminDetail } from '@/features/admin/OrdersAdmin';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').adminOrder };
}

export default function AdminOrderPage({ params }: { params: { id: string } }) {
  return <OrderAdminDetail id={params.id} />;
}
