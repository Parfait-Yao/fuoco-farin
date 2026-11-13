import type { Metadata } from 'next';
import { ProfileView } from '@/features/client/ProfileViews';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').profile };
}

export default function ProfilePage() {
  return <ProfileView />;
}
