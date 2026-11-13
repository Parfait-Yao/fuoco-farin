import type { Metadata } from 'next';
import { IngredientsAdmin } from '@/features/admin/IngredientsAdmin';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').adminIngredients };
}

export default function AdminIngredientsPage() {
  return <IngredientsAdmin />;
}
