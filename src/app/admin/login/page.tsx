import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AdminAuthShell } from '@/components/layout/AuthShell';
import { LoginForm } from '@/features/auth/LoginForm';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').adminLogin, robots: { index: false } };
}

export default function AdminLoginPage() {
  return (
    <AdminAuthShell>
      <Suspense>
        <LoginForm space="admin" />
      </Suspense>
    </AdminAuthShell>
  );
}
