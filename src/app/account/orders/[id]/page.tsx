import type { Metadata } from 'next';
import { OrderDetailView } from '@/features/client/OrderDetailView';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').orderDetail };
}

export default function OrderPage({ params }: { params: { id: string } }) {
  return <OrderDetailView id={params.id} />;
}
