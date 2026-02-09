import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { UpgradeSuccessPage } from '@/app/pages/UpgradeSuccessPage';

export const metadata: Metadata = { title: 'Upgrade Successful', robots: 'noindex' };

export default function Page() {
  return (
    <ProtectedRoute>
      <Suspense>
        <UpgradeSuccessPage />
      </Suspense>
    </ProtectedRoute>
  );
}
