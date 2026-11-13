import type { Metadata } from 'next';
import { ProductsAdmin } from '@/features/admin/ProductsAdmin';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').adminProducts };
}

export default function AdminProductsPage() {
  return <ProductsAdmin />;
}
