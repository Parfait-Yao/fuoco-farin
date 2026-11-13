import type { Metadata } from 'next';
import { ReviewsAdmin } from '@/features/admin/ReviewsAdmin';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').adminReviews };
}

export default function AdminReviewsPage() {
  return <ReviewsAdmin />;
}
