import type { Metadata } from 'next';
import { CustomersAdmin } from '@/features/admin/CustomersAdmin';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').adminCustomers };
}

export default function AdminCustomersPage() {
  return <CustomersAdmin />;
}
