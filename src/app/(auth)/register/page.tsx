import { Suspense } from 'react';
import type { Metadata } from 'next';
import { RegisterForm } from '@/features/auth/RegisterForm';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').register };
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
