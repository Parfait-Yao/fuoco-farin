import type { Metadata } from 'next';
import { CustomerDetail } from '@/features/admin/CustomersAdmin';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').adminCustomer };
}

export default function AdminCustomerPage({ params }: { params: { id: string } }) {
  return <CustomerDetail id={params.id} />;
}
