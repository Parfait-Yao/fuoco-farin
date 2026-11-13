import type { Metadata } from 'next';
import { TrackingView } from '@/features/client/TrackingView';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').tracking };
}

export default function TrackingPage({ params }: { params: { id: string } }) {
  return <TrackingView id={params.id} />;
}
