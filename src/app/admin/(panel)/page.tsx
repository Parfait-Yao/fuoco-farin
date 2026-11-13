import type { Metadata } from 'next';
import { AdminDashboard } from '@/features/admin/AdminDashboard';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').adminDashboard };
}

export default function AdminHomePage() {
  return <AdminDashboard />;
}
