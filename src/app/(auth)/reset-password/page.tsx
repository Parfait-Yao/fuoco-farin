import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/features/auth/RecoveryForms';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('titles').resetPassword };
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
