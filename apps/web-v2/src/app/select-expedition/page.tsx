import type { Metadata } from 'next';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { SelectExpeditionPage } from '@/app/pages/SelectExpeditionPage';

export const metadata: Metadata = { title: 'Select Expedition', robots: 'noindex' };

export default function Page() {
  return (
    <ProtectedRoute>
      <SelectExpeditionPage />
    </ProtectedRoute>
  );
}
