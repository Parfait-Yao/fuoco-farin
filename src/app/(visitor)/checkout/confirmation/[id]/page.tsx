import type { Metadata } from 'next';
import { OrderConfirmation } from '@/features/checkout/OrderConfirmation';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('site').meta.confirmation };
}

export default function ConfirmationPage({ params }: { params: { id: string } }) {
  return (
    <div className="container-page py-10 md:py-16">
      <OrderConfirmation id={params.id} />
    </div>
  );
}
