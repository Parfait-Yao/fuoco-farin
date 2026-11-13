import { Suspense } from 'react';
import type { Metadata } from 'next';
import { VerifyEmailForm } from '@/features/auth/RecoveryForms';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').verifyEmail };
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
