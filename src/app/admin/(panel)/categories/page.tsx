import type { Metadata } from 'next';
import { CategoriesAdmin } from '@/features/admin/CategoriesAdmin';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').adminCategories };
}

export default function AdminCategoriesPage() {
  return <CategoriesAdmin />;
}
