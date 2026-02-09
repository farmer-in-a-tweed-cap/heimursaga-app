import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { PaymentSuccessPage } from '@/app/pages/PaymentSuccessPage';

export const metadata: Metadata = { title: 'Payment Successful', robots: 'noindex' };

export default function Page() {
  return (
    <ProtectedRoute>
      <Suspense>
        <PaymentSuccessPage />
      </Suspense>
    </ProtectedRoute>
  );
}
