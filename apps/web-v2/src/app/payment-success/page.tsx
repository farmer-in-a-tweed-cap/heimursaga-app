import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { PaymentSuccessPage } from '@/app/pages/PaymentSuccessPage';

export const metadata: Metadata = { title: 'Sponsorship Confirmed', robots: 'noindex' };

export default function Page() {
  return (
    <ProtectedRoute>
      <Suspense>
        <PaymentSuccessPage />
      </Suspense>
    </ProtectedRoute>
  );
}
