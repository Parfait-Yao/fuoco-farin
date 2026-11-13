import type { Metadata } from 'next';
import { PromotionsAdmin } from '@/features/admin/PromotionsAdmin';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').adminPromotions };
}

export default function AdminPromotionsPage() {
  return <PromotionsAdmin />;
}
