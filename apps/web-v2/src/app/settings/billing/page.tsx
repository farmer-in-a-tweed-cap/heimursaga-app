import type { Metadata } from 'next';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { BillingSettingsPage } from '@/app/pages/BillingSettingsPage';

export const metadata: Metadata = { title: 'Billing', robots: 'noindex' };

export default function Page() {
  return (
    <ProtectedRoute>
      <BillingSettingsPage />
    </ProtectedRoute>
  );
}
