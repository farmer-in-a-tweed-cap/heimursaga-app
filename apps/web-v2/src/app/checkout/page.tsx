import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { CheckoutPage } from '@/app/pages/CheckoutPage';

export const metadata: Metadata = { title: 'Checkout', robots: 'noindex' };

export default function Page() {
  return (
    <ProtectedRoute>
      <Suspense>
        <CheckoutPage />
      </Suspense>
    </ProtectedRoute>
  );
}
