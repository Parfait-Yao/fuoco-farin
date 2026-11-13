import type { Metadata } from 'next';
import { EditProfileForm } from '@/features/client/ProfileViews';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').editProfile };
}

export default function EditProfilePage() {
  return <EditProfileForm />;
}
