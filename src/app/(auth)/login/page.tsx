import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/LoginForm';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').login };
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm space="client" />
    </Suspense>
  );
}
