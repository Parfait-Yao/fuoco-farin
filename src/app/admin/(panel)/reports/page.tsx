import type { Metadata } from 'next';
import { ReportsAdmin } from '@/features/admin/ReportsAdmin';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').adminReports };
}

export default function AdminReportsPage() {
  return <ReportsAdmin />;
}
