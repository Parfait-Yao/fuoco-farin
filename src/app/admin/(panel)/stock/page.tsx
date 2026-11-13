import type { Metadata } from 'next';
import { StockAdmin } from '@/features/admin/StockAdmin';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').adminStock };
}

export default function AdminStockPage() {
  return <StockAdmin />;
}
