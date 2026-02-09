import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PasswordResetConfirmPage } from '@/app/pages/PasswordResetConfirmPage';

export const metadata: Metadata = {
  title: 'Confirm Password Reset',
  robots: 'noindex',
};

export default function Page() {
  return (
    <Suspense>
      <PasswordResetConfirmPage />
    </Suspense>
  );
}
